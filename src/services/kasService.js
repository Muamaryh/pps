// ==========================================================================
// KAS & KEUANGAN SERVICE - LSM PAGUYUBAN PIZZA SANDY SHORES
// Pencatatan Buku Kas (Pemasukan, Pengeluaran, Konversi Durasi & Saldo)
// Mata Uang: Dollar ($ / USD) FiveM GTA V
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
import { sendDiscordNotification } from "./discordWebhook";

const memberFirebaseConfig = {
  apiKey: "AIzaSyDB7TFVRDRvgMI4q_XtwnxSqOhCKZ2xAe8",
  authDomain: "pendaftaran-paps.firebaseapp.com",
  projectId: "pendaftaran-paps",
  storageBucket: "pendaftaran-paps.firebasestorage.app",
  messagingSenderId: "263750919370",
  appId: "1:263750919370:web:ed32312897807281498033",
  measurementId: "G-RBTWG5K8W1",
};

let _kasApp = null;
let _kasDb = null;

function getKasApp() {
  if (!_kasApp) {
    _kasApp =
      getApps().find((a) => a.name === "paps-members") ||
      initializeApp(memberFirebaseConfig, "paps-members");
  }
  return _kasApp;
}

function getKasDb() {
  if (!_kasDb) {
    _kasDb = getFirestore(getKasApp());
  }
  return _kasDb;
}

const APP_ID = "portal-anggota-app";
const KAS_LEDGER_COL_PATH = ["artifacts", APP_ID, "public", "data", "kas_ledger"];
const KAS_LEDGER_STORAGE_KEY = "pps_kas_ledger_cache";

export const STANDARD_KAS_MONTHLY = 4000;

// Preset pilihan cepat 1 - 12 Bulan
export const MONTHLY_PRESETS = [
  { months: 1, amount: 4000, label: "1 Bulan ($4.000)" },
  { months: 2, amount: 8000, label: "2 Bulan ($8.000)" },
  { months: 3, amount: 12000, label: "3 Bulan ($12.000)" },
  { months: 4, amount: 16000, label: "4 Bulan ($16.000)" },
  { months: 5, amount: 20000, label: "5 Bulan ($20.000)" },
  { months: 6, amount: 24000, label: "6 Bulan ($24.000)" },
  { months: 7, amount: 28000, label: "7 Bulan ($28.000)" },
  { months: 8, amount: 32000, label: "8 Bulan ($32.000)" },
  { months: 9, amount: 36000, label: "9 Bulan ($36.000)" },
  { months: 10, amount: 40000, label: "10 Bulan ($40.000)" },
  { months: 11, amount: 44000, label: "11 Bulan ($44.000)" },
  { months: 12, amount: 48000, label: "12 Bulan ($48.000)" },
];

export const EXPENSE_CATEGORIES = [
  "Bansos & Bantuan Warga",
  "Hadiah Event & Turnamen",
  "Operasional & Logistik",
  "Perawatan Stand Pizza",
  "Konsumsi & Pertemuan",
  "Lainnya",
];

export const INCOME_CATEGORIES = [
  "Donasi Sukarela & Warga",
  "Sponsorship & Kemitraan",
  "Bagi Hasil Stand UMKM & Pizza",
  "Hadiah Event & Hibah",
  "Pengembalian / Talangan",
  "Saldo Awal & Kas Fisik",
  "Lainnya",
];

// Daftar bendahara / pemegang kas fisik LSM PPS
export const KAS_WALLETS = [
  { id: "Oita", name: "Kas Oita", label: "Kas di Oita (Bendahara)", short: "Oita" },
  { id: "Darren", name: "Kas Darren", label: "Kas di Darren (Bendahara)", short: "Darren" },
];

