import { initializeApp, getApps, getApp } from "firebase/app";
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
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_MEMBERS_API_KEY,
  authDomain: "pendaftaran-paps.firebaseapp.com",
  projectId: "pendaftaran-paps",
  storageBucket: "pendaftaran-paps.firebasestorage.app",
  messagingSenderId: "1059369107960",
  appId: "1:1059369107960:web:59cc2c0d39ddfdbe6a1fd8",
};

const APP_NAME = "paps-members";
const app = getApps().some((a) => a.name === APP_NAME)
  ? getApp(APP_NAME)
  : initializeApp(firebaseConfig, APP_NAME);

const db = getFirestore(app);
const auth = getAuth(app);

const APP_ID = "portal-anggota-app";
const CONFIG_COLLECTION_PATH = [
  "artifacts",
  APP_ID,
  "public",
  "data",
  "doorprize_config",
];
const TICKETS_COLLECTION_PATH = [
  "artifacts",
  APP_ID,
  "public",
  "data",
  "doorprize_tickets",
];

const LOCAL_CONFIG_KEY = "pps_doorprize_config_v1";
const LOCAL_TICKETS_KEY = "pps_doorprize_tickets_v1";
const LOCAL_MY_TICKET_KEY = "pps_doorprize_my_ticket_v1";

export const DEFAULT_DOORPRIZE_CONFIG = {
  id: "current",
  title: "Undian Senam Sehat Bersama LSM PPS",
  subtitle: "Ambil Nomor Doorprize Resmi Peserta Senam Sehat",
  prizePerWinner: "$15.000",
  maxWinners: 5,
  status: "OPEN",
  autoPopupOnVisit: true,
  ticketPrefix: "SNM",
  roundId: "SENAM_SEHAT_2026",
  rules: [
    "Nama IC wajib diisi sesuai persis dengan nama yang tertera di KTP IC.",
    "Saat pengundian berlangsung, panitia akan memverifikasi kesesuaian Nama IC dengan KTP IC.",
    "Jika Nama IC berbeda dengan nama di KTP IC, nomor dianggap TIDAK SAH dan langsung DIKOCOK ULANG.",
    "Tersedia kuota 5 Pemenang beruntung yang masing-masing mendapatkan hadiah $15.000 ($15k).",
  ],
  winners: [],
  disqualifiedHistory: [],
  updatedAt: new Date().toISOString(),
};

let authReadyPromise = null;
async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (!authReadyPromise) {
    authReadyPromise = signInAnonymously(auth).catch((err) => {
      console.warn("Doorprize Auth fallback:", err);
      authReadyPromise = null;
      return null;
    });
  }
  return authReadyPromise;
}

export function normalizeIcName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatTicketNumber(num) {
  const n = Math.max(1, Number(num) || 1);
  return String(n).padStart(3, "0");
}

function getLocalConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_DOORPRIZE_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DOORPRIZE_CONFIG,
      ...parsed,
      rules:
        Array.isArray(parsed.rules) && parsed.rules.length > 0
          ? parsed.rules
          : DEFAULT_DOORPRIZE_CONFIG.rules,
      winners: Array.isArray(parsed.winners) ? parsed.winners : [],
      disqualifiedHistory: Array.isArray(parsed.disqualifiedHistory)
        ? parsed.disqualifiedHistory
        : [],
    };
  } catch {
    return { ...DEFAULT_DOORPRIZE_CONFIG };
  }
}

function saveLocalConfig(cfg) {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore storage errors
  }
}

