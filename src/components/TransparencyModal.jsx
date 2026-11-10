// ==========================================================================
// MODAL PORTAL TRANSPARANSI & LAPORAN PEMERINTAH (SAN ANDREAS STATE GOVERNMENT)
// LSM PAGUYUBAN PIZZA SANDY SHORES (GTA V IME ROLEPLAY)
// URL: /transparansi atau /laporan (Dapat langsung dikirim ke Government)
// Fitur: Laporan Real-Time Voucher Jasra & Bansos Warga, Salin Link Resmi, Cetak/PDF
// ==========================================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  HeartHandshake,
  Gift,
  Search,
  Copy,
  Check,
  Printer,
  ExternalLink,
  ShieldCheck,
  Building2,
  UserCheck,
  UserX,
  Calendar,
  DollarSign,
  Utensils,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  subscribeJasraBatchesCloud,
  subscribeJasraDistributionsCloud,
  calculateBatchRemaining,
  calculateRecipientRemaining,
  formatJasraDate,
  formatJasraShortDate,
  isValidJasraBatch,
  getActiveJasraBatch,
  getBatchDistributions,
  computeBatchMetrics,
  buildJasraBatchSelectOptions,
  exportJasraDistributionsToExcel,
} from "../services/jasraService";
import BrutalistSelect from "./BrutalistSelect";
import JasraBatchValidityBadge from "./JasraBatchValidityBadge";
import {
  subscribeMembersCloud,
  subscribeExternalJasraCloud,
} from "../services/memberService";
import {
  subscribeBansosClaimsCloud,
  subscribeBansosProgramsCloud,
  exportBansosToExcel,
} from "../services/bansosService";

