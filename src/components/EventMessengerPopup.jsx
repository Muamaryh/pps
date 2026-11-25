import React, { useState, useEffect } from "react";
import { MessageSquare, X, ArrowRight, BellOff } from "lucide-react";
import { DEFAULT_EVENT } from "../services/eventService";

export default function EventMessengerPopup({
  event,
  onOpenRegisterEvent,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
  isStacked = false,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  if (!event) {
    return null;
  }

  const activeEvent = event;
  const isNotificationEnabled = activeEvent.showMessengerNotification !== false;
  const isOpenStatus = activeEvent.status === "OPEN";

  // Auto pop-up after 1.5 seconds if independent
  useEffect(() => {
    if (isControlled || !isNotificationEnabled) return;
    const timer = setTimeout(() => {
      setInternalIsOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isControlled, isNotificationEnabled, activeEvent.id]);

  if (!isNotificationEnabled) {
    return null;
  }

  function handleOpenEvent() {
    onOpenRegisterEvent(activeEvent);
    if (isControlled && typeof controlledOnClose === "function") {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
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

  function handleToggle(e) {
    e.stopPropagation();
    if (isControlled && typeof controlledOnToggle === "function") {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  }

  const content = (
    <div className="select-none pointer-events-auto font-sans flex flex-col items-end">
      {/* Pop-up Window Card (Messenger Chat Style) */}
      {isOpen ? (
        <div className="w-[310px] sm:w-[360px] rounded-2xl border border-black/15 dark:border-white/15 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.28)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] bg-white dark:bg-[#0B0D14] overflow-hidden flex flex-col animate-slideUp">
          
          {/* Header Messenger Bar */}
          <div className="px-3.5 py-2.5 bg-[#FACC15] dark:bg-[#EAB308] border-b border-black/10 flex items-center justify-between text-slate-950">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white border border-black/15 flex items-center justify-center p-0.5 shadow-sm overflow-hidden shrink-0">
                  <img src="/logo.png" alt="Logo LSM PPS" className="w-full h-full object-contain" />
                </div>
                {/* Active Status Dot */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                    isOpenStatus ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </div>

              <div className="leading-tight">
                <span className="font-heading font-black text-[11px] sm:text-xs uppercase tracking-tight block truncate">
                  {activeEvent.organizer || "LSM Paguyuban Pizza Sandy Shores"}
                </span>
                <span className="text-[10px] text-slate-800 font-mono flex items-center gap-1 font-bold">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOpenStatus ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  />
                  Pesan Masuk • Event Resmi
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-7 h-7 rounded-lg border border-black/15 hover:border-black/30 bg-white/80 hover:bg-white flex items-center justify-center text-slate-900 transition-colors cursor-pointer"
                title="Sembunyikan pesan"
                aria-label="Sembunyikan pesan"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Chat Bubble Body */}
          <div className="p-3.5 flex flex-col gap-2.5">
            {/* Bubble Message */}
            <div className="p-3 bg-[#FAF8F3] dark:bg-[#121622] border border-black/10 dark:border-white/10 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  Hari Ini • Pesan Resmi
                </span>
                {/* Badge Status Pendaftaran: HIJAU bila DIBUKA, MERAH bila DITUTUP */}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black text-white border ${
                    isOpenStatus
                      ? "bg-emerald-600 border-emerald-500/60"
                      : "bg-red-600 border-red-500/60"
                  }`}
                >
                  {isOpenStatus ? "PENDAFTARAN DIBUKA" : "PENDAFTARAN DITUTUP"}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-snug font-medium">
                {activeEvent.messengerMessage || (
                  <>
                    Halo warga! {activeEvent.organizer} mempersembahkan event baru nih:{" "}
                    <strong className="text-[#DC2626] dark:text-[#FACC15]">
                      {activeEvent.title}
                    </strong>
                    .
                  </>
                )}
              </p>

              {activeEvent.entryFee && (
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                  <span>Biaya Pendaftaran:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">
                    {activeEvent.entryFee}
                  </strong>
                </div>
              )}
            </div>

            {/* Direct Action Link Button */}
            <button
              type="button"
              onClick={handleOpenEvent}
              className={`w-full py-2.5 px-3 rounded-xl text-white font-heading font-black text-xs uppercase tracking-wider border shadow-sm flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer transition-all ${
                isOpenStatus
                  ? "bg-[#DC2626] hover:bg-[#B91C1C] border-red-500/70"
                  : "bg-slate-700 hover:bg-slate-800 border-slate-600"
              }`}
            >
              <span>{isOpenStatus ? "Klik Di Sini Untuk Daftar" : "Lihat Informasi Event"}</span>
              <ArrowRight size={14} className="text-[#FACC15]" />
            </button>
          </div>
        </div>
      ) : (
        /* Minimized Floating Messenger Pill / Bubble Button */
        <button
          type="button"
          onClick={handleToggle}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-black/15 dark:border-white/15 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.22)] dark:shadow-[0_14px_32px_-6px_rgba(0,0,0,0.85)] bg-white dark:bg-[#0E111B] hover:bg-[#FACC15] dark:hover:bg-[#FACC15] hover:text-slate-950 text-slate-900 dark:text-slate-100 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
          title="Buka notifikasi event baru"
        >
          <div className="relative">
            <div
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center border shadow-sm ${
                isOpenStatus ? "bg-[#DC2626] border-red-500/70" : "bg-slate-700 border-slate-600"
              }`}
            >
              <MessageSquare size={16} />
            </div>
            {/* Unread Red Notification Badge */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DC2626] border border-white dark:border-[#0E111B] text-[9px] font-black text-white flex items-center justify-center">
              1
            </span>
          </div>

          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 uppercase">
              {activeEvent.messengerHeading || "Ada Event Baru!"}
            </span>
            <span className="font-heading font-black text-xs uppercase tracking-tight text-[#DC2626] dark:text-[#FACC15] group-hover:text-slate-950 truncate max-w-[200px]">
              {activeEvent.title}
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
      aria-label="Notifikasi Event Baru"
      className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-[60] flex flex-col items-end select-none pointer-events-auto font-sans"
    >
      {content}
    </aside>
  );
}
