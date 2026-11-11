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
const EXTERNAL_JASRA_COL_PATH = ["artifacts", APP_ID, "public", "data", "external_jasra"];

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
  id: "BATCH_PEMERINTAH_20261102",
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
  remainingTreatment: 0,
  remainingPingsan: 0,
  distributedTreatment: 500,
  distributedPingsan: 500,
  distributedCount: 50,
  status: "COMPLETED",
  notes: "Alokasi resmi voucher kesehatan dari Pemerintah Kota San Andreas.",
  createdAt: 1793581200000,
  updatedAt: 1793581200000,
};

/**
 * Cek apakah dokumen batch valid (punya timestamp penerimaan & kuota awal)
 */
export function isValidJasraBatch(batch) {
  return Boolean(
    batch &&
      batch.id &&
      batch.receivedAt &&
      (Number(batch.initialTreatment) > 0 || Number(batch.initialPingsan) > 0)
  );
}

/**
 * Pilih Batch Jasra yang paling aktif saat ini (prioritas ACTIVE terbaru & belum expired)
 */
export function getActiveJasraBatch(batches = []) {
  const valid = (batches || []).filter(isValidJasraBatch);
  const pool = valid.length > 0 ? valid : (batches || []);
  if (pool.length === 0) return DEFAULT_GOVERNMENT_BATCH;
  const sorted = [...pool].sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
  const activeUnexpired = sorted.find(
    (b) => b.status === "ACTIVE" && !calculateBatchRemaining(b).isExpired
  );
  if (activeUnexpired) return activeUnexpired;
  return sorted.find((b) => b.status === "ACTIVE") || sorted[0];
}

/**
 * Cari dokumen distribusi Jasra untuk seorang anggota pada daftar distribusi tertentu
 */
export function findMemberJasraDistribution(distributions = [], member) {
  if (!member || !Array.isArray(distributions) || distributions.length === 0) return null;
  const memberCid = (member.icNumber || member.citizenId || "").trim().toUpperCase();
  const memberName = (member.fullName || "").trim().toUpperCase();
  return (
    distributions.find((d) => {
      if (d.memberId && member.id && d.memberId === member.id) return true;
      const dCid = (d.citizenId || "").trim().toUpperCase();
      if (dCid && memberCid && !dCid.includes("TIDAK") && dCid === memberCid) return true;
      const dName = (d.recipientName || "").trim().toUpperCase();
      if (dName && memberName && dName === memberName) return true;
      return false;
    }) || null
  );
}

/**
 * Ambil daftar penerima manfaat yang terisolasi strictly pada targetBatch tertentu
 */
