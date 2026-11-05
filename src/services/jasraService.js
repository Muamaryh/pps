// ==========================================================================
// JASRA (VOUCHER KESEHATAN) SERVICE - LSM PAGUYUBAN PIZZA SANDY SHORES
// Pengelolaan Stok Voucher Medis dari Pemerintah Kota San Andreas,
// Countdown 7 Hari sejak Diterima, dan Penyaluran ke Anggota / Warga Luar.
// ==========================================================================

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
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

let _jasraApp = null;
let _jasraDb = null;

function getJasraApp() {
  if (!_jasraApp) {
    _jasraApp =
      getApps().find((a) => a.name === "paps-members") ||
      initializeApp(memberFirebaseConfig, "paps-members");
  }
  return _jasraApp;
}

function getJasraDb() {
  if (!_jasraDb) {
    _jasraDb = getFirestore(getJasraApp());
  }
  return _jasraDb;
}

const APP_ID = "portal-anggota-app";
const JASRA_BATCHES_COL_PATH = ["artifacts", APP_ID, "public", "data", "jasra_batches"];
const JASRA_DISTRIBUTIONS_COL_PATH = ["artifacts", APP_ID, "public", "data", "jasra_distributions"];
const MEMBERS_COL_PATH = ["artifacts", APP_ID, "public", "data", "members"];

const JASRA_BATCHES_STORAGE_KEY = "pps_jasra_batches_cache";
const JASRA_DISTRIBUTIONS_STORAGE_KEY = "pps_jasra_distributions_cache";

export const DEFAULT_VALIDITY_DAYS = 7;
export const DEFAULT_TREATMENT_PER_PERSON = 10;
export const DEFAULT_PINGSAN_PER_PERSON = 10;

/**
 * Official Default Government Batch (Diterima Senin, 02 Nov 2026 - Berakhir Senin, 09 Nov 2026)
 * Alokasi resmi: 500 Tritmen + 500 Pingsan
 */
export const DEFAULT_GOVERNMENT_BATCH = {
  id: "BATCH-20261102",
  batchName: "Batch Alokasi Jasra (02 – 09 Nov 2026)",
  source: "Pemerintah Kota San Andreas",
  receivedAt: 1793581200000, // Senin, 02 Nov 2026 08:00:00 WIB
  receivedDateFormatted: "Sen, 02 Nov 2026, 08.00",
  validityDays: 7,
  expiresAt: 1794186000000, // Senin, 09 Nov 2026 08:00:00 WIB
  expiresDateFormatted: "Sen, 09 Nov 2026, 08.00",
  initialTreatment: 500,
  initialPingsan: 500,
  totalVouchers: 1000,
  remainingTreatment: 190,
  remainingPingsan: 190,
  distributedTreatment: 310,
  distributedPingsan: 310,
  distributedCount: 31,
  status: "ACTIVE",
  notes: "Alokasi resmi voucher kesehatan dari Pemerintah Kota San Andreas.",
  createdAt: 1793581200000,
  updatedAt: 1793581200000,
};

/**
 * Helper to format date into readable Indonesian string
 */
export function formatJasraDate(timestamp) {
  if (!timestamp) return "-";
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(String(timestamp));
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatJasraShortDate(timestamp) {
  if (!timestamp) return "-";
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(String(timestamp));
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculate countdown and remaining days from a Government Batch
 * Sistem menghitung 7 hari sejak voucher diterima dari pemerintah.
 */
export function calculateBatchRemaining(batch, nowInput = Date.now()) {
  if (!batch || !batch.receivedAt) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isExpired: true,
      label: "Tidak Aktif",
      progressPercent: 0,
      totalValidityDays: DEFAULT_VALIDITY_DAYS,
    };
  }

  const nowMs = typeof nowInput === "number" ? nowInput : nowInput.getTime();
  const receivedAtMs = Number(batch.receivedAt);
  const validityDays = Number(batch.validityDays) || DEFAULT_VALIDITY_DAYS;
  const validityMs = validityDays * 24 * 60 * 60 * 1000;
  const expiresAtMs = batch.expiresAt ? Number(batch.expiresAt) : receivedAtMs + validityMs;

  const diffMs = expiresAtMs - nowMs;

  if (diffMs <= 0) {
    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isExpired: true,
      label: "Kedaluwarsa (Expired)",
      progressPercent: 100,
      totalValidityDays: validityDays,
      expiresAt: expiresAtMs,
    };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(diffMs / 3600000);
  const days = Math.ceil(diffMs / 86400000);
  const hoursOnly = Math.floor((diffMs % 86400000) / 3600000);

  const elapsedMs = Math.max(0, nowMs - receivedAtMs);
  const progressPercent = Math.min(100, Math.round((elapsedMs / validityMs) * 100));

  let label = `${days} Hari Lagi`;
  if (days <= 1) {
    label = `${totalHours} Jam Lagi`;
  }

  return {
    daysRemaining: days,
    hoursRemaining: totalHours,
    minutesRemaining: totalMinutes,
    hoursOnly,
    isExpired: false,
    label,
    progressPercent,
    totalValidityDays: validityDays,
    expiresAt: expiresAtMs,
  };
}

