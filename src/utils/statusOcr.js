import Tesseract from "tesseract.js";
import { scanStatusWithGemini, getGeminiApiKey } from "./geminiOcr.js";

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
        const minWidth = 1000;
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
 * Clean & normalize extracted text to avoid typos
 */
function cleanExtractedStatus(rawFields) {
  let time = (rawFields.time || "").trim();
  const timeMatch = time.match(/([01]?[0-9]|2[0-3]):[0-5][0-9]/);
  if (timeMatch) time = timeMatch[0];

  let job = (rawFields.jobStatus || "").trim();
  // Standardize common FiveM job labels
  if (/civilian/i.test(job) && /freelancer/i.test(job)) {
    job = "Civilian - Freelancer";
  } else if (/police/i.test(job) || /officer/i.test(job)) {
    job = job.replace(/^[^a-zA-Z]+/, "").trim();
  }

  let gang = (rawFields.gangAffiliation || "").trim();
  // Standardize common FiveM gang labels
  if (/no\s*gang/i.test(gang) || /unaffiliated/i.test(gang)) {
    gang = "No Gang - Unaffiliated";
  } else {
    gang = gang.replace(/^[^a-zA-Z]+/, "").trim();
  }

  return {
    time,
    jobStatus: job,
    gangAffiliation: gang,
    playerId: (rawFields.playerId || "").trim(),
    cash: (rawFields.cash || "").trim(),
    bank: (rawFields.bank || "").trim(),
  };
}

/**
 * Fallback Tesseract parser for GTA HUD screenshots
 */
function parseTesseractStatusText(rawText) {
  if (!rawText) return {};

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let time = "";
  let jobStatus = "";
  let gangAffiliation = "";
  let playerId = "";
  let cash = "";
  let bank = "";

  // 1. Look for time (HH:MM or HH.MM)
  for (const line of lines) {
    const tm = line.match(/\b([01]?[0-9]|2[0-3])[:.]([0-5][0-9])\b/);
    if (tm) {
      time = `${tm[1].padStart(2, "0")}:${tm[2]}`;
      break;
    }
  }

  // 2. Look for Player ID (#1046 or similar)
  for (const line of lines) {
    const pm = line.match(/#\s*([0-9]{1,6})/);
    if (pm) {
      playerId = pm[1];
      break;
    }
  }

  // 3. Look for Cash and Bank ($ amounts)
  for (const line of lines) {
    const moneyMatches = line.match(/\$[0-9]{1,3}(?:\.[0-9]{3})*/g);
    if (moneyMatches && moneyMatches.length > 0) {
      if (!cash) cash = moneyMatches[0];
      if (moneyMatches.length > 1 && !bank) bank = moneyMatches[1];
    }
  }

  // 4. Look for Job line
  for (const line of lines) {
    if (/civilian/i.test(line) || /freelancer/i.test(line) || /police/i.test(line) || /medic/i.test(line) || /ems/i.test(line)) {
      jobStatus = line
        .replace(/^[^a-zA-Z]+/, "")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim();
      break;
    }
  }

  // 5. Look for Gang line
  for (const line of lines) {
    if (/no\s*gang/i.test(line) || /unaffiliated/i.test(line) || /gang/i.test(line)) {
      gangAffiliation = line
        .replace(/^[^a-zA-Z]+/, "")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim();
      break;
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
 * Tries Gemini Vision AI first for 100% accuracy, then falls back to Tesseract
 */
export async function scanStatusImage(imageFileOrUrl, onProgress = null) {
  if (typeof onProgress === "function") onProgress(15);

  const hasApiKey = Boolean(getGeminiApiKey());

  if (hasApiKey) {
    try {
      if (typeof onProgress === "function") onProgress(35);
      const geminiResult = await scanStatusWithGemini(imageFileOrUrl);
      if (geminiResult && geminiResult.success && geminiResult.fields) {
        if (typeof onProgress === "function") onProgress(100);
        return {
          success: true,
          source: "gemini-ai",
          fields: cleanExtractedStatus(geminiResult.fields),
        };
      }
      console.warn("Gemini Status OCR returned unsuccessful, falling back to Tesseract:", geminiResult);
    } catch (geminiErr) {
      console.warn("Gemini Status OCR failed, falling back to Tesseract:", geminiErr);
    }
  }

  // Fallback to local Tesseract OCR
  try {
    if (typeof onProgress === "function") onProgress(45);
    const preprocessed = await preprocessStatusImage(imageFileOrUrl);
    if (typeof onProgress === "function") onProgress(60);

    const tessResult = await Tesseract.recognize(preprocessed, "eng", {
      logger: (m) => {
        if (m && m.status === "recognizing text" && typeof m.progress === "number") {
          const mapped = Math.round(60 + m.progress * 35);
          if (typeof onProgress === "function") onProgress(mapped);
        }
      },
    });

    if (typeof onProgress === "function") onProgress(100);

    const rawText = tessResult?.data?.text || "";
    const parsedFields = parseTesseractStatusText(rawText);

    const hasAnyField = Boolean(
      parsedFields.time || parsedFields.jobStatus || parsedFields.gangAffiliation
    );

    return {
      success: hasAnyField,
      source: "tesseract-local",
      fields: parsedFields,
      rawText,
    };
  } catch (tessErr) {
    console.error("Tesseract status OCR fatal error:", tessErr);
    return {
      success: false,
      source: "failed",
      error: tessErr.message,
      fields: { time: "", jobStatus: "", gangAffiliation: "" },
    };
  }
}
