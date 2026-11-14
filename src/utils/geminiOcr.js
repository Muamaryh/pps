/**
 * Google Gemini Vision AI OCR for GTA V / FiveM KTPs
 * High-accuracy multi-modal recognition directly extracting structured KTP data.
 */

const DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
];

/**
 * Retrieves the active Gemini API key from localStorage or Vite env
 */
export function getGeminiApiKey() {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("pps_gemini_api_key");
    if (local && local.trim()) return local.trim();
  }
  const envKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return "";
}

/**
 * Stores custom Gemini API key into localStorage
 */
export function setGeminiApiKey(key) {
  if (typeof window !== "undefined") {
    if (!key || !key.trim()) {
      localStorage.removeItem("pps_gemini_api_key");
    } else {
      localStorage.setItem("pps_gemini_api_key", key.trim());
    }
  }
}

/**
 * Converts File, Blob, Data URL, or Remote URL to raw base64 string + mimeType
 */
async function imageToBase64Payload(imageFileOrUrl) {
  // Case 1: Data URL string (e.g. data:image/jpeg;base64,...)
  if (typeof imageFileOrUrl === "string") {
    if (imageFileOrUrl.startsWith("data:")) {
      const match = imageFileOrUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
    }
    // Remote URL string
    try {
      const resp = await fetch(imageFileOrUrl);
      const blob = await resp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result;
          const m = res.match(/^data:([^;]+);base64,(.+)$/);
          if (m) resolve({ mimeType: m[1], data: m[2] });
          else reject(new Error("Gagal membaca gambar dari URL"));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      throw new Error("Gagal mengunduh gambar remote: " + e.message);
    }
  }

  // Case 2: File or Blob object
  if (imageFileOrUrl instanceof Blob || (typeof File !== "undefined" && imageFileOrUrl instanceof File)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        const m = typeof res === "string" ? res.match(/^data:([^;]+);base64,(.+)$/) : null;
        if (m) resolve({ mimeType: m[1], data: m[2] });
        else reject(new Error("Gagal membaca file gambar"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFileOrUrl);
    });
  }

  throw new Error("Format gambar tidak didukung");
}

/**
 * Scans GTA V / FiveM ID Card (KTP) using Google Gemini Vision AI
 */
