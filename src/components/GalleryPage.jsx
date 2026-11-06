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

  // Newspaper photo clippings from all gallery events for hero background
  const newspaperClippings = useMemo(() => {
    const list = [];
    const tilts = [
      "-rotate-2",
      "rotate-3",
      "-rotate-3",
      "rotate-2",
      "-rotate-4",
      "rotate-3",
      "-rotate-2",
      "rotate-4",
      "-rotate-3",
      "rotate-2",
      "-rotate-4",
      "rotate-3",
    ];

    displayGallery.forEach((item, idx) => {
      const photos = getPhotos(item);
      if (photos.length > 0) {
        list.push({
          photo: photos[0],
          title: item.title || "Warta Kegiatan",
          date: item.date || "Arsip",
          location: item.location || "Sandy Shores",
          tilt: tilts[idx % tilts.length],
          edition: `EDISI #${idx + 1 < 10 ? "0" + (idx + 1) : idx + 1}`,
          zIndex: idx === 0 ? "z-30" : "z-10",
        });
      }
    });
    return list;
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
          <span className="text-slate-900 dark:text-slate-300 font-black">
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

      {/* 2. Page Hero Banner (Editorial Newspaper Press Archive Theme) */}
      <div className="p-6 sm:p-8 md:p-10 mb-8 bg-[#090A10] border border-black/10 dark:border-white/15 shadow-md dark:shadow-[0_15px_45px_rgba(0,0,0,0.8)] rounded-2xl relative overflow-hidden min-h-[310px] flex items-center">
        {/* Newspaper Archive Background Layer / Lineup of Real Activity Photos */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[60%] lg:w-[64%] xl:w-[67%] flex items-center justify-end pr-2 sm:pr-6 pointer-events-none md:pointer-events-auto overflow-hidden select-none">
          {/* Subtle Newspaper Headline Watermark */}
          <div className="absolute top-2 right-4 text-[65px] sm:text-[85px] font-serif font-black text-white/[0.03] uppercase tracking-widest pointer-events-none select-none">
            THE GAZETTE
          </div>

          {/* Double Newspaper Rule Line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-2 border-t border-b border-white/10 h-1.5 -rotate-1 pointer-events-none z-0" />

          {/* Overlapping Newspaper Photo Clippings Lineup */}
          <div className="flex items-center -space-x-8 sm:-space-x-9 md:-space-x-10 lg:-space-x-11 relative z-10 py-4 overflow-x-visible">
            {newspaperClippings.map((clip, idx) => (
              <div
                key={idx}
                className={`transition-all duration-300 opacity-40 sm:opacity-50 hover:opacity-100 hover:scale-115 hover:z-40 hover:rotate-0 filter brightness-85 hover:brightness-100 contrast-125 cursor-default ${clip.tilt} ${clip.zIndex} group/newsclip shrink-0 select-none`}
                title={`${clip.title} - ${clip.date}`}
              >
                {/* Newsprint Tape / Sticky Tab at top */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-neutral-200/50 dark:bg-neutral-300/40 backdrop-blur border border-white/50 rotate-1 z-30 shadow-sm" />

                {/* Newspaper Clipping Frame */}
                <div className="w-26 sm:w-28 md:w-30 p-1.5 pb-2.5 rounded bg-[#13151E] border-2 border-white/20 shadow-[4px_4px_0px_#000000] flex flex-col items-center relative">
                  {/* Top Newsprint Masthead Micro-bar */}
                  <div className="w-full pb-1 mb-1 border-b border-white/15 flex items-center justify-between text-[7px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    <span className="text-[#FACC15]">{clip.edition}</span>
                    <span className="truncate max-w-[65px]">{clip.date}</span>
                  </div>

                  {/* Photo area */}
                  <div className="w-full h-22 sm:h-26 rounded bg-[#07080C] overflow-hidden relative border border-white/10 flex items-center justify-center">
                    <img
                      src={clip.photo}
                      alt={clip.title}
                      className="w-full h-full object-cover object-center grayscale contrast-125 group-hover/newsclip:grayscale-0 transition-all duration-300"
                    />
                    {/* Newspaper Press Tag */}
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[7px] font-bold px-1 py-0.2 rounded border border-white/20 tracking-wider uppercase">
                      WARTA PPS
                    </span>
                  </div>

                  {/* Newspaper Headline Caption */}
                  <div className="w-full mt-1.5 px-0.5 text-center">
                    <div className="font-heading font-black text-[8.5px] sm:text-[9.5px] text-white truncate leading-tight">
                      {clip.title}
                    </div>
                    <div className="text-[7px] sm:text-[7.5px] font-mono text-[#FACC15] truncate tracking-wider mt-0.5">
                      📍 {clip.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Deep Dark Gradient Fade on Left so Text is 100% Crisp */}
          <div className="absolute inset-y-0 left-0 w-48 sm:w-64 md:w-80 bg-gradient-to-r from-[#090A10] via-[#090A10]/95 to-transparent pointer-events-none z-20" />
        </div>

        {/* Foreground Content Area (100% Readable, Ample Breathing Room) */}
        <div className="relative z-30 max-w-md sm:max-w-lg lg:max-w-xl w-full">
          {/* Newspaper Editorial Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-[#FACC15] text-[#07080E] border border-yellow-400/80 shadow-md text-[11px] font-mono font-black uppercase">
            <Newspaper size={13} />
            <span>WARTA PERS &amp; REKAM JEJAK DOKUMENTASI PPS</span>
          </div>

          <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-white leading-tight mb-2 drop-shadow-md">
            Dokumentasi &amp; Rekam Jejak Kegiatan
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mb-5 max-w-sm sm:max-w-md">
            Arsip lengkap dokumentasi visual aksi sosial kemasyarakatan, kegiatan advokasi,
            pemberdayaan UMKM lokal, serta dinamika koordinasi dan silaturahmi pengurus bersama warga
            Sandy Shores &amp; sekitarnya.
          </p>

          {/* Quick Stat Chips (Desain Editorial Koran Gelap Bergaris) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm hover:border-[#FACC15]/40 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Total Kegiatan
              </div>
              <div className="font-heading font-black text-lg sm:text-xl text-[#FACC15]">
                {gallery.length} Kegiatan
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm hover:border-white/30 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Total Foto Dokumentasi
              </div>
              <div className="font-heading font-black text-lg sm:text-xl text-slate-200">
                {totalPhotosCount} Foto
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm hover:border-[#FACC15]/40 transition-colors">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Kegiatan Terakhir
              </div>
              <div
                className="font-heading font-black text-xs sm:text-sm text-[#FACC15] truncate mt-0.5"
                title={latestDate}
              >
                {latestDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card-brutal p-4 sm:p-5 mb-8 border border-black/15 dark:border-white/10 shadow-sm dark:shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#141724] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
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
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-black/15 dark:border-white/10">
          <div className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mr-1">
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-heading font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#FACC15] text-[#07080E] border-yellow-400 shadow-sm font-black -translate-y-0.5"
                    : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/10 hover:border-black/30 dark:hover:border-white/20"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-black/15 text-slate-900" : "bg-black/5 dark:bg-white/10"
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
              className="text-xs font-black text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer ml-auto flex items-center gap-1"
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
        <div className="card-brutal p-10 sm:p-14 text-center max-w-xl mx-auto my-6">
          <ImageIcon size={44} className="mx-auto text-slate-400 mb-3" />
          <h3 className="font-heading font-black text-lg text-slate-900 dark:text-slate-200 uppercase">
            Dokumentasi Tidak Ditemukan
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
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
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 pt-8 border-t border-black/15 dark:border-white/10">
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
              className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline px-3 py-2 cursor-pointer"
            >
              Ciutkan Kembali (Tampilkan 9 Saja)
            </button>
          )}
        </div>
      )}

      {/* 6. Bottom Banner / CTA */}
      <div className="mt-14 card-brutal p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
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
