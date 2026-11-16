import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import PizzaMascot from "./PizzaMascot";

export default function ScrollToTopMascot() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
        setScrollProgress(progress);
      }

      if (scrollY > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {/* 1. Subtle Reading Progress Bar at the Very Top of Window */}
      <div
        className="fixed top-0 left-0 right-0 h-[2.5px] z-[60] bg-black/10 dark:bg-white/10 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#FACC15] via-[#DC2626] to-[#FACC15] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Floating Mascot Back-to-Top Button (Bottom Left, balanced against FAB on Right) */}
      <button
        type="button"
        onClick={handleScrollToTop}
        aria-label="Kembali ke atas halaman"
        title="Kembali ke atas halaman"
        className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 group flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full bg-white/95 dark:bg-[#0E1118]/95 backdrop-blur-md border border-black/15 dark:border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:border-[#FACC15] hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer ${
          isVisible
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none"
        }`}
      >
        {/* Mascot Face Icon Waving to the Top */}
        <PizzaMascot size="xs" variant="waving" animated={true} className="shrink-0" />

        {/* Text & Up Arrow */}
        <div className="flex items-center gap-1 font-heading font-black text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <span className="hidden sm:inline">KE ATAS</span>
          <ArrowUp size={12} className="text-[#DC2626] dark:text-[#FACC15] group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </button>
    </>
  );
}
