import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  X,
  Info,
  Calendar,
  Heart,
  Phone,
  Copy,
  Check,
} from "lucide-react";
import {
  subscribeKasLedger,
  loadKasLedgerCloud,
  formatKasDate,
  parseDateInputToTimestamp,
  formatCurrency,
} from "../services/kasService.js";

const INDO_MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getYearMonthFromDate(d) {
  const year = d.getFullYear();
  const mIdx = d.getMonth();
  const monthKey = `${year}-${String(mIdx + 1).padStart(2, "0")}`;
  const monthLabel = `${INDO_MONTH_NAMES[mIdx]} ${year}`;
  return { monthKey, monthLabel };
}

const FALLBACK_DONORS = [
  {
    id: "in-donor-carlos",
    name: "SHERIFF CARLOS",
    category: "Donasi Sukarela & Warga",
    contributionType: "Fasilitas & Sarana Warga",
    amount: 80000,
    date: "9 Nov 2026",
    timestamp: 1794182400000,
    monthKey: "2026-11",
    monthLabel: "November 2026",
    notes: "Bantuan sukarela untuk sarana dan fasilitas warga Sandy Shores.",
  },
  {
    id: "in-donor-mat-anee",
    name: "SHERIFF MAT ANEE",
    category: "Donasi Sukarela & Warga",
    contributionType: "Kegiatan Sosial Warga",
    amount: 50000,
    date: "9 Nov 2026",
    timestamp: 1794182400000,
    monthKey: "2026-11",
    monthLabel: "November 2026",
    notes: "Bantuan sukarela untuk kegiatan sosial dan bakti paguyuban.",
  },
  {
    id: "in-donor-alex",
    name: "SHERIFF ALEX",
    category: "Donasi Sukarela & Warga",
    contributionType: "Kas & Operasional Paguyuban",
    amount: 11111,
    date: "9 Nov 2026",
    timestamp: 1794182400000,
    monthKey: "2026-11",
    monthLabel: "November 2026",
    notes: "Bantuan sukarela untuk kas dan operasional paguyuban.",
  },
];

function extractDonorMonthInfo(tx) {
  let ts = tx.timestamp;
  if (!ts && tx.date) {
    ts = parseDateInputToTimestamp(tx.date);
  }
  if (!ts && tx.createdAt) {
    ts = typeof tx.createdAt === "number" ? tx.createdAt : Date.parse(tx.createdAt);
  }
  const d = ts ? new Date(ts) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  const { monthKey, monthLabel } = getYearMonthFromDate(valid);
  return {
    timestamp: valid.getTime(),
    monthKey,
    monthLabel,
  };
}

