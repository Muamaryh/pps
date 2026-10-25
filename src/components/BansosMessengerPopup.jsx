import React, { useState, useEffect } from "react";
import {
  Gift,
  X,
  ArrowRight,
  Fuel,
  Utensils,
  DollarSign,
  CheckCircle2,
  Package,
  Sparkles,
  ShoppingBag,
  Wheat,
} from "lucide-react";
import { DEFAULT_BANSOS_PROGRAM } from "../services/bansosService";

function getIconComponent(iconName) {
  switch (String(iconName || "").toLowerCase()) {
    case "fuel":
    case "bensin":
      return Fuel;
    case "utensils":
    case "makanan":
      return Utensils;
    case "dollarsign":
    case "uang":
      return DollarSign;
    case "wheat":
    case "bibit":
      return Wheat;
    case "shoppingbag":
    case "sembako":
      return ShoppingBag;
    case "package":
      return Package;
    case "sparkles":
      return Sparkles;
    default:
      return Gift;
  }
}

export default function BansosMessengerPopup({
  program,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
  onOpenBansos,
  isStacked = false,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const activeProgram = program || DEFAULT_BANSOS_PROGRAM;
  const isNotificationEnabled = activeProgram.showMessengerNotification !== false;

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  // Auto pop-up after 1.5 seconds if used independently
  useEffect(() => {
    if (isControlled || !isNotificationEnabled) return;
    const timer = setTimeout(() => {
      setInternalIsOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isControlled, isNotificationEnabled, activeProgram.id]);

  if (!isNotificationEnabled) {
    return null;
  }

  function handleOpenClaim() {
    if (typeof onOpenBansos === "function") {
      onOpenBansos(activeProgram);
    }
    if (isControlled && typeof controlledOnClose === "function") {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  }

  function handleToggle(e) {
    e.stopPropagation();
    if (isControlled && typeof controlledOnToggle === "function") {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  }

  function handleDismiss(e) {
    e.stopPropagation();
    if (isControlled && typeof controlledOnClose === "function") {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  }

  const items = Array.isArray(activeProgram.items) && activeProgram.items.length > 0
    ? activeProgram.items
    : DEFAULT_BANSOS_PROGRAM.items;

  const pillText =
    activeProgram.pillLabel ||
    items.map((i) => i.name).slice(0, 3).join(" + ") ||
    "1 Makanan + $2.500 USD";

  const content = (
    <div className="select-none pointer-events-auto font-sans flex flex-col items-end">
      {isOpen ? (
        /* Pop-up Window Card (Neo-Brutalist Messenger Style) */
        <div className="w-[310px] sm:w-[350px] rounded-xl border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_0px_#000000] bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col animate-slideUp">
          
          {/* Header Messenger Bar */}
          <div className="px-3.5 py-2.5 bg-[#FACC15] dark:bg-[#EAB308] border-b-2 border-black flex items-center justify-between text-slate-950">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white border border-black flex items-center justify-center p-0.5 shadow-sm overflow-hidden shrink-0">
                  <img
                    src="/logo.png"
                    alt="Logo LSM PPS"
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Active Green Dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black bg-emerald-500" />
              </div>

              <div className="leading-tight">
                <span className="font-heading font-black text-[11px] sm:text-xs uppercase tracking-tight block truncate">
                  LSM Paguyuban Pizza
                </span>
                <span className="text-[10px] text-slate-800 font-mono flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {activeProgram.tagline || "Bansos Warga • Sandy Shores"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-6 h-6 rounded border border-black/40 hover:border-black bg-white/70 hover:bg-white flex items-center justify-center text-slate-900 transition-colors cursor-pointer"
                title="Sembunyikan pesan"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Chat Bubble Body */}
          <div className="p-3.5 flex flex-col gap-2.5">
            {/* Bubble Message */}
            <div className="p-3 bg-white dark:bg-[#14161F] border-2 border-black/20 dark:border-white/10 rounded-xl shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Hari Ini • Bantuan Pokok
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black text-white border border-black shadow-[1px_1px_0px_#000] bg-emerald-600">
                  BANTUAN AKTIF
                </span>
              </div>

              <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-snug font-medium">
                {activeProgram.messengerMessage || (
                  <>
                    Halo warga Sandy Shores! Paguyuban Pizza menyediakan paket{" "}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {activeProgram.title}
                    </strong>{" "}
                    untuk warga yang membutuhkan:
                  </>
                )}
              </p>

              {/* Dynamic Package Items Breakdown */}
              <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-black/10 dark:border-white/10 text-xs">
                {items.map((it, idx) => {
                  const IconComp = getIconComponent(it.icon);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 bg-amber-50/60 dark:bg-amber-950/20 rounded border border-amber-300/80 dark:border-amber-700/40 text-amber-950 dark:text-amber-200"
                    >
                      <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <IconComp size={12} />
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="font-heading font-black text-[11px] uppercase tracking-tight">
                          {it.name}
                        </span>
                        {it.desc && (
                          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono">
                            {it.desc}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Requirement Rule Notice */}
              <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-2 rounded border border-black/10 dark:border-white/10 flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Wajib unggah foto KTP IC valid. 1 Citizen ID = 1 kali klaim.
                </span>
              </div>
            </div>

            {/* Direct Action Link Button */}
            <button
              type="button"
              onClick={handleOpenClaim}
              className="w-full btn py-2.5 px-3 text-white font-heading font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer bg-[#059669] hover:bg-[#047857] transition-all"
            >
              <Gift size={14} className="text-[#FACC15]" />
              <span>Klaim Paket Bansos Sekarang</span>
              <ArrowRight size={14} className="text-[#FACC15]" />
            </button>
          </div>
        </div>
      ) : (
        /* Minimized Floating Messenger Pill */
        <button
          type="button"
          onClick={handleToggle}
          className="group flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_0px_#000] bg-[#FFFDF9] dark:bg-[#1A1D27] hover:bg-[#FACC15] dark:hover:bg-[#FACC15] hover:text-slate-950 text-slate-900 dark:text-slate-100 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 pointer-events-auto"
          title="Buka notifikasi bansos warga"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full text-white flex items-center justify-center border border-black shadow-sm bg-[#059669]">
              <Gift size={16} />
            </div>
            {/* Unread Red Notification Badge */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-white dark:border-black text-[9px] font-black text-white flex items-center justify-center animate-pulse">
              1
            </span>
          </div>

          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 uppercase truncate max-w-[190px]">
              {activeProgram.messengerHeading || "Bansos Warga Sandy Shores"}
            </span>
            <span className="font-heading font-black text-xs uppercase tracking-tight text-[#059669] dark:text-[#FACC15] group-hover:text-slate-950 truncate max-w-[190px] sm:max-w-[220px]">
              {pillText}
            </span>
          </div>
        </button>
      )}
    </div>
  );

  if (isStacked) {
    return content;
  }

  return (
    <aside
      aria-label="Notifikasi Bansos Warga"
      className="fixed bottom-4 sm:bottom-6 left-3 sm:left-6 z-[60] flex flex-col items-start select-none pointer-events-auto font-sans"
    >
      {content}
    </aside>
  );
}
