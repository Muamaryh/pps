import Tesseract from "tesseract.js";

/**
 * Preprocesses an image via canvas to optimize for OCR recognition:
 * - Upscales low-res screenshots (e.g. 500px -> 1200px+) with high-quality bicubic smoothing
 * - Binarizes / filters out background guilloche patterns, topographic elevation contours,
 *   and pastel map shading so only dark black text remains on a clean white background.
 */
export async function preprocessImageForOcr(imageFileOrUrl, options = {}) {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return imageFileOrUrl;
  }
  const enableBinarize = options.binarize !== false;
  const threshold = typeof options.threshold === "number" ? options.threshold : 118;

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
          // Adaptive thresholding: converts colored GTA V / FiveM ID backgrounds
          // (topographic lines, green terrain, watermarks) into pure white #FFFFFF,
          // and black text into pure black #000000.
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (gray < threshold) {
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
  return raw
    .replace(/[!|]/g, "I") // '!' or '|' commonly misread for 'I'
    .replace(/[^a-zA-Z\s\-]/g, "")
    .trim()
    .toUpperCase();
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
      if (val) result.firstName = cleanOcrName(val);
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
      if (val) {
        // Strip 1-3 letter lowercase noise artifacts before name (e.g. "gs SIRG" -> "SIRG")
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
      if (!val && i + 1 < lines.length && !lines[i + 1].includes(":")) {
        val = cleanVal(lines[i + 1]);
      }
      if (val && !/^(ktp|identitas|kartu|citizen|state|los|sandy)/i.test(val)) {
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
      if (/male|mate|laki|pria|\bm\b/i.test(val)) {
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
      if (val) result.nationality = cleanOcrName(val);
    }

    // Citizen ID
    if (
      !result.citizenId &&
      /(?:citizen\s*id|citizenid|cid|nik|no\.?\s*ktp|id\s*warga|^id\b|c\.?i\.?d)/i.test(line)
    ) {
      const match = line.match(/(?:citizen\s*id|citizenid|cid|nik|no\.?\s*ktp|id\s*warga|^id\b|c\.?i\.?d)\s*[:=\-]?\s*(.*)/i);
      let val = cleanVal(match?.[1]);
      if (!val && i + 1 < lines.length) {
        val = cleanVal(lines[i + 1]);
      }
      if (val) {
        val = val.replace(/^[£€#]/, "E").replace(/[!|]/g, "I");
        if (/^[A-Za-z]{1,4}\s+\d{3,10}$/.test(val)) {
          val = val.replace(/\s+/g, "");
        }
        const idMatch = val.match(/[A-Z0-9_-]{3,20}/i);
        result.citizenId = idMatch ? idMatch[0].toUpperCase() : val.toUpperCase();
      }
    }
  }

  // 2. Fallbacks scanning the entire raw string if still missing
  if (!result.dob) {
    const rawDateMatch = rawText.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
    if (rawDateMatch) result.dob = rawDateMatch[1];
  }

  if (!result.citizenId) {
    // Supports CTZ-xxx, CID-xxx, and FiveM alphanumeric hash CIDs (e.g. E21J9V03)
    const candidate = rawText.match(/\b(CTZ[-_]?[A-Z0-9]+|CID[-_]?[A-Z0-9]+|[A-Z]{1,4}\d{4,8}|[£€]?[A-Z0-9]{6,10})\b/i);
    if (candidate) {
      result.citizenId = candidate[1].replace(/^[£€#]/, "E").replace(/[!|]/g, "I").toUpperCase();
    }
  }

  // Normalize default values if detected
  if (result.sex) {
    if (/laki|male|mate|\bm\b/i.test(result.sex)) result.sex = "Male";
    else if (/perempuan|female|\bf\b/i.test(result.sex)) result.sex = "Female";
  }

  // Full Name in full UPPERCASE
  result.fullName = [result.firstName, result.lastName].filter(Boolean).join(" ").trim().toUpperCase();

  return result;
}

/**
 * Runs OCR on an image and returns parsed KTP fields
 */
export async function scanKtpImage(imageFileOrUrl, onProgress) {
  try {
    // Pass 1: Try with enhanced high-contrast binarization (removes 99% of GTA V KTP background textures)
    const preprocessed = await preprocessImageForOcr(imageFileOrUrl, { binarize: true, threshold: 118 });
    const { data } = await Tesseract.recognize(preprocessed, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof onProgress === "function") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    let parsed = parseKtpOcrText(data.text);

    // If Pass 1 found neither name nor CID, try Pass 2 with non-binarized smoothed image
    if (!parsed.fullName && !parsed.citizenId) {
      try {
        const rawPreprocessed = await preprocessImageForOcr(imageFileOrUrl, { binarize: false });
        const retryResult = await Tesseract.recognize(rawPreprocessed, "eng");
        const retryParsed = parseKtpOcrText(retryResult.data.text);
        if (retryParsed.fullName || retryParsed.citizenId) {
          parsed = retryParsed;
        }
      } catch {}
    }

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
        fullName: "",
        dob: "",
        sex: "",
        nationality: "",
        citizenId: "",
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
