import React, { useState, useEffect, useRef } from "react";
import { X, Calendar, MapPin, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

export default function LightboxModal({
  isOpen,
  photos = [],
  photo,
  initialIndex = 0,
  caption,
  desc,
  location,
  date,
  onClose,
}) {
  const allPhotos = Array.isArray(photos) && photos.length > 0 ? photos : photo ? [photo] : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  // Sync index when modal opens or initialIndex changes
  useEffect(() => {
    setCurrentIndex(Math.min(initialIndex || 0, Math.max(0, allPhotos.length - 1)));
  }, [initialIndex, photos, photo, isOpen]);

  // Touch swipe support for mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  function handlePrev(e) {
    e?.stopPropagation();
    if (allPhotos.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
  }

  function handleNext(e) {
    e?.stopPropagation();
    if (allPhotos.length <= 1) return;
    setCurrentIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, allPhotos.length]);

  if (!isOpen || allPhotos.length === 0) return null;

  const currentPhoto = allPhotos[currentIndex] || allPhotos[0];

  function handleTouchStart(e) {
    touchStartX.current = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e) {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-fit max-h-[94vh] flex flex-col items-center gap-2.5 animate-in zoom-in-95 duration-150 my-auto"
      >
        {/* Top Floating Bar: Counter & Close Button */}
        <div className="w-full flex items-center justify-between pb-1 px-1">
          {allPhotos.length > 1 ? (
            <div className="badge-brutal text-xs py-1 px-3 bg-[#FACC15] text-[#111827] border-2 border-black font-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
              <ImageIcon size={14} />
              <span>
                Foto {currentIndex + 1} dari {allPhotos.length}
              </span>
            </div>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center font-bold cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Tutup"
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Image Viewport with Next/Prev Arrows - Frame wraps snugly to image with no black letterbox */}
        <div
          className="relative inline-flex items-center justify-center select-none max-w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Active Image Frame */}
          <div className="relative inline-block overflow-hidden rounded-xl border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000] bg-white/5 max-w-full leading-none">
            <img
              key={currentIndex}
              src={currentPhoto}
              alt={caption ? `${caption} - Foto ${currentIndex + 1}` : "Foto Kegiatan"}
              className="max-h-[62vh] sm:max-h-[68vh] w-auto max-w-[92vw] sm:max-w-3xl h-auto object-contain block animate-in fade-in duration-200"
            />

            {/* Previous Button inside photo frame */}
            {allPhotos.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
                aria-label="Foto Sebelumnya"
                title="Foto Sebelumnya (Panah Kiri)"
              >
                <ChevronLeft size={22} className="stroke-[3]" />
              </button>
            )}

            {/* Next Button inside photo frame */}
            {allPhotos.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
                aria-label="Foto Berikutnya"
                title="Foto Berikutnya (Panah Kanan)"
              >
                <ChevronRight size={22} className="stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail Strip (if more than 1 photo) */}
        {allPhotos.length > 1 && (
          <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 no-scrollbar">
            {allPhotos.map((p, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-14 h-11 sm:w-16 sm:h-12 rounded overflow-hidden border-2 shrink-0 transition-all ${
                    isActive
                      ? "border-[#FACC15] scale-110 shadow-[2px_2px_0px_#000] ring-2 ring-black"
                      : "border-black/50 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        {/* Details Card (Caption, Date, Location & Description) */}
        {(caption || desc || location || date) && (
          <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] text-[#111827] dark:text-slate-100 border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000] w-full max-h-[30vh] overflow-y-auto">
            {caption && (
              <h3 className="font-heading font-black text-sm sm:text-base text-slate-950 dark:text-slate-100 uppercase tracking-tight mb-2">
                {caption}
              </h3>
            )}

            {(date || location) && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-heading font-bold text-slate-700 dark:text-slate-300 mb-2.5 pb-2 border-b border-[#1A1A1A]/15 dark:border-slate-700/60 w-full">
                {date && (
                  <div className="inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-black">
                    <Calendar size={13} className="text-[#DC2626] shrink-0" />
                    <span>{date}</span>
                  </div>
                )}
                {location && (
                  <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                    <MapPin size={13} className="text-[#DC2626] shrink-0" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            )}

            {desc && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium">
                {desc}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
