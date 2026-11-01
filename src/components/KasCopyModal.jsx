// ==========================================================================
// MODAL SALIN LAPORAN KAS - LSM PAGUYUBAN PIZZA SANDY SHORES
// Salin laporan lengkap / ringkasan teks untuk Discord, WhatsApp, Memo IC
// ==========================================================================

import React, { useState, useEffect, useRef } from "react";
import { X, Copy, Check, FileText, SlidersHorizontal, Building2 } from "lucide-react";
import { generateKasReportText } from "../services/kasService";

export default function KasCopyModal({
  isOpen,
  onClose,
  transactions = [],
  summary = null,
  onShowToast,
}) {
  if (!isOpen) return null;

  const [mode, setMode] = useState("FULL"); // "FULL" | "SUMMARY"
  const [walletFilter, setWalletFilter] = useState("ALL"); // "ALL" | "OITA" | "DARREN"
  const [reportText, setReportText] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  // Generate / perbarui teks saat mode atau filter berganti
  useEffect(() => {
    const text = generateKasReportText({
      transactions,
      summary,
      mode,
      walletFilter,
    });
    setReportText(text);
  }, [mode, walletFilter, transactions, summary]);

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(reportText);
      } else if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
      }
      setCopied(true);
      if (onShowToast) {
        onShowToast("Laporan kas berhasil disalin ke clipboard! Siap dipaste ke Discord/WhatsApp.", "success");
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin teks laporan kas:", err);
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        if (onShowToast) {
          onShowToast("Laporan kas berhasil disalin ke clipboard!", "success");
        }
        setTimeout(() => setCopied(false), 2500);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="card-brutal w-full max-w-2xl bg-[var(--modal-bg)] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] p-4 sm:p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#475569]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-950 shrink-0 shadow-[1.5px_1.5px_0px_#000]">
              <Copy size={18} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Salin Teks Laporan Kas LSM
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Format teks siap tempel ke Discord, WhatsApp, atau pengumuman anggota
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

        {/* Kontrol Pilihan Format */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-black/10 dark:border-white/10">
          {/* Mode Tab */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode("FULL")}
              className={`py-1.5 px-3 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                mode === "FULL"
                  ? "bg-slate-900 text-white shadow-[1px_1px_0px_#000]"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              Laporan Lengkap (+ Mutasi)
            </button>
            <button
              type="button"
              onClick={() => setMode("SUMMARY")}
              className={`py-1.5 px-3 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                mode === "SUMMARY"
                  ? "bg-slate-900 text-white shadow-[1px_1px_0px_#000]"
                  : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              Ringkasan Saldo Saja
            </button>
          </div>

          {/* Pos Kas Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-mono text-slate-500">Pos:</span>
            <button
              type="button"
              onClick={() => setWalletFilter("ALL")}
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded border ${
                walletFilter === "ALL"
                  ? "bg-[#FACC15] text-black border-black font-black"
                  : "bg-transparent text-slate-500 border-black/20 hover:text-black dark:hover:text-white"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setWalletFilter("OITA")}
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded border ${
                walletFilter === "OITA"
                  ? "bg-amber-400 text-black border-black font-black"
                  : "bg-transparent text-slate-500 border-black/20 hover:text-black dark:hover:text-white"
              }`}
            >
              Kas Oita
            </button>
            <button
              type="button"
              onClick={() => setWalletFilter("DARREN")}
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded border ${
                walletFilter === "DARREN"
                  ? "bg-indigo-400 text-black border-black font-black"
                  : "bg-transparent text-slate-500 border-black/20 hover:text-black dark:hover:text-white"
              }`}
            >
              Kas Darren
            </button>
          </div>
        </div>

        {/* Textarea Pratinjau Teks */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Pratinjau Teks (Dapat diedit sebelum disalin):</span>
            <span>{reportText.length} Karakter</span>
          </div>
          <textarea
            ref={textareaRef}
            rows={14}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full p-3 font-mono text-xs leading-relaxed bg-slate-50 dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] rounded shadow-[inset_1px_1px_0px_#000] focus:outline-none focus:border-[#DC2626] resize-y select-all"
            placeholder="Menyiapkan teks laporan kas..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-black/10 dark:border-white/10">
          <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Klik tombol salin lalu tekan <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200 border border-black/20">Ctrl + V</kbd>
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`py-2.5 px-5 rounded text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-2 ${
                copied
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-[#FACC15] hover:bg-[#EAB308] text-slate-950"
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} className="stroke-[3]" />
                  <span>BERHASIL DISALIN!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>SALIN KE CLIPBOARD</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