// Data saldo awal historis sebelum mekanisme kas web dibuat:
// Total Kas: $700.000 (Darren: $206.000 + Oita: $494.000)
// Pengeluaran Peresmian: $75.000 (15 orang x $5.000)
export const INITIAL_KAS_TRANSACTIONS = [
  {
    id: "init-in-oita",
    type: "INCOME",
    amount: 494000,
    wallet: "Oita",
    title: "Saldo Kas LSM (Pegang Oita)",
    category: "Saldo Awal & Kas Fisik",
    responsible: "Oita",
    notes: "Uang kas fisik LSM PPS yang dipegang Oita",
    recordedBy: "Pengurus LSM",
    date: "25 Okt 2026",
    timestamp: 1792904400000,
  },
  {
    id: "init-in-darren",
    type: "INCOME",
    amount: 206000,
    wallet: "Darren",
    title: "Saldo Kas LSM (Pegang Darren)",
    category: "Saldo Awal & Kas Fisik",
    responsible: "Darren",
    notes: "Uang kas fisik LSM PPS yang dipegang Darren",
    recordedBy: "Pengurus LSM",
    date: "25 Okt 2026",
    timestamp: 1792904400001,
  },
  {
    id: "init-in-peresmian",
    type: "INCOME",
    amount: 75000,
    wallet: "Oita",
    title: "Alokasi Kas Operasional Peresmian",
    category: "Iuran Kas Anggota",
    responsible: "Pengurus LSM",
    notes: "Alokasi dana awal untuk kegiatan peresmian LSM",
    recordedBy: "Pengurus LSM",
    date: "20 Okt 2026",
    timestamp: 1792472400000,
  },
  {
    id: "init-out-peresmian",
    type: "EXPENSE",
    amount: 75000,
    wallet: "Oita",
    title: "Pembagian Uang ke Anggota yg menghadiri Peresmian (5000 x 15 orang)",
    category: "Bansos & Bantuan Warga",
    responsible: "Pengurus LSM",
    notes: "Pembagian uang $5.000 x 15 anggota yang hadir saat peresmian",
    recordedBy: "Pengurus LSM",
    date: "20 Okt 2026",
    timestamp: 1792472400001,
  },
];

// Helper: Format tanggal Indonesia
export function formatKasDate(timestampOrDate) {
  if (!timestampOrDate) return "-";
  const d = new Date(timestampOrDate);
  if (isNaN(d.getTime())) return String(timestampOrDate);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const INDO_MONTHS_MAP = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, aug: 7, ags: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9, oct: 9,
  november: 10, nov: 10,
  desember: 11, des: 11, dec: 11,
};