/**
 * Calculate remaining validity for a Recipient (Anggota or Luar Anggota)
 * Mengikuti batas akhir masa berlaku batch penerimaan pemerintah
 */
export function calculateRecipientRemaining(distribution, batch, nowInput = Date.now()) {
  const nowMs = typeof nowInput === "number" ? nowInput : nowInput.getTime();
  // Target expiration date is linked to the batch
  const expiresAtMs = Number(distribution.batchExpiresAt || batch?.expiresAt || 0);

  if (!expiresAtMs) {
    return {
      daysRemaining: 0,
      isExpired: true,
      status: "EXPIRED",
      label: "Kedaluwarsa",
    };
  }

  const diffMs = expiresAtMs - nowMs;
  if (diffMs <= 0) {
    return {
      daysRemaining: 0,
      isExpired: true,
      status: "EXPIRED",
      label: "Kedaluwarsa",
    };
  }

  const days = Math.ceil(diffMs / 86400000);
  const hours = Math.ceil(diffMs / 3600000);

  return {
    daysRemaining: days,
    hoursRemaining: hours,
    isExpired: false,
    status: "ACTIVE",
    label: days > 1 ? `Sisa ${days} Hari` : `Sisa ${hours} Jam`,
  };
}

// ==========================================================================
// BATCHES CLOUD ACTIONS (Penerimaan Jasra dari Pemerintah)
// ==========================================================================

export async function loadJasraBatchesCloud() {
  try {
    const colRef = collection(getJasraDb(), ...JASRA_BATCHES_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      if (d.id !== "_meta") {
        list.push({ id: d.id, ...d.data() });
      }
    });

    if (list.length === 0) {
      list.push(DEFAULT_GOVERNMENT_BATCH);
      try {
        await setDoc(doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, DEFAULT_GOVERNMENT_BATCH.id), DEFAULT_GOVERNMENT_BATCH);
      } catch (e) {
        console.warn("Notice: Gagal auto-seed batch pemerintah ke Firestore:", e);
      }
    }

    list.sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
    try {
      localStorage.setItem(JASRA_BATCHES_STORAGE_KEY, JSON.stringify(list));
    } catch {}
    return list;
  } catch (err) {
    console.warn("Gagal memuat batch Jasra dari cloud, membaca cache:", err);
    try {
      const cached = localStorage.getItem(JASRA_BATCHES_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [DEFAULT_GOVERNMENT_BATCH];
  }
}

export function subscribeJasraBatchesCloud(onUpdate, onError) {
  try {
    const colRef = collection(getJasraDb(), ...JASRA_BATCHES_COL_PATH);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          if (d.id !== "_meta") {
            list.push({ id: d.id, ...d.data() });
          }
        });
        if (list.length === 0) {
          list.push(DEFAULT_GOVERNMENT_BATCH);
        }
        list.sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
        try {
          localStorage.setItem(JASRA_BATCHES_STORAGE_KEY, JSON.stringify(list));
        } catch {}
        if (onUpdate) onUpdate(list);
      },
      (err) => {
        console.warn("Subscription Jasra batches error:", err);
        try {
          const cached = localStorage.getItem(JASRA_BATCHES_STORAGE_KEY);
          if (cached && onUpdate) onUpdate(JSON.parse(cached));
          else if (onUpdate) onUpdate([DEFAULT_GOVERNMENT_BATCH]);
        } catch {
          if (onUpdate) onUpdate([DEFAULT_GOVERNMENT_BATCH]);
        }
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Gagal init listener Jasra batches:", err);
    return () => {};
  }
}

