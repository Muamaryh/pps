import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Layers,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Home,
  ChevronRight,
  Filter,
  CheckCircle2,
  Users,
  Store,
  FileText,
  Newspaper,
  MapPin,
} from "lucide-react";
import GalleryCard, { parseDateScore, getPhotos } from "./GalleryCard";

export default function GalleryPage({
  gallery = [],
  onOpenLightbox,
  onNavigateHome,
  onOpenServicePortal,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(9);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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

  // Total verified photos count across all gallery activities
  const totalPhotosCount = useMemo(() => {
    return gallery.reduce((acc, item) => acc + getPhotos(item).length, 0);
  }, [gallery]);

  // Latest event date
  const latestDate = useMemo(() => {
    if (displayGallery.length > 0 && displayGallery[0]?.date) {
      return displayGallery[0].date;
    }
    return "Terbaru";
  }, [displayGallery]);

  // Full-height diagonal slash photo panels for hero background (sleek 8-strip layout, prioritizing real activity photos)
  const newspaperClippings = useMemo(() => {
    const primary = [];
    const secondary = [];
    const fallbackDocs = [];

    displayGallery.forEach((item) => {
      const photos = getPhotos(item);
      if (photos.length === 0) return;

      const textToCheck = `${item.title || ""} ${item.category || ""} ${item.desc || ""}`;
      const isDoc = /surat|izin|operasional|dokumen|sertifikat|sk\b/i.test(
        textToCheck,
      );
      const target = isDoc ? fallbackDocs : primary;

      target.push({
        photo: photos[0],
        title: item.title || "Warta Kegiatan",
      });

      // Collect additional photos from multi-photo events so we can form 8 sleek strips
      if (!isDoc && photos.length > 1) {
        photos.slice(1, 3).forEach((extraPhoto) => {
          secondary.push({
            photo: extraPhoto,
            title: item.title || "Warta Kegiatan",
          });
        });
      }
    });

    return [...primary, ...secondary, ...fallbackDocs].slice(0, 8);
  }, [displayGallery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    let sosial = 0;
    let umkm = 0;
    let rapat = 0;

    displayGallery.forEach((item) => {
      const text = `${item.title || ""} ${item.desc || ""} ${item.location || ""}`.toLowerCase();
      if (/sosial|baksos|santunan|bantuan|warga|masyarakat|sembako|lingkungan|donasi/i.test(text)) {
        sosial++;
      }
      if (/umkm|lapak|usaha|pedagang|ekonomi|pasar|stan|bina|tenda/i.test(text)) {
        umkm++;
      }
      if (/rapat|koordinasi|mou|pertemuan|audiensi|musyawarah|briefing|evaluasi|sidang/i.test(text)) {
        rapat++;
      }
    });

    return {
      all: displayGallery.length,
      sosial,
      umkm,
      rapat,
    };
  }, [displayGallery]);

  // Filtered by Category & Search Query
  const filteredGallery = useMemo(() => {
    let list = displayGallery;

    if (selectedCategory !== "all") {
      list = list.filter((item) => {
        const text = `${item.title || ""} ${item.desc || ""} ${item.location || ""}`.toLowerCase();
        if (selectedCategory === "sosial") {
          return /sosial|baksos|santunan|bantuan|warga|masyarakat|sembako|lingkungan|donasi/i.test(text);
        }
        if (selectedCategory === "umkm") {
          return /umkm|lapak|usaha|pedagang|ekonomi|pasar|stan|bina|tenda/i.test(text);
        }
        if (selectedCategory === "rapat") {
          return /rapat|koordinasi|mou|pertemuan|audiensi|musyawarah|briefing|evaluasi|sidang/i.test(text);
        }
        return true;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        (item.title || "").toLowerCase().includes(q) ||
        (item.desc || "").toLowerCase().includes(q) ||
        (item.location || "").toLowerCase().includes(q) ||
        (item.date || "").toLowerCase().includes(q)
    );
  }, [displayGallery, selectedCategory, searchQuery]);

  // Visible subset (default: 9 cards)
  const visibleItems = useMemo(() => {
    return filteredGallery.slice(0, visibleCount);
  }, [filteredGallery, visibleCount]);

  function handleBackToHome() {
    if (onNavigateHome) {
      onNavigateHome("#home");
    } else {
      window.history.pushState(null, "", "/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="w-full pb-16 pt-2 animate-in fade-in duration-200">
      {/* 1. Top Breadcrumb & Return Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b-2 border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 hover:text-[#DC2626] dark:hover:text-[#FACC15] transition-colors cursor-pointer"
          >
            <Home size={14} className="text-[#DC2626] dark:text-[#FACC15]" />
            <span>Beranda</span>
          </button>
          <ChevronRight size={13} className="text-slate-400 shrink-0" />
          <span className="text-slate-900 dark:text-slate-100 font-black">
            Arsip Dokumentasi Kegiatan
          </span>
        </div>

        <button
          type="button"
          onClick={handleBackToHome}
          className="btn btn-secondary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Beranda</span>
        </button>
      </div>

      {/* 2. Page Hero Banner (Adaptif Light & Dark Mode - Editorial Press Theme) */}
      <div className="p-6 sm:p-8 md:p-10 mb-8 bg-white dark:bg-[#121622] border border-black/20 dark:border-white/20 shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_15px_45px_rgba(0,0,0,0.85)] rounded-2xl relative isolate overflow-hidden min-h-[320px] flex items-center transition-colors">
        {/* Full-Height Diagonal Slash Newspaper Photo Panels (Sleek 8-Strip Seamless Collage with Smooth Left Fade Mask) */}
        <div className="group/collage absolute -top-2 -bottom-2 right-0 w-full md:w-[68%] lg:w-[72%] xl:w-[75%] opacity-15 md:opacity-100 [mask-image:linear-gradient(108deg,transparent_4%,rgba(0,0,0,0.12)_16%,rgba(0,0,0,0.55)_28%,black_42%)] pointer-events-none md:pointer-events-auto overflow-hidden select-none">
          {/* Continuous Newspaper Masthead Watermark Across Top of Collage */}
          <div className="absolute inset-x-0 top-0 pt-3.5 pb-6 px-8 bg-gradient-to-b from-black/55 via-black/20 to-transparent z-20 pointer-events-none flex flex-col items-end pr-6 opacity-75 group-hover/collage:opacity-40 transition-opacity duration-300">
            <div className="border-t-2 border-b border-white/35 h-1 w-3/4 mb-1" />
            <span className="font-serif font-black text-xs sm:text-sm tracking-[0.32em] uppercase text-white/45 drop-shadow-sm leading-none">
              SANDY SHORES DAILY GAZETTE
            </span>
            <div className="border-t border-white/25 w-2/3 mt-1" />
          </div>

          {/* Diagonal Parallelogram Strip Container - fits all strips inside without clipping rightmost strips */}
          <div className="flex h-full ml-8 lg:ml-12 -mr-12">
            {newspaperClippings.map((clip, idx) => (
              <div
                key={idx}
                className="group/slash relative flex-1 h-full -skew-x-[18deg] overflow-hidden bg-[#DDD5C4] dark:bg-[#161922] border-l-[3.5px] border-[#11131A] dark:border-[#05060A] first:border-l-0 cursor-default transition-opacity duration-300 group-hover/collage:opacity-75 hover:!opacity-100 after:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-[1.5px] after:bg-gradient-to-b after:from-white/75 after:via-white/35 after:to-white/65 dark:after:from-white/45 dark:after:via-white/20 dark:after:to-white/40 hover:after:w-[2px] hover:after:from-[#FACC15] hover:after:via-[#FACC15] hover:after:to-amber-500 after:z-30 after:transition-all after:pointer-events-none"
                title={clip.title}
              >
                {/* Upright Counter-Skewed Container: fixed -left-28 -right-28 guarantees 100% corner coverage on sleek narrow strips */}
                <div className="absolute inset-y-0 -left-28 -right-28 skew-x-[18deg] overflow-hidden">
                  {/* Activity Photo: Redup bergaya cetakan koran saat diam, warna asli penuh saat di-hover */}
                  <img
                    src={clip.photo}
                    alt={clip.title}
                    className="w-full h-full object-cover object-center grayscale contrast-125 sepia-[28%] brightness-[0.68] dark:brightness-[0.55] group-hover/slash:grayscale-0 group-hover/slash:sepia-0 group-hover/slash:contrast-105 group-hover/slash:brightness-105 transition-all duration-300"
                  />

                  {/* Newspaper Print Texture & Halftone Overlay (fades out on hover to reveal original color) */}
                  <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-100 group-hover/slash:opacity-0">
                    {/* Warm Newsprint Paper Tint & Ink Depth */}
                    <div className="absolute inset-0 bg-[#E6DEC8]/25 dark:bg-black/35 mix-blend-multiply" />

                    {/* Halftone Newsprint Dot Matrix Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#111827_0.85px,transparent_0.85px)] [background-size:3.5px_3.5px] opacity-[0.16] dark:opacity-[0.24]" />
                  </div>

                  {/* Subtle Top/Bottom Cinematic Framing & Hover Warm Rim Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 group-hover/slash:from-[#FACC15]/15 group-hover/slash:via-transparent group-hover/slash:to-transparent transition-all duration-300 pointer-events-none" />
                </div>

                {/* Inner Diagonal Bevel Depth along the Slash Seam */}
                <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none z-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Foreground Content Area (100% Readable, Ample Breathing Room) */}
        <div className="relative z-30 max-w-md sm:max-w-lg lg:max-w-xl w-full">
          {/* Newspaper Editorial Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-[#FACC15] text-[#111827] border border-[#CA8A04] dark:border-yellow-400/80 shadow-sm text-[11px] font-mono font-black uppercase">
            <Newspaper size={13} />
            <span>WARTA PERS &amp; REKAM JEJAK DOKUMENTASI PPS</span>
          </div>

          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-slate-950 dark:text-white leading-tight mb-2 dark:drop-shadow-md">
            Dokumentasi &amp; Rekam Jejak Kegiatan
          </h1>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-5 max-w-sm sm:max-w-md">
            Arsip lengkap dokumentasi visual aksi sosial kemasyarakatan, kegiatan advokasi,
            pemberdayaan UMKM lokal, serta dinamika koordinasi dan silaturahmi pengurus bersama warga
            Sandy Shores &amp; sekitarnya.
          </p>

          {/* Quick Stat Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-[#F7F5EE]/95 dark:bg-[#191F30]/90 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-sm hover:border-[#CA8A04] dark:hover:border-[#FACC15]/50 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                Total Kegiatan
              </div>
              <div className="font-heading font-black text-lg sm:text-xl text-[#B91C1C] dark:text-[#FACC15]">
                {gallery.length} Kegiatan
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F5EE]/95 dark:bg-[#191F30]/90 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-sm hover:border-[#CA8A04] dark:hover:border-[#FACC15]/50 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                Total Foto Dokumentasi
              </div>
              <div className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100">
                {totalPhotosCount} Foto
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[#F7F5EE]/95 dark:bg-[#191F30]/90 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-sm hover:border-[#CA8A04] dark:hover:border-[#FACC15]/50 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                Kegiatan Terakhir
              </div>
              <div
                className="font-heading font-black text-xs sm:text-sm text-[#92400E] dark:text-[#FACC15] truncate mt-0.5"
                title={latestDate}
              >
                {latestDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card-brutal bg-white dark:bg-[#121622] p-4 sm:p-5 mb-8 border border-black/20 dark:border-white/20 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(9);
              }}
              placeholder="Cari nama kegiatan, tanggal, lokasi, atau topik..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-black/20 dark:border-white/20 bg-[#F7F5EE] dark:bg-[#191F30] text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Results Badge */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="badge-brutal badge-yellow py-2 px-3 text-xs font-black">
              {filteredGallery.length} DARI {gallery.length} KEGIATAN
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-black/15 dark:border-white/15">
          <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
            <Filter size={13} className="text-[#DC2626]" />
            <span>Kategori:</span>
          </div>

          {[
            { id: "all", label: "Semua", count: categoryCounts.all },
            { id: "sosial", label: "Aksi Sosial & Warga", count: categoryCounts.sosial },
            { id: "umkm", label: "Pemberdayaan UMKM", count: categoryCounts.umkm },
            { id: "rapat", label: "Rapat & Audiensi", count: categoryCounts.rapat },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setVisibleCount(9);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-heading font-black border transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] dark:focus-visible:ring-[#FACC15] ${
                  isActive
                    ? "bg-[#FACC15] text-[#111827] border-[#CA8A04] shadow-sm font-black -translate-y-0.5"
                    : "bg-[#F7F5EE] dark:bg-[#191F30] text-slate-800 dark:text-slate-200 border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-[#FACC15]/50"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-black/15 text-slate-900" : "bg-black/10 dark:bg-white/15"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}

          {(selectedCategory !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
                setVisibleCount(9);
              }}
              className="text-xs font-black text-[#B91C1C] dark:text-[#FACC15] hover:underline cursor-pointer ml-auto flex items-center gap-1"
            >
              <X size={12} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Gallery Grid */}
      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {visibleItems.map((item, idx) => {
            const photoKey = (Array.isArray(item.photos) && item.photos.length > 0 ? item.photos : [item.photo || ""])
              .map((p) => (typeof p === "string" ? p.slice(0, 30) : ""))
              .join(",");
            return (
              <GalleryCard
                key={`${item.title || "gal"}-${idx}-${photoKey}`}
                item={item}
                onOpenLightbox={onOpenLightbox}
              />
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="card-brutal bg-white dark:bg-[#121622] border border-black/20 dark:border-white/20 p-10 sm:p-14 text-center max-w-xl mx-auto my-6">
          <ImageIcon size={44} className="mx-auto text-slate-500 dark:text-slate-400 mb-3" />
          <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white uppercase">
            Dokumentasi Tidak Ditemukan
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2 max-w-md mx-auto">
            Tidak ada arsip dokumentasi yang cocok dengan kata kunci atau filter kategori saat ini.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="btn text-xs py-2.5 px-5 mt-4 inline-flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            <span>Tampilkan Semua Dokumentasi</span>
          </button>
        </div>
      )}

      {/* 5. Pagination / Load More */}
      {filteredGallery.length > 9 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 pt-8 border-t border-black/15 dark:border-white/15">
          {filteredGallery.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(filteredGallery.length, prev + 6))}
              className="btn py-2.5 px-5 flex items-center gap-2 cursor-pointer"
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
              className="btn btn-secondary py-2.5 px-4 text-xs cursor-pointer"
            >
              Tampilkan Semua ({filteredGallery.length})
            </button>
          )}

          {visibleCount > 9 && (
            <button
              type="button"
              onClick={() => {
                setVisibleCount(9);
                window.scrollTo({ top: 250, behavior: "smooth" });
              }}
              className="text-xs font-heading font-black text-[#B91C1C] dark:text-[#FACC15] hover:underline px-3 py-2 cursor-pointer"
            >
              Ciutkan Kembali (Tampilkan 9 Saja)
            </button>
          )}
        </div>
      )}

      {/* 6. Bottom Banner / CTA */}
      <div className="mt-14 card-brutal bg-white dark:bg-[#121622] border border-black/20 dark:border-white/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5 text-center sm:text-left">
          <div className="badge-brutal badge-red self-center sm:self-start text-[10px] font-black">
            KOLABORASI &amp; AUDIENSI
          </div>
          <h4 className="font-heading font-black text-base sm:text-lg text-slate-950 dark:text-slate-200 uppercase">
            Ingin Mengadakan Kegiatan Bersama LSM PPS?
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl font-medium">
            Warga, pelaku UMKM, ataupun instansi dapat mengajukan audiensi resmi, kerja sama bakti
            sosial, atau pendaftaran stan lapak binaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          {onOpenServicePortal && (
            <button
              type="button"
              onClick={() => onOpenServicePortal("meeting")}
              className="btn text-xs py-2.5 px-4 cursor-pointer"
            >
              Ajukan Audiensi / Rapat
            </button>
          )}
          <button
            type="button"
            onClick={handleBackToHome}
            className="btn btn-secondary text-xs py-2.5 px-4 cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
