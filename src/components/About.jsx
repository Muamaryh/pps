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
      {/* Title Bar (temp-mail-cf .inbox-title-bar style) */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-3 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] flex-wrap">
        <div>
          <div className="card-label text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
            {activeHeader.label}
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
            {activeHeader.title}
          </h2>
        </div>
        <div className="badge-brutal bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]">
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
              className="card-brutal p-6 sm:p-7 bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[5px_5px_0px_#000000] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded ${meta.iconBg} border-2 border-black dark:border-[#334155] shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0`}>
                    <Icon size={22} />
                  </div>
                  <span className="badge-brutal text-[11px] uppercase py-0.5 px-2.5 bg-transparent border-2 border-black dark:border-[#475569] text-slate-800 dark:text-slate-200">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="font-heading font-black text-lg sm:text-xl text-slate-950 dark:text-slate-100 mb-2.5">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t-2 border-dashed border-[#1A1A1A]/20 dark:border-slate-700/60 flex items-center gap-2 text-xs font-bold text-[#DC2626] dark:text-[#FACC15]">
                <CheckCircle2 size={16} />
                <span>{pillar.status || "Program Aktif Berkelanjutan"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vision & Mission Card (Spacious 2-column layout) */}
      <div className="card-brutal p-6 sm:p-8 lg:p-10 mb-8 bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="card-label text-xs sm:text-sm mb-2 text-slate-700 dark:text-slate-300">
              {activeVM.visionLabel}
            </div>
            <h3 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 dark:text-slate-100 mb-4 leading-tight">
              {activeVM.visionTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {activeVM.visionDesc}
            </p>
          </div>

          <div className="lg:col-span-5 p-5 sm:p-6 rounded-lg bg-[#FFFDF9] dark:bg-[#1F222C] border-2 border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000]">
            <h4 className="font-heading font-black text-base uppercase text-slate-950 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Target size={18} className="text-[#DC2626] dark:text-[#FACC15]" />
              <span>{activeVM.missionTitle}</span>
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold">
              {activeVM.missionItems.map((item, mIdx) => (
                <li key={mIdx} className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded ${mIdx % 2 === 0 ? "bg-[#DC2626] text-white" : "bg-[#FACC15] text-black"} flex items-center justify-center shrink-0 text-xs font-black border border-black shadow-sm`}>
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
      <div className="card-brutal overflow-hidden bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[5px_5px_0px_#000000]">
        <button
          onClick={() => setShowFullText(!showFullText)}
          className="w-full px-5 sm:px-7 py-4 sm:py-5 bg-[#FFFDF9] dark:bg-[#1F222C] hover:bg-[#FACC15]/15 transition-colors flex items-center justify-between text-left font-heading font-black text-sm sm:text-base text-slate-950 dark:text-slate-100 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0px_#000] shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-black text-sm sm:text-base">{activeCharterTitle}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-[#DC2626] dark:text-[#FACC15] border border-red-300 dark:border-red-900/50">
                  NO: 001/PP-LSM-PPS/X/2026
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                  EDISI 001/2026
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 font-normal mt-0.5">
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
          <div className="p-4 sm:p-7 bg-[var(--card-bg)] border-t-2 border-[#1A1A1A]/20 dark:border-slate-700/60 flex flex-col gap-5">
            {/* Tab Navigasi Dokumen jika ada narasi pendamping */}
            {paragraphs.length > 0 && (
              <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("charter")}
                  className={`py-1.5 px-3.5 rounded text-xs font-mono font-bold border-2 border-black cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeTab === "charter"
                      ? "bg-[#FACC15] text-slate-950 shadow-[1.5px_1.5px_0px_#000] font-black"
                      : "bg-white dark:bg-[#1E212B] text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <Scale size={14} />
                  <span>Pakta Pendirian &amp; AD/ART Resmi (10 Bab)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("narrative")}
                  className={`py-1.5 px-3.5 rounded text-xs font-mono font-bold border-2 border-black cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeTab === "narrative"
                      ? "bg-[#FACC15] text-slate-950 shadow-[1.5px_1.5px_0px_#000] font-black"
                      : "bg-white dark:bg-[#1E212B] text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
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
              <div className="p-5 sm:p-7 rounded bg-[#FFFDF9] dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] space-y-4 text-justify leading-relaxed text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100">
                <div className="flex items-center gap-2 pb-2 border-b border-black/10 dark:border-white/10 text-xs font-bold text-slate-500 font-mono">
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
