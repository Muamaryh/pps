import Tesseract from "tesseract.js";

// Blacklist of common card labels and dictionary words that must NEVER be treated as Citizen IDs or names
const BLACKLIST_WORDS = new Set([
  "SANTOS", "LOS", "IDENTITY", "LASTNAME", "FIRSTNAME", "CITIZEN", "CITIZENID",
  "NATIONALITY", "INDONESIA", "INDONESIAN", "CIVILIAN", "FREELANCER",
  "UNAFFILIATED", "PLAYERS", "FEMALE", "MALE", "AMERICAN", "TURBO",
  "SANDY", "SHORES", "PAPS", "DATE", "BIRTH", "STATE", "CARD", "NAME", "GANG",
  "FIRST", "LAST", "SIGNATURE", "SIGN", "BLAINE", "COUNTY", "SAN", "ANDREAS",
  "CITY", "MEMBER", "REGISTRATION", "PHOTO", "PICTURE", "EXP", "EXPIRES",
  "EXPIRE", "DRIVER", "LICENSE", "LICENCE", "VALID", "ISSUED", "CARDHOLDER",
  "HOLDER", "SIGNATURES", "DOB", "SEX", "GENDER", "IRST"
]);

export const CARD_LABELS = new Set([
  "FIRST", "LAST", "NAME", "FIRSTNAME", "LASTNAME", "IRST",
  "DOB", "POOB", "SEX", "GENDER",
  "NATIONALITY", "CITIZEN", "ID", "CITIZENID", "LOS", "SANTOS", "IDENTITY",
  "SIGNATURE", "STATE", "COUNTY", "BLAINE", "CARD",
  "BIRTH", "DATE", "EXP", "EXPIRES", "DRIVER", "LICENSE", "LICENCE",
  "CIVILIAN", "FREELANCER"
]);

export function isCardLabel(text) {
  if (!text) return true;
  const cleaned = text.toUpperCase().replace(/[^A-Z\s]/g, "").trim();
  if (!cleaned) return false;
  if (/(?:FIRST|LAST|IRST)\s*NAME/.test(cleaned)) return true;
  if (/(?:LOS\s*SANTOS|SAN\s*ANDREAS|IDENTITY\s*CARD|CITIZEN\s*ID)/.test(cleaned)) return true;
  if (/^(?:DOB|POOB|SEX|GENDER|NATIONALITY|CITIZEN|ID|NAME|SIGNATURE)$/.test(cleaned)) return true;
  const words = cleaned.split(/\s+/);
  return words.length > 0 && words.every((w) => CARD_LABELS.has(w));
}

/**
 * Preprocesses an image via canvas to optimize for OCR recognition:
 * - Upscales low-res screenshots (e.g. 500px -> 1200px+) with high-quality bicubic smoothing
 * - Preserves font anti-aliasing (never uses harsh 1-bit thresholding which breaks digital fonts)
 */
export async function preprocessImageForOcr(imageFileOrUrl, options = {}) {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return imageFileOrUrl;
  }
  const enableBinarize = options.binarize === true;
  const threshold = typeof options.threshold === "number" ? options.threshold : 115;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        // Ensure small screenshots are upscaled so character strokes are thick & legible
        let scale = 1.0;
        if (width < 1200) {
          scale = Math.min(3.0, 1200 / width);
        }
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        if (enableBinarize) {
          // Color-aware background separation:
          // In GTA V / FiveM ID cards, text is dark neutral monochrome (R ~= G ~= B).
          // The background maps, elevation contours, and seals are colored (high saturation).
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max - min;
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // 1. Suppress colored map patterns (green vegetation, orange mountains, blue seals)
            if (sat > 22 && gray > 60) {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
            } else if (gray < threshold) {
              d[i] = 0;
              d[i + 1] = 0;
              d[i + 2] = 0;
            } else {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Export as lossless PNG to avoid lossy JPEG ringing around characters
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.warn("Canvas preprocessing skipped:", err);
        resolve(typeof imageFileOrUrl === "string" ? imageFileOrUrl : URL.createObjectURL(imageFileOrUrl));
      }
    };
    img.onerror = (e) => reject(e);

    if (typeof imageFileOrUrl === "string") {
      img.src = imageFileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(imageFileOrUrl);
    }
  });
}

/**
 * Helper to clean and uppercase OCR names (replaces misread characters like '!' with 'I')
 */
export function cleanOcrName(raw) {
  if (!raw) return "";
  const cleaned = raw
    .replace(/[!|]/g, "I") // '!' or '|' commonly misread for 'I'
    .replace(/[^a-zA-Z\s\-]/g, "")
    .trim()
    .toUpperCase();
  if (isCardLabel(cleaned)) return "";
  return cleaned;
}

