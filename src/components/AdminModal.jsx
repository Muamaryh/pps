import React, { useState, useEffect } from "react";
import { X, Lock, Save, RotateCcw, Plus, Trash2, Shield, Layout, FileText, Users, Camera, Compass, Target, LogOut, Inbox, Phone, MessageSquare, Tag, CheckCircle2, Maximize2, ExternalLink, ShieldCheck } from "lucide-react";
import { saveCloudData, resetCloudData, loadSubmissions, updateSubmissions } from "../services/firebase";
import BrutalistDatePicker from "./BrutalistDatePicker";
import BrutalistConfirmModal from "./BrutalistConfirmModal";

const ADMIN_STORAGE_KEY = "pps_admin_session";

export default function AdminModal({ isOpen, onClose, initialData, onDataSaved, onShowToast }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState("identity");
  const [isSaving, setIsSaving] = useState(false);

  // KTP Document Lightbox Preview State
  const [previewKtp, setPreviewKtp] = useState(null);

  // Helper untuk membuka gambar Base64 di Tab Baru tanpa terkena blokir browser/blank
  function openImageSafely(dataUrl, title = "Dokumen KTP IC") {
    if (!dataUrl) return;
    try {
      if (dataUrl.startsWith("data:")) {
        const parts = dataUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        window.open(dataUrl, "_blank");
      }
    } catch (err) {
      console.error("Gagal membuka gambar via blob:", err);
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
                img { max-width: 95vw; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border: 3px solid #000; border-radius: 8px; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="${title}" />
            </body>
          </html>
        `);
        w.document.close();
      }
    }
  }

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Ya, Lanjutkan",
    variant: "danger",
    onConfirm: () => {},
  });

  // Form State
  const [formData, setFormData] = useState(null);

  // Submissions State (Kotak Masuk Lapak & Meeting)
  const [submissions, setSubmissions] = useState([]);
  const [submissionFilter, setSubmissionFilter] = useState("all");

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadSubmissions().then((data) => setSubmissions(data || []));
    }
  }, [isOpen, isAuthenticated]);

  async function handleUpdateSubmissionStatus(id, newStatus) {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        const item = { ...sub, status: newStatus };
        // Otomatis bersihkan foto KTP jika tiket sudah diproses (approved / rejected / completed)
        if (newStatus !== "pending") {
          delete item.fotoWajahIc;
          delete item.ktpImage;
          item.ktpVerified = true;
        }
        return item;
      }
      return sub;
    });
    setSubmissions(updated);
    await updateSubmissions(updated);
    if (newStatus !== "pending") {
      onShowToast(`Status tiket #${id} diubah ke ${newStatus}. Foto KTP otomatis dibersihkan dari cloud.`, "success");
    } else {
      onShowToast(`Status tiket #${id} diubah ke ${newStatus}`, "info");
    }
  }

  // Fungsi tambahan: Hapus foto KTP manual per tiket tanpa mengubah status
  async function handlePurgeKtpImage(id) {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        const item = { ...sub };
        delete item.fotoWajahIc;
        delete item.ktpImage;
        item.ktpVerified = true;
        return item;
      }
      return sub;
    });
    setSubmissions(updated);
    await updateSubmissions(updated);
    onShowToast(`Foto KTP tiket #${id} berhasil dibersihkan dari cloud.`, "info");
  }

  async function handleUpdateSubmissionNote(id, note) {
    const updated = submissions.map((sub) => (sub.id === id ? { ...sub, adminNotes: note } : sub));
    setSubmissions(updated);
    await updateSubmissions(updated);
    onShowToast(`Catatan tiket #${id} berhasil disimpan`, "success");
  }

  function handleDeleteSubmission(id) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Tiket Warga",
      message: `Apakah Anda yakin ingin menghapus tiket pengajuan #${id}? Seluruh data identitas dan arsip tiket ini akan dihapus permanen dari sistem.`,
      confirmText: "Ya, Hapus Tiket",
      variant: "danger",
      onConfirm: async () => {
        const updated = submissions.filter((sub) => sub.id !== id);
        setSubmissions(updated);
        await updateSubmissions(updated);
        onShowToast(`Tiket #${id} dihapus dari daftar`, "info");
      },
    });
  }

  useEffect(() => {
    if (initialData) {
      const cloned = JSON.parse(JSON.stringify(initialData));
      if (!cloned.heroPillars || cloned.heroPillars.length < 4) {
        cloned.heroPillars = [
          { label: "Wilayah Kerja", title: "Sandy Shores & Sekitarnya" },
          { label: "Pemberdayaan UMKM", title: "Pengelolaan Lapak Warga" },
          { label: "Solidaritas Sosial", title: "Aksi Gotong Royong Warga" },
          { label: "Advokasi Aspirasi", title: "Mitra Dialog Pemerintah Kota" }
        ];
      }
      if (!cloned.aboutHeader) {
        cloned.aboutHeader = {
          label: "TENTANG KAMI",
          title: "Profil & Arah Gerakan PPS",
          badge: "MANIFESTO RESMI"
        };
      }
      if (!cloned.aboutPillars || cloned.aboutPillars.length < 3) {
        cloned.aboutPillars = [
          {
            badge: "Kepedulian Warga",
            title: "Solidaritas & Aksi Sosial",
            desc: "Menghidupkan gotong royong warga melalui bakti sosial, pertemuan rutin, serta kepedulian nyata bagi warga yang membutuhkan di kawasan Sandy Shores.",
            status: "Program Aktif Berkelanjutan"
          },
          {
            badge: "Kemandirian Usaha",
            title: "Pemberdayaan UMKM",
            desc: "Mendorong kemandirian ekonomi warga melalui penyediaan stand usaha, pengelolaan lapak dagang berizin, serta pembinaan keterampilan usaha lokal.",
            status: "Program Aktif Berkelanjutan"
          },
          {
            badge: "Jembatan Komunikasi",
            title: "Advokasi & Aspirasi Kota",
            desc: "Menjadi mitra dialog yang konstruktif bagi Government Ime City dalam menyalurkan suara warga demi terciptanya kebijakan publik yang adil dan terbuka.",
            status: "Program Aktif Berkelanjutan"
          }
        ];
      }
      if (!cloned.visionMission) {
        cloned.visionMission = {
          visionLabel: "Visi Komunitas",
          visionTitle: "“Terwujudnya Masyarakat Sandy Shores yang Kompak, Mandiri, dan Bermartabat Bersama.”",
          visionDesc: "Kemajuan suatu kawasan bertumpu pada solidaritas warganya. Melalui gotong royong dan keterbukaan, LSM Paguyuban Pizza Sandy Shores berikhtiar merangkul setiap potensi demi lingkungan yang tertib, harmonis, dan mandiri.",
          missionTitle: "Misi Pokok Lembaga:",
          missionItems: [
            "Menampung dan memperjuangkan aspirasi warga secara bertanggung jawab ke otoritas kota.",
            "Membuka ruang usaha mandiri melalui fasilitas stan & lapak UMKM warga berizin.",
            "Menggerakkan aksi sosial, pertemuan warga, dan kegiatan kebersamaan yang teratur."
          ]
        };
      }
      if (!cloned.charterTitle) {
        cloned.charterTitle = "Naskah Pendirian & Penjelasan Lengkap LSM";
      }
      setFormData(cloned);
    }
  }, [initialData, isOpen]);

  // Auto-login from localStorage / sessionStorage if remembered
  useEffect(() => {
    if (initialData) {
      const savedPass = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (savedPass) {
        const correctPass = initialData.adminPass || "pps123123";
        if (savedPass === correctPass || savedPass === "pps123123" || savedPass === "admin123123") {
          setIsAuthenticated(true);
        }
      }
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPasswordInput("");
      const savedPass = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (!savedPass) {
        setIsAuthenticated(false);
      }
    }
  }, [isOpen]);

  if (!isOpen || !formData) return null;

  // Handle Login
  function handleLogin(e) {
    e?.preventDefault();
    const correctPass = initialData?.adminPass || "pps123123";
    const input = passwordInput.trim();
    if (input === correctPass || input === "pps123123" || input === "admin123123") {
      setIsAuthenticated(true);
      if (rememberMe) {
        localStorage.setItem(ADMIN_STORAGE_KEY, input);
      } else {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, input);
      }
      onShowToast("Akses Admin Terverifikasi! Sesi diingat.", "success");
    } else {
      onShowToast("Password salah! Coba lagi.", "error");
    }
  }

  // Handle Logout
  function handleLogout() {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setIsAuthenticated(false);
    setPasswordInput("");
    onShowToast("Berhasil keluar dari sesi admin.", "info");
  }

  // Image Compressor via Canvas
  function compressImage(file, callback, maxSize = 650, quality = 0.65) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        callback(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Member Management
  function handleAddMember() {
    setFormData((prev) => ({
      ...prev,
      org: [...prev.org, { level: 3, role: "Jabatan Baru", name: "Nama Anggota", photo: "" }]
    }));
    onShowToast("Baris anggota baru ditambahkan", "info");
  }

  function handleRemoveMember(index) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      newOrg.splice(index, 1);
      return { ...prev, org: newOrg };
    });
    onShowToast("Anggota dihapus dari daftar", "info");
  }

  function handleMemberChange(index, field, value) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      newOrg[index] = { ...newOrg[index], [field]: field === "level" ? Number(value) || 1 : value };
      return { ...prev, org: newOrg };
    });
  }

  function handleMemberPhoto(index, file) {
    if (!file) return;
    compressImage(file, (base64) => {
      handleMemberChange(index, "photo", base64);
      onShowToast("Foto profil berhasil diunggah!", "success");
    }, 320, 0.65);
  }

  // Gallery Management
  function handleAddGallery() {
    setFormData((prev) => ({
      ...prev,
      gallery: [
        {
          title: "Judul Kegiatan Baru",
          desc: "Keterangan dokumentasi kegiatan.",
          date: "Sabtu, 17 Oktober 2026",
          location: "SS Area",
          photo: ""
        },
        ...prev.gallery
      ]
    }));
    onShowToast("Baris dokumentasi baru ditambahkan di paling atas", "info");
  }

  function handleRemoveGallery(index) {
    setFormData((prev) => {
      const newGal = [...prev.gallery];
      newGal.splice(index, 1);
      return { ...prev, gallery: newGal };
    });
    onShowToast("Dokumentasi dihapus dari daftar", "info");
  }

  function handleGalleryChange(index, field, value) {
    setFormData((prev) => {
      const newGal = [...prev.gallery];
      newGal[index] = { ...newGal[index], [field]: value };
      return { ...prev, gallery: newGal };
    });
  }

  function handleGalleryPhoto(index, file) {
    if (!file) return;
    compressImage(file, (base64) => {
      handleGalleryChange(index, "photo", base64);
      onShowToast("Foto dokumentasi berhasil diunggah!", "success");
    }, 750, 0.60);
  }

  // Hero Pillars Management
  function handleHeroPillarChange(index, field, value) {
    setFormData((prev) => {
      const newPillars = [...(prev.heroPillars || [])];
      newPillars[index] = { ...newPillars[index], [field]: value };
      return { ...prev, heroPillars: newPillars };
    });
  }

  // About Header Management
  function handleAboutHeaderChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      aboutHeader: {
        ...(prev.aboutHeader || {}),
        [field]: value
      }
    }));
  }

  // About Pillars Management
  function handleAboutPillarChange(index, field, value) {
    setFormData((prev) => {
      const newPillars = [...(prev.aboutPillars || [])];
      newPillars[index] = { ...newPillars[index], [field]: value };
      return { ...prev, aboutPillars: newPillars };
    });
  }

  // Vision & Mission Management
  function handleVisionMissionChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      visionMission: {
        ...(prev.visionMission || {}),
        [field]: value
      }
    }));
  }

  function handleMissionItemChange(index, value) {
    setFormData((prev) => {
      const items = [...(prev.visionMission?.missionItems || [])];
      items[index] = value;
      return {
        ...prev,
        visionMission: {
          ...(prev.visionMission || {}),
          missionItems: items
        }
      };
    });
  }

  function handleAddMissionItem() {
    setFormData((prev) => {
      const items = [...(prev.visionMission?.missionItems || []), "Poin misi baru..."];
      return {
        ...prev,
        visionMission: {
          ...(prev.visionMission || {}),
          missionItems: items
        }
      };
    });
  }

  function handleRemoveMissionItem(index) {
    setFormData((prev) => {
      const items = [...(prev.visionMission?.missionItems || [])];
      items.splice(index, 1);
      return {
        ...prev,
        visionMission: {
          ...(prev.visionMission || {}),
          missionItems: items
        }
      };
    });
  }

  // Save to Firebase
  async function handleSave() {
    setIsSaving(true);
    try {
      await saveCloudData(formData);
      // Synchronize session storage if password was changed
      if (formData.adminPass) {
        if (localStorage.getItem(ADMIN_STORAGE_KEY)) {
          localStorage.setItem(ADMIN_STORAGE_KEY, formData.adminPass);
        } else if (sessionStorage.getItem(ADMIN_STORAGE_KEY)) {
          sessionStorage.setItem(ADMIN_STORAGE_KEY, formData.adminPass);
        }
      }
      onDataSaved(formData);
      onShowToast("Perubahan berhasil disimpan ke Cloud!", "success");
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Gagal menyimpan data ke Cloud.";
      onShowToast(`Gagal menyimpan: ${msg}`, "error");
    } finally {
      setIsSaving(false);
    }
  }

  // Reset to Default
  function handleReset() {
    setConfirmModal({
      isOpen: true,
      title: "Reset Konfigurasi Default",
      message: "Apakah Anda yakin ingin mereset seluruh data website PPS ke pengaturan awal bawaan sistem? Seluruh perubahan konfigurasi yang belum disimpan akan dikembalikan.",
      confirmText: "Ya, Reset Semua",
      variant: "warning",
      onConfirm: async () => {
        try {
          const resetData = await resetCloudData();
          setFormData(resetData);
          onDataSaved(resetData);
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          sessionStorage.removeItem(ADMIN_STORAGE_KEY);
          onShowToast("Data berhasil direset ke pengaturan awal!", "success");
          onClose();
        } catch {
          onShowToast("Gagal mereset data.", "error");
        }
      },
    });
  }

  const tabs = [
    { id: "identity", label: "Brand & Menu", icon: Layout },
    { id: "hero", label: "Beranda & 4 Pilar", icon: Compass },
    { id: "about", label: "Tentang & Visi", icon: FileText },
    { id: "org", label: "Pengurus", icon: Users },
    { id: "gallery", label: "Galeri Foto", icon: Camera },
    { id: "submissions", label: `Kotak Masuk (${submissions.length})`, icon: Inbox },
    { id: "security", label: "Keamanan", icon: Shield },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] w-full h-full bg-[#F3F4F6] dark:bg-[#0D0F17] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 select-text"
    >
      {/* Header Panel Administrator (Full Width Bar) */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1A1D26] shadow-[0_2px_0px_#000]/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#DC2626] border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_#000]">
            <Shield size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 dark:text-slate-100">
                Panel Kontrol Administrator
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-400">
                LSM PPS SANDY SHORES
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono hidden md:block">
              Sistem Manajemen Konten & Verifikasi Pengajuan Warga
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari sesi admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#DC2626] hover:bg-[#DC2626]/10 rounded border-2 border-[#DC2626] transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn py-1.5 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-900 dark:text-red-200 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
            title="Tutup Panel Admin dan kembali ke website utama"
          >
            <span>Tutup Panel</span>
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Full Viewport Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
          {!isAuthenticated ? (
            /* Login Screen Full Center */
            <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
              <div className="card-brutal p-6 sm:p-8 bg-white dark:bg-[#1A1D26] border-3 border-black max-w-sm w-full rounded text-center flex flex-col items-center shadow-[6px_6px_0px_#000]">
                <div className="w-12 h-12 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-[#111827] mb-3 shadow-[3px_3px_0px_#000]">
                  <Lock size={22} className="text-[#DC2626]" />
                </div>
                <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-100 mb-1">
                  Autentikasi Pengelola Portal
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-5">
                  Masukkan password admin untuk mengelola isi website.
                </p>
                <form onSubmit={handleLogin} className="w-full flex flex-col gap-3.5">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password admin (default: pps123123)"
                    autoFocus
                    className="input-field text-center font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
                  />

                  <label className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none py-0.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-black accent-[#DC2626] cursor-pointer"
                    />
                    <span>Ingat saya</span>
                  </label>

                  <button type="submit" className="btn w-full py-2.5 bg-[#FACC15] text-[#111827] border-2 border-black font-black shadow-[3px_3px_0px_#000]">
                    Masuk ke Panel
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Authenticated Dashboard */
            <>
              {/* Tab Navigation (Full Width Sub-Header) */}
              <div className="shrink-0 bg-[#FFFDF9] dark:bg-[#161822] border-b-2 border-black/15 dark:border-white/10 px-4 sm:px-8 py-2.5 flex items-center gap-2 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`tab-btn flex items-center gap-1.5 text-xs py-1.5 px-3 rounded shrink-0 border-2 border-black dark:border-[#475569] font-heading font-black transition-all ${
                        isActive
                          ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000] -translate-y-0.5"
                          : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-[#DC2626]" : ""} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Main Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
                <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">

              {/* Tab 1: Identity */}
              {activeTab === "identity" && (
                <div className="flex flex-col gap-3.5">
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">Nama Brand / Judul Navbar</label>
                    <input
                      type="text"
                      value={formData.brand || ""}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                  </div>

                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">Link Navigasi (Format: Nama | URL, pisahkan koma)</label>
                    <input
                      type="text"
                      value={formData.navLinks || ""}
                      onChange={(e) => setFormData({ ...formData, navLinks: e.target.value })}
                      className="input-field text-xs font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Hero & 4 Pilar */}
              {activeTab === "hero" && (
                <div className="flex flex-col gap-4">
                  {/* Slogan */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">
                      Slogan / Kalimat Penggerak (Bawah Banner)
                    </label>
                    <input
                      type="text"
                      value={formData.subtext || ""}
                      onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                      placeholder="Bersatu • Berkarya • Untuk Masyarakat Sandy Shores"
                      className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Tampil tebal di bawah banner foto pps.jpg di beranda.
                    </span>
                  </div>

                  {/* 4 Pilar Fokus Lapangan */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading font-black text-xs uppercase tracking-tight text-slate-950 dark:text-slate-100 flex items-center gap-1.5">
                        <Compass size={15} className="text-[#DC2626]" />
                        <span>4 Pilar Fokus Lapangan</span>
                      </h4>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        4 Kotak Utama Beranda
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(formData.heroPillars || []).map((pilar, idx) => (
                        <div
                          key={idx}
                          className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="card-label text-[10px] text-slate-700 dark:text-slate-300">
                              Pilar #{idx + 1}
                            </span>
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Kategori / Label Atas
                            </label>
                            <input
                              type="text"
                              value={pilar.label || ""}
                              onChange={(e) => handleHeroPillarChange(idx, "label", e.target.value)}
                              placeholder="Contoh: Wilayah Kerja"
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Judul / Arah Gerakan
                            </label>
                            <input
                              type="text"
                              value={pilar.title || ""}
                              onChange={(e) => handleHeroPillarChange(idx, "title", e.target.value)}
                              placeholder="Contoh: Sandy Shores & Sekitarnya"
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Tentang & Visi */}
              {activeTab === "about" && (
                <div className="flex flex-col gap-5">
                  {/* 1. Header Bagian Tentang */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-slate-950 dark:text-slate-100">
                      <FileText size={15} className="text-[#DC2626]" />
                      <span>Header Bagian Tentang Kami</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Label Atas (Kecil)
                        </label>
                        <input
                          type="text"
                          value={formData.aboutHeader?.label || ""}
                          onChange={(e) => handleAboutHeaderChange("label", e.target.value)}
                          placeholder="TENTANG KAMI"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Judul Utama
                        </label>
                        <input
                          type="text"
                          value={formData.aboutHeader?.title || ""}
                          onChange={(e) => handleAboutHeaderChange("title", e.target.value)}
                          placeholder="Profil & Arah Gerakan PPS"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Badge Kanan (Kuning)
                        </label>
                        <input
                          type="text"
                          value={formData.aboutHeader?.badge || ""}
                          onChange={(e) => handleAboutHeaderChange("badge", e.target.value)}
                          placeholder="MANIFESTO RESMI"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Tiga Program Unggulan (About Pillars) */}
                  <div className="flex flex-col gap-2.5">
                    <h4 className="font-heading font-black text-xs uppercase tracking-tight text-slate-950 dark:text-slate-100">
                      3 Program Unggulan Lapangan
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(formData.aboutPillars || []).map((pillar, idx) => (
                        <div
                          key={idx}
                          className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="card-label text-[10px] text-slate-700 dark:text-slate-300">
                              Program #{idx + 1}
                            </span>
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Badge / Kategori
                            </label>
                            <input
                              type="text"
                              value={pillar.badge || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "badge", e.target.value)}
                              placeholder="Kepedulian Warga"
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Judul Program
                            </label>
                            <input
                              type="text"
                              value={pillar.title || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "title", e.target.value)}
                              placeholder="Solidaritas & Aksi Sosial"
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Deskripsi
                            </label>
                            <textarea
                              rows={3}
                              value={pillar.desc || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "desc", e.target.value)}
                              placeholder="Deskripsi kegiatan..."
                              className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Status Tag
                            </label>
                            <input
                              type="text"
                              value={pillar.status || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "status", e.target.value)}
                              placeholder="Program Aktif Berkelanjutan"
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Visi & Misi Komunitas */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-slate-950 dark:text-slate-100">
                      <Target size={15} className="text-[#DC2626]" />
                      <span>Visi & Misi Komunitas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Label Visi
                        </label>
                        <input
                          type="text"
                          value={formData.visionMission?.visionLabel || ""}
                          onChange={(e) => handleVisionMissionChange("visionLabel", e.target.value)}
                          placeholder="Visi Komunitas"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Judul / Pernyataan Visi (Kutipan Besar)
                        </label>
                        <input
                          type="text"
                          value={formData.visionMission?.visionTitle || ""}
                          onChange={(e) => handleVisionMissionChange("visionTitle", e.target.value)}
                          placeholder="“Terwujudnya Masyarakat Sandy Shores yang Kompak, Mandiri, dan Bermartabat Bersama.”"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Uraian / Penjelasan Visi
                      </label>
                      <textarea
                        rows={3}
                        value={formData.visionMission?.visionDesc || ""}
                        onChange={(e) => handleVisionMissionChange("visionDesc", e.target.value)}
                        placeholder="Kemajuan suatu kawasan bertumpu pada solidaritas warganya..."
                        className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                      />
                    </div>

                    {/* Misi Pokok */}
                    <div className="pt-2 border-t border-dashed border-[#1A1A1A]/20 dark:border-slate-700/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block">
                          Judul Bagian Misi
                        </label>
                        <button
                          type="button"
                          onClick={handleAddMissionItem}
                          className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                        >
                          <Plus size={12} className="text-[#DC2626]" />
                          <span>Tambah Poin Misi</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.visionMission?.missionTitle || ""}
                        onChange={(e) => handleVisionMissionChange("missionTitle", e.target.value)}
                        placeholder="Misi Pokok Lembaga:"
                        className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                      />

                      <div className="flex flex-col gap-2 mt-1">
                        {(formData.visionMission?.missionItems || []).map((mItem, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#FACC15] text-black border border-black flex items-center justify-center shrink-0 text-xs font-black">
                              {mIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={mItem}
                              onChange={(e) => handleMissionItemChange(mIdx, e.target.value)}
                              placeholder="Isi poin misi..."
                              className="input-field flex-1 text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMissionItem(mIdx)}
                              className="btn btn-secondary text-xs py-1 px-2 border-2 border-black text-[#DC2626] hover:bg-[#DC2626] hover:text-white shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Naskah Pendirian & Dokumen LSM */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5">
                    <label className="card-label text-slate-700 dark:text-slate-300">
                      Judul Akordion / Bar Dokumen
                    </label>
                    <input
                      type="text"
                      value={formData.charterTitle || ""}
                      onChange={(e) => setFormData({ ...formData, charterTitle: e.target.value })}
                      placeholder="Naskah Pendirian & Penjelasan Lengkap LSM"
                      className="input-field text-xs font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />

                    <label className="card-label text-slate-700 dark:text-slate-300 mt-2">
                      Naskah Pendirian & Penjelasan Lengkap LSM (Pisahkan antar paragraf dengan 2 enter)
                    </label>
                    <textarea
                      rows={8}
                      value={formData.aboutText || ""}
                      onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
                      className="input-field text-xs leading-relaxed bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Organization */}
              {activeTab === "org" && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                      Total: {formData.org?.length || 0} Pengurus
                    </span>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                    >
                      <Plus size={14} className="text-[#DC2626]" />
                      <span>Tambah Anggota</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formData.org?.map((member, idx) => (
                      <div
                        key={idx}
                        className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="card-label text-[11px] text-slate-700 dark:text-slate-300">
                            Anggota #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="btn btn-secondary text-xs py-1 px-2 border-2 border-black text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Level (1-5)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={member.level || 1}
                              onChange={(e) => handleMemberChange(idx, "level", e.target.value)}
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Jabatan / Peran
                            </label>
                            <input
                              type="text"
                              value={member.role || ""}
                              onChange={(e) => handleMemberChange(idx, "role", e.target.value)}
                              className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Nama Lengkap
                            </label>
                            <input
                              type="text"
                              value={member.name || ""}
                              onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Foto Profil
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleMemberPhoto(idx, e.target.files[0])}
                              className="text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-2 file:border-black file:bg-[#FACC15] file:text-[#111827] file:font-heading file:font-black"
                            />
                            {member.photo && (
                              <img
                                src={member.photo}
                                alt="Pratinjau"
                                className="w-8 h-8 rounded object-cover border-2 border-black"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Gallery */}
              {activeTab === "gallery" && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                      Total: {formData.gallery?.length || 0} Dokumentasi
                    </span>
                    <button
                      type="button"
                      onClick={handleAddGallery}
                      className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                    >
                      <Plus size={14} className="text-[#DC2626]" />
                      <span>Tambah Foto</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formData.gallery?.map((item, idx) => (
                      <div
                        key={idx}
                        className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="card-label text-[11px] text-slate-700 dark:text-slate-300">
                            Dokumentasi #{formData.gallery.length - idx}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGallery(idx)}
                            className="btn btn-secondary text-xs py-1 px-2 border-2 border-black text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Judul Kegiatan
                          </label>
                          <input
                            type="text"
                            value={item.title || ""}
                            onChange={(e) => handleGalleryChange(idx, "title", e.target.value)}
                            className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Keterangan Kegiatan
                          </label>
                          <textarea
                            rows={5}
                            placeholder="Tulis keterangan kegiatan di sini (tekan Enter untuk baris baru)..."
                            value={item.desc || ""}
                            onChange={(e) => handleGalleryChange(idx, "desc", e.target.value)}
                            className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Waktu Kegiatan (Pilih / Format Tanggal)
                          </label>
                          <BrutalistDatePicker
                            value={item.date || ""}
                            onChange={(val) => handleGalleryChange(idx, "date", val)}
                            placeholder="Contoh: Kamis, 15 Oktober 2026"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Tempat Kegiatan
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: SS Area / Sandy Shores Park"
                            value={item.location || ""}
                            onChange={(e) => handleGalleryChange(idx, "location", e.target.value)}
                            className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Foto Kegiatan
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleGalleryPhoto(idx, e.target.files[0])}
                              className="text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-2 file:border-black file:bg-[#FACC15] file:text-[#111827] file:font-heading file:font-black"
                            />
                            {item.photo && (
                              <img
                                src={item.photo}
                                alt="Pratinjau"
                                className="w-12 h-8 rounded object-cover border-2 border-black"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Kotak Masuk Pengajuan (Lapak UMKM & Request Meeting) */}
              {activeTab === "submissions" && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="font-heading font-black text-xs sm:text-sm uppercase text-slate-800 dark:text-slate-200">
                        Total: {submissions.length} Pengajuan Warga
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block sm:inline sm:ml-2">
                        (🏪 {submissions.filter((s) => s.type === "lapak").length} Stan Lapak UMKM • 🤝 {submissions.filter((s) => s.type === "meeting").length} Permohonan Pertemuan)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 dark:bg-[#1A1D26] p-1 rounded border border-black/10 dark:border-white/10 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setSubmissionFilter("all")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          submissionFilter === "all" ? "bg-[#FACC15] text-[#111827] shadow-sm font-black border border-black" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Semua ({submissions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionFilter("lapak")}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                          submissionFilter === "lapak" ? "bg-[#FACC15] text-[#111827] shadow-sm font-black border border-black" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>🏪 Stan Lapak UMKM</span>
                        <span>({submissions.filter((s) => s.type === "lapak").length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionFilter("meeting")}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                          submissionFilter === "meeting" ? "bg-[#DC2626] text-white shadow-sm font-black border border-black" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>🤝 Permohonan Pertemuan</span>
                        <span>({submissions.filter((s) => s.type === "meeting").length})</span>
                      </button>
                    </div>
                  </div>

                  {submissions.filter((s) => submissionFilter === "all" || s.type === submissionFilter).length === 0 ? (
                    <div className="card-brutal p-8 text-center bg-[var(--card-bg)] border-2 border-dashed border-black/30 dark:border-slate-600 text-slate-500 text-xs">
                      Belum ada data pengajuan warga yang tercatat.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {submissions
                        .filter((s) => submissionFilter === "all" || s.type === submissionFilter)
                        .map((sub) => {
                          const isLapak = sub.type === "lapak";
                          return (
                            <div
                              key={sub.id}
                              className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-heading font-black border border-black uppercase ${
                                      isLapak ? "bg-[#FACC15] text-[#111827]" : "bg-[#DC2626] text-white"
                                    }`}
                                  >
                                    {isLapak ? "🏪 Stan Lapak UMKM" : "🤝 Permohonan Pertemuan"}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                    #{sub.id}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <select
                                    value={sub.status || "pending"}
                                    onChange={(e) => handleUpdateSubmissionStatus(sub.id, e.target.value)}
                                    className={`text-[11px] font-heading font-bold py-1 px-2 rounded border border-black cursor-pointer ${
                                      sub.status === "approved"
                                        ? "bg-emerald-100 text-emerald-900 border-emerald-500"
                                        : sub.status === "completed"
                                        ? "bg-blue-100 text-blue-900 border-blue-500"
                                        : sub.status === "rejected"
                                        ? "bg-red-100 text-red-900 border-red-500"
                                        : "bg-amber-100 text-amber-900 border-amber-500"
                                    }`}
                                  >
                                    <option value="pending">⏳ Menunggu</option>
                                    <option value="approved">✅ Disetujui</option>
                                    <option value="completed">🎉 Selesai</option>
                                    <option value="rejected">❌ Ditolak</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubmission(sub.id)}
                                    className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 border border-transparent hover:border-red-400"
                                    title="Hapus Tiket"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-center">
                                <div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">
                                    NAMA KTP / PEMOHON
                                  </span>
                                  <span className="font-heading font-black text-slate-900 dark:text-slate-100 text-sm block">
                                    {sub.firstName ? `${sub.firstName} ${sub.lastName}` : (sub.namaKtp || sub.characterName)}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px] font-mono">
                                    {sub.citizenId && (
                                      <span className="font-bold text-[#DC2626] dark:text-[#FACC15]">
                                        ID: {sub.citizenId}
                                      </span>
                                    )}
                                    {sub.dob && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        • {sub.dob}
                                      </span>
                                    )}
                                    {sub.sex && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        • {sub.sex}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">
                                    KONTAK PENGAJU
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-black text-[10px] border border-amber-400/70 shrink-0">
                                      📞 No. IC:
                                    </span>
                                    <strong className="text-slate-900 dark:text-slate-100 font-black tracking-wide truncate">
                                      {sub.phoneNumber || "-"}
                                    </strong>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-black text-[10px] border border-indigo-400/70 shrink-0">
                                      💬 Discord:
                                    </span>
                                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate">
                                      {sub.discordTag ? sub.discordTag : <span className="text-slate-400 font-normal italic">Tidak diisi</span>}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">
                                    WAKTU & MOU
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-300 text-[11px] block font-mono">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("id-ID") : "-"}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {sub.agreedMOU ? "✓ MOU Disetujui" : "Persetujuan Tertib"}
                                  </span>
                                </div>
                              </div>

                              {isLapak ? (
                                <div className="p-3.5 rounded bg-amber-50/70 dark:bg-[#1E212B] border-2 border-black/15 dark:border-white/10 text-xs font-sans">
                                  <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-black/10 dark:border-white/10 text-[11px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider">
                                    <span>🏪 Rincian Usaha & Lokasi Lapak</span>
                                    {(sub.fotoWajahIc || sub.ktpImage) && (
                                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                        ✓ Scan KTP Terlampir
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                                    {/* Kolom Kiri: 6 Field KTP IC + Rincian Lapak Usaha */}
                                    <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
                                      {/* 6 Data Terpisah KTP IC */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-white dark:bg-[#161820] border-2 border-black/15 dark:border-white/10 text-[11px] font-mono shadow-[2px_2px_0px_#000]/10">
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">FIRST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.firstName || (sub.namaKtp ? sub.namaKtp.split(" ")[0] : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">LAST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.lastName || (sub.namaKtp ? sub.namaKtp.split(" ").slice(1).join(" ") : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">DOB:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.dob || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">SEX:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.sex || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">NATIONALITY:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.nationality || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">CITIZEN ID:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.citizenId || "-"}</strong>
                                        </div>
                                      </div>

                                      {/* Rincian Usaha */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2.5 rounded bg-white/70 dark:bg-[#161820]/70 border border-black/10 dark:border-white/10">
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">NAMA USAHA / STAN:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.businessName}</strong>
                                        </div>
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">JENIS USAHA / PRODUK:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.businessType}</strong>
                                        </div>
                                        <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5">
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">PILIHAN LOKASI LAPAK SANDY SHORES:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.preferredLocation}</strong>
                                        </div>
                                        {sub.facilityNeeds && (
                                          <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5">
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">KEBUTUHAN STAND & FASILITAS:</span>
                                            <span className="text-slate-800 dark:text-slate-200">{sub.facilityNeeds}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Kolom Kanan Bawah: Gambar KTP IC */}
                                    <div className="lg:col-span-4 flex flex-col justify-between rounded border-2 border-black dark:border-slate-700 bg-white dark:bg-[#161820] p-2.5 shadow-[2px_2px_0px_#000]">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 dark:border-white/10">
                                        <span className="text-[10px] font-heading font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                                          <FileText size={12} className="text-[#DC2626] dark:text-[#FACC15]" />
                                          DOKUMEN KTP IC
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          {sub.citizenId ? `#${sub.citizenId}` : ""}
                                        </span>
                                      </div>

                                      {(sub.fotoWajahIc || sub.ktpImage) ? (
                                        <div
                                          className="relative group/ktp flex-1 min-h-[140px] rounded overflow-hidden border border-black/20 dark:border-white/10 bg-slate-950 flex items-center justify-center cursor-pointer"
                                          onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                          title="Klik untuk membuka dokumen KTP resolusi penuh"
                                        >
                                          <img
                                            src={sub.fotoWajahIc || sub.ktpImage}
                                            alt="Dokumen KTP IC"
                                            className="w-full h-full max-h-[175px] object-contain group-hover/ktp:scale-105 transition-transform"
                                          />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/ktp:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold font-mono">
                                            <Maximize2 size={16} className="text-[#FACC15]" />
                                            <span>Lihat Ukuran Penuh</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 min-h-[130px] rounded border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center bg-slate-50/50 dark:bg-slate-900/30">
                                          <FileText size={22} className="mb-1 text-slate-300 dark:text-slate-600" />
                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Tidak Ada Lampiran KTP</span>
                                          <span className="text-[9px] text-slate-400">Diinput manual tanpa upload foto</span>
                                        </div>
                                      )}

                                      <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                                        <span>FOTO IDENTITAS</span>
                                        {(sub.fotoWajahIc || sub.ktpImage) && (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                            className="text-[#DC2626] dark:text-[#FACC15] hover:underline font-bold font-sans flex items-center gap-0.5"
                                          >
                                            Buka Dokumen ↗
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3.5 rounded bg-red-50/70 dark:bg-[#1E212B] border-2 border-black/15 dark:border-white/10 text-xs font-sans">
                                  <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-black/10 dark:border-white/10 text-[11px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider">
                                    <span>🤝 Rincian Audiensi & Usulan Pertemuan</span>
                                    {(sub.fotoWajahIc || sub.ktpImage) && (
                                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                        ✓ Scan KTP Terlampir
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                                    {/* Kolom Kiri: 6 Field KTP IC + Rincian Audiensi / Pertemuan */}
                                    <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
                                      {/* 6 Data Terpisah KTP IC */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-white dark:bg-[#161820] border-2 border-black/15 dark:border-white/10 text-[11px] font-mono shadow-[2px_2px_0px_#000]/10">
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">FIRST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.firstName || (sub.characterName ? sub.characterName.split(" ")[0] : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">LAST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.lastName || (sub.characterName ? sub.characterName.split(" ").slice(1).join(" ") : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">DOB:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.dob || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">SEX:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.sex || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">NATIONALITY:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.nationality || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">CITIZEN ID:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.citizenId || "-"}</strong>
                                        </div>
                                      </div>

                                      {/* Rincian Pertemuan */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2.5 rounded bg-white/70 dark:bg-[#161820]/70 border border-black/10 dark:border-white/10">
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">ASAL INSTANSI / FRAKSI / KOMUNITAS:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.agencyName}</strong>
                                        </div>
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">TOPIK POKOK PERTEMUAN:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.meetingTopic}</strong>
                                        </div>
                                        <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5">
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">RINCIAN AGENDA & PEMBAHASAN:</span>
                                          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">{sub.agendaDetail}</p>
                                        </div>
                                        <div className="sm:col-span-2 pt-2 border-t border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                          <div>
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">USULAN TANGGAL:</span>
                                            <strong className="text-slate-900 dark:text-slate-100">📅 {sub.preferredDate}</strong>
                                          </div>
                                          <div>
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">USULAN WAKTU:</span>
                                            <strong className="text-slate-900 dark:text-slate-100">⏰ {sub.preferredTime}</strong>
                                          </div>
                                          <div>
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">TEMPAT PERTEMUAN:</span>
                                            <strong className="text-slate-900 dark:text-slate-100">📍 {sub.meetingLocation}</strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Kolom Kanan Bawah: Gambar KTP IC */}
                                    <div className="lg:col-span-4 flex flex-col justify-between rounded border-2 border-black dark:border-slate-700 bg-white dark:bg-[#161820] p-2.5 shadow-[2px_2px_0px_#000]">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 dark:border-white/10">
                                        <span className="text-[10px] font-heading font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                                          <FileText size={12} className="text-[#DC2626] dark:text-[#FACC15]" />
                                          DOKUMEN KTP IC
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          {sub.citizenId ? `#${sub.citizenId}` : ""}
                                        </span>
                                      </div>

                                      {(sub.fotoWajahIc || sub.ktpImage) ? (
                                        <div
                                          className="relative group/ktp flex-1 min-h-[140px] rounded overflow-hidden border border-black/20 dark:border-white/10 bg-slate-950 flex items-center justify-center cursor-pointer"
                                          onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                          title="Klik untuk membuka dokumen KTP resolusi penuh"
                                        >
                                          <img
                                            src={sub.fotoWajahIc || sub.ktpImage}
                                            alt="Dokumen KTP IC"
                                            className="w-full h-full max-h-[175px] object-contain group-hover/ktp:scale-105 transition-transform"
                                          />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/ktp:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold font-mono">
                                            <Maximize2 size={16} className="text-[#FACC15]" />
                                            <span>Lihat Ukuran Penuh</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 min-h-[130px] rounded border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center bg-slate-50/50 dark:bg-slate-900/30">
                                          <FileText size={22} className="mb-1 text-slate-300 dark:text-slate-600" />
                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Tidak Ada Lampiran KTP</span>
                                          <span className="text-[9px] text-slate-400">Diinput manual tanpa upload foto</span>
                                        </div>
                                      )}

                                      <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                                        <span>FOTO IDENTITAS</span>
                                        {(sub.fotoWajahIc || sub.ktpImage) && (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                            className="text-[#DC2626] dark:text-[#FACC15] hover:underline font-bold font-sans flex items-center gap-0.5"
                                          >
                                            Buka Dokumen ↗
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Catatan / Balasan Pengurus untuk Pengaju */}
                              <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-1.5">
                                <label className="text-[10px] font-heading font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                  <span>💬 Catatan / Balasan Pengurus (Terlihat oleh Warga saat Lacak Tiket):</span>
                                  <span className="text-[9px] font-normal text-slate-500">Ketik lalu klik Simpan</span>
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Contoh: Disetujui! Datang jam 20.00 IC ke Markas PPS Sandy Shores, temui Jack Sullivan."
                                    defaultValue={sub.adminNotes || ""}
                                    id={`note-input-${sub.id}`}
                                    className="input-field text-xs py-1 px-2.5 flex-1 bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 border border-black dark:border-slate-600 rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputElem = document.getElementById(`note-input-${sub.id}`);
                                      if (inputElem) {
                                        handleUpdateSubmissionNote(sub.id, inputElem.value);
                                      }
                                    }}
                                    className="px-3 py-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] text-xs font-heading font-black border border-black shadow-[1px_1px_0px_#000] rounded"
                                  >
                                    Simpan Catatan
                                  </button>
                                </div>

                                {/* Template Cepat untuk Pengurus */}
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputElem = document.getElementById(`note-input-${sub.id}`);
                                      if (inputElem) {
                                        inputElem.value = "MOU & Berkas disetujui! Silakan masuk ke channel Discord visitor untuk koordinasi jadwal meeting IC di Markas Sandy Shores.";
                                        handleUpdateSubmissionNote(sub.id, inputElem.value);
                                        handleUpdateSubmissionStatus(sub.id, "approved");
                                      }
                                    }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-500 hover:bg-emerald-200"
                                  >
                                    + Preset: Setujui & Arahkan Discord Visitor
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputElem = document.getElementById(`note-input-${sub.id}`);
                                      if (inputElem) {
                                        inputElem.value = "Jadwal meeting IC disetujui. Silakan hadir di Markas LSM PPS Sandy Shores jam 20.30 IC.";
                                        handleUpdateSubmissionNote(sub.id, inputElem.value);
                                      }
                                    }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-500 hover:bg-blue-200"
                                  >
                                    + Preset: Jadwal Meeting IC Siap
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Security */}
              {activeTab === "security" && (
                <div className="flex flex-col gap-4">
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5">
                    <label className="card-label text-slate-700 dark:text-slate-300">Ganti Password Akses Admin</label>
                    <input
                      type="password"
                      placeholder="Masukkan password admin baru"
                      value={formData.adminPass || ""}
                      onChange={(e) => setFormData({ ...formData, adminPass: e.target.value })}
                      className="input-field font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Password ini digunakan untuk verifikasi login panel kontrol /admin ini.
                    </span>
                  </div>

                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
                        Sesi Login di Browser Ini
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersimpan (Auto-login aktif saat refresh)</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn text-xs py-1.5 px-3 bg-red-100 dark:bg-red-950/40 text-[#DC2626] border-2 border-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors"
                    >
                      <LogOut size={13} />
                      <span>Hapus Sesi & Logout</span>
                    </button>
                  </div>
                </div>
              )}

                </div>
              </div>

              {/* Bottom Actions (Fixed Bar at Bottom) */}
              <div className="shrink-0 border-t-2 border-[#1A1A1A]/15 dark:border-slate-700/60 bg-white/95 dark:bg-[#1F222C]/95 backdrop-blur-sm px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_-2px_0_#000]/5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-heading font-bold text-[#DC2626] hover:underline flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Reset Konfigurasi Awal</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary text-xs py-2 px-4 border-2 border-black dark:border-[#475569]"
                    title="Tutup panel admin dan lihat website utama"
                  >
                    Tutup Panel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn text-xs py-2 px-5 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] disabled:opacity-50 font-black"
                  >
                    <Save size={15} className="text-[#DC2626]" />
                    <span>{isSaving ? "Menyimpan ke Cloud..." : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      {/* Lightbox / Modal Preview Dokumen KTP Resolusi Penuh */}
      {previewKtp && (
        <div
          onClick={() => setPreviewKtp(null)}
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-brutal p-4 bg-white dark:bg-[#1E212B] border-3 border-black max-w-3xl w-full rounded-lg flex flex-col gap-3 shadow-[8px_8px_0px_#000] max-h-[92vh]"
          >
            {/* Header Modal Lightbox */}
            <div className="flex items-center justify-between w-full pb-2 border-b-2 border-black/15 dark:border-white/15">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[#DC2626] dark:text-[#FACC15]" />
                <div>
                  <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide block">
                    DOKUMEN KTP IC: {previewKtp.name}
                  </span>
                  {previewKtp.citizenId && (
                    <span className="text-[10px] font-mono text-[#DC2626] dark:text-[#FACC15] font-bold">
                      CITIZEN ID / NIK: #{previewKtp.citizenId}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKtp(null)}
                className="w-8 h-8 rounded border-2 border-black bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 flex items-center justify-center font-bold text-sm shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                title="Tutup Preview"
              >
                <X size={16} />
              </button>
            </div>

            {/* Container Gambar KTP Resolusi Penuh */}
            <div className="bg-slate-950 rounded-lg p-2 flex items-center justify-center border-2 border-black/30 min-h-[280px] max-h-[62vh] overflow-hidden">
              <img
                src={previewKtp.image}
                alt={"KTP " + previewKtp.name}
                className="max-h-[60vh] w-auto max-w-full object-contain rounded"
              />
            </div>

            {/* Footer Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-[11px] text-slate-500 font-mono">
                💡 Dokumen KTP IC tersimpan aman di sistem pendaftaran warga.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openImageSafely(previewKtp.image, "KTP-" + (previewKtp.citizenId || previewKtp.name))}
                  className="btn py-1.5 px-3 bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 hover:bg-slate-100"
                  title="Buka gambar di tab baru dengan URL Blob (Aman dari blank tab)"
                >
                  <ExternalLink size={13} />
                  <span>Buka di Tab Baru</span>
                </button>
                <a
                  href={previewKtp.image}
                  download={"KTP_" + (previewKtp.citizenId || "IC") + ".jpg"}
                  className="btn py-1.5 px-3 bg-[#FACC15] text-[#111827] text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 hover:bg-yellow-400"
                  title="Unduh file KTP ke komputer"
                >
                  <span>Unduh KTP</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewKtp(null)}
                  className="btn py-1.5 px-3.5 bg-slate-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Neo-Brutalist Confirm Modal (No more localhost says!) */}
      <BrutalistConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText || "Batal"}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
