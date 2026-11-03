// ==========================================================================
// MODAL DOKUMEN SURAT IZIN & LEGALITAS - LSM PIZZA SANDY SHORES
// Government State of San Andreas - Los Santos
// ==========================================================================

import React, { useEffect } from "react";
import { X } from "lucide-react";
import OfficialCharterViewer from "./OfficialCharterViewer";

export default function PermitModal({ isOpen, onClose, onShowToast }) {
  // Tutup dengan tombol Escape di keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#161820] bg-[var(--modal-bg)] rounded-xl border-[3px] border-black dark:border-[#475569] shadow-[8px_8px_0px_#000000] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal - Pinned & Sticky di atas agar tombol close tidak pernah tenggelam saat scroll */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-5 border-b-[2.5px] border-black dark:border-[#475569] bg-white dark:bg-[#161820] bg-[var(--modal-bg)] shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#171A21] border-2 border-[#8A7131] flex items-center justify-center shrink-0 p-0.5 shadow-sm">
              <img
                src="/documents/san_andreas_seal.png"
                alt="Seal San Andreas"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-heading font-black uppercase text-slate-900 dark:text-slate-100 truncate">
                  Surat Izin Komunitas &amp; Legalitas Organisasi
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                  RESMI PEMERINTAH
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate mt-0.5">
                Government State of San Andreas • No. 001/SIK-DSC/SA/X/2026 • Koordinat 1012
              </p>
            </div>
          </div>

          {/* Tombol Close Menonjol & Sangat Terlihat (Merah Kontras Neobrutalisme) */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-center shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-transform"
            aria-label="Tutup dokumen"
            title="Tutup (Esc)"
          >
            <X size={20} className="stroke-[3]" />
          </button>
        </div>

        {/* Viewer Dokumen - Konten yang dapat di-scroll secara independen */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <OfficialCharterViewer initialView="PERMIT_HD" onShowToast={onShowToast} />
        </div>
      </div>
    </div>
  );
}