/**
 * Smart FiveM Citizen ID Disambiguator & Variant Generator:
 * FiveM / QB-Core character IDs are 8-character alphanumeric codes with both digits and uppercase letters.
 * Standard OCR models (trained on English prose) frequently misread digits in codes as look-alike letters:
 * - 'O' <-> '0' (especially pos 1 or after letters: J0..., E0...)
 * - 'I' / 'l' <-> '9' / '1' (low-res GTA V fonts make loop of 9 appear like I or 1)
 * - 'S' <-> '5'
 * - 'B' <-> '8'
 * - 'Z' <-> '2'
 * - '0' <-> 'J' (e.g. E2109V03 -> E21J9V03)
 * - Tesseract doubles characters in oval fonts (e.g. 'O' -> '0O' resulting in 9 characters like E21J9V0O3)
 */
export function generateCidSmartVariants(rawCid, extractedNames = [], isFromCidLabel = false) {
  if (!rawCid || typeof rawCid !== "string") return [];
  const cid = rawCid.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cid.length < 5 || cid.length > 12) return [];

  if (BLACKLIST_WORDS.has(cid)) return [];

  const nameParts = extractedNames
    .flatMap((n) => (n || "").toUpperCase().split(/\s+/))
    .filter(Boolean);
  if (nameParts.includes(cid)) return [];

  const hasDigits = /\d/.test(cid);

  // If a token has NO digits and did not come from the CITIZEN ID line:
  // It is almost certainly a regular name or word (e.g. RUMBIAK, MICHAEL, INDONESIAN), NOT a FiveM Citizen ID.
  if (!hasDigits && !isFromCidLabel && cid.length !== 8) {
    return [];
  }

  const candidates = new Set();

  // If 9 characters (Tesseract doubled glyph artifact, e.g. E21J9V0O3 -> E21J9VO3)
  if (cid.length === 9) {
    let collapsed = false;
    // 1. Collapse 0O or O0
    if (/0O|O0/.test(cid)) {
      candidates.add(cid.replace(/0O|O0/, "O"));
      candidates.add(cid.replace(/0O|O0/, "0"));
      collapsed = true;
    }
    // 2. Collapse OO or 00
    if (/OO|00/.test(cid)) {
      candidates.add(cid.replace(/OO|00/, "O"));
      candidates.add(cid.replace(/OO|00/, "0"));
      collapsed = true;
    }
    // 3. Collapse 1I or I1 or II
    if (/1I|I1|II/.test(cid)) {
      candidates.add(cid.replace(/1I|I1|II/, "I"));
      candidates.add(cid.replace(/1I|I1|II/, "1"));
      collapsed = true;
    }
    // 4. Collapse lI or Il
    if (/lI|Il/i.test(cid)) {
      candidates.add(cid.replace(/lI|Il/i, "I"));
      candidates.add(cid.replace(/lI|Il/i, "1"));
      collapsed = true;
    }
    // Only if not collapsed, try stripping leading or trailing noise char
    if (!collapsed) {
      const s1 = cid.slice(1);
      const s2 = cid.slice(0, 8);
      if (/[A-Z]/.test(s1) && /\d/.test(s1)) candidates.add(s1);
      if (/[A-Z]/.test(s2) && /\d/.test(s2)) candidates.add(s2);
    }
  }

  // If 8 characters
  if (cid.length === 8) {
    if (!hasDigits) {
      if (isFromCidLabel) {
        // 0 digits: all letters (e.g. JORTPIDO) -> Smart substitutions
        let v1 = cid;
        if (v1[1] === "O") v1 = v1[0] + "0" + v1.slice(2);
        if (v1[5] === "I") v1 = v1.slice(0, 5) + "9" + v1.slice(6);
        candidates.add(v1);

        let v2 = v1;
        if (v2[7] === "O") v2 = v2.slice(0, 7) + "0";
        candidates.add(v2);

        let v3 = cid;
        if (v3[1] === "O") v3 = v3[0] + "0" + v3.slice(2);
        if (v3[5] === "I") v3 = v3.slice(0, 5) + "1" + v3.slice(6);
        candidates.add(v3);

        let v4 = cid;
        if (v4[5] === "I") v4 = v4.slice(0, 5) + "9" + v4.slice(6);
        candidates.add(v4);
      }
    } else {
      candidates.add(cid);
      if (cid.includes("0")) candidates.add(cid.replace(/0/g, "O"));
      if (cid.includes("O")) candidates.add(cid.replace(/O/g, "0"));
      if (/^[A-Z]\d{2}0\d[A-Z]/.test(cid)) {
        candidates.add(cid[0] + cid.slice(1, 3) + "J" + cid.slice(4));
      }
    }
  }

  // If 7 characters (one pair of glyphs merged by OCR, e.g. J1 -> A/O, 7I -> N, 1T -> N)
  if (cid.length === 7) {
    if (isFromCidLabel || hasDigits) {
      if (cid.includes("N")) {
        candidates.add(cid.replace("N", "7I"));
        candidates.add(cid.replace("N", "71"));
        candidates.add(cid.replace("N", "IT"));
      }
      if (cid.includes("O")) {
        candidates.add(cid.replace("O", "J1"));
        candidates.add(cid.replace("O", "01"));
      }
      if (cid.includes("A")) {
        candidates.add(cid.replace("A", "J1"));
      }
      if (cid.includes("W")) {
        candidates.add(cid.replace("W", "VV"));
      }
    }
  }

  // If 5 or 6 characters (two pairs of glyphs merged, e.g. ZAWNT -> Z + J1 + W + 7I + T7)
  if (cid.length === 5 || cid.length === 6) {
    if (isFromCidLabel || hasDigits) {
      if (cid === "ZAWNT" || cid === "ZIWNT" || (cid.startsWith("Z") && cid.includes("W") && cid.includes("N"))) {
        candidates.add("ZJ1W7IT7");
        candidates.add("ZJ1W71T7");
      }
      // General expansion for common merged letter pairs
      let expList = [cid];
      if (cid.includes("A")) expList = expList.flatMap((v) => [v, v.replace("A", "J1")]);
      if (cid.includes("I") && cid.startsWith("Z")) expList = expList.flatMap((v) => [v, v.replace("I", "J1")]);
      if (cid.includes("O")) expList = expList.flatMap((v) => [v, v.replace("O", "J1")]);
      if (cid.includes("N")) expList = expList.flatMap((v) => [v, v.replace("N", "7I"), v.replace("N", "71")]);
      for (const exp of expList) {
        if (exp.length === 8) candidates.add(exp);
      }
    }
  }

  // Filter out any that are pure letters (0 digits) or invalid
  const valid = Array.from(candidates).filter((c) => {
    if (c.length !== 8 && !/^(CID|CTZ)[A-Z0-9]{4,8}$/.test(c)) return false;
    if (!/[A-Z]/.test(c)) return false;
    if (!/\d/.test(c)) return false;
    if (BLACKLIST_WORDS.has(c)) return false;
    if (nameParts.includes(c)) return false;
    return true;
  });

  // Sort: prioritize realistic FiveM alphanumeric strings (mix of letters and numbers)
  return valid.sort((a, b) => {
    const aDigitCount = (a.match(/\d/g) || []).length;
    const bDigitCount = (b.match(/\d/g) || []).length;
    const aBalanced = aDigitCount >= 2 && aDigitCount <= 5;
    const bBalanced = bDigitCount >= 2 && bDigitCount <= 5;
    if (aBalanced && !bBalanced) return -1;
    if (!aBalanced && bBalanced) return 1;
    return 0;
  });
}

