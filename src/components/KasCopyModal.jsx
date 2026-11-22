// ==========================================================================
// MODAL TERUSKAN LAPORAN KAS KE DISCORD - LSM PAGUYUBAN PIZZA SANDY SHORES
// Kirim laporan lengkap / ringkasan saldo kas langsung ke Discord Keuangan
// ==========================================================================

import React, { useState, useEffect, useRef } from "react";
import { X, Copy, Check, Send, Loader2 } from "lucide-react";
import { generateKasReportText } from "../services/kasService";
import { sendDiscordNotification } from "../services/discordWebhook";

export default function KasCopyModal({
  isOpen,
  onClose,
  transactions = [],
  summary = null,
  onShowToast,
}) {
  const [mode, setMode] = useState("FULL"); // "FULL" | "SUMMARY"
  const [walletFilter, setWalletFilter] = useState("ALL"); // "ALL" | "OITA" | "DARREN"
  const [periodFilter, setPeriodFilter] = useState("MONTH"); // "MONTH" | "ALL"
  const [reportText, setReportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [sentDiscord, setSentDiscord] = useState(false);
  const textareaRef = useRef(null);

  // Generate / perbarui teks saat mode atau filter berganti
  useEffect(() => {
    if (!isOpen) return;
    const text = generateKasReportText({
      transactions,
      summary,
      mode,
      walletFilter,
      periodFilter,
    });
    setReportText(text);
    setSentDiscord(false);
  }, [isOpen, mode, walletFilter, periodFilter, transactions, summary]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSendToDiscord() {
    if (!reportText.trim()) {
      if (onShowToast) onShowToast("Isi laporan kas tidak boleh kosong!", "warning");
      return;
    }
    setIsSendingDiscord(true);
    try {
      const res = await sendDiscordNotification("KAS_REPORT", {
        reportText,
        mode,
        walletFilter,
        summary,
      });
      if (res.ok) {
        setSentDiscord(true);
        if (onShowToast) {
          onShowToast("Laporan kas berhasil diteruskan ke channel Discord Keuangan!", "success");
        }
        setTimeout(() => setSentDiscord(false), 3000);
      } else {
        if (onShowToast) {
          onShowToast(
            "Gagal meneruskan ke Discord: " + (res.error || res.reason || "Periksa pengaturan Webhook di tab Keamanan."),
            "error"
          );
        }
      }
    } catch (err) {
      console.error("Gagal meneruskan laporan kas ke Discord:", err);
      if (onShowToast) onShowToast("Gagal menghubungi Discord. Coba lagi.", "error");
    } finally {
      setIsSendingDiscord(false);
    }
  }

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
        onShowToast("Laporan kas berhasil disalin ke clipboard!", "success");
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin teks laporan kas:", err);
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
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#161820] bg-[var(--modal-bg)] border-[3px] border-black dark:border-[#475569] rounded-2xl shadow-[8px_8px_0px_#000] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky di atas agar tidak tenggelam */}
        <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b-2 border-black dark:border-[#475569] bg-white dark:bg-[#161820] bg-[var(--modal-bg)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5865F2] border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[1.5px_1.5px_0px_#000]">
              <Send size={16} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Teruskan Laporan Kas ke Discord
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Kirim laporan lengkap atau ringkasan saldo langsung ke channel Keuangan Discord
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-transform"
            aria-label="Tutup modal"
            title="Tutup (Esc)"
          >
            <X size={16} className="stroke-[3]" />
          </button>
        </div>

        {/* Content body yang scrollable */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto flex-1">

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

          {/* Pos Kas & Periode Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-500">Periode:</span>
              <button
                type="button"
                onClick={() => setPeriodFilter("MONTH")}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer ${
                  periodFilter === "MONTH"
                    ? "bg-emerald-500 text-white border-black font-black"
                    : "bg-transparent text-slate-500 border-black/20 hover:text-black dark:hover:text-white"
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("ALL")}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer ${
                  periodFilter === "ALL"
                    ? "bg-slate-900 text-white border-black font-black"
                    : "bg-transparent text-slate-500 border-black/20 hover:text-black dark:hover:text-white"
                }`}
              >
                Semua
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-500">Pos:</span>
              <button
                type="button"
                onClick={() => setWalletFilter("ALL")}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer ${
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
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer ${
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
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer ${
                  walletFilter === "DARREN"
                    ? "bg-indigo-400 text-black border-black font-black"
                    : "bg-transparent text-slate-500 border-black/20 hover:text-black dark:hover:text-white"
                }`}
              >
                Kas Darren
              </button>
            </div>
          </div>
        </div>

        {/* Textarea Pratinjau Teks */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Pratinjau Laporan (Dapat diedit sebelum diteruskan ke Discord):</span>
            <span>{reportText.length} Karakter</span>
          </div>
          <textarea
            ref={textareaRef}
            rows={14}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full p-3 font-mono text-xs leading-relaxed bg-slate-50 dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] rounded shadow-[inset_1px_1px_0px_#000] focus:outline-none focus:border-[#5865F2] resize-y"
            placeholder="Menyiapkan teks laporan kas..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t-2 border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold border border-black/20 dark:border-white/15 cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Salin teks ke clipboard secara manual"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Tersalin" : "Salin Teks"}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isSendingDiscord}
              onClick={handleSendToDiscord}
              className={`py-2.5 px-5 rounded-xl text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-60 transition-all flex items-center gap-2 ${
                sentDiscord
                  ? "bg-emerald-500 text-white"
                  : "bg-[#5865F2] hover:bg-[#4752C4] text-white"
              }`}
            >
              {isSendingDiscord ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>MENERUSKAN...</span>
                </>
              ) : sentDiscord ? (
                <>
                  <Check size={16} className="stroke-[3]" />
                  <span>TERKIRIM KE DISCORD!</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>TERUSKAN KE DISCORD</span>
                </>
              )}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
