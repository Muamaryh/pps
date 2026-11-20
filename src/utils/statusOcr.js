import { scanStatusWithGemini } from "./geminiOcr.js";

async function loadTesseract() {
  const mod = await import("tesseract.js");
  return mod.default || mod;
}

/**
 * Preprocesses a status HUD screenshot via canvas for optimal OCR readability
 */
export async function preprocessStatusImage(imageFileOrUrl) {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return imageFileOrUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const minWidth = 1100;
        let scale = 1.0;
        if (img.width < minWidth) {
          scale = Math.min(3.0, minWidth / img.width);
        }
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.warn("Status image preprocess notice, using original:", err);
        resolve(imageFileOrUrl);
      }
    };
    img.onerror = () => resolve(imageFileOrUrl);

    if (typeof imageFileOrUrl === "string") {
      img.src = imageFileOrUrl;
    } else if (imageFileOrUrl instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(imageFileOrUrl);
      reader.readAsDataURL(imageFileOrUrl);
    } else {
      resolve(imageFileOrUrl);
    }
  });
}

/**
 * Cleans trailing/leading OCR icon noise from a single HUD pill text
 */
function stripHudIconNoise(str) {
  if (!str) return "";
  let s = str
    .replace(/[–—]/g, "-")
    .replace(/[^a-zA-Z0-9\s.&'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip 1-char icon noise at start or end (e.g. "0 Civilian - Freelancer" or "Roxwood Medic - Paramedic 0")
  s = s.replace(/^(?:[0OQDBIl1|]\s+)+/, "").replace(/(?:\s+[0OQDBIl1|xX])+$/, "").trim();

  // Normalize spacing around hyphen: "Roxwood Medic - Paramedic"
  s = s.replace(/\s*-\s*/g, " - ").replace(/^-\s+|\s+-$/g, "").trim();

  // Fix common clipped OCR suffixes
  s = s
    .replace(/\bUnaf\s*liat(?:ed)?\b/gi, "Unaffiliated")
    .replace(/\bUnaffiliat(?:e|ed)?\b/gi, "Unaffiliated")
    .replace(/\bParamedi\b/gi, "Paramedic")
    .replace(/\bFreelanc(?:e|er)?\b/gi, "Freelancer");

  return s;
}

/**
 * Splits a merged string if it accidentally contains BOTH "<Job> - <Role>" AND "<Gang> - <Rank>"
 */
function splitMergedJobAndGang(rawJob, rawGang) {
  let job = stripHudIconNoise(rawJob);
  let gang = stripHudIconNoise(rawGang);

  if (job) {
    // Case 1: Explicit "No Gang" or "Unaffiliated" leaked into job
    const noGangIdx = job.search(/\b(?:no\s*gang|unaffiliated)\b/i);
    if (noGangIdx > 0) {
      const tail = stripHudIconNoise(job.slice(noGangIdx));
      job = stripHudIconNoise(job.slice(0, noGangIdx));
      if (!gang) gang = tail;
    }

    // Case 2: Two "<Part1> - <Part2>" pairs merged on one line:
    // e.g. "Roxwood Medic - Paramedic Ballas - Member"
    const hyphenParts = job.split(" - ").map((p) => p.trim()).filter(Boolean);
    if (hyphenParts.length >= 3) {
      // hyphenParts[0] = Job Name ("Roxwood Medic")
      // hyphenParts[1] = "<Job Grade> <Gang Name>" ("Paramedic Ballas")
      // hyphenParts[2] = Gang Rank ("Member")
      const midWords = hyphenParts[1].split(/\s+/);
      if (midWords.length >= 2) {
        const jobRole = midWords[0];
        const gangName = midWords.slice(1).join(" ");
        const gangRole = hyphenParts.slice(2).join(" - ");
        job = `${hyphenParts[0]} - ${jobRole}`;
        if (!gang) {
          gang = `${gangName} - ${gangRole}`;
        }
      }
    }
  }

  return { job, gang };
}

/**
 * Clean & normalize extracted status fields to avoid typos
 */
function cleanExtractedStatus(rawFields) {
  let rawTime = String(rawFields.time || "").trim();
  // Support slight OCR digit confusion in time like O9:O3 -> 09:03
  const normTime = rawTime.replace(/[oO]/g, "0").replace(/[lI|]/g, "1");
  const timeMatch = normTime.match(/([01]?[0-9]|2[0-3])[:.]([0-5][0-9])/);
  const time = timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : "";

  let { job, gang } = splitMergedJobAndGang(rawFields.jobStatus || "", rawFields.gangAffiliation || "");

  if (/^civilian\s*-\s*freelancer$/i.test(job) || (/civilian/i.test(job) && /freelancer/i.test(job))) {
    job = "Civilian - Freelancer";
  }

  if (/no\s*gang/i.test(gang) || /unaffiliated/i.test(gang)) {
    gang = "No Gang - Unaffiliated";
  }

  return {
    time,
    jobStatus: job,
    gangAffiliation: gang,
    playerId: String(rawFields.playerId || "").trim(),
    cash: String(rawFields.cash || "").trim(),
    bank: String(rawFields.bank || "").trim(),
  };
}

/**
 * Extracts distinct pill segments from Tesseract blocks using horizontal icon-gap detection
 * In FiveM HUD, an icon/logo box sits between "<Pekerjaan> - <Jabatan>" and "<Gang> - <Jabatan>",
 * creating a clear horizontal pixel gap (e.g. ~45-70px vs normal word space ~8-18px).
 */
function extractSegmentsFromBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const segments = [];

  for (const block of blocks) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const words = (line.words || []).filter((w) => w && w.text && w.text.trim());
        if (words.length === 0) continue;

        const heights = words.map((w) => Math.max(8, (w.bbox?.y1 || 0) - (w.bbox?.y0 || 0)));
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        const gapThreshold = Math.max(26, avgHeight * 1.65);

        let currentWords = [words[0].text];
        for (let i = 1; i < words.length; i++) {
          const prev = words[i - 1];
          const curr = words[i];
          const gap = (curr.bbox?.x0 || 0) - (prev.bbox?.x1 || 0);
          const currentJoined = currentWords.join(" ");
          const hasCompleteHyphenPair = /[A-Za-z]\s*-\s*[A-Za-z]{2,}/.test(currentJoined);
          const isStatToken = /[:$]/.test(currentJoined) || /[:$]/.test(curr.text);

          if (gap > gapThreshold && (hasCompleteHyphenPair || isStatToken || gap > avgHeight * 2.5)) {
            segments.push(currentJoined);
            currentWords = [curr.text];
          } else {
            currentWords.push(curr.text);
          }
        }
        if (currentWords.length > 0) {
          segments.push(currentWords.join(" "));
        }
      }
    }
  }

  return segments;
}

