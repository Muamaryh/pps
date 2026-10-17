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
    danger: "bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-[3px_3px_0px_#000]",
    warning: "bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] shadow-[3px_3px_0px_#000]",
    info: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[3px_3px_0px_#000]",
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
      <div className="w-full max-w-md rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b-2 border-black dark:border-[#475569] ${headerColors[variant] || headerColors.danger}`}>
          <div className="flex items-center gap-2 font-heading font-black text-sm uppercase tracking-wide">
            {icons[variant] || icons.danger}
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded border border-black dark:border-slate-500 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 flex items-center justify-center font-black hover:scale-105 transition-transform"
            title="Batal dan Tutup"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Message */}
        <div className="p-5 flex flex-col gap-3">
          <div className="p-3.5 rounded bg-amber-50/60 dark:bg-[#161820] border-2 border-black/15 dark:border-white/10 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 dark:text-slate-200">
            {message}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            * Peringatan keamanan sistem LSM PPS. Pastikan tindakan Anda sudah benar.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 pb-5 pt-1 flex items-center justify-end gap-3 border-t border-black/10 dark:border-white/10 bg-slate-50/50 dark:bg-[#1A1D26]">
          <button
            type="button"
            onClick={onClose}
            className="btn py-2 px-4 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] font-heading font-black text-xs uppercase cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn py-2 px-4 border-2 border-black font-heading font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[2px] active:translate-y-[2px] transition-all ${
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
