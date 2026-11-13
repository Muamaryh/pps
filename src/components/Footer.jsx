import React, { useState, useEffect } from "react";
import {
  Shield,
  ArrowUp,
  MapPin,
  Store,
  UserPlus,
  Users,
  FileText,
  Compass,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { subscribeVisitorStatsCloud } from "../services/visitorService";

export default function Footer({
  brand,
  discordUrl: _discordUrl,
  discordVisitorUrl: _discordVisitorUrl,
  onOpenServicePortal,
  onOpenRegister,
  onOpenMembersDirectory,
  onOpenAdmin: _onOpenAdmin,
  onOpenTransparency,
  onNavigateToStructure,
  onNavigateToGallery,
  onNavigateToHome,
}) {
  const [visitorStats, setVisitorStats] = useState({ totalVisitors: 1 });

  useEffect(() => {
    const unsub = subscribeVisitorStatsCloud((stats) => {
      if (stats && stats.totalVisitors) {
        setVisitorStats(stats);
      }
    });
    return () => unsub();
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="mt-14 sm:mt-20 bg-[#E1DDD3] dark:bg-[#07080E] text-xs text-slate-700 dark:text-slate-400 font-heading border-t border-black/25 dark:border-white/10 shadow-sm dark:shadow-[0_-10px_35px_rgba(0,0,0,0.8)] overflow-hidden transition-colors">
      {/* Top Banner inside Footer */}
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto pt-10 pb-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-black/20 dark:border-white/10">
          
          {/* Column 1: Organization Identity & Mission (Span 6) */}
          <div className="md:col-span-2 lg:col-span-6 flex flex-col items-start gap-3.5">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Logo LSM Paguyuban Pizza Sandy Shores"
                className="w-11 h-11 object-contain shrink-0"
              />
              <div className="leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] block">
                  LEMBAGA SWADAYA MASYARAKAT
                </span>
                <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight">
                  {brand || "PAGUYUBAN PIZZA SANDY SHORES"}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-body font-normal max-w-md">
              Wadah persatuan, advokasi aspirasi warga, pembinaan stan &amp; lapak UMKM mandiri, serta aksi kepedulian sosial di wilayah Sandy Shores dan sekitarnya.
            </p>

            {/* Jurisdiction Badge */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-white/5 border border-black/20 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                <MapPin size={13} className="text-[#DC2626]" />
                <span>Sandy Shores, Blaine County</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/60 font-bold text-[10px] shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                <span>SERVER IME ROLEPLAY</span>
              </div>
            </div>
          </div>

          {/* Column 2: Navigasi Cepat (Span 3) */}
          <div className="flex flex-col gap-2.5 lg:col-span-3">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-900 dark:text-[#FACC15] border-b border-black/20 dark:border-white/10 pb-1.5 flex items-center gap-1.5">
              <Compass size={14} />
              <span>Navigasi</span>
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <a
                  href="#home"
                  onClick={(e) => {
                    if (onNavigateToHome) {
                      e.preventDefault();
                      onNavigateToHome("#home");
                    }
                  }}
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Beranda Utama
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    if (onNavigateToHome) {
                      e.preventDefault();
                      onNavigateToHome("#about");
                    }
                  }}
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Profil &amp; Visi Misi
                </a>
              </li>
              <li>
                <a
                  href="#/struktur"
                  onClick={(e) => {
                    if (onNavigateToStructure) {
                      e.preventDefault();
                      onNavigateToStructure();
                    } else if (onNavigateToHome) {
                      e.preventDefault();
                      onNavigateToHome("#structure");
                    }
                  }}
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Susunan Pengurus
                </a>
              </li>
              <li>
                <a
                  href="#/dokumentasi"
                  onClick={(e) => {
                    if (onNavigateToGallery) {
                      e.preventDefault();
                      onNavigateToGallery();
                    }
                  }}
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Dokumentasi Kegiatan
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Layanan Publik & Warga (Span 3) */}
          <div className="flex flex-col gap-2.5 lg:col-span-3">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-900 dark:text-[#FACC15] border-b border-black/20 dark:border-white/10 pb-1.5 flex items-center gap-1.5">
              <Store size={14} />
              <span>Layanan Warga</span>
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              {onOpenRegister && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer transition-transform"
                  >
                    <UserPlus size={13} className="text-[#DC2626] dark:text-[#FACC15] shrink-0" />
                    <span>Pendaftaran Anggota Resmi</span>
                  </button>
                </li>
              )}
              {onOpenMembersDirectory && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenMembersDirectory}
                    className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer transition-transform"
                  >
                    <Users size={13} className="text-[#DC2626] shrink-0" />
                    <span>Direktori Publik Anggota</span>
                  </button>
                </li>
              )}
              {onOpenServicePortal && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenServicePortal("lapak")}
                      className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer transition-transform"
                    >
                      <Store size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Pendaftaran Lapak UMKM</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenServicePortal("meeting")}
                      className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer transition-transform"
                    >
                      <FileText size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>Request Meeting / Audiensi</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenServicePortal("tracking")}
                      className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer transition-transform"
                    >
                      <Shield size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Lacak Status Tiket Pengajuan</span>
                    </button>
                  </li>
                </>
              )}
              {onOpenTransparency && (
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenTransparency("jasra")}
                    className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 cursor-pointer transition-transform font-bold"
                    title="Buka laporan transparansi resmi untuk Pemerintah Kota San Andreas"
                  >
                    <ShieldCheck size={13} className="shrink-0" />
                    <span>Laporan Transparansi Pemerintah</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Tech Badge & Back to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 dark:text-slate-400 font-medium">
          <p className="text-center sm:text-left text-[11px]">
            &copy; 2026{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {brand || "LSM Paguyuban Pizza Sandy Shores"}
            </span>
            . Seluruh aset, naskah manifesto, dan sistem pendaftaran dilindungi.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            {/* Live Visitor Counter Badge (Sleek Modern Pill) */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-black/20 dark:border-white/10 text-[10.5px] font-heading font-black text-slate-800 dark:text-slate-200 shadow-sm"
              title="Total kunjungan warga ke Portal Resmi LSM PPS"
            >
              <Eye size={12} className="text-[#DC2626] dark:text-[#FACC15]" />
              <span className="text-slate-600 dark:text-slate-400 font-bold">PENGUNJUNG:</span>
              <span className="font-mono text-xs text-[#DC2626] dark:text-[#FACC15]">
                {Number(visitorStats.totalVisitors || 1).toLocaleString("id-ID")}
              </span>
            </div>

            <div className="badge-brutal badge-yellow text-[10px] py-1 px-3 flex items-center gap-1.5 font-bold">
              <Shield size={12} className="text-[#DC2626]" />
              <span>Portal Terverifikasi PPS</span>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              className="btn btn-secondary text-[11px] py-1 px-3 flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 font-bold"
              title="Kembali ke atas halaman"
            >
              <ArrowUp size={12} />
              <span>Atas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Yellow & Red Dual Bottom Strip */}
      <div className="w-full flex h-2">
        <div className="flex-1 bg-[#FACC15]" />
        <div className="w-24 sm:w-36 bg-[#DC2626]" />
      </div>
    </footer>
  );
}