/**
 * Save new Batch from Government
 */
export async function saveJasraBatchCloud(batchData) {
  const isNew = !batchData.id;
  const docId = batchData.id || "JASRA_BATCH_" + Date.now();
  const docRef = doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, docId);

  const receivedAt = batchData.receivedAt ? Number(batchData.receivedAt) : Date.now();
  const validityDays = Number(batchData.validityDays) || DEFAULT_VALIDITY_DAYS;
  const expiresAt = receivedAt + (validityDays * 24 * 60 * 60 * 1000);

  const initialTreatment = Number(batchData.initialTreatment) || 0;
  const initialPingsan = Number(batchData.initialPingsan) || 0;

  const payload = {
    id: docId,
    batchName: batchData.batchName || `Batch ${formatJasraShortDate(receivedAt)}`,
    source: batchData.source || "Pemerintah Kota San Andreas / Dinas Kesehatan",
    receivedAt,
    receivedDateFormatted: formatJasraDate(receivedAt),
    validityDays,
    expiresAt,
    expiresDateFormatted: formatJasraDate(expiresAt),
    initialTreatment,
    initialPingsan,
    totalVouchers: initialTreatment + initialPingsan,
    remainingTreatment: isNew ? initialTreatment : Number(batchData.remainingTreatment ?? initialTreatment),
    remainingPingsan: isNew ? initialPingsan : Number(batchData.remainingPingsan ?? initialPingsan),
    distributedTreatment: isNew ? 0 : Number(batchData.distributedTreatment || 0),
    distributedPingsan: isNew ? 0 : Number(batchData.distributedPingsan || 0),
    distributedCount: isNew ? 0 : Number(batchData.distributedCount || 0),
    status: batchData.status || "ACTIVE",
    notes: batchData.notes || "",
    updatedAt: Date.now(),
  };

  if (isNew) {
    payload.createdAt = Date.now();
  }

  await setDoc(docRef, payload, { merge: true });

  // Update local cache
  try {
    const cached = JSON.parse(localStorage.getItem(JASRA_BATCHES_STORAGE_KEY) || "[]");
    const updated = [payload, ...cached.filter((b) => b.id !== docId)];
    localStorage.setItem(JASRA_BATCHES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return payload;
}

export async function deleteJasraBatchCloud(batchId) {
  const docRef = doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, batchId);
  await deleteDoc(docRef);
  try {
    const cached = JSON.parse(localStorage.getItem(JASRA_BATCHES_STORAGE_KEY) || "[]");
    const updated = cached.filter((b) => b.id !== batchId);
    localStorage.setItem(JASRA_BATCHES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return true;
}

// ==========================================================================
// DISTRIBUTIONS CLOUD ACTIONS (Penyaluran ke Anggota / Warga Luar)
// ==========================================================================

export async function loadJasraDistributionsCloud() {
  try {
    const colRef = collection(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      if (d.id !== "_meta") {
        list.push({ id: d.id, ...d.data() });
      }
    });
    list.sort((a, b) => (b.givenAt || 0) - (a.givenAt || 0));
    try {
      localStorage.setItem(JASRA_DISTRIBUTIONS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
    return list;
  } catch (err) {
    console.warn("Gagal memuat distribusi Jasra dari cloud, membaca cache:", err);
    try {
      const cached = localStorage.getItem(JASRA_DISTRIBUTIONS_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

export function subscribeJasraDistributionsCloud(onUpdate, onError) {
  try {
    const colRef = collection(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          if (d.id !== "_meta") {
            list.push({ id: d.id, ...d.data() });
          }
        });
        list.sort((a, b) => (b.givenAt || 0) - (a.givenAt || 0));
        try {
          localStorage.setItem(JASRA_DISTRIBUTIONS_STORAGE_KEY, JSON.stringify(list));
        } catch {}
        if (onUpdate) onUpdate(list);
      },
      (err) => {
        console.warn("Subscription Jasra distributions error:", err);
        try {
          const cached = localStorage.getItem(JASRA_DISTRIBUTIONS_STORAGE_KEY);
          if (cached && onUpdate) onUpdate(JSON.parse(cached));
        } catch {}
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Gagal init listener Jasra distributions:", err);
    return () => {};
  }
}

/**
 * Distribute vouchers from an Active Batch to a Member or External Citizen
 * Atomically deducts remaining stock from the batch and records distribution.
 */
export async function distributeJasraCloud(data, activeBatch) {
  if (!activeBatch || !activeBatch.id) {
    throw new Error("Batch Jasra pemerintah tidak ditemukan atau belum aktif.");
  }

  const treatmentCount = Number(data.treatmentCount) || 0;
  const pingsanCount = Number(data.pingsanCount) || 0;

  // Check remaining stock
  if (treatmentCount > (activeBatch.remainingTreatment || 0)) {
    throw new Error(`Stok voucher Treatment tidak mencukupi (sisa ${activeBatch.remainingTreatment || 0}).`);
  }
  if (pingsanCount > (activeBatch.remainingPingsan || 0)) {
    throw new Error(`Stok voucher Pingsan tidak mencukupi (sisa ${activeBatch.remainingPingsan || 0}).`);
  }

  const docId = data.id || "JASRA_DIST_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const distRef = doc(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH, docId);

  const givenAt = data.givenAt ? Number(data.givenAt) : Date.now();
  const batchExpiresAt = Number(activeBatch.expiresAt);

  const payload = {
    id: docId,
    batchId: activeBatch.id,
    batchName: activeBatch.batchName,
    recipientType: data.recipientType || "MEMBER", // "MEMBER" | "NON_MEMBER"
    recipientName: (data.recipientName || "").trim().toUpperCase(),
    citizenId: (data.citizenId || "").trim().toUpperCase(),
    phone: (data.phone || "").trim(),
    memberId: data.memberId || null,
    treatmentCount,
    pingsanCount,
    totalCount: treatmentCount + pingsanCount,
    packageLabel: `${treatmentCount} Treatment • ${pingsanCount} Pingsan`,
    givenAt,
    givenDateFormatted: formatJasraDate(givenAt),
    batchExpiresAt,
    batchExpiresFormatted: formatJasraDate(batchExpiresAt),
    officerName: data.officerName || "Pengurus LSM PPS",
    notes: data.notes || "",
    ktpPhoto: data.ktpPhoto || null,
    createdAt: Date.now(),
  };

  // 1. Save distribution record
  await setDoc(distRef, payload);

  // 2. Decrement remaining stock on the batch
  const batchRef = doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, activeBatch.id);
  const updatedRemainingTreatment = Math.max(0, (activeBatch.remainingTreatment || 0) - treatmentCount);
  const updatedRemainingPingsan = Math.max(0, (activeBatch.remainingPingsan || 0) - pingsanCount);
  const updatedDistributedTreatment = (activeBatch.distributedTreatment || 0) + treatmentCount;
  const updatedDistributedPingsan = (activeBatch.distributedPingsan || 0) + pingsanCount;
  const updatedDistributedCount = (activeBatch.distributedCount || 0) + 1;

  await setDoc(
    batchRef,
    {
      remainingTreatment: updatedRemainingTreatment,
      remainingPingsan: updatedRemainingPingsan,
      distributedTreatment: updatedDistributedTreatment,
      distributedPingsan: updatedDistributedPingsan,
      distributedCount: updatedDistributedCount,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  // 3. If recipient is MEMBER, sync status to members collection
  if (data.recipientType === "MEMBER" && data.memberId) {
    try {
      const memberRef = doc(getJasraDb(), ...MEMBERS_COL_PATH, data.memberId);
      await setDoc(
        memberRef,
        {
          voucherJasraReceived: true,
          voucherClaimedAt: givenAt,
          voucherExpiresAt: batchExpiresAt,
          voucherBatchId: activeBatch.id,
          voucherJasraDate: formatJasraShortDate(givenAt),
          voucherJasraDetail: { treatment: treatmentCount, pingsan: pingsanCount },
          lastUpdatedStatusAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Notice: Gagal update status voucher di data member:", err);
    }
  }

  return payload;
}

/**
 * Delete distribution record and optionally restore stock to the batch
 */
export async function deleteJasraDistributionCloud(distribution, restoreStock = true) {
  if (!distribution || !distribution.id) return;

  const distRef = doc(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH, distribution.id);
  await deleteDoc(distRef);

  // Restore stock if batch still exists and restoreStock is true
  if (restoreStock && distribution.batchId) {
    try {
      const batchRef = doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, distribution.batchId);
      const batches = JSON.parse(localStorage.getItem(JASRA_BATCHES_STORAGE_KEY) || "[]");
      const matchedBatch = batches.find((b) => b.id === distribution.batchId);
      if (matchedBatch) {
        const treatmentCount = Number(distribution.treatmentCount) || 0;
        const pingsanCount = Number(distribution.pingsanCount) || 0;
        await setDoc(
          batchRef,
          {
            remainingTreatment: (matchedBatch.remainingTreatment || 0) + treatmentCount,
            remainingPingsan: (matchedBatch.remainingPingsan || 0) + pingsanCount,
            distributedTreatment: Math.max(0, (matchedBatch.distributedTreatment || 0) - treatmentCount),
            distributedPingsan: Math.max(0, (matchedBatch.distributedPingsan || 0) - pingsanCount),
            distributedCount: Math.max(0, (matchedBatch.distributedCount || 0) - 1),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn("Gagal restore stok batch saat delete distribusi:", err);
    }
  }

  // If member, reset voucher status
  if (distribution.recipientType === "MEMBER" && distribution.memberId) {
    try {
      const memberRef = doc(getJasraDb(), ...MEMBERS_COL_PATH, distribution.memberId);
      await setDoc(
        memberRef,
        {
          voucherJasraReceived: false,
          voucherClaimedAt: null,
          voucherExpiresAt: null,
          voucherBatchId: null,
          voucherJasraDate: null,
          voucherJasraDetail: null,
          lastUpdatedStatusAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Gagal reset voucher member:", err);
    }
  }

  return true;
}

/**
 * Export Jasra Distributions to Excel (.xlsx)
 */
export function exportJasraDistributionsToExcel(distributions = [], batch = null) {
  const rows = distributions.map((item, idx) => {
    const rem = calculateRecipientRemaining(item, batch);
    return {
      No: idx + 1,
      "Tipe Penerima": item.recipientType === "MEMBER" ? "Anggota Paguyuban" : "Warga Luar Anggota",
      "Nama Penerima": item.recipientName || "-",
      "No. IC / KTP": item.citizenId || "-",
      "Nomor HP": item.phone || "-",
      "Voucher Treatment": item.treatmentCount || 0,
      "Voucher Pingsan": item.pingsanCount || 0,
      "Total Voucher": item.totalCount || 0,
      "Tanggal Diberikan": item.givenDateFormatted || "-",
      "Batas Berlaku Batch": item.batchExpiresFormatted || "-",
      "Sisa Masa Berlaku": rem.label,
      "Status Voucher": rem.status === "ACTIVE" ? "Aktif" : "Kedaluwarsa",
      "Gelombang / Batch": item.batchName || "-",
      "Petugas Penyerah": item.officerName || "-",
      Catatan: item.notes || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Penyaluran Jasra");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Laporan_Penyaluran_Jasra_LSM_PPS_${today}.xlsx`);
  return true;
}

/**
 * Sinkronisasi Penerima Manfaat dari Database Anggota & Warga Luar ke Penyaluran Jasra
 */
export async function syncJasraWithMembersCloud(membersList = [], externalJasraList = [], activeBatchInput = null) {
  const activeBatch = activeBatchInput || DEFAULT_GOVERNMENT_BATCH;
  const colRef = collection(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH);
  const snap = await getDocs(colRef);
  const existingMap = new Map();
  snap.forEach((d) => {
    const data = d.data();
    if (data.memberId) existingMap.set(`M_${data.memberId}`, d.id);
    if (data.citizenId) existingMap.set(`C_${data.citizenId}`, d.id);
  });

  const activeMembers = membersList.filter((m) => Boolean(m.voucherJasraReceived || m.voucherClaimedAt));
  let syncedCount = 0;

  for (const m of activeMembers) {
    const key = `M_${m.id}`;
    const cidKey = m.icNumber ? `C_${m.icNumber.toUpperCase()}` : null;
    if (!existingMap.has(key) && (!cidKey || !existingMap.has(cidKey))) {
      const distId = "DIST_" + m.id;
      const givenAt = m.voucherClaimedAt || m.lastUpdatedStatusAt || 1793644800000;
      const distDoc = {
        id: distId,
        batchId: activeBatch.id,
        batchName: activeBatch.batchName,
        recipientType: "MEMBER",
        recipientName: (m.fullName || "Anggota PPS").toUpperCase(),
        citizenId: (m.icNumber || m.citizenId || "-").toUpperCase(),
        phone: m.phone || "-",
        memberId: m.id,
        treatmentCount: 10,
        pingsanCount: 10,
        totalCount: 20,
        packageLabel: "10 Treatment • 10 Pingsan",
        givenAt: givenAt,
        givenDateFormatted: m.voucherJasraDate || formatJasraShortDate(givenAt),
        batchExpiresAt: activeBatch.expiresAt || 1794186000000,
        batchExpiresFormatted: formatJasraDate(activeBatch.expiresAt || 1794186000000),
        officerName: "Admin Paguyuban",
        notes: "Sinkronisasi otomatis dari Database Anggota LSM PPS",
        createdAt: givenAt,
      };
      await setDoc(doc(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH, distId), distDoc, { merge: true });
      syncedCount++;

      // Pastikan status voucherJasraReceived juga aktif di data member
      try {
        const memberRef = doc(getJasraDb(), ...MEMBERS_COL_PATH, m.id);
        await setDoc(memberRef, { voucherJasraReceived: true }, { merge: true });
      } catch (memErr) {
        console.warn("Notice: Gagal set voucherJasraReceived di member:", memErr);
      }
    }
  }

  for (const ext of externalJasraList) {
    const key = `C_${ext.citizenId}`;
    if (!existingMap.has(key)) {
      const distId = "DIST_" + ext.id;
      const givenAt = ext.createdAt || ext.updatedAt || 1793644800000;
      const distDoc = {
        id: distId,
        batchId: activeBatch.id,
        batchName: activeBatch.batchName,
        recipientType: "NON_MEMBER",
        recipientName: (ext.fullName || "Warga Luar").toUpperCase(),
        citizenId: (ext.citizenId || "-").toUpperCase(),
        phone: ext.phone || "-",
        memberId: null,
        treatmentCount: 10,
        pingsanCount: 10,
        totalCount: 20,
        packageLabel: "10 Treatment • 10 Pingsan",
        givenAt: givenAt,
        givenDateFormatted: ext.dateGiven || formatJasraShortDate(givenAt),
        batchExpiresAt: activeBatch.expiresAt || 1794186000000,
        batchExpiresFormatted: formatJasraDate(activeBatch.expiresAt || 1794186000000),
        officerName: "Admin Paguyuban",
        notes: "Sinkronisasi otomatis dari Penerima Jasra Luar Anggota",
        createdAt: givenAt,
      };
      await setDoc(doc(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH, distId), distDoc, { merge: true });
      syncedCount++;
    }
  }

  // Recalculate and update batch stock totals
  const updatedSnap = await getDocs(colRef);
  let totalDistributedTreatment = 0;
  let totalDistributedPingsan = 0;
  let totalDistributedCount = 0;
  updatedSnap.forEach((d) => {
    if (d.id !== "_meta") {
      const data = d.data();
      totalDistributedTreatment += Number(data.treatmentCount) || 10;
      totalDistributedPingsan += Number(data.pingsanCount) || 10;
      totalDistributedCount++;
    }
  });

  const batchRef = doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, activeBatch.id);
  await setDoc(
    batchRef,
    {
      remainingTreatment: Math.max(0, (activeBatch.initialTreatment || 500) - totalDistributedTreatment),
      remainingPingsan: Math.max(0, (activeBatch.initialPingsan || 500) - totalDistributedPingsan),
      distributedTreatment: totalDistributedTreatment,
      distributedPingsan: totalDistributedPingsan,
      distributedCount: totalDistributedCount,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { syncedCount, totalDistributedCount, totalDistributedTreatment, totalDistributedPingsan };
}
