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
 * Submit new member registration to cloud
 */
export async function submitMemberCloud(data) {
  const newDocId = "MEMBER_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date();
  const payload = {
    fullName: (data.fullName || "").trim(),
    icNumber: (data.icNumber || "").trim(),
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
 * Export members to formatted Excel (.xlsx) file
 */
export function exportMembersToExcel(members) {
  if (!members || members.length === 0) return false;

  const excelRows = members.map((m, index) => ({
    No: index + 1,
    "ID Anggota": m.id,
    "NAMA IC": m.fullName || "-",
    "NO KTP IC": m.icNumber || "-",
    "NO TLP/WA IC": m.phone || "-",
    "DISCORD (OOC)": m.discordTag || "-",
    "Tanggal Terdaftar": m.regDate || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
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
  const excelRows = members.map((m, index) => ({
    No: index + 1,
    "ID Anggota": m.id,
    "NAMA IC": m.fullName || "-",
    "NO KTP IC": m.icNumber || "-",
    "NO TLP/WA IC": m.phone || "-",
    "DISCORD (OOC)": m.discordTag || "-",
    "Tanggal Terdaftar": m.regDate || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
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
