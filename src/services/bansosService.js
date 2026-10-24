// ==========================================================================
// BANSOS (BANTUAN SOSIAL) SERVICE - LSM PAGUYUBAN PIZZA SANDY SHORES
// Paket: 2 Jerigen Bensin + 1 Paket Makanan + Uang Saku $2.000 USD
// ==========================================================================

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import * as XLSX from "xlsx";

const memberFirebaseConfig = {
  apiKey: "AIzaSyDB7TFVRDRvgMI4q_XtwnxSqOhCKZ2xAe8",
  authDomain: "pendaftaran-paps.firebaseapp.com",
  projectId: "pendaftaran-paps",
  storageBucket: "pendaftaran-paps.firebasestorage.app",
  messagingSenderId: "263750919370",
  appId: "1:263750919370:web:ed32312897807281498033",
  measurementId: "G-RBTWG5K8W1",
};

let _bansosApp = null;
let _bansosDb = null;

function getBansosApp() {
  if (!_bansosApp) {
    _bansosApp =
      getApps().find((a) => a.name === "paps-members") ||
      initializeApp(memberFirebaseConfig, "paps-members");
  }
  return _bansosApp;
}

function getBansosDb() {
  if (!_bansosDb) {
    _bansosDb = getFirestore(getBansosApp());
  }
  return _bansosDb;
}

const APP_ID = "portal-anggota-app";
const BANSOS_COL_PATH = ["artifacts", APP_ID, "public", "data", "bansos_claims"];
const BANSOS_STORAGE_KEY = "pps_bansos_claims_cache";

export const BANSOS_PACKAGE_INFO = {
  title: "Bantuan Sosial Warga Sandy Shores",
  tagline: "Program Kepedulian LSM Paguyuban Pizza Sandy Shores",
  items: [
    { name: "2 Jerigen Bensin", icon: "Fuel", desc: "Bahan bakar untuk operasional harian kendaraan" },
    { name: "1 Paket Makanan", icon: "Utensils", desc: "Ransum konsumsi siap santap bergizi" },
    { name: "Uang Saku $2.000 USD", icon: "DollarSign", desc: "Bantuan tunai langsung untuk kebutuhan darurat" },
  ],
  totalCash: 2000,
  rules: [
    "Wajib mengunggah foto / tangkapan layar KTP IC yang jelas",
    "1 Citizen ID (CID) hanya berhak menerima 1 kali bantuan",
    "Pengambilan bantuan fisik dilakukan langsung di Kantor LSM Paguyuban Pizza Sandy Shores",
    "Tunjukkan bukti kupon digital atau sebutkan Citizen ID kepada Pengurus yang bertugas",
  ],
};

/**
 * Generate a unique coupon code: 1 letter + 2 numbers (e.g. A01, A02 ... A12 ... A99, B01)
 * Without 'BNS-PPS-' prefix.
 */
export function generateBansosCouponCode(existingCodes = []) {
  const existingSet = new Set(
    (existingCodes || []).map((c) => String(c).trim().toUpperCase())
  );
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Sequential queue order: A01..A99, B01..B99, C01..C99
  for (let l = 0; l < letters.length; l++) {
    for (let num = 1; num <= 99; num++) {
      const code = `${letters[l]}${String(num).padStart(2, "0")}`;
      if (!existingSet.has(code)) {
        return code;
      }
    }
  }

  // Fallback random if exhausted
  const randomLetter = letters[Math.floor(Math.random() * letters.length)];
  const randomNum = Math.floor(10 + Math.random() * 90);
  return `${randomLetter}${randomNum}`;
}

/**
 * Load all bansos claims from Firestore with local fallback
 */
export async function loadBansosClaimsCloud() {
  try {
    const colRef = collection(getBansosDb(), ...BANSOS_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      if (d.id !== "_meta") {
        list.push({ id: d.id, ...d.data() });
      }
    });

    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    try {
      localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(list));
    } catch {}

    return list;
  } catch (err) {
    console.warn("Gagal memuat bansos dari cloud, membaca cache lokal:", err);
    try {
      const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

/**
 * Real-time subscription to Bansos Claims
 */
export function subscribeBansosClaimsCloud(onUpdate, onError) {
  try {
    const colRef = collection(getBansosDb(), ...BANSOS_COL_PATH);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          if (d.id !== "_meta") {
            list.push({ id: d.id, ...d.data() });
          }
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        try {
          localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(list));
        } catch {}
        if (typeof onUpdate === "function") onUpdate(list);
      },
      (err) => {
        console.warn("Subscription bansos error, fallback ke cache:", err);
        try {
          const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
          if (cached && typeof onUpdate === "function") {
            onUpdate(JSON.parse(cached));
          }
        } catch {}
        if (typeof onError === "function") onError(err);
      }
    );
  } catch (err) {
    console.error("Gagal inisialisasi onSnapshot bansos:", err);
    if (typeof onError === "function") onError(err);
    return () => {};
  }
}

/**
 * Submit a new bansos claim.
 * Collision-proof & Anti-Race Condition:
 * Uses deterministic document ID based on clean CID ("cid_" + cleanCid).
 * This guarantees atomic conflict prevention at the Firestore database level.
 */
