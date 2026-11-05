import React, { useState, useMemo, useEffect } from "react";
import {
  HeartHandshake,
  Plus,
  Search,
  X,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2,
  Building2,
  Sparkles,
  Info,
  Gift,
  ShieldAlert,
  RotateCcw,
  ScanLine,
  Camera,
  Check,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  calculateBatchRemaining,
  calculateRecipientRemaining,
  formatJasraDate,
  formatJasraShortDate,
  saveJasraBatchCloud,
  deleteJasraBatchCloud,
  distributeJasraCloud,
  deleteJasraDistributionCloud,
  exportJasraDistributionsToExcel,
  syncJasraWithMembersCloud,
  DEFAULT_VALIDITY_DAYS,
  DEFAULT_TREATMENT_PER_PERSON,
  DEFAULT_PINGSAN_PER_PERSON,
  DEFAULT_GOVERNMENT_BATCH,
} from "../services/jasraService";
import { scanKtpImage } from "../utils/ktpOcr";
import { saveExternalJasraCloud } from "../services/memberService";

export default function JasraPanel({
  batches = [],
  distributions = [],
  membersList = [],
  externalJasraList = [],
  onShowToast,
  initialDistributeType = null,
  onResetInitialDistributeType,
  onOpenTransparency,
}) {
  // Active batch: The latest batch with status ACTIVE or unexpired
  const activeBatch = useMemo(() => {
    return batches.find((b) => b.status === "ACTIVE") || batches[0] || DEFAULT_GOVERNMENT_BATCH;
  }, [batches]);

  const batchRemaining = useMemo(() => {
    return calculateBatchRemaining(activeBatch);
  }, [activeBatch]);

  // Modals state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [isHistoryBatchOpen, setIsHistoryBatchOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync & unified distributions list (combines Firestore distributions + members + external)
  const allDistributions = useMemo(() => {
    const list = [...(distributions || [])];
    const existingMemberIds = new Set(list.map((d) => d.memberId).filter(Boolean));
    const existingCids = new Set(list.map((d) => (d.citizenId || "").toUpperCase()).filter(Boolean));

    const activeBatchExpiry = activeBatch?.expiresAt || 1794186000000;

    // Pastikan anggota dengan status voucher aktif tetapi belum masuk dokumen distribusi tetap muncul & terhitung
    (membersList || [])
      .filter((m) => Boolean(m.voucherJasraReceived || m.voucherClaimedAt))
      .forEach((m) => {
        const cid = (m.icNumber || m.citizenId || "").toUpperCase();
        if (!existingMemberIds.has(m.id) && (!cid || !existingCids.has(cid))) {
          const givenAt = m.voucherClaimedAt || m.lastUpdatedStatusAt || 1793644800000;
          list.push({
            id: "DIST_" + m.id,
            batchId: activeBatch?.id || "BATCH_PEMERINTAH_20261102",
            batchName: activeBatch?.batchName || "Gelombang #1 - Alokasi Pemerintah San Andreas",
            recipientType: "MEMBER",
            recipientName: (m.fullName || "Anggota PPS").toUpperCase(),
            citizenId: cid || "-",
            phone: m.phone || "-",
            memberId: m.id,
            treatmentCount: 10,
            pingsanCount: 10,
            totalCount: 20,
            packageLabel: "10 Treatment • 10 Pingsan",
            givenAt: givenAt,
            givenDateFormatted: m.voucherJasraDate || formatJasraShortDate(givenAt),
            batchExpiresAt: activeBatchExpiry,
            batchExpiresFormatted: formatJasraDate(activeBatchExpiry),
            officerName: "Admin Paguyuban",
            notes: "Database Anggota LSM PPS",
            createdAt: givenAt,
          });
          existingMemberIds.add(m.id);
          if (cid) existingCids.add(cid);
        }
      });

    // Gabungkan warga luar anggota jika ada yang belum tercatat di koleksi distribusi
    (externalJasraList || []).forEach((ext) => {
      const cid = (ext.citizenId || "").toUpperCase();
      if (!existingCids.has(cid)) {
        const givenAt = ext.createdAt || ext.updatedAt || 1793644800000;
        list.push({
          id: "DIST_" + ext.id,
          batchId: activeBatch?.id || "BATCH_PEMERINTAH_20261102",
          batchName: activeBatch?.batchName || "Gelombang #1 - Alokasi Pemerintah San Andreas",
          recipientType: "NON_MEMBER",
          recipientName: (ext.fullName || "Warga Luar").toUpperCase(),
          citizenId: cid || "-",
          phone: ext.phone || "-",
          memberId: null,
          treatmentCount: 10,
          pingsanCount: 10,
          totalCount: 20,
          packageLabel: "10 Treatment • 10 Pingsan",
          givenAt: givenAt,
          givenDateFormatted: ext.dateGiven || formatJasraShortDate(givenAt),
          batchExpiresAt: activeBatchExpiry,
          batchExpiresFormatted: formatJasraDate(activeBatchExpiry),
          officerName: "Admin Paguyuban",
          notes: "Database Jasra Luar Anggota",
          createdAt: givenAt,
        });
        if (cid) existingCids.add(cid);
      }
    });

    list.sort((a, b) => (b.givenAt || 0) - (a.givenAt || 0));
    return list;
  }, [distributions, membersList, externalJasraList, activeBatch]);

  // Derived Real-time Stock Metrics
  const effectiveDistributedCount = allDistributions.length > 0
    ? allDistributions.length
    : (activeBatch?.distributedCount || 0);

  const effectiveDistributedTreatment = allDistributions.length > 0
    ? allDistributions.reduce((sum, d) => sum + (Number(d.treatmentCount) || 10), 0)
    : (activeBatch?.distributedTreatment || 0);

  const effectiveDistributedPingsan = allDistributions.length > 0
    ? allDistributions.reduce((sum, d) => sum + (Number(d.pingsanCount) || 10), 0)
    : (activeBatch?.distributedPingsan || 0);

  const effectiveInitialTreatment = Number(activeBatch?.initialTreatment) || 500;
  const effectiveInitialPingsan = Number(activeBatch?.initialPingsan) || 500;
  const effectiveRemainingTreatment = Math.max(0, effectiveInitialTreatment - effectiveDistributedTreatment);
  const effectiveRemainingPingsan = Math.max(0, effectiveInitialPingsan - effectiveDistributedPingsan);

  // Filter & Search state for distributions
  const [filterType, setFilterType] = useState("ALL"); // ALL | MEMBER | NON_MEMBER | ACTIVE | EXPIRED
  const [searchQuery, setSearchQuery] = useState("");

  // Form: Create / Edit Batch from Government
  const [batchFormData, setBatchFormData] = useState({
    id: "",
    batchName: "",
    source: "Pemerintah Kota San Andreas / Dinas Kesehatan",
    initialTreatment: 500,
    initialPingsan: 500,
    receivedAtDate: new Date().toISOString().slice(0, 10),
    receivedAtTime: "12:00",
    validityDays: 7,
    notes: "",
  });

  // Member Search & OCR states
  const [memberSearch, setMemberSearch] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isScanningOcr, setIsScanningOcr] = useState(false);

  // Form: Distribute Voucher
  const [distFormData, setDistFormData] = useState({
    recipientType: "MEMBER", // "MEMBER" | "NON_MEMBER"
    selectedMemberId: "",
    recipientName: "",
    citizenId: "",
    phone: "",
    treatmentCount: DEFAULT_TREATMENT_PER_PERSON,
    pingsanCount: DEFAULT_PINGSAN_PER_PERSON,
    officerName: "Pengurus LSM PPS",
    notes: "",
    ktpPhoto: "",
    cidCandidates: [],
  });

  // Watch for initialDistributeType prop from outside
  useEffect(() => {
    if (initialDistributeType) {
      setDistFormData((prev) => ({
        ...prev,
        recipientType: initialDistributeType,
        selectedMemberId: "",
        recipientName: "",
        citizenId: "",
        phone: "",
        ktpPhoto: "",
        cidCandidates: [],
      }));
      setMemberSearch("");
      setIsMemberDropdownOpen(false);
      setIsDistributeModalOpen(true);
      if (onResetInitialDistributeType) onResetInitialDistributeType();
    }
  }, [initialDistributeType, onResetInitialDistributeType]);

  // Filtered distributions
  const filteredDistributions = useMemo(() => {
    return allDistributions.filter((dist) => {
      const rem = calculateRecipientRemaining(dist, activeBatch);

      if (filterType === "MEMBER" && dist.recipientType !== "MEMBER") return false;
      if (filterType === "NON_MEMBER" && dist.recipientType !== "NON_MEMBER") return false;
      if (filterType === "ACTIVE" && rem.isExpired) return false;
      if (filterType === "EXPIRED" && !rem.isExpired) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (dist.recipientName || "").toLowerCase().includes(q) ||
        (dist.citizenId || "").toLowerCase().includes(q) ||
        (dist.phone || "").toLowerCase().includes(q) ||
        (dist.batchName || "").toLowerCase().includes(q)
      );
    });
  }, [allDistributions, activeBatch, filterType, searchQuery]);

  // Handler: Manual & Automatic Sync with Database Anggota
  async function handleSyncWithMembers(manual = true) {
    setIsSyncing(true);
    try {
      const res = await syncJasraWithMembersCloud(membersList, externalJasraList, activeBatch);
      if (manual && onShowToast) {
        onShowToast(
          `Sinkronisasi selesai! ${res.totalDistributedCount} penerima tercatat (${res.totalDistributedTreatment + res.totalDistributedPingsan} voucher terdistribusi).`,
          "success"
        );
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data Jasra:", err);
      if (manual && onShowToast) {
        onShowToast("Gagal melakukan sinkronisasi data anggota.", "error");
      }
    } finally {
      setIsSyncing(false);
    }
  }

  // Auto-sync jika terdapat penerima voucher di Database Anggota atau Luar yang belum tercatat di koleksi distribusi
  useEffect(() => {
    if (!membersList || membersList.length === 0) return;
    const distMemberIds = new Set((distributions || []).map((d) => d.memberId).filter(Boolean));
    const distCids = new Set((distributions || []).map((d) => (d.citizenId || "").toUpperCase()).filter(Boolean));

    const hasUnsyncedMember = membersList.some((m) => {
      if (!m.voucherJasraReceived && !m.voucherClaimedAt) return false;
      const cid = (m.icNumber || m.citizenId || "").toUpperCase();
      return !distMemberIds.has(m.id) && (!cid || !distCids.has(cid));
    });

    const hasUnsyncedExternal = (externalJasraList || []).some((ext) => {
      const cid = (ext.citizenId || "").toUpperCase();
      return cid && !distCids.has(cid);
    });

    if (hasUnsyncedMember || hasUnsyncedExternal) {
      handleSyncWithMembers(false);
    }
  }, [distributions, membersList, externalJasraList]);

  // Handlers for Batch Creation
  function handleOpenNewBatchModal() {
    const now = new Date();
    setBatchFormData({
      id: "",
      batchName: `Gelombang ${batches.length + 1} - ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
      source: "Pemerintah Kota San Andreas / Dinas Kesehatan",
      initialTreatment: 500,
      initialPingsan: 500,
      receivedAtDate: now.toISOString().slice(0, 10),
      receivedAtTime: now.toTimeString().slice(0, 5),
      validityDays: 7,
      notes: "",
    });
    setIsBatchModalOpen(true);
  }

  async function handleSaveBatch(e) {
    e.preventDefault();
    try {
      const dateParts = batchFormData.receivedAtDate.split("-");
      const timeParts = (batchFormData.receivedAtTime || "12:00").split(":");
      const receivedDate = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10),
        parseInt(timeParts[0], 10) || 12,
        parseInt(timeParts[1], 10) || 0
      );

      const payload = {
        id: batchFormData.id || undefined,
        batchName: batchFormData.batchName.trim() || "Batch Jasra Pemerintah",
        source: batchFormData.source.trim(),
        initialTreatment: Number(batchFormData.initialTreatment) || 0,
        initialPingsan: Number(batchFormData.initialPingsan) || 0,
        receivedAt: receivedDate.getTime(),
        validityDays: Number(batchFormData.validityDays) || 7,
        notes: batchFormData.notes.trim(),
        status: "ACTIVE",
      };

      await saveJasraBatchCloud(payload);
      if (onShowToast) onShowToast("Gelombang Jasra dari pemerintah berhasil dicatat & masa berlaku 7 hari aktif!", "success");
      setIsBatchModalOpen(false);
    } catch (err) {
      console.error("Gagal simpan batch Jasra:", err);
      if (onShowToast) onShowToast("Gagal menyimpan data batch Jasra: " + err.message, "error");
    }
  }

  // Handlers for Distribution
  function handleOpenDistributeModal(type = "MEMBER") {
    if (!activeBatch || batchRemaining.isExpired) {
      if (onShowToast) onShowToast("Tidak ada batch Jasra pemerintah yang aktif. Input batch baru terlebih dahulu!", "warning");
      return;
    }
    const effectiveType = typeof type === "string" ? type : "MEMBER";
    setDistFormData({
      recipientType: effectiveType,
      selectedMemberId: "",
      recipientName: "",
      citizenId: "",
      phone: "",
      treatmentCount: DEFAULT_TREATMENT_PER_PERSON,
      pingsanCount: DEFAULT_PINGSAN_PER_PERSON,
      officerName: "Pengurus LSM PPS",
      notes: "",
      ktpPhoto: "",
      cidCandidates: [],
    });
    setMemberSearch("");
    setIsMemberDropdownOpen(false);
    setIsDistributeModalOpen(true);
  }

  // Filtered members for searchable member picker combobox
  const filteredMembersForPicker = useMemo(() => {
    if (!membersList || membersList.length === 0) return [];
    if (!memberSearch.trim()) return membersList.slice(0, 35);
    const q = memberSearch.toLowerCase().trim();
    return membersList.filter((m) => {
      const name = (m.fullName || "").toLowerCase();
      const cid = (m.icNumber || m.citizenId || "").toLowerCase();
      const phone = (m.phone || "").toLowerCase();
      const callsign = (m.callsign || "").toLowerCase();
      return name.includes(q) || cid.includes(q) || phone.includes(q) || callsign.includes(q);
    });
  }, [membersList, memberSearch]);

  const selectedMember = useMemo(() => {
    if (!distFormData.selectedMemberId) return null;
    return membersList.find((m) => m.id === distFormData.selectedMemberId) || null;
  }, [membersList, distFormData.selectedMemberId]);

  function handleSelectMember(member) {
    if (!member) return;
    setDistFormData((prev) => ({
      ...prev,
      selectedMemberId: member.id,
      recipientName: (member.fullName || "").toUpperCase(),
      citizenId: (member.icNumber || member.citizenId || "").toUpperCase(),
      phone: member.phone || "",
    }));
    setMemberSearch("");
    setIsMemberDropdownOpen(false);
  }

  // Handle OCR scanning of KTP photo for non-members
  async function handleKtpUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (onShowToast) onShowToast("File harus berupa gambar (JPG, PNG, WebP).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (onShowToast) onShowToast("Ukuran gambar maksimal 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result;
      if (!dataUrl) return;

      setDistFormData((prev) => ({
        ...prev,
        ktpPhoto: dataUrl,
      }));

      setIsScanningOcr(true);
      try {
        const ocrResult = await scanKtpImage(dataUrl);
        const fields = ocrResult?.fields || ocrResult || {};
        const detectedName =
          fields.fullName ||
          [fields.firstName, fields.lastName].filter(Boolean).join(" ").trim() ||
          fields.name ||
          "";
        const detectedCid =
          fields.citizenId ||
          (fields.citizenIdCandidates && fields.citizenIdCandidates[0]) ||
          "";

        if (detectedName || detectedCid) {
          setDistFormData((prev) => ({
            ...prev,
            recipientName: detectedName ? detectedName.toUpperCase() : prev.recipientName,
            citizenId: detectedCid ? detectedCid.toUpperCase() : prev.citizenId,
            cidCandidates: fields.citizenIdCandidates || [],
          }));
          if (onShowToast) {
            onShowToast(
              `KTP berhasil dipindai! Terbaca: ${detectedName || "Nama"} (${detectedCid || "CID"})`,
              "success"
            );
          }
        } else {
          if (onShowToast) onShowToast("Foto KTP diunggah. Silakan lengkapi Nama & CID.", "info");
        }
      } catch (err) {
        console.warn("OCR scan notice:", err);
        if (onShowToast) onShowToast("Foto KTP diunggah. Silakan periksa kembali Nama & CID.", "info");
      } finally {
        setIsScanningOcr(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveDistribution(e) {
    e.preventDefault();
    if (!activeBatch) return;

    if (!distFormData.recipientName.trim()) {
      if (onShowToast) onShowToast("Nama penerima wajib diisi!", "warning");
      return;
    }

    try {
      const payload = {
        recipientType: distFormData.recipientType,
        memberId: distFormData.recipientType === "MEMBER" ? distFormData.selectedMemberId : null,
        recipientName: distFormData.recipientName.trim().toUpperCase(),
        citizenId: distFormData.citizenId.trim().toUpperCase(),
        phone: distFormData.phone.trim(),
        treatmentCount: Number(distFormData.treatmentCount) || 0,
        pingsanCount: Number(distFormData.pingsanCount) || 0,
        officerName: distFormData.officerName.trim() || "Pengurus LSM PPS",
        notes: distFormData.notes.trim(),
        ktpPhoto: distFormData.ktpPhoto || null,
        givenAt: Date.now(),
      };

      await distributeJasraCloud(payload, activeBatch);

      // Dual-sync to external_jasra if non-member
      if (distFormData.recipientType === "NON_MEMBER") {
        try {
          await saveExternalJasraCloud({
            fullName: distFormData.recipientName.trim().toUpperCase(),
            citizenId: distFormData.citizenId.trim().toUpperCase(),
            phone: distFormData.phone.trim(),
            notes: distFormData.notes.trim(),
            ktpPhoto: distFormData.ktpPhoto || "",
            status: "ACTIVE",
            packageLabel: `${Number(distFormData.treatmentCount) || 10} Tritmen • ${Number(distFormData.pingsanCount) || 10} Pingsan`,
            dateGiven: new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          });
        } catch (syncErr) {
          console.warn("Notice: Gagal dual-sync ke external_jasra:", syncErr);
        }
      }

      if (onShowToast) {
        onShowToast(`Voucher Jasra berhasil diserahkan ke ${payload.recipientName}! Sisa masa berlaku: ${batchRemaining.daysRemaining} hari.`, "success");
      }
      setIsDistributeModalOpen(false);
    } catch (err) {
      console.error("Gagal bagikan voucher Jasra:", err);
      if (onShowToast) onShowToast(err.message, "error");
    }
  }

  async function handleDeleteDistribution(dist) {
    const confirmed = window.confirm(`Batalkan penyaluran voucher untuk "${dist.recipientName}" dan kembalikan kuota (${dist.treatmentCount} Treatment • ${dist.pingsanCount} Pingsan) ke stok batch?`);
    if (!confirmed) return;

    try {
      await deleteJasraDistributionCloud(dist, true);
      if (onShowToast) onShowToast(`Data penyaluran "${dist.recipientName}" dihapus dan stok dikembalikan.`, "info");
    } catch (err) {
      console.error("Gagal hapus distribusi Jasra:", err);
      if (onShowToast) onShowToast("Gagal menghapus data penyaluran: " + err.message, "error");
    }
  }

  function handleExportExcel() {
    if (distributions.length === 0) {
      if (onShowToast) onShowToast("Belum ada data penyaluran voucher untuk diunduh.", "warning");
      return;
    }
    exportJasraDistributionsToExcel(distributions, activeBatch);
    if (onShowToast) onShowToast("Laporan penyaluran voucher Jasra berhasil diunduh!", "success");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Card with Actions */}
      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#DC2626] border-2 border-black flex items-center justify-center text-[#FACC15] shadow-[2px_2px_0px_#000] shrink-0">
            <HeartHandshake size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-black text-base sm:text-lg uppercase text-slate-900 dark:text-slate-100">
                Kelola Voucher Jasra
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] border border-black shadow-xs">
                SUBSIDI PEMERINTAH KOTA
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Pencatatan alokasi voucher kesehatan dari pemerintah, masa aktif 7 hari, dan rekapitulasi penyaluran.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleSyncWithMembers(true)}
            disabled={isSyncing}
            className="btn py-2 px-3 bg-white dark:bg-[#1E2230] text-slate-800 dark:text-slate-200 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
            title="Sinkronisasikan data penerima dari Database Anggota dan Penerima Jasra Luar"
          >
            <RotateCcw size={14} className={isSyncing ? "animate-spin text-[#DC2626]" : "text-[#DC2626]"} />
            <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Data"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewBatchModal}
            className="btn py-2 px-3.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Catat penerimaan batch voucher baru dari pemerintah"
          >
            <Plus size={15} className="text-slate-950 shrink-0" />
            <span>Input Batch Baru</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDistributeModal}
            disabled={!activeBatch || batchRemaining.isExpired}
            className="btn py-2 px-3.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
            title="Catat penyerahan voucher ke anggota atau warga luar"
          >
            <Gift size={16} className="text-[#DC2626] shrink-0" />
            <span>Serahkan Voucher</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/transparansi?tab=jasra`;
              navigator.clipboard.writeText(url);
              if (onShowToast) onShowToast(`Link laporan Jasra berhasil disalin: ${url}`, "success");
            }}
            className="btn py-2 px-3.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            title="Salin URL transparansi Jasra ke clipboard"
          >
            <Copy size={14} className="text-[#DC2626]" />
            <span>Salin Link</span>
          </button>
        </div>
      </div>

      {/* 2. Active Government Batch Highlight Banner */}
      {activeBatch ? (
        <div className="card-brutal p-5 bg-[#FFFDF9] dark:bg-[#161822] border-[2.5px] border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b-2 border-black/10 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-500">
                  BATCH AKTIF
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Periode 7 Hari
                </span>
              </div>
              <h4 className="font-heading font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {activeBatch.batchName}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                <Building2 size={13} className="text-[#DC2626]" />
                <span>{activeBatch.source || "Pemerintah Kota San Andreas"}</span>
                <span>•</span>
                <Calendar size={13} className="text-[#FACC15]" />
                <span>Diterima: {formatJasraDate(activeBatch.receivedAt)}</span>
              </p>
            </div>

            {/* Countdown Badge & Expiration Indicator */}
            <div className={`p-3 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-3 shrink-0 ${
              batchRemaining.isExpired
                ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                : "bg-[#FACC15] text-slate-950"
            }`}>
              <Clock size={22} className={batchRemaining.isExpired ? "text-slate-500" : "text-[#DC2626]"} />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block leading-tight text-slate-800">
                  {batchRemaining.isExpired ? "Status Batch" : "Masa Berlaku"}
                </span>
                <strong className="font-heading font-black text-base block leading-tight">
                  {batchRemaining.isExpired ? "Kedaluwarsa" : `Sisa ${batchRemaining.daysRemaining} Hari`}
                </strong>
                <span className="text-[10px] font-mono block opacity-85 leading-tight">
                  s/d {formatJasraShortDate(batchRemaining.expiresAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Sisa Hari Penjelasan Real-time */}
          <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-200 flex items-center gap-2">
            <Info size={15} className="text-amber-600 shrink-0" />
            <div className="leading-normal text-[11px] sm:text-xs">
              Masa berlaku batch dihitung 7 hari sejak diterima (sampai {formatJasraShortDate(batchRemaining.expiresAt)}). Penerima yang dicatat hari ini otomatis mendapatkan sisa masa berlaku {batchRemaining.daysRemaining} hari.
            </div>
          </div>

          {/* 3 Metric Cards: Stok Treatment, Stok Pingsan, & Penyaluran */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {/* Treatment Stock */}
            <div className="card-brutal p-3.5 bg-white dark:bg-[#1C1F2B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Stok Treatment</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-400">
                  {effectiveRemainingTreatment} / {effectiveInitialTreatment} Sisa
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <strong className="font-heading font-black text-2xl text-slate-900 dark:text-slate-100">
                  {effectiveRemainingTreatment}
                </strong>
                <span className="text-xs text-slate-500 font-medium">Tersedia</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#DC2626] h-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((effectiveRemainingTreatment || 0) / (effectiveInitialTreatment || 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 text-right">
                Terdistribusi: {effectiveDistributedTreatment} voucher
              </span>
            </div>

            {/* Pingsan Stock */}
            <div className="card-brutal p-3.5 bg-white dark:bg-[#1C1F2B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Stok Pingsan</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-400">
                  {effectiveRemainingPingsan} / {effectiveInitialPingsan} Sisa
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <strong className="font-heading font-black text-2xl text-slate-900 dark:text-slate-100">
                  {effectiveRemainingPingsan}
                </strong>
                <span className="text-xs text-slate-500 font-medium">Tersedia</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FACC15] h-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((effectiveRemainingPingsan || 0) / (effectiveInitialPingsan || 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 text-right">
                Terdistribusi: {effectiveDistributedPingsan} voucher
              </span>
            </div>

            {/* Penerima Stats */}
            <div className="card-brutal p-3.5 bg-white dark:bg-[#1C1F2B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Penerima Manfaat</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-400">
                  {effectiveDistributedCount} Warga
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <strong className="font-heading font-black text-2xl text-emerald-600 dark:text-emerald-400">
                  {effectiveDistributedCount}
                </strong>
                <span className="text-xs text-slate-500 font-medium">Tercatat</span>
              </div>
              <div className="pt-2 border-t border-dashed border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">Total Voucher Keluar:</span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {effectiveDistributedTreatment + effectiveDistributedPingsan} Voucher
                </strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State if No Batch */
        <div className="card-brutal p-8 text-center bg-white dark:bg-[#161822] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000]">
          <ShieldAlert size={38} className="mx-auto text-[#DC2626] mb-2" />
          <h4 className="font-heading font-black text-base text-slate-900 dark:text-slate-100 uppercase">
            Belum Ada Gelombang Voucher Jasra dari Pemerintah
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Masukkan jumlah kuota voucher Treatment dan Pingsan yang diterima dari instansi pemerintah kota untuk memulai masa aktif 7 hari.
          </p>
          <button
            type="button"
            onClick={handleOpenNewBatchModal}
            className="btn text-xs py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black border-2 border-black mt-3 shadow-[2px_2px_0px_#000] cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>+ Catat Penerimaan Jasra dari Pemerintah</span>
          </button>
        </div>
      )}

      {/* 3. Distribution History Table & Filter Controls */}
      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col gap-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama penerima, No. IC / KTP, nomor HP..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded border-2 border-black dark:border-[#475569] bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `Semua (${distributions.length})` },
              { id: "MEMBER", label: "Anggota PPS" },
              { id: "NON_MEMBER", label: "Luar Anggota" },
              { id: "ACTIVE", label: "Voucher Aktif" },
              { id: "EXPIRED", label: "Kedaluwarsa" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-heading font-black border-2 transition-all cursor-pointer ${
                  filterType === f.id
                    ? "bg-[#FACC15] text-[#111827] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5"
                    : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 border-black/30 dark:border-slate-700 hover:border-black"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Distributions */}
        <div className="overflow-x-auto border-2 border-black dark:border-[#475569] rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-heading font-black uppercase text-[11px] tracking-wider border-b-2 border-black">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Penerima Manfaat</th>
                <th className="py-2.5 px-3">No. IC / KTP</th>
                <th className="py-2.5 px-3">Jatah Voucher</th>
                <th className="py-2.5 px-3">Tanggal Diberikan</th>
                <th className="py-2.5 px-3">Sisa Masa Berlaku</th>
                <th className="py-2.5 px-3">Gelombang Batch</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10 font-medium">
              {filteredDistributions.length > 0 ? (
                filteredDistributions.map((dist, idx) => {
                  const rem = calculateRecipientRemaining(dist, activeBatch);
                  const isMember = dist.recipientType === "MEMBER";

                  return (
                    <tr
                      key={dist.id}
                      className="hover:bg-amber-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {isMember ? (
                            <span className="w-5 h-5 rounded bg-[#FACC15] text-[#111827] border border-black flex items-center justify-center shrink-0" title="Anggota Resmi LSM PPS">
                              <UserCheck size={12} />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-black/30 flex items-center justify-center shrink-0" title="Warga Luar Anggota">
                              <UserX size={12} />
                            </span>
                          )}
                          <div>
                            <strong className="font-heading font-black text-slate-900 dark:text-slate-100 block">
                              {dist.recipientName}
                            </strong>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {isMember ? "Anggota Paguyuban" : "Warga Luar Anggota"}
                              {dist.phone ? ` • ${dist.phone}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {dist.citizenId || "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-400 font-mono text-[11px] font-bold text-amber-900 dark:text-amber-200">
                          <span>{dist.treatmentCount} Treatment</span>
                          <span>•</span>
                          <span>{dist.pingsanCount} Pingsan</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {formatJasraShortDate(dist.givenAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        {rem.isExpired ? (
                          <span className="badge-brutal text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-black font-bold">
                            Kedaluwarsa
                          </span>
                        ) : rem.daysRemaining <= 2 ? (
                          <span className="badge-brutal text-[10px] bg-[#DC2626] text-white border border-black font-black animate-pulse">
                            {rem.label}
                          </span>
                        ) : (
                          <span className="badge-brutal text-[10px] bg-[#FACC15] text-[#111827] border border-black font-black">
                            {rem.label}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                          Hingga {formatJasraShortDate(dist.batchExpiresAt)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px]" title={dist.batchName}>
                        {dist.batchName || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteDistribution(dist)}
                          className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-400 transition-colors cursor-pointer"
                          title="Batalkan & kembalikan kuota ke batch"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada data penyaluran voucher Jasra yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal: Catat Batch Jasra dari Pemerintah */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--card-bg)] border-[3px] border-black dark:border-[#475569] shadow-[6px_6px_0px_#000] rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-[#FACC15] text-[#111827] border-b-2 border-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-[#DC2626]" />
                <h4 className="font-heading font-black text-sm sm:text-base uppercase">
                  Input Batch Jasra Pemerintah
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white text-black border border-black flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nama / Periode Batch
                </label>
                <input
                  type="text"
                  required
                  value={batchFormData.batchName}
                  onChange={(e) => setBatchFormData({ ...batchFormData, batchName: e.target.value })}
                  placeholder="Contoh: Batch Alokasi Jasra (02 – 09 Nov 2026)"
                  className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Sumber / Instansi Pemberi
                </label>
                <input
                  type="text"
                  required
                  value={batchFormData.source}
                  onChange={(e) => setBatchFormData({ ...batchFormData, source: e.target.value })}
                  placeholder="Pemerintah Kota San Andreas / Dinas Kesehatan"
                  className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                />
              </div>

              {/* Kuota Treatment & Pingsan */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border-2 border-black dark:border-amber-700/60">
                <div>
                  <label className="block text-xs font-black text-[#DC2626] dark:text-red-400 uppercase mb-1">
                    Kuota Treatment
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchFormData.initialTreatment}
                    onChange={(e) => setBatchFormData({ ...batchFormData, initialTreatment: e.target.value })}
                    className="input-field w-full text-sm font-mono font-black py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">Contoh: 500 voucher</span>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#FACC15] dark:text-yellow-400 uppercase mb-1">
                    Kuota Pingsan
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchFormData.initialPingsan}
                    onChange={(e) => setBatchFormData({ ...batchFormData, initialPingsan: e.target.value })}
                    className="input-field w-full text-sm font-mono font-black py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">Contoh: 500 voucher</span>
                </div>

                <div className="col-span-2 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-bold">
                  <span>Total Voucher Diterima:</span>
                  <span className="font-mono font-black text-sm text-[#DC2626] dark:text-[#FACC15]">
                    {(Number(batchFormData.initialTreatment) || 0) + (Number(batchFormData.initialPingsan) || 0)} Voucher
                  </span>
                </div>
              </div>

              {/* Tanggal & Waktu Diterima */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Tanggal Diterima
                  </label>
                  <input
                    type="date"
                    required
                    value={batchFormData.receivedAtDate}
                    onChange={(e) => setBatchFormData({ ...batchFormData, receivedAtDate: e.target.value })}
                    className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Jam Diterima
                  </label>
                  <input
                    type="time"
                    required
                    value={batchFormData.receivedAtTime}
                    onChange={(e) => setBatchFormData({ ...batchFormData, receivedAtTime: e.target.value })}
                    className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                </div>
              </div>

              {/* Alert Countdown 7 Hari */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2">
                <Clock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Masa Berlaku 7 Hari Otomatis:</strong> Sistem akan mulai menghitung mundur 7 hari terhitung sejak tanggal &amp; jam di atas. Voucher yang diserahkan ke warga/anggota di hari ke-2 atau ke-3 akan memiliki sisa masa berlaku mengikuti batas 7 hari batch ini.
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows="2"
                  value={batchFormData.notes}
                  onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                  placeholder="Catatan penyerahan dari dinkes, syarat, dll..."
                  className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                />
              </div>

              <div className="pt-3 border-t-2 border-black/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn btn-secondary text-xs py-2 px-4 border-2 border-black font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn text-xs py-2 px-5 bg-[#FACC15] hover:bg-yellow-400 text-black font-black border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Simpan &amp; Aktifkan Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Bagikan Voucher ke Anggota / Warga Luar */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--card-bg)] border-[3px] border-black dark:border-[#475569] shadow-[6px_6px_0px_#000] rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-[#DC2626] text-white border-b-2 border-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={20} className="text-[#FACC15]" />
                <h4 className="font-heading font-black text-sm sm:text-base uppercase">
                  Serahkan Voucher Jasra
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDistributeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white text-black border border-black flex items-center justify-center font-bold hover:bg-yellow-400 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveDistribution} className="p-5 overflow-y-auto space-y-4">
              {/* Info Active Batch Remaining */}
              {activeBatch && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-2 border-black text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Batch Alokasi Aktif</span>
                    <strong className="font-heading font-black text-slate-900 dark:text-slate-100">
                      {activeBatch.batchName}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="badge-brutal text-[10px] bg-[#FACC15] text-black border border-black font-black">
                      Sisa Masa Berlaku: {batchRemaining.daysRemaining} Hari
                    </span>
                  </div>
                </div>
              )}

              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Target Penerima Voucher
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistFormData({ ...distFormData, recipientType: "MEMBER" })}
                    className={`py-2 px-3 rounded-lg text-xs font-heading font-black border-2 border-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      distFormData.recipientType === "MEMBER"
                        ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000]"
                        : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <UserCheck size={14} />
                    <span>Anggota Paguyuban</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistFormData({ ...distFormData, recipientType: "NON_MEMBER", selectedMemberId: "" })}
                    className={`py-2 px-3 rounded-lg text-xs font-heading font-black border-2 border-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      distFormData.recipientType === "NON_MEMBER"
                        ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000]"
                        : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <UserX size={14} />
                    <span>Warga Luar Anggota</span>
                  </button>
                </div>
              </div>

              {/* If Target is Member: Searchable Member Combobox */}
              {distFormData.recipientType === "MEMBER" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                      Pilih Anggota Paguyuban
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {membersList.length} Terdaftar
                    </span>
                  </div>

                  {distFormData.selectedMemberId && selectedMember ? (
                    /* Selected Member Preview Card */
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border-2 border-black dark:border-amber-500/60 shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedMember.photoUrl ? (
                          <img
                            src={selectedMember.photoUrl}
                            alt={selectedMember.fullName}
                            className="w-10 h-10 rounded-full border-2 border-black object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FACC15] text-slate-950 flex items-center justify-center font-heading font-black text-sm shrink-0">
                            {(distFormData.recipientName || "AG").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 truncate">
                              {distFormData.recipientName}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black text-[#FACC15]">
                              CID: {distFormData.citizenId || "-"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Telp: {distFormData.phone || "-"}</span>
                            <span>•</span>
                            {Boolean(selectedMember.voucherJasraReceived || selectedMember.voucherClaimedAt) ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">Pernah Klaim Jasra</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Belum Klaim Jasra</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDistFormData((prev) => ({
                            ...prev,
                            selectedMemberId: "",
                            recipientName: "",
                            citizenId: "",
                            phone: "",
                          }));
                          setIsMemberDropdownOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-heading font-black rounded bg-white dark:bg-[#1A1D26] hover:bg-slate-100 text-slate-900 dark:text-slate-200 border-2 border-black shadow-[1.5px_1.5px_0px_#000] shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    /* Search input + Dropdown list */
                    <div className="relative">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search size={15} />
                        </div>
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => {
                            setMemberSearch(e.target.value);
                            setIsMemberDropdownOpen(true);
                          }}
                          onFocus={() => setIsMemberDropdownOpen(true)}
                          placeholder="Ketik nama anggota atau Citizen ID..."
                          className="w-full pl-9 pr-9 py-2 text-xs font-bold rounded-lg border-2 border-black dark:border-[#475569] bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                        />
                        {memberSearch && (
                          <button
                            type="button"
                            onClick={() => setMemberSearch("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown list */}
                      {isMemberDropdownOpen && (
                        <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto divide-y divide-black/10 dark:divide-white/10 border-2 border-black dark:border-[#475569] rounded-lg bg-white dark:bg-[#1A1D26] shadow-[4px_4px_0px_#000]">
                          {filteredMembersForPicker.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500 font-medium">
                              Tidak ada anggota yang cocok dengan "{memberSearch}"
                            </div>
                          ) : (
                            filteredMembersForPicker.map((m) => {
                              const isClaimed = Boolean(m.voucherJasraReceived || m.voucherClaimedAt);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleSelectMember(m)}
                                  className="w-full text-left p-2.5 hover:bg-amber-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {m.photoUrl ? (
                                      <img
                                        src={m.photoUrl}
                                        alt=""
                                        className="w-7 h-7 rounded-full border border-black object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full border border-black bg-[#FACC15] text-slate-950 flex items-center justify-center font-heading font-black text-[10px] shrink-0">
                                        {(m.fullName || "AG").slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 truncate group-hover:text-[#DC2626] dark:group-hover:text-[#FACC15]">
                                        {m.fullName}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        CID: {m.icNumber || "-"} {m.callsign ? `• "${m.callsign}"` : ""}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                      isClaimed
                                        ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                                    }`}
                                  >
                                    {isClaimed ? "Pernah Klaim" : "Belum Klaim"}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* If Target is Non-Member: KTP Upload with OCR */}
              {distFormData.recipientType === "NON_MEMBER" && (
                <div className="space-y-3">
                  {/* Notice */}
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/50 text-xs text-amber-900 dark:text-amber-200">
                    Penyaluran jatah voucher Jasra (<strong>10 Tritmen • 10 Pingsan</strong>) untuk warga umum di luar anggota paguyuban. Cukup unggah foto KTP IC untuk scan otomatis.
                  </div>

                  {/* KTP Photo Upload / OCR Zone */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <ScanLine size={14} className="text-[#DC2626]" />
                      <span>Foto KTP IC Warga &amp; Scan Otomatis (OCR)</span>
                    </label>

                    {distFormData.ktpPhoto ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border-2 border-dashed border-black/30 dark:border-white/20 bg-slate-50 dark:bg-[#1C202C]">
                        <div className="relative w-28 h-20 rounded border-2 border-black overflow-hidden bg-slate-900 shrink-0 shadow-[2px_2px_0px_#000]">
                          <img
                            src={distFormData.ktpPhoto}
                            alt="KTP Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-heading font-black text-emerald-600 dark:text-emerald-400">
                              {isScanningOcr ? "Memindai KTP via OCR..." : "✓ Foto KTP Siap Disimpan"}
                            </span>
                            {isScanningOcr && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {isScanningOcr
                              ? "Membaca teks Nama & Citizen ID otomatis..."
                              : "Foto tersimpan di database dan tercatat sebagai bukti penyerahan."}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-[10px] border border-black/30">
                              Ganti Foto
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleKtpUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setDistFormData((prev) => ({
                                  ...prev,
                                  ktpPhoto: "",
                                  cidCandidates: [],
                                }))
                              }
                              className="px-2.5 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-[10px] cursor-pointer"
                            >
                              Hapus Foto
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-black/40 dark:border-white/20 bg-slate-50 dark:bg-[#1A1D27] hover:bg-amber-50 dark:hover:bg-[#202533] cursor-pointer transition-colors text-center group">
                        <ScanLine size={24} className="text-slate-400 group-hover:text-[#DC2626] transition-colors mb-1" />
                        <span className="font-heading font-black text-xs text-slate-800 dark:text-slate-200">
                          Klik untuk Unggah Foto KTP IC Warga
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          Sistem otomatis memindai Nama Lengkap &amp; Citizen ID via OCR cerdas
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleKtpUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Recipient Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nama Lengkap Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={distFormData.recipientName}
                    onChange={(e) => setDistFormData({ ...distFormData, recipientName: e.target.value.toUpperCase() })}
                    placeholder="Nama lengkap warga / IC..."
                    className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    No. IC / KTP (CID)
                  </label>
                  <input
                    type="text"
                    value={distFormData.citizenId}
                    onChange={(e) => setDistFormData({ ...distFormData, citizenId: e.target.value.toUpperCase() })}
                    placeholder="Contoh: CID-9021"
                    className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                  {distFormData.cidCandidates && distFormData.cidCandidates.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">Pilihan OCR:</span>
                      {distFormData.cidCandidates.map((cand) => (
                        <button
                          key={cand}
                          type="button"
                          onClick={() =>
                            setDistFormData((prev) => ({
                              ...prev,
                              citizenId: cand.toUpperCase(),
                            }))
                          }
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-400 cursor-pointer"
                        >
                          {cand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nomor Telepon / HP
                  </label>
                  <input
                    type="text"
                    value={distFormData.phone}
                    onChange={(e) => setDistFormData({ ...distFormData, phone: e.target.value })}
                    placeholder="Contoh: 555-0192"
                    className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Catatan / Keperluan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={distFormData.notes}
                    onChange={(e) => setDistFormData({ ...distFormData, notes: e.target.value })}
                    placeholder="Contoh: Warga Paleto Bay / Rekomendasi RT..."
                    className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                  />
                </div>
              </div>

              {/* Jatah Voucher yang Diberikan */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border-2 border-black">
                <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                  <span>Jumlah Voucher yang Diserahkan</span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">Standar: 10T + 10P</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#DC2626] uppercase mb-1">
                      Voucher Treatment
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={activeBatch?.remainingTreatment || 500}
                      required
                      value={distFormData.treatmentCount}
                      onChange={(e) => setDistFormData({ ...distFormData, treatmentCount: e.target.value })}
                      className="input-field w-full text-sm font-mono font-black py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                    />
                    <span className="text-[10px] text-slate-500">Tersedia: {activeBatch?.remainingTreatment || 0}</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#FACC15] uppercase mb-1">
                      Voucher Pingsan
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={activeBatch?.remainingPingsan || 500}
                      required
                      value={distFormData.pingsanCount}
                      onChange={(e) => setDistFormData({ ...distFormData, pingsanCount: e.target.value })}
                      className="input-field w-full text-sm font-mono font-black py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black"
                    />
                    <span className="text-[10px] text-slate-500">Tersedia: {activeBatch?.remainingPingsan || 0}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Remaining Warning */}
              <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500 text-xs text-emerald-900 dark:text-emerald-200">
                <strong>Masa Berlaku:</strong> Penerima voucher akan aktif dengan <strong>sisa masa berlaku {batchRemaining.daysRemaining} hari</strong> (berakhir pada {formatJasraShortDate(batchRemaining.expiresAt)} sesuai jadwal batch pemerintah).
              </div>

              <div className="pt-3 border-t-2 border-black/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="btn btn-secondary text-xs py-2 px-4 border-2 border-black font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn text-xs py-2 px-5 bg-[#DC2626] hover:bg-red-700 text-white font-black border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Simpan &amp; Serahkan Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