function parseDonorFromKasTx(tx) {
  let name = (tx.memberName || "").trim();
  if (!name && tx.title) {
    name = tx.title
      .replace(/^Donasi\s*(Sukarela)?\s*(-|\(Dari:)?\s*/i, "")
      .replace(/^Sumbangan\s*(Sukarela)?\s*(-|\(Dari:)?\s*/i, "")
      .replace(/\)$/, "")
      .trim();
  }
  if (!name) name = "ORANG BAIK";

  const upperName = name.toUpperCase();
  const category = tx.category || "Donasi Sukarela & Warga";

  let contributionType = tx.notes ? tx.notes.trim() : "Dukungan Kegiatan Warga";
  if (contributionType.length > 38) {
    contributionType = contributionType.slice(0, 38) + "...";
  }

  const { timestamp, monthKey, monthLabel } = extractDonorMonthInfo(tx);
  const dateStr =
    (tx.timestamp ? formatKasDate(tx.timestamp) : null) ||
    tx.date ||
    formatKasDate(timestamp);

  return {
    id: tx.id,
    name: upperName,
    category,
    contributionType,
    amount: Number(tx.amount) || 0,
    date: dateStr,
    timestamp,
    monthKey,
    monthLabel,
    notes: tx.notes || tx.title || "Dukungan sukarela untuk paguyuban.",
  };
}

export default function DonorsSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [donors, setDonors] = useState(FALLBACK_DONORS);
  const [copiedPhone, setCopiedPhone] = useState(false);

  function handleCopyDonationPhone() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("66204074");
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2200);
    }
  }

  // Informasi bulan berjalan saat ini
  const [currentMonthInfo] = useState(() => getYearMonthFromDate(new Date()));

  const [selectedMonthKey, setSelectedMonthKey] = useState(
    () => currentMonthInfo.monthKey
  );

  useEffect(() => {
    // Muat & langganan langsung dari buku kas keuangan (Kategori: Donasi Sukarela & Warga)
    function processKasList(list) {
      if (!Array.isArray(list)) return;
      const donorTxs = list.filter((tx) => {
        const cat = (tx.category || "").toLowerCase();
        const type = (tx.type || "").toUpperCase();
        return (
          type === "INCOME" && (cat.includes("sukarela") || cat.includes("donasi"))
        );
      });

      if (donorTxs.length > 0) {
        setDonors(donorTxs.map(parseDonorFromKasTx));
      }
    }

    loadKasLedgerCloud().then(processKasList);
    const unsub = subscribeKasLedger(processKasList);
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  // Filter donatur khusus untuk running text di bulan berjalan (reset otomatis tiap ganti bulan)
  const currentMonthDonors = useMemo(() => {
    return donors.filter((d) => d.monthKey === currentMonthInfo.monthKey);
  }, [donors, currentMonthInfo.monthKey]);

  // Daftar bulan yang tersedia di arsip donasi
  const availableMonths = useMemo(() => {
    const map = new Map();
    // Pastikan bulan berjalan selalu tersedia
    map.set(currentMonthInfo.monthKey, currentMonthInfo.monthLabel);

    donors.forEach((d) => {
      if (d.monthKey && d.monthLabel) {
        map.set(d.monthKey, d.monthLabel);
      }
    });

    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => ({
      key,
      label: map.get(key),
      isCurrent: key === currentMonthInfo.monthKey,
    }));
  }, [donors, currentMonthInfo]);

  // Donatur yang ditampilkan di tabel modal sesuai pilihan bulan
  const filteredModalDonors = useMemo(() => {
    if (selectedMonthKey === "ALL") {
      return donors;
    }
    return donors.filter((d) => d.monthKey === selectedMonthKey);
  }, [donors, selectedMonthKey]);

  const totalPeriodAmount = useMemo(() => {
    return filteredModalDonors.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [filteredModalDonors]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonthKey === "ALL") return "Semua Riwayat Donasi";
    const found = availableMonths.find((m) => m.key === selectedMonthKey);
    return found ? found.label : selectedMonthKey;
  }, [selectedMonthKey, availableMonths]);

  if (!donors || donors.length === 0) return null;

  return (
    <>
      {/* =========================================================================
          TOP NOTICE BAR (RUNNING TEXT OTOMATIS RESET TIAP BULAN)
          ========================================================================= */}
      <div
        id="notice-orang-baik"
        className="w-full h-8 sm:h-9 bg-[#FAF7EE]/95 dark:bg-[#07090E]/95 backdrop-blur-md text-slate-900 dark:text-slate-100 border-b border-black/15 dark:border-white/10 px-2.5 sm:px-4 flex items-center overflow-hidden relative select-none transition-colors"
      >
        {/* Pinned Label */}
        <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded bg-[#FACC15] text-[#111827] border border-black/30 dark:border-black/60 shadow-[1px_1px_0px_#000] font-heading font-black uppercase text-[9px] tracking-wider z-20">
          <Info size={11} className="shrink-0 text-slate-950" />
          <span>ORANG BAIK</span>
        </div>

        {/* Marquee Track Container */}
        <div
          onClick={() => {
            setSelectedMonthKey(currentMonthInfo.monthKey);
            setModalOpen(true);
          }}
          title="Klik untuk melihat tabel & arsip donasi bulanan"
          className="relative flex-1 overflow-hidden py-0.5 cursor-pointer"
        >
          {/* Edge Fades: Halus untuk Terang & Gelap */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-[#FAF7EE] dark:from-[#07090E] to-transparent z-10 transition-colors" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-[#FAF7EE] dark:from-[#07090E] to-transparent z-10 transition-colors" />

          {/* Running Track */}
          <div className="animate-marquee flex items-center">
            {currentMonthDonors.length > 0 ? (
              <>
                {/* Set 1 */}
                <div className="flex items-center gap-3 shrink-0 pr-3">
                  {currentMonthDonors.map((d) => (
                    <div
                      key={`nb1-${d.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 shrink-0"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-heading font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs">
                        {d.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                        {d.category || "Donasi Sukarela & Warga"}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                        {d.contributionType}
                      </span>
                    </div>
                  ))}
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-[11px] font-medium shrink-0">
                    <span>
                      Terima kasih atas segala kepedulian bagi Paguyuban Pizza Sandy Shores ({currentMonthInfo.monthLabel})
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                </div>

                {/* Set 2 (seamless clone) */}
                <div className="flex items-center gap-3 shrink-0 pr-3" aria-hidden="true">
                  {currentMonthDonors.map((d) => (
                    <div
                      key={`nb2-${d.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 shrink-0"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-heading font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs">
                        {d.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                        {d.category || "Donasi Sukarela & Warga"}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                        {d.contributionType}
                      </span>
                    </div>
                  ))}
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-[11px] font-medium shrink-0">
                    <span>
                      Terima kasih atas segala kepedulian bagi Paguyuban Pizza Sandy Shores ({currentMonthInfo.monthLabel})
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                </div>
              </>
            ) : (
              <>
                {/* Fallback running text jika bulan baru belum ada donasi tercatat */}
                <div className="flex items-center gap-3 shrink-0 pr-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 text-xs font-medium shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>
                      Periode {currentMonthInfo.monthLabel}: Belum ada donasi baru tercatat bulan ini
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs font-medium shrink-0">
                    <span>Jadilah Orang Baik pertama di bulan {currentMonthInfo.monthLabel}!</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                  <span className="text-[11px] text-slate-500">
                    Klik "Detail" untuk membuka tabel arsip donasi bulan-bulan sebelumnya
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 pr-4" aria-hidden="true">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 text-xs font-medium shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>
                      Periode {currentMonthInfo.monthLabel}: Belum ada donasi baru tercatat bulan ini
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs font-medium shrink-0">
                    <span>Jadilah Orang Baik pertama di bulan {currentMonthInfo.monthLabel}!</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                  <span className="text-[11px] text-slate-500">
                    Klik "Detail" untuk membuka tabel arsip donasi bulan-bulan sebelumnya
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            setSelectedMonthKey(currentMonthInfo.monthKey);
            setModalOpen(true);
          }}
          className="shrink-0 px-2 py-0.5 mr-0.5 rounded bg-white hover:bg-slate-100 text-slate-900 border border-black/20 shadow-[1px_1px_0px_#000] dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/15 dark:shadow-none text-[9px] font-heading font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 z-20"
        >
          <span>Detail</span>
          <ChevronRight size={11} />
        </button>
      </div>

      {/* =========================================================================
          MODAL DETAIL & TABEL ARSIP DONASI BULANAN (PORTAL KE BODY AGAR BEBAS DARI STACKING CONTEXT HEADER)
          ========================================================================= */}
      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[90vh] bg-[#FFFDF9] dark:bg-[#12141D] text-slate-900 dark:text-slate-100 rounded-2xl border border-black/15 dark:border-white/10 shadow-2xl my-auto overflow-hidden flex flex-col select-text"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Header Banner (Selaras dengan BansosModal & DoorprizeModal) */}
              <div className="bg-[#FACC15] text-[#111827] border-b border-black/15 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#DC2626] flex items-center justify-center font-black border border-black/15 shadow-xs shrink-0">
                    <Heart size={20} className="fill-current text-[#DC2626]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/70 block">
                      TRANSPARANSI DONASI WARGA
                    </span>
                    <h3 className="font-heading font-black text-base sm:text-lg leading-tight uppercase truncate">
                      Daftar Orang Baik & Arsip Donasi
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Tutup"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-red-500/80 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                  title="Tutup (Esc)"
                >
                  <X size={18} className="stroke-[3]" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {/* Banner Kotak Informasi Donasi In-Game (Transfer IC) */}
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent dark:from-amber-400/10 dark:via-amber-400/5 border border-amber-500/35 dark:border-amber-400/25 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#FACC15] text-[#111827] flex items-center justify-center font-black border border-yellow-500/70 shadow-xs shrink-0 mt-0.5">
                      <Phone size={20} className="text-[#DC2626]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-[#FACC15] text-slate-950 uppercase tracking-wider shadow-xs">
                          IME Roleplay
                        </span>
                      </div>
                      <h4 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        Salurkan Donasi & Dukungan Warga
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-sans mt-1 leading-relaxed max-w-xl">
                        Bagi warga Sandy Shores maupun masyarakat luas yang ingin berpartisipasi mendukung kegiatan sosial, sarana prasarana, dan operasional paguyuban, Anda dapat menyalurkan donasi secara langsung melalui cash atau transfer.
                      </p>
                    </div>
                  </div>

                  {/* Rekening / Kontak Box */}
                  <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-[#161922] border border-black/15 dark:border-white/10 shadow-xs">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        NOMOR TELEPON / REKENING IC
                      </span>
                      <strong className="text-xl sm:text-2xl font-mono font-black text-[#DC2626] dark:text-[#FACC15] tracking-wider block mt-0.5">
                        66204074
                      </strong>
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-sans font-bold block">
                        a.n. Kwaza Waza
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Pengurus LSM Paguyuban Pizza Sandy Shores
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyDonationPhone}
                      className={`px-3.5 py-2 rounded-lg text-xs font-heading font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap active:translate-y-0.5 w-full sm:w-auto ${
                        copiedPhone
                          ? "bg-emerald-600 text-white border-emerald-500"
                          : "bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border-yellow-500/80"
                      }`}
                      title="Salin nomor telepon IC donasi ke clipboard"
                    >
                      {copiedPhone ? (
                        <>
                          <Check size={14} className="text-white" />
                          <span>Nomor Berhasil Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-[#DC2626]" />
                          <span>Salin No HP (66204074)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filter Tabs Periode Bulan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#DC2626]" />
                  <span>Pilih Periode Donasi:</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {availableMonths.length} Periode Tersedia
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {availableMonths.map((m) => {
                  const isActive = selectedMonthKey === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setSelectedMonthKey(m.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isActive
                          ? "bg-[#FACC15] text-black font-black border-yellow-500/80 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 border-black/15 dark:border-white/10"
                      }`}
                    >
                      {m.isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      <span>{m.label}</span>
                      {m.isCurrent && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 text-slate-900 font-mono font-bold">
                          Bulan Ini
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSelectedMonthKey("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase whitespace-nowrap transition-all cursor-pointer border ${
                    selectedMonthKey === "ALL"
                      ? "bg-[#FACC15] text-black font-black border-yellow-500/80 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 border-black/15 dark:border-white/10"
                  }`}
                >
                  Semua Riwayat
                </button>
              </div>
            </div>

            {/* Quick Stats Banner Periode Terpilih */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-black/15 dark:border-white/10 bg-amber-50/70 dark:bg-[#191D28] shadow-xs">
              <div>
                <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
                  PERIODE AKTIF
                </span>
                <strong className="font-heading font-black text-sm text-slate-900 dark:text-white uppercase">
                  {selectedMonthLabel}
                </strong>
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
                  TOTAL ORANG BAIK
                </span>
                <strong className="font-heading font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {filteredModalDonors.length} Donatur
                </strong>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
                  TOTAL TERKUMPUL
                </span>
                <strong className="font-heading font-black text-sm text-[#DC2626] dark:text-[#FACC15]">
                  {formatCurrency(totalPeriodAmount)}
                </strong>
              </div>
            </div>

            {/* Tabel Arsip Donasi */}
            {filteredModalDonors.length === 0 ? (
              <div className="py-12 text-center rounded-xl border-2 border-dashed border-black/20 text-slate-500 dark:text-slate-400 font-mono text-xs space-y-1">
                <p className="font-bold">Belum ada donasi tercatat untuk periode {selectedMonthLabel}.</p>
                <p className="text-[11px]">Jadilah Orang Baik pertama yang tercatat di buku kas Sandy Shores!</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-black/15 dark:border-white/10 shadow-xs">
                <table className="w-full text-left text-xs border-collapse bg-white dark:bg-[#161922]">
                  <thead>
                    <tr className="bg-[#FACC15] text-[#111827] border-b border-black/20 font-heading font-black uppercase text-[10px] sm:text-[11px] tracking-wider">
                      <th className="py-2.5 px-3 whitespace-nowrap">Tanggal</th>
                      <th className="py-2.5 px-3">Nama Donatur</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Nominal</th>
                      <th className="py-2.5 px-3">Bentuk Dukungan / Catatan</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/15 font-sans">
                    {filteredModalDonors.map((donor) => (
                      <tr
                        key={donor.id}
                        className="hover:bg-amber-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {donor.date}
                        </td>
                        <td className="py-2.5 px-3 font-heading font-black text-slate-900 dark:text-white uppercase whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{donor.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {donor.amount > 0 ? formatCurrency(donor.amount) : "Sukarela"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <div className="font-medium text-xs text-slate-900 dark:text-slate-100">
                            {donor.contributionType}
                          </div>
                          {donor.notes && donor.notes !== donor.contributionType && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-1">
                              "{donor.notes}"
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                            {donor.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

              {/* Bottom info: Ucapan Terima Kasih & Akuntabilitas */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/25 dark:border-amber-400/15 text-center text-xs space-y-1">
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-sans">
                  Terima kasih yang sebesar-besarnya atas segala bentuk kepedulian dan kebaikan yang telah diberikan. Seluruh dukungan dicatat secara amanah dan dialokasikan sepenuhnya untuk kemaslahatan warga serta kegiatan Paguyuban Pizza Sandy Shores.
                </p>
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  Setelah melakukan transfer, silakan konfirmasi ke Kwaza Waza (No HP IC: <strong>66204074</strong>).
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