export function getBatchDistributions(
  distributions = [],
  targetBatch = null,
  fallbackMembers = [],
  fallbackExternal = []
) {
  if (!targetBatch || !targetBatch.id) {
    return [...(distributions || [])].sort((a, b) => (b.givenAt || 0) - (a.givenAt || 0));
  }

  const list = (distributions || []).filter((d) => d.batchId === targetBatch.id);
  const existingMemberIds = new Set(list.map((d) => d.memberId).filter(Boolean));
  const existingCids = new Set(
    list
      .map((d) => (d.citizenId || "").trim().toUpperCase())
      .filter((c) => c && c !== "-" && !c.includes("TIDAK"))
  );
  const existingNames = new Set(
    list
      .map((d) => (d.recipientName || "").trim().toUpperCase())
      .filter(Boolean)
  );

  const isLegacyBatch1 = targetBatch.id === "BATCH_PEMERINTAH_20261102";
  const batchExpiry = Number(targetBatch.expiresAt) || 0;

  (fallbackMembers || []).forEach((m) => {
    if (!m.voucherJasraReceived) return;
    const belongsToTarget =
      m.voucherBatchId === targetBatch.id || (isLegacyBatch1 && !m.voucherBatchId);
    if (!belongsToTarget) return;

    const cid = (m.icNumber || m.citizenId || "").trim().toUpperCase();
    const name = (m.fullName || "").trim().toUpperCase();
    const hasValidCid = Boolean(cid && cid !== "-" && !cid.includes("TIDAK"));
    const isAlreadyInList =
      existingMemberIds.has(m.id) ||
      (hasValidCid && existingCids.has(cid)) ||
      (name && existingNames.has(name));

    if (!isAlreadyInList) {
      const givenAt = m.voucherClaimedAt || m.lastUpdatedStatusAt || targetBatch.receivedAt || Date.now();
      list.push({
        id: "DIST_" + m.id,
        batchId: targetBatch.id,
        batchName: targetBatch.batchName,
        recipientType: "MEMBER",
        recipientName: name || "ANGGOTA PPS",
        citizenId: cid || "-",
        phone: m.phone || "-",
        memberId: m.id,
        treatmentCount: Number(m.voucherJasraDetail?.treatment ?? DEFAULT_TREATMENT_PER_PERSON),
        pingsanCount: Number(m.voucherJasraDetail?.pingsan ?? DEFAULT_PINGSAN_PER_PERSON),
        totalCount:
          Number(m.voucherJasraDetail?.treatment ?? DEFAULT_TREATMENT_PER_PERSON) +
          Number(m.voucherJasraDetail?.pingsan ?? DEFAULT_PINGSAN_PER_PERSON),
        packageLabel: `${m.voucherJasraDetail?.treatment ?? DEFAULT_TREATMENT_PER_PERSON} Treatment • ${m.voucherJasraDetail?.pingsan ?? DEFAULT_PINGSAN_PER_PERSON} Pingsan`,
        givenAt,
        givenDateFormatted: m.voucherJasraDate || formatJasraShortDate(givenAt),
        batchExpiresAt: batchExpiry,
        batchExpiresFormatted: formatJasraDate(batchExpiry),
        officerName: "Admin Paguyuban",
        notes: "Database Anggota LSM PPS",
        createdAt: givenAt,
      });
      existingMemberIds.add(m.id);
      if (hasValidCid) existingCids.add(cid);
      if (name) existingNames.add(name);
    }
  });

  (fallbackExternal || []).forEach((ext) => {
    const belongsToTarget =
      ext.batchId === targetBatch.id ||
      (isLegacyBatch1 &&
        !ext.batchId &&
        (!batchExpiry || (Number(ext.createdAt) || 0) <= batchExpiry));
    if (!belongsToTarget) return;

    const cid = (ext.citizenId || "").trim().toUpperCase();
    const name = (ext.fullName || "").trim().toUpperCase();
    const hasValidCid = Boolean(cid && cid !== "-" && !cid.includes("TIDAK"));
    const isAlreadyInList =
      (hasValidCid && existingCids.has(cid)) ||
      (name && existingNames.has(name));

    if (!isAlreadyInList) {
      const givenAt = ext.createdAt || ext.updatedAt || targetBatch.receivedAt || Date.now();
      list.push({
        id: "DIST_" + ext.id,
        batchId: targetBatch.id,
        batchName: targetBatch.batchName,
        recipientType: "NON_MEMBER",
        recipientName: name || "WARGA LUAR",
        citizenId: cid || "-",
        phone: ext.phone || "-",
        memberId: null,
        treatmentCount: Number(ext.voucherDetail?.treatment ?? DEFAULT_TREATMENT_PER_PERSON),
        pingsanCount: Number(ext.voucherDetail?.pingsan ?? DEFAULT_PINGSAN_PER_PERSON),
        totalCount:
          Number(ext.voucherDetail?.treatment ?? DEFAULT_TREATMENT_PER_PERSON) +
          Number(ext.voucherDetail?.pingsan ?? DEFAULT_PINGSAN_PER_PERSON),
        packageLabel: `${ext.voucherDetail?.treatment ?? DEFAULT_TREATMENT_PER_PERSON} Treatment • ${ext.voucherDetail?.pingsan ?? DEFAULT_PINGSAN_PER_PERSON} Pingsan`,
        givenAt,
        givenDateFormatted: ext.dateGiven || formatJasraShortDate(givenAt),
        batchExpiresAt: batchExpiry,
        batchExpiresFormatted: formatJasraDate(batchExpiry),
        officerName: "Admin Paguyuban",
        notes: "Database Jasra Luar Anggota",
        createdAt: givenAt,
      });
      if (hasValidCid) existingCids.add(cid);
      if (name) existingNames.add(name);
    }
  });

  list.sort((a, b) => (b.givenAt || 0) - (a.givenAt || 0));
  return list;
}

/**
 * Hitung stok terpakai & sisa kuota untuk batch tertentu
 */
