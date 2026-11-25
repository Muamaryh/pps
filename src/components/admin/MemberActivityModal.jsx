import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Plus,
  Camera,
  CheckCircle2,
  Clock,
  Calendar,
  Trash2,
  Eye,
  Upload,
  Loader2,
  ClipboardCheck,
  Users,
  Flag,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import {
  ACTIVITY_TARGET_NONGKRONG,
  ACTIVITY_TARGET_AGENDA,
  getMemberActivitySummary,
  compressActivityScreenshotFile,
  loadMemberActivityLogsCloud,
  addMemberActivityLogCloud,
  deleteMemberActivityLogCloud,
} from "../../services/memberService";

const MONITOR_NAME_STORAGE_KEY = "pps_korlap_monitor_name";

export default function MemberActivityModal({
  isOpen,
  member,
  defaultMonitorName = "Admin LSM PPS",
  onClose,
  onShowToast,
  onPreviewImage,
  onActivityChanged,
  onRequestApprove,
}) {
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [filterType, setFilterType] = useState("ALL"); // ALL | NONGKRONG | AGENDA

  // Form state
  const [activityType, setActivityType] = useState("NONGKRONG");
  const [monitorName, setMonitorName] = useState(() => {
    try {
      const saved = localStorage.getItem(MONITOR_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return defaultMonitorName || "Admin LSM PPS";
  });
  const [notes, setNotes] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState("");
  const [screenshotSizeKb, setScreenshotSizeKb] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fileInputRef = useRef(null);
  const memberId = member?.id || "";

  useEffect(() => {
    if (!isOpen || !memberId) return;
    let cancelled = false;
    (async () => {
      setIsLoadingLogs(true);
      try {
        const list = await loadMemberActivityLogsCloud(memberId);
        if (!cancelled) setLogs(list);
      } catch (err) {
        console.error("Gagal memuat riwayat keaktifan:", err);
        if (!cancelled && onShowToast) {
          onShowToast("Gagal memuat riwayat bukti keaktifan.", "error");
        }
      } finally {
        if (!cancelled) setIsLoadingLogs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, memberId, onShowToast]);

  const handleImageFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        if (onShowToast) onShowToast("File harus berupa gambar (JPG, PNG, WEBP).", "error");
        return;
      }
      setIsCompressing(true);
      try {
        const { dataUrl, sizeKb } = await compressActivityScreenshotFile(file);
        setScreenshotDataUrl(dataUrl);
        setScreenshotSizeKb(sizeKb);
      } catch (err) {
        console.error("Gagal memproses bukti SC:", err);
        if (onShowToast) onShowToast(err.message || "Gagal memproses screenshot.", "error");
      } finally {
        setIsCompressing(false);
      }
    },
    [onShowToast]
  );

  // Support Ctrl+V paste screenshot directly while modal is open
  useEffect(() => {
    if (!isOpen) return;
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            handleImageFile(blob);
            if (onShowToast) onShowToast("Screenshot dari clipboard berhasil ditempel!", "info");
            break;
          }
        }
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleImageFile, onClose, onShowToast]);

  if (!isOpen || !member) return null;

  const isPending = member.status === "PENDING_VERIFIKASI";

  // Derive live counts from loaded logs once fetched, fallback to member summary while loading
  const fallbackSummary = getMemberActivitySummary(member);
  const nongkrongCount = isLoadingLogs
    ? fallbackSummary.nongkrongCount
    : logs.filter((l) => String(l.type || "").toUpperCase() !== "AGENDA").length;
  const agendaCount = isLoadingLogs
    ? fallbackSummary.agendaCount
    : logs.filter((l) => String(l.type || "").toUpperCase() === "AGENDA").length;

  const isNongkrongDone = nongkrongCount >= ACTIVITY_TARGET_NONGKRONG;
  const isAgendaDone = agendaCount >= ACTIVITY_TARGET_AGENDA;
  const isEligible = isNongkrongDone || isAgendaDone;

  const nongkrongPct = Math.min(100, Math.round((nongkrongCount / ACTIVITY_TARGET_NONGKRONG) * 100));
  const agendaPct = Math.min(100, Math.round((agendaCount / ACTIVITY_TARGET_AGENDA) * 100));

  const filteredLogs = logs.filter((item) => {
    if (filterType === "ALL") return true;
    return String(item.type || "NONGKRONG").toUpperCase() === filterType;
  });

  async function handleSubmitLog(e) {
    e.preventDefault();
    const cleanMonitor = monitorName.trim();
    if (!cleanMonitor) {
      if (onShowToast) onShowToast("Nama admin / korlap pemantau wajib diisi.", "error");
      return;
    }
    if (!screenshotDataUrl) {
      if (onShowToast) onShowToast("Bukti screenshot (SC) wajib dilampirkan (upload atau Ctrl+V).", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      try {
        localStorage.setItem(MONITOR_NAME_STORAGE_KEY, cleanMonitor);
      } catch {}

      const { log, activitySummary } = await addMemberActivityLogCloud(member, {
        type: activityType,
        monitorName: cleanMonitor,
        notes,
        screenshotDataUrl,
      });

      setLogs((prev) => [log, ...prev]);
      setNotes("");
      setScreenshotDataUrl("");
      setScreenshotSizeKb(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (onActivityChanged) {
        onActivityChanged(member, activitySummary, { action: "ADD", log });
      }

      if (onShowToast) {
        const label = activityType === "AGENDA" ? "Agenda Aktivitas" : "Kumpul Nongkrong";
        onShowToast(
          activitySummary.isEligible
            ? `Catatan ${label} tersimpan! Calon anggota kini MEMENUHI SYARAT ACC.`
            : `Catatan ${label} beserta bukti SC berhasil disimpan.`,
          "success"
        );
      }
    } catch (err) {
      console.error("Gagal menyimpan catatan keaktifan:", err);
      if (onShowToast) onShowToast(err.message || "Gagal menyimpan catatan keaktifan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDeleteLog(logItem) {
    if (!logItem?.id) return;
    setDeletingLogId(logItem.id);
    try {
      const { activitySummary } = await deleteMemberActivityLogCloud(member.id, logItem.id);
      setLogs((prev) => prev.filter((item) => item.id !== logItem.id));
      setConfirmDeleteId(null);
      if (onActivityChanged) {
        onActivityChanged(member, activitySummary, { action: "DELETE", log: logItem });
      }
      if (onShowToast) onShowToast("Catatan kehadiran dihapus dan hitungan disinkronkan.", "info");
    } catch (err) {
      console.error("Gagal menghapus catatan keaktifan:", err);
      if (onShowToast) onShowToast("Gagal menghapus catatan kehadiran.", "error");
    } finally {
      setDeletingLogId(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-activity-modal-title"
      className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#FFFDF9] dark:bg-[#0B0D14] border border-black/20 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-black/15 dark:border-white/10 bg-[#FAF8F3] dark:bg-[#121622] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FACC15] text-slate-950 border border-black/15 flex items-center justify-center shrink-0 shadow-xs">
              <ClipboardCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="member-activity-modal-title"
                  className="font-heading font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 dark:text-slate-100 truncate"
                >
                  Verifikasi Keaktifan Korlap
                </h3>
                {isEligible ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                    Layak ACC
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-black uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                    Proses Pemantauan
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {member.fullName || "Calon Anggota"} • CID: {member.icNumber || "-"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel Keaktifan"
            className="w-9 h-9 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#181C2A] hover:bg-red-500 hover:text-white hover:border-red-500 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Progress Targets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target 1: 7x Kumpul Nongkrong */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isNongkrongDone
                  ? "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-400/70 dark:border-emerald-500/40"
                  : "bg-white dark:bg-[#141724] border-black/15 dark:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-heading font-black uppercase flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Users size={14} className={isNongkrongDone ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-[#FACC15]"} />
                  <span>Kumpul Nongkrong</span>
                </span>
                <span
                  className={`font-mono font-black text-sm ${
                    isNongkrongDone ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-[#FACC15]"
                  }`}
                >
                  {nongkrongCount} / {ACTIVITY_TARGET_NONGKRONG}x
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isNongkrongDone ? "bg-emerald-500" : "bg-[#FACC15]"
                  }`}
                  style={{ width: `${nongkrongPct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                {isNongkrongDone
                  ? "Syarat 7x kumpul nongkrong sudah terpenuhi."
                  : `Kurang ${ACTIVITY_TARGET_NONGKRONG - nongkrongCount}x lagi untuk lulus via jalur nongkrong.`}
              </p>
            </div>

            {/* Target 2: 4x Agenda Aktivitas */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isAgendaDone
                  ? "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-400/70 dark:border-emerald-500/40"
                  : "bg-white dark:bg-[#141724] border-black/15 dark:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-heading font-black uppercase flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Flag size={14} className={isAgendaDone ? "text-emerald-600 dark:text-emerald-400" : "text-[#DC2626] dark:text-rose-400"} />
                  <span>Agenda Aktivitas</span>
                </span>
                <span
                  className={`font-mono font-black text-sm ${
                    isAgendaDone ? "text-emerald-700 dark:text-emerald-300" : "text-[#DC2626] dark:text-rose-400"
                  }`}
                >
                  {agendaCount} / {ACTIVITY_TARGET_AGENDA}x
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isAgendaDone ? "bg-emerald-500" : "bg-[#DC2626]"
                  }`}
                  style={{ width: `${agendaPct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                {isAgendaDone
                  ? "Syarat 4x ikut agenda aktivitas sudah terpenuhi."
                  : `Kurang ${ACTIVITY_TARGET_AGENDA - agendaCount}x lagi untuk lulus via jalur agenda.`}
              </p>
            </div>
          </div>

          {/* Banner Siap ACC (muncul saat memenuhi salah satu syarat dan status masih pending) */}
          {isPending && isEligible && typeof onRequestApprove === "function" && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-400/60 dark:border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-100">
                  <strong className="font-heading uppercase block">Syarat Keaktifan Terpenuhi!</strong>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Calon anggota ini sudah memenuhi target verifikasi lapangan dan siap disetujui sebagai Anggota Resmi.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onRequestApprove(member);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition-colors"
              >
                <UserCheck size={14} />
                <span>ACC Sekarang</span>
              </button>
            </div>
          )}

          {/* Form Catat Kehadiran Baru (khusus calon anggota yang masih Menunggu Verifikasi) */}
          {isPending && (
            <form
              onSubmit={handleSubmitLog}
              className="p-4 rounded-xl bg-[#FAF8F3] dark:bg-[#141724] border border-black/15 dark:border-white/10 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Plus size={14} className="text-[#DC2626] dark:text-[#FACC15]" />
                  <span>Catat Kehadiran &amp; Bukti SC</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Tips: Tekan <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">Ctrl+V</kbd> untuk langsung tempel SC
                </span>
              </div>

              {/* Pilih Jenis Keaktifan */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActivityType("NONGKRONG")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-heading font-black uppercase flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    activityType === "NONGKRONG"
                      ? "bg-[#FACC15] text-slate-950 border-black/20 shadow-sm"
                      : "bg-white dark:bg-[#1A1E2E] text-slate-600 dark:text-slate-300 border-black/15 dark:border-white/10 hover:border-amber-400/60"
                  }`}
                >
                  <Users size={14} />
                  <span>Kumpul Nongkrong (Target 7x)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType("AGENDA")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-heading font-black uppercase flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    activityType === "AGENDA"
                      ? "bg-[#DC2626] text-white border-red-500/80 shadow-sm"
                      : "bg-white dark:bg-[#1A1E2E] text-slate-600 dark:text-slate-300 border-black/15 dark:border-white/10 hover:border-red-400/60"
                  }`}
                >
                  <Flag size={14} />
                  <span>Agenda Aktivitas (Target 4x)</span>
                </button>
              </div>

              {/* Nama Pemantau & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Admin / Korlap Pemantau *
                  </label>
                  <input
                    type="text"
                    required
                    value={monitorName}
                    onChange={(e) => setMonitorName(e.target.value)}
                    placeholder="Contoh: Korlap Raka / Kang Waza"
                    className="input-field w-full text-xs font-bold py-2 px-3 rounded-xl bg-white dark:bg-[#0E111B] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/15"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Catatan Lokasi / Kegiatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      activityType === "AGENDA"
                        ? "Contoh: Ikut Konvoi Bansos Batch 3"
                        : "Contoh: Nongkrong depan Resto Pizza malam"
                    }
                    className="input-field w-full text-xs py-2 px-3 rounded-xl bg-white dark:bg-[#0E111B] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/15"
                  />
                </div>
              </div>

              {/* Upload / Paste Bukti Screenshot (Wajib) */}
              <div>
                <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Bukti Screenshot (SC) Pemantauan *
                </label>

                {screenshotDataUrl ? (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E111B] border border-emerald-400/60 dark:border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div
                      className="w-full sm:w-36 h-24 rounded-lg overflow-hidden bg-slate-950 border border-black/15 dark:border-white/10 shrink-0 relative group cursor-pointer"
                      onClick={() =>
                        onPreviewImage?.({
                          url: screenshotDataUrl,
                          title: `Preview Bukti SC - ${member.fullName || "Calon Anggota"}`,
                          subtitle: `Dipantau oleh: ${monitorName || "-"}`,
                        })
                      }
                    >
                      <img
                        src={screenshotDataUrl}
                        alt="Preview Bukti SC"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                        <Eye size={13} /> Perbesar
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>Bukti SC siap disimpan ({screenshotSizeKb} KB terkompresi)</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 border border-black/15 dark:border-white/15 cursor-pointer inline-flex items-center gap-1">
                          <Camera size={12} />
                          <span>Ganti Gambar</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageFile(file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotDataUrl("");
                            setScreenshotSizeKb(0);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-300/60 dark:border-red-800/60 cursor-pointer"
                        >
                          Hapus Preview
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer?.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                    className="w-full py-5 px-4 rounded-xl border border-dashed border-black/25 dark:border-white/20 bg-white dark:bg-[#0E111B] hover:border-[#FACC15] hover:bg-amber-50/40 dark:hover:bg-white/[0.03] flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-colors"
                  >
                    {isCompressing ? (
                      <>
                        <Loader2 size={20} className="animate-spin text-[#DC2626] dark:text-[#FACC15]" />
                        <span className="text-xs font-heading font-bold">Mengompresi gambar SC...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-[#DC2626] dark:text-[#FACC15]" />
                        <span className="text-xs font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                          Klik Pilih File, Drag &amp; Drop, atau Paste (Ctrl+V) Bukti SC
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Otomatis dikompresi ringan agar database tetap cepat (JPG, PNG, WEBP)
                        </span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isCompressing}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressing || !screenshotDataUrl || !monitorName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 border border-black/20 font-heading font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan Catatan & Bukti SC"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Daftar Riwayat & Galeri Bukti SC */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-500" />
                <span>Riwayat Pemantauan &amp; Bukti SC ({logs.length})</span>
              </h4>

              <div className="flex items-center gap-1.5 text-[11px]">
                {[
                  { id: "ALL", label: `Semua (${logs.length})` },
                  { id: "NONGKRONG", label: `Nongkrong (${nongkrongCount})` },
                  { id: "AGENDA", label: `Agenda (${agendaCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`px-2.5 py-1 rounded-lg font-heading font-bold border transition-colors cursor-pointer ${
                      filterType === tab.id
                        ? "bg-slate-900 text-white dark:bg-[#FACC15] dark:text-slate-950 border-black/20"
                        : "bg-white dark:bg-[#141724] text-slate-600 dark:text-slate-300 border-black/15 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="p-8 text-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#141724] text-slate-500 text-xs flex flex-col items-center gap-2">
                <Loader2 size={22} className="animate-spin text-[#DC2626] dark:text-[#FACC15]" />
                <span>Memuat riwayat bukti SC dari cloud...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-black/20 dark:border-white/15 bg-slate-50/70 dark:bg-[#121622] text-slate-500 text-xs space-y-1.5">
                <AlertCircle size={22} className="mx-auto text-slate-400" />
                <p className="font-heading font-bold text-slate-700 dark:text-slate-300">
                  Belum ada catatan kehadiran pada kategori ini.
                </p>
                <p className="text-[11px]">
                  Gunakan formulir di atas untuk mencatat kehadiran beserta bukti SC dari Korlap pemantau.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredLogs.map((item, idx) => {
                  const isAgenda = String(item.type || "").toUpperCase() === "AGENDA";
                  const isConfirmingDel = confirmDeleteId === item.id;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-white dark:bg-[#141724] border border-black/15 dark:border-white/10 flex flex-col gap-2.5 shadow-xs"
                    >
                      {/* Top row: Badge & Date */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-heading font-black uppercase border ${
                            isAgenda
                              ? "bg-red-500/15 text-red-700 dark:text-rose-300 border-red-500/35"
                              : "bg-amber-400/20 text-amber-900 dark:text-[#FACC15] border-amber-500/40"
                          }`}
                        >
                          {isAgenda ? "Agenda Aktivitas" : "Kumpul Nongkrong"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />
                          <span>
                            {item.activityDateLabel || "-"} • {item.activityTimeLabel || "-"}
                          </span>
                        </span>
                      </div>

                      {/* Screenshot Thumbnail */}
                      {item.screenshotUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewImage?.({
                              url: item.screenshotUrl,
                              title: `Bukti SC (${isAgenda ? "Agenda Aktivitas" : "Kumpul Nongkrong"}) - ${member.fullName || "Calon Anggota"}`,
                              subtitle: `Dipantau oleh: ${item.monitorName || "-"} • ${item.activityDateLabel || ""} ${item.activityTimeLabel || ""}${item.notes ? ` • ${item.notes}` : ""}`,
                            })
                          }
                          className="w-full h-36 rounded-lg overflow-hidden bg-slate-950 border border-black/15 dark:border-white/10 relative group cursor-pointer"
                        >
                          <img
                            src={item.screenshotUrl}
                            alt={`Bukti SC ${item.type}`}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-heading font-bold">
                            <Eye size={15} />
                            <span>Lihat Bukti SC Penuh</span>
                          </div>
                        </button>
                      )}

                      {/* Monitor & Notes */}
                      <div className="space-y-1 text-xs flex-1">
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          Pemantau: <strong className="text-slate-950 dark:text-white">{item.monitorName || "-"}</strong>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Delete Action (hanya selama masih tahap verifikasi) */}
                      {isPending && (
                        <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-1.5">
                          {isConfirmingDel ? (
                            <>
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mr-auto">
                                Hapus catatan ini?
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={deletingLogId === item.id}
                                onClick={() => handleConfirmDeleteLog(item)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-600 hover:bg-red-700 text-white cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                {deletingLogId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                <span>Ya, Hapus</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Hapus catatan kehadiran ini"
                            >
                              <Trash2 size={11} />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
