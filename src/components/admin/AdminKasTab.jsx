import React from "react";
import {
  DollarSign,
  Plus,
  TrendingDown,
  ArrowLeftRight,
  FileSpreadsheet,
  Send,
  Search,
  Edit2,
  Trash2,
} from "lucide-react";

export default function AdminKasTab({
  kasSummary,
  kasTransactions,
  filteredKasTransactions,
  kasRunningBalances,
  kasSearchQuery,
  setKasSearchQuery,
  kasFilterType,
  setKasFilterType,
  formatCurrency,
  formatKasDate,
  setActiveTab,
  setIsKasIncomeModalOpen,
  setIsKasExpenseModalOpen,
  setIsKasTransferModalOpen,
  setIsKasCopyModalOpen,
  handleExportKasExcel,
  handleOpenEditKasTx,
  handleDeleteKasTx,
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Card with Actions */}
      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-slate-900 shadow-xs shrink-0">
            <DollarSign size={20} className="text-[#DC2626]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                Keuangan LSM PPS
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-400">
                TRANSPARAN
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pencatatan kas organisasi, iuran anggota, donasi, dan alokasi dana operasional Sandy Shores
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:flex-wrap gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("member_kas")}
            className="py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] sm:text-xs font-heading font-black border border-black/20 dark:border-white/15 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
            title="Buka menu khusus pencatatan iuran kas anggota LSM"
          >
            <DollarSign size={15} className="shrink-0" />
            <span className="truncate">Catat Kas Anggota</span>
          </button>

          <button
            type="button"
            onClick={() => setIsKasIncomeModalOpen(true)}
            className="py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-heading font-black border border-emerald-500/80 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
            title="Catat dana masuk baru (donasi warga, sponsorship, hasil UMKM, dll)"
          >
            <Plus size={15} className="shrink-0" />
            <span className="truncate">Catat Pemasukan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsKasExpenseModalOpen(true)}
            className="py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] sm:text-xs font-heading font-black border border-red-500/80 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
            title="Catat pengeluaran baru kas LSM"
          >
            <TrendingDown size={15} className="shrink-0" />
            <span className="truncate">Catat Pengeluaran</span>
          </button>

          <button
            type="button"
            onClick={() => setIsKasTransferModalOpen(true)}
            className="py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-heading font-black border border-indigo-500/80 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
            title="Pindahkan saldo antar bendahara (Kas Oita <-> Kas Darren) tanpa masuk pengeluaran"
          >
            <ArrowLeftRight size={15} className="shrink-0" />
            <span className="truncate">Pindah Kas</span>
          </button>

          <button
            type="button"
            onClick={handleExportKasExcel}
            disabled={kasTransactions.length === 0}
            className="py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-heading font-black border border-black/20 dark:border-white/15 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer rounded"
            title="Download seluruh mutasi kas dalam format Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} className="shrink-0" />
            <span className="truncate">Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsKasCopyModalOpen(true)}
            className="py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] sm:text-xs font-heading font-black border border-indigo-400/70 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
            title="Teruskan laporan lengkap atau ringkasan saldo kas langsung ke Discord Keuangan"
          >
            <Send size={14} className="shrink-0" />
            <span className="truncate">Kirim ke Discord</span>
          </button>
        </div>
      </div>

      {/* Metric Cards: 2 Pos Kas Bendahara & Total Saldo Bersih */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-brutal p-3.5 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500 dark:border-amber-400 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-black text-amber-900 dark:text-amber-300 uppercase">
              Kas di Oita (Bendahara)
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-mono font-black text-amber-950 dark:text-amber-200">
              {formatCurrency(kasSummary.oitaBalance)}
            </strong>
          </div>
          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono">
            Masuk: +{formatCurrency(kasSummary.oitaIncome)} • Keluar: -{formatCurrency(kasSummary.oitaExpense)}
          </span>
        </div>

        <div className="card-brutal p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-500 dark:border-indigo-400 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-black text-indigo-900 dark:text-indigo-300 uppercase">
              Kas di Darren (Bendahara)
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-mono font-black text-indigo-950 dark:text-indigo-200">
              {formatCurrency(kasSummary.darrenBalance)}
            </strong>
          </div>
          <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-mono">
            Masuk: +{formatCurrency(kasSummary.darrenIncome)} • Keluar: -{formatCurrency(kasSummary.darrenExpense)}
          </span>
        </div>

        <div className="card-brutal p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-black text-emerald-900 dark:text-emerald-300 uppercase">
              Total Saldo Bersih LSM
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-mono font-black text-emerald-800 dark:text-emerald-300">
              {formatCurrency(kasSummary.netBalance)}
            </strong>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
            Total gabungan kas Oita + Darren
          </span>
        </div>
      </div>

      {/* Arus Kas: Total Pemasukan vs Total Pengeluaran */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-black text-slate-500 uppercase">
              Akumulasi Pemasukan
            </span>
            <strong className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400">
              +{formatCurrency(kasSummary.totalIncome)}
            </strong>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
            {kasSummary.incomeCount} transaksi masuk
          </span>
        </div>

        <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-sans font-black text-slate-500 uppercase">
              Akumulasi Pengeluaran
            </span>
            <strong className="text-base font-mono font-black text-rose-700 dark:text-rose-400">
              -{formatCurrency(kasSummary.totalExpense)}
            </strong>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300">
            {kasSummary.expenseCount} transaksi keluar
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi, nama anggota, CID, bendahara, catatan..."
            value={kasSearchQuery}
            onChange={(e) => setKasSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#20232E] border border-black/15 dark:border-white/10 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 sm:flex-wrap sm:overflow-visible">
          <button
            type="button"
            onClick={() => setKasFilterType("ALL")}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              kasFilterType === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            Semua ({kasTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setKasFilterType("INCOME")}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              kasFilterType === "INCOME"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-emerald-50"
            }`}
          >
            Pemasukan ({kasSummary.incomeCount})
          </button>
          <button
            type="button"
            onClick={() => setKasFilterType("EXPENSE")}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              kasFilterType === "EXPENSE"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-rose-50"
            }`}
          >
            Pengeluaran ({kasSummary.expenseCount})
          </button>
          <button
            type="button"
            onClick={() => setKasFilterType("TRANSFER")}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              kasFilterType === "TRANSFER"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
            }`}
          >
            Pindah Kas ({kasSummary.transferCount || 0})
          </button>
          <button
            type="button"
            onClick={() => setKasFilterType("OITA")}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              kasFilterType === "OITA"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-amber-50"
            }`}
          >
            Kas Oita
          </button>
          <button
            type="button"
            onClick={() => setKasFilterType("DARREN")}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              kasFilterType === "DARREN"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
            }`}
          >
            Kas Darren
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card-brutal bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-[#20232E] border-b border-black/15 dark:border-white/10 text-[10px] font-heading font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-2.5 px-3">Tanggal / Waktu</th>
                <th className="py-2.5 px-3">Pos Kas</th>
                <th className="py-2.5 px-3">Jenis &amp; Kategori</th>
                <th className="py-2.5 px-3">Keterangan / Terkait</th>
                <th className="py-2.5 px-3">Penanggung Jawab</th>
                <th className="py-2.5 px-3 text-right">Nominal ($)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  {kasFilterType === "OITA"
                    ? "Saldo Oita ($)"
                    : kasFilterType === "DARREN"
                    ? "Saldo Darren ($)"
                    : "Saldo Bersih ($)"}
                </th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10 font-mono text-xs">
              {filteredKasTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredKasTransactions.map((tx) => {
                  const txTypeUpper = (tx.type || "").toUpperCase();
                  const isIncome = txTypeUpper === "INCOME";
                  const isTransfer = txTypeUpper === "TRANSFER";
                  const fromW = tx.fromWallet || tx.wallet || "Oita";
                  const toW = tx.toWallet || (fromW === "Darren" ? "Oita" : "Darren");
                  const txWalletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
                  const isDarren = tx.wallet === "Darren" || txWalletText.includes("darren");
                  const balInfo = kasRunningBalances[tx.id];
                  const isOitaView = kasFilterType === "OITA";
                  const isDarrenView = kasFilterType === "DARREN";
                  const balBefore = balInfo
                    ? isOitaView
                      ? balInfo.oitaBefore
                      : isDarrenView
                      ? balInfo.darrenBefore
                      : balInfo.netBefore
                    : 0;
                  const balAfter = balInfo
                    ? isOitaView
                      ? balInfo.oitaAfter
                      : isDarrenView
                      ? balInfo.darrenAfter
                      : balInfo.netAfter
                    : 0;
                  const viewDelta = balInfo
                    ? isOitaView
                      ? balInfo.oitaDelta
                      : isDarrenView
                      ? balInfo.darrenDelta
                      : balInfo.delta
                    : 0;
                  const absAmt = Math.abs(Number(tx.amount) || 0);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
                        {formatKasDate(tx.timestamp || tx.date)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isTransfer ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-heading font-black border bg-sky-100 text-sky-900 border-sky-400 dark:bg-sky-950/70 dark:text-sky-200">
                            Kas {fromW} &rarr; Kas {toW}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-heading font-black border ${
                              isDarren
                                ? "bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-300"
                                : "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200"
                            }`}
                          >
                            {isDarren ? "Kas Darren" : "Kas Oita"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isTransfer
                                ? "bg-indigo-100 text-indigo-800 border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300"
                                : isIncome
                                ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {isTransfer ? "Pindah Kas" : isIncome ? "Pemasukan" : "Pengeluaran"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            {tx.category || "Umum"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-sans font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {tx.title}
                        </div>
                        {(tx.memberName || tx.memberCid) && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Anggota: {tx.memberName} ({tx.memberCid})
                          </div>
                        )}
                        {tx.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-700 dark:text-slate-300">
                        {tx.responsible || tx.recordedBy || (isDarren ? "Darren" : "Oita")}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-black">
                        <span
                          className={
                            isTransfer
                              ? "text-indigo-600 dark:text-indigo-400"
                              : isIncome
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }
                        >
                          {isTransfer ? "↔ " : isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <div className="font-mono font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(balAfter)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {isTransfer && viewDelta === 0 ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              Saldo Total Tetap
                            </span>
                          ) : (
                            <>
                              {formatCurrency(balBefore)}{" "}
                              <span
                                className={
                                  viewDelta >= 0
                                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                    : "text-rose-600 dark:text-rose-400 font-bold"
                                }
                              >
                                {viewDelta >= 0 ? "+" : "-"} {formatCurrency(absAmt)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditKasTx(tx)}
                            className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-pointer transition-colors"
                            title="Edit transaksi kas ini (tanpa mengirim ulang webhook Discord)"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKasTx(tx)}
                            className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 cursor-pointer transition-colors"
                            title="Hapus catatan transaksi ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
