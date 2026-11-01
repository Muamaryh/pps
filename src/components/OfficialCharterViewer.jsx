// ==========================================================================
// OFFICIAL CHARTER VIEWER - LSM PAGUYUBAN PIZZA SANDY SHORES
// Naskah Pakta Pendirian dan Anggaran Dasar (AD/ART) Resmi
// State of San Andreas - Los Santos | No: 001/PP-LSM-PPS/X/2026
// ==========================================================================

import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Copy,
  Check,
  Building2,
  UserCheck,
  MapPin,
  Calendar,
  ShieldCheck,
  Scale,
  Stamp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  OFFICIAL_CHARTER_METADATA,
  OFFICIAL_CHARTER_MUKADIMAH,
  OFFICIAL_CHARTER_CHAPTERS,
  OFFICIAL_CHARTER_SIGNATORIES,
  OFFICIAL_CHARTER_DISCLAIMER,
  getOfficialCharterFullPlainText,
} from "../data/officialCharter";

export default function OfficialCharterViewer({ onShowToast }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChapterFilter, setActiveChapterFilter] = useState("ALL"); // 'ALL' | 'MUKADIMAH' | 'bab-1' .. 'bab-10' | 'SIGNATURE'
  const [copied, setCopied] = useState(false);

  // Filter bab & pasal berdasarkan pencarian kata kunci atau filter bab aktif
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return OFFICIAL_CHARTER_CHAPTERS.map((ch) => {
      // Cek filter bab
      if (activeChapterFilter !== "ALL" && activeChapterFilter !== ch.id) {
        return null;
      }

      // Jika tidak ada pencarian kata kunci, tampilkan bab utuh
      if (!q) return ch;

      // Filter pasal yang cocok dengan kata kunci
      const matchedArticles = ch.articles.filter((art) => {
        const titleMatch = art.title.toLowerCase().includes(q);
        const numberMatch = `pasal ${art.number}`.includes(q);
        const pointsMatch = art.points.some((p) => p.toLowerCase().includes(q));
        const noteMatch = art.note ? art.note.toLowerCase().includes(q) : false;
        return titleMatch || numberMatch || pointsMatch || noteMatch;
      });

      if (matchedArticles.length === 0 && !ch.title.toLowerCase().includes(q)) {
        return null;
      }

      return {
        ...ch,
        articles: matchedArticles.length > 0 ? matchedArticles : ch.articles,
      };
    }).filter(Boolean);
  }, [searchQuery, activeChapterFilter]);

  // Handler Salin Dokumen Lengkap ke Clipboard
  async function handleCopyFullText() {
    const text = getOfficialCharterFullPlainText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (onShowToast) {
        onShowToast("Naskah Pakta Pendirian & AD/ART berhasil disalin ke clipboard!", "success");
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin naskah:", err);
    }
  }

  const showMukadimah =
    (activeChapterFilter === "ALL" || activeChapterFilter === "MUKADIMAH") &&
    (!searchQuery.trim() ||
      OFFICIAL_CHARTER_MUKADIMAH.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase())));

  const showSignatures =
    (activeChapterFilter === "ALL" || activeChapterFilter === "SIGNATURE") && !searchQuery.trim();

  return (
    <div className="flex flex-col gap-6 text-slate-900 dark:text-slate-100">
      {/* Kop Surat Dokumen Kenegaraan / Naskah Konstitusi */}
      <div className="p-5 sm:p-7 rounded-lg bg-gradient-to-b from-[#FFFDF9] to-[#F8F5EE] dark:from-[#1E212B] dark:to-[#171922] border-[2.5px] border-black dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col items-center text-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15] text-slate-950 font-mono text-xs font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000]">
          <Scale size={14} />
          <span>DOKUMEN KONSTITUSI INTERNAL ORGANISASI • {OFFICIAL_CHARTER_METADATA.edition}</span>
        </div>

        <div className="space-y-1">
          <h3 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
            {OFFICIAL_CHARTER_METADATA.title}
          </h3>
          <p className="font-heading font-black text-base sm:text-lg text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wide">
            {OFFICIAL_CHARTER_METADATA.organization}
          </p>
          <p className="font-mono text-xs text-slate-500 font-bold uppercase tracking-widest">
            {OFFICIAL_CHARTER_METADATA.jurisdiction}
          </p>
        </div>

        <div className="py-1 px-4 rounded bg-slate-900 text-[#FACC15] font-mono text-xs font-black tracking-wider border border-black shadow-[2px_2px_0px_#000]">
          NOMOR: {OFFICIAL_CHARTER_METADATA.documentNumber}
        </div>

        {/* 4 Metadata Legalitas */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2 pt-4 border-t-2 border-dashed border-black/20 dark:border-white/20 text-left font-mono">
          <div className="p-2.5 rounded bg-white dark:bg-[#14161F] border border-black/20 dark:border-white/10 flex items-start gap-2.5">
            <UserCheck size={16} className="text-[#DC2626] dark:text-[#FACC15] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Penanggung Jawab</span>
              <strong className="text-xs text-slate-900 dark:text-slate-100">{OFFICIAL_CHARTER_METADATA.responsiblePerson}</strong>
            </div>
          </div>

          <div className="p-2.5 rounded bg-white dark:bg-[#14161F] border border-black/20 dark:border-white/10 flex items-start gap-2.5">
            <MapPin size={16} className="text-[#DC2626] dark:text-[#FACC15] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Alamat Sekretariat</span>
              <strong className="text-xs text-slate-900 dark:text-slate-100">{OFFICIAL_CHARTER_METADATA.secretariatAddress}</strong>
            </div>
          </div>

          <div className="p-2.5 rounded bg-white dark:bg-[#14161F] border border-black/20 dark:border-white/10 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#DC2626] dark:text-[#FACC15] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Nomor Surat Izin</span>
              <strong className="text-xs text-slate-900 dark:text-slate-100">{OFFICIAL_CHARTER_METADATA.permitNumber}</strong>
            </div>
          </div>

          <div className="p-2.5 rounded bg-white dark:bg-[#14161F] border border-black/20 dark:border-white/10 flex items-start gap-2.5">
            <Calendar size={16} className="text-[#DC2626] dark:text-[#FACC15] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Tanggal Penetapan Izin</span>
              <strong className="text-xs text-slate-900 dark:text-slate-100">{OFFICIAL_CHARTER_METADATA.permitDate}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Pencarian Kata Kunci & Tombol Salin Dokumen */}
      <div className="card-brutal p-3 sm:p-4 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pasal atau kata kunci (contoh: sanksi, keuangan, ketua umum, bendahara)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#20232E] border-2 border-black dark:border-[#475569] rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-black dark:hover:text-white"
            >
              Reset
            </button>
          )}
        </div>

        {/* Action: Tombol Salin Naskah */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyFullText}
            className={`py-2 px-4 rounded text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-2 ${
              copied
                ? "bg-emerald-500 text-slate-950"
                : "bg-[#FACC15] hover:bg-[#EAB308] text-slate-950"
            }`}
            title="Salin seluruh teks naskah untuk ditempel ke Discord atau dokumen lainnya"
          >
            {copied ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Naskah Disalin!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Salin Naskah Dokumen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigasi Cepat Bab (Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveChapterFilter("ALL")}
          className={`px-3 py-1.5 rounded border-2 border-black font-bold whitespace-nowrap cursor-pointer transition-all ${
            activeChapterFilter === "ALL"
              ? "bg-slate-900 text-white shadow-[1.5px_1.5px_0px_#000]"
              : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          Semua Bab ({OFFICIAL_CHARTER_CHAPTERS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveChapterFilter("MUKADIMAH")}
          className={`px-3 py-1.5 rounded border-2 border-black font-bold whitespace-nowrap cursor-pointer transition-all ${
            activeChapterFilter === "MUKADIMAH"
              ? "bg-slate-900 text-white shadow-[1.5px_1.5px_0px_#000]"
              : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          Mukadimah
        </button>

        {OFFICIAL_CHARTER_CHAPTERS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChapterFilter(ch.id)}
            className={`px-3 py-1.5 rounded border-2 border-black font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeChapterFilter === "ch.id" || activeChapterFilter === ch.id
                ? "bg-[#FACC15] text-slate-950 shadow-[1.5px_1.5px_0px_#000] font-black"
                : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            {ch.roman}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setActiveChapterFilter("SIGNATURE")}
          className={`px-3 py-1.5 rounded border-2 border-black font-bold whitespace-nowrap cursor-pointer transition-all ${
            activeChapterFilter === "SIGNATURE"
              ? "bg-slate-900 text-white shadow-[1.5px_1.5px_0px_#000]"
              : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          Pengesahan
        </button>
      </div>

      {/* Konten Naskah Dokumen */}
      <div className="flex flex-col gap-6">
        {/* Mukadimah */}
        {showMukadimah && (
          <div className="card-brutal p-5 sm:p-7 bg-[#FFFDF9] dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000000]">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b-2 border-black dark:border-[#475569]">
              <span className="w-2.5 h-2.5 bg-[#DC2626]" />
              <h4 className="font-heading font-black text-base uppercase text-slate-950 dark:text-slate-100">
                MUKADIMAH
              </h4>
            </div>
            <div className="space-y-3 text-justify leading-relaxed text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200">
              {OFFICIAL_CHARTER_MUKADIMAH.map((p, idx) => (
                <p key={idx} className="indent-6 sm:indent-8">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Daftar BAB & Pasal */}
        {filteredChapters.map((ch) => (
          <div
            key={ch.id}
            id={ch.id}
            className="card-brutal p-5 sm:p-7 bg-[var(--card-bg)] border-[2.5px] border-black dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col gap-4"
          >
            {/* Header Bab */}
            <div className="pb-3 border-b-2 border-black dark:border-[#475569]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-xs font-black uppercase text-[#DC2626] dark:text-[#FACC15] px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40">
                  {ch.roman}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {ch.articles.length} Pasal Terdaftar
                </span>
              </div>
              <h4 className="font-heading font-black text-lg sm:text-xl text-slate-950 dark:text-slate-100 uppercase tracking-tight mt-1">
                {ch.title}
              </h4>
            </div>

            {/* Daftar Pasal */}
            <div className="space-y-4">
              {ch.articles.map((art) => (
                <div
                  key={art.number}
                  className="p-3.5 sm:p-4 rounded bg-[#FFFDF9] dark:bg-[#161822] border border-black/20 dark:border-white/10 hover:border-black transition-colors"
                >
                  <h5 className="font-heading font-black text-sm text-slate-950 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-900 text-white dark:bg-[#FACC15] dark:text-black flex items-center justify-center text-[11px] font-mono font-black">
                      {art.number}
                    </span>
                    <span>Pasal {art.number} - {art.title}</span>
                  </h5>

                  <ol className="space-y-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 pl-7 list-decimal leading-relaxed">
                    {art.points.map((pt, pIdx) => (
                      <li key={pIdx}>{pt}</li>
                    ))}
                  </ol>

                  {art.note && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-black/10 dark:border-white/10 text-[11px] text-slate-500 font-mono italic">
                      Catatan: {art.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Jika Hasil Pencarian Kosong */}
        {filteredChapters.length === 0 && !showMukadimah && (
          <div className="p-8 text-center rounded border-2 border-dashed border-black/30 dark:border-white/30 text-slate-500 font-mono text-xs">
            Tidak ditemukan pasal atau kata kunci yang cocok dengan &quot;{searchQuery}&quot;.
          </div>
        )}

        {/* Lembar Pengesahan & Stempel Resmi */}
        {showSignatures && (
          <div className="card-brutal p-5 sm:p-7 bg-[#FFFDF9] dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex flex-col gap-5">
            <div className="pb-3 border-b-2 border-black dark:border-[#475569] text-center">
              <h4 className="font-heading font-black text-lg uppercase text-slate-950 dark:text-slate-100">
                LEMBAR PENGESAHAN DOKUMEN
              </h4>
              <p className="font-mono text-xs text-slate-500 mt-0.5">
                Ditetapkan di: {OFFICIAL_CHARTER_SIGNATORIES.ratificationLocation} • Tanggal: {OFFICIAL_CHARTER_SIGNATORIES.ratificationDate}
              </p>
            </div>

            {/* Grid Tanda Tangan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs font-mono">
              {/* Pendiri & Ketua Umum */}
              <div className="p-3.5 rounded bg-white dark:bg-[#14161F] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-black uppercase text-[#DC2626] dark:text-[#FACC15]">
                  {OFFICIAL_CHARTER_SIGNATORIES.founderLeader.role}
                </span>
                <div className="py-2 text-center border-b border-dashed border-black/20 dark:border-white/20 font-serif italic text-slate-400">
                  (Tertanda Resmi)
                </div>
                <strong className="text-slate-950 dark:text-slate-100 text-center font-bold">
                  {OFFICIAL_CHARTER_SIGNATORIES.founderLeader.name}
                </strong>
              </div>

              {/* Penasihat Organisasi */}
              <div className="p-3.5 rounded bg-white dark:bg-[#14161F] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  {OFFICIAL_CHARTER_SIGNATORIES.advisor.role}
                </span>
                <div className="py-2 text-center border-b border-dashed border-black/20 dark:border-white/20 font-serif italic text-slate-400">
                  (Tertanda Resmi)
                </div>
                <strong className="text-slate-950 dark:text-slate-100 text-center font-bold">
                  {OFFICIAL_CHARTER_SIGNATORIES.advisor.name}
                </strong>
              </div>

              {/* Sekretaris Jenderal */}
              <div className="p-3.5 rounded bg-white dark:bg-[#14161F] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  {OFFICIAL_CHARTER_SIGNATORIES.secGen.role}
                </span>
                <div className="py-2 text-center border-b border-dashed border-black/20 dark:border-white/20 font-serif italic text-slate-400">
                  (Tertanda Resmi)
                </div>
                <strong className="text-slate-950 dark:text-slate-100 text-center font-bold">
                  {OFFICIAL_CHARTER_SIGNATORIES.secGen.name}
                </strong>
              </div>

              {/* Saksi I */}
              <div className="p-3.5 rounded bg-white dark:bg-[#14161F] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  {OFFICIAL_CHARTER_SIGNATORIES.witness1.role}
                </span>
                <div className="py-2 text-center border-b border-dashed border-black/20 dark:border-white/20 font-serif italic text-slate-400">
                  (Tertanda Resmi)
                </div>
                <strong className="text-slate-950 dark:text-slate-100 text-center font-bold">
                  {OFFICIAL_CHARTER_SIGNATORIES.witness1.name}
                </strong>
              </div>

              {/* Saksi II */}
              <div className="p-3.5 rounded bg-white dark:bg-[#14161F] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between min-h-[110px]">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  {OFFICIAL_CHARTER_SIGNATORIES.witness2.role}
                </span>
                <div className="py-2 text-center border-b border-dashed border-black/20 dark:border-white/20 font-serif italic text-slate-400">
                  (Tertanda Resmi)
                </div>
                <strong className="text-slate-950 dark:text-slate-100 text-center font-bold">
                  {OFFICIAL_CHARTER_SIGNATORIES.witness2.name}
                </strong>
              </div>

              {/* Stempel Resmi */}
              <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/40 border-2 border-[#FACC15] shadow-[2px_2px_0px_#000] flex flex-col justify-between items-center text-center min-h-[110px]">
                <div className="w-8 h-8 rounded-full bg-[#FACC15] border border-black flex items-center justify-center text-black shadow-sm">
                  <Stamp size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 block">
                    STEMPEL RESMI ORGANISASI
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    No: {OFFICIAL_CHARTER_SIGNATORIES.stampNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Catatan Penggunaan Dokumen */}
            <div className="p-4 rounded bg-slate-100 dark:bg-[#14161F] border border-black/20 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] mb-1">
                <AlertCircle size={14} className="text-[#DC2626]" />
                <span>Catatan Legalitas &amp; Penggunaan Dokumen</span>
              </div>
              {OFFICIAL_CHARTER_DISCLAIMER.map((disc, dIdx) => (
                <p key={dIdx}>• {disc}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