export async function submitBansosClaimCloud(claimData) {
  if (!claimData || !claimData.citizenId) {
    throw new Error("Citizen ID wajib diisi.");
  }

  const cleanCid = String(claimData.citizenId).trim().toUpperCase();
  const safeDocId = "cid_" + cleanCid.replace(/[^A-Z0-9_-]/g, "");

  // 1. Direct Atomic Document ID Lookup (Fast 1-document check)
  const docRef = doc(getBansosDb(), ...BANSOS_COL_PATH, safeDocId);
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      const err = new Error(
        `Citizen ID (${cleanCid}) sudah terdaftar dengan Kode Kupon ${data.claimCode || "-"}. Bantuan hanya dapat diklaim 1 kali per warga.`
      );
      err.code = "ALREADY_CLAIMED";
      err.existingClaim = data;
      throw err;
    }
  } catch (err) {
    if (err.code === "ALREADY_CLAIMED") throw err;
  }

  // 2. Fallback check across existing claims (supports legacy doc IDs)
  const currentClaims = await loadBansosClaimsCloud();
  const legacyExisting = currentClaims.find(
    (c) => String(c.citizenId).trim().toUpperCase() === cleanCid
  );

  if (legacyExisting) {
    const err = new Error(
      `Citizen ID (${cleanCid}) sudah terdaftar dengan Kode Kupon ${legacyExisting.claimCode}. Bantuan hanya dapat diklaim 1 kali per warga.`
    );
    err.code = "ALREADY_CLAIMED";
    err.existingClaim = legacyExisting;
    throw err;
  }

  // 3. Prepare Claim Payload
  const now = new Date();
  const existingCodes = currentClaims.map((c) => c.claimCode).filter(Boolean);
  const claimCode = generateBansosCouponCode(existingCodes);

  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const payload = {
    id: safeDocId,
    claimCode,
    fullName: String(claimData.fullName || "").trim().toUpperCase(),
    citizenId: cleanCid,
    sex: claimData.sex || "Laki-laki",
    screenshotUrl: claimData.screenshotUrl || "",
    packageItems: [
      "2 Jerigen Bensin",
      "1 Paket Makanan",
      "Uang Saku $2.000 USD",
    ],
    cashAmount: 2000,
    claimed: false, // false: Belum Diambil, true: Sudah Diambil
    claimedAt: null,
    claimedByAdmin: null,
    createdAt: Date.now(),
    claimDate: dateStr,
    claimTime: timeStr,
    notes: claimData.notes || "",
  };

  // 4. Save to Cloud with unique safeDocId
  try {
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn("Cloud save bansos failed, saving to local cache:", err);
  }

  // 5. Update Local Cache
  try {
    const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
    const list = cached ? JSON.parse(cached) : [];
    // Remove if already exists with same CID then unshift
    const filtered = list.filter((c) => String(c.citizenId).trim().toUpperCase() !== cleanCid);
    filtered.unshift(payload);
    localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  return payload;
}

/**
 * Toggle claim status (Belum Diambil <-> Sudah Diambil)
 */
export async function toggleBansosStatusCloud(claimId, currentStatus, adminName = "Pengurus") {
  const nextStatus = !currentStatus;
  const now = new Date();
  const timestampStr = `${now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;

  const updateData = {
    claimed: nextStatus,
    claimedAt: nextStatus ? timestampStr : null,
    claimedByAdmin: nextStatus ? adminName : null,
  };

  try {
    const docRef = doc(getBansosDb(), ...BANSOS_COL_PATH, claimId);
    await setDoc(docRef, updateData, { merge: true });
  } catch (err) {
    console.warn("Cloud update bansos status failed:", err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      const idx = list.findIndex((c) => c.id === claimId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updateData };
        localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(list));
      }
    }
  } catch {}

  return nextStatus;
}

/**
 * Delete a bansos claim
 */
export async function deleteBansosClaimCloud(claimId) {
  try {
    const docRef = doc(getBansosDb(), ...BANSOS_COL_PATH, claimId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Cloud delete bansos failed:", err);
  }

  try {
    const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
    if (cached) {
      const list = JSON.parse(cached).filter((c) => c.id !== claimId);
      localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {}

  return true;
}

/**
 * Export Bansos claims list to Excel spreadsheet (.xlsx)
 */
export function exportBansosToExcel(claimsList) {
  if (!Array.isArray(claimsList) || claimsList.length === 0) return false;

  const rows = claimsList.map((c, index) => ({
    No: index + 1,
    "KODE KUPON": c.claimCode || "-",
    "NAMA LENGKAP IC": c.fullName || "-",
    "CITIZEN ID (CID)": c.citizenId || "-",
    "JENIS KELAMIN": c.sex || "-",
    "PAKET BANSOS": "2 Jerigen Bensin + 1 Paket Makanan + $2.000 USD",
    "UANG SAKU": "$2.000 USD",
    "STATUS PENGAMBILAN": c.claimed ? "SUDAH DIAMBIL" : "BELUM DIAMBIL",
    "TANGGAL PENGAJUAN": `${c.claimDate || "-"} ${c.claimTime || ""}`,
    "WAKTU PENYERAHAN": c.claimedAt || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 26 },
    { wch: 20 },
    { wch: 16 },
    { wch: 42 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Bansos PPS");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Data_Bansos_PPS_${today}.xlsx`);
  return true;
}
