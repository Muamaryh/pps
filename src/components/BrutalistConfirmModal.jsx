import React, { useEffect } from "react";
import { AlertTriangle, Trash2, HelpCircle, X, Check } from "lucide-react";

/**
 * Custom Neo-Brutalist Confirmation Modal
 * Replaces ugly native browser window.confirm / localhost says alerts
 */
export default function BrutalistConfirmModal({
  isOpen,
  title = "Konfirmasi Tindakan",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  variant = "danger", // "danger" | "warning" | "info"
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const headerColors = {
    danger: "bg-[#DC2626] text-white",
    warning: "bg-[#FACC15] text-[#111827]",
    info: "bg-[#2563EB] text-white",
  };

  const confirmBtnStyles = {
    danger: "bg-[#DC2626] hover:bg-[#B91C1C] text-white border-red-500/70 shadow-sm",
    warning: "bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-amber-500/70 shadow-sm",
    info: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-blue-500/70 shadow-sm",
  };

  const icons = {
    danger: <Trash2 size={20} className="shrink-0" />,
    warning: <AlertTriangle size={20} className="shrink-0" />,
    info: <HelpCircle size={20} className="shrink-0" />,
  };

  return (
    <div
      className="fixed inset-0 z-[250] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B0D14] border border-black/15 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3.5 border-b border-black/10 dark:border-white/10 ${headerColors[variant] || headerColors.danger}`}>
          <div className="flex items-center gap-2 font-heading font-black text-sm uppercase tracking-wide">
            {icons[variant] || icons.danger}
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/15 bg-white/90 dark:bg-[#141724] text-slate-900 dark:text-slate-100 flex items-center justify-center font-black hover:bg-white dark:hover:bg-[#1D2233] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            title="Batal dan Tutup"
            aria-label="Batal dan Tutup"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Message */}
        <div className="p-5 flex flex-col gap-3">
          <div className="p-3.5 rounded-xl bg-[#F6F4ED] dark:bg-[#141724] border border-black/10 dark:border-white/10 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 dark:text-slate-200">
            {message}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * Peringatan keamanan sistem LSM PPS. Pastikan tindakan Anda sudah benar.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 pb-5 pt-3 flex items-center justify-end gap-2.5 border-t border-black/10 dark:border-white/10 bg-[#FAF8F3] dark:bg-[#0E111B]">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/15 dark:border-white/15 shadow-sm active:translate-y-0.5 font-heading font-black text-xs uppercase cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`py-2 px-4 rounded-xl border font-heading font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
              confirmBtnStyles[variant] || confirmBtnStyles.danger
            }`}
          >
            <Check size={14} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
