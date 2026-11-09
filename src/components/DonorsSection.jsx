import React, { useState, useEffect } from "react";
import {
  Users,
  ChevronRight,
  X,
  Info,
} from "lucide-react";
import {
  subscribeKasLedger,
  loadKasLedgerCloud,
  formatKasDate,
} from "../services/kasService.js";

const FALLBACK_DONORS = [
  {
    id: "in-donor-carlos",
    name: "SHERIFF CARLOS",
    category: "Donasi Sukarela & Warga",
    contributionType: "Fasilitas & Sarana Warga",
    amount: 80000,
    date: "9 Nov 2026",
    notes: "Bantuan sukarela untuk sarana dan fasilitas warga Sandy Shores.",
  },
  {
    id: "in-donor-mat-anee",
    name: "SHERIFF MAT ANEE",
    category: "Donasi Sukarela & Warga",
    contributionType: "Kegiatan Sosial Warga",
    amount: 50000,
    date: "9 Nov 2026",
    notes: "Bantuan sukarela untuk kegiatan sosial dan bakti paguyuban.",
  },
  {
    id: "in-donor-alex",
    name: "SHERIFF ALEX",
    category: "Donasi Sukarela & Warga",
    contributionType: "Kas & Operasional Paguyuban",
    amount: 11111,
    date: "9 Nov 2026",
    notes: "Bantuan sukarela untuk kas dan operasional paguyuban.",
  },
];

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

  // Format tanggal selalu lengkap dengan tanggal, bulan, dan tahun (contoh: 9 Nov 2026)
  const dateStr = (tx.timestamp ? formatKasDate(tx.timestamp) : null) || tx.date || "9 Nov 2026";

  return {
    id: tx.id,
    name: upperName,
    category,
    contributionType,
    amount: Number(tx.amount) || 0,
    date: dateStr,
    notes: tx.notes || tx.title || "Dukungan sukarela untuk paguyuban.",
  };
}

export default function DonorsSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [donors, setDonors] = useState(FALLBACK_DONORS);

  useEffect(() => {
    // Muat & langganan langsung dari buku kas keuangan (Kategori: Donasi Sukarela & Warga)
    function processKasList(list) {
      if (!Array.isArray(list)) return;
      const donorTxs = list.filter((tx) => {
        const cat = (tx.category || "").toLowerCase();
        const type = (tx.type || "").toUpperCase();
        return type === "INCOME" && (cat.includes("sukarela") || cat.includes("donasi"));
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

  if (!donors || donors.length === 0) return null;

  return (
    <>
      {/* =========================================================================
          TOP NOTICE BAR (RESPONSIF TEMA TERANG & GELAP, RAPIH & PRESISI)
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
          onClick={() => setModalOpen(true)}
          title="Klik untuk melihat detail donatur"
          className="relative flex-1 overflow-hidden py-0.5 cursor-pointer"
        >
          {/* Edge Fades: Halus untuk Terang & Gelap */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-[#FAF7EE] dark:from-[#07090E] to-transparent z-10 transition-colors" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-[#FAF7EE] dark:from-[#07090E] to-transparent z-10 transition-colors" />

          {/* Running Track */}
          <div className="animate-marquee flex items-center">
            {/* Set 1 */}
            <div className="flex items-center gap-3 shrink-0 pr-3">
              {donors.map((d) => (
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
                <span>Terima kasih atas segala kepedulian bagi Paguyuban Pizza Sandy Shores</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
            </div>

            {/* Set 2 (seamless clone) */}
            <div className="flex items-center gap-3 shrink-0 pr-3" aria-hidden="true">
              {donors.map((d) => (
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
                <span>Terima kasih atas segala kepedulian bagi Paguyuban Pizza Sandy Shores</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700 mx-1 text-xs">✦</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 px-2 py-0.5 mr-0.5 rounded bg-white hover:bg-slate-100 text-slate-900 border border-black/20 shadow-[1px_1px_0px_#000] dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/15 dark:shadow-none text-[9px] font-heading font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 z-20"
        >
          <span>Detail</span>
          <ChevronRight size={11} />
        </button>
      </div>

      {/* =========================================================================
          MODAL DETAIL (BERSIH, TANPA TOMBOL PORTAL TRANSPARANSI)
          ========================================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#12141D] text-slate-900 dark:text-slate-100 rounded-xl border-2 border-black dark:border-white/20 shadow-xl p-5 sm:p-6 relative select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5 pb-3 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="font-heading font-bold text-lg sm:text-xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                  Daftar Orang Baik
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Donasi sukarela & warga untuk Paguyuban Pizza Sandy Shores.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0 transition-colors"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* List / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
              {donors.map((donor) => (
                <div
                  key={donor.id}
                  className="p-4 rounded-lg bg-[#FAF8F5] dark:bg-[#181B26] border border-black/15 dark:border-white/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-black/10 dark:border-white/10">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-heading font-bold uppercase tracking-wide border border-emerald-300 dark:border-emerald-800">
                        ORANG BAIK
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium">
                        {donor.date}
                      </span>
                    </div>

                    <h4 className="font-heading font-bold text-sm sm:text-base text-slate-950 dark:text-slate-100 uppercase mb-0.5">
                      {donor.name}
                    </h4>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 font-medium">
                      {donor.category || "Donasi Sukarela & Warga"}
                    </div>

                    <div className="text-[11px] text-slate-700 dark:text-slate-300 mb-2">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Bentuk Dukungan:</span>
                      {donor.contributionType}
                    </div>

                    {donor.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        "{donor.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom info: Ucapan Terima Kasih & Akuntabilitas (Tanpa Tombol Transparansi) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/25 dark:border-amber-400/15 text-center text-xs">
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-sans">
                Terima kasih yang sebesar-besarnya atas segala bentuk kepedulian dan kebaikan yang telah diberikan. Seluruh dukungan dicatat secara amanah dan dialokasikan sepenuhnya untuk kemaslahatan warga serta kegiatan Paguyuban Pizza Sandy Shores.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