function getLocalTickets() {
  try {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTickets(list) {
  try {
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function getSavedMyTicket(roundId = null) {
  try {
    const raw = localStorage.getItem(LOCAL_MY_TICKET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    if (roundId && parsed.roundId && parsed.roundId !== roundId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveMyTicketLocal(ticket) {
  try {
    if (!ticket) {
      localStorage.removeItem(LOCAL_MY_TICKET_KEY);
      return;
    }
    localStorage.setItem(LOCAL_MY_TICKET_KEY, JSON.stringify(ticket));
  } catch {
    // ignore storage errors
  }
}

export async function loadDoorprizeConfigCloud() {
  try {
    await ensureAuth();
    const docRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const initial = { ...DEFAULT_DOORPRIZE_CONFIG };
      await setDoc(docRef, initial);
      saveLocalConfig(initial);
      return initial;
    }
    const data = snap.data() || {};
    const merged = {
      ...DEFAULT_DOORPRIZE_CONFIG,
      ...data,
      rules:
        Array.isArray(data.rules) && data.rules.length > 0
          ? data.rules
          : DEFAULT_DOORPRIZE_CONFIG.rules,
      winners: Array.isArray(data.winners) ? data.winners : [],
      disqualifiedHistory: Array.isArray(data.disqualifiedHistory)
        ? data.disqualifiedHistory
        : [],
    };
    saveLocalConfig(merged);
    return merged;
  } catch (err) {
    console.warn("Gagal memuat konfigurasi doorprize cloud:", err);
    return getLocalConfig();
  }
}

export function subscribeDoorprizeConfigCloud(onUpdate) {
  let unsubscribe = null;
  let cancelled = false;

  onUpdate(getLocalConfig());

  ensureAuth().then(() => {
    if (cancelled) return;
    const docRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
    unsubscribe = onSnapshot(
      docRef,
      async (snap) => {
        if (!snap.exists()) {
          const initial = { ...DEFAULT_DOORPRIZE_CONFIG };
          try {
            await setDoc(docRef, initial);
          } catch {
            // ignore write error on init
          }
          saveLocalConfig(initial);
          onUpdate(initial);
          return;
        }
        const data = snap.data() || {};
        const merged = {
          ...DEFAULT_DOORPRIZE_CONFIG,
          ...data,
          rules:
            Array.isArray(data.rules) && data.rules.length > 0
              ? data.rules
              : DEFAULT_DOORPRIZE_CONFIG.rules,
          winners: Array.isArray(data.winners) ? data.winners : [],
          disqualifiedHistory: Array.isArray(data.disqualifiedHistory)
            ? data.disqualifiedHistory
            : [],
        };
        saveLocalConfig(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn("Doorprize config listener warning:", err);
      }
    );
  });

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

export async function saveDoorprizeConfigCloud(partialConfig) {
  const current = await loadDoorprizeConfigCloud();
  const updated = {
    ...current,
    ...partialConfig,
    id: "current",
    updatedAt: new Date().toISOString(),
  };
  saveLocalConfig(updated);
  await ensureAuth();
  const docRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
  await setDoc(docRef, updated);
  return updated;
}

export async function loadDoorprizeTicketsCloud() {
  try {
    await ensureAuth();
    const colRef = collection(db, ...TICKETS_COLLECTION_PATH);
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    list.sort((a, b) => (Number(a.ticketNumber) || 0) - (Number(b.ticketNumber) || 0));
    saveLocalTickets(list);
    return list;
  } catch (err) {
    console.warn("Gagal memuat tiket doorprize cloud:", err);
    return getLocalTickets();
  }
}

export function subscribeDoorprizeTicketsCloud(onUpdate) {
  let unsubscribe = null;
  let cancelled = false;

  onUpdate(getLocalTickets());

  ensureAuth().then(() => {
    if (cancelled) return;
    const colRef = collection(db, ...TICKETS_COLLECTION_PATH);
    unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        list.sort((a, b) => (Number(a.ticketNumber) || 0) - (Number(b.ticketNumber) || 0));
        saveLocalTickets(list);
        onUpdate(list);
      },
      (err) => {
        console.warn("Doorprize tickets listener warning:", err);
      }
    );
  });

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Klaim nomor doorprize berdasarkan Nama IC (wajib sesuai KTP IC).
 * Mencegah duplikasi nama IC yang sama pada putaran event yang aktif.
 */
export async function claimDoorprizeTicketCloud({ icName }) {
  const cleanName = normalizeIcName(icName);
  if (!cleanName || cleanName.length < 2) {
    throw new Error("Nama IC wajib diisi sesuai nama lengkap di KTP IC.");
  }

  const [config, existingTickets] = await Promise.all([
    loadDoorprizeConfigCloud(),
    loadDoorprizeTicketsCloud(),
  ]);

  if (config.status !== "OPEN") {
    throw new Error("Pengambilan nomor doorprize saat ini sedang ditutup oleh panitia.");
  }

  const normalizedKey = cleanName.toLowerCase();
  const existingMatch = existingTickets.find(
    (t) => normalizeIcName(t.icName).toLowerCase() === normalizedKey
  );

  if (existingMatch) {
    saveMyTicketLocal(existingMatch);
    return {
      alreadyClaimed: true,
      ticket: existingMatch,
    };
  }

  const maxNumber = existingTickets.reduce(
    (max, item) => Math.max(max, Number(item.ticketNumber) || 0),
    0
  );
  const nextNumber = maxNumber + 1;
  const numberFormatted = formatTicketNumber(nextNumber);
  const prefix = (config.ticketPrefix || "SNM").toUpperCase();
  const ticketCode = `${prefix}-${numberFormatted}`;
  const ticketId = `DP_${Date.now()}_${numberFormatted}`;

  const newTicket = {
    id: ticketId,
    ticketNumber: nextNumber,
    numberFormatted,
    ticketCode,
    icName: cleanName,
    roundId: config.roundId || "SENAM_SEHAT_2026",
    status: "ACTIVE",
    verifiedKtp: false,
    createdAt: new Date().toISOString(),
  };

  await ensureAuth();
  const docRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);
  await setDoc(docRef, newTicket);

  const updatedLocal = [...existingTickets, newTicket].sort(
    (a, b) => (Number(a.ticketNumber) || 0) - (Number(b.ticketNumber) || 0)
  );
  saveLocalTickets(updatedLocal);
  saveMyTicketLocal(newTicket);

  return {
    alreadyClaimed: false,
    ticket: newTicket,
  };
}

/**
 * Mengocok pemenang doorprize secara acak dari peserta yang berstatus ACTIVE
 * dan belum pernah menang / belum didiskualifikasi.
 */
export async function drawDoorprizeWinnerCloud(drawCount = 1) {
  const [config, tickets] = await Promise.all([
    loadDoorprizeConfigCloud(),
    loadDoorprizeTicketsCloud(),
  ]);

  const currentWinners = Array.isArray(config.winners) ? [...config.winners] : [];
  const maxWinners = Math.max(1, Number(config.maxWinners) || 5);
  const remainingSlots = maxWinners - currentWinners.length;

  if (remainingSlots <= 0) {
    throw new Error(`Kuota ${maxWinners} pemenang sudah terpenuhi seluruhnya.`);
  }

  const winnerIds = new Set(currentWinners.map((w) => w.ticketId));
  const disqualifiedIds = new Set(
    (config.disqualifiedHistory || []).map((d) => d.ticketId)
  );

  const eligiblePool = tickets.filter(
    (t) =>
      t.status !== "DISQUALIFIED" &&
      !winnerIds.has(t.id) &&
      !disqualifiedIds.has(t.id)
  );

  if (eligiblePool.length === 0) {
    throw new Error("Tidak ada nomor peserta aktif yang tersisa untuk dikocok.");
  }

  const countToDraw = Math.min(drawCount, remainingSlots, eligiblePool.length);
  const poolCopy = [...eligiblePool];
  const newlyDrawn = [];

  await ensureAuth();

  for (let i = 0; i < countToDraw; i++) {
    const randIndex = Math.floor(Math.random() * poolCopy.length);
    const chosen = poolCopy.splice(randIndex, 1)[0];
    const nowIso = new Date().toISOString();

    const winnerEntry = {
      ticketId: chosen.id,
      ticketNumber: chosen.ticketNumber,
      numberFormatted: chosen.numberFormatted || formatTicketNumber(chosen.ticketNumber),
      ticketCode: chosen.ticketCode,
      icName: chosen.icName,
      prize: config.prizePerWinner || "$15.000",
      drawnAt: nowIso,
      verifiedKtp: false,
    };

    newlyDrawn.push(winnerEntry);
    currentWinners.push(winnerEntry);

    const ticketRef = doc(db, ...TICKETS_COLLECTION_PATH, chosen.id);
    await setDoc(
      ticketRef,
      { ...chosen, status: "WINNER", drawnAt: nowIso },
      { merge: true }
    );
  }

  const updatedConfig = await saveDoorprizeConfigCloud({
    winners: currentWinners,
  });

  return {
    newlyDrawn,
    config: updatedConfig,
  };
}

/**
 * Tandai pemenang sudah diverifikasi sesuai KTP IC (SAH).
 */
export async function verifyDoorprizeWinnerKtpCloud(ticketId) {
  const config = await loadDoorprizeConfigCloud();
  const updatedWinners = (config.winners || []).map((w) =>
    w.ticketId === ticketId
      ? { ...w, verifiedKtp: true, verifiedAt: new Date().toISOString() }
      : w
  );

  await ensureAuth();
  const ticketRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);
  await setDoc(
    ticketRef,
    { verifiedKtp: true, status: "WINNER_VERIFIED" },
    { merge: true }
  );

  return saveDoorprizeConfigCloud({ winners: updatedWinners });
}

/**
 * Gugurkan pemenang karena Nama IC berbeda dengan KTP IC (TIDAK SAH)
 * dan opsional langsung kocok ulang penggantinya.
 */
export async function disqualifyAndRerollWinnerCloud(
  ticketId,
  { reason = "Nama IC tidak sesuai dengan KTP IC", autoReroll = true } = {}
) {
  const [config, tickets] = await Promise.all([
    loadDoorprizeConfigCloud(),
    loadDoorprizeTicketsCloud(),
  ]);

  const currentWinners = Array.isArray(config.winners) ? [...config.winners] : [];
  const targetWinner = currentWinners.find((w) => w.ticketId === ticketId);

  if (!targetWinner) {
    throw new Error("Data pemenang tidak ditemukan.");
  }

  const nowIso = new Date().toISOString();
  const remainingWinners = currentWinners.filter((w) => w.ticketId !== ticketId);
  const disqualifiedEntry = {
    ...targetWinner,
    reason,
    disqualifiedAt: nowIso,
  };

  const updatedDisqualified = [
    disqualifiedEntry,
    ...(Array.isArray(config.disqualifiedHistory) ? config.disqualifiedHistory : []),
  ];

  await ensureAuth();
  const badTicketRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);
  await setDoc(
    badTicketRef,
    {
      status: "DISQUALIFIED",
      disqualifyReason: reason,
      disqualifiedAt: nowIso,
    },
    { merge: true }
  );

  let replacementWinner = null;

  if (autoReroll) {
    const winnerIds = new Set(remainingWinners.map((w) => w.ticketId));
    const disqualifiedIds = new Set(updatedDisqualified.map((d) => d.ticketId));

    const eligiblePool = tickets.filter(
      (t) =>
        t.id !== ticketId &&
        t.status !== "DISQUALIFIED" &&
        !winnerIds.has(t.id) &&
        !disqualifiedIds.has(t.id)
    );

    if (eligiblePool.length > 0) {
      const randIndex = Math.floor(Math.random() * eligiblePool.length);
      const chosen = eligiblePool[randIndex];

      replacementWinner = {
        ticketId: chosen.id,
        ticketNumber: chosen.ticketNumber,
        numberFormatted: chosen.numberFormatted || formatTicketNumber(chosen.ticketNumber),
        ticketCode: chosen.ticketCode,
        icName: chosen.icName,
        prize: config.prizePerWinner || "$15.000",
        drawnAt: nowIso,
        verifiedKtp: false,
        replacedTicketCode: targetWinner.ticketCode,
      };

      remainingWinners.push(replacementWinner);

      const newTicketRef = doc(db, ...TICKETS_COLLECTION_PATH, chosen.id);
      await setDoc(
        newTicketRef,
        { ...chosen, status: "WINNER", drawnAt: nowIso },
        { merge: true }
      );
    }
  }

  const updatedConfig = await saveDoorprizeConfigCloud({
    winners: remainingWinners,
    disqualifiedHistory: updatedDisqualified,
  });

  return {
    disqualifiedWinner: disqualifiedEntry,
    replacementWinner,
    config: updatedConfig,
  };
}

export async function deleteDoorprizeTicketCloud(ticketId) {
  await ensureAuth();
  const docRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);
  await deleteDoc(docRef);

  const config = await loadDoorprizeConfigCloud();
  if ((config.winners || []).some((w) => w.ticketId === ticketId)) {
    const filteredWinners = config.winners.filter((w) => w.ticketId !== ticketId);
    await saveDoorprizeConfigCloud({ winners: filteredWinners });
  }
}

export async function resetDoorprizeSessionCloud() {
  await ensureAuth();
  const tickets = await loadDoorprizeTicketsCloud();
  await Promise.all(
    tickets.map((t) => deleteDoc(doc(db, ...TICKETS_COLLECTION_PATH, t.id)))
  );
  saveLocalTickets([]);
  saveMyTicketLocal(null);

  const newRoundId = `SENAM_SEHAT_${Date.now()}`;
  return saveDoorprizeConfigCloud({
    roundId: newRoundId,
    winners: [],
    disqualifiedHistory: [],
  });
}
