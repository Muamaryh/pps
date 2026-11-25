import React, { useState, useEffect, useRef } from "react";
import { Users, Store, Heart, X, ChevronUp } from "lucide-react";

export default function FloatingActions({
  onOpenRegister,
  onOpenServicePortal,
  onOpenMembersDirectory,
  onOpenDonation,
  memberCount = 58,
}) {
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

  const displayCount = memberCount ? `${memberCount}+` : "58+";

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
        className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5 pointer-events-auto select-none"
      >
        {/* Animated Action Buttons List */}
        <div
          className={`flex flex-col items-end gap-2.5 origin-bottom-right transition-all duration-300 ease-out ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-75 translate-y-8 pointer-events-none hidden"
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
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border border-amber-500/70 shadow-[0_10px_24px_-6px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            title="Lihat Direktori Anggota Resmi LSM PPS & Pendaftaran"
          >
            <div className="w-7 h-7 rounded-lg bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users size={15} />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Anggota LSM PPS</span>
            </div>
            <span className="text-[10px] font-mono bg-black/10 text-slate-900 px-1.5 py-0.5 rounded-md font-bold">
              {displayCount}
            </span>
          </button>

          {/* 2. Daftar Layanan */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onOpenServicePortal) onOpenServicePortal("lapak");
            }}
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-red-500/70 shadow-[0_10px_24px_-6px_rgba(220,38,38,0.42)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            title="Portal Layanan Warga (Lapak UMKM, Request Meeting & Lacak Tiket)"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 text-[#FACC15] flex items-center justify-center shrink-0 shadow-sm">
              <Store size={15} />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Daftar Layanan</span>
            </div>
            <span className="text-[10px] font-mono bg-black/25 text-white px-1.5 py-0.5 rounded-md font-bold">
              PORTAL
            </span>
          </button>

          {/* 3. Donasi Warga */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onOpenDonation) {
                onOpenDonation();
              } else if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("pps:open-donasi"));
              }
            }}
            className="group flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white border border-emerald-500/70 shadow-[0_10px_24px_-6px_rgba(5,150,105,0.42)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-heading font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            title="Salurkan Donasi Warga & Lihat Rekapitulasi Orang Baik"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 text-[#FACC15] flex items-center justify-center shrink-0 shadow-sm">
              <Heart size={15} className="fill-current text-[#FACC15]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Donasi Warga</span>
            </div>
            <span className="text-[10px] font-mono bg-black/25 text-white px-1.5 py-0.5 rounded-md font-bold">
              SOSIAL
            </span>
          </button>
        </div>

        {/* Trigger Button: PPS Logo Floating Action Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Tutup menu komunitas PPS" : "Buka menu komunitas PPS"}
          className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FACC15] hover:bg-[#EAB308] border border-amber-500/80 dark:border-amber-400/60 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.35)] dark:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 cursor-pointer"
          title={isOpen ? "Tutup menu" : "Menu Komunitas PPS"}
        >
          {/* Logo PPS */}
          <img
            src="/logo.webp"
            width="44"
            height="44"
            loading="lazy"
            decoding="async"
            alt="LSM PPS Logo"
            className={`w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow transition-transform duration-300 ${
              isOpen ? "rotate-12 scale-90" : "group-hover:scale-110"
            }`}
          />

          {/* Indicator Badge (Chevron turns to X when open) */}
          <span
            className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border border-white/80 dark:border-[#0B0D14] flex items-center justify-center text-white text-xs font-black shadow-md transition-all duration-300 ${
              isOpen
                ? "bg-[#DC2626] rotate-90 scale-105"
                : "bg-[#111827] group-hover:bg-[#DC2626] group-hover:scale-110"
            }`}
          >
            {isOpen ? <X size={13} strokeWidth={3} /> : <ChevronUp size={14} strokeWidth={3} />}
          </span>
        </button>
      </aside>
    </>
  );
}
