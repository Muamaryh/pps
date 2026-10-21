import React, { useState, useEffect } from "react";
import { MessageSquare, X, ArrowRight, BellOff } from "lucide-react";
import { DEFAULT_EVENT } from "../services/eventService";

export default function EventMessengerPopup({ event = DEFAULT_EVENT, onOpenRegisterEvent }) {
  const [isOpen, setIsOpen] = useState(false);

  const activeEvent = event || DEFAULT_EVENT;
  const isNotificationEnabled = activeEvent.showMessengerNotification !== false;
  const isOpenStatus = activeEvent.status === "OPEN";

  // Auto pop-up after 1.5 seconds for first impression, non-intrusive
  useEffect(() => {
    if (!isNotificationEnabled) return;
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isNotificationEnabled, activeEvent.id]);

  if (!isNotificationEnabled) {
    return null;
  }

  function handleOpenEvent() {
    onOpenRegisterEvent(activeEvent);
    setIsOpen(false);
  }

  function handleDismiss(e) {
    e.stopPropagation();
    setIsOpen(false);
  }

  return (
    <aside
      aria-label="Notifikasi Event Baru"
      className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-[60] flex flex-col items-end select-none pointer-events-auto font-sans"
    >
      {/* Pop-up Window Card (Messenger Chat Style) */}
      {isOpen ? (
        <div className="w-[310px] sm:w-[360px] rounded-xl border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_0px_#000000] bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col animate-slideUp">
          
          {/* Header Messenger Bar */}
          <div className="px-3.5 py-2.5 bg-[#FACC15] dark:bg-[#EAB308] border-b-2 border-black flex items-center justify-between text-slate-950">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white border border-black flex items-center justify-center p-0.5 shadow-sm overflow-hidden shrink-0">
                  <img src="/logo.png" alt="Logo LSM PPS" className="w-full h-full object-contain" />
                </div>
                {/* Active Status Dot */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
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
                      isOpenStatus ? "bg-emerald-600 animate-pulse" : "bg-red-600"
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
            <div className="p-3 bg-white dark:bg-[#14161F] border-2 border-black/20 dark:border-white/10 rounded-xl shadow-sm flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Hari Ini • Pesan Resmi
                </span>
                {/* Badge Status Pendaftaran: HIJAU bila DIBUKA, MERAH bila DITUTUP */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-black text-white border border-black shadow-[1px_1px_0px_#000] ${
                    isOpenStatus ? "bg-emerald-600" : "bg-red-600"
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
              className={`w-full btn py-2.5 px-3 text-white font-heading font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all ${
                isOpenStatus
                  ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                  : "bg-slate-700 hover:bg-slate-800"
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
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_0px_#000] bg-[#FFFDF9] dark:bg-[#1A1D27] hover:bg-[#FACC15] dark:hover:bg-[#FACC15] hover:text-slate-950 text-slate-900 dark:text-slate-100 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          title="Buka notifikasi event baru"
        >
          <div className="relative">
            <div
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center border border-black shadow-sm ${
                isOpenStatus ? "bg-[#DC2626]" : "bg-slate-700"
              }`}
            >
              <MessageSquare size={16} />
            </div>
            {/* Unread Red Notification Badge */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-white dark:border-black text-[9px] font-black text-white flex items-center justify-center animate-pulse">
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
    </aside>
  );
}
