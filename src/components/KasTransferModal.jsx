// ==========================================================================
// MODAL PINDAH KAS ANTAR BENDAHARA - LSM PAGUYUBAN PIZZA SANDY SHORES
// Memindahkan saldo antara Kas Oita <-> Kas Darren tanpa masuk Pengeluaran/Pemasukan
// ==========================================================================

import React, { useState } from "react";
import { X, ArrowLeftRight, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  recordKasTransferCloud,
  formatCurrency,
  getTodayIndonesianDateString,
} from "../services/kasService";
import BrutalistDatePicker from "./BrutalistDatePicker";

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

export default function KasTransferModal({
  isOpen,
  onClose,
  currentBalance = 0,
  oitaBalance = 0,
  darrenBalance = 0,
  onSuccess,
  onShowToast,
  adminName = "Admin",
}) {
  const [fromWallet, setFromWallet] = useState("Oita"); // "Oita" | "Darren"
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [responsible, setResponsible] = useState("Oita -> Darren");
  const [customDate, setCustomDate] = useState(() => getTodayIndonesianDateString());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toWallet = fromWallet === "Oita" ? "Darren" : "Oita";
  const numericAmount = Math.max(0, Number(amount) || 0);
  const sourceBalance = fromWallet === "Oita" ? oitaBalance : darrenBalance;
  const projectedOita = fromWallet === "Oita" ? oitaBalance - numericAmount : oitaBalance + numericAmount;
  const projectedDarren = fromWallet === "Darren" ? darrenBalance - numericAmount : darrenBalance + numericAmount;
  const isExceedingSource = numericAmount > sourceBalance;

  function handleSelectDirection(nextFrom) {
    setFromWallet(nextFrom);
    const nextTo = nextFrom === "Oita" ? "Darren" : "Oita";
    if (!responsible.trim() || responsible === "Oita -> Darren" || responsible === "Darren -> Oita") {
      setResponsible(`${nextFrom} -> ${nextTo}`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (numericAmount <= 0) {
      if (onShowToast) onShowToast("Nominal pindah kas harus lebih dari $0.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await recordKasTransferCloud({
        amount: numericAmount,
        fromWallet,
        toWallet,
        title: title.trim() || `Pindah Kas: Kas ${fromWallet} -> Kas ${toWallet}`,
        responsible: responsible.trim() || `${fromWallet} -> ${toWallet}`,
        customDate,
        notes: notes.trim(),
        recordedBy: adminName || "Admin",
      });

      if (onShowToast) {
        onShowToast(
          `Pindah kas ${formatCurrency(numericAmount)} dari Kas ${fromWallet} ke Kas ${toWallet} berhasil dicatat!`,
          "success"
        );
      }

      setAmount("");
      setTitle("");
      setNotes("");
      if (typeof onSuccess === "function") onSuccess(tx);
      onClose();
    } catch (err) {
      console.error("Gagal mencatat pindah kas:", err);
      if (onShowToast) onShowToast(err?.message || "Gagal mencatat pindah kas. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#161820] bg-[var(--modal-bg)] border-[3px] border-black dark:border-[#475569] rounded-2xl shadow-[8px_8px_0px_#000] p-4 sm:p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#475569]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[1.5px_1.5px_0px_#000]">
              <ArrowLeftRight size={17} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Pindah Kas Antar Bendahara
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Transfer saldo internal Oita &harr; Darren (bukan pengeluaran)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-slate-500 transition-colors"
            aria-label="Tutup modal pindah kas"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Callout */}
        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/35 border border-indigo-400/70 text-[11px] text-indigo-950 dark:text-indigo-200 flex items-start gap-2 leading-relaxed">
          <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Pindah kas internal <strong>tidak dihitung sebagai Pengeluaran maupun Pemasukan</strong>. Total Saldo Bersih LSM tetap{" "}
            <strong className="font-mono">{formatCurrency(currentBalance)}</strong>.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          {/* Arah Perpindahan Kas */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Arah Pindah Kas <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectDirection("Oita")}
                className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                  fromWallet === "Oita"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-[2px_2px_0px_#000]"
                    : "bg-slate-50 dark:bg-[#1E212B] border-black/15 dark:border-white/10 hover:border-black/40"
                }`}
              >
                <div className="font-heading font-black text-xs text-slate-900 dark:text-slate-100">
                  Kas Oita &rarr; Kas Darren
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  Saldo Oita: <strong className="text-amber-700 dark:text-amber-300">{formatCurrency(oitaBalance)}</strong>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDirection("Darren")}
                className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                  fromWallet === "Darren"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-[2px_2px_0px_#000]"
                    : "bg-slate-50 dark:bg-[#1E212B] border-black/15 dark:border-white/10 hover:border-black/40"
                }`}
              >
                <div className="font-heading font-black text-xs text-slate-900 dark:text-slate-100">
                  Kas Darren &rarr; Kas Oita
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  Saldo Darren: <strong className="text-indigo-700 dark:text-indigo-300">{formatCurrency(darrenBalance)}</strong>
                </div>
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nominal Pindah Kas ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Contoh: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field w-full font-mono text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] rounded-xl px-3 py-2"
              required
            />
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold border border-black/20 dark:border-white/15 cursor-pointer transition-colors"
                >
                  {formatCurrency(val)}
                </button>
              ))}
              {sourceBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(sourceBalance))}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-mono text-[11px] font-bold border border-amber-400 cursor-pointer transition-colors"
                >
                  Semua ({formatCurrency(sourceBalance)})
                </button>
              )}
            </div>
          </div>

          {/* Proyeksi Saldo Setelah Pindah */}
          {numericAmount > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14161F] border border-black/15 dark:border-white/10 space-y-1.5 font-mono text-[11px]">
              <div className="text-[10px] font-sans font-black uppercase text-slate-500">
                Simulasi Saldo Setelah Pindah:
              </div>
              <div className="flex items-center justify-between">
                <span>Kas Oita:</span>
                <span>
                  {formatCurrency(oitaBalance)} &rarr;{" "}
                  <strong className={projectedOita < 0 ? "text-rose-600" : "text-amber-700 dark:text-amber-300"}>
                    {formatCurrency(projectedOita)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kas Darren:</span>
                <span>
                  {formatCurrency(darrenBalance)} &rarr;{" "}
                  <strong className={projectedDarren < 0 ? "text-rose-600" : "text-indigo-700 dark:text-indigo-300"}>
                    {formatCurrency(projectedDarren)}
                  </strong>
                </span>
              </div>
              {isExceedingSource && (
                <div className="pt-1 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-sans font-bold">
                  <AlertCircle size={12} />
                  <span>Perhatian: nominal melebihi saldo Kas {fromWallet} saat ini.</span>
                </div>
              )}
            </div>
          )}

          {/* Keterangan & PJ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Keterangan (Opsional)
              </label>
              <input
                type="text"
                placeholder={`Pindah Kas: Kas ${fromWallet} -> Kas ${toWallet}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field w-full text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/20 dark:border-white/15 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Penanggung Jawab
              </label>
              <input
                type="text"
                placeholder={`${fromWallet} -> ${toWallet}`}
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                className="input-field w-full text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/20 dark:border-white/15 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          {/* Tanggal & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tanggal Transaksi
              </label>
              <BrutalistDatePicker value={customDate} onChange={setCustomDate} />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Misal: Titip dana untuk operasional acara"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field w-full text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/20 dark:border-white/15 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numericAmount <= 0}
              className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              <ArrowLeftRight size={15} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Pindah Kas"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
