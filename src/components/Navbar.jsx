import React, { useState } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";

export default function Navbar({ brand, navLinks, theme, onToggleTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Smooth scroll handler for anchor links
  function handleAnchorClick(e, url) {
    if (url.startsWith("#")) {
      e.preventDefault();
      const targetId = url.replace("#", "");
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", url);
      }
    }
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-3 sm:top-4 z-30 w-full max-w-[98%] 2xl:max-w-[1600px] mx-auto px-2 sm:px-4">
      <nav className="card-brutal px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000]">
        {/* Left: Brand Identity with Transparent logo.png */}
        <a
          href="#home"
          onClick={(e) => handleAnchorClick(e, "#home")}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 group"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-transparent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Logo LSM Paguyuban Pizza Sandy Shores"
              className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
            />
          </div>
          <span className="font-heading font-black text-base sm:text-xl tracking-tight uppercase flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-950 dark:text-slate-100">
              {brand ? (brand.includes(" ") ? brand.split(" ")[0] : brand) : "PIZZA"}
            </span>
            <span className="text-[#DC2626] dark:text-[#FACC15]">
              {brand ? (brand.includes(" ") ? brand.split(" ").slice(1).join(" ") : "SANDY SHORES") : "SANDY SHORES"}
            </span>
          </span>
        </a>

        {/* Right: Desktop Navigation Links + Dark/Light Mode + Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 sm:gap-1.5 lg:gap-2">
            {displayLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                onClick={(e) => handleAnchorClick(e, link.url)}
                className="font-heading font-black text-xs lg:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100 hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:bg-[#FACC15]/15 px-3 py-1.5 rounded transition-colors whitespace-nowrap"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Theme Toggle Button - Dedicated btn-icon */}
          <button
            onClick={onToggleTheme}
            className="btn-icon border-2 border-black dark:border-[#334155] shadow-[2px_2px_0px_#000] text-slate-950 dark:text-slate-200"
            title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun size={20} strokeWidth={2.5} className="text-[#FACC15] shrink-0" />
            ) : (
              <Moon size={20} strokeWidth={2.5} className="text-[#111827] dark:text-slate-200 shrink-0" />
            )}
          </button>

          {/* Mobile Hamburger Button - Dedicated btn-icon */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden btn-icon border-2 border-black dark:border-[#334155] shadow-[2px_2px_0px_#000] text-slate-950 dark:text-slate-200"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? (
              <X size={22} strokeWidth={2.5} className="shrink-0 text-[#DC2626]" />
            ) : (
              <Menu size={22} strokeWidth={2.5} className="shrink-0" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-3.5 card-brutal bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000] flex flex-col gap-2 animate-in fade-in slide-in-from-top-3 duration-150">
          {displayLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              onClick={(e) => handleAnchorClick(e, link.url)}
              className="font-heading font-black text-sm uppercase tracking-wider py-2.5 px-3 rounded text-slate-800 dark:text-slate-100 hover:bg-[#FACC15]/20 hover:text-[#DC2626] dark:hover:text-[#FACC15] transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
