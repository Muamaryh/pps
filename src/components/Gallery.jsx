import React, { useMemo } from "react";
import { ArrowRight, Image as ImageIcon, Sparkles, FolderArchive, Layers } from "lucide-react";
import GalleryCard, { parseDateScore, getPhotos } from "./GalleryCard";

export default function Gallery({
  gallery = [],
  onOpenLightbox,
  onNavigateToGallery,
}) {
  // Sort newest events first
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

  // Preview only the 3 latest highlight activities on Home
  const previewItems = useMemo(() => {
    return displayGallery.slice(0, 3);
  }, [displayGallery]);

  const totalPhotos = useMemo(() => {
    return gallery.reduce((acc, item) => acc + getPhotos(item).length, 0);
  }, [gallery]);

  function handleOpenDedicatedPage(e) {
    if (e) e.preventDefault();
    if (onNavigateToGallery) {
      onNavigateToGallery();
    } else {
      window.history.pushState(null, "", "#/galeri");
      window.dispatchEvent(new Event("hashchange"));
    }
  }

  return (
    <section id="gallery" className="py-10 sm:py-14 w-full scroll-mt-24">
      {/* Title Bar & Quick Jump to Full Gallery */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-3 border-b border-black/20 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 card-label text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
            <FolderArchive size={14} className="text-[#DC2626]" />
            <span>SOROTAN DOKUMENTASI TERBARU</span>
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
            Galeri Kegiatan Lapangan
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenDedicatedPage}
            className="btn w-full sm:w-auto text-xs py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5"
            title="Buka Halaman Mandiri Galeri Dokumentasi"
          >
            <Layers size={14} />
            <span>Buka Halaman Galeri ({gallery.length} Arsip)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3 Highlight Cards Grid */}
      {previewItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {previewItems.map((item, idx) => {
            const photoKey = (Array.isArray(item.photos) && item.photos.length > 0 ? item.photos : [item.photo || ""])
              .map((p) => (typeof p === "string" ? p.slice(0, 30) : ""))
              .join(",");
            return (
              <GalleryCard
                key={`home-preview-${item.title || "gal"}-${idx}-${photoKey}`}
                item={item}
                onOpenLightbox={onOpenLightbox}
              />
            );
          })}
        </div>
      ) : (
        <div className="card-brutal p-8 text-center">
          <ImageIcon size={32} className="mx-auto text-slate-400 mb-2" />
          <h4 className="font-heading font-black text-sm text-slate-900 dark:text-slate-100 uppercase">
            Belum Ada Dokumentasi
          </h4>
        </div>
      )}

      {/* Prominent Callout Card to Visit Dedicated Gallery Page */}
      <div className="mt-8 card-brutal p-6 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border border-amber-400/50 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={22} className="text-[#DC2626]" />
          </div>
          <div>
            <div className="badge-brutal badge-red text-[10px] mb-1 font-black">
              HALAMAN KHUSUS ARSIP
            </div>
            <h4 className="font-heading font-black text-base sm:text-lg text-slate-950 dark:text-slate-100 uppercase">
              Jelajahi Rekam Jejak Lengkap LSM PPS
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl mt-0.5">
              Tersedia {gallery.length} arsip kegiatan dan lebih dari {totalPhotos} foto HD dengan fitur
              filter kategori, pencarian kata kunci, serta slideshow dokumentasi lapangan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenDedicatedPage}
          className="btn py-3 px-5 sm:px-6 flex items-center gap-2.5 cursor-pointer shrink-0 w-full md:w-auto justify-center group"
        >
          <span>Buka Galeri Dokumentasi Lengkap</span>
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </section>
  );
}
