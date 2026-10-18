import React, { useState } from "react";
import {
  X,
  UserPlus,
  Send,
  CheckCircle2,
  Phone,
  CreditCard,
  User,
  Sparkles,
  Camera,
  ScanLine,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { submitMemberCloud } from "../services/memberService";
import { scanKtpImage } from "../utils/ktpOcr";

const DISCORD_INVITE_URL = "https://discord.gg/TGKaHh8JhB";

export default function MemberRegistrationModal({ isOpen, onClose, onShowToast }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    icNumber: "",
    phone: "",
    profilePhoto: "",
    icPhoto: "",
    agreedMOU: false,
  });

  // OCR Scanning State for KTP
  const [isScanningKtp, setIsScanningKtp] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrSuccess, setOcrSuccess] = useState(null);

  if (!isOpen) return null;

  // Compress Profile Photo
  function handleCompressProfilePhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setFormData((prev) => ({ ...prev, profilePhoto: compressedBase64 }));
        if (onShowToast) onShowToast("Foto profil berhasil diunggah!", "success");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Handle KTP Upload + Auto-Scan OCR
  function handleKtpUploadWithOcr(file) {
    if (!file) return;

    // Generate compressed base64 preview for display & storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 750;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);

        // Store KTP image preview in form data
        setFormData((prev) => ({ ...prev, icPhoto: compressedBase64 }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Run OCR scan on original raw file for 100% text recognition accuracy
    setIsScanningKtp(true);
    setOcrProgress(0);
    setOcrSuccess(null);

    scanKtpImage(file, (prog) => {
      setOcrProgress(prog);
    })
      .then((scanResult) => {
        if (scanResult.success) {
          const { firstName, lastName, citizenId } = scanResult.fields;
          const scannedFullName = [firstName, lastName].filter(Boolean).join(" ").trim();

          setFormData((prev) => ({
            ...prev,
            fullName: scannedFullName || prev.fullName,
            icNumber: citizenId || prev.icNumber,
          }));

          if (scannedFullName || citizenId) {
            setOcrSuccess(true);
            if (onShowToast) {
              onShowToast(
                `KTP berhasil dipindai! ${scannedFullName ? `Nama: ${scannedFullName}` : ""} ${citizenId ? `• CID: ${citizenId}` : ""}`,
                "success"
              );
            }
          } else {
            setOcrSuccess(false);
            if (onShowToast) {
              onShowToast("Teks KTP belum terbaca jelas. Silakan isi Nama IC & No KTP secara manual.", "info");
            }
          }
        } else {
          setOcrSuccess(false);
          if (onShowToast) {
            onShowToast("Gagal memindai KTP otomatis. Anda tetap dapat mengisinya secara manual.", "info");
          }
        }
      })
      .catch((err) => {
        console.error("OCR error in MemberRegistrationModal:", err);
        setOcrSuccess(false);
      })
      .finally(() => {
        setIsScanningKtp(false);
      });
  }

  // Handle Submit Form
  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      if (onShowToast) onShowToast("Nama Lengkap IC wajib diisi sesuai KTP!", "error");
      return;
    }
    if (!formData.icNumber.trim()) {
      if (onShowToast) onShowToast("Citizen ID (No KTP IC) wajib diisi!", "error");
      return;
    }
    if (!formData.phone.trim()) {
      if (onShowToast) onShowToast("Nomor Telepon / WA IC wajib diisi!", "error");
      return;
    }
    if (!formData.profilePhoto) {
      if (onShowToast) onShowToast("Foto profil karakter IC wajib diunggah!", "error");
      return;
    }
    if (!formData.icPhoto) {
      if (onShowToast) onShowToast("Foto KTP IC wajib diunggah!", "error");
      return;
    }
    if (!formData.agreedMOU) {
      if (onShowToast) onShowToast("Wajib menyetujui pernyataan dan aturan LSM PPS!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMemberCloud(formData);
      setSubmittedData({
        id: result.id,
        fullName: formData.fullName.trim(),
        icNumber: formData.icNumber.trim(),
        phone: formData.phone.trim(),
      });
      if (onShowToast) {
        onShowToast("Pendaftaran Anggota berhasil dikirim ke Database!", "success");
      }
    } catch (err) {
      console.error("Submit member error:", err);
      if (onShowToast) onShowToast("Gagal mengirim pendaftaran. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCloseAndReset() {
    setSubmittedData(null);
    setFormData({
      fullName: "",
      icNumber: "",
      phone: "",
      profilePhoto: "",
      icPhoto: "",
      agreedMOU: false,
    });
    setOcrSuccess(null);
    setCopySuccess(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl max-h-[92vh] rounded border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] bg-[var(--card-bg)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1F222C]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-[#161820] border-2 border-black dark:border-[#475569] flex items-center justify-center shrink-0 p-1 shadow-[2px_2px_0px_#000]">
              <img
                src="/logo.png"
                alt="Logo LSM Paguyuban Pizza Sandy Shores"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] block">
                PENDAFTARAN ANGGOTA • LSM PPS
              </span>
              <h3 className="font-heading font-black text-sm sm:text-base md:text-lg text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                Formulir Anggota Paguyuban Sandy Shores
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAndReset}
            className="w-8 h-8 rounded border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-[var(--card-bg)] text-slate-900 dark:text-slate-200 flex items-center justify-center font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-transform cursor-pointer"
            title="Tutup Formulir"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {submittedData ? (
            /* Custom Success Screen (No Ticket Code, Direct Discord Action) */
            <div className="py-3 flex flex-col items-center text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white border-[3px] border-black flex items-center justify-center mb-3 shadow-[4px_4px_0px_#000] animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <span className="badge-brutal text-xs py-1 px-3 bg-[#FACC15] text-[#111827] border-2 border-black font-black mb-1.5 shadow-[2px_2px_0px_#000]">
                PENGAJUAN TERCATAT
              </span>

              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                Berkas Berhasil Diterima!
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 mb-4">
                Terima kasih telah mendaftar menjadi bagian dari keluarga besar LSM Paguyuban Pizza Sandy Shores.
              </p>

              {/* Status Points Container */}
              <div className="w-full text-left p-4 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000] flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] border-b pb-2 border-black/15 dark:border-white/15">
                  <ShieldCheck size={16} />
                  <span>INSTRUKSI LANGKAH SELANJUTNYA:</span>
                </div>

                <div className="text-xs space-y-3 text-slate-800 dark:text-slate-200">
                  {/* Point 1 */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#111827] font-black flex items-center justify-center shrink-0 text-[11px] shadow-sm">
                      1
                    </span>
                    <div className="leading-relaxed">
                      <strong>Berkas Identitas Disimpan:</strong> Data KTP IC (
                      <span className="text-[#DC2626] dark:text-[#FACC15] font-black">
                        {submittedData.fullName || "-"}
                      </span>
                      ), Citizen ID (
                      <span className="font-mono font-bold">
                        {submittedData.icNumber || "-"}
                      </span>
                      ), sudah kami terima.
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#111827] font-black flex items-center justify-center shrink-0 text-[11px] shadow-sm">
                      2
                    </span>
                    <div className="leading-relaxed flex-1">
                      <div>
                        <strong>Wajib Masuk Discord & Isi Data Anggota:</strong> Silakan salin teks di bawah ini.
                      </div>
                      {/* Copy Box */}
                      <div className="mt-2 p-2.5 bg-white dark:bg-[#14161F] border-2 border-black dark:border-[#475569] rounded shadow-[2px_2px_0px_#000] flex flex-col gap-2">
                        <div className="font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed select-all">
                          {`Nama Lengkap : ${submittedData.fullName || ""}\nCitizen ID : ${submittedData.icNumber || ""}\nNo HP IC : ${submittedData.phone || ""}\nRole : Anggota`}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const copyText = `Nama Lengkap : ${submittedData.fullName || ""}\nCitizen ID : ${submittedData.icNumber || ""}\nNo HP IC : ${submittedData.phone || ""}\nRole : Anggota`;
                            navigator.clipboard.writeText(copyText);
                            setCopySuccess(true);
                            if (onShowToast) onShowToast("Format data anggota berhasil disalin!", "success");
                            setTimeout(() => setCopySuccess(false), 2500);
                          }}
                          className="btn self-start text-[11px] py-1.5 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 border border-black shadow-[1.5px_1.5px_0px_#000] font-bold flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                        >
                          {copySuccess ? (
                            <>
                              <Check size={13} className="text-emerald-800" />
                              <span>Format Data Berhasil Disalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Salin Format Data</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#111827] font-black flex items-center justify-center shrink-0 text-[11px] shadow-sm">
                      3
                    </span>
                    <div className="leading-relaxed">
                      Silakan klik tombol di bawah untuk membuka channel Discord LSM PPS. Di sana Anda cukup paste data yang sudah disalin tadi, agar pengurus dapat memberikan role.
                    </div>
                  </div>
                </div>

                {/* Big Prominent Discord Button */}
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <a
                    href={DISCORD_INVITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-black shadow-[3px_3px_0px_#000] font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Masuk Discord LSM PPS</span>
                    <ExternalLink size={15} />
                  </a>
                  <p className="text-[11px] text-slate-500 text-center leading-tight">
                    Tautan invite resmi yang otomatis mengarahkan Anda langsung mendarat di server Discord LSM PPS.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="btn text-xs py-2 px-6 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] font-heading font-black cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              >
                Selesai & Kembali ke Beranda
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Info Banner */}
              <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                <Sparkles size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-heading font-black uppercase">
                    Pendaftaran Anggota Paguyuban Pizza Sandy Shores (PAPS):
                  </strong>
                  <p className="mt-0.5">
                    Unggah foto KTP IC Anda untuk pemindaian otomatis (OCR). Setelah submit, berkas Anda langsung tersimpan ke database resmi LSM PPS.
                  </p>
                </div>
              </div>

              {/* Area 1: Unggah KTP dengan Auto-Scan OCR */}
              <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15]">
                    <CreditCard size={14} />
                    <span>1. Dokumen KTP IC (Auto-Scan OCR Aktif)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
                    <ScanLine size={12} />
                    <span>AUTO-FILL AKTIF</span>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-1/2">
                    <div className="border-2 border-dashed border-black/30 dark:border-white/20 rounded p-3 text-center bg-slate-50 dark:bg-[#14161F] hover:bg-amber-50/50 transition-colors">
                      {formData.icPhoto ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <img
                            src={formData.icPhoto}
                            alt="KTP IC Preview"
                            className="w-full max-h-28 object-contain rounded border border-black shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, icPhoto: "" })}
                            className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                          >
                            Ganti Foto KTP
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                          <CreditCard size={28} className="text-slate-400" />
                          <span className="text-xs font-bold text-[#DC2626] dark:text-[#FACC15] underline">
                            Unggah Foto KTP IC
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Format JPG/PNG • Otomatis Deteksi Teks KTP
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={(e) => handleKtpUploadWithOcr(e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="w-full sm:w-1/2 text-xs flex flex-col justify-center">
                    {isScanningKtp ? (
                      <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-amber-900 dark:text-amber-200 flex flex-col gap-1.5 animate-pulse">
                        <div className="flex items-center gap-2 font-bold">
                          <ScanLine size={16} className="animate-spin text-amber-600" />
                          <span>Memindai Dokumen KTP IC... {ocrProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full transition-all duration-200"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Mendeteksi Nama Lengkap & Citizen ID otomatis...
                        </span>
                      </div>
                    ) : ocrSuccess === true ? (
                      <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">✓ KTP Terdeteksi Sukses!</strong>
                          <span className="text-[11px] block mt-0.5">
                            Nama dan Citizen ID telah otomatis diisi di bawah. Periksa kembali sebelum submit.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded bg-slate-100 dark:bg-[#161820] border border-black/15 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        💡 <strong>Tips OCR:</strong> Pastikan foto KTP IC tampak jelas dan tidak silau agar sistem dapat membaca Nama Lengkap serta Citizen ID secara otomatis.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Area 2: Unggah Foto Profil / Wajah Karakter */}
              <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] pb-1 border-b border-black/10 dark:border-white/10">
                  <User size={14} />
                  <span>2. Foto Profil Karakter IC</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full border-2 border-black dark:border-[#475569] overflow-hidden shrink-0 bg-slate-100 dark:bg-[#14161F] flex items-center justify-center shadow-sm">
                    {formData.profilePhoto ? (
                      <img
                        src={formData.profilePhoto}
                        alt="Foto Profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="btn inline-flex items-center gap-1.5 text-xs py-1.5 px-3 bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer hover:bg-slate-50">
                      <Camera size={13} />
                      <span>{formData.profilePhoto ? "Ganti Foto Profil" : "Pilih Foto Profil"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => handleCompressProfilePhoto(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Foto wajah close-up karakter IC Anda di kota.
                    </span>
                  </div>
                </div>
              </div>

              {/* Area 3: Data Identitas Lengkap */}
              <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] pb-1 border-b border-black/10 dark:border-white/10">
                  <UserPlus size={14} />
                  <span>3. Rincian Data Anggota</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="card-label text-slate-700 dark:text-slate-300 block mb-1">
                      Nama Lengkap IC <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Linus Zeroday"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="input-field text-xs font-bold bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] w-full"
                    />
                  </div>

                  <div>
                    <label className="card-label text-slate-700 dark:text-slate-300 block mb-1">
                      Citizen ID / No KTP IC <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: T6215313 atau CTZ12345"
                      value={formData.icNumber}
                      onChange={(e) => setFormData({ ...formData, icNumber: e.target.value })}
                      required
                      className="input-field text-xs font-mono font-bold bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] w-full"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="card-label text-slate-700 dark:text-slate-300 block mb-1">
                      Nomor Telepon / WA IC <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Contoh: 555-0199 atau 0812..."
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="input-field pl-8 text-xs font-mono bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Area 4: Pernyataan & Persetujuan MOU */}
              <div className="p-3 rounded bg-amber-50/70 dark:bg-amber-950/20 border-2 border-black/20 dark:border-white/10 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agree-mou-member"
                  checked={formData.agreedMOU}
                  onChange={(e) => setFormData({ ...formData, agreedMOU: e.target.checked })}
                  required
                  className="mt-0.5 rounded border-2 border-black text-[#DC2626] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agree-mou-member" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none leading-relaxed">
                  Saya menyatakan bahwa data IC yang dicantumkan adalah benar dan asli. Saya bersedia menjaga ketertiban, solidaritas, serta mematuhi norma dan peraturan LSM Paguyuban Pizza Sandy Shores.
                </label>
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn w-full py-3 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black font-heading font-black text-sm uppercase shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send size={16} />
                <span>{isSubmitting ? "Mengirim Formulir..." : "Kirim Formulir Pendaftaran Anggota"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
