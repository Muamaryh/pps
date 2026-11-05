// ==========================================================================
// MODAL BUKU KAS & MUTASI KEUANGAN - LSM PAGUYUBAN PIZZA SANDY SHORES
// Riwayat Transaksi, Filter Arus Kas, Hapus Koreksi, dan Ekspor Excel
// ==========================================================================

import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Trash2,
  Calendar,
  Plus,
  Copy,
} from "lucide-react";
import {
  formatCurrency,
  formatKasDate,
  getKasSummary,
  exportKasLedgerToExcel,
  deleteKasTransactionCloud,
} from "../services/kasService";
import KasCopyModal from "./KasCopyModal";

export default function KasLedgerModal({
  isOpen,
  onClose,
  transactions = [],
  fallbackActiveKasRupiah = 0,
  onOpenIncomeModal,
  onOpenExpenseModal,
  onShowToast,
  onReload,
}) {
  if (!isOpen) return null;

  const [filterType, setFilterType] = useState("all"); // 'all' | 'INCOME' | 'EXPENSE' | 'OITA' | 'DARREN'
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const summary = getKasSummary(transactions, fallbackActiveKasRupiah);

  // Filter transaksi
  const filtered = transactions.filter((tx) => {
    const typeUpper = (tx.type || "").toUpperCase();
    const txWalletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
    const isDarren = tx.wallet === "Darren" || txWalletText.includes("darren");
    const isOita = !isDarren;

    if (filterType === "INCOME" && typeUpper !== "INCOME") return false;
    if (filterType === "EXPENSE" && typeUpper !== "EXPENSE") return false;
    if (filterType === "OITA" && !isOita) return false;
    if (filterType === "DARREN" && !isDarren) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (tx.title || "").toLowerCase().includes(q);
      const matchMember = (tx.memberName || "").toLowerCase().includes(q);
      const matchCid = (tx.memberCid || "").toLowerCase().includes(q);
      const matchCategory = (tx.category || "").toLowerCase().includes(q);
      const matchResp = (tx.responsible || "").toLowerCase().includes(q);
      const matchWallet = (tx.wallet || "").toLowerCase().includes(q);
      if (!matchTitle && !matchMember && !matchCid && !matchCategory && !matchResp && !matchWallet) {
        return false;
      }
    }
    return true;
  });

  async function handleDelete(tx) {
    if (!window.confirm(`Hapus catatan transaksi "${tx.title}" (${formatCurrency(tx.amount)})?`)) {
      return;
    }

    setDeletingId(tx.id);
    try {
      await deleteKasTransactionCloud(tx.id);
      if (onShowToast) onShowToast("Transaksi kas berhasil dihapus.", "info");
      if (typeof onReload === "function") onReload();
    } catch (err) {
      console.error("Gagal menghapus transaksi kas:", err);
      if (onShowToast) onShowToast("Gagal menghapus transaksi.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  function handleExport() {
    if (transactions.length === 0) {
      if (onShowToast) onShowToast("Belum ada data transaksi kas untuk diunduh.", "warning");
      return;
    }
    const success = exportKasLedgerToExcel(transactions, summary);
    if (success && onShowToast) {
      onShowToast("File Excel Buku Kas berhasil diunduh.", "success");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#161820] bg-[var(--modal-bg)] border-[3px] border-black dark:border-[#475569] rounded-2xl shadow-[8px_8px_0px_#000] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky di atas agar tidak tenggelam saat scroll */}
        <div className="sticky top-0 z-20 flex items-center justify-between p-3.5 sm:p-4 border-b-2 border-black dark:border-[#475569] bg-white dark:bg-[#161820] bg-[var(--modal-bg)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-700 border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[1.5px_1.5px_0px_#000]">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Buku Kas & Transparansi Keuangan LSM
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Pencatatan kas dipegang Oita & Darren (Sandy Shores)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(true)}
              className="py-1.5 px-3 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-heading font-black text-xs border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer flex items-center gap-1.5 rounded-lg active:translate-x-0.5 active:translate-y-0.5"
              title="Salin teks laporan kas untuk Discord / WhatsApp"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Salin Teks</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer flex items-center gap-1.5 rounded-lg active:translate-x-0.5 active:translate-y-0.5"
              title="Unduh format Excel"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              aria-label="Tutup modal"
              title="Tutup (Esc)"
            >
              <X size={16} className="stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Content body yang scrollable */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto flex-1">

        {/* 3 Kartu Saldo: Kas Oita, Kas Darren, dan Saldo Bersih */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Kas Oita */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500/50 shadow-[1.5px_1.5px_0px_#000] flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-amber-900 dark:text-amber-300">
                Kas di Oita (Bendahara)
              </span>
            </div>
            <strong className="text-sm sm:text-base font-mono font-black text-amber-950 dark:text-amber-200">
              {formatCurrency(summary.oitaBalance)}
            </strong>
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono">
              Masuk: +{formatCurrency(summary.oitaIncome)} • Keluar: -{formatCurrency(summary.oitaExpense)}
            </span>
          </div>

          {/* Kas Darren */}
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-500/50 shadow-[1.5px_1.5px_0px_#000] flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-indigo-900 dark:text-indigo-300">
                Kas di Darren (Bendahara)
              </span>
            </div>
            <strong className="text-sm sm:text-base font-mono font-black text-indigo-950 dark:text-indigo-200">
              {formatCurrency(summary.darrenBalance)}
            </strong>
            <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-mono">
              Masuk: +{formatCurrency(summary.darrenIncome)} • Keluar: -{formatCurrency(summary.darrenExpense)}
            </span>
          </div>

          {/* Total Saldo Bersih */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-[1.5px_1.5px_0px_#000] flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-emerald-900 dark:text-emerald-300">
                Total Saldo Bersih LSM
              </span>
            </div>
            <strong className="text-sm sm:text-base font-mono font-black text-emerald-800 dark:text-emerald-300">
              {formatCurrency(summary.netBalance)}
            </strong>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
              +{formatCurrency(summary.totalIncome)} masuk • -{formatCurrency(summary.totalExpense)} keluar
            </span>
          </div>
        </div>

        {/* Toolbar: Filter, Search & Tombol Catat Pengeluaran */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`py-1 px-2.5 rounded-lg font-mono text-[11px] font-bold border-2 transition-colors cursor-pointer ${
                filterType === "all"
                  ? "bg-slate-900 text-white border-black"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 border-black/20"
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("INCOME")}
              className={`py-1 px-2.5 rounded-lg font-mono text-[11px] font-bold border-2 transition-colors cursor-pointer ${
                filterType === "INCOME"
                  ? "bg-emerald-600 text-white border-black"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 border-black/20"
              }`}
            >
              Pemasukan ({summary.incomeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("EXPENSE")}
              className={`py-1 px-2.5 rounded-lg font-mono text-[11px] font-bold border-2 transition-colors cursor-pointer ${
                filterType === "EXPENSE"
                  ? "bg-red-600 text-white border-black"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 border-black/20"
              }`}
            >
              Pengeluaran ({summary.expenseCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("OITA")}
              className={`py-1 px-2.5 rounded-lg font-mono text-[11px] font-bold border-2 transition-colors cursor-pointer ${
                filterType === "OITA"
                  ? "bg-amber-500 text-slate-950 border-black"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 border-black/20"
              }`}
            >
              Kas Oita
            </button>
            <button
              type="button"
              onClick={() => setFilterType("DARREN")}
              className={`py-1 px-2.5 rounded-lg font-mono text-[11px] font-bold border-2 transition-colors cursor-pointer ${
                filterType === "DARREN"
                  ? "bg-indigo-600 text-white border-black"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 border-black/20"
              }`}
            >
              Kas Darren
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-7 py-1 text-xs bg-white dark:bg-[#1E212B] border-2 border-black/30 w-full"
              />
            </div>
            {onOpenIncomeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenIncomeModal();
                }}
                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer flex items-center gap-1 shrink-0 rounded-lg active:translate-x-0.5 active:translate-y-0.5"
              >
                <Plus size={13} />
                <span>Pemasukan</span>
              </button>
            )}
            {onOpenExpenseModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExpenseModal();
                }}
                className="py-1 px-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-heading font-black text-xs border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer flex items-center gap-1 shrink-0 rounded-lg active:translate-x-0.5 active:translate-y-0.5"
              >
                <TrendingDown size={13} />
                <span>Pengeluaran</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabel / Daftar Riwayat Transaksi */}
        <div className="border-2 border-black dark:border-[#475569] rounded-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Belum ada transaksi kas yang sesuai kriteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-[#161820] text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase border-b-2 border-black/20 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Pos Kas</th>
                    <th className="py-2 px-3">Tipe / Kategori</th>
                    <th className="py-2 px-3">Keperluan / Keterangan</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-2 text-center w-8">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10 font-mono text-[11px]">
                  {filtered.map((tx) => {
                    const isIncome = (tx.type || "").toUpperCase() === "INCOME";
                    const txWalletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
                    const isDarren = tx.wallet === "Darren" || txWalletText.includes("darren");

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-[#1C202C] transition-colors">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {tx.date || formatKasDate(tx.timestamp)}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-heading font-black border ${
                              isDarren
                                ? "bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-300"
                                : "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200"
                            }`}
                          >
                            {isDarren ? "Kas Darren" : "Kas Oita"}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isIncome
                                ? "bg-emerald-50 text-emerald-800 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-red-50 text-red-800 border-red-400 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {isIncome ? "Masuk" : "Keluar"} • {tx.category || "-"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <strong className="block text-slate-900 dark:text-slate-100 font-bold text-xs">
                            {tx.title}
                          </strong>
                          {(tx.memberName || tx.responsible || tx.notes) && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {tx.memberName ? `${tx.memberName} (${tx.memberCid || "-"})` : tx.responsible}
                              {tx.notes ? ` • ${tx.notes}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-black whitespace-nowrap">
                          <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                            {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(tx)}
                            disabled={deletingId === tx.id}
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Hapus transaksi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Modal Salin Teks Laporan Kas (Discord / WA) */}
      <KasCopyModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        transactions={filtered}
        summary={summary}
        onShowToast={onShowToast}
      />
    </div>
  );
}
