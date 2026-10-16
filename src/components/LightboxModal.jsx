import React, { useEffect } from "react";
import { X, Calendar } from "lucide-react";

export default function LightboxModal({ isOpen, photo, caption, desc, location, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !photo) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-3xl w-full max-h-[92vh] flex flex-col items-center gap-3 animate-in zoom-in-95 duration-150 my-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 w-8 h-8 rounded border-2 border-black dark:border-[#334155] shadow-[2px_2px_0px_#000] bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>

        {/* Zoomed Image */}
        <img
          src={photo}
          alt={caption || "Foto"}
          className="max-h-[55vh] sm:max-h-[60vh] w-auto max-w-full rounded-lg border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000] object-contain bg-black"
        />

        {/* Caption, Location & Multiline Description */}
        {(caption || desc || location) && (
          <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] text-[#111827] dark:text-slate-100 border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000] w-full max-h-[32vh] overflow-y-auto">
            {caption && (
              <h3 className="font-heading font-black text-sm sm:text-base text-slate-950 dark:text-slate-100 uppercase tracking-tight mb-1.5">
                {caption}
              </h3>
            )}
            {location && (
              <div className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] mb-2.5 pb-2 border-b border-[#1A1A1A]/15 dark:border-slate-700/60 w-full">
                <Calendar size={13} className="shrink-0" />
                <span>{location}</span>
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
