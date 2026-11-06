import React, { useState } from "react";
import { HeartHandshake, TrendingUp, Landmark, ChevronDown, ChevronUp, FileText, CheckCircle2, Target, Scale, ScrollText } from "lucide-react";
import OfficialCharterViewer from "./OfficialCharterViewer";

export default function About({
  aboutText,
  aboutHeader,
  aboutPillars,
  visionMission,
  charterTitle,
  onShowToast,
}) {
  const [showFullText, setShowFullText] = useState(false);
  const [activeTab, setActiveTab] = useState("charter"); // "charter" | "narrative"

  const paragraphs = aboutText
    ? aboutText
        .split(/\r?\n\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const defaultHeader = {
    label: "TENTANG KAMI",
    title: "Profil & Arah Gerakan PPS",
    badge: "MANIFESTO RESMI"
  };

  const activeHeader = { ...defaultHeader, ...(aboutHeader || {}) };

  const defaultPillars = [
    {
      badge: "Kepedulian Warga",
      title: "Solidaritas & Aksi Sosial",
      desc: "Menghidupkan gotong royong warga melalui bakti sosial, pertemuan rutin, serta kepedulian nyata bagi warga yang membutuhkan di kawasan Sandy Shores.",
      status: "Program Aktif Berkelanjutan"
    },
    {
      badge: "Kemandirian Usaha",
      title: "Pemberdayaan UMKM",
      desc: "Mendorong kemandirian ekonomi warga melalui penyediaan stand usaha, pengelolaan lapak dagang berizin, serta pembinaan keterampilan usaha lokal.",
      status: "Program Aktif Berkelanjutan"
    },
    {
      badge: "Jembatan Komunikasi",
      title: "Advokasi & Aspirasi Kota",
      desc: "Menjadi mitra dialog yang konstruktif bagi Government Ime City dalam menyalurkan suara warga demi terciptanya kebijakan publik yang adil dan terbuka.",
      status: "Program Aktif Berkelanjutan"
    },
  ];

  const pillarIcons = [
    { icon: HeartHandshake, iconBg: "bg-[#DC2626] text-[#FACC15]" },
    { icon: TrendingUp, iconBg: "bg-[#FACC15] text-[#111827]" },
    { icon: Landmark, iconBg: "bg-[#DC2626] text-white" },
  ];

  const activePillars = aboutPillars && aboutPillars.length === 3 ? aboutPillars : defaultPillars;

  const defaultVisionMission = {
    visionLabel: "Visi Komunitas",
    visionTitle: "“Terwujudnya Masyarakat Sandy Shores yang Kompak, Mandiri, dan Bermartabat Bersama.”",
    visionDesc: "Kemajuan suatu kawasan bertumpu pada solidaritas warganya. Melalui gotong royong dan keterbukaan, LSM Paguyuban Pizza Sandy Shores berikhtiar merangkul setiap potensi demi lingkungan yang tertib, harmonis, dan mandiri.",
    missionTitle: "Misi Pokok Lembaga:",
    missionItems: [
      "Menampung dan memperjuangkan aspirasi warga secara bertanggung jawab ke otoritas kota.",
      "Membuka ruang usaha mandiri melalui fasilitas stan & lapak UMKM warga berizin.",
      "Menggerakkan aksi sosial, pertemuan warga, dan kegiatan kebersamaan yang teratur."
    ]
  };

  const activeVM = {
    ...defaultVisionMission,
    ...(visionMission || {}),
    missionItems: visionMission?.missionItems && visionMission.missionItems.length > 0
      ? visionMission.missionItems
      : defaultVisionMission.missionItems
  };

  const activeCharterTitle = charterTitle || "Pakta Pendirian & Anggaran Dasar (AD/ART) Resmi LSM PPS";

  return (
    <section id="about" className="py-10 sm:py-14 w-full scroll-mt-24">
      {/* Title Bar */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-black/20 dark:border-white/10 flex-wrap">
        <div>
          <div className="card-label mb-1">
            {activeHeader.label}
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            {activeHeader.title}
          </h2>
        </div>
        <div className="badge-brutal badge-yellow font-black">
          {activeHeader.badge}
        </div>
      </div>

      {/* 3 Pillars Cards (Generous padding & full-width grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-8">
        {activePillars.map((pillar, idx) => {
          const meta = pillarIcons[idx % pillarIcons.length];
          const Icon = meta.icon;
          return (
            <div
              key={idx}
              className="card-brutal p-6 sm:p-7 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${meta.iconBg} border border-black/10 dark:border-white/15 shadow-sm dark:shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <span className="badge-brutal text-[10.5px] uppercase tracking-wider font-bold">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white mb-2.5 group-hover:text-[#DC2626] dark:group-hover:text-[#FACC15] transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-black/15 dark:border-white/10 flex items-center gap-2 text-xs font-bold text-[#DC2626] dark:text-[#FACC15]">
                <CheckCircle2 size={15} />
                <span>{pillar.status || "Program Aktif Berkelanjutan"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vision & Mission Card (Spacious 2-column layout) */}
      <div className="card-brutal p-6 sm:p-8 lg:p-10 mb-8 border border-black/15 dark:border-white/10 shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="card-label mb-2">
              {activeVM.visionLabel}
            </div>
            <h3 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white mb-4 leading-tight">
              {activeVM.visionTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {activeVM.visionDesc}
            </p>
          </div>

          <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-[#F7F5EE] dark:bg-[#07080E]/70 border border-black/25 dark:border-white/10 shadow-sm dark:shadow-lg">
            <h4 className="font-heading font-black text-base uppercase text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Target size={18} className="text-[#DC2626] dark:text-[#FACC15]" />
              <span>{activeVM.missionTitle}</span>
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
              {activeVM.missionItems.map((item, mIdx) => (
                <li key={mIdx} className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-lg ${mIdx % 2 === 0 ? "bg-[#DC2626] text-white" : "bg-[#FACC15] text-black"} flex items-center justify-center shrink-0 text-xs font-black border border-black/10 dark:border-white/20 shadow-sm`}>
                    {mIdx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Expandable Official Charter & AD/ART */}
      <div className="card-brutal overflow-hidden border border-black/25 dark:border-white/10 shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <button
          onClick={() => setShowFullText(!showFullText)}
          className="w-full px-5 sm:px-7 py-4 sm:py-5 bg-[#F7F5EE] dark:bg-[#0E111B] hover:bg-[#EFECE3] dark:hover:bg-white/[0.04] transition-colors flex items-center justify-between text-left font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FACC15] border border-yellow-500/50 flex items-center justify-center text-slate-950 shadow-sm shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-black text-sm sm:text-base">{activeCharterTitle}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-[#DC2626] dark:text-[#EF4444] border border-red-200 dark:border-red-800/60">
                  NO: 001/PP-LSM-PPS/X/2026
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-[#FACC15] border border-amber-200 dark:border-amber-800/60">
                  EDISI 001/2026
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Konstitusi Resmi 10 Bab, Izin Operasional Koordinat 1012, &amp; Lembar Pengesahan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#DC2626] dark:text-[#FACC15] shrink-0 ml-2">
            <span className="hidden sm:inline">{showFullText ? "Tutup Dokumen" : "Buka Dokumen Resmi"}</span>
            {showFullText ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {showFullText && (
          <div className="p-4 sm:p-7 bg-[var(--card-bg)] border-t border-black/25 dark:border-white/10 flex flex-col gap-5">
            {/* Tab Navigasi Dokumen jika ada narasi pendamping */}
            {paragraphs.length > 0 && (
              <div className="flex items-center gap-2 border-b border-black/25 dark:border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("charter")}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeTab === "charter"
                      ? "bg-[#FACC15] text-slate-950 border-amber-500 font-black shadow-sm"
                      : "bg-[#F7F5EE] dark:bg-white/5 border-black/25 dark:border-white/10 text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <Scale size={14} />
                  <span>Pakta Pendirian &amp; AD/ART Resmi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("narrative")}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeTab === "narrative"
                      ? "bg-[#FACC15] text-slate-950 border-amber-500 font-black shadow-sm"
                      : "bg-[#F7F5EE] dark:bg-white/5 border-black/25 dark:border-white/10 text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <FileText size={14} />
                  <span>Naskah Narasi / Manifesto Pendirian</span>
                </button>
              </div>
            )}

            {/* Konten Tab */}
            {activeTab === "charter" ? (
              <OfficialCharterViewer onShowToast={onShowToast} />
            ) : (
              <div className="p-5 sm:p-7 rounded-xl bg-[#F7F5EE] dark:bg-[#07080E]/80 border border-black/25 dark:border-white/10 shadow-sm dark:shadow-lg space-y-4 text-justify leading-relaxed text-sm sm:text-base font-normal text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 pb-2 border-b border-black/25 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  <FileText size={14} className="text-[#DC2626]" />
                  <span>NASKAH NARASI DAN PENJELASAN PENDIRIAN ORGANISASI</span>
                </div>
                {paragraphs.map((p, idx) => (
                  <p key={idx} className="indent-6 sm:indent-8">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