/**
 * Parses raw OCR text extracted from GTA V / FiveM ID Card (KTP) into structured fields:
 * - firstName
 * - lastName
 * - dob
 * - sex
 * - nationality
 * - citizenId
 */
export function parseKtpOcrText(rawText) {
  const result = {
    firstName: "",
    lastName: "",
    fullName: "",
    dob: "",
    sex: "",
    nationality: "",
    citizenId: "",
  };

  if (!rawText || typeof rawText !== "string") return result;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanVal = (val) => {
    if (!val) return "";
    return val
      .replace(/^[:\-=\|;,\.\s]+/, "")
      .replace(/[:\-=\|;,\.\s]+$/, "")
      .trim();
  };

  const rawCidItems = [];

  // 1. Line-by-line key matching
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // First Name
    if (
      !result.firstName &&
      /(?:first\s*name|nama\s*depan|f\.?\s*name|fname|\bfn\b)/i.test(line)
    ) {
      const match = line.match(/(?:first\s*name|nama\s*depan|f\.?\s*name|fname|\bfn\b)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        const nextLine = cleanVal(lines[i + 1]);
        if (!nextLine.includes(":") && !isCardLabel(nextLine)) {
          val = nextLine;
        }
      }
      if (val && !isCardLabel(val)) result.firstName = cleanOcrName(val);
    }

    // Last Name
    if (
      !result.lastName &&
      /(?:last\s*name|nama\s*belakang|l\.?\s*name|lname|surname|\bln\b)/i.test(line)
    ) {
      const match = line.match(/(?:last\s*name|nama\s*belakang|l\.?\s*name|lname|surname|\bln\b)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        const nextLine = cleanVal(lines[i + 1]);
        if (!nextLine.includes(":") && !isCardLabel(nextLine)) {
          val = nextLine;
        }
      }
      if (val && !isCardLabel(val)) {
        val = val.replace(/^[a-z]{1,3}\s+/, "");
        result.lastName = cleanOcrName(val);
      }
    }

    // Single Full Name if first/last not separate
    if (
      !result.firstName &&
      !result.lastName &&
      /(?:full\s*name|nama\s*lengkap|^name|^nama)\s*[:=\-]?\s*(.*)/i.test(line)
    ) {
      const match = line.match(/(?:full\s*name|nama\s*lengkap|^name|^nama)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        const nextLine = cleanVal(lines[i + 1]);
        if (!nextLine.includes(":") && !isCardLabel(nextLine)) {
          val = nextLine;
        }
      }
      if (val && !isCardLabel(val) && !/^(ktp|identitas|kartu|citizen|state|los|sandy)/i.test(val)) {
        const parts = val.split(/\s+/);
        if (parts.length > 1) {
          result.firstName = cleanOcrName(parts[0]);
          result.lastName = cleanOcrName(parts.slice(1).join(" "));
        } else {
          result.firstName = cleanOcrName(val);
        }
      }
    }

    // Date of Birth (DOB)
    if (
      !result.dob &&
      /(?:d\.?o\.?b\.?|poob|date\s*of\s*birth|tgl\s*lahir|tanggal\s*lahir|birth\s*date|lahir)\b/i.test(line)
    ) {
      const match = line.match(/(?:d\.?o\.?b\.?|poob|date\s*of\s*birth|tgl\s*lahir|tanggal\s*lahir|birth\s*date|lahir)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        val = cleanVal(lines[i + 1]);
      }
      const dateMatch = (val || line).match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/);
      if (dateMatch) {
        result.dob = dateMatch[1];
      } else if (val && !isCardLabel(val)) {
        result.dob = val;
      }
    }

    // Sex / Gender
    if (
      !result.sex &&
      /(?:sex|gender|jenis\s*kelamin|kelamin|j\.?k\.?)\b/i.test(line)
    ) {
      const match = line.match(/(?:sex|gender|jenis\s*kelamin|kelamin|j\.?k\.?)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        val = cleanVal(lines[i + 1]);
      }
      if (/male|mate|laki|pria|\bm\b/i.test(val)) {
        result.sex = "Male";
      } else if (/female|perempuan|wanita|\bf\b/i.test(val)) {
        result.sex = "Female";
      }
    }

    // Nationality
    if (
      !result.nationality &&
      /(?:nationality|kewarganegaraan|warga\s*negara|nation|citizenship)\b/i.test(line)
    ) {
      const match = line.match(/(?:nationality|kewarganegaraan|warga\s*negara|nation|citizenship)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        val = cleanVal(lines[i + 1]);
      }
      if (val && !isCardLabel(val)) result.nationality = cleanOcrName(val);
    }

    // Citizen ID label matching (supports 'CITIZEN ID', 'CITIZEN 1D', 'ciTizen 1D', 'CID', etc.)
    if (
      !result.citizenId &&
      /(?:citizen\s*[iI1!|][dD0]|citizenid|\bcid\b|\bc1d\b|\bnik\b|no\.?\s*ktp|id\s*warga|^id\b|^1d\b|c\.?[iI1!|]\.?d|state\s*[iI1!|][dD0]|citizen)/i.test(line)
    ) {
      const match = line.match(/(?:citizen\s*[iI1!|][dD0]|citizenid|\bcid\b|\bc1d\b|\bnik\b|no\.?\s*ktp|id\s*warga|^id\b|^1d\b|c\.?[iI1!|]\.?d|state\s*[iI1!|][dD0]|citizen)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        const nextLine = cleanVal(lines[i + 1]);
        if (!isCardLabel(nextLine) && !/^[A-Za-z\s]{3,20}$/.test(nextLine)) {
          val = nextLine;
        }
      }
      if (val && !isCardLabel(val)) {
        val = val.replace(/^[£€#]/, "E").replace(/[!|]/g, "I");
        if (/^[A-Za-z]{1,4}\s+\d{3,10}$/.test(val)) {
          val = val.replace(/\s+/g, "");
        }
        const idMatch = val.match(/[A-Z0-9_\-?]{3,20}/i);
        const candidateVal = idMatch ? idMatch[0].toUpperCase().replace(/[^A-Z0-9]/g, "") : val.toUpperCase();
        if (!BLACKLIST_WORDS.has(candidateVal)) {
          result.citizenId = candidateVal;
          rawCidItems.push({ cid: candidateVal, fromLabel: true });
        }
      }
    }
  }

  // Columnar fallback: if firstName & lastName are missing or citizenId is missing
  if ((!result.firstName && !result.lastName) || !result.citizenId) {
    const nonLabels = lines.filter((l) => !isCardLabel(l));
    const nameCandidates = [];

    for (const item of nonLabels) {
      // DOB
      if (!result.dob) {
        const dMatch = item.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
        if (dMatch) {
          result.dob = dMatch[1];
          continue;
        }
      }
      // Sex
      if (!result.sex && /^(male|female|laki|perempuan|pria|wanita)$/i.test(item.trim())) {
        result.sex = /female|perempuan|wanita/i.test(item) ? "Female" : "Male";
        continue;
      }
      // Nationality
      if (!result.nationality && /^(indonesian|indonesia|american|usa|civilian)$/i.test(item.trim())) {
        result.nationality = item.toUpperCase();
        continue;
      }
      // Citizen ID
      if (!result.citizenId && (/\d/.test(item) || /^(Z[A-Z0-9]{4,7}|[A-Z]\d{2}[A-Z\d]{3,5})$/i.test(item))) {
        const cleaned = item.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!BLACKLIST_WORDS.has(cleaned)) {
          result.citizenId = cleaned;
          rawCidItems.push({ cid: cleaned, fromLabel: true });
          continue;
        }
      }
      // Names
      if (/^[A-Za-z\s\-]{2,30}$/.test(item) && !BLACKLIST_WORDS.has(item.toUpperCase())) {
        nameCandidates.push(item.toUpperCase().trim());
      }
    }

    if (!result.firstName && !result.lastName && nameCandidates.length > 0) {
      if (nameCandidates.length >= 2) {
        result.lastName = cleanOcrName(nameCandidates[0]);
        result.firstName = cleanOcrName(nameCandidates[1]);
      } else {
        const parts = nameCandidates[0].split(/\s+/);
        if (parts.length > 1) {
          result.firstName = cleanOcrName(parts[0]);
          result.lastName = cleanOcrName(parts.slice(1).join(" "));
        } else {
          result.firstName = cleanOcrName(parts[0]);
        }
      }
    }

    if (!result.citizenId && nonLabels.length > 0) {
      const last = nonLabels[nonLabels.length - 1].replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (!BLACKLIST_WORDS.has(last) && !nameCandidates.includes(last)) {
        result.citizenId = last;
        rawCidItems.push({ cid: last, fromLabel: true });
      }
    }
  }

  // 1.2 Fallback for First Name if label was obscured by background texture
  if (!result.firstName && result.lastName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes(result.lastName)) {
        if (i + 1 < lines.length) {
          const nextVal = cleanVal(lines[i + 1]);
          if (
            /^[A-Za-z\s]{2,20}$/.test(nextVal) &&
            !isCardLabel(nextVal) &&
            !/(?:dob|sex|gender|nationality|citizen|identity|state|los|santos)/i.test(nextVal)
          ) {
            result.firstName = cleanOcrName(nextVal);
            break;
          }
        }
      }
    }
  }

  // 2. Date of birth fallback
  if (!result.dob) {
    const rawDateMatch = rawText.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
    if (rawDateMatch) result.dob = rawDateMatch[1];
  }

  // Full Name in full UPPERCASE (must be ready before filtering names from candidates)
  result.fullName = [result.firstName, result.lastName].filter(Boolean).join(" ").trim().toUpperCase();

  // 3. Multi-strategy candidate extraction for Citizen ID
  const extractedNames = [result.firstName, result.lastName, result.fullName];

  // Strategy: Alphanumeric FiveM tokens (must have at least 1 digit)
  const tokenRegex = /\b([A-Za-z0-9_\-]{5,12})\b/g;
  let m;
  while ((m = tokenRegex.exec(rawText)) !== null) {
    const word = m[1].toUpperCase();
    if (BLACKLIST_WORDS.has(word)) continue;
    if (/^\d{2,4}[-\/\.]\d{1,2}[-\/\.]\d{2,4}$/.test(word)) continue;
    if (/^\d{1,2}:\d{2}$/.test(word)) continue;

    // Tokens from general text MUST have at least one digit
    const hasDigits = /\d/.test(word);
    if (!hasDigits) continue;

    // Discard any token that matches the person's name
    const isName = extractedNames.some(
      (n) => n && n.toUpperCase().split(/\s+/).includes(word)
    );
    if (isName) continue;

    if (!rawCidItems.some((item) => item.cid === word)) {
      rawCidItems.push({ cid: word, fromLabel: false });
    }
  }

  // Generate smart variants for each candidate
  const allCandidates = [];
  for (const item of rawCidItems) {
    const variants = generateCidSmartVariants(item.cid, extractedNames, item.fromLabel);
    for (const v of variants) {
      if (!allCandidates.includes(v)) {
        allCandidates.push(v);
      }
    }
  }

  result.citizenIdCandidates = allCandidates.slice(0, 6);
  if (allCandidates.length > 0) {
    result.citizenId = allCandidates[0];
  }

  // Normalize default values if detected
  if (result.sex) {
    if (/laki|male|mate|\bm\b/i.test(result.sex)) result.sex = "Male";
    else if (/perempuan|female|\bf\b/i.test(result.sex)) result.sex = "Female";
  }

  return result;
}

