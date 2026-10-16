import React, { useState, useMemo } from "react";
import { Users, ZoomIn, Search, Crown, Shield, Zap, Briefcase, Compass, User } from "lucide-react";

export default function OrgStructure({ org = [], onOpenLightbox }) {
  const [filterLevel, setFilterLevel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered members based on tab and search
  const filteredMembers = useMemo(() => {
    return org.filter((member) => {
      const matchSearch =
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase());

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
          title: "Pimpinan Organisasi",
          icon: Crown,
          badgeStyle: "bg-[#DC2626] text-white dark:bg-[#FACC15] dark:text-[#111827]",
          iconColor: "text-[#FACC15] dark:text-[#DC2626]",
        };
      case 2:
        return {
          title: "Dewan Penasihat",
          icon: Shield,
          badgeStyle: "bg-[#FACC15] text-[#111827] dark:bg-[#DC2626] dark:text-white",
          iconColor: "text-[#DC2626] dark:text-[#FACC15]",
        };
      case 3:
        return {
          title: "Wakil Ketua Umum Penggerak",
          icon: Zap,
          badgeStyle: "bg-[#DC2626] text-white dark:bg-[#FACC15] dark:text-[#111827]",
          iconColor: "text-[#FACC15] dark:text-[#DC2626]",
        };
      case 4:
        return {
          title: "Badan Pengurus Harian (BPH)",
          icon: Briefcase,
          badgeStyle: "bg-[#FACC15] text-[#111827] dark:bg-[#DC2626] dark:text-white",
          iconColor: "text-[#DC2626] dark:text-[#FACC15]",
        };
      case 5:
        return {
          title: "Koordinator Wilayah & Lapangan",
          icon: Compass,
          badgeStyle: "bg-[#DC2626] text-white dark:bg-[#FACC15] dark:text-[#111827]",
          iconColor: "text-[#FACC15] dark:text-[#DC2626]",
        };
      default:
        return {
          title: `Tingkat ${lvl}`,
          icon: Users,
          badgeStyle: "bg-[#FACC15] text-[#111827]",
          iconColor: "text-[#DC2626]",
        };
    }
  }

  return (
    <section id="structure" className="py-10 sm:py-14 w-full scroll-mt-24">
      {/* Title Bar (Centered) */}
      <div className="flex flex-col items-center text-center mb-8 pb-3 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569]">
        <div className="card-label text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 mb-1">
          STRUKTUR RESMI
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
            Dewan Pengurus & Korda
          </h2>
          <div className="badge-brutal bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]">
            {filteredMembers.length} PERSONEL
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="card-brutal p-4 sm:p-5 mb-8 bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Segmented Filter Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: "Semua Anggota" },
            { id: "leadership", label: "Pimpinan & Penasihat" },
            { id: "executives", label: "Penggerak & BPH" },
            { id: "coordinators", label: "Korda Wilayah" },
          ].map((tab) => {
            const isActive = filterLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterLevel(tab.id)}
                className={`tab-btn text-xs sm:text-sm border-2 border-black dark:border-[#475569] flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "active !bg-[#FACC15] !text-[#111827] !border-black font-black"
                    : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-100 hover:border-black font-bold"
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

        {/* Search Input */}
        <div className="relative min-w-[220px] md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama / posisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 ? (
        <div className="card-brutal p-12 text-center bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded bg-[#FACC15] text-[#111827] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mb-4">
            <User size={28} />
          </div>
          <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-100 mb-1.5">
            Data Pengurus Tidak Ditemukan
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Tidak ada pengurus yang cocok dengan kata kunci "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedLevels.map((lvl) => {
            const members = levelsObj[lvl];
            const meta = getLevelMeta(lvl);
            const Icon = meta.icon;

            return (
              <div key={lvl} className="flex flex-col gap-4">
                {/* Level Title Bar (Centered with balanced lines on left & right) */}
                <div className="flex items-center justify-center gap-3 w-full">
                  <div className="flex-1 h-[2px] bg-[#1A1A1A]/20 dark:bg-slate-700/60" />
                  <div className={`badge-brutal text-xs sm:text-sm uppercase ${meta.badgeStyle} border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 py-1.5 px-4`}>
                    <Icon size={16} className={meta.iconColor} />
                    <span className="font-heading font-black tracking-wide">{meta.title}</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-[#1A1A1A]/20 dark:bg-slate-700/60" />
                </div>

                {/* Cards (Centered Flex Wrap) */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
                  {members.map((member, mIdx) => (
                    <div
                      key={mIdx}
                      className="card-brutal overflow-hidden bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col group hover:translate-x-[2px] hover:translate-y-[2px] transition-transform w-[calc(50%-10px)] sm:w-[calc(33.333%-14px)] md:w-[calc(25%-16px)] lg:w-[calc(20%-16px)] min-w-[170px] max-w-[260px]"
                    >
                      {/* Photo Area (Tinggi disesuaikan dan posisi object-top agar wajah personel tampil jelas) */}
                      <div
                        onClick={() => member.photo && onOpenLightbox(member.photo, `${member.role} - ${member.name}`)}
                        className={`h-48 sm:h-56 w-full relative bg-[#FFFDF9] dark:bg-[#20232E] border-b-2 border-[#1A1A1A] dark:border-[#475569] overflow-hidden flex items-center justify-center ${
                          member.photo ? "cursor-pointer" : ""
                        }`}
                      >
                        {member.photo ? (
                          <>
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-full h-full object-cover object-top group-hover:scale-103 transition-transform duration-200"
                            />
                            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-[#DC2626] text-white border border-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-heading font-black text-[10px]">
                              <ZoomIn size={11} />
                              <span>Zoom</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-14 h-14 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-2xl font-heading font-black text-[#111827] shadow-[2px_2px_0px_#000]">
                            {member.name?.charAt(0) || "P"}
                          </div>
                        )}
                      </div>

                      {/* Info Area */}
                      <div className="p-3.5 text-center flex-1 flex flex-col justify-center bg-[var(--card-bg)]">
                        <span className="badge-brutal text-[10px] uppercase py-0.5 px-2 self-center mb-2 bg-[#FACC15] text-[#111827] border border-black shadow-sm font-black">
                          {member.role}
                        </span>
                        <h4 className="font-heading font-black text-xs sm:text-sm text-slate-950 dark:text-slate-100 uppercase tracking-tight line-clamp-2">
                          {member.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
