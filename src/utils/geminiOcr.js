/**
 * Google Gemini Vision AI OCR for GTA V / FiveM KTPs
 * High-accuracy multi-modal recognition directly extracting structured KTP data.
 */

const DEFAULT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite"
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

  const prompt = `Ekstrak data KTP IC GTA V / FiveM dari gambar ini ke dalam JSON terstruktur.
PENTING:
- Baca kolom LAST NAME dan FIRST NAME secara teliti.
- Baca CITIZEN ID secara akurat (biasanya 8 karakter alfanumerik FiveM seperti ZJ1W71T7, E21J9V03, dsb).
- Pastikan tidak memasukkan label kartu seperti "DOB", "FIRST NAME", atau "LAST NAME" ke dalam kolom nama.
- Format respon HANYA berupa JSON valid murni tanpa markdown, tanpa backtick:
{
  "firstName": "...",
  "lastName": "...",
  "fullName": "...",
  "dob": "YYYY-MM-DD",
  "sex": "Male atau Female",
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
            temperature: 0.1,
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

      const firstName = (parsed.firstName || "").trim().toUpperCase();
      const lastName = (parsed.lastName || "").trim().toUpperCase();
      let fullName = (parsed.fullName || "").trim().toUpperCase();
      if (!fullName) {
        fullName = [firstName, lastName].filter(Boolean).join(" ").trim().toUpperCase();
      }

      const citizenId = (parsed.citizenId || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      return {
        success: true,
        source: "gemini-ai",
        modelUsed: model,
        fields: {
          firstName,
          lastName,
          fullName,
          dob: parsed.dob || "",
          sex: parsed.sex || "",
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
