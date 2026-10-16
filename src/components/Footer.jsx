import React from "react";
import { Lock, Shield } from "lucide-react";

export default function Footer({ brand }) {
  return (
    <footer className="mt-14 py-8 px-2 sm:px-4 md:px-6 border-t-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[var(--card-bg)] text-xs text-slate-700 dark:text-slate-300 font-heading font-bold">
      <div className="w-full max-w-[98%] 2xl:max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand Copyright */}
        <p className="text-center sm:text-left">
          &copy; 2026{" "}
          <span className="font-black text-slate-950 dark:text-slate-100">
            {brand || "Paguyuban Pizza Sandy Shores"}
          </span>
          . Properti dan asek milik PPS.
        </p>

        {/* Tech / Community Badge & Discreet Admin Access */}
        <div className="flex items-center gap-3">
          <div className="badge-brutal text-xs py-1 px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <Shield size={13} className="text-[#DC2626]" />
            <span>Portal Resmi PPS</span>
          </div>

          <a
            href="/admin"
            className="btn btn-secondary text-xs py-1 px-3 shadow-[2px_2px_0px_#000] border-2 border-black dark:border-[#475569]"
            title="Akses Panel Admin"
          >
            <Lock size={12} className="text-[#DC2626] dark:text-[#FACC15]" />
            <span>admin</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
