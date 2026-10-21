import React, { useState, useRef } from "react";
import {
  X,
  Sparkles,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Check,
  Copy,
  Phone,
  Send,
  Eye,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Calendar,
  Clock,
  User,
  HelpCircle,
  Lock,
} from "lucide-react";
import { scanUfcScreenshotImage } from "../utils/ktpOcr";
import { submitEventRegistrationCloud, DEFAULT_EVENT } from "../services/eventService";

export default function EventRegistrationModal({ isOpen, onClose, event = null }) {
  const fileInputRef = useRef(null);

  // Active Event Config
  const activeEvent = event || DEFAULT_EVENT;
  const isOpenStatus = activeEvent.status === "OPEN";

  // Form Fields
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [phone, setPhone] = useState("");
  const [discordTag, setDiscordTag] = useState("");
  const [fullName, setFullName] = useState("");

  // OCR Processing & Validation State
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredTicket, setRegisteredTicket] = useState(null);
  const [copied, setCopied] = useState(false);

  // Guide Preview Modal State
  const [showSampleModal, setShowSampleModal] = useState(false);

  if (!isOpen) return null;

  // Handle Screenshot Upload & Trigger Automatic OCR (if required)
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous states
    setOcrResult(null);
    setRejectionMessage("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setScreenshotPreview(base64);

      // If OCR is not required for this event, we just accept the image
      if (activeEvent.requireOcr === false) {
        return;
      }

      setIsScanningOcr(true);
      setScanProgress(15);

      try {
        const scan = await scanUfcScreenshotImage(
          base64,
          (progress) => {
            setScanProgress(progress);
          },
          {
            requireCivilianOnly: activeEvent.requireCivilianOnly !== false,
            requireNoGangOnly: activeEvent.requireNoGangOnly !== false,
            title: activeEvent.title || "Event",
          }
        );

        setIsScanningOcr(false);

        if (scan.success && scan.parsed) {
          const p = scan.parsed;
          setOcrResult(p);

          // Auto-fill Full Name in full UPPERCASE if extracted from KTP
          const detectedName = (
            p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ")
          )
            .trim()
            .toUpperCase();
          if (detectedName) {
            setFullName(detectedName);
          }

          // Evaluate qualification based on event settings
          if (!p.isValidUfc) {
            setRejectionMessage(p.rejectionReason);
          } else {
            setRejectionMessage("");
          }
        } else {
          setRejectionMessage(
            "Gagal memproses screenshot. Pastikan gambar cukup terang dan tajam."
          );
        }
      } catch (err) {
        console.error("OCR scan failure:", err);
        setIsScanningOcr(false);
        setRejectionMessage("Terjadi kendala saat membaca screenshot. Silakan coba lagi.");
      }
    };

    reader.readAsDataURL(file);
  }

  // Handle Form Submit
  async function handleSubmit(e) {
    e.preventDefault();

    if (!isOpenStatus) {
      setRejectionMessage("Pendaftaran untuk event ini sedang ditutup.");
      return;
    }

    if (!screenshotPreview) {
      setRejectionMessage("Silakan unggah screenshot dokumen identitas terlebih dahulu.");
      return;
    }

    if (rejectionMessage || (activeEvent.requireOcr !== false && ocrResult && !ocrResult.isValidUfc)) {
      return;
    }

    if (activeEvent.requireHpIc !== false && !phone.trim()) {
      setRejectionMessage("Silakan masukkan Nomor Telepon / WA IC Anda.");
      return;
    }

    if (activeEvent.requireDiscord !== false && !discordTag.trim()) {
      setRejectionMessage("Silakan masukkan Username Discord Anda untuk koordinasi.");
      return;
    }

    setIsSubmitting(true);
    setRejectionMessage("");

    try {
      const payload = {
        fullName: (
          fullName.trim() ||
          ocrResult?.fullName ||
          "PESERTA EVENT"
        ).toUpperCase(),
        phone: phone.trim(),
        discordTag: discordTag.trim(),
        jobStatus: ocrResult?.jobStatus || "Civilian - Freelancer",
        gangStatus: ocrResult?.gangStatus || "No Gang - Unaffiliated",
        ssDate: ocrResult?.dateTime || "",
        citizenId: (ocrResult?.citizenId || "").toUpperCase(),
        dob: ocrResult?.dob || "",
        sex: (ocrResult?.sex || "").toUpperCase(),
        nationality: (ocrResult?.nationality || "").toUpperCase(),
        ktpScreenshot: screenshotPreview,
      };

      const ticket = await submitEventRegistrationCloud(payload, activeEvent);
      setRegisteredTicket(ticket);
    } catch (err) {
      console.error("Submit failure:", err);
      setRejectionMessage("Gagal mengirim pendaftaran ke server. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyTicket() {
    if (!registeredTicket?.ticketCode) return;
    navigator.clipboard.writeText(registeredTicket.ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setScreenshotPreview("");
    setPhone("");
    setDiscordTag("");
    setFullName("");
    setOcrResult(null);
    setRejectionMessage("");
    setRegisteredTicket(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn select-none"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-2xl max-h-[94vh] rounded-xl border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] bg-[var(--card-bg)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1F222C]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] ${
                  isOpenStatus ? "bg-[#DC2626]" : "bg-slate-700"
                }`}
              >
                <Ticket size={20} className="text-[#FACC15]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15]">
                    {activeEvent.organizer || "LSM PAGUYUBAN PIZZA SANDY SHORES"} • RESMI
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black text-white border border-black shadow-[1px_1px_0px_#000] ${
                      isOpenStatus ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  >
                    {isOpenStatus ? "PENDAFTARAN DIBUKA" : "PENDAFTARAN DITUTUP"}
                  </span>
                </div>
                <h3 className="font-heading font-black text-sm sm:text-base text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                  {activeEvent.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-8 h-8 rounded border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-200 flex items-center justify-center font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-transform cursor-pointer"
              title="Tutup Formulir"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {registeredTicket ? (
              /* SUCCESS TICKET SCREEN */
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-[3px_3px_0px_#000]">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded bg-emerald-600 text-white font-heading font-black text-xs uppercase tracking-wider mb-2">
                    PENDAFTARAN BERHASIL
                  </span>
                  <h4 className="font-heading font-black text-xl sm:text-2xl text-slate-950 dark:text-white uppercase">
                    Tiket Resmi Peserta Terbit
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Pendaftaran Anda untuk event <strong>{activeEvent.title}</strong> telah tercatat di sistem {activeEvent.organizer}.
                  </p>
                </div>

                {/* Digital Brutalist Ticket Card */}
                <div className="w-full bg-[#FFFDF9] dark:bg-[#14161F] p-4 sm:p-5 rounded-xl border-[2.5px] border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] text-left flex flex-col gap-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-black/20 dark:border-white/20">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase truncate max-w-[240px]">
                      TIKET RESMI: {activeEvent.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-black/30">
                      BIAYA: {activeEvent.entryFee || "$10.000 USD"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-[#FACC15]/20 dark:bg-[#FACC15]/10 p-3 rounded-lg border-2 border-black">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">NOMOR REGISTRASI:</span>
                      <strong className="text-xl sm:text-2xl font-mono font-black text-[#DC2626] dark:text-[#FACC15]">
                        {registeredTicket.ticketCode}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyTicket}
                      className="btn py-1.5 px-3 bg-[#FACC15] hover:bg-yellow-400 text-slate-900 font-bold text-xs border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    >
                      {copied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                      <span>{copied ? "Tersalin!" : "Salin Kode"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block">NAMA PESERTA / IC:</span>
                      <strong className="text-slate-900 dark:text-slate-100 truncate block">
                        {registeredTicket.fullName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">STATUS:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 truncate block">
                        ✓ TERVERIFIKASI
                      </strong>
                    </div>
                    {registeredTicket.phone && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">NO HP IC:</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {registeredTicket.phone}
                        </span>
                      </div>
                    )}
                    {registeredTicket.discordTag && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">DISCORD (OOC):</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {registeredTicket.discordTag}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 btn py-3 px-4 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-heading font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    Selesai & Simpan Tiket
                  </button>
                </div>
              </div>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Event Condition Banner - Mengurut Rapi ke Bawah 1, 2, 3 */}
                <div className="p-3.5 bg-amber-50 dark:bg-[#14161F] border-2 border-black dark:border-[#475569] rounded-lg flex flex-col gap-2.5 text-xs shadow-[2px_2px_0px_#000]/10">
                  <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-[#DC2626]" />
                      <strong className="block text-slate-950 dark:text-slate-100 font-heading font-black uppercase text-xs tracking-tight">
                        Syarat Wajib Peserta:
                      </strong>
                    </div>

                    {activeEvent.requireOcr !== false && (
                      <button
                        type="button"
                        onClick={() => setShowSampleModal(true)}
                        className="btn py-1 px-2.5 bg-white dark:bg-[#1E222D] hover:bg-amber-100 text-slate-900 dark:text-slate-100 font-heading font-black text-[11px] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <HelpCircle size={13} className="text-[#DC2626]" />
                        <span>Contoh Screenshot</span>
                      </button>
                    )}
                  </div>

                  {/* List Syarat Mengurut ke Bawah 1, 2, 3 */}
                  <div className="flex flex-col gap-2 pt-0.5">
                    {(Array.isArray(activeEvent.requirements) && activeEvent.requirements.length > 0
                      ? activeEvent.requirements
                      : [
                          activeEvent.requireCivilianOnly !== false ? "Khusus Civilian (Freelancer)" : null,
                          activeEvent.requireNoGangOnly !== false ? "Wajib No Gang (Unaffiliated)" : null,
                          `Biaya pendaftaran ${activeEvent.entryFee || "$10.000 USD"} diserahkan di arena`,
                        ].filter(Boolean)
                    ).map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded bg-[#DC2626] text-[#FACC15] font-mono font-black flex items-center justify-center shrink-0 text-[11px] border border-black shadow-[1px_1px_0px_#000]">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium leading-snug pt-0.5 text-xs">
                          {req}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closed Alert if not OPEN */}
                {!isOpenStatus && (
                  <div className="p-3 bg-red-100 dark:bg-red-950/70 border-2 border-red-600 rounded-lg text-red-950 dark:text-red-200 flex items-center gap-3">
                    <Lock size={18} className="text-red-600 shrink-0" />
                    <div>
                      <strong className="font-heading font-black uppercase text-xs">
                        Pendaftaran Event Ini Sedang Ditutup
                      </strong>
                      <p className="text-[11px] mt-0.5">
                        Kuota pendaftaran telah penuh atau periode pendaftaran telah berakhir. Silakan tunggu informasi berikutnya dari panitia.
                      </p>
                    </div>
                  </div>
                )}

                {/* Upload Screenshot Area */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                      1. Upload Screenshot KTP IC & Status HUD <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      {activeEvent.requireOcr !== false ? "Sistem OCR otomatis memvalidasi" : "Unggah dokumen pendukung"}
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {screenshotPreview ? (
                    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-[#1A1D27] border-2 border-black dark:border-[#475569] rounded-lg shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <ImageIcon size={16} className="text-[#DC2626]" />
                          <span>Screenshot Terunggah</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn py-1 px-2.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold border border-black shadow-sm"
                        >
                          Ganti Gambar
                        </button>
                      </div>

                      {/* Preview Image Thumbnail - Pas & Tanpa Background Hitam */}
                      <div className="flex justify-center p-2 bg-amber-50/50 dark:bg-[#14161F] rounded-lg border-2 border-black/20">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot KTP & HUD"
                          className="max-h-56 w-auto object-contain rounded border-2 border-black shadow-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-black dark:border-[#475569] bg-white dark:bg-[#161820] hover:bg-amber-50/50 dark:hover:bg-[#1F222C] p-6 rounded-lg text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-900 shadow-[2px_2px_0px_#000]">
                        <Upload size={20} />
                      </div>
                      <div>
                        <strong className="block text-xs sm:text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                          Klik Di Sini Untuk Memilih Screenshot
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                          Pastikan kartu <strong>LOS SANTOS IDENTITY</strong> dan status HUD di pojok kanan atas terlihat jelas.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scanning Progress Bar */}
                {isScanningOcr && (
                  <div className="p-3.5 bg-amber-50 dark:bg-[#1A1D27] border-2 border-black rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <Loader2 size={16} className="animate-spin text-[#DC2626]" />
                        <span>Menganalisis KTP & Status HUD (OCR)...</span>
                      </div>
                      <span className="text-[#DC2626] font-black">{scanProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-black">
                      <div
                        className="h-full bg-[#FACC15] transition-all duration-300"
                        style={{ width: `${Math.max(scanProgress, 10)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* REJECTION ALERT (Jika tidak memenuhi syarat) */}
                {rejectionMessage && (
                  <div className="p-3.5 bg-red-100 dark:bg-red-950/70 border-2 border-red-600 text-red-950 dark:text-red-200 rounded-lg flex items-start gap-3 shadow-[2px_2px_0px_#DC2626]">
                    <ShieldAlert size={22} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-heading font-black text-xs uppercase tracking-wide text-red-700 dark:text-red-400">
                        PENDAFTARAN DITOLAK: TIDAK MEMENUHI KRITERIA
                      </strong>
                      <p className="text-xs font-bold mt-1">
                        {rejectionMessage}
                      </p>
                      <p className="text-[10px] text-red-700 dark:text-red-400 font-mono mt-1">
                        Event ini diselenggarakan oleh {activeEvent.organizer}. Jika screenshot salah, silakan ganti gambar yang benar.
                      </p>
                    </div>
                  </div>
                )}

                {/* SUCCESS VERIFICATION RESULT (Jika lolos Civilian & No Gang) */}
                {ocrResult && ocrResult.isValidUfc && !isScanningOcr && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 rounded-lg flex flex-col gap-2 shadow-[2px_2px_0px_#059669]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      <strong className="font-heading font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        VERIFIKASI OCR LOLOS: MEMENUHI SYARAT
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                      <div className="p-2 bg-white dark:bg-[#14161F] border border-emerald-400 rounded">
                        <span className="text-[9px] text-slate-400 block">JOB STATUS:</span>
                        <strong className="text-emerald-700 dark:text-emerald-300 text-[11px] truncate block">
                          ✓ {activeEvent.requireCivilianOnly !== false ? (ocrResult.jobStatus || "Civilian - Freelancer") : "Bebas / Lolos"}
                        </strong>
                      </div>

                      <div className="p-2 bg-white dark:bg-[#14161F] border border-emerald-400 rounded">
                        <span className="text-[9px] text-slate-400 block">GANG STATUS:</span>
                        <strong className="text-emerald-700 dark:text-emerald-300 text-[11px] truncate block">
                          ✓ {activeEvent.requireNoGangOnly !== false ? (ocrResult.gangStatus || "No Gang - Unaffiliated") : "Bebas / Lolos"}
                        </strong>
                      </div>

                      <div className="p-2 bg-white dark:bg-[#14161F] border border-emerald-400 rounded col-span-2 sm:col-span-1">
                        <span className="text-[9px] text-slate-400 block">WAKTU SS:</span>
                        <span className="text-slate-800 dark:text-slate-200 text-[11px] truncate block">
                          {ocrResult.dateTime || "Terdeteksi"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Input: Nama, No HP IC & Username Discord */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Nama IC (Auto / Manual) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                      Nama Lengkap / Nama IC <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Marcus Holloway / Budi Santoso"
                        required
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border-2 border-black dark:border-[#475569] bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                      />
                    </div>
                  </div>

                  {/* No HP IC */}
                  {activeEvent.requireHpIc !== false && (
                    <div>
                      <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                        2. No HP / Telepon IC <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Contoh: 555-8821 / 08123456"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border-2 border-black dark:border-[#475569] bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Username Discord */}
                  {activeEvent.requireDiscord !== false && (
                    <div className={activeEvent.requireHpIc === false ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                        3. Username Discord (OOC) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Send size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={discordTag}
                          onChange={(e) => setDiscordTag(e.target.value)}
                          placeholder="Contoh: ridi_to / username"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border-2 border-black dark:border-[#475569] bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Entry Fee Notice Box */}
                {activeEvent.entryFee && (
                  <div className="p-3 bg-slate-100 dark:bg-[#14161F] border-2 border-black/20 dark:border-white/10 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-600" />
                      <div>
                        <strong className="block text-slate-900 dark:text-slate-100 font-bold">
                          Biaya Pendaftaran: {activeEvent.entryFee}
                        </strong>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Diserahkan saat verifikasi kehadiran di lokasi event.
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-black text-xs px-2.5 py-1 rounded bg-white dark:bg-[#1F222C] text-slate-900 dark:text-slate-100 border border-black shadow-sm shrink-0">
                      {activeEvent.entryFee}
                    </span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      !isOpenStatus ||
                      isSubmitting ||
                      isScanningOcr ||
                      Boolean(rejectionMessage)
                    }
                    className="w-full btn py-3.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
                  >
                    <Ticket size={18} className="text-[#FACC15]" />
                    <span>
                      {!isOpenStatus
                        ? "Pendaftaran Ditutup"
                        : isSubmitting
                        ? "Memproses Pendaftaran..."
                        : isScanningOcr
                        ? "Sedang Memindai OCR..."
                        : rejectionMessage
                        ? "Pendaftaran Ditolak"
                        : `Daftar ${activeEvent.title}`}
                    </span>
                  </button>
                  <span className="text-[10px] text-center block text-slate-500 font-mono mt-1.5">
                    Data tervalidasi otomatis oleh sistem {activeEvent.organizer}.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CONTOH FORMAT SCREENSHOT */}
      {showSampleModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border-[3px] border-black shadow-[8px_8px_0px_#000] bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-[#FACC15] text-slate-950">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-[#DC2626]" />
                <h4 className="font-heading font-black text-xs sm:text-sm uppercase">
                  Contoh Format Screenshot - {activeEvent.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="w-7 h-7 rounded border border-black bg-white flex items-center justify-center font-bold"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Screenshot Preview Box - Tepat pas di gambar tanpa bar/background hitam di pinggir */}
              <div className="flex justify-center items-center py-1">
                <div className="rounded-lg border-2 border-black shadow-[3px_3px_0px_#000] overflow-hidden inline-block bg-slate-50 dark:bg-slate-900">
                  <img
                    src="/contoh-ss-ktp2.jpg"
                    alt={`Contoh Screenshot - ${activeEvent.title}`}
                    className="max-h-[380px] w-auto block object-contain"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-[#14161F] border border-amber-300 dark:border-amber-900 rounded text-xs text-slate-800 dark:text-slate-200">
                <strong className="block font-bold mb-1 text-[#DC2626]">
                  Bagian Wajib Yang Harus Terlihat:
                </strong>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  {activeEvent.requireOcr !== false ? (
                    <>
                      <li>
                        <strong>Pojok Kanan Atas (HUD):</strong> Tanggal &amp; Waktu (contoh <code>21/12/2025 16:44</code>)
                        {activeEvent.requireCivilianOnly !== false && <>, status <code>Civilian - Freelancer</code></>}
                        {activeEvent.requireNoGangOnly !== false && <>, dan <code>No Gang - Unaffiliated</code></>}.
                      </li>
                      <li>
                        <strong>Tengah/Bawah:</strong> Kartu identitas <code>LOS SANTOS IDENTITY</code> (Nama Lengkap, DOB, Sex, Citizen ID).
                      </li>
                    </>
                  ) : (
                    <li>
                      <strong>Dokumen Lampiran:</strong> Tangkapan layar jelas sesuai instruksi panitia kegiatan.
                    </li>
                  )}
                  <li>
                    <strong>Catatan:</strong> Event <strong>{activeEvent.title}</strong> ini diselenggarakan resmi oleh <strong>{activeEvent.organizer}</strong>.
                    {activeEvent.requireOcr !== false
                      ? " Sistem OCR akan otomatis memvalidasi dan menolak pendaftaran jika kriteria tidak sesuai."
                      : " Seluruh data akan diverifikasi langsung oleh panitia."}
                  </li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="w-full btn py-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border border-black shadow-[2px_2px_0px_#000]"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
