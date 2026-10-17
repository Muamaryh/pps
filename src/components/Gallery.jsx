import React, { useState } from "react";
import { ZoomIn, Calendar, MapPin, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";

function GalleryCard({ item, onOpenLightbox }) {
  const [expanded, setExpanded] = useState(false);
  const text = item.desc || "";
  const hasMultipleLines = text.includes("\n");
  const isLong = text.length > 120 || hasMultipleLines;

  // Waktu dan Tempat (Fallbacks for existing or newly added data)
  const displayDate = item.date || "Kamis, 15 Oktober 2026";
  const displayLocation = item.location || "SS Area";

  return (
    <div className="card-brutal overflow-hidden bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[5px_5px_0px_#000000] flex flex-col group hover:translate-x-[1px] hover:translate-y-[1px] transition-transform">
      {/* Image Area */}
      <div
        onClick={() => item.photo && onOpenLightbox(item.photo, item.title, item.desc, displayDate, displayLocation)}
        className={`h-52 sm:h-56 w-full relative bg-[#FFFDF9] dark:bg-[#20232E] border-b-2 border-[#1A1A1A] dark:border-[#475569] overflow-hidden flex items-center justify-center ${
          item.photo ? "cursor-pointer" : ""
        }`}
      >
        {item.photo ? (
          <>
            <img
              src={item.photo}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
            />
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-[#DC2626] text-white border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-heading font-black text-xs shadow-sm">
              <ZoomIn size={12} />
              <span>Detail & Foto</span>
            </div>
          </>
        ) : (
          <div className="text-slate-500 font-heading font-bold text-xs flex items-center gap-2">
            <ImageIcon size={20} />
            <span>Foto Belum Diunggah</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3.5 bg-[var(--card-bg)]">
        <div>
          <h3
            onClick={() => onOpenLightbox(item.photo, item.title, item.desc, displayDate, displayLocation)}
            className="font-heading font-black text-base sm:text-lg text-slate-950 dark:text-slate-100 leading-snug mb-2 cursor-pointer hover:text-[#DC2626] dark:hover:text-[#FACC15] transition-colors"
          >
            {item.title}
          </h3>

          {/* Description with whitespace-pre-line so line breaks are preserved! */}
          <div
            className={`text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line ${
              !expanded && isLong ? "line-clamp-3" : ""
            }`}
          >
            {text}
          </div>

          {/* Expand / Collapse Button if text is long */}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{expanded ? "Tampilkan Lebih Sedikit" : "Lihat Selengkapnya"}</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Footer: Waktu (Logo Kalender) & Tempat (Logo Waypoint) + Tombol Buka Arsip */}
        <div className="pt-3 border-t-2 border-dashed border-[#1A1A1A]/15 dark:border-slate-700/60 flex items-end justify-between gap-2.5 text-xs font-heading font-bold text-slate-700 dark:text-slate-300">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {/* Waktu (Logo Kalender) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-900 dark:text-slate-100 font-black truncate" title={displayDate}>
              <Calendar size={13} className="text-[#DC2626] shrink-0" />
              <span className="truncate">{displayDate}</span>
            </div>

            {/* Tempat (Logo Waypoint / MapPin) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-bold truncate" title={displayLocation}>
              <MapPin size={13} className="text-[#DC2626] shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenLightbox(item.photo, item.title, item.desc, displayDate, displayLocation)}
            className="badge-brutal text-[10px] py-1 px-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border border-black font-black cursor-pointer shadow-sm active:translate-x-[1px] active:translate-y-[1px] shrink-0 self-center"
          >
            Buka Arsip
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Gallery({ gallery = [], onOpenLightbox }) {
  // Urutan dokumentasi tampil sesuai daftar admin (foto baru di bawah)
  const displayGallery = gallery;

  return (
    <section id="gallery" className="py-10 sm:py-14 w-full scroll-mt-24">
      {/* Title Bar (temp-mail-cf .inbox-title-bar style) */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-3 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] flex-wrap">
        <div>
          <div className="card-label text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
            ARSIP DOKUMENTASI
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
            Galeri Kegiatan Lapangan
          </h2>
        </div>
        <div className="badge-brutal bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]">
          {displayGallery.length} DOKUMENTASI
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        {displayGallery.map((item, idx) => (
          <GalleryCard key={idx} item={item} onOpenLightbox={onOpenLightbox} />
        ))}
      </div>
    </section>
  );
}
