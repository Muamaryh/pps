import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import {
  ArrowLeft,
  Users,
  Crown,
  Shield,
  ShieldAlert,
  Zap,
  Briefcase,
  Compass,
  ZoomIn,
  ChevronDown,
  ChevronRight,
  Home,
  Building2,
} from "lucide-react";
import { getSubMembers } from "../services/orgService";

// Clean descriptive subtitles for departments
const ROLE_DESCRIPTIONS = {
  "Ketua Umum": "Pemimpin Tertinggi & Penanggung Jawab Umum Lembaga",
  "Penasihat": "Pengarah Kebijakan, Dewan Pembina & Sesepuh Organisasi",
  "Wakil Ketua Umum Penggerak": "Koordinator Operasional & Mobilisasi Massa Lapangan",
  "Wakil Ketua Umum": "Koordinator Operasional & Mobilisasi Massa Lapangan",
  "Sekjen": "Tata Kelola Administrasi, Kesekretariatan & Arsip Resmi",
  "Bendahara": "Tata Kelola Keuangan, Anggaran Kas & Audit Transparansi",
  "Humas": "Komunikasi Publik, Advokasi Warga & Hubungan Antar-Lembaga",
  "Logistik": "Pengelolaan Inventaris, Aset Operasional & Distribusi Stand UMKM",
  "Logistik - Sekjen": "Pengelolaan Inventaris, Aset Operasional & Distribusi Stand UMKM",
  "Korda Keamanan": "Komando Satgas Pengamanan Wilayah & Ketertiban Lapak",
  "Korda Media LSM": "Publikasi Media Informasi, Penyiaran & Dokumentasi Visual",
  "Korda Media": "Publikasi Media Informasi, Penyiaran & Dokumentasi Visual",
  "Korda Lapangan": "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat",
  "Koordinator Lapangan": "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat",
  "Korda Mula Idari": "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat",
  "Koordinator Wilayah": "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat",
  "Korda Wilayah": "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat",
  "Korda Pesisir": "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat",
};

function getAutoRoleDesc(role = "", isKetua = false) {
  const cleanRole = (role || "").trim();
  if (ROLE_DESCRIPTIONS[cleanRole]) return ROLE_DESCRIPTIONS[cleanRole];

  const r = cleanRole.toLowerCase();
  if (r.includes("logistik")) {
    return "Pengelolaan Inventaris, Aset Operasional & Distribusi Stand UMKM";
  }
  if (r.includes("keamanan") || r.includes("satgas")) {
    return "Komando Satgas Pengamanan Wilayah & Ketertiban Lapak";
  }
  if (r.includes("media") || r.includes("dokumentasi") || r.includes("publikasi")) {
    return "Publikasi Media Informasi, Penyiaran & Dokumentasi Visual";
  }
  if (r.includes("lapangan") || r.includes("korda") || r.includes("wilayah") || r.includes("pesisir")) {
    return "Koordinator Wilayah Pesisir & Hubungan Tokoh Masyarakat";
  }
  if (r.includes("humas") || r.includes("relasi")) {
    return "Komunikasi Publik, Advokasi Warga & Hubungan Antar-Lembaga";
  }
  if (r.includes("bendahara") || r.includes("keuangan") || r.includes("kas")) {
    return "Tata Kelola Keuangan, Anggaran Kas & Audit Transparansi";
  }
  if (r.includes("sekjen") || r.includes("sekretaris")) {
    return "Tata Kelola Administrasi, Kesekretariatan & Arsip Resmi";
  }
  if (r.includes("wakil") || r.includes("penggerak")) {
    return "Koordinator Operasional & Mobilisasi Massa Lapangan";
  }
  if (r.includes("penasihat") || r.includes("pembina") || r.includes("sesepuh")) {
    return "Pengarah Kebijakan, Dewan Pembina & Sesepuh Organisasi";
  }
  if (r.includes("ketua") || isKetua) {
    return "Pemimpin Tertinggi & Penanggung Jawab Umum Lembaga";
  }
  return "Pejabat Struktural LSM PPS Sandy Shores";
}

