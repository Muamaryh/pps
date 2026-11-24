import React from "react";
import {
  UserPlus,
  HeartHandshake,
  ShieldCheck,
  ExternalLink,
  Users,
  Camera,
  Building2,
  ArrowUpRight,
} from "lucide-react";

export default function Hero({
  heading: _heading,
  subtext,
  isIntroReady = true,
  onOpenPermit,
  onOpenRegister,
  onOpenTransparency,
  onOpenMembersDirectory,
  onNavigateToStructure,
  onNavigateToGallery,
  liveStats = {},
}) {
  const {
    approvedMembers = null,
    activeJasra = null,
    orgCount = 0,
    galleryCount = 0,
  } = liveStats;

  const statItems = [
    {
      id: "members",
      label: "Anggota Resmi",
      value: approvedMembers !== null ? `${approvedMembers}` : "...",
      hint: "Lihat direktori",
      icon: Users,
      accent: "text-[#DC2626] dark:text-[#FACC15]",
      iconBg: "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/50",
      onClick: onOpenMembersDirectory,
    },
    {
      id: "jasra",
      label: "Penerima Jasra",
      value: activeJasra !== null ? `${activeJasra}` : "...",
      hint: "Cek transparansi",
      icon: HeartHandshake,
      accent: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/50",
      onClick: () => onOpenTransparency && onOpenTransparency("jasra"),
    },
    {
      id: "org",
      label: "Jajaran Pengurus",
      value: orgCount > 0 ? `${orgCount}` : "...",
      hint: "Susunan divisi",
      icon: Building2,
      accent: "text-amber-700 dark:text-[#FACC15]",
      iconBg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/50",
      onClick: onNavigateToStructure,
    },
    {
      id: "gallery",
      label: "Dokumentasi Aksi",
      value: galleryCount > 0 ? `${galleryCount}` : "...",
      hint: "Warta lapangan",
      icon: Camera,
      accent: "text-sky-700 dark:text-sky-400",
      iconBg: "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/50",
      onClick: onNavigateToGallery,
    },
  ];

  return (
    <section id="home" className="pt-2 pb-8 sm:pb-12 w-full scroll-mt-24">
      {/* 1. Banner Utama PPS (Render instan untuk LCP maksimal di mobile & desktop) */}
      <div className="w-full relative rounded-2xl overflow-hidden border border-black/20 dark:border-white/10 shadow-none aspect-[1840/855] min-h-[260px] sm:min-h-[380px] md:min-h-[480px] flex items-center justify-center p-4 sm:p-8 text-center">
        <img
          src="/pps.webp?v=hd2"
          srcSet="/pps-mobile.webp?v=hd2 960w, /pps.webp?v=hd2 1840w"
          sizes="100vw"
          width="1840"
          height="855"
          fetchPriority="high"
          decoding="async"
          alt="LSM Paguyuban Pizza Sandy Shores"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />

        {/* Lapisan gelap solid agar teks putih, kuning, & merah sangat tajam terbaca */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        <div className="relative z-10 max-w-5xl px-3 sm:px-6 py-4 flex flex-col items-center justify-center">
          <div
            style={{ animationPlayState: isIntroReady ? "running" : "paused" }}
            className="mb-2.5 sm:mb-4 select-none animate-logo-arrival"
          >
            <img
              src="/logo.webp"
              width="128"
              height="128"
              fetchPriority="high"
              decoding="async"
              alt="Logo LSM Paguyuban Pizza Sandy Shores"
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain hover:scale-110 hover:-rotate-3 transition-transform duration-300 cursor-pointer"
            />
          </div>

          <h1 className="leading-[1.1] uppercase w-full flex flex-col items-center justify-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <span
              style={{ "--hero-delay": "80ms", animationPlayState: isIntroReady ? "running" : "paused" }}
              className="hero-line-reveal block font-heading text-base sm:text-2xl md:text-3xl lg:text-4xl text-white tracking-widest font-black uppercase mb-1 sm:mb-2"
            >
              LEMBAGA SWADAYA MASYARAKAT
            </span>
            <span
              style={{ "--hero-delay": "170ms", animationPlayState: isIntroReady ? "running" : "paused" }}
              className="hero-line-reveal block font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#FACC15] tracking-tight font-black uppercase leading-tight"
            >
              PAGUYUBAN PIZZA
            </span>
            <span
              style={{ "--hero-delay": "260ms", animationPlayState: isIntroReady ? "running" : "paused" }}
              className="hero-line-reveal block font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#DC2626] tracking-tight font-black uppercase leading-tight mt-0.5 sm:mt-1"
            >
              SANDY SHORES
            </span>
          </h1>
        </div>
      </div>

      {/* 2. Slogan, Legalitas & Hierarki CTA Utama */}
      <div className="mt-7 sm:mt-8 text-center max-w-4xl mx-auto flex flex-col items-center w-full px-2 sm:px-4">
        <p
          data-reveal="text"
          style={{ "--reveal-delay": "60ms" }}
          className="font-body text-base sm:text-xl md:text-2xl text-slate-900 dark:text-slate-200 leading-relaxed mb-4 font-black"
        >
          {subtext || "Bersatu • Berkarya • Untuk Masyarakat Sandy Shores"}
        </p>

        {/* Lencana Verifikasi Surat Izin Operasional Pemerintah */}
        <button
          type="button"
          data-reveal="card"
          style={{ "--reveal-delay": "130ms" }}
          onClick={onOpenPermit}
          className="group reveal-sheen inline-flex items-center gap-3 px-4 py-2.5 mb-6 rounded-2xl bg-white dark:bg-[#0B0D14] border border-black/20 dark:border-white/15 hover:border-[#FACC15]/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 cursor-pointer transition-all text-left max-w-xl w-full sm:w-auto"
          title="Klik untuk membuka dokumen Surat Izin Komunitas Resmi dari Pemerintah San Andreas"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#171A21] border-2 border-[#8A7131] flex items-center justify-center shrink-0 p-0.5 shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/documents/san_andreas_seal.webp"
              width="40"
              height="40"
              decoding="async"
              alt="Seal San Andreas"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase text-[#DC2626] dark:text-[#FACC15] tracking-wider">
                Terverifikasi Pemerintah San Andreas
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                IZIN AKTIF
              </span>
            </div>
            <div className="font-heading font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate mt-0.5">
              Surat Izin Operasional No: 001/SIK-DSC/SA/X/2026
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 break-words sm:whitespace-nowrap">
              Sekretariat Koordinat 1012 • Penanggung Jawab: Evan Wongso
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-mono font-black text-[#DC2626] dark:text-[#FACC15] shrink-0 pl-2 border-l border-black/20 dark:border-white/15">
            <span>Lihat Izin</span>
            <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* Hierarki CTA: 1 Aksi Utama (Daftar Anggota) + 2 Aksi Sekunder */}
        <div
          data-reveal="pop"
          style={{ "--reveal-delay": "200ms" }}
          className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center justify-center gap-2.5 sm:gap-3 w-full max-w-2xl mx-auto"
        >
          <button
            type="button"
            onClick={onOpenRegister}
            className="btn btn-red bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-red-500/80 px-5 sm:px-6 py-3 text-xs sm:text-sm font-black shadow-[0_6px_22px_rgba(220,38,38,0.32)] hover:shadow-[0_8px_28px_rgba(220,38,38,0.45)] cursor-pointer whitespace-nowrap justify-center"
          >
            <UserPlus size={17} className="text-[#FACC15] shrink-0" />
            <span>Daftar Anggota Resmi</span>
          </button>

          <div className="grid grid-cols-2 md:flex md:items-center gap-2 sm:gap-3">
            <a
              href="#program"
              className="btn btn-secondary !bg-white dark:!bg-[#141722] hover:!bg-amber-50 dark:hover:!bg-[#1B1F2E] !text-slate-900 dark:!text-slate-100 border border-black/20 dark:border-white/15 hover:border-[#FACC15] px-2.5 sm:px-5 py-3 text-[11px] sm:text-sm font-bold whitespace-nowrap justify-center"
            >
              <HeartHandshake size={15} className="text-[#DC2626] dark:text-[#FACC15] shrink-0" />
              <span>Program Warga</span>
            </a>

            <button
              type="button"
              onClick={() => onOpenTransparency && onOpenTransparency("jasra")}
              className="btn btn-secondary !bg-white dark:!bg-[#141722] hover:!bg-amber-50 dark:hover:!bg-[#1B1F2E] !text-slate-900 dark:!text-slate-100 border border-black/20 dark:border-white/15 hover:border-[#FACC15] px-2.5 sm:px-5 py-3 text-[11px] sm:text-sm font-bold cursor-pointer whitespace-nowrap justify-center"
            >
              <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Transparansi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Strip Statistik Live Organisasi (Klik langsung ke portal terkait) */}
      <div className="mt-7 sm:mt-9 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {statItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              data-reveal="card"
              style={{ "--reveal-delay": `${idx * 70}ms` }}
              onClick={item.onClick}
              className="group reveal-sheen text-left rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-[#121622] border border-black/15 dark:border-white/15 hover:border-[#FACC15]/80 transition-all hover:-translate-y-0.5 cursor-pointer flex items-start justify-between gap-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none"
            >
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                  {item.label}
                </span>
                <div className={`font-heading font-black text-2xl sm:text-3xl leading-none mt-1.5 ${item.accent}`}>
                  {item.value}
                </div>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 group-hover:text-[#DC2626] dark:group-hover:text-[#FACC15] mt-1.5 transition-colors">
                  <span className="truncate">{item.hint}</span>
                  <ArrowUpRight size={12} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </div>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                <Icon size={18} className={item.accent} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