/**
 * Fallback Tesseract parser for GTA HUD screenshots (uses both bbox segments and raw text)
 */
export function parseTesseractStatusResult(rawText, blocks = null) {
  if (!rawText && !blocks) return cleanExtractedStatus({});

  const lines = (rawText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bboxSegments = extractSegmentsFromBlocks(blocks);
  const allCandidates = [...bboxSegments, ...lines];

  let time = "";
  let jobStatus = "";
  let gangAffiliation = "";
  let playerId = "";
  let cash = "";
  let bank = "";

  // 1. Extract Time (HH:MM) - check all candidates, tolerating O->0
  for (const seg of allCandidates) {
    // Strip currency amounts like $100.336 first so they aren't confused with time
    const withoutMoney = seg.replace(/\$[0-9.,]+/g, " ");
    const norm = withoutMoney.replace(/(?<=\d)[oO]|[oO](?=\d)/g, "0");
    const tm = norm.match(/(?:^|\s)([01]?[0-9]|2[0-3]):([0-5][0-9])(?:\b|\s|$)/);
    if (tm) {
      time = `${tm[1].padStart(2, "0")}:${tm[2]}`;
      break;
    }
  }

  // 2. Player ID (#386 or #1046)
  for (const line of lines) {
    const pm = line.match(/[#$]\s*([0-9]{1,6})\b/);
    if (pm && !line.slice(pm.index, pm.index + pm[0].length + 2).includes(".")) {
      playerId = pm[1];
      break;
    }
  }

  // 3. Cash & Bank
  for (const line of lines) {
    const moneyMatches = line.match(/\$[0-9]{1,3}(?:\.[0-9]{3})+/g);
    if (moneyMatches && moneyMatches.length > 0) {
      if (!cash) cash = moneyMatches[0];
      if (moneyMatches.length > 1 && !bank) bank = moneyMatches[1];
    }
  }

  // 4. Extract "<Pekerjaan> - <Jabatan>" and "<Afiliasi> - <Jabatan>" from logo-separated bbox segments first
  const hyphenPills = [];
  const sourceList = bboxSegments.length > 0 ? bboxSegments : lines;

  for (const rawSeg of sourceList) {
    // Ignore top-bar stats segments containing $ or HH:MM
    if (/\$[0-9]/.test(rawSeg) || /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/.test(rawSeg)) {
      continue;
    }
    const cleaned = stripHudIconNoise(rawSeg);
    // Valid status pill has "<Letters> - <Letters>"
    if (/^[A-Za-z][A-Za-z0-9\s.&']*\s-\s[A-Za-z][A-Za-z0-9\s.&']*$/.test(cleaned)) {
      // Avoid near-duplicate noise fragments from lower lines (e.g. "'Roxwood Medic - Par")
      const isShortDup = hyphenPills.some(
        (existing) => existing.toLowerCase().startsWith(cleaned.toLowerCase().slice(0, 10)) && existing.length >= cleaned.length
      );
      if (!isShortDup) {
        hyphenPills.push(cleaned);
      }
    }
  }

  if (hyphenPills.length >= 2) {
    // Check if one explicitly says No Gang / Unaffiliated
    const gangIdx = hyphenPills.findIndex((p) => /no\s*gang|unaffiliated/i.test(p));
    if (gangIdx === 0) {
      gangAffiliation = hyphenPills[0];
      jobStatus = hyphenPills[1];
    } else {
      jobStatus = hyphenPills[0];
      gangAffiliation = gangIdx >= 0 ? hyphenPills[gangIdx] : hyphenPills[1];
    }
  } else if (hyphenPills.length === 1) {
    const single = hyphenPills[0];
    if (/no\s*gang|unaffiliated/i.test(single)) {
      gangAffiliation = single;
    } else {
      jobStatus = single;
    }
  }

  // Fallback on raw lines if bbox segments missed either job or gang
  if (!jobStatus || !gangAffiliation) {
    for (const line of lines) {
      if (/\$[0-9]/.test(line)) continue;
      if (line.includes("-") || /no\s*gang|unaffiliated/i.test(line)) {
        const { job, gang } = splitMergedJobAndGang(line, "");
        if (!jobStatus && job && /[A-Za-z]{2,}\s-\s[A-Za-z]{2,}/.test(job) && !/no\s*gang|unaffiliated/i.test(job)) {
          jobStatus = job;
        }
        if (!gangAffiliation && gang) {
          gangAffiliation = gang;
        }
      }
    }
  }

  return cleanExtractedStatus({
    time,
    jobStatus,
    gangAffiliation,
    playerId,
    cash,
    bank,
  });
}

/**
 * Main Status HUD OCR Scanner
 * Priority 1: Gemini Vision AI (resolves key from localStorage, env, or Cloud Firestore)
 * Priority 2: Local Tesseract PSM.SINGLE_BLOCK with Logo-Gap Bounding Box Splitting
 */
export async function scanStatusImage(imageFileOrUrl, onProgress = null) {
  if (typeof onProgress === "function") onProgress(15);

  // 1. Always attempt Gemini Vision AI first (resolves Cloud API Key asynchronously)
  try {
    if (typeof onProgress === "function") onProgress(35);
    const geminiResult = await scanStatusWithGemini(imageFileOrUrl);
    if (geminiResult && geminiResult.success && geminiResult.fields) {
      const cleaned = cleanExtractedStatus(geminiResult.fields);
      if (cleaned.time || cleaned.jobStatus || cleaned.gangAffiliation) {
        if (typeof onProgress === "function") onProgress(100);
        return {
          success: true,
          source: "gemini-ai",
          modelUsed: geminiResult.modelUsed,
          fields: cleaned,
        };
      }
    }
    if (geminiResult?.error && geminiResult.error !== "NO_API_KEY") {
      console.warn("[Status OCR] Gemini fallback notice:", geminiResult);
    }
  } catch (geminiErr) {
    console.warn("[Status OCR] Gemini Vision failed, falling back to spatial Tesseract:", geminiErr);
  }

  // 2. Fallback to local Tesseract OCR with PSM 6 (SINGLE_BLOCK) + Bounding Boxes
  let worker = null;
  try {
    const Tesseract = await loadTesseract();
    if (typeof onProgress === "function") onProgress(50);
    const preprocessed = await preprocessStatusImage(imageFileOrUrl);
    if (typeof onProgress === "function") onProgress(65);

    if (typeof Tesseract.createWorker === "function") {
      worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m && m.status === "recognizing text" && typeof m.progress === "number") {
            const mapped = Math.round(65 + m.progress * 30);
            if (typeof onProgress === "function") onProgress(mapped);
          }
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
      });
      const tessResult = await worker.recognize(preprocessed, {}, { blocks: true });
      await worker.terminate();
      worker = null;

      if (typeof onProgress === "function") onProgress(100);
      const parsedFields = parseTesseractStatusResult(tessResult?.data?.text || "", tessResult?.data?.blocks || null);
      const hasAnyField = Boolean(parsedFields.time || parsedFields.jobStatus || parsedFields.gangAffiliation);

      return {
        success: hasAnyField,
        source: "tesseract-local",
        fields: parsedFields,
        rawText: tessResult?.data?.text || "",
      };
    }

    const tessResult = await Tesseract.recognize(preprocessed, "eng");
    if (typeof onProgress === "function") onProgress(100);
    const parsedFields = parseTesseractStatusResult(tessResult?.data?.text || "", tessResult?.data?.blocks || null);
    const hasAnyField = Boolean(parsedFields.time || parsedFields.jobStatus || parsedFields.gangAffiliation);

    return {
      success: hasAnyField,
      source: "tesseract-local",
      fields: parsedFields,
      rawText: tessResult?.data?.text || "",
    };
  } catch (tessErr) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    console.error("Tesseract status OCR fatal error:", tessErr);
    return {
      success: false,
      source: "failed",
      error: tessErr.message,
      fields: { time: "", jobStatus: "", gangAffiliation: "" },
    };
  }
}
