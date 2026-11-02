// ==========================================================================
// MODAL PENCATATAN PEMASUKAN DANA KAS NON-IURAN - LSM PAGUYUBAN PIZZA SANDY SHORES
// Donasi warga, Sponsorship, Pendapatan Stand UMKM/Pizza, Hibah, dll.
// ==========================================================================

import React, { useState } from "react";
import { X, TrendingUp, DollarSign, HeartHandshake } from "lucide-react";
import {
  INCOME_CATEGORIES,
  recordKasIncomeCloud,
  formatCurrency,
  getTodayIndonesianDateString,
} from "../services/kasService";
import BrutalistSelect from "./BrutalistSelect";
import BrutalistDatePicker from "./BrutalistDatePicker";

export default function KasIncomeModal({
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
  const [category, setCategory] = useState("Donasi Sukarela & Warga");
  const [amount, setAmount] = useState("");
  const [responsible, setResponsible] = useState("Oita");
  const [donorName, setDonorName] = useState("");
  const [customDate, setCustomDate] = useState(() => getTodayIndonesianDateString());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = Math.max(0, Number(amount) || 0);
  const selectedWalletBalance = wallet === "Darren" ? darrenBalance : oitaBalance;
  const projectedWalletBalance = selectedWalletBalance + numericAmount;
  const projectedTotalBalance = currentBalance + numericAmount;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      if (onShowToast) onShowToast("Judul / sumber pemasukan wajib diisi", "warning");
      return;
    }
    if (numericAmount <= 0) {
      if (onShowToast) onShowToast("Nominal pemasukan harus lebih dari $0", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedTitle = donorName.trim()
        ? `${title.trim()} (Dari: ${donorName.trim()})`
        : title.trim();

      const tx = await recordKasIncomeCloud({
        title: formattedTitle,
        category,
        amount: numericAmount,
        wallet,
        responsible: responsible.trim() || `Kas ${wallet}`,
        memberName: donorName.trim() || null,
        customDate,
        notes: notes.trim(),
        allocationMode: "GENERAL_INCOME",
        recordedBy: "Admin",
      });

      if (onShowToast) {
        onShowToast(
          `Pemasukan ${formatCurrency(numericAmount)} (${title.trim()}) disetorkan ke Kas ${wallet} berhasil dicatat.`,
          "success"
        );
      }

      if (typeof onSuccess === "function") {
        onSuccess(tx);
      }
      onClose();
    } catch (err) {
      console.error("Gagal mencatat pemasukan kas:", err);
      if (onShowToast) onShowToast("Gagal mencatat pemasukan dana. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[var(--modal-bg)] border-[3px] border-black dark:border-[#475569] rounded-xl shadow-[8px_8px_0px_#000] p-4 sm:p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#475569]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-600 border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[1.5px_1.5px_0px_#000]">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Catat Pemasukan Kas LSM
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Donasi Warga, Sponsorship, Penjualan UMKM & Dana Masuk Lainnya
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
          {/* Pilihan Bendahara Penerima Kas */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Disetorkan ke Kas Bendahara Siapa? <span className="text-red-500">*</span>
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

          {/* Judul Pemasukan */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Sumber / Keperluan Pemasukan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Contoh: Donasi Warga Sandy Shores / Penjualan Stand Pizza"
              className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kategori */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Kategori Pemasukan
              </label>
              <BrutalistSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={INCOME_CATEGORIES}
                placeholder="Pilih kategori pemasukan..."
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
                Tanggal Pemasukan
              </label>
              <BrutalistDatePicker
                value={customDate}
                onChange={(val) => setCustomDate(val)}
                placeholder="Pilih tanggal pemasukan..."
                dropUp="auto"
              />
            </div>

            {/* Penanggung Jawab / Penerima */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Penerima Kas / Petugas
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Contoh: Oita / Darren"
                className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
              />
            </div>
          </div>

          {/* Donatur / Pihak Penyetor (Opsional) */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nama Donatur / Pihak Penyetor (Opsional)
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Contoh: Michael Townley / Toko Pancing Sandy"
              className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
            />
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Catatan Transaksi (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rincian informasi tambahan, nomor nota, lokasi transaksi..."
              className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full resize-none"
            />
          </div>

          {/* Rincian Penambahan Saldo */}
          {numericAmount > 0 && (
            <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/40 text-xs flex flex-col gap-1 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 dark:text-emerald-300">Estimasi Saldo Kas {wallet} Menjadi:</span>
                <strong className="text-emerald-800 dark:text-emerald-300 font-black">
                  +{formatCurrency(projectedWalletBalance)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-200 dark:border-emerald-900/40">
                <span>Total Saldo LSM Bersih Menjadi:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(projectedTotalBalance)}</span>
              </div>
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
              className="py-2.5 px-5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <TrendingUp size={15} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Pemasukan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
