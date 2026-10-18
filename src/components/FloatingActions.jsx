import React, { useState, useEffect, useRef } from "react";
import { UserPlus, Users, Store, X, ChevronUp } from "lucide-react";

export default function FloatingActions({ onOpenRegister, onOpenServicePortal, onOpenMembersDirectory }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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
          {/* 1. Anggota LSM PPS */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onOpenMembersDirectory) onOpenMembersDirectory();
              else if (onOpenRegister) onOpenRegister();
            }}
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-[2.5px] border-[#1A1A1A] dark:border-[#334155] shadow-[4px_4px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
            title="Lihat Direktori Anggota Resmi LSM PPS & Pendaftaran"
          >
            <div className="w-7 h-7 rounded bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users size={15} />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Anggota LSM PPS</span>
            </div>
            <span className="text-[10px] font-mono bg-black/10 text-slate-900 px-1.5 py-0.5 rounded font-bold">58+</span>
          </button>

          {/* 2. Daftar Layanan */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onOpenServicePortal) onOpenServicePortal("lapak");
            }}
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white border-[2.5px] border-[#1A1A1A] dark:border-[#334155] shadow-[4px_4px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
            title="Portal Layanan Warga (Lapak UMKM, Request Meeting & Lacak Tiket)"
          >
            <div className="w-7 h-7 rounded bg-white/20 text-[#FACC15] flex items-center justify-center shrink-0 shadow-sm">
              <Store size={15} />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Daftar Layanan</span>
            </div>
            <span className="text-[10px] font-mono bg-black/25 text-white px-1.5 py-0.5 rounded font-bold">PORTAL</span>
          </button>
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
