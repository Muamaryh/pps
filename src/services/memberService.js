// ==========================================================================
// MEMBER REGISTRATION & DATABASE SERVICE (INTEGRATED FOR LSM PPS)
// Connects to the official PPS Member Database (pendaftaran-paps)
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
import JSZip from "jszip";

const memberFirebaseConfig = {
  apiKey: "AIzaSyDB7TFVRDRvgMI4q_XtwnxSqOhCKZ2xAe8",
  authDomain: "pendaftaran-paps.firebaseapp.com",
  projectId: "pendaftaran-paps",
  storageBucket: "pendaftaran-paps.firebasestorage.app",
  messagingSenderId: "263750919370",
  appId: "1:263750919370:web:ed32312897807281498033",
  measurementId: "G-RBTWG5K8W1",
};

let _memberApp = null;
let _memberDb = null;

function getMemberApp() {
  if (!_memberApp) {
    _memberApp =
      getApps().find((a) => a.name === "paps-members") ||
      initializeApp(memberFirebaseConfig, "paps-members");
  }
  return _memberApp;
}

function getMemberDb() {
  if (!_memberDb) {
    _memberDb = getFirestore(getMemberApp());
  }
  return _memberDb;
}

const APP_ID = "portal-anggota-app";
const MEMBERS_COL_PATH = ["artifacts", APP_ID, "public", "data", "members"];
const EXTERNAL_JASRA_COL_PATH = ["artifacts", APP_ID, "public", "data", "external_jasra"];
const EXTERNAL_JASRA_STORAGE_KEY = "pps_external_jasra_cache";

/**
 * Fetch all external Jasra recipients (non-members) from cloud database
 */
