// ==========================================================================
// EVENT MANAGEMENT & REGISTRATION SERVICE - LSM PAGUYUBAN PIZZA SANDY SHORES
// Supports dynamic event creation, editing, closing, deletion & registrations
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

let _eventApp = null;
let _eventDb = null;

function getEventApp() {
  if (!_eventApp) {
    _eventApp =
      getApps().find((a) => a.name === "paps-members") ||
      initializeApp(memberFirebaseConfig, "paps-members");
  }
  return _eventApp;
}

function getEventDb() {
  if (!_eventDb) {
    _eventDb = getFirestore(getEventApp());
  }
  return _eventDb;
}

const APP_ID = "portal-anggota-app";
const EVENTS_LIST_COL_PATH = ["artifacts", APP_ID, "public", "data", "events_list"];
const EVENTS_LIST_STORAGE_KEY = "pps_events_list_cache";
const EVENTS_REG_COL_PATH = ["artifacts", APP_ID, "public", "data", "event_registrations"];
const EVENTS_REG_STORAGE_KEY = "pps_event_registrations_cache";

/**
 * Default Seed Event: Pizzarena : Civilian Street Fight
 */
export const DEFAULT_EVENT = {
  id: "evt-pizzarena-civilian",
  title: "Pizzarena : Civilian Street Fight",
  organizer: "LSM Paguyuban Pizza Sandy Shores",
  tagline: "Turnamen Tarung Bebas Resmi Khusus Warga Sipil Sandy Shores",
  status: "OPEN", // "OPEN" | "CLOSED" | "DRAFT"
  entryFee: "$10.000 USD",
  ticketPrefix: "PZR-CIV",
  requirements: [
    "Khusus warga sipil / Civilian (Freelancer)",
    "Wajib No Gang (Unaffiliated / tidak terafiliasi kelompok kriminal)",
    "Biaya pendaftaran $10.000 USD diserahkan saat verifikasi di lokasi",
    "Wajib memiliki identitas KTP IC yang masih berlaku",
  ],
  requireOcr: true,
  requireCivilianOnly: true,
  requireNoGangOnly: true,
  requireHpIc: true,
  requireDiscord: true,
  showMessengerNotification: true,
  messengerHeading: "Ada Event Baru!",
  messengerMessage: "Halo warga! LSM Paguyuban Pizza Sandy Shores mempersembahkan event baru nih: Pizzarena : Civilian Street Fight.",
  sampleImage: "/contoh-ss-ktp2.jpg",
  description: "Turnamen resmi tarung bebas satu lawan satu khusus warga sipil (Civilian) Sandy Shores. Wajib No Gang.",
  createdAt: 1729420000000,
};

// ==========================================================================
// 1. EVENT CONFIGURATION MANAGEMENT (ADMIN CRUD)
// ==========================================================================

/**
 * Load all events from cloud with local storage fallback
 */
