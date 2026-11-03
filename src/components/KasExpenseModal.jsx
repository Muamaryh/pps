// ==========================================================================
// MODAL PENCATATAN PENGELUARAN KAS - LSM PAGUYUBAN PIZZA SANDY SHORES
// ==========================================================================

import React, { useState } from "react";
import { X, TrendingDown, Calendar, AlertCircle } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  recordKasExpenseCloud,
  formatCurrency,
  getTodayIndonesianDateString,
} from "../services/kasService";
import BrutalistSelect from "./BrutalistSelect";
import BrutalistDatePicker from "./BrutalistDatePicker";

export default function KasExpenseModal({
  isOpen,
  onClose,
  currentBalance = 0,
  oitaBalance = 0,
  darrenBalance = 0,
  onSuccess,
  onShowToast,
}) {
  if (!isOpen) return null;

  const [wallet, setWallet] = useState("Oita"); // "Oita" | "Darren"
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Operasional & Logistik");
  const [amount, setAmount] = useState("");
  const [responsible, setResponsible] = useState("Oita");
  const [customDate, setCustomDate] = useState(() => getTodayIndonesianDateString());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = Math.max(0, Number(amount) || 0);
  const selectedWalletBalance = wallet === "Darren" ? darrenBalance : oitaBalance;
  const projectedWalletBalance = selectedWalletBalance - numericAmount;
  const projectedTotalBalance = currentBalance - numericAmount;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      if (onShowToast) onShowToast("Judul keperluan pengeluaran wajib diisi", "warning");
      return;
    }
    if (numericAmount <= 0) {
      if (onShowToast) onShowToast("Nominal pengeluaran harus lebih dari $0", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await recordKasExpenseCloud({
        title: title.trim(),
        category,
        amount: numericAmount,
        wallet,
        responsible: responsible.trim() || `Kas ${wallet}`,
        customDate,
        notes: notes.trim(),
        recordedBy: "Admin",
      });

      if (onShowToast) {
        onShowToast(
          `Pengeluaran ${formatCurrency(numericAmount)} (${title.trim()}) dari Kas ${wallet} berhasil dicatat.`,
          "info"
        );
      }

      if (typeof onSuccess === "function") {
        onSuccess(tx);
      }
      onClose();
    } catch (err) {
      console.error("Gagal mencatat pengeluaran kas:", err);
      if (onShowToast) onShowToast("Gagal mencatat pengeluaran. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#161820] bg-[var(--modal-bg)] border-[3px] border-black dark:border-[#475569] rounded-xl shadow-[8px_8px_0px_#000] p-4 sm:p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#475569]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#DC2626] border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[1.5px_1.5px_0px_#000]">
              <TrendingDown size={18} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Catat Pengeluaran Kas LSM
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                LSM Paguyuban Pizza Sandy Shores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ringkasan Saldo Kas Dua Bendahara */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded bg-slate-100 dark:bg-[#161820] border border-black/20 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Kas Oita</span>
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
              {formatCurrency(oitaBalance)}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-100 dark:bg-[#161820] border border-black/20 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Kas Darren</span>
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
              {formatCurrency(darrenBalance)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          {/* Pilihan Sumber Kas Bendahara */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Sumber Kas (Diambil dari Kas Siapa?) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setWallet("Oita");
                  if (responsible === "Darren") setResponsible("Oita");
                }}
                className={`p-2.5 rounded border-2 text-left cursor-pointer transition-all ${
                  wallet === "Oita"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-[#FACC15] shadow-[2px_2px_0px_#000]"
                    : "bg-white dark:bg-[#1E212B] border-black/20 dark:border-white/20 hover:border-black"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-slate-900 dark:text-slate-100 uppercase">
                    Kas Oita
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${wallet === "Oita" ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-slate-300"}`} />
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                  Saldo: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(oitaBalance)}</strong>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWallet("Darren");
                  if (responsible === "Oita") setResponsible("Darren");
                }}
                className={`p-2.5 rounded border-2 text-left cursor-pointer transition-all ${
                  wallet === "Darren"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-[#FACC15] shadow-[2px_2px_0px_#000]"
                    : "bg-white dark:bg-[#1E212B] border-black/20 dark:border-white/20 hover:border-black"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-slate-900 dark:text-slate-100 uppercase">
                    Kas Darren
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${wallet === "Darren" ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-slate-300"}`} />
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                  Saldo: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(darrenBalance)}</strong>
                </div>
              </button>
            </div>
          </div>

          {/* Judul Pengeluaran */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Keperluan / Judul Pengeluaran <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Contoh: Pembagian Uang ke Anggota yg menghadiri Peresmian"
              className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kategori */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Kategori Pengeluaran
              </label>
              <BrutalistSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={EXPENSE_CATEGORIES}
                placeholder="Pilih kategori pengeluaran..."
              />
            </div>

            {/* Nominal */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nominal ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  $
                </span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0"
                  className="input-field pl-8 font-mono font-bold text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tanggal */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tanggal Pengeluaran
              </label>
              <BrutalistDatePicker
                value={customDate}
                onChange={(val) => setCustomDate(val)}
                placeholder="Pilih tanggal pengeluaran..."
                dropUp="auto"
              />
            </div>

            {/* Penanggung Jawab */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Penanggung Jawab / Pengurus
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Contoh: Oita / Darren / Evan"
                className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
              />
            </div>
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Catatan / Rincian Nota (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rincian barang atau keperluan..."
              className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full resize-none"
            />
          </div>

          {/* Rincian Sisa Saldo Setelah Pengeluaran */}
          {numericAmount > 0 && (
            <div className="p-3 rounded bg-red-50 dark:bg-red-950/30 border-2 border-red-500/40 text-xs flex flex-col gap-1 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-red-800 dark:text-red-300">Sisa Saldo Kas {wallet}:</span>
                <strong className={projectedWalletBalance < 0 ? "text-red-600 font-black" : "text-slate-900 dark:text-slate-100 font-bold"}>
                  {formatCurrency(projectedWalletBalance)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-red-200 dark:border-red-900/40">
                <span>Total Saldo LSM Bersih:</span>
                <span className="font-bold">{formatCurrency(projectedTotalBalance)}</span>
              </div>
              {projectedWalletBalance < 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-bold mt-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Perhatian: Nominal melebihi saldo fisik kas {wallet}!</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <TrendingDown size={15} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Pengeluaran"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
