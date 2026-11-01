// ==========================================================================
// OFFICIAL CHARTER & PERMIT VIEWER - LSM PAGUYUBAN PIZZA SANDY SHORES
// Naskah Pakta Pendirian, AD/ART, dan Surat Izin Komunitas Pemerintah
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
  Download,
  Eye,
  FileCheck2,
} from "lucide-react";
import {
  OFFICIAL_CHARTER_METADATA,
  OFFICIAL_CHARTER_MUKADIMAH,
  OFFICIAL_CHARTER_CHAPTERS,
  OFFICIAL_CHARTER_SIGNATORIES,
  OFFICIAL_CHARTER_DISCLAIMER,
  GOVERNMENT_PERMIT_DATA,
  getOfficialCharterFullPlainText,
  getGovernmentPermitPlainText,
} from "../data/officialCharter";

export default function OfficialCharterViewer({ initialView = "PERMIT_HD", onShowToast }) {
  // Mode Tampilan Dokumen:
  // "PERMIT_HD" = Surat Izin Komunitas Pemerintah (Replika Digital HD)
  // "CHARTER"   = Pakta Pendirian & AD/ART (10 Bab)
  const [documentView, setDocumentView] = useState(initialView);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeChapterFilter, setActiveChapterFilter] = useState("ALL");
  const [copiedCharter, setCopiedCharter] = useState(false);
  const [copiedPermit, setCopiedPermit] = useState(false);

  // Filter bab & pasal AD/ART
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return OFFICIAL_CHARTER_CHAPTERS.map((ch) => {
      if (activeChapterFilter !== "ALL" && activeChapterFilter !== ch.id) {
        return null;
      }

      if (!q) return ch;

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

  // Handler Salin AD/ART
  async function handleCopyCharter() {
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
      setCopiedCharter(true);
      if (onShowToast) {
        onShowToast("Naskah Pakta Pendirian & AD/ART berhasil disalin!", "success");
      }
      setTimeout(() => setCopiedCharter(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin naskah:", err);
    }
  }

  // Handler Salin Surat Izin Pemerintah
  async function handleCopyPermit() {
    const text = getGovernmentPermitPlainText();
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
      setCopiedPermit(true);
      if (onShowToast) {
        onShowToast("Teks Surat Izin Komunitas Pemerintah berhasil disalin!", "success");
      }
      setTimeout(() => setCopiedPermit(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin surat izin:", err);
    }
  }

  const showMukadimah =
    (activeChapterFilter === "ALL" || activeChapterFilter === "MUKADIMAH") &&
    (!searchQuery.trim() ||
      OFFICIAL_CHARTER_MUKADIMAH.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase())));

  const showSignatures =
    (activeChapterFilter === "ALL" || activeChapterFilter === "SIGNATURE") && !searchQuery.trim();

  return (
    <div className="flex flex-col gap-5 text-slate-900 dark:text-slate-100">
      {/* Tab Switcher Utama Dokumen Resmi */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b-2 border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => setDocumentView("PERMIT_HD")}
          className={`py-2 px-3.5 rounded text-xs font-heading font-black border-2 border-black cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
            documentView === "PERMIT_HD"
              ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000]"
              : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          <FileCheck2 size={15} />
          <span>Surat Izin Pemerintah (HD Digital)</span>
        </button>

        <button
          type="button"
          onClick={() => setDocumentView("CHARTER")}
          className={`py-2 px-3.5 rounded text-xs font-heading font-black border-2 border-black cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
            documentView === "CHARTER"
              ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000]"
              : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          <Scale size={15} />
          <span>Pakta Pendirian &amp; AD/ART (10 Bab)</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAMPILAN 1: SURAT IZIN KOMUNITAS PEMERINTAH (REPLIKA DIGITAL HD)     */}
      {/* ==================================================================== */}
      {documentView === "PERMIT_HD" && (
        <div className="flex flex-col items-center gap-5">
          {/* Action Bar */}
          <div className="w-full max-w-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Dokumen Resmi Terverifikasi Government State of San Andreas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={GOVERNMENT_PERMIT_DATA.imagePath}
                download="Surat_Izin_Komunitas_LSM_PPS.jpg"
                className="py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                title="Download file gambar dokumen utuh"
              >
                <Download size={13} />
                <span>Unduh Gambar (.jpg)</span>
              </a>

              <button
                type="button"
                onClick={handleCopyPermit}
                className={`py-1.5 px-3 rounded text-xs font-heading font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1.5 ${
                  copiedPermit
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-[#FACC15] hover:bg-[#EAB308] text-slate-950"
                }`}
              >
                {copiedPermit ? (
                  <>
                    <Check size={13} className="stroke-[3]" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sertifikat Kertas Asli HD */}
          <div className="w-full max-w-2xl rounded-sm bg-[#EFECE6] text-slate-900 border-[3px] border-[#2C2925] shadow-[6px_6px_0px_#000000] p-6 sm:p-10 font-serif leading-relaxed relative overflow-hidden select-text">
            {/* Header Dokumen */}
            <div className="text-center space-y-1 pb-4">
              <div className="text-[10px] tracking-[0.25em] font-mono text-[#8C3A3A] font-black uppercase">
                {GOVERNMENT_PERMIT_DATA.headerTitle}
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1815] font-serif">
                {GOVERNMENT_PERMIT_DATA.title}
              </h2>
              <div className="w-48 h-0.5 bg-[#4A453E] mx-auto mt-2" />
              <div className="w-36 h-0.5 bg-[#4A453E] mx-auto mt-0.5" />
            </div>

            {/* Issuer Information Box */}
            <div className="grid grid-cols-12 gap-3.5 my-5 items-center">
              {/* Gold Seal San Andreas */}
              <div className="col-span-4 sm:col-span-3 flex justify-center items-center">
                <img
                  src={GOVERNMENT_PERMIT_DATA.sealPath}
                  alt="San Andreas Government Seal"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-full drop-shadow-sm select-none"
                />
              </div>

              {/* Issuer Meta Box */}
              <div className="col-span-8 sm:col-span-9 p-3 rounded-lg bg-white/70 border border-[#4A453E]/40 font-mono text-xs text-slate-800 grid grid-cols-2 gap-2 shadow-xs">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">ISSUER FIRSTNAME</span>
                  <span className="font-bold text-xs">{GOVERNMENT_PERMIT_DATA.issuer.firstName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">ISSUER LASTNAME</span>
                  <span className="font-bold text-xs">{GOVERNMENT_PERMIT_DATA.issuer.lastName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">ISSUER DOB</span>
                  <span className="font-bold text-xs">{GOVERNMENT_PERMIT_DATA.issuer.dob}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">JOB</span>
                  <span className="font-bold text-xs tracking-wider">{GOVERNMENT_PERMIT_DATA.issuer.job}</span>
                </div>
              </div>
            </div>

            {/* Section Divider: INFORMATION */}
            <div className="flex items-center justify-center gap-3 my-5">
              <div className="flex-1 h-[1px] bg-[#8C8274]/50" />
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-[#5C5549] tracking-[0.3em] uppercase whitespace-nowrap">
                • I N F O R M A T I O N •
              </span>
              <div className="flex-1 h-[1px] bg-[#8C8274]/50" />
            </div>

            {/* Body Perihal & Permohonan */}
            <div className="space-y-3.5 text-xs sm:text-sm text-[#24211D] text-justify leading-relaxed">
              <p className="font-bold italic">
                Perihal: {GOVERNMENT_PERMIT_DATA.subject}
              </p>
              <p className="italic">
                {GOVERNMENT_PERMIT_DATA.preamble}
              </p>

              {/* Data Komunitas */}
              <div className="p-3.5 rounded bg-white/50 border-l-4 border-[#2C2925] space-y-1 font-mono text-xs not-italic">
                <div className="flex">
                  <span className="w-36 text-slate-600 font-bold">Nama Komunitas</span>
                  <span className="font-black text-slate-900">: {GOVERNMENT_PERMIT_DATA.community.name}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-600 font-bold">Jenis Kegiatan</span>
                  <span className="font-black text-slate-900">: {GOVERNMENT_PERMIT_DATA.community.activityType}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-600 font-bold">Alamat Sekretariat</span>
                  <span className="font-black text-slate-900">: {GOVERNMENT_PERMIT_DATA.community.secretariat}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-600 font-bold">Penanggung Jawab</span>
                  <span className="font-black text-slate-900">: {GOVERNMENT_PERMIT_DATA.community.responsiblePerson}</span>
                </div>
              </div>

              {/* Ketentuan Izin */}
              <div className="space-y-2 pt-2">
                <p className="font-bold">Ketentuan Izin:</p>
                <ol className="space-y-2 pl-5 list-decimal italic">
                  {GOVERNMENT_PERMIT_DATA.provisions.map((prov, pIdx) => (
                    <li key={pIdx} className="leading-relaxed">
                      {prov}
                    </li>
                  ))}
                </ol>
              </div>

              <p className="italic pt-2">
                {GOVERNMENT_PERMIT_DATA.closing}
              </p>
            </div>

            {/* Tanda Tangan Head Division */}
            <div className="mt-6 pt-4 border-t border-[#4A453E]/30 flex flex-col sm:flex-row sm:items-end justify-between gap-4 font-mono text-xs">
              <div>
                <p className="italic">Tanggal : {GOVERNMENT_PERMIT_DATA.issuanceDate}</p>
                <p className="font-bold">{GOVERNMENT_PERMIT_DATA.headDivision}</p>
                <p className="font-serif italic text-base mt-2 font-bold text-slate-800">
                  {GOVERNMENT_PERMIT_DATA.headName}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase text-slate-500">{GOVERNMENT_PERMIT_DATA.permitType}</p>
                <p className="font-black text-xs text-slate-900">{GOVERNMENT_PERMIT_DATA.permitNumber}</p>
              </div>
            </div>

            {/* Section Divider: TERMS AND SIGNING */}
            <div className="flex items-center justify-center gap-3 mt-8 mb-4">
              <div className="flex-1 h-[1px] bg-[#8C8274]/50" />
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-[#5C5549] tracking-[0.3em] uppercase whitespace-nowrap">
                • TERMS AND SIGNING •
              </span>
              <div className="flex-1 h-[1px] bg-[#8C8274]/50" />
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                <p className="sm:col-span-8 text-[10px] leading-relaxed text-slate-600 font-mono text-justify">
                  {GOVERNMENT_PERMIT_DATA.termsNote}
                </p>

                {/* Box Tanda Tangan Pemerintah */}
                <div className="sm:col-span-4 p-3 rounded bg-white/90 border border-black/30 flex flex-col justify-between h-24">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold">
                    <span className="text-slate-500">SIGN HERE</span>
                    <span className="text-red-700 font-black">COPY</span>
                  </div>
                  <div className="text-center font-serif italic text-base font-black text-indigo-950 -rotate-3">
                    {GOVERNMENT_PERMIT_DATA.signature.signer}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 text-right">
                    Date: {GOVERNMENT_PERMIT_DATA.signature.date}
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* ==================================================================== */}
      {/* TAMPILAN 2: PAKTA PENDIRIAN & AD/ART (10 BAB & 27 PASAL)              */}
      {/* ==================================================================== */}
      {documentView === "CHARTER" && (
        <div className="flex flex-col gap-6">
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Action: Tombol Salin Naskah */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCharter}
                className={`py-2 px-4 rounded text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-2 ${
                  copiedCharter
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-[#FACC15] hover:bg-[#EAB308] text-slate-950"
                }`}
                title="Salin seluruh teks naskah untuk ditempel ke Discord atau dokumen lainnya"
              >
                {copiedCharter ? (
                  <>
                    <Check size={14} className="stroke-[3]" />
                    <span>Naskah Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Salin Naskah AD/ART</span>
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
                  activeChapterFilter === ch.id
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
      )}
    </div>
  );
}
