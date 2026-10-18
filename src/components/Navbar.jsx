import React, { useState, useEffect } from "react";
import { Sun, Moon, Menu, X, Store, UserPlus } from "lucide-react";

export default function Navbar({ brand: _brand, navLinks, theme, onToggleTheme, onOpenServicePortal, onOpenRegister }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  // Core navigation links
  const defaultNavList = [
    { name: "Beranda", url: "#home" },
    { name: "Tentang", url: "#about" },
    { name: "Struktur", url: "#structure" },
    { name: "Galeri", url: "#gallery" },
  ];

  const parsedLinks = navLinks
    ? navLinks
        .split(",")
        .map((item) => {
          const parts = item.split("|");
          if (parts.length === 2) {
            const name = parts[0].trim();
            const url = parts[1].trim();
            if (name.toLowerCase().includes("discord") || name.toLowerCase().includes("daftar")) {
              return null;
            }
            return { name, url };
          }
          return null;
        })
        .filter(Boolean)
    : defaultNavList;

  const displayLinks = parsedLinks.length > 0 ? parsedLinks : defaultNavList;

  // Scrollspy: detect active section when scrolling
  useEffect(() => {
    const sectionIds = ["home", "about", "structure", "gallery"];
    function onScroll() {
      const scrollY = window.scrollY;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const elem = document.getElementById(sectionIds[i]);
        if (elem) {
          const top = elem.offsetTop - 140;
          if (scrollY >= top) {
            setActiveSection(sectionIds[i]);
            return;
          }
        }
      }
      setActiveSection("home");
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Smooth scroll handler for anchor links
  function handleAnchorClick(e, url) {
    if (url.startsWith("#")) {
      e.preventDefault();
      const targetId = url.replace("#", "");
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", url);
        setActiveSection(targetId);
      }
    }
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-3 sm:top-4 z-40 w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-3 sm:px-6">
      {/* Konsep 2: Melengkung Kapsul Melayang (Capsule Floating Island - Lebar & Proporsional) */}
      <nav className="rounded-full px-4 sm:px-7 py-2 sm:py-2.5 flex items-center justify-between gap-3 sm:gap-4 bg-[#FFFDF9]/85 dark:bg-[#0D0F14]/85 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] select-none transition-all">
        
        {/* Left: Brand Identity with Circular Logo & 2 Lines Slim Typography */}
        <a
          href="#home"
          onClick={(e) => handleAnchorClick(e, "#home")}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 group select-none py-0.5"
        >
          {/* Logo Lingkaran Melengkung */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FACC15]/20 dark:bg-[#FACC15]/15 border border-[#FACC15]/40 flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Logo LSM Paguyuban Pizza Sandy Shores"
              className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
            />
          </div>

          {/* 2 Lines Brand Identity: LSM PAGUYUBAN (font kecil bukan bold) / SANDY SHORES (bold) */}
          <div className="flex flex-col justify-center leading-none select-none">
            {/* Baris 1: LSM PAGUYUBAN (Font Kecil, Bukan Bold) */}
            <span className="text-[10px] sm:text-[11px] font-medium tracking-wider uppercase text-slate-600 dark:text-slate-400 leading-none mb-0.5">
              LSM PAGUYUBAN
            </span>

            {/* Baris 2: SANDY SHORES (Bold Utama) */}
            <span className="font-heading font-black text-xs sm:text-sm md:text-base tracking-tight uppercase text-[#DC2626] dark:text-[#FACC15] leading-tight">
              SANDY SHORES
            </span>
          </div>
        </a>

        {/* Right: Capsule Pill Navigation + Circular Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Desktop Capsule Menu (Pill Chips) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-200/50 dark:bg-[#1F222C]/70 p-1 rounded-full border border-black/10 dark:border-white/10 backdrop-blur-sm">
            {displayLinks.map((link, idx) => {
              const targetId = link.url.replace("#", "");
              const isActive = activeSection === targetId;

              return (
                <a
                  key={idx}
                  href={link.url}
                  onClick={(e) => handleAnchorClick(e, link.url)}
                  className={`font-heading font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000] border-2 border-black"
                      : "border-2 border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
            {/* Tombol Daftar Anggota Resmi */}
            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="font-heading font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 ml-0.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                title="Daftar Menjadi Anggota LSM Paguyuban Pizza Sandy Shores"
              >
                <UserPlus size={13} className="shrink-0 text-[#DC2626]" />
                <span>Daftar</span>
              </button>
            )}

            {/* Layanan Portal Button (Lapak UMKM & Request Meeting) */}
            {onOpenServicePortal && (
              <button
                type="button"
                onClick={() => onOpenServicePortal("lapak")}
                className="font-heading font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 ml-0.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                title="Daftar Lapak UMKM & Request Audiensi IC"
              >
                <Store size={13} className="shrink-0 text-[#FACC15]" />
                <span>Layanan</span>
              </button>
            )}
          </div>

          {/* Circular Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-white/80 dark:bg-[#161820]/80 backdrop-blur-sm text-slate-950 dark:text-slate-200 flex items-center justify-center hover:scale-105 transition-transform"
            title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun size={18} strokeWidth={2.5} className="text-[#FACC15] shrink-0" />
            ) : (
              <Moon size={18} strokeWidth={2.5} className="text-[#111827] dark:text-slate-200 shrink-0" />
            )}
          </button>

          {/* Mobile Hamburger Button (Circular) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-white/80 dark:bg-[#161820]/80 backdrop-blur-sm text-slate-950 dark:text-slate-200 flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? (
              <X size={18} strokeWidth={2.5} className="shrink-0 text-[#DC2626]" />
            ) : (
              <Menu size={18} strokeWidth={2.5} className="shrink-0" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (Melengkung Rounded-2xl Style) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-3.5 rounded-2xl bg-[#FFFDF9]/95 dark:bg-[#0D0F14]/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {displayLinks.map((link, idx) => {
            const targetId = link.url.replace("#", "");
            const isActive = activeSection === targetId;

            return (
              <a
                key={idx}
                href={link.url}
                onClick={(e) => handleAnchorClick(e, link.url)}
                className={`font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-full border-2 transition-all flex items-center justify-between ${
                  isActive
                    ? "bg-[#FACC15] text-[#111827] border-black shadow-[2px_2px_0px_#000]"
                    : "border-transparent text-slate-800 dark:text-slate-200 hover:bg-[#FACC15]/20"
                }`}
              >
                <span>{link.name}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-[#DC2626]" />}
              </a>
            );
          })}

          {onOpenRegister && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="mt-1 font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-full border-2 border-black bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-[#DC2626]" />
                <span>Daftar Anggota LSM PPS</span>
              </div>
              <span className="text-[10px] font-mono bg-black/10 px-2 py-0.5 rounded-full font-bold">DAFTAR</span>
            </button>
          )}

          {onOpenServicePortal && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenServicePortal("lapak");
              }}
              className="mt-1 font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-full border-2 border-black bg-[#DC2626] text-white shadow-[2px_2px_0px_#000] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                <Store size={14} className="text-[#FACC15]" />
                <span>Layanan Warga (Lapak & Meeting)</span>
              </div>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full">BUKA</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
