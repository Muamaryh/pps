/**
 * Google Gemini Vision AI OCR for GTA V / FiveM KTPs & HUD Status
 * High-accuracy multi-modal recognition with step-by-step spatial verification.
 */

import { loadCloudOcrConfig, saveCloudOcrConfig } from "../services/firebase.js";

const DEFAULT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

/**
 * Calls Gemini generateContent with timeout and 1 automatic retry on transient 503/429 errors
 * so temporary high-demand spikes do not immediately degrade to weaker lite models.
 */
async function callGeminiGenerateContent(model, apiKey, requestBody, { maxRetries = 0, timeoutMs = 16000 } = {}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let lastData = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller ? controller.signal : undefined,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      lastData = data;

      const errCode = data?.error?.code || response.status;
      const isTransient = errCode === 503 || errCode === 429;
      if (data?.error && isTransient && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 850));
        continue;
      }
      return data;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 850));
        continue;
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return lastData;
}

let cachedCloudGeminiKey = null;
let cloudKeyPromise = null;

/**
 * Retrieves synchronous Gemini API key from localStorage, memory cache, or Vite env
 */
export function getGeminiApiKey() {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("pps_gemini_api_key");
    if (local && local.trim()) return local.trim();
  }
  if (cachedCloudGeminiKey && cachedCloudGeminiKey.trim()) {
    return cachedCloudGeminiKey.trim();
  }
  const envKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return "";
}

/**
 * Asynchronously resolves the active Gemini API key (localStorage -> env -> Firestore Cloud Config)
 * Ensures live deployed builds always have AI Vision enabled even without local .env files.
 */
export async function resolveGeminiApiKey(customKey = null) {
  if (customKey && customKey.trim()) return customKey.trim();

  const syncKey = getGeminiApiKey();
  if (syncKey) return syncKey;

  try {
    if (!cloudKeyPromise) {
      cloudKeyPromise = loadCloudOcrConfig().finally(() => {
        cloudKeyPromise = null;
      });
    }
    const cfg = await cloudKeyPromise;
    if (cfg && typeof cfg.geminiApiKey === "string" && cfg.geminiApiKey.trim()) {
      cachedCloudGeminiKey = cfg.geminiApiKey.trim();
      return cachedCloudGeminiKey;
    }
  } catch (err) {
    console.warn("[Gemini OCR] Cloud key lookup skipped:", err);
  }

  return "";
}

/**
 * Stores custom Gemini API key into localStorage and optionally syncs to Firestore Cloud Config
 */
export async function setGeminiApiKey(key, options = { syncCloud: false }) {
  const cleanKey = (key || "").trim();
  cachedCloudGeminiKey = cleanKey || cachedCloudGeminiKey;
  if (typeof window !== "undefined") {
    if (!cleanKey) {
      localStorage.removeItem("pps_gemini_api_key");
    } else {
      localStorage.setItem("pps_gemini_api_key", cleanKey);
    }
  }
  if (options?.syncCloud) {
    cachedCloudGeminiKey = cleanKey;
    await saveCloudOcrConfig(cleanKey);
  }
}

/**
 * Converts File, Blob, Data URL, or Remote URL to raw base64 string + mimeType
 */