export async function loadEventsCloud() {
  try {
    const colRef = collection(getEventDb(), ...EVENTS_LIST_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    if (list.length === 0) {
      // Seed default event
      const defaultEvt = { ...DEFAULT_EVENT };
      const docRef = doc(getEventDb(), ...EVENTS_LIST_COL_PATH, defaultEvt.id);
      await setDoc(docRef, defaultEvt);
      list.push(defaultEvt);
    }
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    localStorage.setItem(EVENTS_LIST_STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (err) {
    console.warn("Notice loading events list from cloud, falling back:", err);
    try {
      const cached = localStorage.getItem(EVENTS_LIST_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [{ ...DEFAULT_EVENT }];
  }
}

/**
 * Subscribe to real-time events configuration
 */
export function subscribeEventsCloud(onUpdate, onError) {
  try {
    const colRef = collection(getEventDb(), ...EVENTS_LIST_COL_PATH);
    return onSnapshot(
      colRef,
      (snap) => {
        let list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        if (list.length === 0) {
          list = [{ ...DEFAULT_EVENT }];
        }
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem(EVENTS_LIST_STORAGE_KEY, JSON.stringify(list));
        onUpdate(list);
      },
      (err) => {
        console.warn("Firestore events sync notice:", err);
        try {
          const cached = localStorage.getItem(EVENTS_LIST_STORAGE_KEY);
          if (cached) onUpdate(JSON.parse(cached));
          else onUpdate([{ ...DEFAULT_EVENT }]);
        } catch {
          onUpdate([{ ...DEFAULT_EVENT }]);
        }
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe events:", err);
    try {
      const cached = localStorage.getItem(EVENTS_LIST_STORAGE_KEY);
      if (cached) onUpdate(JSON.parse(cached));
      else onUpdate([{ ...DEFAULT_EVENT }]);
    } catch {
      onUpdate([{ ...DEFAULT_EVENT }]);
    }
    return () => {};
  }
}

/**
 * Save or update an event (Admin)
 */
export async function saveEventCloud(eventData) {
  const eventId = eventData.id || `evt_${Date.now()}`;
  const now = Date.now();

  const payload = {
    ...eventData,
    id: eventId,
    title: (eventData.title || "").trim() || "Event Sandy Shores",
    organizer: (eventData.organizer || "LSM Paguyuban Pizza Sandy Shores").trim(),
    tagline: (eventData.tagline || "").trim(),
    status: eventData.status || "OPEN", // "OPEN", "CLOSED", "DRAFT"
    entryFee: (eventData.entryFee || "$10.000 USD").trim(),
    ticketPrefix: (eventData.ticketPrefix || "PZR-CIV").trim().toUpperCase(),
    requirements: Array.isArray(eventData.requirements)
      ? eventData.requirements.map((r) => String(r).trim()).filter(Boolean)
      : typeof eventData.requirements === "string"
      ? eventData.requirements.split(/\r?\n/).map((r) => r.trim()).filter(Boolean)
      : [
          "Khusus warga sipil / Civilian (Freelancer)",
          "Wajib No Gang (Unaffiliated / tidak terafiliasi kelompok kriminal)",
          `Biaya pendaftaran ${eventData.entryFee || "$10.000 USD"} diserahkan saat verifikasi di lokasi`,
          "Wajib memiliki identitas KTP IC yang masih berlaku",
        ],
    requireOcr: eventData.requireOcr !== false,
    requireCivilianOnly: eventData.requireCivilianOnly !== false,
    requireNoGangOnly: eventData.requireNoGangOnly !== false,
    requireHpIc: eventData.requireHpIc !== false,
    requireDiscord: eventData.requireDiscord !== false,
    showMessengerNotification: eventData.showMessengerNotification !== false,
    messengerBadgeText: eventData.status === "OPEN" ? "PENDAFTARAN DIBUKA" : "PENDAFTARAN DITUTUP",
    messengerHeading: (eventData.messengerHeading || "Ada Event Baru!").trim(),
    messengerMessage: (
      eventData.messengerMessage ||
      `Halo warga! LSM Paguyuban Pizza Sandy Shores mempersembahkan event baru: ${eventData.title}`
    ).trim(),
    description: (eventData.description || "").trim(),
    updatedAt: now,
    createdAt: eventData.createdAt || now,
  };

  try {
    const docRef = doc(getEventDb(), ...EVENTS_LIST_COL_PATH, eventId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn("Gagal simpan event ke cloud, menyimpan lokal:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_LIST_STORAGE_KEY) || "[]");
    const updated = current.some((e) => e.id === eventId)
      ? current.map((e) => (e.id === eventId ? { ...e, ...payload } : e))
      : [{ ...payload }, ...current];
    localStorage.setItem(EVENTS_LIST_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return payload;
}

/**
 * Delete an event (Admin)
 */
export async function deleteEventCloud(eventId) {
  try {
    const docRef = doc(getEventDb(), ...EVENTS_LIST_COL_PATH, eventId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Gagal hapus event di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_LIST_STORAGE_KEY) || "[]");
    const updated = current.filter((e) => e.id !== eventId);
    localStorage.setItem(EVENTS_LIST_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return true;
}

/**
 * Quick toggle status BUKA / TUTUP Pendaftaran (Admin)
 */
export async function toggleEventStatusCloud(eventId, currentStatus) {
  const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
  const updatedAt = Date.now();

  try {
    const docRef = doc(getEventDb(), ...EVENTS_LIST_COL_PATH, eventId);
    await setDoc(docRef, { status: newStatus, updatedAt }, { merge: true });
  } catch (err) {
    console.warn("Gagal toggle status event di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_LIST_STORAGE_KEY) || "[]");
    const updated = current.map((e) =>
      e.id === eventId ? { ...e, status: newStatus, updatedAt } : e
    );
    localStorage.setItem(EVENTS_LIST_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return newStatus;
}

// ==========================================================================
// 2. REGISTRATIONS MANAGEMENT
// ==========================================================================

/**
 * Fetch all event registrations
 */
export async function loadEventRegistrationsCloud() {
  try {
    const colRef = collection(getEventDb(), ...EVENTS_REG_COL_PATH);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    localStorage.setItem(EVENTS_REG_STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (err) {
    console.warn("Notice loading event registrations from cloud, falling back:", err);
    try {
      const cached = localStorage.getItem(EVENTS_REG_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  }
}

/**
 * Subscribe to real-time event registrations
 */
export function subscribeEventRegistrationsCloud(onUpdate, onError) {
  try {
    const colRef = collection(getEventDb(), ...EVENTS_REG_COL_PATH);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem(EVENTS_REG_STORAGE_KEY, JSON.stringify(list));
        onUpdate(list);
      },
      (err) => {
        console.warn("Firestore event registration sync notice:", err);
        try {
          const cached = localStorage.getItem(EVENTS_REG_STORAGE_KEY);
          if (cached) onUpdate(JSON.parse(cached));
        } catch {
          // ignore
        }
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe event registrations:", err);
    try {
      const cached = localStorage.getItem(EVENTS_REG_STORAGE_KEY);
      if (cached) onUpdate(JSON.parse(cached));
    } catch {
      // ignore
    }
    return () => {};
  }
}

/**
 * Submit a new event registration
 */
export async function submitEventRegistrationCloud(formData, currentEvent = null) {
  const codeSuffix = Math.floor(1000 + Math.random() * 9000);
  const prefix = (currentEvent?.ticketPrefix || "PZR-CIV").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const ticketCode = `${prefix}-${codeSuffix}`;
  const newDocId = `EVT_${Date.now()}_${codeSuffix}`;
  const now = new Date();

  const payload = {
    ticketCode,
    eventId: currentEvent?.id || "evt-pizzarena-civilian",
    eventTitle: currentEvent?.title || "Pizzarena : Civilian Street Fight",
    fullName: (formData.fullName || "").trim().toUpperCase(),
    phone: (formData.phone || "").trim(),
    discordTag: (formData.discordTag || formData.telegram || "").trim(),
    category: currentEvent?.title || "Pizzarena : Civilian Street Fight",
    jobStatus: formData.jobStatus || "Civilian - Freelancer",
    gangStatus: formData.gangStatus || "No Gang - Unaffiliated",
    ssDate: formData.ssDate || "",
    citizenId: (formData.citizenId || "").toUpperCase(),
    dob: formData.dob || "",
    sex: (formData.sex || "").toUpperCase(),
    nationality: (formData.nationality || "").toUpperCase(),
    ktpScreenshot: formData.ktpScreenshot || "",
    entryFee: currentEvent?.entryFee || "$10.000 USD",
    feePaid: false,
    checkedIn: false,
    status: "TERDAFTAR",
    createdAt: Date.now(),
    regDate: now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    regTime: now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    submittedAt: now.toISOString(),
  };

  try {
    const docRef = doc(getEventDb(), ...EVENTS_REG_COL_PATH, newDocId);
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn("Gagal simpan event ke cloud, menyimpan ke cache lokal:", err);
  }

  // Update local cache
  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_REG_STORAGE_KEY) || "[]");
    const updated = [{ id: newDocId, ...payload }, ...current];
    localStorage.setItem(EVENTS_REG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return { id: newDocId, ...payload };
}

/**
 * Delete an event registration (Admin only)
 */
export async function deleteEventRegistrationCloud(id) {
  try {
    const docRef = doc(getEventDb(), ...EVENTS_REG_COL_PATH, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Gagal hapus event di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_REG_STORAGE_KEY) || "[]");
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(EVENTS_REG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return true;
}

/**
 * Toggle check-in status (Admin only)
 */
export async function toggleEventCheckinCloud(id, currentStatus) {
  try {
    const docRef = doc(getEventDb(), ...EVENTS_REG_COL_PATH, id);
    await setDoc(docRef, { checkedIn: !currentStatus }, { merge: true });
  } catch (err) {
    console.warn("Gagal update check-in event di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_REG_STORAGE_KEY) || "[]");
    const updated = current.map((item) =>
      item.id === id ? { ...item, checkedIn: !currentStatus } : item
    );
    localStorage.setItem(EVENTS_REG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return true;
}

/**
 * Toggle entry fee payment status (Admin only)
 */
export async function toggleEventFeePaymentCloud(id, currentStatus) {
  try {
    const docRef = doc(getEventDb(), ...EVENTS_REG_COL_PATH, id);
    await setDoc(docRef, { feePaid: !currentStatus }, { merge: true });
  } catch (err) {
    console.warn("Gagal update pembayaran di cloud:", err);
  }

  try {
    const current = JSON.parse(localStorage.getItem(EVENTS_REG_STORAGE_KEY) || "[]");
    const updated = current.map((item) =>
      item.id === id ? { ...item, feePaid: !currentStatus } : item
    );
    localStorage.setItem(EVENTS_REG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return true;
}

/**
 * Export event registrations to Excel
 */
export function exportEventRegistrationsToExcel(registrations, eventTitle = "Pizzarena") {
  if (!registrations || registrations.length === 0) return false;

  const excelRows = registrations.map((r, index) => ({
    No: index + 1,
    Event: r.eventTitle || r.category || eventTitle,
    "Kode Tiket": r.ticketCode || "-",
    "NAMA LENGKAP / IC": r.fullName || "-",
    "CITIZEN ID": r.citizenId || "-",
    "NO TLP / WA IC": r.phone || "-",
    "DISCORD (OOC)": r.discordTag || r.telegram || "-",
    "STATUS PEKERJAAN": r.jobStatus || "Civilian",
    "STATUS GANG": r.gangStatus || "No Gang",
    "WAKTU SS": r.ssDate || "-",
    "BIAYA PENDAFTARAN": r.entryFee || "$10.000 USD",
    "STATUS BAYAR": r.feePaid ? `LUNAS (${r.entryFee || "$10.000 USD"})` : "BELUM BAYAR",
    "STATUS CHECK-IN": r.checkedIn ? "HADIR" : "BELUM HADIR",
    "Tanggal Daftar": `${r.regDate || "-"} ${r.regTime || ""}`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
  ];

  const safeTitle = (eventTitle || "Event_PPS")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pendaftar Event");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Pendaftar_${safeTitle}_${today}.xlsx`);
  return true;
}
