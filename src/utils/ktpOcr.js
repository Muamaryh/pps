import Tesseract from "tesseract.js";

/**
 * Preprocesses an image via canvas to optimize for OCR recognition:
 * - Resizes to optimal resolution (width ~1000px)
 * - Enhances contrast
 */
export async function preprocessImageForOcr(imageFileOrUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Scale to around 1000px width for fast yet sharp OCR
        const targetWidth = Math.min(Math.max(img.width, 800), 1200);
        const scale = targetWidth / img.width;
        const targetHeight = Math.round(img.height * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw original
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Enhance contrast slightly
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const d = imageData.data;
        const contrast = 1.15; // +15% contrast
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < d.length; i += 4) {
          d[i] = factor * (d[i] - 128) + 128;     // R
          d[i + 1] = factor * (d[i + 1] - 128) + 128; // G
          d[i + 2] = factor * (d[i + 2] - 128) + 128; // B
        }
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (err) {
        // If canvas fails (e.g. CORS), fallback to original source
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
      .replace(/^[:\-=\|\s]+/, "")
      .replace(/[:\-=\|]+$/, "")
      .trim();
  };

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
      if (!val && i + 1 < lines.length && !lines[i + 1].includes(":")) {
        val = cleanVal(lines[i + 1]);
      }
      if (val) result.firstName = val;
    }

    // Last Name
    if (
      !result.lastName &&
      /(?:last\s*name|nama\s*belakang|l\.?\s*name|lname|surname|\bln\b)/i.test(line)
    ) {
      const match = line.match(/(?:last\s*name|nama\s*belakang|l\.?\s*name|lname|surname|\bln\b)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length && !lines[i + 1].includes(":")) {
        val = cleanVal(lines[i + 1]);
      }
      if (val) result.lastName = val;
    }

    // Single Full Name if first/last not separate
    if (
      !result.firstName &&
      !result.lastName &&
      /(?:full\s*name|nama\s*lengkap|^name|^nama)\s*[:=\-]?\s*(.*)/i.test(line)
    ) {
      const match = line.match(/(?:full\s*name|nama\s*lengkap|^name|^nama)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length && !lines[i + 1].includes(":")) {
        val = cleanVal(lines[i + 1]);
      }
      if (val && !/^(ktp|identitas|kartu|citizen|state|los|sandy)/i.test(val)) {
        const parts = val.split(/\s+/);
        if (parts.length > 1) {
          result.firstName = parts[0];
          result.lastName = parts.slice(1).join(" ");
        } else {
          result.firstName = val;
        }
      }
    }

    // Date of Birth (DOB)
    if (
      !result.dob &&
      /(?:d\.?o\.?b\.?|date\s*of\s*birth|tgl\s*lahir|tanggal\s*lahir|birth\s*date|lahir)\b/i.test(line)
    ) {
      const match = line.match(/(?:d\.?o\.?b\.?|date\s*of\s*birth|tgl\s*lahir|tanggal\s*lahir|birth\s*date|lahir)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        val = cleanVal(lines[i + 1]);
      }
      // Check date regex
      const dateMatch = (val || line).match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/);
      if (dateMatch) {
        result.dob = dateMatch[1];
      } else if (val) {
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
      if (/male|laki|pria|\bm\b/i.test(val)) {
        result.sex = "Male";
      } else if (/female|perempuan|wanita|\bf\b/i.test(val)) {
        result.sex = "Female";
      } else if (val) {
        result.sex = val;
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
      if (val) result.nationality = val;
    }

    // Citizen ID
    if (
      !result.citizenId &&
      /(?:citizen\s*id|citizenid|cid|nik|no\.?\s*ktp|id\s*warga|^id\b)/i.test(line)
    ) {
      const match = line.match(/(?:citizen\s*id|citizenid|cid|nik|no\.?\s*ktp|id\s*warga|^id\b)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        val = cleanVal(lines[i + 1]);
      }
      if (val) {
        const idMatch = val.match(/[A-Z0-9_-]{3,20}/i);
        result.citizenId = idMatch ? idMatch[0].toUpperCase() : val;
      }
    }
  }

  // 2. Fallbacks scanning the entire raw string if still missing
  if (!result.dob) {
    const rawDateMatch = rawText.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
    if (rawDateMatch) result.dob = rawDateMatch[1];
  }

  if (!result.citizenId) {
    const candidate = rawText.match(/\b(CTZ[-_]?[A-Z0-9]+|CID[-_]?[A-Z0-9]+|[A-Z]{2,4}\d{4,8})\b/i);
    if (candidate) result.citizenId = candidate[1].toUpperCase();
  }

  // Normalize default values if detected
  if (result.sex) {
    if (/laki|male|\bm\b/i.test(result.sex)) result.sex = "Male";
    else if (/perempuan|female|\bf\b/i.test(result.sex)) result.sex = "Female";
  }

  return result;
}

/**
 * Runs OCR on an image and returns parsed KTP fields
 */
export async function scanKtpImage(imageFileOrUrl, onProgress) {
  try {
    const preprocessed = await preprocessImageForOcr(imageFileOrUrl);
    const { data } = await Tesseract.recognize(preprocessed, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof onProgress === "function") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    const parsed = parseKtpOcrText(data.text);
    return {
      success: true,
      rawText: data.text,
      fields: parsed,
      preprocessedImage: preprocessed,
    };
  } catch (err) {
    console.error("OCR scan error:", err);
    return {
      success: false,
      error: err.message || "Gagal memindai KTP",
      fields: {
        firstName: "",
        lastName: "",
        dob: "",
        sex: "",
        nationality: "",
        citizenId: "",
      },
    };
  }
}
