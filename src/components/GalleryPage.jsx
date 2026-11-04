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
  FileText
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
            Arsip Galeri Dokumentasi
          </span>
        </div>

        <button
          type="button"
          onClick={handleBackToHome}
          className="btn text-xs py-1.5 px-3.5 bg-white dark:bg-[#1A1D26] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200 border-2 border-black dark:border-[#475569] font-heading font-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Beranda</span>
        </button>
      </div>

      {/* 2. Page Hero Banner (Dengan Background Foto pps.jpg Seperti di Beranda - Statis Tanpa Gerak) */}
      <div className="card-brutal p-6 sm:p-8 md:p-10 mb-8 border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000] relative overflow-hidden min-h-[300px] flex items-center">
        {/* Foto pps.jpg sebagai latar belakang (Statis, tidak zoom saat mouse hover) */}
        <img
          src="/pps.jpg"
          alt="LSM Paguyuban Pizza Sandy Shores"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />

        {/* Lapisan solid gelap agar background foto lebih redup & nyaman dimata */}
        <div className="absolute inset-0 bg-black/70 sm:bg-black/75 pointer-events-none" />

        <div className="relative z-10 max-w-4xl w-full">

          <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-slate-100 leading-tight mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Dokumentasi &amp; Rekam Jejak Kegiatan
          </h1>

          <p className="text-sm sm:text-base text-slate-200/95 font-medium leading-relaxed mb-6 max-w-3xl drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]">
            Arsip lengkap dokumentasi visual aksi sosial kemasyarakatan, kegiatan advokasi,
            pemberdayaan UMKM lokal, serta dinamika koordinasi dan silaturahmi pengurus bersama warga
            Sandy Shores &amp; sekitarnya.
          </p>

          {/* Quick Stat Chips (Desain Solid Gelap Transparan di Depan Gambar) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-black/75 backdrop-blur-sm border-2 border-white/20 shadow-[3px_3px_0px_#000]">
              <div className="text-[11px] font-bold text-slate-400 uppercase">
                Total Kegiatan
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-[#FACC15]">
                {gallery.length} Kegiatan
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black/75 backdrop-blur-sm border-2 border-white/20 shadow-[3px_3px_0px_#000]">
              <div className="text-[11px] font-bold text-slate-400 uppercase">
                Total Foto Dokumentasi
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-slate-200">
                {totalPhotosCount} Foto
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-black/75 backdrop-blur-sm border-2 border-white/20 shadow-[3px_3px_0px_#000]">
              <div className="text-[11px] font-bold text-slate-400 uppercase">
                Kegiatan Terakhir
              </div>
              <div className="font-heading font-black text-sm sm:text-base text-[#FACC15] truncate" title={latestDate}>
                {latestDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card-brutal p-4 sm:p-5 mb-8 bg-white dark:bg-[#1A1D26] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000]">
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
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded border-2 border-black dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#0D0F14] text-slate-900 dark:text-slate-200 dark:placeholder-slate-400 shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
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
            <div className="badge-brutal py-2 px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black">
              {filteredGallery.length} DARI {gallery.length} KEGIATAN
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-dashed border-black/10 dark:border-white/10">
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
                className={`px-3 py-1.5 rounded-full text-xs font-heading font-black border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#FACC15] text-[#111827] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5"
                    : "bg-[#FFFDF9] dark:bg-[#12141C] text-slate-700 dark:text-slate-300 border-black/30 dark:border-slate-700 hover:border-black shadow-[1px_1px_0px_#000]"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-black text-[#FACC15]" : "bg-black/10 dark:bg-white/10"
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
        <div className="card-brutal p-10 sm:p-14 text-center bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[5px_5px_0px_#000] max-w-xl mx-auto my-6">
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
            className="btn text-xs py-2 px-4 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black font-black mt-4 shadow-[2px_2px_0px_#000] cursor-pointer inline-flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            <span>Tampilkan Semua Dokumentasi</span>
          </button>
        </div>
      )}

      {/* 5. Pagination / Load More */}
      {filteredGallery.length > 9 && (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 pt-8 border-t-2 border-dashed border-black/10 dark:border-white/10">
          {filteredGallery.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(filteredGallery.length, prev + 6))}
              className="btn py-2.5 px-5 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black font-heading font-black text-xs sm:text-sm shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 cursor-pointer"
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
              className="btn btn-secondary py-2.5 px-4 text-xs font-heading font-bold border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer text-slate-800 dark:text-slate-200"
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
      <div className="mt-14 card-brutal p-6 sm:p-8 bg-[#FFFDF9] dark:bg-[#13161F] border-[2.5px] border-black dark:border-[#475569] shadow-[5px_5px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5 text-center sm:text-left">
          <div className="badge-brutal self-center sm:self-start bg-[#DC2626] text-white border border-black text-[10px] font-black">
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
              className="btn text-xs py-2 px-4 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black font-heading font-black shadow-[2px_2px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              Ajukan Audiensi / Rapat
            </button>
          )}
          <button
            type="button"
            onClick={handleBackToHome}
            className="btn btn-secondary text-xs py-2 px-4 border-2 border-black dark:border-[#475569] font-heading font-bold shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 text-slate-800 dark:text-slate-200"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
