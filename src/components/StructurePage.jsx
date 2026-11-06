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
  Sparkles,
  Home,
  CheckCircle2,
  Layers,
  Building2,
  FolderGit2,
} from "lucide-react";

// Default team members mapping if not yet customized in cloud data
const DEFAULT_SUB_MEMBERS = {
  "EVAN S KENNEDY": [
    { name: "Staff Khusus Pimpinan", role: "Ajudan & Asisten Operasional", photo: "" },
  ],
  "MR.B": [
    { name: "Anggota Kehormatan", role: "Staf Ahli Kebijakan Komunitas", photo: "" },
  ],
  "MANG KUMIS": [
    { name: "Satgas Lapangan 1", role: "Pengawas Lapangan Pesisir", photo: "" },
  ],
  "DE BRACUK": [
    { name: "Satgas Lapangan 2", role: "Pengawas Hubungan Antar-Warga", photo: "" },
  ],
  "VINO": [
    { name: "Rendi Pratama", role: "Staf Administrasi & Notulensi", photo: "" },
    { name: "Deni Sanjaya", role: "Staf Pengarsipan Surat & Berkas", photo: "" },
  ],
  "ANNELIESE & DARREN": [
    { name: "Clara Wijaya", role: "Staf Pembukuan Kas Harian", photo: "" },
    { name: "Toni Kusuma", role: "Staf Rekap Iuran & Audit Anggota", photo: "" },
  ],
  "GIBBON": [
    { name: "Fajar Nugraha", role: "Staf Publikasi & Media Warga", photo: "" },
    { name: "Bayu Saputra", role: "Staf Komunikasi Eksternal & Warga", photo: "" },
  ],
  "WAZA": [
    { name: "Rian Hidayat", role: "Staf Gudang & Inventaris", photo: "" },
    { name: "Joko Prabowo", role: "Staf Distribusi Stand & Tenda UMKM", photo: "" },
    { name: "Budi Santoso", role: "Staf Pengadaan Perlengkapan Kegiatan", photo: "" },
  ],
  "BENTO": [
    { name: "Agus Perkasa", role: "Satgas Pengamanan Lapak 01", photo: "" },
    { name: "Hendro Wibowo", role: "Satgas Patroli Wilayah 02", photo: "" },
    { name: "Yudi Santosa", role: "Satgas Penertiban Koordinat 1012", photo: "" },
  ],
  "KRAI ANDORYU & RIZMAN": [
    { name: "Dimas Anggara", role: "Kreator Konten & Dokumentasi Visual", photo: "" },
    { name: "Aldi Setiawan", role: "Operator Siaran & Desain Media", photo: "" },
  ],
  "MULA IDARI": [
    { name: "Sandi Kurnia", role: "Koordinator Lapangan Sektor Pesisir", photo: "" },
    { name: "Eko Wahyudi", role: "Petugas Penghubung Tokoh Warga", photo: "" },
  ],
};

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

  // Get subordinate members for an individual leader
  function getSubMembers(member) {
    if (Array.isArray(member.subMembers) && member.subMembers.length > 0) {
      return member.subMembers;
    }
    if (Array.isArray(member.team) && member.team.length > 0) {
      return member.team.map((t) =>
        typeof t === "string" ? { name: t, role: `Anggota Tim ${member.role}` } : t
      );
    }
    // Fallback to default realistic roster
    return DEFAULT_SUB_MEMBERS[member.name] || [];
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
          badgeStyle: "bg-[#DC2626] text-white dark:bg-[#FACC15] dark:text-[#111827]",
          iconColor: "text-[#FACC15] dark:text-[#DC2626]",
          desc: "Penanggung jawab utama seluruh pergerakan dan kebijakan lembaga.",
        };
      case 2:
        return {
          title: "Dewan Penasihat & Pembina",
          icon: Shield,
          badgeStyle: "bg-[#FACC15] text-[#111827] dark:bg-[#DC2626] dark:text-white",
          iconColor: "text-[#DC2626] dark:text-[#FACC15]",
          desc: "Memberikan arahan strategis, integritas etika, dan pengawasan internal.",
        };
      case 3:
        return {
          title: "Wakil Ketua Umum Penggerak",
          icon: Zap,
          badgeStyle: "bg-[#DC2626] text-white dark:bg-[#FACC15] dark:text-[#111827]",
          iconColor: "text-[#FACC15] dark:text-[#DC2626]",
          desc: "Mengawal operasional lapangan, kemitraan warga, dan aksi lapangan.",
        };
      case 4:
        return {
          title: "Badan Pengurus Harian (BPH) & Kepala Divisi",
          icon: Briefcase,
          badgeStyle: "bg-[#FACC15] text-[#111827] dark:bg-[#DC2626] dark:text-white",
          iconColor: "text-[#DC2626] dark:text-[#FACC15]",
          desc: "Pengelola administrasi, keuangan, logistik perlengkapan, dan hubungan masyarakat.",
        };
      case 5:
        return {
          title: "Koordinator Wilayah & Pengamanan Lapangan (Korda)",
          icon: Compass,
          badgeStyle: "bg-[#DC2626] text-white dark:bg-[#FACC15] dark:text-[#111827]",
          iconColor: "text-[#FACC15] dark:text-[#DC2626]",
          desc: "Ujung tombak koordinasi wilayah Sandy Shores, satgas keamanan lapak, dan media.",
        };
      default:
        return {
          title: `Tingkat ${lvl}`,
          icon: Users,
          badgeStyle: "bg-[#FACC15] text-[#111827]",
          iconColor: "text-[#DC2626]",
          desc: "",
        };
    }
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

      {/* 2. Page Hero Banner (Neo-Brutalist Kop Banner) */}
      <div className="card-brutal p-6 sm:p-8 md:p-10 mb-8 bg-[var(--card-bg)] border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-md bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] text-[11px] font-mono font-black uppercase">
              <Building2 size={13} />
              <span>BAGAN KEPENGURUSAN RESMI LSM PPS</span>
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-slate-950 dark:text-slate-100 uppercase tracking-tight leading-tight">
              Susunan Pengurus, BPH &amp; Koordinator Wilayah
            </h1>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium mt-3">
              Hierarki kepengurusan resmi LSM Paguyuban Pizza Sandy Shores periode 2026 - 2027.
              Dilengkapi pembagian divisi, kepala seksi, dan tim staf operasional di lapangan.
            </p>
          </div>

          {/* Quick Metrics Badge Container */}
          <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] min-w-[150px]">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                TOTAL KADER &amp; PENGURUS
              </div>
              <div className="font-heading font-black text-2xl sm:text-3xl text-[#DC2626] dark:text-[#FACC15]">
                {totalPeopleCount}+ Personel
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                {org.length} Pimpinan &amp; Divisi
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] min-w-[150px]">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                STATUS SK PENGURUS
              </div>
              <div className="font-heading font-black text-base sm:text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={18} />
                <span>SAH BERLAKU</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                Koor. 1012 Sandy Shores
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
            { id: "all", label: "Semua Tingkat" },
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
              placeholder="Cari nama / posisi / divisi..."
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
          <div className="w-14 h-14 rounded-xl bg-[#FACC15] text-[#111827] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mb-4">
            <User size={28} />
          </div>
          <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-200 mb-1.5">
            Data Pengurus Tidak Ditemukan
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-400">
            Tidak ada pengurus yang cocok dengan kata kunci "{searchQuery}".
          </p>
        </div>
      ) : (
        /* 5. Hierarchical Levels with Animated Shifting Cards */
        <div className="space-y-12">
          {sortedLevels.map((lvl) => {
            const members = levelsObj[lvl];
            const meta = getLevelMeta(lvl);
            const Icon = meta.icon;

            return (
              <div key={lvl} className="flex flex-col gap-5">
                {/* Level Title Bar with Description */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-black/15 dark:border-white/15">
                  <div className="flex items-center gap-3">
                    <div
                      className={`badge-brutal text-xs sm:text-sm uppercase ${meta.badgeStyle} border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 py-1.5 px-3.5`}
                    >
                      <Icon size={16} className={meta.iconColor} />
                      <span className="font-heading font-black tracking-wide">
                        {meta.title}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      ({members.length} Kepala / Koordinator)
                    </span>
                  </div>
                  {meta.desc && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">
                      {meta.desc}
                    </span>
                  )}
                </div>

                {/* Cards Grid: CSS Grid with fluid reflow and smooth transitions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
                  {members.map((member, mIdx) => {
                    const subMembers = getSubMembers(member);
                    const hasSubMembers = subMembers.length > 0;
                    const isExpanded = expandedTeams.has(member.name);

                    return (
                      <div
                        key={mIdx}
                        className={`card-brutal bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col overflow-hidden transition-all duration-300 ease-out hover:shadow-[6px_6px_0px_#000000] ${
                          isExpanded
                            ? "ring-2 ring-[#DC2626] dark:ring-[#FACC15] -translate-y-1"
                            : ""
                        }`}
                      >
                        {/* Photo Area (with zoom) */}
                        <div
                          onClick={() =>
                            member.photo &&
                            onOpenLightbox &&
                            onOpenLightbox(member.photo, `${member.role} - ${member.name}`)
                          }
                          className={`h-48 sm:h-52 w-full relative bg-[#FFFDF9] dark:bg-[#1A1D26] border-b-2 border-[#1A1A1A] dark:border-[#475569] overflow-hidden flex items-center justify-center select-none ${
                            member.photo ? "cursor-pointer group" : ""
                          }`}
                        >
                          {member.photo ? (
                            <>
                              <img
                                src={member.photo}
                                alt={member.name}
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-[#DC2626] text-white border border-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-heading font-black text-[10px]">
                                <ZoomIn size={11} />
                                <span>Zoom</span>
                              </div>
                            </>
                          ) : (
                            /* Dossier Placeholder */
                            <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-transparent to-red-500/10">
                              <div className="w-16 h-16 rounded-2xl bg-[#FACC15] dark:bg-[#222634] border-2 border-black dark:border-[#475569] flex items-center justify-center text-xl font-heading font-black text-[#111827] dark:text-[#FACC15] shadow-[3px_3px_0px_#000]">
                                {(() => {
                                  const clean = (member.name || "")
                                    .trim()
                                    .replace(/^(BAPAK|IBU|MR\.|MR|DE)\s+/i, "");
                                  const words = clean.split(/\s+/).filter(Boolean);
                                  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
                                  return (clean.slice(0, 2) || "PS").toUpperCase();
                                })()}
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-500 mt-2 uppercase tracking-wider">
                                FOTO RESMI VERIFIKASI
                              </span>
                            </div>
                          )}

                          {/* Level Badge Pill at top right */}
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] font-black tracking-wider">
                            LVL {member.level}
                          </div>
                        </div>

                        {/* Leader Info */}
                        <div className="p-4 sm:p-4.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] font-mono font-bold uppercase text-[#DC2626] dark:text-[#FACC15] mb-1 tracking-wider truncate">
                              {member.role}
                            </div>
                            <h3 className="font-heading font-black text-base sm:text-lg text-slate-950 dark:text-slate-100 leading-tight mb-2">
                              {member.name}
                            </h3>
                          </div>

                          {/* Team Members Toggle Button (if division has subordinate team) */}
                          {hasSubMembers && (
                            <button
                              type="button"
                              onClick={() => toggleTeam(member.name)}
                              className={`mt-2 w-full py-2 px-3 rounded-xl border-2 border-black flex items-center justify-between text-xs font-black transition-all cursor-pointer select-none ${
                                isExpanded
                                  ? "bg-[#DC2626] text-white shadow-[2px_2px_0px_#000]"
                                  : "bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] shadow-[2px_2px_0px_#000]"
                              }`}
                              title={`Klik untuk melihat anggota tim di bawah ${member.role}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Users size={14} />
                                <span>{subMembers.length} Anggota Tim</span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                          )}
                        </div>

                        {/* 6. Expandable Subordinate Team Tray (Smooth Grid Row Expansion) */}
                        {hasSubMembers && (
                          <div
                            className={`transition-all duration-300 ease-in-out border-t-2 border-black/10 dark:border-white/10 ${
                              isExpanded
                                ? "max-h-[600px] opacity-100 bg-[#FFFDF9] dark:bg-[#151821] p-3.5"
                                : "max-h-0 opacity-0 p-0 overflow-hidden"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-2.5 pb-1 border-b border-black/10 dark:border-white/10">
                              <span className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-wider">
                                ANGGOTA TIM DIVISI:
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {subMembers.length} PERSONEL
                              </span>
                            </div>

                            <div className="space-y-2">
                              {subMembers.map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-2.5 rounded-lg bg-white dark:bg-[#1E222D] border border-black/15 dark:border-white/10 shadow-sm flex items-center gap-2.5 hover:border-[#DC2626] dark:hover:border-[#FACC15] transition-colors"
                                >
                                  {/* Sub member avatar initial */}
                                  <div className="w-8 h-8 rounded-lg bg-[#FACC15]/30 dark:bg-[#FACC15]/20 border border-black/30 dark:border-white/20 flex items-center justify-center text-xs font-black font-mono shrink-0 text-[#111827] dark:text-[#FACC15]">
                                    {sub.name.slice(0, 2).toUpperCase()}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="font-heading font-black text-xs text-slate-950 dark:text-slate-100 truncate">
                                      {sub.name}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                      {sub.role}
                                    </div>
                                  </div>
                                </div>
                              ))}
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
