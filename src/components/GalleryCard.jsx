import React, { useState, useEffect, useMemo } from "react";
import { ZoomIn, Calendar, MapPin, Image as ImageIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";

export const INDO_MONTHS = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
};

export function parseDateScore(item) {
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

export function getPhotos(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) {
    return item.photos.filter((p) => typeof p === "string" && p.trim().length > 0);
  }
  if (item.photo && typeof item.photo === "string" && item.photo.trim().length > 0) {
    return [item.photo];
  }
  return [];
}

export default function GalleryCard({ item, onOpenLightbox }) {
  const [expanded, setExpanded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const photos = useMemo(() => getPhotos(item), [item]);
  const text = item.desc || "";
  const hasMultipleLines = text.includes("\n");
  const isLong = text.length > 120 || hasMultipleLines;

  // Waktu dan Tempat (Fallbacks for existing or newly added data)
  const displayDate = item.date || "Kamis, 15 Oktober 2026";
  const displayLocation = item.location || "Sandy Shores Area";

  // Auto-Slideshow effect: cycles photos smoothly every 3.5 seconds
  useEffect(() => {
    if (photos.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % photos.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [photos.length, isHovered]);

  // Reset slide ke sampul (index 0) saat foto diganti di data
  useEffect(() => {
    setCurrentSlide(0);
  }, [photos]);

  function handleCardClick() {
    if (photos.length > 0 && onOpenLightbox) {
      onOpenLightbox(photos, item.title, item.desc, displayLocation, displayDate, currentSlide);
    }
  }

  return (
    <div className="card-brutal bg-white dark:bg-[#121622] border border-black/20 dark:border-white/20 overflow-hidden flex flex-col group hover:-translate-y-1.5 transition-all duration-300">
      {/* Image Viewport (Auto Slideshow + Multi-Photo Indicator) */}
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`h-56 sm:h-60 w-full relative bg-[#F7F5EE] dark:bg-[#0D1019] border-b border-black/15 dark:border-white/15 overflow-hidden flex items-center justify-center select-none ${
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
                  key={`${pIdx}-${p.slice(0, 40)}`}
                  src={p}
                  alt={`${item.title} - ${pIdx + 1}`}
                  loading={pIdx === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    isCurrent ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-100 pointer-events-none"
                  } group-hover:scale-105 transition-transform duration-700 ease-out`}
                />
              );
            })}

            {/* Subtle Vignette Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none z-10" />

            {/* Multi-Photo Count Badge */}
            {photos.length > 1 && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[#FACC15] border border-[#FACC15]/40 font-mono font-bold text-[11px] shadow-md flex items-center gap-1.5 z-20">
                <ImageIcon size={12} />
                <span>{photos.length} FOTO</span>
              </div>
            )}

            {/* Quick Fullscreen Zoom Button (Top Right) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-[#DC2626] backdrop-blur-md text-white border border-white/20 hover:border-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md cursor-pointer active:scale-90"
              title="Perbesar foto"
            >
              <ZoomIn size={14} />
            </button>

            {/* Interactive Left / Right Slide Arrow Buttons */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + photos.length) % photos.length);
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/80 hover:bg-[#DC2626] text-white border border-white/20 hover:border-red-400 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md cursor-pointer active:scale-90"
                  title="Foto sebelumnya"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % photos.length);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/80 hover:bg-[#DC2626] text-white border border-white/20 hover:border-red-400 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md cursor-pointer active:scale-90"
                  title="Foto berikutnya"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* Bottom Slide Dots Indicator */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 z-20 shadow-sm">
                {photos.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(dotIdx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      dotIdx === currentSlide ? "bg-[#FACC15] w-4" : "bg-white/40 hover:bg-white/70 w-1.5"
                    }`}
                    title={`Lihat foto ${dotIdx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Hover Action Pill */}
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#DC2626] text-white border border-red-400/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 font-heading font-bold text-[11px] shadow-lg z-20 backdrop-blur-sm">
              <ZoomIn size={12} />
              <span>Buka {photos.length > 1 ? `(${photos.length})` : ""}</span>
            </div>
          </>
        ) : (
          <div className="text-slate-600 dark:text-slate-400 font-heading font-bold text-xs flex items-center gap-2">
            <ImageIcon size={20} />
            <span>Foto Belum Diunggah</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4 bg-white dark:bg-[#121622]">
        <div>
          <h3
            onClick={handleCardClick}
            className="font-heading font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug mb-2 cursor-pointer group-hover:text-[#B91C1C] dark:group-hover:text-[#FACC15] transition-colors"
          >
            {item.title}
          </h3>

          {/* Description with whitespace-pre-line so line breaks are preserved */}
          <div
            className={`text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line ${
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
              className="mt-2 text-xs font-heading font-bold text-[#B91C1C] dark:text-[#FACC15] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{expanded ? "Tampilkan Lebih Sedikit" : "Lihat Selengkapnya"}</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Footer: Waktu & Lokasi + Tombol Lihat Foto */}
        <div className="pt-4 border-t border-black/15 dark:border-white/15 flex items-center justify-between gap-3 text-xs">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {/* Waktu (Logo Kalender) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 font-bold truncate" title={displayDate}>
              <Calendar size={13} className="text-[#DC2626] shrink-0" />
              <span className="truncate">{displayDate}</span>
            </div>

            {/* Tempat (Logo MapPin) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium truncate" title={displayLocation}>
              <MapPin size={13} className="text-[#92400E] dark:text-[#FACC15] shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCardClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-heading font-black bg-[#FACC15] hover:bg-[#EAB308] text-[#0F172A] border border-amber-400/60 shadow-sm hover:shadow active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Buka foto dokumentasi"
          >
            <ZoomIn size={12} strokeWidth={2.5} />
            <span>Lihat Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
}
