// ==========================================================================
// BANSOS (BANTUAN SOSIAL) SERVICE - LSM PAGUYUBAN PIZZA SANDY SHORES
// Supports Dynamic Bansos Programs Creation, Editing, Toggling & Claims
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

const BANSOS_PROGRAMS_COL_PATH = ["artifacts", APP_ID, "public", "data", "bansos_programs"];
const BANSOS_PROGRAMS_STORAGE_KEY = "pps_bansos_programs_cache";
const BANSOS_PROGRAMS_INIT_KEY = "pps_bansos_programs_initialized";

/**
 * Default Seed Bansos Program: Paket Makanan & Uang Tunai $2.500 USD
 */
export const DEFAULT_BANSOS_PROGRAM = {
  id: "bns-makanan-tunai-v1",
  title: "Bantuan Sosial Warga Sandy Shores",
  tagline: "Program Kepedulian LSM Paguyuban Pizza Sandy Shores",
  status: "ACTIVE", // "ACTIVE" | "INACTIVE"
  items: [
    { name: "1 Paket Makanan", icon: "Utensils", desc: "Ransum konsumsi siap santap bergizi" },
    { name: "Uang Tunai $2.500 USD", icon: "DollarSign", desc: "Bantuan tunai langsung untuk kebutuhan darurat" },
  ],
  totalCash: 2500,
  rules: [
    "Wajib mengunggah foto / tangkapan layar KTP IC yang jelas",
    "1 Citizen ID (CID) hanya berhak menerima 1 kali bantuan",
    "Pengambilan bantuan fisik dilakukan langsung di Kantor LSM Paguyuban Pizza Sandy Shores",
    "Tunjukkan bukti kupon digital atau sebutkan Citizen ID kepada Pengurus yang bertugas",
  ],
  showMessengerNotification: true,
  messengerHeading: "Bansos Warga Sandy Shores",
  messengerMessage: "Halo warga Sandy Shores! Paguyuban Pizza menyediakan paket bantuan sosial 1 Paket Makanan dan Uang Tunai $2.500 USD untuk warga yang membutuhkan:",
  pillLabel: "1 Makanan + $2.500 USD",
  createdAt: 1729800000000,
};

// Backward-compatible alias
export const BANSOS_PACKAGE_INFO = DEFAULT_BANSOS_PROGRAM;

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

// ==========================================================================
// 1. DYNAMIC BANSOS PROGRAMS MANAGEMENT
// ==========================================================================

/**
 * Load all Bansos Programs from Firestore with local fallback
 */