export default function TransparencyModal({
  isOpen,
  onClose,
  onShowToast,
  initialTab = "jasra", // "jasra" | "bansos"
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab with initialTab when opened or changed
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Dedicated View Detection:
  // User rule: "klo kita link jasra otomatis tampilin jasra aja. jangan sama yg bansos juga gitu"
  // Saat dibuka melalui link spesifik (?tab=jasra atau ?tab=bansos), kunci tampilan khusus ke kategori tersebut saja
  const isDedicatedView = useMemo(() => {
    if (typeof window === "undefined") return true;
    const search = new URLSearchParams(window.location.search);
    const tabParam = search.get("tab")?.toLowerCase();
    if (tabParam === "jasra" || tabParam === "bansos") return true;
    const path = window.location.pathname.toLowerCase();
    if (path.includes("bansos") || path.includes("jasra")) return true;
    return Boolean(initialTab);
  }, [initialTab, isOpen]);

  // Jasra Data States
  const [batches, setBatches] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [externalJasraList, setExternalJasraList] = useState([]);

  // Bansos Data States
  const [bansosClaims, setBansosClaims] = useState([]);
  const [bansosPrograms, setBansosPrograms] = useState([]);

  // Filters & Search
  const [selectedBatchId, setSelectedBatchId] = useState("ACTIVE");
  const [jasraSearch, setJasraSearch] = useState("");
  const [jasraFilter, setJasraFilter] = useState("ALL"); // ALL | MEMBER | NON_MEMBER | ACTIVE | EXPIRED
  const [bansosSearch, setBansosSearch] = useState("");
  const [bansosFilter, setBansosFilter] = useState("ALL"); // ALL | CLAIMED | UNCLAIMED

  // Sync initial tab when modal opens or prop changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time Cloud Subscriptions
  useEffect(() => {
    if (!isOpen) return;

    const unsubBatches = subscribeJasraBatchesCloud((list) => {
      setBatches(list);
    });

    const unsubDistributions = subscribeJasraDistributionsCloud((list) => {
      setDistributions(list);
    });

    const unsubMembers = subscribeMembersCloud((list) => {
      setMembersList(list);
    });

    const unsubExternal = subscribeExternalJasraCloud((list) => {
      setExternalJasraList(list);
    });

    const unsubBansos = subscribeBansosClaimsCloud((list) => {
      setBansosClaims(list);
    });

    const unsubPrograms = subscribeBansosProgramsCloud((list) => {
      setBansosPrograms(list);
    });

    return () => {
      unsubBatches();
      unsubDistributions();
      unsubMembers();
      unsubExternal();
      unsubBansos();
      unsubPrograms();
    };
  }, [isOpen]);

  // Valid Batches & Viewed Batch (defaults strictly to Active Batch)
  const validBatches = useMemo(() => {
    return [...(batches || [])]
      .filter(isValidJasraBatch)
      .sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
  }, [batches]);

  const activeBatch = useMemo(() => getActiveJasraBatch(batches), [batches]);

  const viewedBatch = useMemo(() => {
    if (selectedBatchId === "ACTIVE") return activeBatch;
    return validBatches.find((b) => b.id === selectedBatchId) || activeBatch;
  }, [selectedBatchId, activeBatch, validBatches]);

  const isViewingActiveBatch = Boolean(viewedBatch && activeBatch && viewedBatch.id === activeBatch.id);

  const batchRemaining = useMemo(() => {
    return calculateBatchRemaining(viewedBatch);
  }, [viewedBatch]);

  // Unified Jasra Distributions List strictly scoped to viewedBatch
  const unifiedDistributions = useMemo(() => {
    return getBatchDistributions(distributions, viewedBatch, membersList, externalJasraList);
  }, [distributions, viewedBatch, membersList, externalJasraList]);

  // Filtered Jasra distributions
  const filteredJasraDistributions = useMemo(() => {
    return unifiedDistributions.filter((dist) => {
      // Type / Status filter
      if (jasraFilter === "MEMBER" && dist.recipientType !== "MEMBER") return false;
      if (jasraFilter === "NON_MEMBER" && dist.recipientType !== "NON_MEMBER") return false;
      if (jasraFilter === "ACTIVE" || jasraFilter === "EXPIRED") {
        const rem = calculateRecipientRemaining(dist, viewedBatch);
        if (jasraFilter === "ACTIVE" && rem.isExpired) return false;
        if (jasraFilter === "EXPIRED" && !rem.isExpired) return false;
      }

      // Search filter
      if (jasraSearch.trim()) {
        const q = jasraSearch.toLowerCase().trim();
        const name = (dist.recipientName || "").toLowerCase();
        const cid = (dist.citizenId || "").toLowerCase();
        const phone = (dist.phone || "").toLowerCase();
        return name.includes(q) || cid.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [unifiedDistributions, jasraFilter, jasraSearch, viewedBatch]);

  // Filtered Bansos claims
  const filteredBansosClaims = useMemo(() => {
    return (bansosClaims || []).filter((claim) => {
      if (bansosFilter === "CLAIMED" && !claim.claimed) return false;
      if (bansosFilter === "UNCLAIMED" && claim.claimed) return false;

      if (bansosSearch.trim()) {
        const q = bansosSearch.toLowerCase().trim();
        const name = (claim.fullName || "").toLowerCase();
        const cid = (claim.citizenId || "").toLowerCase();
        const code = (claim.claimCode || "").toLowerCase();
        return name.includes(q) || cid.includes(q) || code.includes(q);
      }

      return true;
    });
  }, [bansosClaims, bansosFilter, bansosSearch]);

  // Derived Metrics scoped to viewedBatch
  const {
    distributedCount: jasraDistributedCount,
    distributedTreatment: jasraDistributedTreatment,
    distributedPingsan: jasraDistributedPingsan,
    initialTreatment: jasraInitialTreatment,
    initialPingsan: jasraInitialPingsan,
    remainingTreatment: jasraRemainingTreatment,
    remainingPingsan: jasraRemainingPingsan,
  } = useMemo(() => computeBatchMetrics(viewedBatch, unifiedDistributions), [viewedBatch, unifiedDistributions]);

  const bansosTotalCount = bansosClaims.length;
  const bansosClaimedCount = bansosClaims.filter((c) => c.claimed).length;
  const bansosUnclaimedCount = bansosTotalCount - bansosClaimedCount;
  const bansosTotalCashDistributed = bansosClaims
    .filter((c) => c.claimed)
    .reduce((sum, c) => sum + (Number(c.cashAmount) || 2500), 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-[#FBF8F2] dark:bg-[#131620] rounded-xl border-[3px] border-black dark:border-[#475569] shadow-[8px_8px_0px_#000] flex flex-col max-h-[94vh] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Portal Transparansi - Government Document Grade */}
        <header className="p-4 sm:p-5 border-b-[2.5px] border-black dark:border-[#475569] bg-white dark:bg-[#1A1D27] shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3">
            {/* Government Seal & PPS Official Logo Collaboration (Gov x PPS) */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#181B22] border-2 border-[#8A7131] flex items-center justify-center p-1 shrink-0 shadow-[2px_2px_0px_#000]"
                title="Pemerintah Kota San Andreas"
              >
                <img
                  src="/documents/san_andreas_seal.png"
                  alt="Seal of San Andreas"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>

              <span className="font-heading font-black text-xs sm:text-sm text-slate-400 dark:text-slate-500 select-none">
                ✕
              </span>

              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FACC15] border-2 border-black flex items-center justify-center p-1 shrink-0 shadow-[2px_2px_0px_#000]"
                title="LSM Paguyuban Pizza Sandy Shores"
              >
                <img
                  src="/logo.png"
                  alt="Logo LSM PPS"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-400">
                  PORTAL TRANSPARANSI
                </span>
                {activeTab === "jasra" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-[#FACC15] text-[#111827] border border-black shadow-xs">
                    SUBSIDI KESEHATAN JASRA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500 text-white border border-black shadow-xs">
                    PROGRAM BANSOS WARGA
                  </span>
                )}
              </div>
              <h2 className="font-heading font-black text-sm sm:text-lg uppercase text-slate-900 dark:text-slate-100 mt-0.5 tracking-tight">
                {activeTab === "jasra"
                  ? "Rekapitulasi Penyaluran Voucher Jasra Medis"
                  : "Rekapitulasi Penyaluran Bantuan Sosial Warga"}
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                Pemerintah Kota San Andreas &bull; LSM Paguyuban Pizza Sandy Shores (Koordinat 1012)
              </p>
            </div>
          </div>

          {/* Action Tools: Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3.5 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-900 dark:text-red-200 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer rounded"
              title="Tutup Halaman Transparansi"
            >
              <span>Tutup</span>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* 2. Top Navigation Tabs: Hanya ditampilkan jika mode multi-tab/umum */}
        {!isDedicatedView && (
          <div className="flex items-center justify-between border-b-2 border-black/15 dark:border-white/10 bg-slate-100/70 dark:bg-[#161822] px-4 pt-2.5 gap-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("jasra")}
                className={`px-4 py-2.5 rounded-t-lg text-xs font-heading font-black border-t-2 border-x-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
                  activeTab === "jasra"
                    ? "bg-[#FBF8F2] dark:bg-[#131620] text-slate-900 dark:text-[#FACC15] -mb-[2px] pb-3 border-b-0 shadow-[0_-2px_0px_#000]"
                    : "bg-white/80 dark:bg-[#1D212E] text-slate-600 dark:text-slate-400 hover:bg-white border-b-2"
                }`}
              >
                <HeartHandshake size={15} className="text-[#DC2626]" />
                <span>Voucher Jasra Medis</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#FACC15] text-slate-950">
                  {unifiedDistributions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bansos")}
                className={`px-4 py-2.5 rounded-t-lg text-xs font-heading font-black border-t-2 border-x-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
                  activeTab === "bansos"
                    ? "bg-[#FBF8F2] dark:bg-[#131620] text-slate-900 dark:text-[#FACC15] -mb-[2px] pb-3 border-b-0 shadow-[0_-2px_0px_#000]"
                    : "bg-white/80 dark:bg-[#1D212E] text-slate-600 dark:text-slate-400 hover:bg-white border-b-2"
                }`}
              >
                <Gift size={15} className="text-emerald-600" />
                <span>Bansos Warga Sandy Shores</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-white">
                  {bansosClaims.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
          {/* TAB 1: LAPORAN VOUCHER JASRA MEDIS */}
          {activeTab === "jasra" && (
            <div className="flex flex-col gap-5">
              {/* Highlight Gelombang Aktif dari Pemerintah */}
              <div className="card-brutal relative z-20 p-4 sm:p-5 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#DC2626] border-2 border-black flex items-center justify-center text-[#FACC15] shadow-[2px_2px_0px_#000] shrink-0">
                    <HeartHandshake size={26} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-black text-base uppercase text-slate-900 dark:text-slate-100">
                        {viewedBatch?.batchName || "Gelombang Alokasi Jasra"}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-black ${
                        isViewingActiveBatch && !batchRemaining.isExpired
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}>
                        {isViewingActiveBatch && !batchRemaining.isExpired ? "GELOMBANG AKTIF" : "ARSIP GELOMBANG"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Sumber: <strong className="text-slate-900 dark:text-slate-200">{viewedBatch?.source || "Pemerintah Kota San Andreas"}</strong> &bull; Diterima: {viewedBatch?.receivedDateFormatted || formatJasraDate(viewedBatch?.receivedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                  {validBatches.length > 1 && (
                    <div className="w-full sm:w-80">
                      <BrutalistSelect
                        value={selectedBatchId}
                        onChange={setSelectedBatchId}
                        options={buildJasraBatchSelectOptions(activeBatch, validBatches)}
                        placeholder="Pilih Gelombang..."
                        ariaLabel="Pilih gelombang Jasra"
                      />
                    </div>
                  )}

                  <JasraBatchValidityBadge batchRemaining={batchRemaining} />
                </div>
              </div>

              {/* 4 Stat Cards: Alokasi, Terdistribusi, Sisa Kuota, Realisasi */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card-brutal p-3 sm:p-4 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                    Total Kuota Pemerintah
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-slate-950 dark:text-slate-100 mt-1">
                    {jasraInitialTreatment + jasraInitialPingsan}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    {jasraInitialTreatment} Tritmen + {jasraInitialPingsan} Pingsan
                  </span>
                </div>

                <div className="card-brutal p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 dark:border-emerald-500 shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                    Voucher Tersalurkan
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-emerald-900 dark:text-emerald-200 mt-1">
                    {jasraDistributedTreatment + jasraDistributedPingsan}
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block font-bold">
                    Ke {jasraDistributedCount} Warga ({jasraDistributedTreatment}T &bull; {jasraDistributedPingsan}P)
                  </span>
                </div>

                <div className="card-brutal p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 dark:border-amber-400 shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-800 dark:text-amber-300 block">
                    Sisa Kuota Tersedia
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-amber-900 dark:text-[#FACC15] mt-1">
                    {jasraRemainingTreatment + jasraRemainingPingsan}
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-0.5 block font-bold">
                    Sisa {jasraRemainingTreatment} Tritmen &bull; {jasraRemainingPingsan} Pingsan
                  </span>
                </div>

                <div className="card-brutal p-3 sm:p-4 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                    Persentase Realisasi
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-blue-700 dark:text-blue-400 mt-1">
                    {Math.round(((jasraDistributedTreatment + jasraDistributedPingsan) / (jasraInitialTreatment + jasraInitialPingsan)) * 100)}%
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((jasraDistributedTreatment + jasraDistributedPingsan) / (jasraInitialTreatment + jasraInitialPingsan)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar - Bergaya Neobrutalis konsisten dengan panel admin */}
              <div className="card-brutal p-3.5 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={jasraSearch}
                    onChange={(e) => setJasraSearch(e.target.value)}
                    placeholder="Cari nama penerima, Citizen ID (CID), atau telepon..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border-2 border-black dark:border-[#475569] bg-slate-50 dark:bg-[#202534] text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                  />
                  {jasraSearch && (
                    <button
                      type="button"
                      onClick={() => setJasraSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Pills bergaya Neobrutalis khas PPS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "ALL", label: `Semua (${unifiedDistributions.length})` },
                    { id: "MEMBER", label: `Anggota (${unifiedDistributions.filter(d => d.recipientType === "MEMBER").length})` },
                    { id: "NON_MEMBER", label: `Warga Luar (${unifiedDistributions.filter(d => d.recipientType === "NON_MEMBER").length})` },
                    { id: "ACTIVE", label: "Voucher Aktif" },
                    { id: "EXPIRED", label: "Kedaluwarsa" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setJasraFilter(f.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-heading font-black border-2 transition-all cursor-pointer ${
                        jasraFilter === f.id
                          ? "bg-[#FACC15] text-[#111827] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5"
                          : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 border-black/30 dark:border-slate-700 hover:border-black"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabel Rekapitulasi Penyaluran Voucher Jasra */}
              <div className="card-brutal bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] overflow-hidden">
                <div className="p-3.5 border-b-2 border-black/10 dark:border-white/10 flex items-center justify-between">
                  <span className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>DAFTAR LENGKAP PENERIMA MANFAAT JASRA</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({filteredJasraDistributions.length} warga tercatat)
                    </span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    Standar Jatah: 10 Tritmen + 10 Pingsan / Warga
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#1E2230] border-b-2 border-black font-heading font-black uppercase text-[10px] text-slate-700 dark:text-slate-300">
                        <th className="py-2.5 px-3 w-10">No</th>
                        <th className="py-2.5 px-3">Penerima Manfaat</th>
                        <th className="py-2.5 px-3">No. IC / Citizen ID</th>
                        <th className="py-2.5 px-3">Alokasi Manfaat</th>
                        <th className="py-2.5 px-3">Tanggal Penyerahan</th>
                        <th className="py-2.5 px-3">Masa Berlaku</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 dark:divide-white/10 font-mono">
                      {filteredJasraDistributions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                            Tidak ditemukan data penyaluran voucher yang sesuai filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredJasraDistributions.map((dist, idx) => {
                          const rem = calculateRecipientRemaining(dist, viewedBatch);
                          const isMember = dist.recipientType === "MEMBER";
                          return (
                            <tr
                              key={dist.id || idx}
                              className="hover:bg-amber-50/50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="flex items-center gap-1.5">
                                  {isMember ? (
                                    <span className="w-4 h-4 rounded bg-[#FACC15] text-[#111827] border border-black flex items-center justify-center shrink-0" title="Anggota Resmi Paguyuban">
                                      <UserCheck size={10} />
                                    </span>
                                  ) : (
                                    <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-black/30 flex items-center justify-center shrink-0" title="Warga Luar Paguyuban">
                                      <UserX size={10} />
                                    </span>
                                  )}
                                  <div>
                                    <strong className="font-heading font-black text-slate-900 dark:text-slate-100 block">
                                      {dist.recipientName}
                                    </strong>
                                    <span className="text-[10px] text-slate-500">
                                      {isMember ? "Anggota Paguyuban" : "Warga Luar Anggota"}
                                      {dist.phone ? ` • ${dist.phone}` : ""}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                                {dist.citizenId || "-"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 border border-amber-400 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                  {dist.treatmentCount}T &bull; {dist.pingsanCount}P
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                {dist.givenDateFormatted || formatJasraShortDate(dist.givenAt)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-[11px]">
                                {rem.label}
                              </td>
                              <td className="py-2.5 px-3">
                                {rem.isExpired ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-black/20">
                                    KEDALUWARSA
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-white border border-black">
                                    AKTIF
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                                {dist.officerName || "Admin PPS"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LAPORAN BANTUAN SOSIAL (BANSOS) WARGA */}
          {activeTab === "bansos" && (
            <div className="flex flex-col gap-5">
              {/* Highlight Program Bansos */}
              <div className="card-brutal p-4 sm:p-5 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-600 border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_#000] shrink-0">
                    <Gift size={26} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-black text-base uppercase text-slate-900 dark:text-slate-100">
                        Bantuan Sosial Warga Sandy Shores
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FACC15] text-slate-950 border border-black">
                        PROGRAM KEPEDULIAN
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Paket Bantuan: <strong>1 Paket Makanan + Uang Tunai $2.500 USD</strong> &bull; Terdaftar di Pemerintah Kota San Andreas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center">
                  <div className="p-2.5 rounded-lg border-2 border-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-[2px_2px_0px_#000]">
                    <div className="text-[10px] font-heading font-black uppercase text-emerald-800 dark:text-emerald-300">
                      Total Dana Tunai Terealisasi
                    </div>
                    <div className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400">
                      ${bansosTotalCashDistributed.toLocaleString("en-US")} USD
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Stat Cards Bansos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="card-brutal p-4 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                    Total Warga Terdata
                  </span>
                  <div className="text-2xl font-mono font-black text-slate-950 dark:text-slate-100 mt-1">
                    {bansosTotalCount} Warga
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    Kupon Terbit: {bansosTotalCount} Kupon
                  </span>
                </div>

                <div className="card-brutal p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 dark:border-emerald-500 shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                    Sudah Diserahkan (Realisasi)
                  </span>
                  <div className="text-2xl font-mono font-black text-emerald-900 dark:text-emerald-200 mt-1">
                    {bansosClaimedCount} Warga
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block font-bold">
                    Tingkat Realisasi: {bansosTotalCount > 0 ? Math.round((bansosClaimedCount / bansosTotalCount) * 100) : 0}%
                  </span>
                </div>

                <div className="card-brutal p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 dark:border-amber-400 shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-800 dark:text-amber-300 block">
                    Menunggu Penyerahan Fisik
                  </span>
                  <div className="text-2xl font-mono font-black text-amber-900 dark:text-[#FACC15] mt-1">
                    {bansosUnclaimedCount} Warga
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-0.5 block font-bold">
                    Siap Diambil di Kantor LSM
                  </span>
                </div>
              </div>

              {/* Filter & Search Bar Bansos - Bergaya Neobrutalis konsisten dengan panel admin */}
              <div className="card-brutal p-3.5 bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={bansosSearch}
                    onChange={(e) => setBansosSearch(e.target.value)}
                    placeholder="Cari nama warga, Citizen ID (CID), atau kode kupon..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border-2 border-black dark:border-[#475569] bg-slate-50 dark:bg-[#202534] text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                  />
                  {bansosSearch && (
                    <button
                      type="button"
                      onClick={() => setBansosSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Pills bergaya Neobrutalis khas PPS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "ALL", label: `Semua (${bansosClaims.length})` },
                    { id: "CLAIMED", label: `Sudah Diserahkan (${bansosClaimedCount})` },
                    { id: "UNCLAIMED", label: `Belum Diambil (${bansosUnclaimedCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBansosFilter(f.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-heading font-black border-2 transition-all cursor-pointer ${
                        bansosFilter === f.id
                          ? "bg-[#FACC15] text-[#111827] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5"
                          : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 border-black/30 dark:border-slate-700 hover:border-black"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabel Bansos */}
              <div className="card-brutal bg-white dark:bg-[#181B26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] overflow-hidden">
                <div className="p-3.5 border-b-2 border-black/10 dark:border-white/10 flex items-center justify-between">
                  <span className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>DAFTAR PENYALURAN BANTUAN SOSIAL WARGA</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({filteredBansosClaims.length} kupon)
                    </span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    Bantuan: 1 Makanan + $2.500 USD
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#1E2230] border-b-2 border-black font-heading font-black uppercase text-[10px] text-slate-700 dark:text-slate-300">
                        <th className="py-2.5 px-3 w-10">No</th>
                        <th className="py-2.5 px-3">Kode Kupon</th>
                        <th className="py-2.5 px-3">Nama Penerima</th>
                        <th className="py-2.5 px-3">No. IC / Citizen ID</th>
                        <th className="py-2.5 px-3">Paket Bantuan</th>
                        <th className="py-2.5 px-3">Status Realisasi</th>
                        <th className="py-2.5 px-3">Waktu Pengajuan</th>
                        <th className="py-2.5 px-3">Waktu Penyerahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 dark:divide-white/10 font-mono">
                      {filteredBansosClaims.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                            Tidak ditemukan data bansos yang sesuai filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredBansosClaims.map((claim, idx) => (
                          <tr
                            key={claim.id || idx}
                            className="hover:bg-amber-50/50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-[#FACC15] text-slate-950 border border-black">
                                {claim.claimCode || "-"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sans font-heading font-black text-slate-900 dark:text-slate-100">
                              {claim.fullName}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {claim.citizenId}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">
                              1 Paket Makanan + ${claim.cashAmount || 2500} USD
                            </td>
                            <td className="py-2.5 px-3">
                              {claim.claimed ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white border border-black">
                                  SUDAH DIAMBIL
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 border border-black">
                                  MENUNGGU DIAMBIL
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {claim.claimDate || "-"} {claim.claimTime || ""}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                              {claim.claimedAt || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer Dokumen Resmi */}
        <footer className="p-3.5 sm:p-4 border-t-2 border-black/15 dark:border-white/10 bg-white dark:bg-[#1A1D27] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Scanning data menggunakan OCR. Kesalahan input nama/citizen id kemungkinan bisa terjadi.</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Koordinat 1012 &bull; Sandy Shores</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
