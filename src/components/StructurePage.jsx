import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Users,
  Crown,
  Shield,
  Zap,
  Briefcase,
  Compass,
  User,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  Home,
  CheckCircle2,
  Building2,
  Sparkles,
  Award,
  Layers,
  FileCheck2,
} from "lucide-react";
import { getSubMembers } from "../services/orgService";

export default function StructurePage({
  org = [],
  onOpenLightbox,
  onNavigateHome,
}) {
  const [filterLevel, setFilterLevel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Set of member names whose team drawer is open
  const [expandedTeams, setExpandedTeams] = useState(new Set(["WAZA"]));

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function toggleTeam(memberName) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(memberName)) {
        next.delete(memberName);
      } else {
        next.add(memberName);
      }
      return next;
    });
  }

  function expandAllTeams() {
    const allWithTeams = org
      .filter((m) => getSubMembers(m).length > 0)
      .map((m) => m.name);
    setExpandedTeams(new Set(allWithTeams));
  }

  function collapseAllTeams() {
    setExpandedTeams(new Set());
  }

  // Total team members count (leaders + subordinate staff)
  const totalPeopleCount = useMemo(() => {
    let count = org.length;
    org.forEach((m) => {
      count += getSubMembers(m).length;
    });
    return count;
  }, [org]);

  // Filtered members based on tab and search
  const filteredMembers = useMemo(() => {
    return org.filter((member) => {
      const subs = getSubMembers(member);
      const subNames = subs.map((s) => `${s.name} ${s.role}`).join(" ");

      const matchSearch =
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subNames.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterLevel === "all") return true;
      if (filterLevel === "leadership") return member.level === 1 || member.level === 2;
      if (filterLevel === "executives") return member.level === 3 || member.level === 4;
      if (filterLevel === "coordinators") return member.level === 5;
      return true;
    });
  }, [org, filterLevel, searchQuery]);

  // Group by level
  const levelsObj = useMemo(() => {
    const obj = {};
    filteredMembers.forEach((member) => {
      const lvl = member.level || 1;
      if (!obj[lvl]) obj[lvl] = [];
      obj[lvl].push(member);
    });
    return obj;
  }, [filteredMembers]);

  const sortedLevels = Object.keys(levelsObj).sort((a, b) => Number(a) - Number(b));

  function getLevelMeta(lvl) {
    switch (Number(lvl)) {
      case 1:
        return {
          title: "Pimpinan Tertinggi Organisasi",
          icon: Crown,
          headerColor: "bg-[#DC2626] text-white",
          tagColor: "border-[#DC2626] text-[#DC2626] dark:text-[#FACC15]",
          desc: "Penanggung jawab utama seluruh komando, arah pergerakan, dan kebijakan lembaga.",
        };
      case 2:
        return {
          title: "Dewan Penasihat & Pembina",
          icon: Shield,
          headerColor: "bg-[#FACC15] text-[#111827]",
          tagColor: "border-amber-500 text-amber-900 dark:text-amber-300",
          desc: "Memberikan arahan strategis, integritas etika kemasyarakatan, dan pengawasan internal.",
        };
      case 3:
        return {
          title: "Wakil Ketua Umum Penggerak",
          icon: Zap,
          headerColor: "bg-[#DC2626] text-white",
          tagColor: "border-[#DC2626] text-[#DC2626] dark:text-[#FACC15]",
          desc: "Mengawal operasional taktis, kemitraan warga pesisir, dan mobilisasi aksi.",
        };
      case 4:
        return {
          title: "Badan Pengurus Harian (BPH) & Kepala Divisi",
          icon: Briefcase,
          headerColor: "bg-[#FACC15] text-[#111827]",
          tagColor: "border-amber-500 text-amber-900 dark:text-amber-300",
          desc: "Pengelola administrasi, kas keuangan, logistik stand usaha, dan hubungan kemasyarakatan.",
        };
      case 5:
        return {
          title: "Koordinator Wilayah & Satgas Lapangan (Korda)",
          icon: Compass,
          headerColor: "bg-[#DC2626] text-white",
          tagColor: "border-[#DC2626] text-[#DC2626] dark:text-[#FACC15]",
          desc: "Ujung tombak pengamanan wilayah Sandy Shores, satgas lapak pedagang, dan publikasi media.",
        };
      default:
        return {
          title: "Struktural Organisasi",
          icon: Users,
          headerColor: "bg-[#FACC15] text-[#111827]",
          tagColor: "border-black text-black dark:text-white",
          desc: "",
        };
    }
  }

  // Get departmental badge accent color
  function getDepartmentAccent(role = "") {
    const r = role.toLowerCase();
    if (r.includes("ketua umum")) return { bg: "bg-[#DC2626]", text: "text-white", border: "border-[#DC2626]" };
    if (r.includes("penasihat")) return { bg: "bg-[#FACC15]", text: "text-[#111827]", border: "border-[#FACC15]" };
    if (r.includes("wakil")) return { bg: "bg-[#DC2626]", text: "text-white", border: "border-[#DC2626]" };
    if (r.includes("logistik")) return { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-600" };
    if (r.includes("bendahara") || r.includes("keuangan")) return { bg: "bg-amber-500", text: "text-black", border: "border-amber-500" };
    if (r.includes("sekjen") || r.includes("sekretaris")) return { bg: "bg-blue-600", text: "text-white", border: "border-blue-600" };
    if (r.includes("humas")) return { bg: "bg-purple-600", text: "text-white", border: "border-purple-600" };
    if (r.includes("keamanan")) return { bg: "bg-slate-900", text: "text-white", border: "border-slate-800" };
    if (r.includes("media")) return { bg: "bg-cyan-600", text: "text-white", border: "border-cyan-600" };
    return { bg: "bg-[#FACC15]", text: "text-[#111827]", border: "border-black" };
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* 1. Header Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={onNavigateHome}
          className="btn bg-white dark:bg-[#1E222D] hover:bg-[#FACC15] hover:text-[#111827] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] px-4 py-2 text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Beranda</span>
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <Home size={13} />
            <span>Beranda</span>
          </button>
          <span>/</span>
          <span className="text-[#DC2626] dark:text-[#FACC15] font-black uppercase">
            Susunan Pengurus
          </span>
        </div>
      </div>

      {/* 2. Page Hero Banner (Executive Neo-Brutalist Kop) */}
      <div className="card-brutal p-6 sm:p-8 md:p-10 mb-8 bg-[var(--card-bg)] border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] text-[11px] font-mono font-black uppercase">
              <Building2 size={13} />
              <span>BAGAN RESMI LEMBAGA SWADAYA MASYARAKAT</span>
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-slate-950 dark:text-slate-100 uppercase tracking-tight leading-tight">
              Susunan Pengurus &amp; Kepala Divisi
            </h1>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium mt-3">
              Hierarki struktur kepengurusan resmi LSM Paguyuban Pizza Sandy Shores periode 2026 - 2027.
              Terdiri atas pimpinan utama, dewan penasihat, para kepala seksi divisi, serta jajaran staf lapangan binaan.
            </p>
          </div>

          {/* Quick Metrics Badge Container */}
          <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3.5px_3.5px_0px_#000] min-w-[160px]">
              <div className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400">
                TOTAL KADER &amp; STAF
              </div>
              <div className="font-heading font-black text-2xl sm:text-3xl text-[#DC2626] dark:text-[#FACC15] mt-0.5">
                {totalPeopleCount}+ Personel
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                {org.length} Jabatan Struktural
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3.5px_3.5px_0px_#000] min-w-[160px]">
              <div className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400">
                LEGALITAS KEPENGURUSAN
              </div>
              <div className="font-heading font-black text-base sm:text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={18} />
                <span>SK SAH AKTIF</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                Wilayah Sandy Shores 1012
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Control Bar: Filter Tabs & Search Bar */}
      <div className="card-brutal p-4 sm:p-5 mb-8 bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Segmented Filter Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          {[
            { id: "all", label: "Semua Tingkatan" },
            { id: "leadership", label: "Pimpinan & Penasihat" },
            { id: "executives", label: "BPH & Kepala Divisi" },
            { id: "coordinators", label: "Korda Wilayah" },
          ].map((tab) => {
            const isActive = filterLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterLevel(tab.id)}
                className={`tab-btn text-xs sm:text-sm border-2 border-black dark:border-[#475569] flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? "active !bg-[#FACC15] !text-[#111827] !border-black font-black shadow-[2px_2px_0px_#000]"
                    : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 hover:border-black font-bold"
                }`}
              >
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Expand/Collapse All Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari nama / posisi / divisi / staf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-200 dark:placeholder-slate-400 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
            />
          </div>

          <button
            type="button"
            onClick={expandedTeams.size > 0 ? collapseAllTeams : expandAllTeams}
            className="btn px-3 py-2 text-xs font-mono font-black border-2 border-black bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer"
            title="Buka / Tutup Seluruh Tim Divisi Sekaligus"
          >
            {expandedTeams.size > 0 ? "Tutup Semua" : "Buka Semua"}
          </button>
        </div>
      </div>

      {/* 4. Empty State */}
      {filteredMembers.length === 0 ? (
        <div className="card-brutal p-12 text-center bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FACC15] text-[#111827] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mb-4">
            <User size={28} />
          </div>
          <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-200 mb-1.5">
            Data Pengurus Tidak Ditemukan
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-400">
            Tidak ada pengurus atau staf yang cocok dengan kata kunci "{searchQuery}".
          </p>
        </div>
      ) : (
        /* 5. Hierarchical Section Groups */
        <div className="space-y-14">
          {sortedLevels.map((lvl) => {
            const members = levelsObj[lvl];
            const meta = getLevelMeta(lvl);
            const Icon = meta.icon;
            const isTopLeader = Number(lvl) === 1;

            return (
              <div key={lvl} className="flex flex-col gap-6">
                {/* Level Title Bar with Description */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-black/15 dark:border-white/15">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div
                      className={`badge-brutal text-xs sm:text-sm uppercase ${meta.headerColor} border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 py-1.5 px-4 rounded-xl`}
                    >
                      <Icon size={16} />
                      <span className="font-heading font-black tracking-wide">
                        {meta.title}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      ({members.length} {isTopLeader ? "Pemimpin Utama" : "Jabatan"})
                    </span>
                  </div>
                  {meta.desc && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">
                      {meta.desc}
                    </span>
                  )}
                </div>

                {/* Cards Grid: Elevated Modular Dossier Cards */}
                <div
                  className={`grid gap-6 items-start ${
                    isTopLeader
                      ? "grid-cols-1 max-w-xl mx-auto w-full"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
                  {members.map((member, mIdx) => {
                    const subMembers = getSubMembers(member);
                    const hasSubMembers = subMembers.length > 0;
                    const isExpanded = expandedTeams.has(member.name);
                    const deptAccent = getDepartmentAccent(member.role);

                    return (
                      <div
                        key={mIdx}
                        className={`card-brutal bg-[#FFFDF9] dark:bg-[#161922] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[5px_5px_0px_#000000] rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000000] ${
                          isExpanded
                            ? "ring-3 ring-[#FACC15] dark:ring-[#FACC15] shadow-[7px_7px_0px_#000000]"
                            : ""
                        }`}
                      >
                        {/* 1. Card Top Badge Bar (Division Identity Header) */}
                        <div className="px-4 py-2.5 bg-slate-900 text-white dark:bg-[#0D1017] border-b-2 border-black dark:border-[#333A4A] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full ${deptAccent.bg} border border-white/50 shrink-0`} />
                            <span className="font-heading font-black text-xs uppercase tracking-wider text-slate-200 truncate">
                              {member.role}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/20 shrink-0">
                            SK-PPS
                          </span>
                        </div>

                        {/* 2. Leader Portrait Presentation Area */}
                        <div className="p-5 flex flex-col items-center text-center relative">
                          {/* Photo Frame Container with Double-Ring Styling */}
                          <div
                            onClick={() =>
                              member.photo &&
                              onOpenLightbox &&
                              onOpenLightbox(member.photo, `${member.role} - ${member.name}`)
                            }
                            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white dark:bg-[#20232E] border-2 border-black dark:border-[#475569] shadow-[3.5px_3.5px_0px_#000000] overflow-hidden flex items-center justify-center relative select-none mb-3.5 group/avatar ${
                              member.photo ? "cursor-pointer" : ""
                            }`}
                          >
                            {member.photo ? (
                              <>
                                <img
                                  src={member.photo}
                                  alt={member.name}
                                  className="w-full h-full object-cover object-top group-hover/avatar:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <ZoomIn size={16} />
                                </div>
                              </>
                            ) : (
                              /* Official Dossier Monogram Avatar */
                              <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-gradient-to-b from-amber-400/20 via-transparent to-red-500/20">
                                <div className="text-2xl sm:text-3xl font-heading font-black text-[#111827] dark:text-[#FACC15] tracking-tight">
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
                                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-1">
                                  LSM PPS
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Member Name */}
                          <h3 className="font-heading font-black text-lg sm:text-xl text-slate-950 dark:text-slate-100 leading-snug tracking-tight mb-1">
                            {member.name}
                          </h3>

                          {/* Role Pill Badge */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#20232E] border-2 border-black/30 dark:border-white/20 text-xs font-mono font-black text-slate-800 dark:text-slate-200 shadow-sm mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{member.role}</span>
                          </div>
                        </div>

                        {/* 3. Team Member Section (If Department has Subordinate Team) */}
                        {hasSubMembers && (
                          <div className="px-4 pb-4">
                            {/* Toggle Button for Division Team */}
                            <button
                              type="button"
                              onClick={() => toggleTeam(member.name)}
                              className={`w-full py-2.5 px-3.5 rounded-xl border-2 border-black flex items-center justify-between text-xs font-black transition-all cursor-pointer select-none active:translate-x-0.5 active:translate-y-0.5 ${
                                isExpanded
                                  ? "bg-[#DC2626] text-white shadow-[2px_2px_0px_#000]"
                                  : "bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] shadow-[2.5px_2.5px_0px_#000]"
                              }`}
                              title={`Klik untuk melihat anggota tim di bawah ${member.role}`}
                            >
                              <div className="flex items-center gap-2">
                                <Users size={15} />
                                <span>{subMembers.length} Anggota Tim Binaan</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-mono">
                                <span>{isExpanded ? "Tutup" : "Buka"}</span>
                                {isExpanded ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </div>
                            </button>

                            {/* Animated Drawer for Team Members with Individual Profile Photos */}
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                isExpanded
                                  ? "max-h-[800px] opacity-100 mt-3.5 pt-3 border-t-2 border-dashed border-black/20 dark:border-white/20"
                                  : "max-h-0 opacity-0 mt-0 pt-0"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-2.5 px-1">
                                <span className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-wider">
                                  TIM STAF LAPANGAN:
                                </span>
                                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {subMembers.length} PERSONEL
                                </span>
                              </div>

                              {/* Stacked Roster Cards */}
                              <div className="space-y-2">
                                {subMembers.map((sub, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 rounded-xl bg-white dark:bg-[#1E222D] border-2 border-black/20 dark:border-white/10 shadow-[2px_2px_0px_#000] flex items-center gap-3 hover:border-[#DC2626] dark:hover:border-[#FACC15] transition-all"
                                  >
                                    {/* Sub-member Photo Frame */}
                                    <div
                                      onClick={() =>
                                        sub.photo &&
                                        onOpenLightbox &&
                                        onOpenLightbox(
                                          sub.photo,
                                          `${sub.role} - ${sub.name}`
                                        )
                                      }
                                      className={`w-11 h-11 rounded-lg bg-slate-100 dark:bg-[#252936] border-2 border-black/40 dark:border-white/20 overflow-hidden shrink-0 flex items-center justify-center relative select-none ${
                                        sub.photo
                                          ? "cursor-pointer group/subphoto shadow-sm"
                                          : ""
                                      }`}
                                    >
                                      {sub.photo ? (
                                        <>
                                          <img
                                            src={sub.photo}
                                            alt={sub.name}
                                            className="w-full h-full object-cover object-top group-hover/subphoto:scale-105 transition-transform"
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/subphoto:opacity-100 flex items-center justify-center text-white transition-opacity">
                                            <ZoomIn size={12} />
                                          </div>
                                        </>
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-400/20 via-transparent to-red-500/20 text-xs font-mono font-black text-[#111827] dark:text-[#FACC15]">
                                          {(() => {
                                            const clean = (sub.name || "")
                                              .trim()
                                              .replace(
                                                /^(BAPAK|IBU|MR\.|MR|DE)\s+/i,
                                                ""
                                              );
                                            const words = clean
                                              .split(/\s+/)
                                              .filter(Boolean);
                                            if (words.length >= 2)
                                              return (
                                                words[0][0] + words[1][0]
                                              ).toUpperCase();
                                            return (
                                              clean.slice(0, 2) || "ST"
                                            ).toUpperCase();
                                          })()}
                                        </div>
                                      )}
                                    </div>

                                    {/* Sub-member Info */}
                                    <div className="flex-1 min-w-0 pr-1">
                                      <div className="font-heading font-black text-xs text-slate-950 dark:text-slate-100 truncate">
                                        {sub.name}
                                      </div>
                                      <div className="text-[10px] font-mono font-bold text-[#DC2626] dark:text-[#FACC15] truncate mt-0.5">
                                        {sub.role}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