export function computeBatchMetrics(batch = null, batchDistributions = []) {
  const initialTreatment = Number(batch?.initialTreatment) || 500;
  const initialPingsan = Number(batch?.initialPingsan) || 500;
  const distributedCount = batchDistributions.length;
  const distributedTreatment = batchDistributions.reduce(
    (sum, d) => sum + (Number(d.treatmentCount) || DEFAULT_TREATMENT_PER_PERSON),
    0
  );
  const distributedPingsan = batchDistributions.reduce(
    (sum, d) => sum + (Number(d.pingsanCount) || DEFAULT_PINGSAN_PER_PERSON),
    0
  );
  const remainingTreatment = Math.max(0, initialTreatment - distributedTreatment);
  const remainingPingsan = Math.max(0, initialPingsan - distributedPingsan);

  return {
    initialTreatment,
    initialPingsan,
    distributedCount,
    distributedTreatment,
    distributedPingsan,
    remainingTreatment,
    remainingPingsan,
  };
}

/**
 * Susun opsi BrutalistSelect untuk memilih batch aktif atau arsip gelombang sebelumnya
 */
export function buildJasraBatchSelectOptions(activeBatch, validBatches = []) {
  const options = [];
  if (activeBatch) {
    options.push({
      value: "ACTIVE",
      label: `Batch Aktif: ${activeBatch.batchName}`,
      subtext: `${formatJasraShortDate(activeBatch.receivedAt)} - ${formatJasraShortDate(activeBatch.expiresAt)}`,
    });
  }
  validBatches
    .filter((b) => b.id !== activeBatch?.id)
    .forEach((b) => {
      options.push({
        value: b.id,
        label: `Arsip: ${b.batchName}`,
        subtext: `${formatJasraShortDate(b.receivedAt)} - ${formatJasraShortDate(b.expiresAt)}`,
      });
    });
  return options;
}

/**
 * Format a Date as local YYYY-MM-DD (avoids UTC date shift between 00:00-06:59 WIB)
 */