// Helper: Konversi input tanggal (baik ISO '2026-11-01' maupun string BrutalistDatePicker 'Minggu, 1 November 2026') ke Unix timestamp
export function parseDateInputToTimestamp(val) {
  if (!val) return Date.now();
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();

  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const match = String(val).match(/(\d{1,2})\s+([A-Za-z'’]+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const mStr = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const mIdx = INDO_MONTHS_MAP[mStr];
    if (mIdx !== undefined) {
      const now = new Date();
      if (
        now.getFullYear() === year &&
        now.getMonth() === mIdx &&
        now.getDate() === day
      ) {
        return now.getTime();
      }
      return new Date(year, mIdx, day, 12, 0, 0).getTime();
    }
  }

  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? Date.now() : fallback.getTime();
}

// Helper: Format tanggal hari ini sesuai format BrutalistDatePicker
export function getTodayIndonesianDateString() {
  const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
  const INDO_MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const d = new Date();
  return `${INDO_DAYS[d.getDay()]}, ${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Helper: Format Dollar ringkas ($)
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num < 0) return `-$${Math.abs(num).toLocaleString("id-ID")}`;
  return `$${num.toLocaleString("id-ID")}`;
}

export const formatRupiah = formatCurrency; // alias backward-compatibility

/**
 * Menghitung konversi durasi hari & bulan dari nominal dollar yang dibayarkan
 * Berdasarkan tarif dasar $4.000 / 30 Hari
 */
export function calculateKasDuration(amount, rate = STANDARD_KAS_MONTHLY) {
  const numericAmount = Number(amount) || 0;
  if (numericAmount <= 0) {
    return { days: 0, months: 0, extraDays: 0, label: "0 Hari" };
  }
  // 1 bulan = 30 hari
  const days = Math.max(1, Math.round((numericAmount / rate) * 30));
  const months = Math.floor(days / 30);
  const extraDays = days % 30;

  let label = "";
  if (months > 0 && extraDays > 0) {
    label = `${months} Bulan ${extraDays} Hari (+${days} Hari)`;
  } else if (months > 0) {
    label = `${months} Bulan (+${days} Hari)`;
  } else {
    label = `+${days} Hari`;
  }

  return { days, months, extraDays, label };
}

/**
 * Memuat seluruh transaksi kas dari Cloud Firestore
 * Jika database masih kosong, otomatis melakukan seeding saldo awal historis ($700.000)
 */
export async function loadKasLedgerCloud() {
  try {
    const colRef = collection(getKasDb(), ...KAS_LEDGER_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });

    // Jika belum ada data di cloud, inisialisasi saldo awal historis
    if (list.length === 0) {
      for (const item of INITIAL_KAS_TRANSACTIONS) {
        try {
          const docRef = doc(getKasDb(), ...KAS_LEDGER_COL_PATH, item.id);
          await setDoc(docRef, item);
          list.push(item);
        } catch {}
      }
    }

    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(KAS_LEDGER_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }
    return list;
  } catch (err) {
    console.warn("Gagal memuat kas ledger dari Firestore, menggunakan cache lokal:", err);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const cached = localStorage.getItem(KAS_LEDGER_STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return INITIAL_KAS_TRANSACTIONS;
  }
}

/**
 * Real-time listener mutasi kas ledger
 */
export function subscribeKasLedger(callback) {
  try {
    const colRef = collection(getKasDb(), ...KAS_LEDGER_COL_PATH);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        if (list.length === 0) {
          callback(INITIAL_KAS_TRANSACTIONS);
          return;
        }
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(list);
      },
      (err) => {
        console.warn("Snapshot notice pada kas ledger:", err);
      }
    );
  } catch (err) {
    console.error("Gagal inisialisasi subscription kas ledger:", err);
    return () => {};
  }
}

async function dispatchKasWebhook(eventType, payload) {
  try {
    const allTx = await loadKasLedgerCloud();
    const summary = getKasSummary(allTx);
    const isDarren = payload.wallet === "Darren";
    await sendDiscordNotification(eventType, {
      ...payload,
      netBalance: summary.netBalance,
      oitaBalance: summary.oitaBalance,
      darrenBalance: summary.darrenBalance,
      walletBalance: isDarren ? summary.darrenBalance : summary.oitaBalance,
    });
  } catch (err) {
    console.warn("[Kas Webhook] Notice:", err);
  }
}

/**
 * Mencatat transaksi Pemasukan Kas
 */
export async function recordKasIncomeCloud({
  amount,
  title,
  category = "Donasi Sukarela & Warga",
  wallet = "Oita",
  responsible = "",
  memberId = "",
  memberName = "",
  memberCid = "",
  allocationMode = "MANUAL_INCOME",
  durationDays = 0,
  customDate = null,
  notes = "",
  recordedBy = "Admin",
}) {
  const numericAmount = Number(amount) || 0;
  if (numericAmount <= 0) throw new Error("Nominal pemasukan harus lebih dari 0");

  const normalizedWallet = wallet === "Darren" ? "Darren" : "Oita";
  const now = Date.now();
  const txTimestamp = customDate ? parseDateInputToTimestamp(customDate) : now;
  const newId = `in-${now}-${Math.random().toString(36).substring(2, 6)}`;
  const payload = {
    type: "INCOME",
    amount: numericAmount,
    title: (title || `Kas ${memberName || "Anggota"}`).trim(),
    category,
    wallet: normalizedWallet,
    responsible: responsible || (normalizedWallet === "Darren" ? "Darren" : "Oita"),
    memberId: memberId || null,
    memberName: memberName || null,
    memberCid: memberCid || null,
    allocationMode,
    durationDays: Number(durationDays) || 0,
    notes: notes || "",
    recordedBy: recordedBy || "Admin",
    date: formatKasDate(txTimestamp),
    timestamp: txTimestamp,
  };

  const docRef = doc(getKasDb(), ...KAS_LEDGER_COL_PATH, newId);
  await setDoc(docRef, payload);
  await dispatchKasWebhook("KAS_INCOME", payload);
  return { id: newId, ...payload };
}

/**
 * Mencatat transaksi Pengeluaran Kas
 */
export async function recordKasExpenseCloud({
  amount,
  title,
  category = "Operasional & Logistik",
  wallet = "Oita",
  responsible = "Pengurus LSM",
  notes = "",
  customDate = null,
  recordedBy = "Admin",
}) {
  const numericAmount = Number(amount) || 0;
  if (numericAmount <= 0) throw new Error("Nominal pengeluaran harus lebih dari 0");
  if (!title || !title.trim()) throw new Error("Keperluan pengeluaran wajib diisi");

  const normalizedWallet = wallet === "Darren" ? "Darren" : "Oita";
  const now = Date.now();
  const txTimestamp = customDate ? parseDateInputToTimestamp(customDate) : now;
  const newId = `out-${now}-${Math.random().toString(36).substring(2, 6)}`;

  const payload = {
    type: "EXPENSE",
    amount: numericAmount,
    title: title.trim(),
    category,
    wallet: normalizedWallet,
    responsible: responsible || (normalizedWallet === "Darren" ? "Darren" : "Oita"),
    notes: notes || "",
    recordedBy: recordedBy || "Admin",
    date: formatKasDate(txTimestamp),
    timestamp: txTimestamp,
  };

  const docRef = doc(getKasDb(), ...KAS_LEDGER_COL_PATH, newId);
  await setDoc(docRef, payload);
  await dispatchKasWebhook("KAS_EXPENSE", payload);
  return { id: newId, ...payload };
}

/**
 * Mencatat Pindah Kas / Transfer Antar Bendahara (Oita <-> Darren)
 * TIDAK dihitung sebagai Pemasukan maupun Pengeluaran total LSM.
 */
export async function recordKasTransferCloud({
  amount,
  fromWallet = "Oita",
  toWallet = "Darren",
  title = "",
  responsible = "",
  notes = "",
  customDate = null,
  recordedBy = "Admin",
}) {
  const numericAmount = Number(amount) || 0;
  if (numericAmount <= 0) throw new Error("Nominal pindah kas harus lebih dari 0");

  const cleanFrom = fromWallet === "Darren" ? "Darren" : "Oita";
  const cleanTo = toWallet === "Darren" ? "Darren" : "Oita";
  if (cleanFrom === cleanTo) {
    throw new Error("Pos kas asal dan tujuan tidak boleh sama");
  }

  const now = Date.now();
  const txTimestamp = customDate ? parseDateInputToTimestamp(customDate) : now;
  const newId = `trf-${now}-${Math.random().toString(36).substring(2, 6)}`;

  const payload = {
    type: "TRANSFER",
    amount: numericAmount,
    fromWallet: cleanFrom,
    toWallet: cleanTo,
    wallet: cleanFrom,
    category: "Pindah Kas Antar Bendahara",
    title: (title || `Pindah Kas: Kas ${cleanFrom} -> Kas ${cleanTo}`).trim(),
    responsible: responsible || `${cleanFrom} -> ${cleanTo}`,
    notes: notes || "",
    recordedBy: recordedBy || "Admin",
    date: formatKasDate(txTimestamp),
    timestamp: txTimestamp,
  };

  const docRef = doc(getKasDb(), ...KAS_LEDGER_COL_PATH, newId);
  await setDoc(docRef, payload);
  await dispatchKasWebhook("KAS_TRANSFER", payload);
  return { id: newId, ...payload };
}

/**
 * Menghapus transaksi kas (Admin action)
 */
export async function deleteKasTransactionCloud(transactionId) {
  if (!transactionId) return;
  const docRef = doc(getKasDb(), ...KAS_LEDGER_COL_PATH, transactionId);
  await deleteDoc(docRef);
  return transactionId;
}

/**
 * Menghitung ringkasan kas (Total Pemasukan, Total Pengeluaran, Saldo Bersih, Saldo Oita & Darren)
 * Transaksi TRANSFER hanya memindahkan saldo antar bendahara tanpa mengubah total pemasukan/pengeluaran.
 */
export function getKasSummary(transactions = [], fallbackActiveKasRupiah = 0) {
  const txList = transactions.length > 0 ? transactions : INITIAL_KAS_TRANSACTIONS;
  let totalIncome = 0;
  let totalExpense = 0;
  let oitaBalance = 0;
  let darrenBalance = 0;
  let oitaIncome = 0;
  let oitaExpense = 0;
  let darrenIncome = 0;
  let darrenExpense = 0;

  for (const tx of txList) {
    const amt = Number(tx.amount) || 0;
    const typeUpper = (tx.type || "").toUpperCase();
    const isIncome = typeUpper === "INCOME";
    const isExpense = typeUpper === "EXPENSE";
    const isTransfer = typeUpper === "TRANSFER";

    if (isTransfer) {
      const fromIsDarren = (tx.fromWallet || tx.wallet) === "Darren";
      if (fromIsDarren) {
        darrenBalance -= amt;
        oitaBalance += amt;
      } else {
        oitaBalance -= amt;
        darrenBalance += amt;
      }
      continue;
    }

    // Pos kas bendahara: cek wallet property atau fallback ke responsible/title
    const isDarren = isDarrenKasTx(tx);

    if (isIncome) {
      totalIncome += amt;
      if (isDarren) {
        darrenIncome += amt;
        darrenBalance += amt;
      } else {
        oitaIncome += amt;
        oitaBalance += amt;
      }
    } else if (isExpense) {
      totalExpense += amt;
      if (isDarren) {
        darrenExpense += amt;
        darrenBalance -= amt;
      } else {
        oitaExpense += amt;
        oitaBalance -= amt;
      }
    }
  }

  const netBalance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netBalance,
    oitaBalance,
    darrenBalance,
    oitaIncome,
    oitaExpense,
    darrenIncome,
    darrenExpense,
    totalTransactions: txList.length,
    incomeCount: txList.filter((t) => (t.type || "").toUpperCase() === "INCOME").length,
    expenseCount: txList.filter((t) => (t.type || "").toUpperCase() === "EXPENSE").length,
    transferCount: txList.filter((t) => (t.type || "").toUpperCase() === "TRANSFER").length,
  };
}

/**
 * Deteksi apakah transaksi masuk ke pos Kas Darren (default: Kas Oita)
 */
export function isDarrenKasTx(tx) {
  const walletText = (tx?.wallet || tx?.responsible || tx?.title || "").toLowerCase();
  return tx?.wallet === "Darren" || walletText.includes("darren");
}

/**
 * Hitung saldo berjalan (running balance) secara kronologis untuk tiap transaksi
 */
export function computeKasRunningBalances(transactions = []) {
  const txList = transactions.length > 0 ? transactions : INITIAL_KAS_TRANSACTIONS;
  // Reverse dahulu sebelum sort ascending agar urutan tie-breaker konsisten dengan tampilan terbaru-di-atas
  const chronological = [...txList]
    .reverse()
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  let net = 0;
  let oita = 0;
  let darren = 0;
  const balanceMap = {};

  for (const tx of chronological) {
    const amt = Number(tx.amount) || 0;
    const typeUpper = (tx.type || "").toUpperCase();
    const isTransfer = typeUpper === "TRANSFER";

    const netBefore = net;
    const oitaBefore = oita;
    const darrenBefore = darren;

    if (isTransfer) {
      const fromIsDarren = (tx.fromWallet || tx.wallet) === "Darren";
      if (fromIsDarren) {
        darren -= amt;
        oita += amt;
      } else {
        oita -= amt;
        darren += amt;
      }
      balanceMap[tx.id] = {
        delta: 0,
        oitaDelta: fromIsDarren ? amt : -amt,
        darrenDelta: fromIsDarren ? -amt : amt,
        netBefore,
        netAfter: net,
        oitaBefore,
        oitaAfter: oita,
        darrenBefore,
        darrenAfter: darren,
        walletBefore: fromIsDarren ? darrenBefore : oitaBefore,
        walletAfter: fromIsDarren ? darren : oita,
      };
      continue;
    }

    const delta = typeUpper === "INCOME" ? amt : typeUpper === "EXPENSE" ? -amt : 0;
    const isDarren = isDarrenKasTx(tx);

    net += delta;
    const walletBefore = isDarren ? darren : oita;
    if (isDarren) {
      darren += delta;
    } else {
      oita += delta;
    }

    balanceMap[tx.id] = {
      delta,
      oitaDelta: isDarren ? 0 : delta,
      darrenDelta: isDarren ? delta : 0,
      netBefore,
      netAfter: net,
      oitaBefore,
      oitaAfter: oita,
      darrenBefore,
      darrenAfter: darren,
      walletBefore,
      walletAfter: isDarren ? darren : oita,
    };
  }

  return balanceMap;
}

/**
 * Ekspor Buku Kas ke File Excel (.xlsx)
 */
export async function exportKasLedgerToExcel(transactions = [], summary = null) {
  try {
    const XLSX = await import("xlsx");
    const txList = transactions.length > 0 ? transactions : INITIAL_KAS_TRANSACTIONS;
    const sum = summary || getKasSummary(txList);

    const rows = txList.map((tx, idx) => {
      const tUpper = (tx.type || "").toUpperCase();
      const isTransfer = tUpper === "TRANSFER";
      const fromW = tx.fromWallet || tx.wallet || "Oita";
      const toW = tx.toWallet || (fromW === "Darren" ? "Oita" : "Darren");
      return {
        No: idx + 1,
        Tanggal: tx.date || formatKasDate(tx.timestamp),
        Tipe: isTransfer ? "PINDAH KAS" : tUpper === "INCOME" ? "PEMASUKAN" : "PENGELUARAN",
        "Pos Kas / Bendahara": isTransfer
          ? `Kas ${fromW} -> Kas ${toW}`
          : tx.wallet
          ? `Kas ${tx.wallet}`
          : tx.responsible || "Kas LSM",
        Kategori: tx.category || "-",
        "Judul / Keperluan": tx.title || "-",
        "Nominal ($)": Number(tx.amount) || 0,
        "Nama Anggota / PJ": tx.memberName || tx.responsible || "-",
        "Citizen ID": tx.memberCid || "-",
        Keterangan: tx.notes || "-",
        "Dicatat Oleh": tx.recordedBy || "Admin",
      };
    });

    // Baris Ringkasan di paling bawah
    rows.push({
      No: "",
      Tanggal: "RINGKASAN",
      Tipe: "",
      "Pos Kas / Bendahara": `Kas Oita: ${formatCurrency(sum.oitaBalance)} | Kas Darren: ${formatCurrency(sum.darrenBalance)}`,
      Kategori: "",
      "Judul / Keperluan": `Total Pemasukan: ${formatCurrency(sum.totalIncome)} | Total Pengeluaran: ${formatCurrency(sum.totalExpense)}`,
      "Nominal ($)": sum.netBalance,
      "Nama Anggota / PJ": `SALDO BERSIH: ${formatCurrency(sum.netBalance)}`,
      "Citizen ID": "",
      Keterangan: `Total Transaksi: ${txList.length}`,
      "Dicatat Oleh": "",
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buku_Kas_PPS");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Laporan_Kas_LSM_PPS_${dateStr}.xlsx`);
    return true;
  } catch (err) {
    console.error("Gagal ekspor kas ke Excel:", err);
    return false;
  }
}