async function imageToBase64Payload(imageFileOrUrl) {
  if (typeof imageFileOrUrl === "string") {
    if (imageFileOrUrl.startsWith("data:")) {
      const match = imageFileOrUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
    }
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
export async function scanKtpWithGemini(imageFileOrUrl, customKey = null, options = {}) {
  const apiKey = await resolveGeminiApiKey(customKey);
  if (!apiKey) {
    return { success: false, error: "NO_API_KEY", message: "Gemini API key tidak ditemukan." };
  }

  let payload;
  try {
    payload = await imageToBase64Payload(imageFileOrUrl);
  } catch (err) {
    return { success: false, error: "IMAGE_CONVERT_FAILED", message: err.message };
  }

  const isMinimal = Boolean(options?.minimal);

  const prompt = isMinimal
    ? `Anda adalah mesin OCR Vision AI berpresisi tinggi untuk membaca KTP IC game GTA V / FiveM Roleplay (Los Santos Identity / San Andreas Identity Card).
FOKUS HANYA PADA 3 DATA PENTING: FIRST NAME, LAST NAME, dan CITIZEN ID (abaikan DOB, SEX, NATIONALITY, tanda tangan, dan watermark peta).

CARA BERPIKIR SEBELUM AUTO-FILL (WAJIB DIIKUTI):
Pada kartu identitas Los Santos Identity, label berada di kolom kiri dan nilainya SEJAJAR LURUS DI SEBELAH KANAN pada baris horizontal yang sama:
1. Cari label "LAST NAME" -> baca teks yang sejajar lurus di sebelah kanannya pada baris yang sama (contoh: "WAZA"). Itu adalah "lastName". Jangan pernah tertukar dengan FIRST NAME!
2. Cari label "FIRST NAME" -> baca teks yang sejajar lurus di sebelah kanannya pada baris yang sama (contoh: "KWAZA"). Itu adalah "firstName".
3. "fullName" adalah gabungan "firstName" diikuti spasi lalu "lastName" (contoh: "KWAZA WAZA"). Pastikan ejaan tiap huruf nama 100% persis seperti di gambar tanpa typo!
4. Cari label "CITIZEN ID" -> baca kode alfanumerik yang SEJAJAR LURUS DI SEBELAH KANANNYA pada baris yang sama (contoh: "J0RTP9DO" atau "B4500YVP").

ATURAN ANTI-TYPO CITIZEN ID (PERIKSA HURUF DEMI HURUF):
- Citizen ID umumnya 6 s/d 10 karakter huruf kapital & angka (contoh: J0RTP9DO, ZJ1W71T7, E21J9V03, B4500YVP).
- Amati bentuk setiap karakter dengan cermat:
  * Angka 0 (oval ramping/lonjong) vs Huruf O (bulat lebar) - contoh pada "J0RTP9DO": karakter ke-2 adalah angka 0, karakter terakhir adalah huruf O.
  * Angka 9 vs Huruf S / P / g.
  * Angka 1 vs Huruf I / L.
  * Angka 8 vs Huruf B, Angka 5 vs Huruf S, Angka 2 vs Huruf Z, Angka 6 vs Huruf G, Huruf D vs 0/O.
- DILARANG KERAS mengambil tulisan tanda tangan sambung/kursif di kiri bawah kartu atau gambar latar belakang peta/watermark sebagai nama maupun Citizen ID!
- Jangan masukkan kata label ("FIRST NAME", "LAST NAME", "CITIZEN ID", "LOS SANTOS") ke dalam isi data.

Tuliskan verifikasi ejaan baris-per-baris Anda terlebih dahulu pada field "reasoning", lalu isi hasil akhirnya secara presisi dalam JSON murni:
{
  "reasoning": "Baris LAST NAME sejajar kanan dengan ..., FIRST NAME sejajar kanan dengan ..., CITIZEN ID sejajar kanan dieja huruf-per-huruf: ...",
  "firstName": "...",
  "lastName": "...",
  "fullName": "...",
  "citizenId": "..."
}`
    : `Anda adalah mesin OCR Vision AI berspesialisasi tinggi untuk membaca KTP IC game GTA V / FiveM Roleplay (Los Santos Identity / San Andreas Identity Card).

CARA BERPIKIR SEBELUM AUTO-FILL (WAJIB DIIKUTI):
Pada kartu identitas Los Santos Identity, label berada di kolom kiri dan nilainya berada SEJAJAR LURUS DI SEBELAH KANAN pada baris horizontal yang sama:
1. Cari label "LAST NAME" -> baca teks yang sejajar lurus di sebelah kanannya pada baris yang sama (contoh: "WAZA"). Itu adalah "lastName".
2. Cari label "FIRST NAME" -> baca teks yang sejajar lurus di sebelah kanannya pada baris yang sama (contoh: "KWAZA"). Itu adalah "firstName".
3. "fullName" adalah gabungan "firstName" diikuti spasi lalu "lastName" (contoh: "KWAZA WAZA").
4. Cari label "DOB" -> baca tanggal lahir yang sejajar lurus di sebelah kanannya (contoh: "1998-01-01").
5. Cari label "SEX" -> baca jenis kelamin yang sejajar lurus di sebelah kanannya ("Male" atau "Female").
6. Cari label "NATIONALITY" -> baca kewarganegaraan yang sejajar lurus di sebelah kanannya (contoh: "INDONESIA").
7. Cari label "CITIZEN ID" -> baca kode alfanumerik yang SEJAJAR LURUS DI SEBELAH KANANNYA pada baris yang sama (contoh: "J0RTP9DO").

ATURAN ANTI-TYPO CITIZEN ID (PERIKSA HURUF DEMI HURUF):
- Citizen ID umumnya 6 s/d 10 karakter huruf kapital & angka (contoh: J0RTP9DO, ZJ1W71T7, E21J9V03).
- Amati bentuk karakter dengan cermat:
  * Angka 0 (oval ramping) vs Huruf O (bulat lebar) - contoh pada "J0RTP9DO": karakter ke-2 adalah angka 0, karakter terakhir adalah huruf O.
  * Angka 9 vs Huruf S / P / g.
  * Angka 1 vs Huruf I / L.
  * Angka 8 vs Huruf B, Angka 5 vs Huruf S, Angka 2 vs Huruf Z.
- DILARANG KERAS mengambil tulisan tanda tangan sambung/kursif di kiri bawah kartu atau gambar latar belakang peta/watermark sebagai Citizen ID!
- Jangan masukkan kata label ("FIRST NAME", "LAST NAME", "CITIZEN ID", "LOS SANTOS") ke dalam isi data.

Tuliskan analisis singkat baris-per-baris Anda terlebih dahulu pada field "reasoning", lalu isi hasil akhirnya secara presisi dalam JSON murni:
{
  "reasoning": "Baris LAST NAME sejajar kanan dengan ..., FIRST NAME sejajar kanan dengan ..., CITIZEN ID sejajar kanan dengan ...",
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
      const requestBody = {
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
      };

      const data = await callGeminiGenerateContent(model, apiKey, requestBody, {
        maxRetries: model === "gemini-3-flash-preview" ? 1 : 0,
        timeoutMs: 16000,
      });

      if (data?.error) {
        lastError = data.error.message || JSON.stringify(data.error);
        console.warn(`[Gemini OCR] Model ${model} returned error:`, data.error);
        continue;
      }

      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        lastError = "AI tidak mengembalikan teks jawaban";
        continue;
      }

      let parsed = {};
      try {
        parsed = JSON.parse(rawJson.replace(/^```json/i, "").replace(/```$/, "").trim());
      } catch (parseErr) {
        const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw parseErr;
      }

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

      fullName = fullName
        .replace(/\b(?:FIRST\s*NAME|LAST\s*NAME|NAME)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();
      } else if (!fullName) {
        fullName = [firstName, lastName].filter(Boolean).join(" ").trim().toUpperCase();
      }

      if (!firstName && fullName.includes(" ")) {
        const parts = fullName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }

      let citizenId = (parsed.citizenId || "").toString().trim().toUpperCase();
      citizenId = citizenId
        .replace(/^(?:#|CITIZEN\s*ID|ID|NIK)[:\s-]*/i, "")
        .replace(/[^A-Z0-9]/g, "");

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

/**
 * Scans GTA V / FiveM HUD Status screenshot using Google Gemini Vision AI
 */
export async function scanStatusWithGemini(imageFileOrUrl, customKey = null) {
  const apiKey = await resolveGeminiApiKey(customKey);
  if (!apiKey) {
    return { success: false, error: "NO_API_KEY", message: "Gemini API key tidak ditemukan." };
  }

  let payload;
  try {
    payload = await imageToBase64Payload(imageFileOrUrl);
  } catch (err) {
    return { success: false, error: "IMAGE_CONVERT_FAILED", message: err.message };
  }

  const prompt = `Anda adalah mesin OCR Vision AI berspesialisasi tinggi untuk membaca HUD Status Karakter game GTA V / FiveM Roleplay.

CARA BERPIKIR SEBELUM AUTO-FILL (WAJIB DIIKUTI):
Perhatikan bahwa HUD FiveM memiliki 2 variasi tata letak umum:
- Variasi Horizontal (2 Baris, Logo/Icon di sebelah KANAN teks):
  * Baris atas: "#386 09:03 [logo jam] 174 [logo server] $100.336 [logo dompet] $360.587 [logo bank]"
  * Baris bawah: "Roxwood Medic - Paramedic [logo koper] No Gang - Unaffiliated [logo perisai]"
- Variasi Vertikal (3 Baris, Logo/Icon di sebelah KIRI teks):
  * Baris 1: "[logo jam] 11:56 ..."
  * Baris 2: "[logo koper] Civilian - Freelancer"
  * Baris 3: "[logo perisai] No Gang - Unaffiliated"

ATURAN EKSTRAKSI SUPER KETAT:
1. "time":
   - Ambil HANYA waktu jam:menit format 24-jam HH:MM yang berdampingan dengan logo jam (contoh: "09:03" atau "11:56").
   - Jangan tertukar dengan nomor ID pemain ("#386" atau "#1046") maupun angka kantong/ping ("174", "394").
2. "jobStatus" (PEKERJAAN - JABATAN SAJA):
   - Formatnya adalah "<Nama Pekerjaan> - <Jabatan>" yang berdampingan dengan logo koper/tas (contoh: "Roxwood Medic - Paramedic", "Civilian - Freelancer", "Police - Officer").
   - PENTING: Jika setelah "<Nama Pekerjaan> - <Jabatan>" terdapat logo/icon (seperti kotak logo koper merah/abu-abu), ITU ADALAH BATAS AKHIR TEKS PEKERJAAN! BERHENTI DI SITU dan JANGAN PERNAH menyambungkan teks afiliasi/gang di sebelah kanannya ke dalam "jobStatus"!
3. "gangAffiliation" (AFILIASI / GANG - JABATAN SAJA):
   - Formatnya adalah "<Nama Gang atau No Gang> - <Pangkat atau Unaffiliated>" yang berdampingan dengan logo perisai/shield (contoh: "No Gang - Unaffiliated", atau nama kelompok/gang beserta jabatannya yang tampil di gambar).
   - Berhenti tepat pada batas logo perisai, jangan masukkan karakter noise dari icon.

Tuliskan analisis batas logo dan pembacaan Anda terlebih dahulu di field "reasoning", lalu isi JSON murni berikut:
{
  "reasoning": "Waktu di dekat logo jam adalah ...; Teks pekerjaan sebelum batas logo koper adalah ...; Teks afiliasi pada logo perisai adalah ...",
  "time": "...",
  "jobStatus": "...",
  "gangAffiliation": "...",
  "playerId": "...",
  "cash": "...",
  "bank": "..."
}`;

  let lastError = null;

  for (const model of DEFAULT_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: payload.mimeType || "image/png",
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
        console.warn(`[Gemini Status OCR] Model ${model} returned error:`, data.error);
        continue;
      }

      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        lastError = "AI tidak mengembalikan teks jawaban";
        continue;
      }

      let parsed = {};
      try {
        parsed = JSON.parse(rawJson.replace(/^```json/i, "").replace(/```$/, "").trim());
      } catch (parseErr) {
        const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw parseErr;
      }

      let time = String(parsed.time || "").trim();
      const timeMatch = time.match(/([01]?[0-9]|2[0-3]):([0-5][0-9])/);
      if (timeMatch) {
        time = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
      }

      let jobStatus = String(parsed.jobStatus || "").trim();
      let gangAffiliation = String(parsed.gangAffiliation || "").trim();

      return {
        success: true,
        source: "gemini-ai",
        modelUsed: model,
        fields: {
          time,
          jobStatus,
          gangAffiliation,
          playerId: String(parsed.playerId || "").trim(),
          cash: String(parsed.cash || "").trim(),
          bank: String(parsed.bank || "").trim(),
        },
      };
    } catch (err) {
      lastError = err.message;
      console.warn(`[Gemini Status OCR] Error calling model ${model}:`, err);
    }
  }

  return {
    success: false,
    error: "ALL_MODELS_FAILED",
    message: lastError || "Semua model Gemini gagal merespon.",
  };
}

/**
 * Scans combined Event / Tournament screenshot (KTP IC + HUD Status) using Google Gemini Vision AI
 */
export async function scanCombinedEventWithGemini(imageFileOrUrl, customKey = null) {
  const apiKey = await resolveGeminiApiKey(customKey);
  if (!apiKey) {
    return { success: false, error: "NO_API_KEY", message: "Gemini API key tidak ditemukan." };
  }

  let payload;
  try {
    payload = await imageToBase64Payload(imageFileOrUrl);
  } catch (err) {
    return { success: false, error: "IMAGE_CONVERT_FAILED", message: err.message };
  }

  const prompt = `Anda adalah mesin OCR Vision AI berspesialisasi tinggi untuk memverifikasi screenshot pendaftaran Event GTA V / FiveM Roleplay (memuat KTP Los Santos Identity dan HUD Status Karakter).

CARA BERPIKIR SEBELUM AUTO-FILL (WAJIB DIIKUTI):
1. KTP IC (BACA BARIS YANG SEJAJAR LURUS KIRI KE KANAN):
   - "LAST NAME" di kiri -> baca kata yang sejajar di kanannya ("lastName").
   - "FIRST NAME" di kiri -> baca kata yang sejajar di kanannya ("firstName").
   - "fullName" = gabungan "firstName" + spasi + "lastName".
   - "CITIZEN ID" di kiri -> baca kode alfanumerik yang sejajar di kanannya ("citizenId"). Bedakan angka 0 vs huruf O, angka 9 vs S/P, angka 1 vs I. Abaikan tanda tangan sambung di bawah kartu!
   - Ambil juga "dob", "sex" ("MALE" / "FEMALE"), dan "nationality" jika tampak.
2. HUD STATUS KARAKTER:
   - "dateTime": Tanggal dan/atau jam pada HUD di dekat logo jam (contoh: "20/09/2026 - 11:12" atau "09:03").
   - "jobStatus": HANYA "<Nama Pekerjaan> - <Jabatan>" pada logo koper (contoh: "Civilian - Freelancer", "Roxwood Medic - Paramedic"). Berhenti tepat pada batas logo koper, jangan sambungkan dengan teks afiliasi/gang!
   - "gangStatus": HANYA "<Nama Gang atau No Gang> - <Jabatan atau Unaffiliated>" pada logo perisai (contoh: "No Gang - Unaffiliated").

Tuliskan penalaran singkat pada field "reasoning" terlebih dahulu, lalu keluarkan JSON murni:
{
  "reasoning": "...",
  "firstName": "...",
  "lastName": "...",
  "fullName": "...",
  "dob": "...",
  "sex": "...",
  "nationality": "...",
  "citizenId": "...",
  "dateTime": "...",
  "jobStatus": "...",
  "gangStatus": "..."
}`;

  let lastError = null;

  for (const model of DEFAULT_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        continue;
      }

      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) continue;

      let parsed = {};
      try {
        parsed = JSON.parse(rawJson.replace(/^```json/i, "").replace(/```$/, "").trim());
      } catch (parseErr) {
        const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw parseErr;
      }

      const firstName = String(parsed.firstName || "").trim().toUpperCase();
      const lastName = String(parsed.lastName || "").trim().toUpperCase();
      const fullName = (firstName && lastName ? `${firstName} ${lastName}` : String(parsed.fullName || "")).trim().toUpperCase();
      const citizenId = String(parsed.citizenId || "")
        .trim()
        .toUpperCase()
        .replace(/^(?:#|CITIZEN\s*ID|ID|NIK)[:\s-]*/i, "")
        .replace(/[^A-Z0-9]/g, "");

      return {
        success: true,
        source: "gemini-ai",
        modelUsed: model,
        fields: {
          firstName,
          lastName,
          fullName,
          dob: String(parsed.dob || "").trim(),
          sex: String(parsed.sex || "").trim().toUpperCase(),
          nationality: String(parsed.nationality || "").trim().toUpperCase(),
          citizenId,
          dateTime: String(parsed.dateTime || "").trim(),
          jobStatus: String(parsed.jobStatus || "").trim(),
          gangStatus: String(parsed.gangStatus || "").trim(),
        },
      };
    } catch (err) {
      lastError = err.message;
    }
  }

  return {
    success: false,
    error: "ALL_MODELS_FAILED",
    message: lastError || "Semua model Gemini gagal merespon.",
  };
}
