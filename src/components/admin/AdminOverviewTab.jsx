import React from "react";
import {
  UserCheck,
  DollarSign,
  TrendingDown,
  Inbox,
  Gift,
  Landmark,
  Users2,
  Clock,
} from "lucide-react";

export default function AdminOverviewTab({
  activeAdminName,
  currentAdmin,
  pendingMembersCount,
  submissions,
  approvedMembersList,
  totalKasActiveCount,
  totalKasExpiringCount,
  totalVoucherActiveCount,
  bansosClaims,
  kasSummary,
  kasTransactions,
  activityLogs,
  formatCurrency,
  formatKasDate,
  setActiveTab,
  setKasMemberStatusFilter,
  setIsKasExpenseModalOpen,
}) {
  const unpaidKasCount = Math.max(0, approvedMembersList.length - totalKasActiveCount);
  const kasPaidPct = approvedMembersList.length > 0
    ? Math.round((totalKasActiveCount / approvedMembersList.length) * 100)
    : 0;
  const unclaimedBansosCount = bansosClaims.filter((c) => !c.claimed).length;
  const recentKasTx = kasTransactions.slice(0, 4);
  const recentLogs = activityLogs.slice(0, 5);

  const newSubCount = submissions.filter((s) => !s.status || s.status === "pending").length;
  const inProgressSubCount = submissions.filter((s) => s.status === "in_progress").length;
  const openSubCount = newSubCount + inProgressSubCount;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Greeting & Quick Actions Banner */}
      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#FACC15] border border-black/20 flex items-center justify-center font-heading font-black text-lg text-slate-950 shadow-xs shrink-0">
            {activeAdminName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-black text-base sm:text-lg text-slate-950 dark:text-white truncate">
                Halo, {activeAdminName}
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-400/60">
                {currentAdmin?.role || "Pengurus LSM"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Ringkasan antrean tugas, posisi kas bendahara, dan status keanggotaan hari ini.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("member_registrations")}
            className="btn py-2 px-3 bg-[#FACC15] hover:bg-amber-400 text-slate-950 text-xs font-heading font-black border border-black/20 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck size={14} className="text-[#DC2626] shrink-0" />
            <span className="truncate">Verifikasi ({pendingMembersCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("member_kas")}
            className="btn py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border border-emerald-500/80 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <DollarSign size={14} className="shrink-0" />
            <span className="truncate">Catat Kas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("kas_db");
              setIsKasExpenseModalOpen(true);
            }}
            className="btn col-span-2 sm:col-span-1 py-2 px-3 bg-[#DC2626] hover:bg-red-700 text-white text-xs font-heading font-black border border-red-500/80 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <TrendingDown size={14} className="shrink-0" />
            <span className="truncate">Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Antrean Tugas Perlu Tindakan (4 Actionable Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("member_registrations")}
          className={`card-brutal p-3.5 text-left border transition-all cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between gap-2 ${
            pendingMembersCount > 0
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500/80"
              : "bg-white dark:bg-[#1A1D26] border-black/15 dark:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-heading font-black uppercase text-slate-600 dark:text-slate-300">
              Pending Verifikasi
            </span>
            <UserCheck size={15} className={pendingMembersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"} />
          </div>
          <div className="text-2xl font-mono font-black text-slate-950 dark:text-white">
            {pendingMembersCount}
          </div>
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            {pendingMembersCount > 0 ? "Buka & tinjau berkas ->" : "Semua sudah diverifikasi"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("submissions")}
          className={`card-brutal p-3.5 text-left border transition-all cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between gap-2 ${
            openSubCount > 0
              ? "bg-sky-50 dark:bg-sky-950/30 border-sky-500/70"
              : "bg-white dark:bg-[#1A1D26] border-black/15 dark:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-heading font-black uppercase text-slate-600 dark:text-slate-300">
              Kotak Masuk Aktif
            </span>
            <Inbox size={15} className={openSubCount > 0 ? "text-sky-600 dark:text-sky-400" : "text-slate-400"} />
          </div>
          <div className="text-2xl font-mono font-black text-slate-950 dark:text-white">
            {openSubCount}
          </div>
          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
            {openSubCount > 0
              ? `${newSubCount} baru • ${inProgressSubCount} diproses`
              : `Semua selesai (${submissions.length} arsip)`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setKasMemberStatusFilter("unpaid");
            setActiveTab("member_kas");
          }}
          className="card-brutal p-3.5 text-left bg-rose-50/80 dark:bg-rose-950/25 border border-rose-400/70 transition-all cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-heading font-black uppercase text-rose-800 dark:text-rose-300">
              Kas Belum Bayar
            </span>
            <DollarSign size={15} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-mono font-black text-rose-700 dark:text-rose-300">
            {unpaidKasCount}
          </div>
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
            {totalKasExpiringCount > 0 ? `${totalKasExpiringCount} segera jatuh tempo` : "Lihat daftar kas ->"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bansos_db")}
          className="card-brutal p-3.5 text-left bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 transition-all cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-heading font-black uppercase text-slate-600 dark:text-slate-300">
              Bansos Belum Diambil
            </span>
            <Gift size={15} className="text-[#DC2626] dark:text-[#FACC15]" />
          </div>
          <div className="text-2xl font-mono font-black text-slate-950 dark:text-white">
            {unclaimedBansosCount}
          </div>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Dari total {bansosClaims.length} klaim -&gt;
          </span>
        </button>
      </div>

      {/* Middle Split: Posisi Kas Bendahara + Keanggotaan & Jasra */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Posisi Kas Bendahara (7 cols) */}
        <div className="lg:col-span-7 card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Landmark size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-slate-900 dark:text-slate-100">
                Posisi Kas Bendahara
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("kas_db")}
              className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer"
            >
              Buka Buku Kas &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-500/60">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                Saldo Bersih LSM
              </span>
              <strong className="text-lg font-mono font-black text-emerald-800 dark:text-emerald-300 mt-0.5 block">
                {formatCurrency(kasSummary.netBalance)}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-400/70">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-900 dark:text-amber-300 block">
                Kas Oita
              </span>
              <strong className="text-base font-mono font-black text-amber-950 dark:text-amber-200 mt-0.5 block">
                {formatCurrency(kasSummary.oitaBalance)}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-400/70">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-900 dark:text-indigo-300 block">
                Kas Darren
              </span>
              <strong className="text-base font-mono font-black text-indigo-950 dark:text-indigo-200 mt-0.5 block">
                {formatCurrency(kasSummary.darrenBalance)}
              </strong>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-heading font-black uppercase text-slate-500">
              Mutasi Terbaru
            </span>
            <div className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#1A1D26]">
              {recentKasTx.length === 0 ? (
                <div className="p-3 text-xs text-slate-500 text-center">Belum ada transaksi kas.</div>
              ) : (
                recentKasTx.map((tx) => {
                  const tUpper = (tx.type || "").toUpperCase();
                  const isInc = tUpper === "INCOME";
                  const isTrf = tUpper === "TRANSFER";
                  return (
                    <div key={tx.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {tx.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {formatKasDate(tx.timestamp || tx.date)} • Kas {tx.wallet || "Oita"}
                        </div>
                      </div>
                      <span
                        className={`font-mono font-black text-xs shrink-0 ${
                          isTrf
                            ? "text-indigo-600 dark:text-indigo-400"
                            : isInc
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {isTrf ? "↔ " : isInc ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Keanggotaan & Voucher Jasra (5 cols) */}
        <div className="lg:col-span-5 card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col justify-between gap-3.5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Users2 size={16} className="text-[#DC2626] dark:text-[#FACC15]" />
                <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-slate-900 dark:text-slate-100">
                  Keanggotaan &amp; Jasra
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("members_db")}
                className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer"
              >
                Database &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#1E222D] border border-black/10 dark:border-white/10">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                  Anggota Resmi
                </span>
                <strong className="text-xl font-mono font-black text-slate-950 dark:text-white mt-0.5 block">
                  {approvedMembersList.length}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-400/60">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-900 dark:text-amber-300 block">
                  Voucher Jasra Aktif
                </span>
                <strong className="text-xl font-mono font-black text-amber-900 dark:text-[#FACC15] mt-0.5 block">
                  {totalVoucherActiveCount}
                </strong>
              </div>
            </div>

            {/* Kas Paid Progress Bar */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#1E222D] border border-black/10 dark:border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Kepatuhan Iuran Kas
                </span>
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {totalKasActiveCount}/{approvedMembersList.length} ({kasPaidPct}%)
                </strong>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${kasPaidPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("members_db")}
              className="btn py-2 px-3 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold border border-black/15 dark:border-white/10 cursor-pointer"
            >
              Database Anggota
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("jasra_panel")}
              className="btn py-2 px-3 bg-[#FACC15] hover:bg-amber-400 text-slate-950 text-xs font-black border border-black/20 cursor-pointer"
            >
              Kelola Jasra
            </button>
          </div>
        </div>
      </div>

      {/* Latest Pengurus Activity Snapshot */}
      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-sky-600 dark:text-sky-400" />
            <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-slate-900 dark:text-slate-100">
              Aktivitas Pengurus Terbaru
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer"
          >
            Lihat Semua Log &rarr;
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            Belum ada aktivitas terbaru tercatat.
          </p>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#1A1D26]">
            {recentLogs.map((log) => (
              <div key={log.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="min-w-0">
                  <span className="font-heading font-black text-slate-900 dark:text-slate-100">
                    {log.action}
                  </span>
                  {log.detail && (
                    <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                      - {log.detail}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-500 shrink-0">
                  <strong className="text-slate-700 dark:text-slate-300">{log.adminName}</strong>
                  {" • "}
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