export async function loadBansosProgramsCloud() {
  try {
    const colRef = collection(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      if (d.id !== "_meta") {
        list.push({ id: d.id, ...d.data() });
      }
    });

    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Auto-seed default program if collection is completely empty and not initialized
    const isInit = typeof window !== "undefined" && localStorage.getItem(BANSOS_PROGRAMS_INIT_KEY) === "true";
    if (list.length === 0 && !isInit) {
      list.push(DEFAULT_BANSOS_PROGRAM);
      try {
        const seedRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, DEFAULT_BANSOS_PROGRAM.id);
        await setDoc(seedRef, DEFAULT_BANSOS_PROGRAM);
        if (typeof window !== "undefined") {
          localStorage.setItem(BANSOS_PROGRAMS_INIT_KEY, "true");
        }
      } catch (seedErr) {
        console.warn("Notice: Bansos program seed offline fallback:", seedErr);
      }
    }

    // Auto-migrate legacy default program if found
    const legacyIdx = list.findIndex(
      (p) =>
        p.id === "bns-sembako-bensin-v1" ||
        (p.id === DEFAULT_BANSOS_PROGRAM.id &&
          (p.items?.some((it) => it.name?.includes("Bensin") || it.name?.includes("2.000")) || p.totalCash !== 2500))
    );
    if (legacyIdx !== -1) {
      list[legacyIdx] = {
        ...list[legacyIdx],
        id: DEFAULT_BANSOS_PROGRAM.id,
        title: DEFAULT_BANSOS_PROGRAM.title,
        tagline: DEFAULT_BANSOS_PROGRAM.tagline,
        items: DEFAULT_BANSOS_PROGRAM.items,
        totalCash: DEFAULT_BANSOS_PROGRAM.totalCash,
        pillLabel: DEFAULT_BANSOS_PROGRAM.pillLabel,
        messengerMessage: DEFAULT_BANSOS_PROGRAM.messengerMessage,
      };
      try {
        const seedRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, DEFAULT_BANSOS_PROGRAM.id);
        setDoc(seedRef, list[legacyIdx], { merge: true }).catch(() => {});
      } catch {}
    }

    try {
      localStorage.setItem(BANSOS_PROGRAMS_STORAGE_KEY, JSON.stringify(list));
    } catch {}

    return list;
  } catch (err) {
    console.warn("Gagal memuat program bansos dari cloud, membaca cache lokal:", err);
    try {
      const cached = localStorage.getItem(BANSOS_PROGRAMS_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [DEFAULT_BANSOS_PROGRAM];
  }
}

/**
 * Real-time subscription to Bansos Programs list
 */
export function subscribeBansosProgramsCloud(onUpdate, onError) {
  try {
    const colRef = collection(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH);
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

        // Auto-seed if empty and not initialized
        const isInit = typeof window !== "undefined" && localStorage.getItem(BANSOS_PROGRAMS_INIT_KEY) === "true";
        if (list.length === 0 && !isInit) {
          list.push(DEFAULT_BANSOS_PROGRAM);
          try {
            const seedRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, DEFAULT_BANSOS_PROGRAM.id);
            setDoc(seedRef, DEFAULT_BANSOS_PROGRAM).catch(() => {});
            if (typeof window !== "undefined") {
              localStorage.setItem(BANSOS_PROGRAMS_INIT_KEY, "true");
            }
          } catch {}
        }

        // Auto-migrate legacy default program if found
        const legacyIdx = list.findIndex(
          (p) =>
            p.id === "bns-sembako-bensin-v1" ||
            (p.id === DEFAULT_BANSOS_PROGRAM.id &&
              (p.items?.some((it) => it.name?.includes("Bensin") || it.name?.includes("2.000")) || p.totalCash !== 2500))
        );
        if (legacyIdx !== -1) {
          list[legacyIdx] = {
            ...list[legacyIdx],
            id: DEFAULT_BANSOS_PROGRAM.id,
            title: DEFAULT_BANSOS_PROGRAM.title,
            tagline: DEFAULT_BANSOS_PROGRAM.tagline,
            items: DEFAULT_BANSOS_PROGRAM.items,
            totalCash: DEFAULT_BANSOS_PROGRAM.totalCash,
            pillLabel: DEFAULT_BANSOS_PROGRAM.pillLabel,
            messengerMessage: DEFAULT_BANSOS_PROGRAM.messengerMessage,
          };
          try {
            const seedRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, DEFAULT_BANSOS_PROGRAM.id);
            setDoc(seedRef, list[legacyIdx], { merge: true }).catch(() => {});
          } catch {}
        }

        try {
          localStorage.setItem(BANSOS_PROGRAMS_STORAGE_KEY, JSON.stringify(list));
        } catch {}
        if (typeof onUpdate === "function") onUpdate(list);
      },
      (err) => {
        console.warn("Subscription program bansos error, fallback ke cache:", err);
        try {
          const cached = localStorage.getItem(BANSOS_PROGRAMS_STORAGE_KEY);
          if (cached && typeof onUpdate === "function") {
            onUpdate(JSON.parse(cached));
          } else if (typeof onUpdate === "function") {
            onUpdate([DEFAULT_BANSOS_PROGRAM]);
          }
        } catch {}
        if (typeof onError === "function") onError(err);
      }
    );
  } catch (err) {
    console.error("Gagal inisialisasi onSnapshot program bansos:", err);
    try {
      const cached = localStorage.getItem(BANSOS_PROGRAMS_STORAGE_KEY);
      if (cached && typeof onUpdate === "function") {
        onUpdate(JSON.parse(cached));
      } else if (typeof onUpdate === "function") {
        onUpdate([DEFAULT_BANSOS_PROGRAM]);
      }
    } catch {}
    return () => {};
  }
}

/**
 * Save or update a Bansos Program (Admin)
 */