export default function StructurePage({
  org = [],
  tierTitles = {},
  onOpenLightbox,
  onNavigateHome,
}) {
  // Set of member names whose team drawer is open (default: empty, all closed)
  const [expandedTeams, setExpandedTeams] = useState(new Set());

  // Active Tier Titles with authentic Indonesian LSM fallback
  const activeTierTitles = useMemo(() => ({
    tier1: tierTitles?.tier1?.trim() || "Dewan Pimpinan Pusat (DPP)",
    tier2Left: tierTitles?.tier2Left?.trim() || "Majelis Pertimbangan Organisasi (MPO)",
    tier2Right: tierTitles?.tier2Right?.trim() || "Wakil Ketua Umum & Komando Lapangan",
    tier3: tierTitles?.tier3?.trim() || "Badan Pengurus Harian (BPH)",
    tier4: tierTitles?.tier4?.trim() || "Koordinator Daerah (Korda) & Komando Satgas",
  }), [tierTitles]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Card DOM refs for FLIP layout animation (smooth position transitions when siblings expand or wrap)
  const cardRefs = useRef(new Map());
  const prevRectsRef = useRef(new Map());

  function toggleTeam(memberName) {
    // 1. Snapshot all cards' live positions before layout change (FLIP)
    const rects = new Map();
    cardRefs.current.forEach((el, name) => {
      if (el) {
        rects.set(name, el.getBoundingClientRect());
      }
    });
    prevRectsRef.current = rects;

    // 2. Toggle expanded state
    setExpandedTeams((prev) => {
      const next = new Set();
      // If already open, close it; otherwise open only this one to keep layout elegant
      if (!prev.has(memberName)) {
        next.add(memberName);
      }
      return next;
    });
  }

  // FLIP Layout Animation: smoothly glide cards when siblings expand, shift, or wrap rows
  useLayoutEffect(() => {
    if (prevRectsRef.current.size === 0) return;

    cardRefs.current.forEach((el, name) => {
      if (!el) return;
      const prevRect = prevRectsRef.current.get(name);
      if (!prevRect) return;

      const currentRect = el.getBoundingClientRect();
      const deltaX = prevRect.left - currentRect.left;
      const deltaY = prevRect.top - currentRect.top;

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        // INVERT: Immediately invert position before screen paint
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        el.style.transition = "none";
        el.style.zIndex = "25";

        // PLAY: Animate smoothly to new position on next frame
        requestAnimationFrame(() => {
          el.style.transition = "transform 450ms cubic-bezier(0.25, 1, 0.5, 1)";
          el.style.transform = "";

          const onTransitionEnd = () => {
            el.style.transition = "";
            el.style.zIndex = "";
            el.removeEventListener("transitionend", onTransitionEnd);
          };
          el.addEventListener("transitionend", onTransitionEnd);
        });
      }
    });

    prevRectsRef.current.clear();
  }, [expandedTeams]);

  // Total people count (leaders + subordinate staff)
  const totalPeopleCount = useMemo(() => {
    let count = org.length;
    org.forEach((m) => {
      count += getSubMembers(m).length;
    });
    return count;
  }, [org]);

  // Categorize org members into hierarchical tiers
  const treeTiers = useMemo(() => {
    let ketua = null;
    const penasihat = [];
    const wakil = [];
    const bphMembers = [];
    const satgasMembers = [];

    org.forEach((member) => {
      const role = (member.role || "").toLowerCase().trim();
      const lvl = Number(member.level) || 4;

      // 1. Pimpinan Tertinggi: Ketua Umum (Tier 1)
      if (role.includes("ketua umum") || (lvl === 1 && !role.includes("wakil"))) {
        if (!ketua) ketua = member;
        else wakil.push(member);
      }
      // 2. Dewan Penasihat / MPO (Tier 2)
      else if (role.includes("penasihat") || role.includes("pembina") || lvl === 2) {
        penasihat.push(member);
      }
      // 3. Wakil Ketua Umum (Tier 3)
      else if (role.includes("wakil") || lvl === 3) {
        wakil.push(member);
      }
      // 4. Badan Pengurus Harian (BPH) & Satgas / Korda
      else {
        const isBphRole =
          role.includes("sekjen") ||
          role.includes("sekretaris") ||
          role.includes("bendahara") ||
          role.includes("keuangan") ||
          role.includes("humas") ||
          role.includes("logistik");

        const isSatgasRole =
          role.includes("korda") ||
          role.includes("satgas") ||
          role.includes("keamanan") ||
          role.includes("media") ||
          role.includes("lapangan") ||
          role.includes("wilayah") ||
          role.includes("pesisir");

        if (isBphRole) {
          bphMembers.push(member);
        } else if (isSatgasRole) {
          satgasMembers.push(member);
        } else if (lvl === 4) {
          bphMembers.push(member);
        } else if (lvl === 5) {
          satgasMembers.push(member);
        } else {
          // General fallback
          if (bphMembers.length < 4) bphMembers.push(member);
          else satgasMembers.push(member);
        }
      }
    });

    // Urutan resmi BPH: 1. Sekjen -> 2. Bendahara 1 -> 3. Bendahara 2 -> 4. Humas -> 5. Logistik
    const bphOrderRank = (m) => {
      const r = (m.role || "").toLowerCase();
      if (r.includes("sekjen") || r.includes("sekretaris")) return 1;
      if (r.includes("bendahara 1")) return 2;
      if (r.includes("bendahara 2")) return 2.1;
      if (r.includes("bendahara") || r.includes("keuangan")) return 2.2;
      if (r.includes("humas") || r.includes("relasi")) return 3;
      if (r.includes("logistik") || r.includes("inventaris")) return 4;
      return 5;
    };
    bphMembers.sort((a, b) => bphOrderRank(a) - bphOrderRank(b));

    // Urutan Satgas / Korda: 1. Keamanan -> 2. Media -> 3. Wilayah / Lapangan
    const satgasOrderRank = (m) => {
      const r = (m.role || "").toLowerCase();
      if (r.includes("keamanan") || r.includes("satgas")) return 1;
      if (r.includes("media") || r.includes("publikasi") || r.includes("dokumentasi")) return 2;
      if (r.includes("lapangan") || r.includes("wilayah") || r.includes("korda") || r.includes("pesisir")) return 3;
      return 4;
    };
    satgasMembers.sort((a, b) => satgasOrderRank(a) - satgasOrderRank(b));

    return { ketua, penasihat, wakil, bphMembers, satgasMembers };
  }, [org]);

  // All leadership figures for Most Wanted collage in hero banner
  const mostWantedLineup = useMemo(() => {
    // Collect all structure members in hierarchical order so EVERYONE is included
    const allMembers = [
      ...(treeTiers.ketua ? [treeTiers.ketua] : []),
      ...treeTiers.wakil,
      ...treeTiers.penasihat,
      ...treeTiers.bphMembers,
      ...treeTiers.satgasMembers,
    ];

    const tilts = [
      "-rotate-3",
      "rotate-2",
      "-rotate-4",
      "rotate-3",
      "-rotate-2",
      "rotate-4",
      "-rotate-5",
      "rotate-2",
      "-rotate-3",
      "rotate-3",
      "-rotate-4",
      "rotate-2",
    ];

    return allMembers.map((m, idx) => ({
      ...m,
      rank: idx === 0 ? 1 : idx < 3 ? 2 : 3,
      tilt: tilts[idx % tilts.length],
      zIndex: idx === 0 ? "z-30" : "z-10",
      scale: idx === 0 ? "scale-105" : "scale-100",
    }));
  }, [treeTiers]);

  // Helper to render an elegant Tree Node Card
  function renderTreeNode(member, tierType = "normal", isSolo = false) {
    if (!member) return null;

    const subMembers = getSubMembers(member);
    const hasSubMembers = subMembers.length > 0;
    const isExpanded = expandedTeams.has(member.name);
    const isKetua = tierType === "ketua";
    const roleDesc =
      member.desc?.trim() || getAutoRoleDesc(member.role, isKetua);

    // Role label taken directly from Admin Modal (member.role)
    const displayRole = (member.role || "ANGGOTA").trim().toUpperCase();

    return (
      <div
        ref={(el) => {
          if (el) cardRefs.current.set(member.name, el);
          else cardRefs.current.delete(member.name);
        }}
        className={`transition-all duration-300 ease-out flex flex-col md:flex-row rounded-2xl overflow-hidden bg-[#0B0D14] border-2 group/card relative shadow-lg shadow-black/40 hover:-translate-y-1.5 shrink-0 ${
          isExpanded
            ? "w-full max-w-[320px] sm:max-w-[280px] md:w-[505px] md:max-w-[505px]"
            : isSolo
            ? "w-full max-w-[270px] sm:w-[265px]"
            : "w-[calc(50%-5px)] sm:w-[265px] max-w-[270px]"
        } ${
          isKetua ? "border-[#DC2626]" : "border-[#FACC15]"
        } ${
          isExpanded
            ? isKetua
              ? "ring-2 ring-[#DC2626] ring-offset-2 ring-offset-black"
              : "ring-2 ring-[#FACC15] ring-offset-2 ring-offset-black"
            : ""
        }`}
      >
        {/* Left Section: Main Officer Card */}
        <div className={`w-full md:w-[265px] ${isSolo ? "min-h-[340px] sm:min-h-[342px]" : "min-h-[265px] sm:min-h-[342px]"} flex flex-col justify-between shrink-0 bg-[#0B0D14]`}>
          {/* 1. Tactical Dossier Top Micro Bar */}
          <div
            className={`w-full px-2 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between border-b select-none ${
              isKetua
                ? "bg-[#DC2626]/15 border-[#DC2626]/30 text-red-400"
                : "bg-[#FACC15]/10 border-[#FACC15]/20 text-[#FACC15]"
            }`}
          >
            <div className="flex items-center gap-1 font-mono text-[8px] sm:text-[9px] font-black tracking-wider uppercase min-w-0 pr-1">
              {isKetua ? (
                <Crown
                  size={10}
                  className="text-[#DC2626] shrink-0"
                />
              ) : (
                <Shield
                  size={9}
                  className="text-[#FACC15] shrink-0"
                />
              )}
              <span className="truncate" title={displayRole}>
                {displayRole} // PPS
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[7.5px] sm:text-[8.5px] font-bold tracking-wider text-slate-400 shrink-0">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isKetua ? "bg-red-500 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span className="hidden xs:inline">VERIFIED</span>
            </div>
          </div>

          {/* 2. Viewfinder Portrait Photo Area */}
          <div
            onClick={() =>
              member.photo &&
              onOpenLightbox &&
              onOpenLightbox(member.photo, `${member.role} - ${member.name}`)
            }
            className={`${isSolo ? "h-52" : "h-36 sm:h-52"} w-full shrink-0 relative bg-[#131620] overflow-hidden flex items-center justify-center select-none ${
              member.photo ? "cursor-pointer group/photo" : ""
            }`}
          >
            {member.photo ? (
              <>
                <img
                  src={member.photo}
                  alt={member.name}
                  className="w-full h-full object-cover object-top group-hover/card:scale-106 transition-transform duration-500 ease-out"
                />
                {/* Tactical Viewfinder Corner Reticles */}
                <div className="absolute top-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 border-t-2 border-l-2 border-white/40 pointer-events-none" />
                <div className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 border-t-2 border-r-2 border-white/40 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 border-b-2 border-l-2 border-white/40 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 border-b-2 border-r-2 border-white/40 pointer-events-none" />

                {/* Seamless Dark Bottom Fade */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D14] via-[#0B0D14]/50 via-35% to-transparent pointer-events-none" />

                {/* Watermark Dossier Strip on bottom-left of photo */}
                <div className="absolute bottom-1.5 left-2 z-10 font-mono text-[7px] sm:text-[8px] tracking-widest text-slate-400/80 font-bold uppercase pointer-events-none">
                  SECTOR: SANDY SHORES
                </div>

                {/* Zoom Hover Pill */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-white/90 font-mono text-[8.5px] sm:text-[9px] font-bold opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center gap-1 shadow-md">
                  <ZoomIn
                    size={10}
                    className={isKetua ? "text-[#EF4444]" : "text-[#FACC15]"}
                  />
                  <span>INSPECT</span>
                </div>
              </>
            ) : (
              /* Executive Monogram Avatar for No Photo */
              <div className="w-full h-full p-3 sm:p-4 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-[#1C202C] to-[#0B0D14]">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-black/60 border-2 border-white/15 flex items-center justify-center text-xl sm:text-2xl font-heading font-black text-[#FACC15] shadow-inner mb-1.5">
                  {(() => {
                    const clean = (member.name || "")
                      .trim()
                      .replace(/^(BAPAK|IBU|MR\.|MR|DE)\s+/i, "");
                    const words = clean.split(/\s+/).filter(Boolean);
                    if (words.length >= 2)
                      return (words[0][0] + words[1][0]).toUpperCase();
                    return (clean.slice(0, 2) || "PS").toUpperCase();
                  })()}
                </div>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  DOSSIER // PPS
                </span>
              </div>
            )}
          </div>

          {/* 3. Dossier Info Content Area */}
          <div className="p-2.5 sm:p-3.5 pt-1.5 bg-[#0B0D14] flex flex-col justify-between flex-1 relative z-10">
            <div className={`${isSolo ? "min-h-[56px]" : "min-h-[46px] sm:min-h-[56px]"} flex flex-col justify-center`}>
              {/* Personel Name */}
              <h3 className={`font-heading font-black text-white uppercase tracking-tight leading-snug line-clamp-1 group-hover/card:text-[#FACC15] transition-colors ${isSolo ? "text-[15px] sm:text-base" : "text-xs sm:text-base"}`}>
                {member.name}
              </h3>
              {/* Operative Mandate Description with Left Accent Bar */}
              <div
                className={`mt-1 sm:mt-1.5 pl-1.5 sm:pl-2 border-l-2 ${
                  isKetua ? "border-[#DC2626]" : "border-[#FACC15]/60"
                }`}
              >
                <p className={`text-slate-300 font-medium leading-tight line-clamp-2 ${isSolo ? "text-[11px] sm:text-[10.5px]" : "text-[9px] sm:text-[10.5px]"}`}>
                  {roleDesc}
                </p>
              </div>
            </div>

            {/* 4. Bottom Footer Area: Button if has staff, matching space if no staff on desktop */}
            {hasSubMembers ? (
              <div className="w-full mt-2 sm:mt-3 h-7 sm:h-[34px] shrink-0">
                <button
                  type="button"
                  onClick={() => toggleTeam(member.name)}
                  className={`w-full h-full px-2 sm:px-3 rounded-lg border font-mono font-black text-[9px] sm:text-[10.5px] flex items-center justify-between cursor-pointer transition-all duration-200 select-none active:scale-98 uppercase tracking-wider ${
                    isExpanded
                      ? isKetua
                        ? "bg-[#DC2626] text-white border-white/20"
                        : "bg-[#FACC15] text-[#111827] border-black"
                      : "bg-white/5 hover:bg-[#FACC15] hover:text-[#111827] hover:border-black text-slate-200 border-white/15"
                  }`}
                  title={`Lihat anggota tim di bawah ${member.role}`}
                >
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <Users
                      size={11}
                      className={
                        isExpanded
                          ? isKetua
                            ? "text-white"
                            : "text-[#111827]"
                          : isKetua
                          ? "text-red-400"
                          : "text-[#FACC15]"
                      }
                    />
                    <span className="truncate">
                      <span className="hidden sm:inline">ANGGOTA </span>TIM ({subMembers.length})
                    </span>
                  </div>
                  <div className="flex items-center shrink-0">
                    <ChevronDown
                      size={11}
                      className={`md:hidden transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                    <ChevronRight
                      size={13}
                      className={`hidden md:block transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>
              </div>
            ) : (
              <div className="hidden md:block w-full mt-3 h-[34px] shrink-0" />
            )}
          </div>
        </div>

        {/* Right Section (Horizontal Drawer on Desktop, Downward on Mobile) */}
        {hasSubMembers && (
          <div
            className={`transition-all duration-500 ease-out overflow-hidden flex flex-col bg-[#07080D] ${
              isExpanded
                ? "w-full md:w-[240px] max-h-[500px] md:max-h-none opacity-100 p-3 border-t md:border-t-0 md:border-l border-white/10"
                : "w-0 max-h-0 md:max-h-none opacity-0 p-0 border-0 pointer-events-none"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-white/10 shrink-0">
              <span className="text-[9.5px] font-mono font-black uppercase text-slate-300 tracking-wider">
                // DAFTAR ANGGOTA //
              </span>
              <span className="text-[10px] font-mono font-bold text-[#FACC15] px-1.5 py-0.5 rounded bg-[#FACC15]/10 border border-[#FACC15]/20">
                {subMembers.length} ANGGOTA
              </span>
            </div>

            {/* Subordinate Staff Vertical List (Scrollable on desktop) */}
            <div className="space-y-1.5 overflow-y-auto max-h-[260px] md:max-h-[295px] pr-1 custom-scrollbar flex-1">
              {subMembers.map((sub, sIdx) => (
                <div
                  key={sIdx}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 shadow-sm flex items-center gap-2 group/subitem hover:bg-white/10 transition-colors"
                >
                  {/* Staff Thumbnail Photo */}
                  <div
                    onClick={() =>
                      sub.photo &&
                      onOpenLightbox &&
                      onOpenLightbox(sub.photo, `${sub.role} - ${sub.name}`)
                    }
                    className={`w-10 h-10 rounded bg-[#171A24] relative overflow-hidden flex items-center justify-center select-none border border-white/15 shrink-0 ${
                      sub.photo ? "cursor-pointer" : ""
                    }`}
                  >
                    {sub.photo ? (
                      <>
                        <img
                          src={sub.photo}
                          alt={sub.name}
                          className="w-full h-full object-cover object-top group-hover/subitem:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/subitem:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ZoomIn size={11} />
                        </div>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono font-black text-[#FACC15]">
                        {(() => {
                          const clean = (sub.name || "")
                            .trim()
                            .replace(/^(BAPAK|IBU|MR\.|MR|DE)\s+/i, "");
                          const words = clean.split(/\s+/).filter(Boolean);
                          if (words.length >= 2)
                            return (words[0][0] + words[1][0]).toUpperCase();
                          return (clean.slice(0, 2) || "ST").toUpperCase();
                        })()}
                      </span>
                    )}
                  </div>

                  {/* Staff Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-black text-xs text-white truncate group-hover/subitem:text-[#FACC15] transition-colors">
                      {sub.name}
                    </div>
                    <div className="text-[9.5px] font-mono font-bold text-[#FACC15] truncate mt-0.5">
                      {sub.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dossier footer badge */}
            <div className="mt-2 pt-2 border-t border-white/5 text-[8.5px] font-mono text-slate-500 uppercase tracking-widest text-center shrink-0">
              PPS UNIT ACTIVE
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full pb-16 pt-2 animate-in fade-in duration-200">
      {/* 1. Header Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b-2 border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 hover:text-[#DC2626] dark:hover:text-[#FACC15] transition-colors cursor-pointer"
          >
            <Home size={14} className="text-[#DC2626] dark:text-[#FACC15]" />
            <span>Beranda</span>
          </button>
          <ChevronRight size={13} className="text-slate-400 shrink-0" />
          <span className="text-slate-900 dark:text-slate-300 font-black">
            Bagan Struktur Organisasi
          </span>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="btn btn-secondary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Beranda</span>
        </button>
      </div>

      {/* 2. Hero Banner Most Wanted & Syndicate Dossier (Dimensi & Format Identik Dokumentasi) */}
      <div className="p-6 sm:p-8 md:p-10 mb-8 bg-[#090A10] border border-black/10 dark:border-white/15 shadow-md dark:shadow-[0_15px_45px_rgba(0,0,0,0.8)] rounded-2xl relative overflow-hidden min-h-[310px] flex items-center">
        {/* Most Wanted Syndicate Board Background / Lineup of Real Structure Photos */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[60%] lg:w-[64%] xl:w-[67%] flex items-center justify-end pr-2 sm:pr-6 pointer-events-auto overflow-hidden select-none">
          {/* Connecting Red Crime Investigation Thread */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-2 border-t-2 border-dashed border-red-500/35 -rotate-2 pointer-events-none z-0" />

          {/* Stamped Watermark in Background */}
          <div className="absolute top-2 right-4 text-[70px] sm:text-[95px] font-mono font-black text-white/[0.03] uppercase tracking-tighter pointer-events-none select-none">
            WANTED
          </div>

          {/* Overlapping Polaroid Mugshots Lineup: ALL MEMBERS (Dimmed atmospheric background, bright on hover/touch) */}
          <div className="flex items-center -space-x-8 sm:-space-x-9 md:-space-x-10 lg:-space-x-11 relative z-10 py-4 overflow-x-visible">
            {mostWantedLineup.map((fig, idx) => (
              <div
                key={idx}
                className={`transition-all duration-300 opacity-45 sm:opacity-55 hover:opacity-100 hover:scale-115 hover:z-40 hover:rotate-0 filter brightness-85 hover:brightness-100 contrast-125 cursor-default ${fig.tilt} ${fig.zIndex} ${fig.scale} group/polaroid shrink-0 pointer-events-auto select-none`}
                title={`${fig.role}: ${fig.name}`}
              >
                {/* Yellow/Amber Tape at top */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-amber-300/70 dark:bg-amber-400/50 backdrop-blur border border-amber-200/60 -rotate-3 z-30 shadow-sm" />

                {/* Polaroid Frame */}
                <div className="w-24 sm:w-26 md:w-28 p-1.5 pb-2.5 rounded-lg bg-[#141722] border-2 border-white/20 shadow-[4px_4px_0px_#000000] flex flex-col items-center relative">
                  {/* Photo area with viewfinder corners */}
                  <div className="w-full h-22 sm:h-26 rounded bg-[#0A0C12] overflow-hidden relative border border-white/10 flex items-center justify-center">
                    {fig.photo ? (
                      <img
                        src={fig.photo}
                        alt={fig.name}
                        className="w-full h-full object-cover object-top grayscale contrast-125 group-hover/polaroid:grayscale-0 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1C202C] to-[#0A0C12] text-amber-400 font-mono font-black text-lg">
                        {(() => {
                          const clean = (fig.name || "")
                            .trim()
                            .replace(/^(BAPAK|IBU|MR\.|MR|DE)\s+/i, "");
                          const words = clean.split(/\s+/).filter(Boolean);
                          if (words.length >= 2)
                            return (words[0][0] + words[1][0]).toUpperCase();
                          return (clean.slice(0, 2) || "PS").toUpperCase();
                        })()}
                      </div>
                    )}

                    {/* Stamped Red/Gold Tag on Photo */}
                    <span className="absolute bottom-1 right-1 bg-red-600/90 text-white font-mono text-[7px] font-black px-1 py-0.2 rounded tracking-widest uppercase shadow">
                      {fig.rank === 1 ? "PRIORITY #1" : "DOSSIER"}
                    </span>

                    {/* Corner Reticles */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-white/40 pointer-events-none" />
                    <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-white/40 pointer-events-none" />
                  </div>

                  {/* Polaroid Bottom Label (Typewriter / Dossier font) */}
                  <div className="w-full mt-1.5 px-0.5 text-center">
                    <div className="font-heading font-black text-[8.5px] sm:text-[9.5px] text-white truncate leading-tight">
                      {fig.name}
                    </div>
                    <div className="text-[7px] sm:text-[7.5px] font-mono font-bold text-[#FACC15] truncate tracking-wider uppercase">
                      {fig.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Deep and wide dark gradient mask on the left so text stays 100% crystal clear */}
          <div className="absolute inset-y-0 left-0 w-48 sm:w-64 md:w-80 bg-gradient-to-r from-[#090A10] via-[#090A10]/95 to-transparent pointer-events-none z-20" />
        </div>

        {/* Foreground Content Area (100% Readable, Ample Breathing Room) */}
        <div className="relative z-30 max-w-md sm:max-w-lg lg:max-w-xl w-full pointer-events-auto">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-[#FACC15] text-[#07080E] border border-yellow-400/80 shadow-md text-[11px] font-mono font-black uppercase">
            <Building2 size={13} />
            <span>BAGAN STRUKTUR HIERARKI RESMI LSM PPS</span>
          </div>

          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white uppercase tracking-tight leading-tight mb-2 drop-shadow-md">
            Bagan Struktur Kepengurusan
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium mb-5 max-w-sm sm:max-w-md">
            Diagram alur kepemimpinan resmi, badan pengurus harian, koordinator divisi, dan satgas lapangan LSM Paguyuban Pizza Sandy Shores.
          </p>

          {/* Quick Stat Chips (Format Presisi & Selaras dengan Dokumentasi) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm hover:border-[#FACC15]/40 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Status Operasional
              </div>
              <div className="font-heading font-black text-sm sm:text-base text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>TERVERIFIKASI</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm hover:border-white/30 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Total Personel
              </div>
              <div className="font-heading font-black text-lg sm:text-xl text-[#FACC15]">
                {totalPeopleCount}+ Anggota
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm hover:border-[#FACC15]/40 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Wilayah Komando
              </div>
              <div className="font-heading font-black text-xs sm:text-sm text-slate-200 truncate mt-0.5" title="Sandy Shores & Blaine County">
                Sandy Shores
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BAGAN STRUKTUR POHON (LUAS, TERBUKA, PAS 100% DI LAYAR) */}
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center py-4">
        {/* ============================================================== */}
        {/* TIER 1: KETUA UMUM */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center w-full mb-10">
          <div className="badge-brutal badge-red mb-4 flex items-center gap-2 py-1.5 px-4 font-black">
            <Crown size={14} />
            <span className="font-heading font-black tracking-wide">
              {activeTierTitles.tier1}
            </span>
          </div>
          {renderTreeNode(treeTiers.ketua, "ketua", true)}
        </div>

        {/* ============================================================== */}
        {/* TIER 2: MAJELIS PERTIMBANGAN ORGANISASI (MPO) */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center w-full mb-10 sm:mb-12">
          <div className="badge-brutal badge-yellow mb-4 flex items-center gap-1.5 py-1.5 px-4 font-black">
            <Shield size={13} />
            <span className="font-heading font-black">
              {activeTierTitles.tier2Left}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-6 w-full max-w-5xl items-start px-1 sm:px-0">
            {treeTiers.penasihat.map((m, idx) => (
              <React.Fragment key={idx}>
                {renderTreeNode(m, "normal", treeTiers.penasihat.length === 1)}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TIER 3: WAKIL KETUA UMUM & KOMANDO LAPANGAN */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center w-full mb-10 sm:mb-12">
          <div className="badge-brutal badge-red mb-4 flex items-center gap-1.5 py-1.5 px-4 font-black">
            <Zap size={13} />
            <span className="font-heading font-black">
              {activeTierTitles.tier2Right}
            </span>
          </div>
          {/* 2 Wakil Ketua side by side */}
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-6 w-full max-w-5xl items-start px-1 sm:px-0">
            {treeTiers.wakil.map((m, idx) => (
              <React.Fragment key={idx}>
                {renderTreeNode(m, "normal", false)}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TIER 4: BADAN PENGURUS HARIAN (BPH) */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center w-full mb-10 sm:mb-12">
          <div className="badge-brutal badge-yellow mb-6 flex items-center gap-2 py-1.5 px-5 font-black">
            <Briefcase size={14} />
            <span className="font-heading font-black tracking-wide">
              {activeTierTitles.tier3}
            </span>
          </div>

          {/* BPH Cards 2-col on mobile, full flex-wrap on desktop */}
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-6 w-full max-w-7xl items-start px-1 sm:px-0">
            {treeTiers.bphMembers.map((dept, idx) => (
              <React.Fragment key={idx}>
                {renderTreeNode(dept, "normal", false)}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TIER 5: SATGAS LAPANGAN & KOORDINATOR WILAYAH */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center w-full mb-6">
          <div className="badge-brutal badge-red mb-6 flex items-center gap-2 py-1.5 px-5 font-black">
            <Compass size={14} />
            <span className="font-heading font-black tracking-wide">
              {activeTierTitles.tier4}
            </span>
          </div>

          {/* Satgas Cards 2-col on mobile, full flex-wrap on desktop */}
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-8 w-full max-w-5xl items-start px-1 sm:px-0">
            {treeTiers.satgasMembers.map((dept, idx) => (
              <React.Fragment key={idx}>
                {renderTreeNode(dept, "normal", false)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}