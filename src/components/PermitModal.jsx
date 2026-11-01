// ==========================================================================
// MODAL DOKUMEN SURAT IZIN & LEGALITAS - LSM PIZZA SANDY SHORES
// Government State of San Andreas - Los Santos
// ==========================================================================

import React from "react";
import { X, ShieldCheck, FileCheck2 } from "lucide-react";
import OfficialCharterViewer from "./OfficialCharterViewer";

export default function PermitModal({ isOpen, onClose, onShowToast }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="card-brutal w-full max-w-4xl bg-[var(--modal-bg)] border-[3px] border-black dark:border-[#475569] shadow-[6px_6px_0px_#000000] p-4 sm:p-6 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#475569]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#171A21] border-2 border-[#8A7131] flex items-center justify-center shrink-0 p-0.5 shadow-sm">
              <img
                src="/documents/san_andreas_seal.png"
                alt="Seal San Andreas"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                  Surat Izin Komunitas &amp; Legalitas Organisasi
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  RESMI PEMERINTAH
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Government State of San Andreas • No. 001/SIK-DSC/SA/X/2026 • Koordinat 1012
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewer Dokumen */}
        <div className="py-2">
          <OfficialCharterViewer initialView="PERMIT_HD" onShowToast={onShowToast} />
        </div>
      </div>
    </div>
  );
}