/**
 * Menghasilkan teks laporan kas terformat untuk Discord / WhatsApp
 */
export function generateKasReportText({
  transactions = [],
  summary = null,
  mode = "FULL",
  walletFilter = "ALL",
  periodFilter = "ALL", // "ALL" | "MONTH"
} = {}) {
  const allTx = transactions.length > 0 ? transactions : INITIAL_KAS_TRANSACTIONS;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const INDO_MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const currentMonthLabel = `${INDO_MONTHS[currentMonth]} ${currentYear}`;

  const filteredTx = allTx.filter((tx) => {
    if (periodFilter === "MONTH") {
      const ts = tx.timestamp || parseDateInputToTimestamp(tx.date);
      const d = new Date(ts);
      if (isNaN(d.getTime()) || d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) {
        return false;
      }
    }
    if (walletFilter === "ALL") return true;
    if ((tx.type || "").toUpperCase() === "TRANSFER") return true;
    const walletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
    const isDarren = tx.wallet === "Darren" || walletText.includes("darren");
    return walletFilter === "DARREN" ? isDarren : !isDarren;
  });

  const sum = summary || getKasSummary(allTx);
  const periodSum = periodFilter === "MONTH" ? getKasSummary(filteredTx.length > 0 ? filteredTx : []) : null;
  const todayStr = getTodayIndonesianDateString();

  let text =
    periodFilter === "MONTH"
      ? `[LAPORAN BULANAN BUKU KAS LSM PAGUYUBAN PIZZA SANDY SHORES - ${currentMonthLabel.toUpperCase()}]\n`
      : `[LAPORAN BUKU KAS LSM PAGUYUBAN PIZZA SANDY SHORES]\n`;
  text += `Update: ${todayStr}\n\n`;

  text += `RINGKASAN SALDO:\n`;
  if (walletFilter === "ALL" || walletFilter === "DARREN") {
    text += `• Kas di Darren : ${formatCurrency(sum.darrenBalance)}\n`;
  }
  if (walletFilter === "ALL" || walletFilter === "OITA") {
    text += `• Kas di Oita   : ${formatCurrency(sum.oitaBalance)}\n`;
  }
  text += `----------------------------------------\n`;
  text += `TOTAL SALDO BERSIH LSM: ${formatCurrency(sum.netBalance)}\n`;
  text += `----------------------------------------\n`;

  if (periodFilter === "MONTH") {
    const mInc = filteredTx.filter((t) => (t.type || "").toUpperCase() === "INCOME");
    const mExp = filteredTx.filter((t) => (t.type || "").toUpperCase() === "EXPENSE");
    const mTrf = filteredTx.filter((t) => (t.type || "").toUpperCase() === "TRANSFER");
    const mIncSum = mInc.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const mExpSum = mExp.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const mNet = mIncSum - mExpSum;
    text += `ARUS KAS BULAN ${currentMonthLabel.toUpperCase()}:\n`;
    text += `• Pemasukan Bulan Ini  : +${formatCurrency(mIncSum)} (${mInc.length} transaksi)\n`;
    text += `• Pengeluaran Bulan Ini: -${formatCurrency(mExpSum)} (${mExp.length} transaksi)\n`;
    text += `• Selisih Arus Kas     : ${mNet >= 0 ? "+" : ""}${formatCurrency(mNet)}\n`;
    if (mTrf.length > 0) {
      text += `• Pindah Kas Internal  : ${mTrf.length} kali (saldo total tetap)\n`;
    }
  } else {
    text += `Total Pemasukan  : +${formatCurrency(sum.totalIncome)} (${sum.incomeCount} transaksi)\n`;
    text += `Total Pengeluaran: -${formatCurrency(sum.totalExpense)} (${sum.expenseCount} transaksi)\n`;
    if (sum.transferCount > 0) {
      text += `Pindah Kas Internal: ${sum.transferCount} kali (tidak mempengaruhi saldo total)\n`;
    }
  }
  void periodSum;

  if (mode === "FULL" && filteredTx.length > 0) {
    text += `\nDAFTAR MUTASI ${periodFilter === "MONTH" ? currentMonthLabel.toUpperCase() : "TRANSAKSI"} (${filteredTx.length} Transaksi):\n`;
    filteredTx.forEach((tx, idx) => {
      const tUpper = (tx.type || "").toUpperCase();
      const isIncome = tUpper === "INCOME";
      const isTransfer = tUpper === "TRANSFER";
      const sign = isTransfer ? "[↔]" : isIncome ? "[+]" : "[-]";
      const dateStr = tx.date || formatKasDate(tx.timestamp);
      const fromW = tx.fromWallet || tx.wallet || "Oita";
      const toW = tx.toWallet || (fromW === "Darren" ? "Oita" : "Darren");
      const walletLabel = isTransfer
        ? `Kas ${fromW} -> Kas ${toW}`
        : tx.wallet
        ? `Kas ${tx.wallet}`
        : tx.responsible || "Kas LSM";
      const title = tx.title || tx.category || "Transaksi Kas";
      const amtStr = formatCurrency(tx.amount);
      const memberInfo =
        tx.memberName && !title.toLowerCase().includes(tx.memberName.toLowerCase())
          ? ` (${tx.memberName})`
          : "";

      text += `${idx + 1}. ${sign} ${amtStr} | ${dateStr} | ${walletLabel}\n   ${title}${memberInfo}\n`;
    });
    text += `----------------------------------------\n`;
  }

  text += `Dicatat melalui Portal Web LSM PPS`;
  return text;
}