export async function scanKtpWithGemini(imageFileOrUrl, customKey = null) {
  const apiKey = (customKey || getGeminiApiKey() || "").trim();
  if (!apiKey) {
    return { success: false, error: "NO_API_KEY", message: "Gemini API key tidak ditemukan." };
  }

  let payload;
  try {
    payload = await imageToBase64Payload(imageFileOrUrl);
  } catch (err) {
    return { success: false, error: "IMAGE_CONVERT_FAILED", message: err.message };
  }

  const prompt = `Anda adalah mesin OCR Vision AI berspesialisasi tinggi untuk membaca KTP IC game GTA V / FiveM Roleplay (QBCore, ESX, Los Santos / San Andreas Identity Card).

TUGAS: Ekstrak data teks dari gambar KTP ini secara 100% akurat tanpa typo.

PANDUAN ANTI-TYPO & VERIFIKASI HURUF:
1. CITIZEN ID / NIK:
   - Citizen ID pada FiveM umumnya berupa 4 s/d 10 karakter alfanumerik kapital (contoh: ZJ1W71T7, E21J9V03, BXA49218, atau angka murni).
   - Periksa huruf/angka yang rawan tertukar:
     * Angka 0 (nol) vs Huruf O (kapital)
     * Angka 1 (satu) vs Huruf I (kapital) vs Huruf L
     * Angka 8 (delapan) vs Huruf B
     * Angka 5 (lima) vs Huruf S
     * Angka 2 (dua) vs Huruf Z
     * Angka 6 (enam) vs Huruf G
   - HANYA ambil kodenya saja (buang simbol "#", awalan "ID:", "CITIZEN ID:", atau tanda baca).

2. NAMA LENGKAP (FIRST NAME & LAST NAME):
   - Baca huruf demi huruf dengan cermat sesuai font di gambar.
   - Jangan masukkan label kartu (seperti "FIRST NAME", "LAST NAME", "NAME", "IDENTITY", "SAN ANDREAS", "LOS SANTOS") ke dalam nilai nama.
   - Jangan tertukar antara FIRST NAME dan LAST NAME.
   - Jangan salah membaca garis latar belakang atau watermark peta sebagai huruf tambahan.
   - "fullName" adalah gabungan nama karakter yang bersih (First Name + Last Name).

3. TANGGAL LAHIR (DOB), GENDER/SEX, & NATIONALITY:
   - dob: format tanggal sesuai kartu (misal: "YYYY-MM-DD" atau "DD-MM-YYYY").
   - sex: "Male" atau "Female".
   - nationality: kewarganegaraan tertera (misal: "INDONESIA", "AMERICAN").

Keluarkan HANYA JSON murni tanpa markdown, tanpa tanda kutip tiga (no backticks):
{
  "firstName": "...",
  "lastName": "...",
  "fullName": "...",
  "dob": "...",
  "sex": "...",
  "nationality": "...",
  "citizenId": "..."
}`;

  let lastError = null;

  for (const model of DEFAULT_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: payload.mimeType || "image/jpeg",
                    data: payload.data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.0,
            top_p: 0.1,
          },
        }),
      });

      const data = await response.json();
      if (data.error) {
        lastError = data.error.message || JSON.stringify(data.error);
        console.warn(`[Gemini OCR] Model ${model} returned error:`, data.error);
        continue;
      }

      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        lastError = "AI tidak mengembalikan teks jawaban";
        continue;
      }

      // Parse JSON
      let parsed = {};
      try {
        parsed = JSON.parse(rawJson.replace(/^```json/i, "").replace(/```$/, "").trim());
      } catch (parseErr) {
        // Fallback regex if wrapped
        const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw parseErr;
      }

      // Sanitizer & Anti-Typo Cleaner
      const cleanField = (str) => {
        if (!str || typeof str !== "string") return "";
        return str
          .replace(/^(?:FIRST\s*NAME|LAST\s*NAME|FULL\s*NAME|NAME|CITIZEN\s*ID|NIK)[:\s-]*/i, "")
          .replace(/^(?:LOS\s*SANTOS|SAN\s*ANDREAS)[:\s-]*/i, "")
          .trim();
      };

      let firstName = cleanField(parsed.firstName).toUpperCase();
      let lastName = cleanField(parsed.lastName).toUpperCase();
      let fullName = cleanField(parsed.fullName).toUpperCase();

      // If fullName has label words accidentally retained, clean them
      fullName = fullName
        .replace(/\b(?:FIRST\s*NAME|LAST\s*NAME|NAME)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!fullName) {
        fullName = [firstName, lastName].filter(Boolean).join(" ").trim().toUpperCase();
      }

      // If firstName or lastName was empty, try splitting fullName
      if (!firstName && fullName.includes(" ")) {
        const parts = fullName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }

      // Clean Citizen ID: uppercase, strip '#', prefixes, and non-alphanumerics
      let citizenId = (parsed.citizenId || "").toString().trim().toUpperCase();
      citizenId = citizenId
        .replace(/^(?:#|CITIZEN\s*ID|ID|NIK)[:\s-]*/i, "")
        .replace(/[^A-Z0-9]/g, "");

      // Normalize Gender / Sex
      let sex = (parsed.sex || "").toString().trim();
      if (/^m(?:ale)?$/i.test(sex)) sex = "Male";
      else if (/^f(?:emale)?$/i.test(sex)) sex = "Female";

      return {
        success: true,
        source: "gemini-ai",
        modelUsed: model,
        fields: {
          firstName,
          lastName,
          fullName,
          dob: parsed.dob || "",
          sex,
          nationality: (parsed.nationality || "").trim().toUpperCase(),
          citizenId,
          citizenIdCandidates: citizenId ? [citizenId] : [],
        },
      };
    } catch (err) {
      lastError = err.message;
      console.warn(`[Gemini OCR] Error calling model ${model}:`, err);
    }
  }

  return {
    success: false,
    error: "ALL_MODELS_FAILED",
    message: lastError || "Semua model Gemini gagal merespon.",
  };
}