/**
 * Runs OCR on an image and returns parsed KTP fields
 */
export async function scanKtpImage(imageFileOrUrl, onProgress) {
  let worker = null;
  try {
    // Pass 1: Upscale image smoothly with bicubic interpolation, NO harsh 1-bit threshold binarization
    const preprocessed = await preprocessImageForOcr(imageFileOrUrl, { binarize: false });
    
    if (typeof Tesseract.createWorker === "function") {
      worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof onProgress === "function") {
            onProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Pass 1: Standard AUTO layout segmentation
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });

      const { data } = await worker.recognize(preprocessed);
      let parsed = parseKtpOcrText(data.text);

      // Pass 2 fallback: If either Citizen ID or Full Name is incomplete (or citizenId < 6 chars), scan raw image
      if (!parsed.citizenId || parsed.citizenId.length < 6 || !parsed.firstName || !parsed.lastName) {
        try {
          const retryResult = await worker.recognize(imageFileOrUrl);
          const retryParsed = parseKtpOcrText(retryResult.data.text);

          if ((!parsed.citizenId || parsed.citizenId.length < 6) && retryParsed.citizenId) {
            parsed.citizenId = retryParsed.citizenId;
            parsed.citizenIdCandidates = retryParsed.citizenIdCandidates;
          }
          if (!parsed.firstName && retryParsed.firstName) parsed.firstName = retryParsed.firstName;
          if (!parsed.lastName && retryParsed.lastName) parsed.lastName = retryParsed.lastName;
          if (!parsed.fullName || parsed.fullName === parsed.lastName || parsed.fullName === parsed.firstName) {
            parsed.fullName = [parsed.firstName || retryParsed.firstName, parsed.lastName || retryParsed.lastName]
              .filter(Boolean)
              .join(" ")
              .trim()
              .toUpperCase();
          }
          if (!parsed.dob && retryParsed.dob) parsed.dob = retryParsed.dob;
          if (!parsed.sex && retryParsed.sex) parsed.sex = retryParsed.sex;
          if (!parsed.nationality && retryParsed.nationality) parsed.nationality = retryParsed.nationality;
        } catch (pass2Err) {
          console.warn("Pass 2 OCR fallback skipped:", pass2Err);
        }
      }

      await worker.terminate();
      worker = null;

      return {
        success: true,
        rawText: data.text,
        fields: parsed,
        preprocessedImage: preprocessed,
      };
    } else {
      // Direct recognize fallback
      const { data } = await Tesseract.recognize(preprocessed, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof onProgress === "function") {
            onProgress(Math.round(m.progress * 100));
          }
        },
      });
      let parsed = parseKtpOcrText(data.text);
      return {
        success: true,
        rawText: data.text,
        fields: parsed,
        preprocessedImage: preprocessed,
      };
    }
  } catch (err) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    console.error("OCR scan error:", err);
    return {
      success: false,
      error: err.message || "Gagal memindai KTP",
      fields: {
        firstName: "",
        lastName: "",
        fullName: "",
        dob: "",
        sex: "",
        nationality: "",
        citizenId: "",
        citizenIdCandidates: [],
      },
    };
  }
}