export async function saveBansosProgramCloud(programData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(BANSOS_PROGRAMS_INIT_KEY, "true");
  }

  const programId =
    programData.id || "bns-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  const payload = {
    ...programData,
    id: programId,
    title: String(programData.title || "").trim(),
    tagline: String(programData.tagline || "").trim(),
    status: programData.status || "ACTIVE",
    items: Array.isArray(programData.items) ? programData.items : [],
    totalCash: Number(programData.totalCash) || 0,
    rules: Array.isArray(programData.rules) ? programData.rules : [],
    showMessengerNotification: programData.showMessengerNotification !== false,
    messengerHeading: programData.messengerHeading || programData.title || "Bansos Warga Sandy Shores",
    messengerMessage: programData.messengerMessage || "",
    pillLabel: programData.pillLabel || "",
    updatedAt: Date.now(),
    createdAt: programData.createdAt || Date.now(),
  };

  try {
    const docRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, programId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn("Gagal simpan program bansos di cloud, fallback cache:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(BANSOS_PROGRAMS_STORAGE_KEY) || "[]");
    const updated = current.some((p) => p.id === programId)
      ? current.map((p) => (p.id === programId ? { ...p, ...payload } : p))
      : [{ ...payload }, ...current];
    localStorage.setItem(BANSOS_PROGRAMS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return payload;
}

/**
 * Delete a Bansos Program (Admin)
 */
export async function deleteBansosProgramCloud(programId) {
  if (typeof window !== "undefined") {
    localStorage.setItem(BANSOS_PROGRAMS_INIT_KEY, "true");
  }

  try {
    const docRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, programId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Gagal hapus program bansos di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(BANSOS_PROGRAMS_STORAGE_KEY) || "[]");
    const updated = current.filter((p) => p.id !== programId);
    localStorage.setItem(BANSOS_PROGRAMS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return true;
}

/**
 * Toggle Status of Bansos Program (ACTIVE <-> INACTIVE)
 */
export async function toggleBansosProgramStatusCloud(programId, currentStatus) {
  const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const updatedAt = Date.now();

  try {
    const docRef = doc(getBansosDb(), ...BANSOS_PROGRAMS_COL_PATH, programId);
    await setDoc(docRef, { status: nextStatus, updatedAt }, { merge: true });
  } catch (err) {
    console.warn("Gagal toggle status program bansos di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(BANSOS_PROGRAMS_STORAGE_KEY) || "[]");
    const updated = current.map((p) =>
      p.id === programId ? { ...p, status: nextStatus, updatedAt } : p
    );
    localStorage.setItem(BANSOS_PROGRAMS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return nextStatus;
}

// ==========================================================================
// 2. BANSOS CLAIMS MANAGEMENT
// ==========================================================================

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
    programId: claimData.programId || DEFAULT_BANSOS_PROGRAM.id,
    programTitle: claimData.programTitle || DEFAULT_BANSOS_PROGRAM.title,
    packageItems: Array.isArray(claimData.packageItems) && claimData.packageItems.length > 0
      ? claimData.packageItems
      : [
          "1 Paket Makanan",
          "Uang Tunai $2.500 USD",
        ],
    cashAmount: typeof claimData.cashAmount === "number" ? claimData.cashAmount : 2500,
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
  const timestampStr = now.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updateFields = {
    claimed: nextStatus,
    claimedAt: nextStatus ? timestampStr : null,
    claimedByAdmin: nextStatus ? adminName : null,
  };

  try {
    const docRef = doc(getBansosDb(), ...BANSOS_COL_PATH, claimId);
    await setDoc(docRef, updateFields, { merge: true });
  } catch (err) {
    console.warn("Cloud update bansos status failed:", err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      const updated = list.map((c) =>
        c.id === claimId ? { ...c, ...updateFields } : c
      );
      localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  return nextStatus;
}

/**
 * Delete a bansos claim (Admin Only)
 */
export async function deleteBansosClaimCloud(claimId) {
  try {
    const docRef = doc(getBansosDb(), ...BANSOS_COL_PATH, claimId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Cloud delete bansos failed:", err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(BANSOS_STORAGE_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      const updated = list.filter((c) => c.id !== claimId);
      localStorage.setItem(BANSOS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  return true;
}

/**
 * Export bansos claims to XLSX file
 */
export function exportBansosToExcel(claimsList = []) {
  if (!Array.isArray(claimsList) || claimsList.length === 0) {
    throw new Error("Tidak ada data bansos untuk diekspor.");
  }

  const rows = claimsList.map((c, idx) => ({
    NO: idx + 1,
    "KODE KUPON": c.claimCode || "-",
    "PROGRAM BANSOS": c.programTitle || "Bantuan Sosial Warga Sandy Shores",
    "NAMA LENGKAP IC": c.fullName || "-",
    "CITIZEN ID (CID)": c.citizenId || "-",
    "JENIS KELAMIN": c.sex || "-",
    "PAKET BANSOS": Array.isArray(c.packageItems) ? c.packageItems.join(" + ") : (c.packageItems || "1 Paket Makanan + $2.500 USD"),
    "UANG SAKU": typeof c.cashAmount === "number" ? `$${c.cashAmount.toLocaleString("en-US")} USD` : "$2.500 USD",
    "STATUS PENGAMBILAN": c.claimed ? "SUDAH DIAMBIL" : "BELUM DIAMBIL",
    "TANGGAL PENGAJUAN": `${c.claimDate || "-"} ${c.claimTime || ""}`,
    "WAKTU PENYERAHAN": c.claimedAt || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 32 },
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
