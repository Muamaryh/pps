import React, { useState, useMemo } from "react";
import {
  FileText,
  Maximize2,
  Trash2,
  Clock,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

const STATUS_META = {
  pending: {
    label: "Baru",
    badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-500",
  },
  in_progress: {
    label: "Diproses",
    badge: "bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border-sky-500",
  },
  approved: {
    label: "Disetujui",
    badge: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-500",
  },
  completed: {
    label: "Selesai",
    badge: "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-500",
  },
  rejected: {
    label: "Ditolak",
    badge: "bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 border-red-500",
  },
};

export default function AdminSubmissionsTab({
  submissions,
  submissionFilter,
  setSubmissionFilter,
  handleUpdateSubmissionStatus,
  handleUpdateSubmissionNote,
  handleDeleteSubmission,
  setPreviewKtp,
}) {
  const [statusFilter, setStatusFilter] = useState("open"); // "open" | "pending" | "in_progress" | "done" | "all"

  const counts = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let done = 0;
    for (const s of submissions) {
      const st = s.status || "pending";
      if (st === "pending") pending += 1;
      else if (st === "in_progress") inProgress += 1;
      else done += 1;
    }
    return {
      total: submissions.length,
      open: pending + inProgress,
      pending,
      inProgress,
      done,
    };
  }, [submissions]);

  const filteredList = useMemo(() => {
    return submissions.filter((s) => {
      if (submissionFilter !== "all" && s.type !== submissionFilter) return false;
      const st = s.status || "pending";
      if (statusFilter === "open") return st === "pending" || st === "in_progress";
      if (statusFilter === "pending") return st === "pending";
      if (statusFilter === "in_progress") return st === "in_progress";
      if (statusFilter === "done") return st === "approved" || st === "completed" || st === "rejected";
      return true;
    });
  }, [submissions, submissionFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header Summary + Status Tindak Lanjut Filter */}
      <div className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <span className="font-heading font-black text-xs sm:text-sm uppercase text-slate-800 dark:text-slate-200">
              Kotak Masuk: {counts.open} Perlu Tindakan
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block sm:inline sm:ml-2">
              (Total {counts.total} arsip • {submissions.filter((s) => s.type === "lapak").length} UMKM • {submissions.filter((s) => s.type === "meeting").length} Pertemuan)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 dark:bg-[#1A1D26] p-1 rounded border border-black/10 dark:border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSubmissionFilter("all")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                submissionFilter === "all"
                  ? "bg-[#FACC15] text-[#111827] shadow-sm font-black border border-black"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Semua ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionFilter("lapak")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                submissionFilter === "lapak"
                  ? "bg-[#FACC15] text-[#111827] shadow-sm font-black border border-black"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>🏪 Stan Lapak UMKM</span>
              <span>({submissions.filter((s) => s.type === "lapak").length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmissionFilter("meeting")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                submissionFilter === "meeting"
                  ? "bg-[#DC2626] text-white shadow-sm font-black border border-black"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>🤝 Permohonan Pertemuan</span>
              <span>({submissions.filter((s) => s.type === "meeting").length})</span>
            </button>
          </div>
        </div>

        {/* Status Tindak Lanjut Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-black/10 dark:border-white/10 text-[11px] font-heading font-bold">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">
            Status:
          </span>
          {[
            { id: "open", label: `Perlu Tindakan (${counts.open})`, activeClass: "bg-slate-900 dark:bg-[#FACC15] text-white dark:text-slate-950 border-black" },
            { id: "pending", label: `Baru (${counts.pending})`, activeClass: "bg-amber-400 text-slate-950 border-amber-600" },
            { id: "in_progress", label: `Diproses (${counts.inProgress})`, activeClass: "bg-sky-600 text-white border-sky-700" },
            { id: "done", label: `Selesai / Arsip (${counts.done})`, activeClass: "bg-emerald-600 text-white border-emerald-700" },
            { id: "all", label: `Semua (${counts.total})`, activeClass: "bg-slate-700 text-white border-slate-900" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                statusFilter === pill.id
                  ? `${pill.activeClass} shadow-xs font-black`
                  : "bg-white dark:bg-[#161820] text-slate-600 dark:text-slate-300 border-black/15 dark:border-white/10 hover:border-[#FACC15]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="card-brutal p-8 text-center bg-[var(--card-bg)] border-2 border-dashed border-black/25 dark:border-slate-600 text-slate-500 text-xs flex flex-col items-center gap-2">
          <span>
            {statusFilter === "open"
              ? "Semua pengajuan pada kategori ini sudah selesai ditindaklanjuti."
              : "Belum ada data pengajuan warga pada filter ini."}
          </span>
          {statusFilter !== "all" && counts.total > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer"
            >
              Tampilkan semua {counts.total} arsip &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredList.map((sub) => {
            const isLapak = sub.type === "lapak";
            const currentStatus = sub.status || "pending";
            const statusMeta = STATUS_META[currentStatus] || STATUS_META.pending;

            return (
              <div
                key={sub.id}
                className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
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
                    {sub.handledBy && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Clock size={11} />
                        Ditangani: <strong className="text-slate-700 dark:text-slate-300">{sub.handledBy}</strong>
                      </span>
                    )}
                  </div>

                  {/* Quick Workflow Buttons + Status Dropdown */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentStatus === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateSubmissionStatus(sub.id, "in_progress")}
                        className="px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-sky-900 dark:text-sky-200 border border-sky-500/70 text-[10px] font-heading font-black inline-flex items-center gap-1 cursor-pointer"
                        title="Tandai sedang ditindaklanjuti (KTP tetap disimpan)"
                      >
                        <PlayCircle size={12} />
                        <span>Proses</span>
                      </button>
                    )}
                    {(currentStatus === "pending" || currentStatus === "in_progress" || currentStatus === "approved") && (
                      <button
                        type="button"
                        onClick={() => handleUpdateSubmissionStatus(sub.id, "completed")}
                        className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 border border-emerald-500/70 text-[10px] font-heading font-black inline-flex items-center gap-1 cursor-pointer"
                        title="Tandai selesai dan arsipkan"
                      >
                        <CheckCircle2 size={12} />
                        <span>Selesai</span>
                      </button>
                    )}

                    <select
                      value={currentStatus}
                      onChange={(e) => handleUpdateSubmissionStatus(sub.id, e.target.value)}
                      className={`text-[11px] font-heading font-bold py-1 px-2 rounded border cursor-pointer ${statusMeta.badge}`}
                    >
                      <option value="pending">Baru (Menunggu)</option>
                      <option value="in_progress">Diproses</option>
                      <option value="approved">Disetujui</option>
                      <option value="completed">Selesai</option>
                      <option value="rejected">Ditolak</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubmission(sub.id)}
                      className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 border border-transparent hover:border-red-400 cursor-pointer"
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
                      WAKTU &amp; MOU
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
                  <div className="p-3.5 rounded bg-amber-50/70 dark:bg-[#1E212B] border border-black/15 dark:border-white/10 text-xs font-sans">
                    <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-black/10 dark:border-white/10 text-[11px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider">
                      <span>🏪 Rincian Usaha &amp; Lokasi Lapak</span>
                      {(sub.fotoWajahIc || sub.ktpImage) && (
                        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                          ✓ Scan KTP Terlampir
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                      <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-white dark:bg-[#161820] border border-black/15 dark:border-white/10 text-[11px] font-mono shadow-xs/10">
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
                              <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">KEBUTUHAN STAND &amp; FASILITAS:</span>
                              <span className="text-slate-800 dark:text-slate-200">{sub.facilityNeeds}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-4 flex flex-col justify-between rounded border border-black/20 dark:border-slate-700 bg-white dark:bg-[#161820] p-2.5 shadow-xs">
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
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              {sub.ktpVerified ? "KTP Terverifikasi & Dibersihkan" : "Tidak Ada Lampiran KTP"}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {sub.ktpVerified ? "Arsip foto otomatis dibersihkan" : "Diinput manual tanpa upload foto"}
                            </span>
                          </div>
                        )}

                        <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                          <span>FOTO IDENTITAS</span>
                          {(sub.fotoWajahIc || sub.ktpImage) && (
                            <button
                              type="button"
                              onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                              className="text-[#DC2626] dark:text-[#FACC15] hover:underline font-bold font-sans flex items-center gap-0.5 cursor-pointer"
                            >
                              Buka Dokumen ↗
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded bg-red-50/70 dark:bg-[#1E212B] border border-black/15 dark:border-white/10 text-xs font-sans">
                    <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-black/10 dark:border-white/10 text-[11px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider">
                      <span>🤝 Rincian Audiensi &amp; Usulan Pertemuan</span>
                      {(sub.fotoWajahIc || sub.ktpImage) && (
                        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                          ✓ Scan KTP Terlampir
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                      <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-white dark:bg-[#161820] border border-black/15 dark:border-white/10 text-[11px] font-mono shadow-xs/10">
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
                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">RINCIAN AGENDA &amp; PEMBAHASAN:</span>
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

                      <div className="lg:col-span-4 flex flex-col justify-between rounded border border-black/20 dark:border-slate-700 bg-white dark:bg-[#161820] p-2.5 shadow-xs">
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
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              {sub.ktpVerified ? "KTP Terverifikasi & Dibersihkan" : "Tidak Ada Lampiran KTP"}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {sub.ktpVerified ? "Arsip foto otomatis dibersihkan" : "Diinput manual tanpa upload foto"}
                            </span>
                          </div>
                        )}

                        <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                          <span>FOTO IDENTITAS</span>
                          {(sub.fotoWajahIc || sub.ktpImage) && (
                            <button
                              type="button"
                              onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                              className="text-[#DC2626] dark:text-[#FACC15] hover:underline font-bold font-sans flex items-center gap-0.5 cursor-pointer"
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
                      className="px-3 py-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] text-xs font-heading font-black border border-black shadow-xs rounded cursor-pointer"
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
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-500 hover:bg-emerald-200 cursor-pointer"
                    >
                      + Preset: Setujui &amp; Arahkan Discord Visitor
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
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-500 hover:bg-blue-200 cursor-pointer"
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
  );
}