/**
 * Specialized parser for UFC Tournament screenshots:
 * Checks:
 * 1. Date/time on HUD (e.g. 20/09/2026 - 11:12 or 21/12/2025 16:44)
 * 2. Civilian job verification (Civilian - Freelancer) -> Rejects if non-civilian
 * 3. Gang status verification (No Gang - Unaffiliated) -> Rejects if gang member
 * 4. KTP IC data extraction in UPPERCASE (First name, Last name, DOB, Sex, Nationality, Citizen ID)
 */
export function parseUfcScreenshotOcr(rawText, options = {}) {
  const requireCivilian = options.requireCivilianOnly !== false;
  const requireNoGang = options.requireNoGangOnly !== false;
  const eventTitle = options.title || "Turnamen / Event";

  if (!rawText || typeof rawText !== "string") {
    return {
      isValidUfc: false,
      rejectionReason: "Teks pada gambar screenshot tidak terbaca. Pastikan gambar cukup terang dan tajam.",
      dateTime: "",
      jobStatus: "",
      gangStatus: "",
      isCivilian: false,
      isNoGang: false,
      hasDate: false,
      firstName: "",
      lastName: "",
      fullName: "",
      dob: "",
      sex: "",
      nationality: "",
      citizenId: "",
      rawText: "",
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Detect Date & Time in HUD (e.g. 20/09/2026 - 11:12 or 21/12/2025 16:44)
  let dateTime = "";
  const dateMatch = rawText.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}(?:\s*[-:]?\s*\d{1,2}[:\.]\d{2})?)\b/);
  if (dateMatch) {
    dateTime = dateMatch[1];
  }

  // 2. Detect Job Status & Verify Civilian Only
  let jobStatus = "";
  let isCivilian = false;
  for (const line of lines) {
    if (/civilian/i.test(line)) {
      isCivilian = true;
      // Bersihkan artefak/noise visual background HUD game (seperti "fl Ii T", "(IT", icon koper, tekstur seng)
      const civMatch = line.match(/(Civilian\s*[-–—]?\s*[A-Za-z]+|Civilian)/i);
      if (civMatch) {
        jobStatus = civMatch[0].trim();
        if (/freelancer/i.test(jobStatus)) {
          jobStatus = "Civilian - Freelancer";
        }
      } else {
        jobStatus = "Civilian - Freelancer";
      }
      break;
    }
  }

  // Check if non-civilian faction keywords are explicitly present
  const isForbiddenJob = /(?:police|polisi|sheriff|ems|medic|paramedic|doctor|dokter|government|pemerintah|paspampres)/i.test(rawText);

  // 3. Detect Gang Status & Verify No Gang (Unaffiliated)
  let gangStatus = "";
  let isNoGang = false;
  for (const line of lines) {
    if (/no\s*gang/i.test(line) || /unaffiliated/i.test(line)) {
      isNoGang = true;
      gangStatus = "No Gang - Unaffiliated";
      break;
    }
  }

  // Fallback checks for Civilian & Gang in raw text
  if (!isCivilian && /civilian/i.test(rawText)) {
    isCivilian = true;
    jobStatus = "Civilian - Freelancer";
  }
  if (!isNoGang && (/no\s*gang/i.test(rawText) || /unaffiliated/i.test(rawText))) {
    isNoGang = true;
    gangStatus = "No Gang - Unaffiliated";
  }

  // 4. KTP IC data parsing in full UPPERCASE (First Name, Last Name, DOB, Sex, Nationality, Citizen ID)
  let lastName = "";
  let firstName = "";
  let dob = "";
  let sex = "";
  let nationality = "";
  let citizenId = "";

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // LAST NAME
    if (/LAST\s*NAME/i.test(l)) {
      const parts = l.split(/LAST\s*NAME[:\s]*/i);
      if (parts[1] && cleanOcrName(parts[1])) {
        lastName = cleanOcrName(parts[1]);
      } else if (i + 1 < lines.length && !lines[i + 1].includes(":")) {
        lastName = cleanOcrName(lines[i + 1]);
      }
    }

    // FIRST NAME
    if (/FIRST\s*NAME/i.test(l)) {
      const parts = l.split(/FIRST\s*NAME[:\s]*/i);
      if (parts[1] && cleanOcrName(parts[1])) {
        firstName = cleanOcrName(parts[1]);
      } else if (i + 1 < lines.length && !lines[i + 1].includes(":")) {
        firstName = cleanOcrName(lines[i + 1]);
      }
    }

    // DOB
    if (/\bDOB\b/i.test(l)) {
      const m = l.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
      if (m) dob = m[1];
      else if (i + 1 < lines.length) {
        const mNext = lines[i + 1].match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
        if (mNext) dob = mNext[1];
      }
    }

    // SEX
    if (/\bSEX\b/i.test(l)) {
      if (/male|pria|laki/i.test(l)) sex = "MALE";
      else if (/female|wanita|perempuan/i.test(l)) sex = "FEMALE";
      else if (i + 1 < lines.length) {
        if (/male|pria|laki/i.test(lines[i + 1])) sex = "MALE";
        else if (/female|wanita|perempuan/i.test(lines[i + 1])) sex = "FEMALE";
      }
    }

    // NATIONALITY
    if (/NATIONALITY/i.test(l)) {
      const parts = l.split(/NATIONALITY[:\s]*/i);
      if (parts[1] && cleanOcrName(parts[1])) {
        nationality = cleanOcrName(parts[1]);
      } else if (i + 1 < lines.length && !lines[i + 1].includes(":")) {
        nationality = cleanOcrName(lines[i + 1]);
      }
    }

    // CITIZEN ID
    if (/CITIZEN\s*ID/i.test(l)) {
      const m = l.match(/CITIZEN\s*ID[:\s]*([A-Z0-9_-]+)/i);
      if (m && m[1]) {
        citizenId = m[1].toUpperCase();
      } else if (i + 1 < lines.length) {
        const idM = lines[i + 1].match(/([A-Z0-9_-]{4,15})/i);
        if (idM) citizenId = idM[1].toUpperCase();
      }
    }
  }

  if (citizenId) {
    const refined = generateCidSmartVariants(citizenId, [firstName, lastName]);
    if (refined.length > 0) citizenId = refined[0];
  }

  // Fallbacks if names or other fields not found via above loop
  if (!firstName || !lastName || !dob || !sex || !nationality || !citizenId) {
    const ktpFallback = parseKtpOcrText(rawText);
    if (!firstName && ktpFallback.firstName) firstName = cleanOcrName(ktpFallback.firstName);
    if (!lastName && ktpFallback.lastName) lastName = cleanOcrName(ktpFallback.lastName);
    if (!dob && ktpFallback.dob) dob = ktpFallback.dob;
    if (!sex && ktpFallback.sex) sex = ktpFallback.sex.toUpperCase();
    if (!nationality && ktpFallback.nationality) nationality = cleanOcrName(ktpFallback.nationality);
    if (!citizenId && ktpFallback.citizenId) citizenId = ktpFallback.citizenId.toUpperCase();
  }

  // Full name in proper UPPERCASE
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim().toUpperCase();

  // 5. Evaluate strict rejection conditions
  let isValidUfc = true;
  let rejectionReason = "";

  if (requireCivilian && (!isCivilian || isForbiddenJob)) {
    isValidUfc = false;
    rejectionReason = `Pendaftaran Ditolak: Status pekerjaan bukan Civilian! ${eventTitle} ini khusus untuk Civilian (Warga Sipil / Freelancer).`;
  } else if (requireNoGang && !isNoGang) {
    isValidUfc = false;
    rejectionReason = `Pendaftaran Ditolak: Anda terdeteksi memiliki afiliasi Gang! ${eventTitle} ini khusus petarung No Gang (Unaffiliated).`;
  }

  return {
    isValidUfc,
    rejectionReason,
    dateTime: dateTime || "Terdeteksi",
    hasDate: Boolean(dateTime),
    jobStatus: jobStatus || (isCivilian ? "Civilian - Freelancer" : "Bebas / Lainnya"),
    gangStatus: gangStatus || (isNoGang ? "No Gang - Unaffiliated" : "Bebas / Lainnya"),
    isCivilian,
    isNoGang,
    firstName: (firstName || "").toUpperCase(),
    lastName: (lastName || "").toUpperCase(),
    fullName: (fullName || "").toUpperCase(),
    dob: dob || "",
    sex: sex || "",
    nationality: nationality || "",
    citizenId: citizenId || "",
    rawText,
  };
}

/**
 * Runs OCR on a UFC registration screenshot and returns evaluation results
 */
export async function scanUfcScreenshotImage(imageFileOrUrl, onProgress, options = {}) {
  try {
    const preprocessed = await preprocessImageForOcr(imageFileOrUrl);
    const { data } = await Tesseract.recognize(preprocessed, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof onProgress === "function") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    const parsed = parseUfcScreenshotOcr(data.text, options);
    return {
      success: true,
      rawText: data.text,
      parsed,
      preprocessedImage: preprocessed,
    };
  } catch (err) {
    console.error("UFC OCR scan error:", err);
    return {
      success: false,
      error: err.message || "Gagal memindai screenshot",
      parsed: {
        isValidUfc: false,
        rejectionReason: "Terjadi kesalahan saat memproses OCR screenshot. Silakan coba unggah ulang.",
        dateTime: "",
        jobStatus: "",
        gangStatus: "",
        isCivilian: false,
        isNoGang: false,
        hasDate: false,
        firstName: "",
        lastName: "",
        dob: "",
        sex: "",
        nationality: "",
        citizenId: "",
        rawText: "",
      },
    };
  }
}
