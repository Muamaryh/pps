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
  runTransaction,
} from "firebase/firestore";

const doorprizeFirebaseConfig = {
  apiKey: "AIzaSyDB7TFVRDRvgMI4q_XtwnxSqOhCKZ2xAe8",
  authDomain: "pendaftaran-paps.firebaseapp.com",
  projectId: "pendaftaran-paps",
  storageBucket: "pendaftaran-paps.firebasestorage.app",
  messagingSenderId: "263750919370",
  appId: "1:263750919370:web:ed32312897807281498033",
  measurementId: "G-RBTWG5K8W1",
};

let _doorprizeApp = null;
let _doorprizeDb = null;

function getDoorprizeApp() {
  if (!_doorprizeApp) {
    _doorprizeApp =
      getApps().find((a) => a.name === "paps-members") ||
      initializeApp(doorprizeFirebaseConfig, "paps-members");
  }
  return _doorprizeApp;
}

function getDoorprizeDb() {
  if (!_doorprizeDb) {
    _doorprizeDb = getFirestore(getDoorprizeApp());
  }
  return _doorprizeDb;
}

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

const LOCAL_CONFIG_KEY = "pps_doorprize_config_v2";
const LOCAL_TICKETS_KEY = "pps_doorprize_tickets_v2";
const LOCAL_MY_TICKET_KEY = "pps_doorprize_my_ticket_v2";

export const DEFAULT_DOORPRIZE_CONFIG = {
  id: "current",
  title: "Undian Senam Sehat Bersama LSM PPS",
  subtitle: "Program Undian Doorprize Resmi LSM Paguyuban Pizza Sandy Shores",
  prizePerWinner: "$10.000",
  maxWinners: 10,
  status: "OPEN",
  autoPopupOnVisit: true,
  ticketPrefix: "SNM",
  roundId: "SENAM_SEHAT_2026",
  lastTicketNumber: 0,
  schemaVersion: 3,
  rules: [
    "Nama Lengkap IC dan Citizen ID (CID) wajib diisi sesuai persis dengan yang tertera di KTP IC.",
    "Tidak ada batas maksimal peserta. Semua peserta senam dapat mengambil 1 Nomor Doorprize (1 CID = 1 Nomor).",
    "Apabila saat verifikasi pemenang Nama IC atau Citizen ID berbeda dengan KTP IC, maka nomor dinyatakan TIDAK SAH dan langsung DIKOCOK ULANG.",
    "Tersedia kuota 10 Pemenang beruntung yang masing-masing mendapatkan hadiah Uang Tunai $10.000 USD ($10k).",
  ],
  winners: [],
  disqualifiedHistory: [],
  updatedAt: new Date().toISOString(),
};

export function normalizeIcName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCitizenId(cid) {
  return String(cid || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function formatTicketNumber(num) {
  const n = Math.max(1, Number(num) || 1);
  return String(n).padStart(3, "0");
}

function normalizeLoadedConfig(raw) {
  const data = raw || {};
  const isOldInitialTemplate =
    data.prizePerWinner === "$15.000" ||
    data.prizePerWinner === "15k";

  const merged = {
    ...DEFAULT_DOORPRIZE_CONFIG,
    ...data,
    prizePerWinner: isOldInitialTemplate
      ? "$10.000"
      : (data.prizePerWinner !== undefined && data.prizePerWinner !== null && String(data.prizePerWinner).trim() !== ""
          ? String(data.prizePerWinner).trim()
          : DEFAULT_DOORPRIZE_CONFIG.prizePerWinner),
    maxWinners: isOldInitialTemplate && Number(data.maxWinners) === 5
      ? 10
      : (Number(data.maxWinners) > 0
          ? Number(data.maxWinners)
          : DEFAULT_DOORPRIZE_CONFIG.maxWinners),
    schemaVersion: 3,
    rules:
      Array.isArray(data.rules) && data.rules.length > 0
        ? data.rules
        : DEFAULT_DOORPRIZE_CONFIG.rules,
    winners: Array.isArray(data.winners) ? data.winners : [],
    disqualifiedHistory: Array.isArray(data.disqualifiedHistory)
      ? data.disqualifiedHistory
      : [],
  };
  return { merged, needsCloudMigration: isOldInitialTemplate };
}

function getLocalConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_DOORPRIZE_CONFIG };
    const parsed = JSON.parse(raw);
    return normalizeLoadedConfig(parsed).merged;
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
    const db = getDoorprizeDb();
    const docRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const initial = { ...DEFAULT_DOORPRIZE_CONFIG };
      await setDoc(docRef, initial);
      saveLocalConfig(initial);
      return initial;
    }
    const { merged, needsCloudMigration } = normalizeLoadedConfig(snap.data());
    if (needsCloudMigration) {
      try {
        await setDoc(docRef, merged);
      } catch {
        // ignore write error
      }
    }
    saveLocalConfig(merged);
    return merged;
  } catch (err) {
    console.warn("Gagal memuat konfigurasi doorprize cloud:", err);
    return getLocalConfig();
  }
}

