import React, { useState, useEffect, useMemo } from "react";
import { ZoomIn, Calendar, MapPin, Image as ImageIcon, ChevronDown, ChevronUp, Search, X, Layers } from "lucide-react";

function getPhotos(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) {
    return item.photos.filter((p) => typeof p === "string" && p.trim().length > 0);
  }
  if (item.photo && typeof item.photo === "string" && item.photo.trim().length > 0) {
    return [item.photo];
  }
  return [];
}

function GalleryCard({ item, onOpenLightbox }) {
  const [expanded, setExpanded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const photos = useMemo(() => getPhotos(item), [item]);
  const text = item.desc || "";
  const hasMultipleLines = text.includes("\n");
  const isLong = text.length > 120 || hasMultipleLines;

  // Waktu dan Tempat (Fallbacks for existing or newly added data)
  const displayDate = item.date || "Kamis, 15 Oktober 2026";
  const displayLocation = item.location || "SS Area";

  // Auto-Slideshow effect: cycles photos smoothly every 3.5 seconds
  useEffect(() => {
    if (photos.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % photos.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [photos.length, isHovered]);

  const activePhoto = photos[currentSlide] || photos[0];

  function handleCardClick() {
    if (photos.length > 0) {
      onOpenLightbox(photos, item.title, item.desc, displayLocation, displayDate, currentSlide);
    }
  }

  return (
    <div className="card-brutal overflow-hidden bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[5px_5px_0px_#000000] flex flex-col group hover:translate-x-[1px] hover:translate-y-[1px] transition-transform">
      {/* Image Viewport (Auto Slideshow + Multi-Photo Indicator) */}
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`h-52 sm:h-56 w-full relative bg-[#FFFDF9] dark:bg-[#20232E] border-b-2 border-[#1A1A1A] dark:border-[#475569] overflow-hidden flex items-center justify-center select-none ${
          photos.length > 0 ? "cursor-pointer" : ""
        }`}
      >
        {photos.length > 0 ? (
          <>
            {/* Smooth Crossfade Stack: Gambar memudar lembut berganti ke gambar baru */}
            {photos.map((p, pIdx) => {
              const isCurrent = pIdx === currentSlide;
              return (
                <img
                  key={pIdx}
                  src={p}
                  alt={`${item.title} - ${pIdx + 1}`}
                  loading={pIdx === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    isCurrent ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-100 pointer-events-none"
                  } group-hover:scale-103 transition-transform duration-500`}
                />
              );
            })}

            {/* Multi-Photo Count Badge */}
            {photos.length > 1 && (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#FACC15] text-[#111827] border-2 border-black font-black text-[10px] shadow-[1px_1px_0px_#000] flex items-center gap-1">
                <ImageIcon size={11} />
                <span>{photos.length} Foto</span>
              </div>
            )}

            {/* Bottom Slide Dots Indicator */}
            {photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-[2px] border border-white/20">
                {photos.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(dotIdx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      dotIdx === currentSlide ? "bg-[#FACC15] w-3.5" : "bg-white/60 w-1.5"
                    }`}
                    title={`Lihat foto ${dotIdx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Hover Action Pill */}
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-[#DC2626] text-white border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-heading font-black text-xs shadow-sm">
              <ZoomIn size={12} />
              <span>Lihat Foto {photos.length > 1 ? `(${photos.length})` : ""}</span>
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
            onClick={handleCardClick}
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

        {/* Footer: Waktu & Lokasi + Tombol Lihat Foto */}
        <div className="pt-3 border-t-2 border-dashed border-[#1A1A1A]/15 dark:border-slate-700/60 flex items-end justify-between gap-2.5 text-xs font-heading font-bold text-slate-700 dark:text-slate-300">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {/* Waktu (Logo Kalender) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-900 dark:text-slate-100 font-black truncate" title={displayDate}>
              <Calendar size={13} className="text-[#DC2626] shrink-0" />
              <span className="truncate">{displayDate}</span>
            </div>

            {/* Tempat (Logo MapPin) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-bold truncate" title={displayLocation}>
              <MapPin size={13} className="text-[#DC2626] shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCardClick}
            className="badge-brutal text-[10px] py-1 px-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border border-black font-black cursor-pointer shadow-sm active:translate-x-[1px] active:translate-y-[1px] shrink-0 self-center"
          >
            Lihat Foto
          </button>
        </div>
      </div>
    </div>
  );
}

const INDO_MONTHS = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
};

function parseDateScore(item) {
  const str = item?.date || "";
  const m = String(str).match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = INDO_MONTHS[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    if (mon !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, mon, day).getTime();
    }
  }
  const p = Date.parse(str);
  if (!isNaN(p)) return p;
  return Date.now();
}

export default function Gallery({ gallery = [], onOpenLightbox }) {
  // Search Query & Pagination state to avoid bottomless page scrolling
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);

  // Newest events always first
  const displayGallery = useMemo(() => {
    const indexed = gallery.map((item, originalIndex) => ({
      item,
      originalIndex,
      score: parseDateScore(item),
    }));

    indexed.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.originalIndex - b.originalIndex;
    });

    return indexed.map((x) => x.item);
  }, [gallery]);

  // Filtered by Search Query
  const filteredGallery = useMemo(() => {
    if (!searchQuery.trim()) return displayGallery;
    const q = searchQuery.toLowerCase().trim();
    return displayGallery.filter(
      (item) =>
        (item.title || "").toLowerCase().includes(q) ||
        (item.desc || "").toLowerCase().includes(q) ||
        (item.location || "").toLowerCase().includes(q) ||
        (item.date || "").toLowerCase().includes(q)
    );
  }, [displayGallery, searchQuery]);

  // Visible subset (default: 6 cards)
  const visibleItems = useMemo(() => {
    return filteredGallery.slice(0, visibleCount);
  }, [filteredGallery, visibleCount]);

  return (
    <section id="gallery" className="py-10 sm:py-14 w-full scroll-mt-24">
      {/* Title Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-3 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569]">
        <div>
          <div className="card-label text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
            ARSIP DOKUMENTASI
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
            Galeri Kegiatan Lapangan
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(6); // reset pagination when searching
              }}
              placeholder="Cari kegiatan, tanggal..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded border-2 border-black dark:border-[#475569] bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Counter Badge */}
          <div className="badge-brutal bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] text-xs">
            {filteredGallery.length} DOKUMENTASI
          </div>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {visibleItems.map((item, idx) => (
            <GalleryCard key={idx} item={item} onOpenLightbox={onOpenLightbox} />
          ))}
        </div>
      ) : (
        <div className="card-brutal p-8 text-center bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000]">
          <ImageIcon size={32} className="mx-auto text-slate-400 mb-2" />
          <h4 className="font-heading font-black text-sm text-slate-900 dark:text-slate-100 uppercase">
            Dokumentasi Tidak Ditemukan
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tidak ada kegiatan yang cocok dengan kata kunci "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black font-black mt-3 shadow-[2px_2px_0px_#000]"
          >
            Tampilkan Semua Dokumentasi
          </button>
        </div>
      )}

      {/* Pagination & Load More Controls */}
      {filteredGallery.length > 6 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 pt-6 border-t-2 border-dashed border-black/10 dark:border-white/10">
          {filteredGallery.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(filteredGallery.length, prev + 6))}
              className="btn py-2.5 px-5 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black font-heading font-black text-xs sm:text-sm shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2"
            >
              <Layers size={16} />
              <span>
                Muat Lebih Banyak ({filteredGallery.length - visibleCount} Kegiatan Lagi)
              </span>
            </button>
          )}

          {filteredGallery.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount(filteredGallery.length)}
              className="btn btn-secondary py-2.5 px-4 text-xs font-heading font-bold border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            >
              Tampilkan Semua ({filteredGallery.length})
            </button>
          )}

          {visibleCount > 6 && (
            <button
              type="button"
              onClick={() => {
                setVisibleCount(6);
                const el = document.getElementById("gallery");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline px-3 py-2 cursor-pointer"
            >
              Ciutkan Kembali (Tampilkan 6 Saja)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