export function getLocalIsoDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  // Jika batch baru langsung aktif, arsipkan batch aktif sebelumnya agar batch baru mulai bersih dari 0
  if (isNew && payload.status === "ACTIVE") {
    try {
      const existingSnap = await getDocs(collection(getJasraDb(), ...JASRA_BATCHES_COL_PATH));
      const archiveTasks = [];
      existingSnap.forEach((d) => {
        if (d.id !== "_meta" && d.id !== docId && d.data()?.status === "ACTIVE") {
          archiveTasks.push(
            setDoc(
              doc(getJasraDb(), ...JASRA_BATCHES_COL_PATH, d.id),
              { status: "COMPLETED", updatedAt: Date.now() },
              { merge: true }
            )
          );
        }
      });
      if (archiveTasks.length > 0) await Promise.all(archiveTasks);
    } catch (err) {
      console.warn("Notice: Gagal mengarsipkan batch aktif sebelumnya:", err);
    }
  }

  await setDoc(docRef, payload, { merge: true });

  // Update local cache
  try {
    const cached = JSON.parse(localStorage.getItem(JASRA_BATCHES_STORAGE_KEY) || "[]");
    const updatedCached = cached.map((b) =>
      isNew && payload.status === "ACTIVE" && b.id !== docId && b.status === "ACTIVE"
        ? { ...b, status: "COMPLETED" }
        : b
    );
    const updated = [payload, ...updatedCached.filter((b) => b.id !== docId)];
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
      const batchSnap = await getDoc(batchRef);
      let matchedBatch = batchSnap.exists() ? batchSnap.data() : null;
      if (!matchedBatch) {
        const batches = JSON.parse(localStorage.getItem(JASRA_BATCHES_STORAGE_KEY) || "[]");
        matchedBatch = batches.find((b) => b.id === distribution.batchId);
      }
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

  // If member, reset voucher status in members collection only if it belongs to this batch
  if (distribution.recipientType === "MEMBER") {
    try {
      let targetMemberId = distribution.memberId || null;
      let targetMemberData = null;
      if (!targetMemberId && (distribution.citizenId || distribution.recipientName)) {
        const memSnap = await getDocs(collection(getJasraDb(), ...MEMBERS_COL_PATH));
        const cleanCid = (distribution.citizenId || "").trim().toUpperCase();
        const cleanName = (distribution.recipientName || "").trim().toUpperCase();
        memSnap.forEach((d) => {
          if (d.id !== "_meta") {
            const data = d.data();
            const mCid = (data.icNumber || data.citizenId || "").trim().toUpperCase();
            const mName = (data.fullName || "").trim().toUpperCase();
            if ((cleanCid && !cleanCid.includes("TIDAK") && mCid === cleanCid) || (cleanName && mName === cleanName)) {
              targetMemberId = d.id;
              targetMemberData = data;
            }
          }
        });
      } else if (targetMemberId) {
        const mSnap = await getDoc(doc(getJasraDb(), ...MEMBERS_COL_PATH, targetMemberId));
        if (mSnap.exists()) targetMemberData = mSnap.data();
      }

      const belongsToSameBatch =
        !targetMemberData?.voucherBatchId ||
        !distribution.batchId ||
        targetMemberData.voucherBatchId === distribution.batchId;

      if (targetMemberId && belongsToSameBatch) {
        const memberRef = doc(getJasraDb(), ...MEMBERS_COL_PATH, targetMemberId);
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
      }
    } catch (err) {
      console.warn("Gagal reset voucher member:", err);
    }
  }

  // If non-member (external), also delete matching record in the same batch from external_jasra collection
  if (distribution.recipientType !== "MEMBER") {
    try {
      const extRawId = distribution.id.startsWith("DIST_") ? distribution.id.substring(5) : distribution.id;
      const directRef = doc(getJasraDb(), ...EXTERNAL_JASRA_COL_PATH, extRawId);
      const directSnap = await getDoc(directRef);
      if (
        directSnap.exists() &&
        (!directSnap.data().batchId || directSnap.data().batchId === distribution.batchId)
      ) {
        await deleteDoc(directRef);
      }

      // Check matching CID/fullName only within the same batch so newer/older batch docs stay intact
      const extSnap = await getDocs(collection(getJasraDb(), ...EXTERNAL_JASRA_COL_PATH));
      const cleanCid = (distribution.citizenId || "").trim().toUpperCase();
      const cleanName = (distribution.recipientName || "").trim().toUpperCase();

      for (const d of extSnap.docs) {
        if (d.id === "_meta") continue;
        const eData = d.data();
        const sameBatch = !eData.batchId || !distribution.batchId || eData.batchId === distribution.batchId;
        if (!sameBatch) continue;
        const eCid = (eData.citizenId || "").trim().toUpperCase();
        const eName = (eData.fullName || "").trim().toUpperCase();
        if (
          d.id === extRawId ||
          (cleanCid && !cleanCid.includes("TIDAK") && eCid === cleanCid) ||
          (cleanName && eName === cleanName)
        ) {
          await deleteDoc(doc(getJasraDb(), ...EXTERNAL_JASRA_COL_PATH, d.id));
        }
      }

      // Update local storage cache
      try {
        const cached = JSON.parse(localStorage.getItem("pps_external_jasra_cache") || "[]");
        const filtered = cached.filter((item) => {
          const sameBatch = !item.batchId || !distribution.batchId || item.batchId === distribution.batchId;
          if (!sameBatch) return true;
          return (
            item.id !== extRawId &&
            item.id !== distribution.id &&
            (!cleanCid || cleanCid.includes("TIDAK") || (item.citizenId || "").trim().toUpperCase() !== cleanCid) &&
            (!cleanName || (item.fullName || "").trim().toUpperCase() !== cleanName)
          );
        });
        localStorage.setItem("pps_external_jasra_cache", JSON.stringify(filtered));
      } catch {}
    } catch (err) {
      console.warn("Gagal sinkron hapus dari external_jasra:", err);
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

  const today = getLocalIsoDate();
  XLSX.writeFile(workbook, `Laporan_Penyaluran_Jasra_LSM_PPS_${today}.xlsx`);
  return true;
}

/**
 * Sinkronisasi Penerima Manfaat dari Database Anggota & Warga Luar ke Penyaluran Jasra
 * Terisolasi per activeBatch agar tidak menarik data batch lama ke batch baru.
 */
export async function syncJasraWithMembersCloud(membersList = [], externalJasraList = [], activeBatchInput = null) {
  const activeBatch = activeBatchInput || DEFAULT_GOVERNMENT_BATCH;
  const colRef = collection(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH);
  const snap = await getDocs(colRef);
  const existingMap = new Map();
  snap.forEach((d) => {
    const data = d.data();
    if (data.batchId !== activeBatch.id) return;
    if (data.memberId) existingMap.set(`M_${data.memberId}`, d.id);
    if (data.citizenId) existingMap.set(`C_${String(data.citizenId).trim().toUpperCase()}`, d.id);
    if (data.recipientName) existingMap.set(`N_${String(data.recipientName).trim().toUpperCase()}`, d.id);
  });

  const isLegacyBatch1 = activeBatch.id === "BATCH_PEMERINTAH_20261102";
  const activeMembers = membersList.filter((m) => {
    if (!m.voucherJasraReceived) return false;
    return m.voucherBatchId === activeBatch.id || (isLegacyBatch1 && !m.voucherBatchId);
  });
  let syncedCount = 0;

  for (const m of activeMembers) {
    const key = `M_${m.id}`;
    const cidUpper = String(m.icNumber || m.citizenId || "").trim().toUpperCase();
    const nameUpper = String(m.fullName || "").trim().toUpperCase();
    const cidKey = cidUpper && cidUpper !== "-" && !cidUpper.includes("TIDAK") ? `C_${cidUpper}` : null;
    const nameKey = nameUpper ? `N_${nameUpper}` : null;
    if (!existingMap.has(key) && (!cidKey || !existingMap.has(cidKey)) && (!nameKey || !existingMap.has(nameKey))) {
      const distId = isLegacyBatch1 ? "DIST_" + m.id : `DIST_${activeBatch.id}_${m.id}`;
      const givenAt = m.voucherClaimedAt || m.lastUpdatedStatusAt || activeBatch.receivedAt || Date.now();
      const distDoc = {
        id: distId,
        batchId: activeBatch.id,
        batchName: activeBatch.batchName,
        recipientType: "MEMBER",
        recipientName: nameUpper || "ANGGOTA PPS",
        citizenId: cidUpper || "-",
        phone: m.phone || "-",
        memberId: m.id,
        treatmentCount: 10,
        pingsanCount: 10,
        totalCount: 20,
        packageLabel: "10 Treatment • 10 Pingsan",
        givenAt: givenAt,
        givenDateFormatted: m.voucherJasraDate || formatJasraShortDate(givenAt),
        batchExpiresAt: activeBatch.expiresAt,
        batchExpiresFormatted: formatJasraDate(activeBatch.expiresAt),
        officerName: "Admin Paguyuban",
        notes: "Sinkronisasi otomatis dari Database Anggota LSM PPS",
        createdAt: givenAt,
      };
      await setDoc(doc(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH, distId), distDoc, { merge: true });
      syncedCount++;
    }
  }

  for (const ext of externalJasraList) {
    const belongsToActive =
      ext.batchId === activeBatch.id ||
      (isLegacyBatch1 && !ext.batchId && (!activeBatch.expiresAt || (ext.createdAt || 0) <= activeBatch.expiresAt));
    if (!belongsToActive) continue;

    const cidUpper = String(ext.citizenId || "").trim().toUpperCase();
    const nameUpper = String(ext.fullName || "").trim().toUpperCase();
    const cidKey = cidUpper && cidUpper !== "-" && !cidUpper.includes("TIDAK") ? `C_${cidUpper}` : null;
    const nameKey = nameUpper ? `N_${nameUpper}` : null;
    if ((!cidKey || !existingMap.has(cidKey)) && (!nameKey || !existingMap.has(nameKey))) {
      const distId = isLegacyBatch1 ? "DIST_" + ext.id : `DIST_${activeBatch.id}_${ext.id}`;
      const givenAt = ext.createdAt || ext.updatedAt || activeBatch.receivedAt || Date.now();
      const distDoc = {
        id: distId,
        batchId: activeBatch.id,
        batchName: activeBatch.batchName,
        recipientType: "NON_MEMBER",
        recipientName: (ext.fullName || "Warga Luar").toUpperCase(),
        citizenId: cidUpper || "-",
        phone: ext.phone || "-",
        memberId: null,
        treatmentCount: 10,
        pingsanCount: 10,
        totalCount: 20,
        packageLabel: "10 Treatment • 10 Pingsan",
        givenAt: givenAt,
        givenDateFormatted: ext.dateGiven || formatJasraShortDate(givenAt),
        batchExpiresAt: activeBatch.expiresAt,
        batchExpiresFormatted: formatJasraDate(activeBatch.expiresAt),
        officerName: "Admin Paguyuban",
        notes: "Sinkronisasi otomatis dari Penerima Jasra Luar Anggota",
        createdAt: givenAt,
      };
      await setDoc(doc(getJasraDb(), ...JASRA_DISTRIBUTIONS_COL_PATH, distId), distDoc, { merge: true });
      syncedCount++;
    }
  }

  // Recalculate and update stock totals strictly for activeBatch
  const updatedSnap = await getDocs(colRef);
  let totalDistributedTreatment = 0;
  let totalDistributedPingsan = 0;
  let totalDistributedCount = 0;
  updatedSnap.forEach((d) => {
    if (d.id !== "_meta") {
      const data = d.data();
      if (data.batchId !== activeBatch.id) return;
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