export function subscribeDoorprizeConfigCloud(onUpdate) {
  onUpdate(getLocalConfig());

  try {
    const db = getDoorprizeDb();
    const docRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
    const unsubscribe = onSnapshot(
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
        const { merged, needsCloudMigration } = normalizeLoadedConfig(snap.data());
        if (needsCloudMigration) {
          try {
            await setDoc(docRef, merged);
          } catch {
            // ignore migration write error
          }
        }
        saveLocalConfig(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn("Doorprize config listener warning:", err);
      }
    );
    return () => unsubscribe();
  } catch (err) {
    console.warn("Doorprize subscribe config error:", err);
    return () => {};
  }
}

export async function saveDoorprizeConfigCloud(partialConfig) {
  const current = await loadDoorprizeConfigCloud();
  const updated = {
    ...current,
    ...partialConfig,
    id: "current",
    schemaVersion: 3,
    updatedAt: new Date().toISOString(),
  };
  saveLocalConfig(updated);
  const db = getDoorprizeDb();
  const docRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
  await setDoc(docRef, updated);
  return updated;
}

export async function loadDoorprizeTicketsCloud() {
  try {
    const db = getDoorprizeDb();
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
  onUpdate(getLocalTickets());

  try {
    const db = getDoorprizeDb();
    const colRef = collection(db, ...TICKETS_COLLECTION_PATH);
    const unsubscribe = onSnapshot(
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
    return () => unsubscribe();
  } catch (err) {
    console.warn("Doorprize subscribe tickets error:", err);
    return () => {};
  }
}

/**
 * Klaim nomor doorprize berdasarkan Nama Lengkap IC & Citizen ID (wajib sesuai KTP IC).
 * Tidak ada batas maksimal peserta; menggunakan transaksi Firestore agar nomor urut
 * tidak pernah bentrok meskipun banyak warga mengambil nomor bersamaan.
 */
export async function claimDoorprizeTicketCloud({ icName, citizenId }) {
  const cleanName = normalizeIcName(icName).toUpperCase();
  const cleanCid = normalizeCitizenId(citizenId);

  if (!cleanName || cleanName.length < 2) {
    throw new Error("Nama Lengkap IC wajib diisi sesuai yang tertera di KTP IC.");
  }

  if (!cleanCid || cleanCid.length < 2) {
    throw new Error("Citizen ID (CID) wajib diisi sesuai yang tertera di KTP IC.");
  }

  const [config, existingTickets] = await Promise.all([
    loadDoorprizeConfigCloud(),
    loadDoorprizeTicketsCloud(),
  ]);

  if (config.status !== "OPEN") {
    throw new Error("Pengambilan nomor doorprize saat ini sedang ditutup oleh panitia.");
  }

  const normalizedNameKey = cleanName.toLowerCase();
  const normalizedCidKey = cleanCid.toLowerCase();

  const existingMatch = existingTickets.find((t) => {
    const tName = normalizeIcName(t.icName).toLowerCase();
    const tCid = normalizeCitizenId(t.citizenId).toLowerCase();
    return (tCid && tCid === normalizedCidKey) || tName === normalizedNameKey;
  });

  if (existingMatch) {
    saveMyTicketLocal(existingMatch);
    return {
      alreadyClaimed: true,
      ticket: existingMatch,
    };
  }

  const maxExistingNumber = existingTickets.reduce(
    (max, item) => Math.max(max, Number(item.ticketNumber) || 0),
    0
  );

  const db = getDoorprizeDb();
  const roundId = config.roundId || "SENAM_SEHAT_2026";
  const safeCidSlug = cleanCid.replace(/[^A-Z0-9_-]/g, "") || `${Date.now()}`;
  const ticketId = `DP_${roundId}_${safeCidSlug}`;
  const configRef = doc(db, ...CONFIG_COLLECTION_PATH, "current");
  const ticketRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);

  const txResult = await runTransaction(db, async (tx) => {
    const [cfgSnap, existingSnap] = await Promise.all([
      tx.get(configRef),
      tx.get(ticketRef),
    ]);

    if (existingSnap.exists()) {
      return {
        alreadyClaimed: true,
        ticket: { id: existingSnap.id, ...existingSnap.data() },
      };
    }

    const cfgData = cfgSnap.exists() ? cfgSnap.data() || {} : config;
    const prevLast = Number(cfgData.lastTicketNumber) || 0;
    const nextNumber = Math.max(prevLast, maxExistingNumber) + 1;
    const numberFormatted = formatTicketNumber(nextNumber);
    const prefix = (cfgData.ticketPrefix || config.ticketPrefix || "SNM").toUpperCase();
    const ticketCode = `${prefix}-${numberFormatted}`;

    const newTicket = {
      id: ticketId,
      ticketNumber: nextNumber,
      numberFormatted,
      ticketCode,
      icName: cleanName,
      citizenId: cleanCid,
      roundId,
      status: "ACTIVE",
      verifiedKtp: false,
      createdAt: new Date().toISOString(),
    };

    tx.set(
      configRef,
      {
        ...DEFAULT_DOORPRIZE_CONFIG,
        ...normalizeLoadedConfig(cfgData).merged,
        lastTicketNumber: nextNumber,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    tx.set(ticketRef, newTicket);

    return {
      alreadyClaimed: false,
      ticket: newTicket,
    };
  });

  if (txResult.alreadyClaimed) {
    saveMyTicketLocal(txResult.ticket);
    return txResult;
  }

  const updatedLocal = [...existingTickets, txResult.ticket].sort(
    (a, b) => (Number(a.ticketNumber) || 0) - (Number(b.ticketNumber) || 0)
  );
  saveLocalTickets(updatedLocal);
  saveMyTicketLocal(txResult.ticket);

  return txResult;
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
  const maxWinners = Math.max(1, Number(config.maxWinners) || 10);
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

  const db = getDoorprizeDb();

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
      citizenId: chosen.citizenId || "-",
      prize: config.prizePerWinner || "$10.000",
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

  const db = getDoorprizeDb();
  const ticketRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);
  await setDoc(
    ticketRef,
    { verifiedKtp: true, status: "WINNER_VERIFIED" },
    { merge: true }
  );

  return saveDoorprizeConfigCloud({ winners: updatedWinners });
}

/**
 * Gugurkan pemenang karena Nama IC / Citizen ID berbeda dengan KTP IC (TIDAK SAH)
 * dan opsional langsung kocok ulang penggantinya.
 */
export async function disqualifyAndRerollWinnerCloud(
  ticketId,
  { reason = "Nama IC / Citizen ID tidak sesuai dengan KTP IC", autoReroll = true } = {}
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

  const db = getDoorprizeDb();
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
        citizenId: chosen.citizenId || "-",
        prize: config.prizePerWinner || "$10.000",
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
  const db = getDoorprizeDb();
  const docRef = doc(db, ...TICKETS_COLLECTION_PATH, ticketId);
  await deleteDoc(docRef);

  const config = await loadDoorprizeConfigCloud();
  if ((config.winners || []).some((w) => w.ticketId === ticketId)) {
    const filteredWinners = config.winners.filter((w) => w.ticketId !== ticketId);
    await saveDoorprizeConfigCloud({ winners: filteredWinners });
  }
}

export async function resetDoorprizeSessionCloud() {
  const db = getDoorprizeDb();
  const tickets = await loadDoorprizeTicketsCloud();
  await Promise.all(
    tickets.map((t) => deleteDoc(doc(db, ...TICKETS_COLLECTION_PATH, t.id)))
  );
  saveLocalTickets([]);
  saveMyTicketLocal(null);

  const newRoundId = `SENAM_SEHAT_${Date.now()}`;
  return saveDoorprizeConfigCloud({
    roundId: newRoundId,
    lastTicketNumber: 0,
    winners: [],
    disqualifiedHistory: [],
  });
}
