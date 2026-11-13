// ==========================================================================
// VISITOR COUNTER SERVICE (PORTAL LSM PAGUYUBAN PIZZA SANDY SHORES)
// Real-time Firestore sync with atomic increment & session deduplication
// ==========================================================================

import {
  doc,
  setDoc,
  onSnapshot,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const STATS_DOC_PATH = ["pps_website", "site_stats"];
const LOCAL_STORAGE_KEY = "pps_site_stats_cache";
const SESSION_HIT_KEY = "pps_visitor_session_recorded";

const DEFAULT_STATS = {
  totalVisitors: 1,
  lastVisitedAt: null,
};

function getLocalStats() {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      totalVisitors: Math.max(1, Number(parsed?.totalVisitors) || 1),
      lastVisitedAt: parsed?.lastVisitedAt || null,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

function saveLocalStats(stats) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore local storage errors
  }
}

/**
 * Record visitor hit atomically (1x per browser session / tab lifecycle)
 */
export async function recordVisitorHitCloud() {
  if (typeof window === "undefined") return;

  try {
    // Cek apakah tab/sesi browser ini sudah dihitung
    const hasRecorded = sessionStorage.getItem(SESSION_HIT_KEY);
    if (hasRecorded) return;

    // Tandai langsung di sesi browser agar tidak dobel hit saat refresh (F5)
    sessionStorage.setItem(SESSION_HIT_KEY, "true");

    const statsRef = doc(db, ...STATS_DOC_PATH);

    // Atomic increment di Firestore
    await setDoc(
      statsRef,
      {
        totalVisitors: increment(1),
        lastVisitedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Pemberitahuan sinkronisasi visitor Firestore:", err);
  }
}

/**
 * Real-time listener for site visitor stats
 */
export function subscribeVisitorStatsCloud(onUpdate) {
  // Berikan data lokal secepat kilat untuk render awal
  onUpdate(getLocalStats());

  if (typeof window === "undefined") return () => {};

  try {
    const statsRef = doc(db, ...STATS_DOC_PATH);
    const unsubscribe = onSnapshot(
      statsRef,
      async (snap) => {
        if (!snap.exists()) {
          // Inisialisasi dokumen perdana jika belum ada
          try {
            await setDoc(statsRef, {
              totalVisitors: 1,
              createdAt: serverTimestamp(),
            });
          } catch {
            // ignore init error
          }
          saveLocalStats(DEFAULT_STATS);
          onUpdate(DEFAULT_STATS);
          return;
        }

        const data = snap.data() || {};
        const count = Math.max(1, Number(data.totalVisitors) || 1);
        const stats = {
          totalVisitors: count,
          lastVisitedAt: data.lastVisitedAt || null,
        };
        saveLocalStats(stats);
        onUpdate(stats);
      },
      (err) => {
        console.warn("Visitor stats listener notice:", err);
        onUpdate(getLocalStats());
      }
    );

    return () => unsubscribe();
  } catch (err) {
    console.warn("Error subscribing visitor stats:", err);
    return () => {};
  }
}
