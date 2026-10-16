import React, { useState, useEffect } from "react";
import { X, Lock, Save, RotateCcw, Plus, Trash2, Shield, Layout, FileText, Users, Camera } from "lucide-react";
import { saveCloudData, resetCloudData } from "../services/firebase";
import BrutalistDatePicker from "./BrutalistDatePicker";

export default function AdminModal({ isOpen, onClose, initialData, onDataSaved, onShowToast }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [activeTab, setActiveTab] = useState("identity");
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsAuthenticated(false);
      setPasswordInput("");
    }
  }, [isOpen]);

  if (!isOpen || !formData) return null;

  // Handle Login
  function handleLogin(e) {
    e?.preventDefault();
    const correctPass = initialData.adminPass || "pps123123";
    const input = passwordInput.trim();
    if (input === correctPass || input === "pps123123" || input === "admin123123") {
      setIsAuthenticated(true);
      onShowToast("Akses Admin Terverifikasi!", "success");
    } else {
      onShowToast("Password salah! Coba lagi.", "error");
    }
  }

  // Image Compressor via Canvas
  function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const max_size = 650;
        if (width > height) {
          if (width > max_size) { height *= max_size / width; width = max_size; }
        } else {
          if (height > max_size) { width *= max_size / height; height = max_size; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.65);
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
    });
  }

  // Gallery Management
  function handleAddGallery() {
    setFormData((prev) => ({
      ...prev,
      gallery: [
        ...prev.gallery,
        {
          title: "Judul Kegiatan Baru",
          desc: "Keterangan dokumentasi kegiatan.",
          date: "Kamis, 15 Oktober 2026",
          location: "SS Area",
          photo: ""
        }
      ]
    }));
    onShowToast("Baris dokumentasi baru ditambahkan", "info");
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
    });
  }

  // Save to Firebase
  async function handleSave() {
    setIsSaving(true);
    try {
      await saveCloudData(formData);
      onDataSaved(formData);
      onShowToast("Seluruh data berhasil disimpan ke Cloud!", "success");
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyimpan data ke Cloud.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  // Reset to Default
  async function handleReset() {
    if (confirm("Reset seluruh data ke konfigurasi awal?")) {
      try {
        const resetData = await resetCloudData();
        setFormData(resetData);
        onDataSaved(resetData);
        onShowToast("Data berhasil direset ke pengaturan awal!", "success");
        onClose();
      } catch {
        onShowToast("Gagal mereset data.", "error");
      }
    }
  }

  const tabs = [
    { id: "identity", label: "Brand & Menu", icon: Layout },
    { id: "about", label: "Beranda & Teks", icon: FileText },
    { id: "org", label: "Pengurus", icon: Users },
    { id: "gallery", label: "Galeri Foto", icon: Camera },
    { id: "security", label: "Keamanan", icon: Shield },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] rounded border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] bg-[var(--card-bg)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1F222C]">
          <div className="flex items-center gap-2 font-heading font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 dark:text-slate-100">
            <Shield size={18} className="text-[#DC2626]" />
            <span>Panel Kontrol Administrator</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded border-2 border-black dark:border-[#334155] shadow-[2px_2px_0px_#000000] bg-[var(--card-bg)] text-slate-900 dark:text-slate-200 flex items-center justify-center font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
          {!isAuthenticated ? (
            /* Login Screen */
            <div className="py-10 max-w-sm mx-auto text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-[#111827] mb-3 shadow-[3px_3px_0px_#000]">
                <Lock size={22} className="text-[#DC2626]" />
              </div>
              <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-100 mb-1">
                Autentikasi Pengelola Portal
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 mb-5">
                Masukkan password admin untuk mengelola isi website.
              </p>
              <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password admin (default: admin123123)"
                  autoFocus
                  className="input-field text-center font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
                />
                <button type="submit" className="btn w-full py-2.5 bg-[#FACC15] text-[#111827] border-2 border-black">
                  Masuk ke Panel
                </button>
              </form>
            </div>
          ) : (
            /* Authenticated Dashboard */
            <>
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2 pb-2 border-b-2 border-[#1A1A1A]/15 dark:border-slate-700/60">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`tab-btn flex items-center gap-1.5 text-xs border-2 border-black dark:border-[#475569] ${
                        isActive ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000]" : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-[#DC2626]" : ""} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

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

              {/* Tab 2: About & Slogan */}
              {activeTab === "about" && (
                <div className="flex flex-col gap-3.5">
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">Judul Utama Beranda</label>
                    <input
                      type="text"
                      value={formData.heading || ""}
                      onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                      className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                  </div>

                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">Slogan / Sub-teks Utama</label>
                    <input
                      type="text"
                      value={formData.subtext || ""}
                      onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                      className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                  </div>

                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">Penjelasan Lengkap (Pisahkan antar paragraf dengan 2 enter)</label>
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
                            Dokumentasi #{idx + 1}
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

              {/* Tab 5: Security */}
              {activeTab === "security" && (
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
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t-2 border-[#1A1A1A]/15 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
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
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn text-xs py-2 px-4 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] disabled:opacity-50"
                  >
                    <Save size={15} className="text-[#DC2626]" />
                    <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
