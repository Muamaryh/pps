import React, { useState, useEffect, useRef } from "react";
import { UserPlus, ExternalLink, X, ChevronUp } from "lucide-react";

export default function FloatingActions({ discordUrl, registerUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const finalDiscord = discordUrl || "https://discord.gg/92QASf3fus";
  const finalRegister = registerUrl || "https://daftaranggotapaps.netlify.app/";

  // Auto-close on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay when open to easily dismiss on mobile & desktop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={containerRef}
        aria-label="Aksi Cepat Komunitas"
        className="fixed bottom-5 right-5 z-40 flex flex-col items-end pointer-events-auto"
      >
        {/* Animated Action Buttons List */}
        <div
          className={`flex flex-col items-end gap-2.5 mb-3 origin-bottom-right transition-all duration-300 ease-out ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-75 translate-y-8 pointer-events-none"
          }`}
        >
          {/* 1. Gabung Discord Kami */}
          <a
            href={finalDiscord}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white border-[2.5px] border-[#1A1A1A] dark:border-[#334155] shadow-[4px_4px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider"
            title="Gabung Discord Paguyuban Pizza Sandy Shores"
          >
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Gabung Discord Kami</span>
              <span className="text-[10px] font-sans font-bold text-white/80 lowercase tracking-normal">Komunitas & Voice Sandy Shores</span>
            </div>
            <ExternalLink size={13} className="opacity-75 group-hover:opacity-100 ml-1 transition-opacity shrink-0" />
          </a>

          {/* 2. Daftar Menjadi Anggota */}
          <a
            href={finalRegister}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-[2.5px] border-[#1A1A1A] dark:border-[#334155] shadow-[4px_4px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider"
            title="Daftar Menjadi Anggota Resmi LSM PPS"
          >
            <div className="w-7 h-7 rounded bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-sm">
              <UserPlus size={15} />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Daftar Menjadi Anggota</span>
              <span className="text-[10px] font-sans font-bold text-gray-800 lowercase tracking-normal">Formulir Rekrutmen LSM PPS</span>
            </div>
            <ExternalLink size={13} className="text-[#111827] opacity-75 group-hover:opacity-100 ml-1 transition-opacity shrink-0" />
          </a>
        </div>

        {/* Trigger Button: PPS Logo Floating Action Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FACC15] hover:bg-[#EAB308] border-[3px] border-[#1A1A1A] dark:border-[#334155] shadow-[4px_4px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] transition-all focus:outline-none"
          title={isOpen ? "Tutup menu" : "Menu Komunitas PPS"}
        >
          {/* Logo PPS */}
          <img
            src="/logo.png"
            alt="LSM PPS Logo"
            className={`w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow transition-transform duration-300 ${
              isOpen ? "rotate-12 scale-90" : "group-hover:scale-110"
            }`}
          />

          {/* Indicator Badge (Chevron turns to X when open) */}
          <span
            className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center text-white text-xs font-black shadow transition-all duration-300 ${
              isOpen
                ? "bg-[#DC2626] rotate-90 scale-105"
                : "bg-[#1A1A1A] group-hover:bg-[#DC2626] group-hover:scale-110"
            }`}
          >
            {isOpen ? <X size={13} strokeWidth={3} /> : <ChevronUp size={14} strokeWidth={3} />}
          </span>

          {/* Subtle pulse ring when collapsed */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-full border-2 border-[#FACC15] animate-ping opacity-30 pointer-events-none" />
          )}
        </button>
      </aside>
    </>
  );
}
