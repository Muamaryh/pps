import React from "react";
import { Shield } from "lucide-react";

export default function Footer({ brand }) {
  return (
    <footer className="mt-8 sm:mt-10 bg-[var(--card-bg)] text-xs text-slate-700 dark:text-slate-300 font-heading font-bold overflow-hidden transition-colors">
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto py-3 sm:py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand Copyright */}
        <p className="text-center sm:text-left text-slate-600 dark:text-slate-400">
          &copy; 2026{" "}
          <span className="font-black text-slate-950 dark:text-slate-100">
            {brand || "Paguyuban Pizza Sandy Shores"}
          </span>
          . Properti dan aset milik PPS.
        </p>

        {/* Tech / Community Badge */}
        <div className="flex items-center gap-2">
          <div className="badge-brutal text-[11px] sm:text-xs py-1 px-2.5 sm:px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <Shield size={13} className="text-[#DC2626]" />
            <span>Portal Resmi PPS</span>
          </div>
        </div>
      </div>

      {/* Signature Yellow Bottom Strip */}
      <div className="w-full h-1.5 sm:h-2 bg-[#FACC15]" />
    </footer>
  );
}
