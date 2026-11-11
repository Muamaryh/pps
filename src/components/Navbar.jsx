import React, { useState, useEffect } from "react";
import { Sun, Moon, Menu, X, Store, UserPlus, Users } from "lucide-react";

export default function Navbar({
  brand: _brand,
  navLinks,
  theme,
  onToggleTheme,
  onOpenServicePortal,
  onOpenRegister,
  onOpenMembersDirectory,
  currentPage = "home",
  onNavigateToStructure,
  onNavigateToGallery,
  onNavigateToHome,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(
    currentPage === "gallery" ? "gallery" : currentPage === "structure" ? "structure" : "home"
  );

  // Core navigation links (Renamed Galeri -> Dokumentasi & Dedicated Structure)
  const defaultNavList = [
    { name: "Beranda", url: "#home" },
    { name: "Tentang", url: "#about" },
    { name: "Program", url: "#program" },
    { name: "Struktur", url: "#/struktur" },
    { name: "Dokumentasi", url: "#/dokumentasi" },
  ];

  const parsedLinks = navLinks
    ? navLinks
        .split(",")
        .map((item) => {
          const parts = item.split("|");
          if (parts.length === 2) {
            let name = parts[0].trim();
            const url = parts[1].trim();
            if (name.toLowerCase().includes("discord") || name.toLowerCase().includes("daftar")) {
              return null;
            }
            if (name.toLowerCase().includes("galeri") || name.toLowerCase().includes("gallery")) {
              name = "Dokumentasi";
            }
            return { name, url };
          }
          return null;
        })
        .filter(Boolean)
    : defaultNavList;

  const displayLinks = parsedLinks.length > 0 ? parsedLinks : defaultNavList;

  // Scrollspy & Active Page Sync
  useEffect(() => {
    if (currentPage === "gallery") {
      setActiveSection("gallery");
      return;
    }
    if (currentPage === "structure") {
      setActiveSection("structure");
      return;
    }

    const sectionIds = ["home", "about", "program"];
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
  }, [currentPage]);

  // Unified link click handler (handles Home, Dedicated Structure, and Dedicated Dokumentasi Page)
  function handleLinkClick(e, link) {
    const isStructure =
      link.name.toLowerCase().includes("struktur") ||
      link.url.toLowerCase().includes("struktur") ||
      link.url.toLowerCase().includes("structure");

    if (isStructure) {
      e.preventDefault();
      setMobileMenuOpen(false);
      if (currentPage === "structure") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (onNavigateToStructure) {
        onNavigateToStructure();
      } else {
        window.history.pushState(null, "", "#/struktur");
        window.dispatchEvent(new Event("hashchange"));
      }
      return;
    }

    const isGallery =
      link.name.toLowerCase().includes("dokumentasi") ||
      link.name.toLowerCase().includes("galeri") ||
      link.url.toLowerCase().includes("dokumentasi") ||
      link.url.toLowerCase().includes("galeri") ||
      link.url.toLowerCase().includes("gallery");

    if (isGallery) {
      e.preventDefault();
      setMobileMenuOpen(false);
      if (currentPage === "gallery") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (onNavigateToGallery) {
        onNavigateToGallery();
      } else {
        window.history.pushState(null, "", "#/dokumentasi");
        window.dispatchEvent(new Event("hashchange"));
      }
      return;
    }

    // Returning to home from gallery or structure
    if (currentPage === "gallery" || currentPage === "structure") {
      e.preventDefault();
      setMobileMenuOpen(false);
      if (onNavigateToHome) {
        onNavigateToHome(link.url);
      } else {
        window.history.pushState(null, "", "/");
        window.dispatchEvent(new Event("popstate"));
      }
      return;
    }

    // Default smooth scroll on home page
    if (link.url.startsWith("#")) {
      e.preventDefault();
      const targetId = link.url.replace("#", "");
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", link.url);
        setActiveSection(targetId);
      }
    }
    setMobileMenuOpen(false);
  }

  function handleBrandClick(e) {
    if (currentPage === "gallery" || currentPage === "structure") {
      e.preventDefault();
      if (onNavigateToHome) {
        onNavigateToHome("#home");
      }
      return;
    }
    handleLinkClick(e, { name: "Beranda", url: "#home" });
  }

  return (
    <header className="sticky top-[40px] sm:top-[48px] z-40 w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-3 sm:px-6 transition-all">
      {/* Floating Capsule Bar - Responsive to Light & Dark Mode */}
      <nav className="rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 sm:gap-4 bg-[#FAF8F3]/90 dark:bg-[#07080E]/90 backdrop-blur-xl border border-black/25 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.7)] select-none transition-all">
        {/* Left: Brand Identity with Circular Logo & 2 Lines Slim Typography */}
        <a
          href="#home"
          onClick={handleBrandClick}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 group select-none py-0.5 cursor-pointer"
        >
          {/* Logo tanpa box pembungkus */}
          <img
            src="/logo.png"
            alt="Logo LSM Paguyuban Pizza Sandy Shores"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform shrink-0"
          />

          {/* 2 Lines Brand Identity */}
          <div className="flex flex-col justify-center leading-none select-none">
            <span className="font-heading text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 leading-none mb-0.5">
              LSM PAGUYUBAN
            </span>
            <span className="font-heading font-black text-xs sm:text-sm md:text-base tracking-tight uppercase text-[#DC2626] dark:text-[#FACC15] leading-tight">
              PIZZA SANDY SHORES
            </span>
          </div>
        </a>

        {/* Right: Capsule Pill Navigation + Circular Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Capsule Menu (Pill Chips) */}
          <div className="hidden lg:flex items-center gap-1 bg-[#E2DFD4] dark:bg-white/[0.04] p-1 rounded-full border border-black/10 dark:border-white/10 backdrop-blur-sm">
            {displayLinks.map((link, idx) => {
              const targetId = link.url.replace("#", "");
              const isGalleryLink =
                link.name.toLowerCase().includes("dokumentasi") ||
                link.name.toLowerCase().includes("galeri") ||
                link.url.toLowerCase().includes("dokumentasi") ||
                link.url.toLowerCase().includes("galeri") ||
                link.url.toLowerCase().includes("gallery");

              const isStructureLink =
                link.name.toLowerCase().includes("struktur") ||
                link.url.toLowerCase().includes("struktur") ||
                link.url.toLowerCase().includes("structure");

              const isActive =
                currentPage === "gallery"
                  ? isGalleryLink
                  : currentPage === "structure"
                  ? isStructureLink
                  : activeSection === targetId;

              return (
                <a
                  key={idx}
                  href={link.url}
                  onClick={(e) => handleLinkClick(e, link)}
                  className={`font-heading font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#FACC15] text-[#07080E] shadow-[0_2px_15px_rgba(250,204,21,0.35)] border border-yellow-400"
                      : "border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}

            {/* Tombol Direktori Anggota Resmi */}
            {onOpenMembersDirectory && (
              <button
                type="button"
                onClick={onOpenMembersDirectory}
                className="font-heading font-black text-xs uppercase tracking-wider px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-black/15 dark:border-white/15 shadow-sm hover:border-[#FACC15]/40 flex items-center gap-1.5 ml-0.5 cursor-pointer active:translate-y-0.5"
                title="Lihat Direktori Anggota Resmi LSM PPS (/anggota)"
              >
                <Users size={13} className="shrink-0 text-[#DC2626] dark:text-[#FACC15]" />
                <span>Anggota</span>
              </button>
            )}

            {/* Tombol Daftar Anggota Resmi */}
            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="font-heading font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap bg-[#FACC15] hover:bg-[#EAB308] text-[#07080E] border border-yellow-400 shadow-[0_2px_12px_rgba(250,204,21,0.3)] flex items-center gap-1.5 ml-0.5 cursor-pointer active:translate-y-0.5"
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
                className="font-heading font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-red-500 shadow-[0_2px_12px_rgba(220,38,38,0.3)] flex items-center gap-1.5 ml-0.5 cursor-pointer active:translate-y-0.5"
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm text-slate-800 dark:text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
            title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun size={17} strokeWidth={2.5} className="text-[#FACC15] shrink-0" />
            ) : (
              <Moon size={17} strokeWidth={2.5} className="text-slate-700 shrink-0" />
            )}
          </button>

          {/* Mobile/Tablet Hamburger Button (Circular) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm text-slate-800 dark:text-white flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? (
              <X size={18} strokeWidth={2.5} className="shrink-0 text-[#DC2626]" />
            ) : (
              <Menu size={18} strokeWidth={2.5} className="shrink-0 text-slate-800 dark:text-[#FACC15]" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 p-4 rounded-2xl bg-white/95 dark:bg-[#0B0D14]/98 backdrop-blur-xl border border-black/15 dark:border-white/15 shadow-xl dark:shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {displayLinks.map((link, idx) => {
            const targetId = link.url.replace("#", "");
            const isGalleryLink =
              link.name.toLowerCase().includes("dokumentasi") ||
              link.name.toLowerCase().includes("galeri") ||
              link.url.toLowerCase().includes("dokumentasi") ||
              link.url.toLowerCase().includes("galeri") ||
              link.url.toLowerCase().includes("gallery");

            const isStructureLink =
              link.name.toLowerCase().includes("struktur") ||
              link.url.toLowerCase().includes("struktur") ||
              link.url.toLowerCase().includes("structure");

            const isActive =
              currentPage === "gallery"
                ? isGalleryLink
                : currentPage === "structure"
                ? isStructureLink
                : activeSection === targetId;

            return (
              <a
                key={idx}
                href={link.url}
                onClick={(e) => handleLinkClick(e, link)}
                className={`font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-[#FACC15] text-[#07080E] border-yellow-400 shadow-[0_2px_12px_rgba(250,204,21,0.3)] font-black"
                    : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                }`}
              >
                <span>{link.name}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-[#DC2626]" />}
              </a>
            );
          })}

          {onOpenMembersDirectory && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMembersDirectory();
              }}
              className="mt-1 font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white shadow-sm flex items-center justify-between transition-all cursor-pointer hover:border-[#FACC15]/40"
            >
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#DC2626] dark:text-[#FACC15]" />
                <span>Direktori Anggota Resmi</span>
              </div>
              <span className="text-[10px] font-mono bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">ANGGOTA</span>
            </button>
          )}

          {onOpenRegister && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="mt-1 font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl border border-yellow-400 bg-[#FACC15] text-[#07080E] shadow-[0_2px_12px_rgba(250,204,21,0.3)] flex items-center justify-between transition-all font-black"
            >
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-[#DC2626]" />
                <span>Daftar Anggota LSM PPS</span>
              </div>
              <span className="text-[10px] font-mono bg-black/15 px-2 py-0.5 rounded-full font-bold">DAFTAR</span>
            </button>
          )}

          {onOpenServicePortal && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenServicePortal("lapak");
              }}
              className="mt-1 font-heading font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl border border-red-500 bg-[#DC2626] text-white shadow-[0_2px_12px_rgba(220,38,38,0.3)] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                <Store size={14} className="text-[#FACC15]" />
                <span>Layanan Warga (Lapak &amp; Meeting)</span>
              </div>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full">BUKA</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