export async function loadExternalJasraCloud() {
  try {
    const colRef = collection(getMemberDb(), ...EXTERNAL_JASRA_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      if (d.id !== "_meta") {
        list.push({ id: d.id, ...d.data() });
      }
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    try {
      localStorage.setItem(EXTERNAL_JASRA_STORAGE_KEY, JSON.stringify(list));
    } catch {}
    return list;
  } catch (err) {
    console.warn("Gagal memuat penerima Jasra luar dari cloud, membaca cache:", err);
    try {
      const cached = localStorage.getItem(EXTERNAL_JASRA_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

/**
 * Real-time listener for external Jasra recipients (non-members)
 */
export function subscribeExternalJasraCloud(onUpdate, onError) {
  try {
    const colRef = collection(getMemberDb(), ...EXTERNAL_JASRA_COL_PATH);
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
          localStorage.setItem(EXTERNAL_JASRA_STORAGE_KEY, JSON.stringify(list));
        } catch {}
        if (typeof onUpdate === "function") onUpdate(list);
      },
      (err) => {
        console.warn("Subscription external Jasra notice:", err);
        try {
          const cached = localStorage.getItem(EXTERNAL_JASRA_STORAGE_KEY);
          if (cached && typeof onUpdate === "function") {
            onUpdate(JSON.parse(cached));
          }
        } catch {}
        if (typeof onError === "function") onError(err);
      }
    );
  } catch (err) {
    console.error("Gagal inisialisasi listener external Jasra:", err);
    return () => {};
  }
}

/**
 * Save or update an external Jasra recipient (Admin)
 */
export async function saveExternalJasraCloud(data) {
  const docId = data.id || "EXT_JASRA_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date();
  const dateStr = data.dateGiven || now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const payload = {
    ...data,
    id: docId,
    fullName: String(data.fullName || "").trim().toUpperCase(),
    citizenId: String(data.citizenId || "").trim().toUpperCase(),
    phone: String(data.phone || "").trim(),
    ktpPhoto: data.ktpPhoto || "",
    voucherDetail: data.voucherDetail || { treatment: 10, pingsan: 10 },
    packageLabel: data.packageLabel || "10 Tritmen • 10 Pingsan",
    dateGiven: dateStr,
    notes: String(data.notes || "").trim(),
    status: data.status || "ACTIVE",
    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  const docRef = doc(getMemberDb(), ...EXTERNAL_JASRA_COL_PATH, docId);
  await setDoc(docRef, payload, { merge: true });

  try {
    const cached = JSON.parse(localStorage.getItem(EXTERNAL_JASRA_STORAGE_KEY) || "[]");
    const updated = cached.some((item) => item.id === docId)
      ? cached.map((item) => (item.id === docId ? { ...item, ...payload } : item))
      : [payload, ...cached];
    localStorage.setItem(EXTERNAL_JASRA_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return payload;
}

/**
 * Delete an external Jasra recipient
 */
export async function deleteExternalJasraCloud(id) {
  const docRef = doc(getMemberDb(), ...EXTERNAL_JASRA_COL_PATH, id);
  await deleteDoc(docRef);

  try {
    const cached = JSON.parse(localStorage.getItem(EXTERNAL_JASRA_STORAGE_KEY) || "[]");
    const updated = cached.filter((item) => item.id !== id);
    localStorage.setItem(EXTERNAL_JASRA_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return true;
}

/**
 * Export external Jasra recipients to Excel
 */
export function exportExternalJasraToExcel(list = []) {
  if (!Array.isArray(list) || list.length === 0) return false;

  const rows = list.map((item, index) => ({
    No: index + 1,
    "ID Penerima": item.id,
    "NAMA LENGKAP (IC)": item.fullName || "-",
    "CITIZEN ID / NO KTP": item.citizenId || "-",
    "NO TLP / WA": item.phone || "-",
    "TANGGAL DIBERIKAN": item.dateGiven || "-",
    "PAKET MANFAAT": item.packageLabel || "10 Tritmen • 10 Pingsan",
    "STATUS": item.status === "ACTIVE" ? "AKTIF" : "SELESAI",
    "CATATAN / KETERANGAN": item.notes || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 25 },
    { wch: 12 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Penerima Jasra Luar Anggota");
  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Penerima_Jasra_Luar_Anggota_PPS_${today}.xlsx`);
  return true;
}

/**
 * Fetch all members from cloud database
 */
export async function loadMembersCloud() {
  try {
    const colRef = collection(getMemberDb(), ...MEMBERS_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  } catch (err) {
    console.error("Error loading members:", err);
    return [];
  }
}

/**
 * Real-time listener for member database
 */
export function subscribeMembersCloud(onUpdate, onError) {
  const colRef = collection(getMemberDb(), ...MEMBERS_COL_PATH);
  return onSnapshot(
    colRef,
    (snap) => {
      const list = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn("Firestore member sync notice:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Submit new member registration to cloud with duplicate prevention
 * Rejects registration if citizen ID or full name is already registered.
 */
export async function submitMemberCloud(data) {
  if (!data) throw new Error("Data pendaftaran tidak boleh kosong.");

  const cleanCid = String(data.icNumber || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const cleanName = String(data.fullName || "").trim().toUpperCase().replace(/\s+/g, " ");

  if (!cleanCid) {
    throw new Error("Citizen ID (No KTP IC) wajib diisi.");
  }
  if (!cleanName) {
    throw new Error("Nama Lengkap IC wajib diisi.");
  }

  // 1. Check existing members to prevent duplicate registrations
  const existingMembers = await loadMembersCloud();
  const matchedMember = existingMembers.find((m) => {
    const existingCid = String(m.icNumber || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const existingName = String(m.fullName || "").trim().toUpperCase().replace(/\s+/g, " ");
    return (cleanCid && existingCid === cleanCid) || (cleanName && existingName === cleanName);
  });

  if (matchedMember) {
    const existingCid = String(matchedMember.icNumber || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const isCidMatch = cleanCid && existingCid === cleanCid;
    const reason = isCidMatch
      ? `Citizen ID (${cleanCid}) sudah pernah terdaftar sebagai Anggota Resmi atas nama "${matchedMember.fullName || "Warga"}"`
      : `Nama warga "${cleanName}" sudah pernah terdaftar sebagai Anggota Resmi (CID: ${matchedMember.icNumber || "-"})`;

    const err = new Error(`Pendaftaran Ditolak: ${reason}. Setiap warga hanya diperbolehkan mendaftar 1 kali.`);
    err.code = "ALREADY_REGISTERED";
    err.existingMember = matchedMember;
    throw err;
  }

  const newDocId = "MEMBER_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date();
  const payload = {
    fullName: (data.fullName || "").trim().toUpperCase(),
    icNumber: (data.icNumber || "").trim().toUpperCase(),
    phone: (data.phone || "").trim(),
    discordTag: (data.discordTag || "").trim(),
    profilePhoto: data.profilePhoto || "",
    icPhoto: data.icPhoto || "",
    createdAt: Date.now(),
    regDate: now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    submittedAt: now.toISOString(),
  };

  const docRef = doc(getMemberDb(), ...MEMBERS_COL_PATH, newDocId);
  await setDoc(docRef, payload);
  return { id: newDocId, ...payload };
}

/**
 * Delete a member record from cloud
 */
export async function deleteMemberCloud(id) {
  const docRef = doc(getMemberDb(), ...MEMBERS_COL_PATH, id);
  await deleteDoc(docRef);
  return true;
}

/**
 * Date / Period Helpers for Automatic Reset System
 * - Kas (Uang Kas & Jasra): Reset Otomatis Tiap Pergantian Bulan (1x sebulan)
 * - Voucher (10 Treatment & 10 Pingsan): Reset Otomatis Tiap Hari Senin 00:00 (1x seminggu)
 */
export function getCurrentMonthKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`; // e.g. "2026-10"
}

export function getCurrentMonthLabel(d = new Date()) {
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }); // e.g. "Oktober 2026"
}

export function getCurrentWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`; // e.g. "2026-W44"
}

export function getCurrentWeekLabel(d = new Date()) {
  const current = new Date(d);
  const day = current.getDay();
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monStr = monday.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const sunStr = sunday.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${monStr} - ${sunStr}`; // e.g. "26 Okt - 1 Nov 2026"
}

/**
 * Subscription Constants & Durations
 * - Kas (Uang Kas & Jasra): Langganan 30 Hari per pembayaran ($4.000)
 * - Voucher (10 Treatment & 10 Pingsan): Masa Aktif Kuota 7 Hari per klaim
 */
export const KAS_SUBSCRIPTION_DAYS = 30;
export const VOUCHER_SUBSCRIPTION_DAYS = 7;

/**
 * Format helper tanggal Indonesia
 */
function formatDateId(dateInput) {
  if (!dateInput) return "-";
  const d = typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Cek dan hitung status Subscription Kas Anggota (30 Hari)
 * Mendukung backward compatibility dengan data lama (kasPaid boolean / kasPeriod)
 */
export function getMemberKasSubscription(member, now = new Date()) {
  const nowMs = typeof now === "number" ? now : now.getTime();
  if (!member) {
    return {
      isActive: false,
      isExpiringSoon: false,
      isExpired: false,
      status: "INACTIVE",
      daysRemaining: 0,
      expiresAt: null,
      expiresAtFormatted: "-",
      startedAt: null,
      startedAtFormatted: "-",
      label: "Belum Bayar",
    };
  }

  // Cari timestamp kadaluarsa (kasExpiresAt)
  let expiresAt = member.kasExpiresAt || null;
  let startedAt = member.kasSubscribedAt || member.kasPaidAt || null;

  // Backward compatibility: Jika data lama hanya punya kasPaid: true
  if (member.kasPaid && !expiresAt) {
    if (member.lastUpdatedStatusAt) {
      expiresAt = Number(member.lastUpdatedStatusAt) + KAS_SUBSCRIPTION_DAYS * 86400000;
      startedAt = Number(member.lastUpdatedStatusAt);
    } else if (member.kasPeriod) {
      // Jika periode sesuai bulan ini, berikan sisa sampai akhir bulan
      const cur = new Date(nowMs);
      const endOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59).getTime();
      expiresAt = endOfMonth;
      startedAt = new Date(cur.getFullYear(), cur.getMonth(), 1).getTime();
    }
  }

  if (!expiresAt || !member.kasPaid) {
    return {
      isActive: false,
      isExpiringSoon: false,
      isExpired: Boolean(expiresAt && nowMs >= expiresAt),
      status: expiresAt && nowMs >= expiresAt ? "EXPIRED" : "INACTIVE",
      daysRemaining: 0,
      expiresAt: expiresAt || null,
      expiresAtFormatted: formatDateId(expiresAt),
      startedAt: startedAt || null,
      startedAtFormatted: formatDateId(startedAt),
      label: expiresAt && nowMs >= expiresAt ? "Lewat Tempo" : "Belum Bayar",
    };
  }

  const diffMs = expiresAt - nowMs;
  const diffDays = Math.ceil(diffMs / 86400000);

  if (diffMs > 0) {
    const isExpiringSoon = diffDays <= 3;
    return {
      isActive: true,
      isExpiringSoon,
      isExpired: false,
      status: isExpiringSoon ? "EXPIRING_SOON" : "ACTIVE",
      daysRemaining: diffDays,
      expiresAt,
      expiresAtFormatted: formatDateId(expiresAt),
      startedAt: startedAt || null,
      startedAtFormatted: formatDateId(startedAt),
      label: isExpiringSoon ? `Mendekati tempo (${diffDays} hari lagi)` : `Lunas (${diffDays} hari lagi)`,
    };
  }

  const daysAgo = Math.max(0, Math.floor(Math.abs(diffMs) / 86400000));
  return {
    isActive: false,
    isExpiringSoon: false,
    isExpired: true,
    status: "EXPIRED",
    daysRemaining: 0,
    daysAgo,
    expiresAt,
    expiresAtFormatted: formatDateId(expiresAt),
    startedAt: startedAt || null,
    startedAtFormatted: formatDateId(startedAt),
    label: daysAgo === 0 ? "Jatuh tempo hari ini" : `Lewat tempo (${daysAgo} hari)`,
  };
}

/**
 * Cek dan hitung status Kuota/Langganan Voucher Tritmen & Pingsan Anggota (7 Hari)
 * Mendukung backward compatibility dengan data lama
 */
export function getMemberVoucherSubscription(member, now = new Date()) {
  const nowMs = typeof now === "number" ? now : now.getTime();
  if (!member) {
    return {
      isActive: false,
      isExpired: false,
      status: "UNCLAIMED",
      daysRemaining: 0,
      hoursRemaining: 0,
      expiresAt: null,
      expiresAtFormatted: "-",
      claimedAt: null,
      claimedAtFormatted: "-",
      label: "Belum Klaim",
      detail: null,
    };
  }

  let expiresAt = member.voucherExpiresAt || null;
  let claimedAt = member.voucherClaimedAt || null;

  // Backward compatibility
  if (member.voucherJasraReceived && !expiresAt) {
    if (member.lastUpdatedStatusAt) {
      expiresAt = Number(member.lastUpdatedStatusAt) + VOUCHER_SUBSCRIPTION_DAYS * 86400000;
      claimedAt = Number(member.lastUpdatedStatusAt);
    }
  }

  if (!expiresAt || !member.voucherJasraReceived) {
    const wasClaimedBefore = Boolean(expiresAt || member.voucherJasraDate);
    return {
      isActive: false,
      isExpired: wasClaimedBefore,
      status: wasClaimedBefore ? "READY_TO_CLAIM" : "UNCLAIMED",
      daysRemaining: 0,
      hoursRemaining: 0,
      expiresAt: expiresAt || null,
      expiresAtFormatted: formatDateId(expiresAt),
      claimedAt: claimedAt || null,
      claimedAtFormatted: formatDateId(claimedAt),
      label: wasClaimedBefore ? "Siap Diambil" : "Belum Diambil",
      detail: member.voucherJasraDetail || null,
    };
  }

  const diffMs = expiresAt - nowMs;
  if (diffMs > 0) {
    const diffHours = Math.ceil(diffMs / 3600000);
    const diffDays = Math.ceil(diffMs / 86400000);
    return {
      isActive: true,
      isExpired: false,
      status: "ACTIVE",
      daysRemaining: diffDays,
      hoursRemaining: diffHours,
      expiresAt,
      expiresAtFormatted: formatDateId(expiresAt),
      claimedAt: claimedAt || null,
      claimedAtFormatted: formatDateId(claimedAt),
      label: diffDays > 1 ? `Aktif (${diffDays} hari lagi)` : `Aktif (${diffHours} jam lagi)`,
      detail: member.voucherJasraDetail || { treatment: 10, pingsan: 10 },
    };
  }

  return {
    isActive: false,
    isExpired: true,
    status: "READY_TO_CLAIM",
    daysRemaining: 0,
    hoursRemaining: 0,
    expiresAt,
    expiresAtFormatted: formatDateId(expiresAt),
    claimedAt: claimedAt || null,
    claimedAtFormatted: formatDateId(claimedAt),
    label: "Siap Diambil",
    detail: member.voucherJasraDetail || null,
  };
}

/**
 * Cek apakah kas anggota aktif (berlangganan & belum kadaluarsa)
 */
export function isMemberKasPaidCurrentMonth(member, targetMonthKey = getCurrentMonthKey()) {
  const sub = getMemberKasSubscription(member);
  return sub.isActive;
}

/**
 * Cek apakah voucher anggota aktif (kuota minggu ini masih berlaku)
 */
export function isMemberVoucherReceivedCurrentWeek(member, targetWeekKey = getCurrentWeekKey()) {
  const sub = getMemberVoucherSubscription(member);
  return sub.isActive;
}

/**
 * Update member Kas (4k) and Voucher Jasra status (Admin Only)
 */
export async function updateMemberKasAndVoucherCloud(id, updateData) {
  try {
    const docRef = doc(getMemberDb(), ...MEMBERS_COL_PATH, id);
    const payload = {
      ...updateData,
      lastUpdatedStatusAt: Date.now(),
    };
    await setDoc(docRef, payload, { merge: true });
    return { id, ...payload };
  } catch (err) {
    console.error("Gagal mengupdate status kas/voucher anggota:", err);
    throw err;
  }
}

/**
 * Berlangganan / Perpanjang Kas Anggota (+30 Hari atau Custom Durasi Hasil Konversi Nominal)
 * Jika anggota masih aktif, durasi ditambahkan dari tanggal kadaluarsa saat ini
 * Jika sudah expired / belum aktif, aktif dari hari ini
 */
export async function renewMemberKasSubscriptionCloud(
  member,
  additionalDays = KAS_SUBSCRIPTION_DAYS,
  options = {}
) {
  const now = Date.now();
  const currentSub = getMemberKasSubscription(member);
  const daysNum = Math.max(1, Number(additionalDays) || KAS_SUBSCRIPTION_DAYS);
  let newExpiresAt = now + daysNum * 86400000;

  if (currentSub.isActive && currentSub.expiresAt && currentSub.expiresAt > now) {
    newExpiresAt = currentSub.expiresAt + daysNum * 86400000;
  }

  const amountPaid = typeof options.amount === "number" ? options.amount : 4000;
  const customMonthlyRate = options.customMonthlyRate || null;
  const allocationMode = options.allocationMode || "CONVERT_DURATION";

  const payload = {
    kasPaid: true,
    kasSubscribedAt: currentSub.startedAt || now,
    kasExpiresAt: newExpiresAt,
    kasPaidDate: formatDateId(now),
    kasPeriodLabel: `${formatDateId(now)} - ${formatDateId(newExpiresAt)}`,
    kasAmount: amountPaid,
    kasCustomMonthlyRate: customMonthlyRate,
    kasAllocationMode: allocationMode,
  };

  return await updateMemberKasAndVoucherCloud(member.id, payload);
}

/**
 * Batalkan / Nonaktifkan Langganan Kas Anggota
 */
export async function cancelMemberKasSubscriptionCloud(memberId) {
  const payload = {
    kasPaid: false,
    kasExpiresAt: null,
    kasSubscribedAt: null,
    kasPaidDate: null,
    kasPeriodLabel: null,
    kasAmount: 0,
  };
  return await updateMemberKasAndVoucherCloud(memberId, payload);
}

/**
 * Klaim / Aktifkan Voucher Mingguan Anggota (Aktif 7 Hari)
 */
export async function claimMemberVoucherSubscriptionCloud(member, durationDays = VOUCHER_SUBSCRIPTION_DAYS) {
  const now = Date.now();
  const newExpiresAt = now + durationDays * 86400000;

  const payload = {
    voucherJasraReceived: true,
    voucherClaimedAt: now,
    voucherExpiresAt: newExpiresAt,
    voucherJasraDate: formatDateId(now),
    voucherPeriodLabel: `${formatDateId(now)} - ${formatDateId(newExpiresAt)}`,
    voucherJasraDetail: { treatment: 10, pingsan: 10 },
  };

  return await updateMemberKasAndVoucherCloud(member.id, payload);
}

/**
 * Batalkan / Reset Voucher Mingguan Anggota
 */
export async function cancelMemberVoucherSubscriptionCloud(memberId) {
  const payload = {
    voucherJasraReceived: false,
    voucherExpiresAt: null,
    voucherClaimedAt: null,
    voucherJasraDate: null,
    voucherPeriodLabel: null,
    voucherJasraDetail: null,
  };
  return await updateMemberKasAndVoucherCloud(memberId, payload);
}

/**
 * Batch Reset: Reset status kas semua anggota (Admin Manual Action)
 */
export async function resetAllMembersKasCloud(membersList = []) {
  const activePaid = membersList.filter((m) => m.kasPaid || m.kasExpiresAt);
  if (activePaid.length === 0) return true;

  const tasks = activePaid.map((m) =>
    updateMemberKasAndVoucherCloud(m.id, {
      kasPaid: false,
      kasExpiresAt: null,
      kasSubscribedAt: null,
      kasPeriod: null,
      kasPaidDate: null,
      kasPeriodLabel: null,
      kasAmount: 0,
    })
  );
  await Promise.all(tasks);
  return true;
}

/**
 * Batch Reset: Reset status voucher semua anggota (Admin Manual Action)
 */
export async function resetAllMembersVouchersCloud(membersList = []) {
  const activeVouchers = membersList.filter((m) => m.voucherJasraReceived || m.voucherExpiresAt);
  if (activeVouchers.length === 0) return true;

  const tasks = activeVouchers.map((m) =>
    updateMemberKasAndVoucherCloud(m.id, {
      voucherJasraReceived: false,
      voucherExpiresAt: null,
      voucherClaimedAt: null,
      voucherPeriod: null,
      voucherJasraDate: null,
      voucherPeriodLabel: null,
      voucherJasraDetail: null,
    })
  );
  await Promise.all(tasks);
  return true;
}

/**
 * Export members to formatted Excel (.xlsx) file
 */
export function exportMembersToExcel(members) {
  if (!members || members.length === 0) return false;

  const excelRows = members.map((m, index) => {
    const kasSub = getMemberKasSubscription(m);
    const voucherSub = getMemberVoucherSubscription(m);
    return {
      No: index + 1,
      "ID Anggota": m.id,
      "NAMA IC": m.fullName || "-",
      "NO KTP IC": m.icNumber || "-",
      "NO TLP/WA IC": m.phone || "-",
      "DISCORD (OOC)": m.discordTag || "-",
      "Status Kas ($4.000)": kasSub.isActive
        ? `LUNAS (Sisa ${kasSub.daysRemaining} Hari)`
        : kasSub.isExpired
        ? `LEWAT TEMPO (${kasSub.daysAgo} Hari)`
        : "BELUM BAYAR",
      "Tgl Bayar Kas": kasSub.startedAtFormatted || m.kasPaidDate || "-",
      "Jatuh Tempo Kas": kasSub.expiresAtFormatted || "-",
      "Status Voucher": voucherSub.isActive
        ? `AKTIF (Sisa ${voucherSub.daysRemaining} Hari)`
        : "SIAP DIAMBIL",
      "Tgl Ambil Voucher": voucherSub.claimedAtFormatted || m.voucherJasraDate || "-",
      "Berlaku s/d": voucherSub.expiresAtFormatted || "-",
      "Tanggal Terdaftar": m.regDate || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Anggota PPS");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Data_Anggota_LSM_PPS_${today}.xlsx`);
  return true;
}

// Convert Base64 Data URL to Uint8Array for ZIP generation
function base64ToUint8Array(base64) {
  if (!base64 || !base64.includes(",")) return null;
  try {
    const base64Data = base64.split(",")[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Gagal mengonversi gambar:", e);
    return null;
  }
}

/**
 * Export full backup ZIP containing Excel and all profile & KTP photos
 */
export async function exportMembersToZip(members) {
  if (!members || members.length === 0) return false;

  const zip = new JSZip();
  const folderProfil = zip.folder("Foto_Profil_Anggota");
  const folderIC = zip.folder("Foto_KTP_IC");

  // 1. Generate Excel inside ZIP
  const excelRows = members.map((m, index) => {
    const kasSub = getMemberKasSubscription(m);
    const voucherSub = getMemberVoucherSubscription(m);
    return {
      No: index + 1,
      "ID Anggota": m.id,
      "NAMA IC": m.fullName || "-",
      "NO KTP IC": m.icNumber || "-",
      "NO TLP/WA IC": m.phone || "-",
      "DISCORD (OOC)": m.discordTag || "-",
      "Status Kas ($4.000)": kasSub.isActive
        ? `LUNAS (Sisa ${kasSub.daysRemaining} Hari)`
        : kasSub.isExpired
        ? `LEWAT TEMPO (${kasSub.daysAgo} Hari)`
        : "BELUM BAYAR",
      "Tgl Bayar Kas": kasSub.startedAtFormatted || m.kasPaidDate || "-",
      "Jatuh Tempo Kas": kasSub.expiresAtFormatted || "-",
      "Status Voucher": voucherSub.isActive
        ? `AKTIF (Sisa ${voucherSub.daysRemaining} Hari)`
        : "SIAP DIAMBIL",
      "Tgl Ambil Voucher": voucherSub.claimedAtFormatted || m.voucherJasraDate || "-",
      "Berlaku s/d": voucherSub.expiresAtFormatted || "-",
      "Tanggal Terdaftar": m.regDate || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Anggota PPS");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  zip.file("Data_Anggota_LSM_PPS.xlsx", excelBuffer);

  // 2. Add Photos to ZIP folders
  members.forEach((m, idx) => {
    const cleanName = (m.fullName || `Anggota_${idx + 1}`).replace(/[^a-zA-Z0-9_\-]/g, "_");
    const cleanIC = (m.icNumber || `${idx + 1}`).replace(/[^a-zA-Z0-9_\-]/g, "_");

    if (m.profilePhoto) {
      const pBytes = base64ToUint8Array(m.profilePhoto);
      if (pBytes) folderProfil.file(`${cleanName}_${cleanIC}_Profil.jpg`, pBytes);
    }

    if (m.icPhoto) {
      const icBytes = base64ToUint8Array(m.icPhoto);
      if (icBytes) folderIC.file(`${cleanName}_${cleanIC}_KTP.jpg`, icBytes);
    }
  });

  // 3. Generate and download ZIP file
  const today = new Date().toISOString().split("T")[0];
  const content = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `Backup_Lengkap_Anggota_PPS_${today}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
  return true;
}
