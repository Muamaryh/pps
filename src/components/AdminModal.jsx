import React, { useState, useEffect, useRef } from "react";
import { X, Lock, Save, RotateCcw, Plus, Trash2, Shield, Layout, FileText, Users, Camera, Compass, Target, LogOut, Inbox, Phone, MessageSquare, Tag, CheckCircle2, Maximize2, ExternalLink, ShieldCheck, ShieldAlert, KeyRound, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Users2, User, FileSpreadsheet, Archive, Search, Download, Eye, Ticket, CheckSquare, Square, DollarSign, Gift, Check, Clock, Calendar, Edit2, Settings2, SlidersHorizontal, Sparkles, CreditCard, Fuel, Utensils, Wheat, ShoppingBag, Package } from "lucide-react";
import { saveCloudData, resetCloudData, loadCloudData, loadSubmissions, updateSubmissions } from "../services/firebase";
import {
  subscribeMembersCloud,
  deleteMemberCloud,
  exportMembersToExcel,
  exportMembersToZip,
  updateMemberKasAndVoucherCloud,
  getCurrentMonthKey,
  getCurrentMonthLabel,
  getCurrentWeekKey,
  getCurrentWeekLabel,
  isMemberKasPaidCurrentMonth,
  isMemberVoucherReceivedCurrentWeek,
  resetAllMembersKasCloud,
  resetAllMembersVouchersCloud,
} from "../services/memberService";
import {
  subscribeEventRegistrationsCloud,
  deleteEventRegistrationCloud,
  toggleEventCheckinCloud,
  toggleEventFeePaymentCloud,
  exportEventRegistrationsToExcel,
  subscribeEventsCloud,
  saveEventCloud,
  deleteEventCloud,
  toggleEventStatusCloud,
  DEFAULT_EVENT,
} from "../services/eventService";
import {
  loadBansosClaimsCloud,
  subscribeBansosClaimsCloud,
  toggleBansosStatusCloud,
  deleteBansosClaimCloud,
  exportBansosToExcel,
  loadBansosProgramsCloud,
  subscribeBansosProgramsCloud,
  saveBansosProgramCloud,
  deleteBansosProgramCloud,
  toggleBansosProgramStatusCloud,
  DEFAULT_BANSOS_PROGRAM,
} from "../services/bansosService";
import { hashPassword, verifyPassword, getLockoutState, recordFailedAttempt, resetLockoutState, DEFAULT_ADMIN_HASH, MAX_ATTEMPTS, LOCKOUT_DURATION_SECONDS } from "../utils/security";
import BrutalistDatePicker from "./BrutalistDatePicker";
import BrutalistConfirmModal from "./BrutalistConfirmModal";

const ADMIN_STORAGE_KEY = "pps_admin_session";

export default function AdminModal({
  isOpen,
  onClose,
  initialData,
  onDataSaved,
  onShowToast,
  isCloudLoading = false,
  eventsList: externalEventsList = [],
  bansosPrograms: externalBansosPrograms = [],
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const savedHash = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      return Boolean(savedHash);
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState("identity");
  const [isSaving, setIsSaving] = useState(false);

  // Anti Brute-Force Rate Limiting Lockout State
  const [lockoutState, setLockoutState] = useState(() => getLockoutState());

  // Password Change State for Tab Keamanan
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isApplyingPassword, setIsApplyingPassword] = useState(false);

  // Tab Navigation Ref & Scroll Helpers for Mobile
  const tabsNavRef = useRef(null);

  function scrollTabs(direction) {
    if (tabsNavRef.current) {
      const scrollAmount = direction === "left" ? -180 : 180;
      tabsNavRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }

  // Auto-scroll active tab into view when selected
  useEffect(() => {
    if (activeTab && tabsNavRef.current) {
      const activeEl = document.getElementById(`tab-nav-btn-${activeTab}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeTab]);

  // KTP Document Lightbox Preview State
  const [previewKtp, setPreviewKtp] = useState(null);

  // Helper untuk membuka gambar Base64 di Tab Baru tanpa terkena blokir browser/blank
  function openImageSafely(dataUrl, title = "Dokumen KTP IC") {
    if (!dataUrl) return;
    try {
      if (dataUrl.startsWith("data:")) {
        const parts = dataUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        window.open(dataUrl, "_blank");
      }
    } catch (err) {
      console.error("Gagal membuka gambar via blob:", err);
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
                img { max-width: 95vw; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border: 3px solid #000; border-radius: 8px; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="${title}" />
            </body>
          </html>
        `);
        w.document.close();
      }
    }
  }

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Ya, Lanjutkan",
    variant: "danger",
    onConfirm: () => {},
  });

  // Form State
  const [formData, setFormData] = useState(() => {
    if (!initialData) return null;
    try {
      return JSON.parse(JSON.stringify(initialData));
    } catch {
      return null;
    }
  });

  // Submissions State (Kotak Masuk Lapak & Meeting)
  const [submissions, setSubmissions] = useState([]);
  const [submissionFilter, setSubmissionFilter] = useState("all");

  // Member Database State (Integrated live from pendaftaran-paps)
  const [membersList, setMembersList] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [filterKas, setFilterKas] = useState("all"); // 'all' | 'paid' | 'unpaid'
  const [filterVoucher, setFilterVoucher] = useState("all"); // 'all' | 'received' | 'unreceived'

  // Event & Registration State
  const [eventsList, setEventsList] = useState(() => {
    if (Array.isArray(externalEventsList)) {
      return externalEventsList;
    }
    try {
      const cached = localStorage.getItem("pps_events_list_cache");
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    const isInit = typeof window !== "undefined" && localStorage.getItem("pps_events_initialized") === "true";
    return isInit ? [] : [DEFAULT_EVENT];
  });
  const [eventSubTab, setEventSubTab] = useState("events_manage"); // "events_manage" | "registrations"
  const [selectedEventFilter, setSelectedEventFilter] = useState("all");
  const [editingEvent, setEditingEvent] = useState(null); // null or object when modal open
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [eventSearchQuery, setEventSearchQuery] = useState("");

  // Bansos Warga State
  const [bansosPrograms, setBansosPrograms] = useState(() => {
    if (Array.isArray(externalBansosPrograms) && externalBansosPrograms.length > 0) {
      return externalBansosPrograms;
    }
    try {
      const cached = localStorage.getItem("pps_bansos_programs_cache");
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    return [DEFAULT_BANSOS_PROGRAM];
  });
  const [bansosSubTab, setBansosSubTab] = useState("programs_manage"); // "programs_manage" | "claims_data"
  const [editingBansosProgram, setEditingBansosProgram] = useState(null); // null or object when modal open
  const [isSavingBansosProgram, setIsSavingBansosProgram] = useState(false);
  const [selectedBansosProgramFilter, setSelectedBansosProgramFilter] = useState("ALL");

  useEffect(() => {
    if (Array.isArray(externalBansosPrograms) && externalBansosPrograms.length > 0) {
      setBansosPrograms(externalBansosPrograms);
    }
  }, [externalBansosPrograms]);

  const [bansosClaims, setBansosClaims] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_bansos_claims_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [bansosSearchQuery, setBansosSearchQuery] = useState("");
  const [bansosStatusFilter, setBansosStatusFilter] = useState("all"); // 'all' | 'unclaimed' | 'claimed'

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadSubmissions().then((data) => setSubmissions(data || []));
      const unsubscribeMembers = subscribeMembersCloud((list) => {
        setMembersList(list || []);
      });
      const unsubscribeEvents = subscribeEventRegistrationsCloud((list) => {
        setEventRegistrations(list || []);
      });
      const unsubscribeEventsList = subscribeEventsCloud((list) => {
        if (Array.isArray(list)) {
          setEventsList(list);
        }
      });
            loadBansosClaimsCloud().then((list) => {
        if (Array.isArray(list)) setBansosClaims(list);
      });
      const unsubscribeBansos = subscribeBansosClaimsCloud((list) => {
        if (Array.isArray(list)) setBansosClaims(list);
      });
      const unsubscribeBansosPrograms = subscribeBansosProgramsCloud((list) => {
        if (Array.isArray(list)) setBansosPrograms(list);
      });
      return () => {
        if (typeof unsubscribeMembers === "function") unsubscribeMembers();
        if (typeof unsubscribeEvents === "function") unsubscribeEvents();
        if (typeof unsubscribeEventsList === "function") unsubscribeEventsList();
        if (typeof unsubscribeBansos === "function") unsubscribeBansos();
        if (typeof unsubscribeBansosPrograms === "function") unsubscribeBansosPrograms();
      };
    }
  }, [isOpen, isAuthenticated]);

  // Handler: Toggle Kas Bulanan (Rp 4.000) - Admin Only
  async function handleToggleKas(member) {
    const isPaidNow = isMemberKasPaidCurrentMonth(member);
    const nextStatus = !isPaidNow;
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const monthKey = getCurrentMonthKey(now);
    const monthLabel = getCurrentMonthLabel(now);

    try {
      await updateMemberKasAndVoucherCloud(member.id, {
        kasPaid: nextStatus,
        kasPeriod: nextStatus ? monthKey : null,
        kasPaidDate: nextStatus ? dateStr : null,
        kasPeriodLabel: nextStatus ? monthLabel : null,
        kasAmount: nextStatus ? 4000 : 0,
      });
      onShowToast(
        nextStatus
          ? `Kas Rp 4.000 (${monthLabel}) untuk ${member.fullName || "Anggota"} berhasil dicatat LUNAS.`
          : `Status Kas untuk ${member.fullName || "Anggota"} diubah menjadi BELUM BAYAR.`,
        "success"
      );
    } catch (err) {
      console.error("Gagal toggle kas:", err);
      onShowToast("Gagal memperbarui status kas anggota.", "error");
    }
  }

  // Handler: Toggle Voucher Mingguan (10 Treatment & 10 Pingsan) - Admin Only
  async function handleToggleVoucherJasra(member) {
    const isReceivedNow = isMemberVoucherReceivedCurrentWeek(member);
    const nextStatus = !isReceivedNow;
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const weekKey = getCurrentWeekKey(now);
    const weekLabel = getCurrentWeekLabel(now);

    try {
      await updateMemberKasAndVoucherCloud(member.id, {
        voucherJasraReceived: nextStatus,
        voucherPeriod: nextStatus ? weekKey : null,
        voucherJasraDate: nextStatus ? dateStr : null,
        voucherPeriodLabel: nextStatus ? weekLabel : null,
        voucherJasraDetail: nextStatus ? { treatment: 10, pingsan: 10 } : null,
      });
      onShowToast(
        nextStatus
          ? `Voucher (10 Tritmen & 10 Pingsan) minggu ini untuk ${member.fullName || "Anggota"} BERHASIL DIAKTIFKAN.`
          : `Status Voucher untuk ${member.fullName || "Anggota"} dinonaktifkan.`,
        "info"
      );
    } catch (err) {
      console.error("Gagal toggle voucher:", err);
      onShowToast("Gagal memperbarui status voucher anggota.", "error");
    }
  }

  // Handler: Reset Manual Massal Uang Kas Bulanan
  function handleConfirmResetAllKas() {
    const monthLabel = getCurrentMonthLabel();
    setConfirmModal({
      isOpen: true,
      title: `Reset Status Kas Bulanan?`,
      message: `Apakah Anda yakin ingin me-reset status pembayaran Uang Kas seluruh anggota untuk periode ${monthLabel}? Seluruh anggota akan berstatus BELUM BAYAR.`,
      confirmText: "Ya, Reset Kas Semua Anggota",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await resetAllMembersKasCloud(membersList);
          onShowToast(`Status Kas seluruh anggota periode ${monthLabel} berhasil di-reset ke Belum Bayar.`, "success");
        } catch (err) {
          console.error("Gagal reset kas massal:", err);
          onShowToast("Gagal me-reset status kas anggota.", "error");
        }
      },
    });
  }

  // Handler: Reset Manual Massal Voucher Mingguan
  function handleConfirmResetAllVouchers() {
    const weekLabel = getCurrentWeekLabel();
    setConfirmModal({
      isOpen: true,
      title: `Reset Voucher Mingguan?`,
      message: `Apakah Anda yakin ingin me-reset status Voucher Tritmen & Pingsan seluruh anggota untuk periode minggu ${weekLabel}? Seluruh anggota akan berstatus BELUM KLAIM (siap klaim baru).`,
      confirmText: "Ya, Reset Voucher Semua Anggota",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await resetAllMembersVouchersCloud(membersList);
          onShowToast(`Voucher seluruh anggota periode ${weekLabel} berhasil di-reset.`, "success");
        } catch (err) {
          console.error("Gagal reset voucher massal:", err);
          onShowToast("Gagal me-reset voucher anggota.", "error");
        }
      },
    });
  }

  // Handler: Toggle Event Checkin
  async function handleToggleEventCheckin(reg) {
    try {
      await toggleEventCheckinCloud(reg.id, reg.checkedIn);
      onShowToast(
        reg.checkedIn
          ? `Status kehadiran ${reg.fullName} diubah menjadi BELUM HADIR.`
          : `Peserta ${reg.fullName} (${reg.ticketCode}) berhasil CHECK-IN di lokasi.`,
        "success"
      );
    } catch (err) {
      console.error("Gagal update check-in:", err);
      onShowToast("Gagal mengupdate kehadiran event.", "error");
    }
  }

  // Handler: Toggle $10.000 Entry Fee Payment
  async function handleToggleFeePaid(reg) {
    try {
      await toggleEventFeePaymentCloud(reg.id, reg.feePaid);
      onShowToast(
        reg.feePaid
          ? `Status bayar $10.000 ${reg.fullName} diubah menjadi BELUM BAYAR.`
          : `Biaya $10.000 dari ${reg.fullName} (${reg.ticketCode}) berhasil dicatat LUNAS.`,
        "success"
      );
    } catch (err) {
      console.error("Gagal update pembayaran $10.000:", err);
      onShowToast("Gagal mengupdate pembayaran $10.000.", "error");
    }
  }

  // Handler: Delete Event Registration
  function handleDeleteEventReg(reg) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Pendaftar Event",
      message: `Apakah Anda yakin ingin menghapus data registrasi event "${reg.fullName}" (${reg.ticketCode})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus Pendaftar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteEventRegistrationCloud(reg.id);
          onShowToast(`Pendaftar event ${reg.fullName} berhasil dihapus.`, "info");
        } catch (err) {
          console.error("Gagal menghapus pendaftar event:", err);
          onShowToast("Gagal menghapus data pendaftar event.", "error");
        }
      },
    });
  }

  // Handler: Export Event Registrations to Excel
  function handleExportEventExcel() {
    const listToExport =
      selectedEventFilter === "all"
        ? eventRegistrations
        : eventRegistrations.filter(
            (r) =>
              r.eventId === selectedEventFilter ||
              (!r.eventId && selectedEventFilter === "evt-pizzarena-civilian")
          );

    if (listToExport.length === 0) {
      onShowToast("Belum ada data pendaftar event untuk diunduh.", "warning");
      return;
    }
    const currentEvt = eventsList.find((e) => e.id === selectedEventFilter);
    const success = exportEventRegistrationsToExcel(
      listToExport,
      currentEvt?.title || "Semua_Event"
    );
    if (success) {
      onShowToast(
        `File Excel ${listToExport.length} Pendaftar Event berhasil diunduh.`,
        "success"
      );
    }
  }

  // Handler: Toggle Status Bansos Warga (Belum Diambil <-> Sudah Diambil)
  async function handleToggleBansos(claim) {
    try {
      const nextStatus = await toggleBansosStatusCloud(claim.id, claim.claimed, 'Admin LSM');
      onShowToast(
        nextStatus
          ? `Bansos untuk ${claim.fullName} (${claim.claimCode}) berhasil diserahkan (SUDAH DIAMBIL).`
          : `Status bansos untuk ${claim.fullName} dikembalikan menjadi BELUM DIAMBIL.`,
        'success'
      );
    } catch (err) {
      console.error('Gagal toggle status bansos:', err);
      onShowToast('Gagal memperbarui status bansos.', 'error');
    }
  }

  // Handler: Delete Bansos Claim
  function handleDeleteBansos(claim) {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Klaim Bansos',
      message: `Apakah Anda yakin ingin menghapus data klaim bansos "${claim.fullName}" (${claim.claimCode})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Data',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteBansosClaimCloud(claim.id);
          onShowToast(`Data klaim bansos ${claim.fullName} berhasil dihapus.`, 'info');
        } catch (err) {
          console.error('Gagal menghapus klaim bansos:', err);
          onShowToast('Gagal menghapus data klaim bansos.', 'error');
        }
      },
    });
  }

  // Handler: Export Bansos to Excel
  function handleExportBansosExcel() {
    let list = bansosClaims;
    if (bansosStatusFilter === 'unclaimed') {
      list = list.filter((c) => !c.claimed);
    } else if (bansosStatusFilter === 'claimed') {
      list = list.filter((c) => c.claimed);
    }

    if (bansosSearchQuery.trim()) {
      const q = bansosSearchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.fullName && c.fullName.toLowerCase().includes(q)) ||
          (c.citizenId && c.citizenId.toLowerCase().includes(q)) ||
          (c.claimCode && c.claimCode.toLowerCase().includes(q))
      );
    }

    if (selectedBansosProgramFilter !== "ALL") {
      list = list.filter((c) => c.programId === selectedBansosProgramFilter);
    }

    if (list.length === 0) {
      onShowToast('Tidak ada data bansos untuk diunduh.', 'warning');
      return;
    }

    const ok = exportBansosToExcel(list);
    if (ok) {
      onShowToast(`Data ${list.length} penerima Bansos berhasil diekspor ke Excel.`, 'success');
    } else {
      onShowToast('Gagal mengunduh file Excel Bansos.', 'error');
    }
  }

  // =========================================================================
  // HANDLERS: PROGRAM BANSOS (DYNAMIC PROGRAMS MANAGEMENT)
  // =========================================================================

  function handleOpenAddBansosProgram() {
    setEditingBansosProgram({
      id: "",
      title: "",
      tagline: "Program Kepedulian LSM Paguyuban Pizza Sandy Shores",
      status: "ACTIVE",
      items: [
        { name: "1 Paket Makanan", icon: "Utensils", desc: "Ransum konsumsi siap santap bergizi" },
        { name: "Uang Tunai $2.500 USD", icon: "DollarSign", desc: "Bantuan tunai langsung kebutuhan darurat" },
      ],
      totalCash: 2500,
      rules: [
        "Wajib mengunggah foto / tangkapan layar KTP IC yang jelas",
        "1 Citizen ID (CID) hanya berhak menerima 1 kali bantuan",
        "Pengambilan bantuan fisik dilakukan langsung di Kantor LSM Paguyuban Pizza Sandy Shores",
        "Tunjukkan bukti kupon digital atau sebutkan Citizen ID kepada Pengurus yang bertugas",
      ],
      showMessengerNotification: true,
      messengerHeading: "Bansos Warga Sandy Shores",
      messengerMessage: "Halo warga Sandy Shores! Paguyuban Pizza menyediakan paket bantuan 1 Paket Makanan dan Uang Tunai $2.500 USD untuk warga yang membutuhkan:",
      pillLabel: "1 Makanan + $2.500 USD",
    });
  }

  function handleOpenEditBansosProgram(prog) {
    setEditingBansosProgram({
      ...prog,
      items: Array.isArray(prog.items)
        ? prog.items.map((i) => ({ ...i }))
        : DEFAULT_BANSOS_PROGRAM.items.map((i) => ({ ...i })),
      rules: Array.isArray(prog.rules)
        ? [...prog.rules]
        : [...DEFAULT_BANSOS_PROGRAM.rules],
    });
  }

  function parseCurrencyNumber(str) {
    if (!str) return 0;
    let clean = String(str).replace(/[^\d.,]/g, "").trim();
    if (!clean) return 0;
    if (clean.includes(".") && clean.includes(",")) {
      if (clean.indexOf(".") < clean.indexOf(",")) {
        clean = clean.replace(/\./g, "").replace(",", ".");
      } else {
        clean = clean.replace(/,/g, "");
      }
    } else if (clean.includes(".")) {
      const parts = clean.split(".");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = parts.join("");
      }
    } else if (clean.includes(",")) {
      const parts = clean.split(",");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = parts.join("");
      }
    }
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  }

  function handleTotalCashChange(val) {
    const cashNum = Number(val) || 0;
    const formatted = cashNum.toLocaleString("id-ID");
    setEditingBansosProgram((prev) => {
      if (!prev) return prev;
      let hasCashItem = false;
      // Auto-update cash item in items list if present
      const updatedItems = (prev.items || []).map((it) => {
        if (it.icon === "DollarSign" || /uang|tunai|cash|\$/i.test(it.name)) {
          hasCashItem = true;
          return {
            ...it,
            name: `Uang Tunai $${formatted} USD`,
          };
        }
        return it;
      });

      if (!hasCashItem && cashNum > 0) {
        updatedItems.push({
          name: `Uang Tunai $${formatted} USD`,
          icon: "DollarSign",
          desc: "Bantuan tunai langsung untuk kebutuhan darurat",
        });
      }

      // Auto-update pillLabel if it contained a dollar amount
      let updatedPill = prev.pillLabel || "";
      if (/\$[\d.,]+/i.test(updatedPill)) {
        updatedPill = updatedPill.replace(/\$[\d.,]+(?:\s*USD)?/i, `$${formatted} USD`);
      } else if (cashNum > 0) {
        updatedPill = `${updatedItems[0]?.name || "Bansos"} + $${formatted} USD`;
      }

      // Auto-update messengerMessage if it contained a dollar amount
      let updatedMsg = prev.messengerMessage || "";
      if (/\$[\d.,]+/i.test(updatedMsg)) {
        updatedMsg = updatedMsg.replace(/\$[\d.,]+(?:\s*USD)?/i, `$${formatted} USD`);
      }

      return {
        ...prev,
        totalCash: cashNum,
        items: updatedItems,
        pillLabel: updatedPill,
        messengerMessage: updatedMsg,
      };
    });
  }

  async function handleSaveBansosProgram(e) {
    e.preventDefault();
    if (!editingBansosProgram.title.trim()) {
      onShowToast("Nama program bansos wajib diisi.", "error");
      return;
    }
    setIsSavingBansosProgram(true);
    try {
      const savedPayload = await saveBansosProgramCloud(editingBansosProgram);
      setBansosPrograms((prev) => {
        const exists = prev.some((p) => p.id === savedPayload.id);
        return exists
          ? prev.map((p) => (p.id === savedPayload.id ? savedPayload : p))
          : [savedPayload, ...prev];
      });
      onShowToast(`Program bansos "${editingBansosProgram.title}" berhasil disimpan!`, "success");
      setEditingBansosProgram(null);
    } catch (err) {
      console.error("Save bansos program err:", err);
      onShowToast("Gagal menyimpan program bansos.", "error");
    } finally {
      setIsSavingBansosProgram(false);
    }
  }

  async function handleToggleBansosProgramStatus(programId, currentStatus) {
    try {
      const nextStatus = await toggleBansosProgramStatusCloud(programId, currentStatus);
      setBansosPrograms((prev) =>
        prev.map((p) => (p.id === programId ? { ...p, status: nextStatus } : p))
      );
      onShowToast(
        `Status program berhasil diubah menjadi ${nextStatus === "ACTIVE" ? "AKTIF" : "NONAKTIF"}.`,
        "success"
      );
    } catch (err) {
      onShowToast("Gagal mengubah status program bansos.", "error");
    }
  }

  async function handleToggleBansosProgramMessenger(prog) {
    try {
      const nextVal = prog.showMessengerNotification === false;
      await saveBansosProgramCloud({
        ...prog,
        showMessengerNotification: nextVal,
      });
      setBansosPrograms((prev) =>
        prev.map((p) => (p.id === prog.id ? { ...p, showMessengerNotification: nextVal } : p))
      );
      onShowToast(
        `Pop-up notifikasi untuk program "${prog.title}" ${nextVal ? "diaktifkan" : "dinonaktifkan"}.`,
        "success"
      );
    } catch (err) {
      onShowToast("Gagal mengubah pengaturan pop-up bansos.", "error");
    }
  }

  function handleDeleteBansosProgram(prog) {
    const claimsCount = bansosClaims.filter((c) => c.programId === prog.id).length;
    setConfirmModal({
      isOpen: true,
      title: "Hapus Program Bansos?",
      message: `Apakah Anda yakin ingin menghapus program "${prog.title}"?${
        claimsCount > 0 ? ` (Catatan: Ada ${claimsCount} data klaim warga yang terkait dengan program ini).` : ""
      }`,
      confirmText: "Ya, Hapus Program",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteBansosProgramCloud(prog.id);
          setBansosPrograms((prev) => prev.filter((p) => p.id !== prog.id));
          onShowToast(`Program bansos "${prog.title}" berhasil dihapus.`, "info");
        } catch (err) {
          console.error("Gagal hapus program bansos:", err);
          onShowToast("Gagal menghapus program bansos.", "error");
        }
      },
    });
  }

  function handleAddBansosItem() {
    if (!editingBansosProgram) return;
    setEditingBansosProgram({
      ...editingBansosProgram,
      items: [
        ...(editingBansosProgram.items || []),
        { name: "Paket Baru", icon: "Gift", desc: "Bantuan tambahan" },
      ],
    });
  }

  function handleRemoveBansosItem(idx) {
    if (!editingBansosProgram) return;
    const items = [...(editingBansosProgram.items || [])];
    items.splice(idx, 1);
    setEditingBansosProgram({
      ...editingBansosProgram,
      items,
    });
  }

  function handleUpdateBansosItem(idx, field, value) {
    if (!editingBansosProgram) return;
    const items = [...(editingBansosProgram.items || [])];
    items[idx] = {
      ...items[idx],
      [field]: value,
    };

    let nextTotalCash = editingBansosProgram.totalCash;
    let nextPill = editingBansosProgram.pillLabel;
    let nextMsg = editingBansosProgram.messengerMessage;

    // If editing the cash item name, auto-sync totalCash, pillLabel, and message
    if (field === "name" && (items[idx].icon === "DollarSign" || /uang|tunai|cash|\$/i.test(value))) {
      const parsedNum = parseCurrencyNumber(value);
      if (parsedNum > 0) {
        nextTotalCash = parsedNum;
        const formatted = parsedNum.toLocaleString("id-ID");
        if (nextPill && /\$[\d.,]+/i.test(nextPill)) {
          nextPill = nextPill.replace(/\$[\d.,]+(?:\s*USD)?/i, `$${formatted} USD`);
        }
        if (nextMsg && /\$[\d.,]+/i.test(nextMsg)) {
          nextMsg = nextMsg.replace(/\$[\d.,]+(?:\s*USD)?/i, `$${formatted} USD`);
        }
      }
    }

    setEditingBansosProgram({
      ...editingBansosProgram,
      items,
      totalCash: nextTotalCash,
      pillLabel: nextPill,
      messengerMessage: nextMsg,
    });
  }

  // Handler: Open Add Event Modal
  function handleOpenAddEvent() {
    setEditingEvent({
      id: "",
      title: "",
      organizer: "LSM Paguyuban Pizza Sandy Shores",
      tagline: "",
      status: "OPEN",
      entryFee: "$10.000 USD",
      ticketPrefix: "PPS-EVT",
      requirements: [
        "Khusus warga sipil / Civilian (Freelancer)",
        "Wajib No Gang (Unaffiliated / tidak terafiliasi kelompok kriminal)",
        "Biaya pendaftaran $10.000 USD diserahkan saat verifikasi di lokasi",
        "Wajib memiliki identitas KTP IC yang masih berlaku",
      ],
      requireOcr: true,
      requireCivilianOnly: true,
      requireNoGangOnly: true,
      requireHpIc: true,
      requireDiscord: true,
      showMessengerNotification: true,
      messengerHeading: "Ada Event Baru!",
      messengerMessage: "Halo warga! LSM Paguyuban Pizza Sandy Shores mempersembahkan event baru nih!",
      sampleImage: "/contoh-ss-ktp2.jpg",
      description: "",
    });
  }

  // Handler: Open Edit Event Modal
  function handleOpenEditEvent(evt) {
    setEditingEvent({
      ...evt,
      sampleImage: evt.sampleImage || "/contoh-ss-ktp2.jpg",
      requirements: Array.isArray(evt.requirements) && evt.requirements.length > 0
        ? evt.requirements
        : typeof evt.requirements === "string" && evt.requirements.trim()
        ? evt.requirements.split(/\r?\n/).filter(Boolean)
        : [
            "Khusus warga sipil / Civilian (Freelancer)",
            "Wajib No Gang (Unaffiliated / tidak terafiliasi kelompok kriminal)",
            `Biaya pendaftaran ${evt.entryFee || "$10.000 USD"} diserahkan saat verifikasi di lokasi`,
            "Wajib memiliki identitas KTP IC yang masih berlaku",
          ],
    });
  }

  // Handler: Save Event
  async function handleSaveEvent(e) {
    e.preventDefault();
    if (!editingEvent.title.trim()) {
      onShowToast("Judul event wajib diisi.", "error");
      return;
    }
    setIsSavingEvent(true);
    try {
      await saveEventCloud(editingEvent);
      onShowToast(`Event "${editingEvent.title}" berhasil disimpan!`, "success");
      setEditingEvent(null);
    } catch (err) {
      console.error("Save event err:", err);
      onShowToast("Gagal menyimpan event ke server.", "error");
    } finally {
      setIsSavingEvent(false);
    }
  }

  // Handler: Quick Toggle Status Event (OPEN <-> CLOSED)
  async function handleToggleEventStatus(evt) {
    const nextStatus = evt.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      await toggleEventStatusCloud(evt.id, evt.status);
      onShowToast(
        nextStatus === "OPEN"
          ? `Pendaftaran "${evt.title}" DIBUKA!`
          : `Pendaftaran "${evt.title}" DITUTUP.`,
        nextStatus === "OPEN" ? "success" : "info"
      );
    } catch (err) {
      console.error("Toggle event status err:", err);
      onShowToast("Gagal mengubah status event.", "error");
    }
  }

  // Handler: Delete Event Confirmation
  function handleDeleteEvent(evt) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Event Dari Portal",
      message: `Apakah Anda yakin ingin menghapus event "${evt.title}"? Event ini tidak akan lagi tampil di web publik maupun portal admin.`,
      confirmText: "Ya, Hapus Event",
      variant: "danger",
      onConfirm: async () => {
        try {
          setEventsList((prev) => prev.filter((e) => e.id !== evt.id));
          await deleteEventCloud(evt.id);
          onShowToast(`Event "${evt.title}" berhasil dihapus.`, "info");
        } catch (err) {
          console.error("Delete event err:", err);
          onShowToast("Gagal menghapus event.", "error");
        }
      },
    });
  }

  // Handlers for Member Database
  function handleDeleteMember(memberId, memberName) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Anggota Dari Database",
      message: `Apakah Anda yakin ingin menghapus data anggota "${memberName || memberId}"? Data profil dan arsip KTP ini akan dihapus permanen dari Database Anggota LSM PPS.`,
      confirmText: "Ya, Hapus Anggota",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteMemberCloud(memberId);
          onShowToast(`Data anggota ${memberName || memberId} berhasil dihapus.`, "info");
        } catch (err) {
          console.error("Gagal menghapus anggota:", err);
          onShowToast("Gagal menghapus anggota dari database.", "error");
        }
      },
    });
  }

  function handleExportExcel() {
    if (membersList.length === 0) {
      onShowToast("Tidak ada data anggota untuk diexport.", "error");
      return;
    }
    const ok = exportMembersToExcel(membersList);
    if (ok) {
      onShowToast("File Excel data anggota berhasil diunduh!", "success");
    } else {
      onShowToast("Gagal mengekspor data Excel.", "error");
    }
  }

  async function handleExportZip() {
    if (membersList.length === 0) {
      onShowToast("Tidak ada data anggota untuk dibackup.", "error");
      return;
    }
    setIsExportingZip(true);
    try {
      const ok = await exportMembersToZip(membersList);
      if (ok) {
        onShowToast("Backup ZIP lengkap (+ Foto & Excel) berhasil diunduh!", "success");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Gagal membuat file backup ZIP.", "error");
    } finally {
      setIsExportingZip(false);
    }
  }

  async function handleUpdateSubmissionStatus(id, newStatus) {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        const item = { ...sub, status: newStatus };
        // Otomatis bersihkan foto KTP jika tiket sudah diproses (approved / rejected / completed)
        if (newStatus !== "pending") {
          delete item.fotoWajahIc;
          delete item.ktpImage;
          item.ktpVerified = true;
        }
        return item;
      }
      return sub;
    });
    setSubmissions(updated);
    await updateSubmissions(updated);
    if (newStatus !== "pending") {
      onShowToast(`Status tiket #${id} diubah ke ${newStatus}. Foto KTP otomatis dibersihkan dari arsip.`, "success");
    } else {
      onShowToast(`Status tiket #${id} diubah ke ${newStatus}`, "info");
    }
  }

  // Fungsi tambahan: Hapus foto KTP manual per tiket tanpa mengubah status
  async function handlePurgeKtpImage(id) {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        const item = { ...sub };
        delete item.fotoWajahIc;
        delete item.ktpImage;
        item.ktpVerified = true;
        return item;
      }
      return sub;
    });
    setSubmissions(updated);
    await updateSubmissions(updated);
    onShowToast(`Foto KTP tiket #${id} berhasil dibersihkan dari arsip.`, "info");
  }

  async function handleUpdateSubmissionNote(id, note) {
    const updated = submissions.map((sub) => (sub.id === id ? { ...sub, adminNotes: note } : sub));
    setSubmissions(updated);
    await updateSubmissions(updated);
    onShowToast(`Catatan tiket #${id} berhasil disimpan`, "success");
  }

  function handleDeleteSubmission(id) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Tiket Warga",
      message: `Apakah Anda yakin ingin menghapus tiket pengajuan #${id}? Seluruh data identitas dan arsip tiket ini akan dihapus permanen dari sistem.`,
      confirmText: "Ya, Hapus Tiket",
      variant: "danger",
      onConfirm: async () => {
        const updated = submissions.filter((sub) => sub.id !== id);
        setSubmissions(updated);
        await updateSubmissions(updated);
        onShowToast(`Tiket #${id} dihapus dari daftar`, "info");
      },
    });
  }

  useEffect(() => {
    if (initialData) {
      const cloned = JSON.parse(JSON.stringify(initialData));
      if (!cloned.heroPillars || cloned.heroPillars.length < 4) {
        cloned.heroPillars = [
          { label: "Wilayah Kerja", title: "Sandy Shores & Sekitarnya" },
          { label: "Pemberdayaan UMKM", title: "Pengelolaan Lapak Warga" },
          { label: "Solidaritas Sosial", title: "Aksi Gotong Royong Warga" },
          { label: "Advokasi Aspirasi", title: "Mitra Dialog Pemerintah Kota" }
        ];
      }
      if (!cloned.aboutHeader) {
        cloned.aboutHeader = {
          label: "TENTANG KAMI",
          title: "Profil & Arah Gerakan PPS",
          badge: "MANIFESTO RESMI"
        };
      }
      if (!cloned.aboutPillars || cloned.aboutPillars.length < 3) {
        cloned.aboutPillars = [
          {
            badge: "Kepedulian Warga",
            title: "Solidaritas & Aksi Sosial",
            desc: "Menghidupkan gotong royong warga melalui bakti sosial, pertemuan rutin, serta kepedulian nyata bagi warga yang membutuhkan di kawasan Sandy Shores.",
            status: "Program Aktif Berkelanjutan"
          },
          {
            badge: "Kemandirian Usaha",
            title: "Pemberdayaan UMKM",
            desc: "Mendorong kemandirian ekonomi warga melalui penyediaan stand usaha, pengelolaan lapak dagang berizin, serta pembinaan keterampilan usaha lokal.",
            status: "Program Aktif Berkelanjutan"
          },
          {
            badge: "Jembatan Komunikasi",
            title: "Advokasi & Aspirasi Kota",
            desc: "Menjadi mitra dialog yang konstruktif bagi Government Ime City dalam menyalurkan suara warga demi terciptanya kebijakan publik yang adil dan terbuka.",
            status: "Program Aktif Berkelanjutan"
          }
        ];
      }
      if (!cloned.visionMission) {
        cloned.visionMission = {
          visionLabel: "Visi Komunitas",
          visionTitle: "“Terwujudnya Masyarakat Sandy Shores yang Kompak, Mandiri, dan Bermartabat Bersama.”",
          visionDesc: "Kemajuan suatu kawasan bertumpu pada solidaritas warganya. Melalui gotong royong dan keterbukaan, LSM Paguyuban Pizza Sandy Shores berikhtiar merangkul setiap potensi demi lingkungan yang tertib, harmonis, dan mandiri.",
          missionTitle: "Misi Pokok Lembaga:",
          missionItems: [
            "Menampung dan memperjuangkan aspirasi warga secara bertanggung jawab ke otoritas kota.",
            "Membuka ruang usaha mandiri melalui fasilitas stan & lapak UMKM warga berizin.",
            "Menggerakkan aksi sosial, pertemuan warga, dan kegiatan kebersamaan yang teratur."
          ]
        };
      }
      if (!cloned.charterTitle) {
        cloned.charterTitle = "Naskah Pendirian & Penjelasan Lengkap LSM";
      }
      if (!cloned.discordUrl) {
        cloned.discordUrl = "https://discord.gg/gb7ajBMduF";
      }
      if (!cloned.discordVisitorUrl) {
        cloned.discordVisitorUrl = "https://discord.gg/gb7ajBMduF";
      }
      setFormData(cloned);
    }
  }, [initialData, isOpen]);

  // Ticking countdown timer for anti brute-force lockout
  useEffect(() => {
    const timer = setInterval(() => {
      setLockoutState(getLockoutState());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-login from localStorage / sessionStorage if remembered
  useEffect(() => {
    async function checkAutoLogin() {
      if (!isOpen) return;
      const savedHash = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (!savedHash) {
        setIsAuthenticated(false);
        return;
      }

      // Sangat Penting: Jika data cloud masih dalam proses loading, JANGAN hapus sesi!
      // Karena initialData kemungkinan masih berupa fallback sebelum sinkronisasi cloud selesai.
      if (isCloudLoading) return;

      const targetCredential = initialData?.adminPassHash || initialData?.adminPass || DEFAULT_ADMIN_HASH;
      let targetHash = targetCredential;
      if (typeof targetCredential === "string" && (targetCredential.length !== 64 || !/^[0-9a-fA-F]+$/.test(targetCredential))) {
        targetHash = await hashPassword(targetCredential);
      }

      if (savedHash.toLowerCase() === targetHash.toLowerCase()) {
        setIsAuthenticated(true);
      } else {
        // Password telah diubah secara resmi di cloud database! Hapus token sesi lama di perangkat ini
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        setIsAuthenticated(false);
      }
    }
    checkAutoLogin();
  }, [initialData, isOpen, isCloudLoading]);

  useEffect(() => {
    if (!isOpen) {
      setPasswordInput("");
      const savedHash = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (!savedHash) {
        setIsAuthenticated(false);
      }
    }
  }, [isOpen]);

  if (!isOpen || !formData) return null;

  // Handle Login with SHA-256 and brute-force lockout
  async function handleLogin(e) {
    e?.preventDefault();

    // Check if locked out
    const currentLockout = getLockoutState();
    if (currentLockout.isLocked) {
      onShowToast(`Sistem terkunci! Tunggu ${currentLockout.remainingSeconds} detik lagi.`, "error");
      return;
    }

    const input = passwordInput.trim();
    if (!input) {
      onShowToast("Masukkan password terlebih dahulu!", "error");
      return;
    }

    let credentialSource = initialData;
    // Jika data cloud masih loading atau belum ada hash, ambil fresh data langsung dari Firestore
    if (isCloudLoading || !credentialSource?.adminPassHash) {
      try {
        const fresh = await loadCloudData();
        if (fresh) credentialSource = fresh;
      } catch (err) {
        console.warn("Could not fetch fresh cloud data for login verification:", err);
      }
    }

    const targetCredential = credentialSource?.adminPassHash || credentialSource?.adminPass || DEFAULT_ADMIN_HASH;
    const isValid = await verifyPassword(input, targetCredential);

    if (isValid) {
      resetLockoutState();
      setLockoutState(getLockoutState());
      setIsAuthenticated(true);

      const computedHash = await hashPassword(input);
      if (rememberMe) {
        localStorage.setItem(ADMIN_STORAGE_KEY, computedHash);
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      } else {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, computedHash);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
      onShowToast("Akses Admin Terverifikasi!", "success");
    } else {
      const nextLockout = recordFailedAttempt();
      setLockoutState(nextLockout);
      if (nextLockout.isLocked) {
        onShowToast(`Percobaan salah 5x! Akses terkunci selama ${LOCKOUT_DURATION_SECONDS} detik.`, "error");
      } else {
        const remaining = MAX_ATTEMPTS - nextLockout.attempts;
        onShowToast(`Password salah! Sisa percobaan: ${remaining}x lagi.`, "error");
      }
    }
  }

  // Handle Logout
  function handleLogout() {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setIsAuthenticated(false);
    setPasswordInput("");
    onShowToast("Berhasil keluar dari sesi admin.", "info");
  }

  // Handle apply new password in Tab Keamanan
  async function handleApplyNewPassword() {
    if (!newPassword) {
      onShowToast("Masukkan password baru!", "error");
      return;
    }
    if (newPassword.length < 6) {
      onShowToast("Password baru minimal 6 karakter demi keamanan!", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast("Konfirmasi password tidak cocok! Silakan periksa kembali.", "error");
      return;
    }

    setIsApplyingPassword(true);
    try {
      const newHash = await hashPassword(newPassword);
      const updatedFormData = {
        ...formData,
        adminPassHash: newHash,
      };
      delete updatedFormData.adminPass;

      // Langsung simpan ke Database terpusat secara otomatis!
      await saveCloudData(updatedFormData);

      setFormData(updatedFormData);
      onDataSaved(updatedFormData);

      // Update current session with new hash so current admin stays logged in
      if (localStorage.getItem(ADMIN_STORAGE_KEY)) {
        localStorage.setItem(ADMIN_STORAGE_KEY, newHash);
      } else {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, newHash);
      }

      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      onShowToast("Password baru berhasil dienkripsi & disimpan ke Database! Semua perangkat lain otomatis ter-logout.", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyimpan password ke database: " + (err?.message || ""), "error");
    } finally {
      setIsApplyingPassword(false);
    }
  }

  // Image Compressor via Canvas
  function compressImage(file, callback, maxSize = 650, quality = 0.65) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        callback(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Discord & Community Link Handlers
  function handleDiscordUrlChange(newUrl) {
    const trimmed = (newUrl || "").trim();
    let updatedNavLinks = formData?.navLinks || "";
    if (updatedNavLinks && (updatedNavLinks.includes("discord.gg") || /discord\s*\|\s*https?:\/\/[^\s,]+/i.test(updatedNavLinks))) {
      updatedNavLinks = updatedNavLinks.replace(
        /(discord\s*\|\s*)https?:\/\/[^\s,]+/i,
        `$1${trimmed}`
      );
    }
    setFormData((prev) => ({
      ...prev,
      discordUrl: newUrl,
      navLinks: updatedNavLinks,
    }));
  }

  function handleDiscordVisitorUrlChange(newUrl) {
    setFormData((prev) => ({
      ...prev,
      discordVisitorUrl: newUrl,
    }));
  }

  function handleNavLinksChange(newNav) {
    let nextDiscordUrl = formData?.discordUrl;
    const match = newNav.match(/discord\s*\|\s*(https?:\/\/[^\s,]+)/i);
    if (match && match[1]) {
      nextDiscordUrl = match[1].trim();
    }
    setFormData((prev) => ({
      ...prev,
      navLinks: newNav,
      discordUrl: nextDiscordUrl,
    }));
  }

  // Member Management
  function handleAddMember() {
    setFormData((prev) => ({
      ...prev,
      org: [...prev.org, { level: 3, role: "Jabatan Baru", name: "Nama Anggota", photo: "" }]
    }));
    onShowToast("Baris anggota baru ditambahkan", "info");
  }

  function handleRemoveMember(index) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      newOrg.splice(index, 1);
      return { ...prev, org: newOrg };
    });
    onShowToast("Anggota dihapus dari daftar", "info");
  }

  function handleMemberChange(index, field, value) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      newOrg[index] = { ...newOrg[index], [field]: field === "level" ? Number(value) || 1 : value };
      return { ...prev, org: newOrg };
    });
  }

  function handleMemberPhoto(index, file) {
    if (!file) return;
    compressImage(file, (base64) => {
      handleMemberChange(index, "photo", base64);
      onShowToast("Foto profil berhasil diunggah!", "success");
    }, 320, 0.65);
  }

  // Gallery Management
  function handleAddGallery() {
    setFormData((prev) => ({
      ...prev,
      gallery: [
        {
          title: "Judul Kegiatan Baru",
          desc: "Keterangan dokumentasi kegiatan.",
          date: "Sabtu, 17 Oktober 2026",
          location: "SS Area",
          photo: "",
          photos: []
        },
        ...prev.gallery
      ]
    }));
    onShowToast("Baris dokumentasi baru ditambahkan di paling atas", "info");
  }

  function handleRemoveGallery(index) {
    setFormData((prev) => {
      const newGal = [...prev.gallery];
      newGal.splice(index, 1);
      return { ...prev, gallery: newGal };
    });
    onShowToast("Dokumentasi dihapus dari daftar", "info");
  }

  function handleGalleryChange(index, field, value) {
    setFormData((prev) => {
      const newGal = [...prev.gallery];
      newGal[index] = { ...newGal[index], [field]: value };
      return { ...prev, gallery: newGal };
    });
  }

  function getGalleryItemPhotos(item) {
    if (Array.isArray(item.photos) && item.photos.length > 0) {
      return item.photos;
    }
    if (item.photo) {
      return [item.photo];
    }
    return [];
  }

  function handleAddGalleryPhoto(index, file) {
    if (!file) return;
    compressImage(file, (base64) => {
      setFormData((prev) => {
        const newGal = [...prev.gallery];
        const item = { ...newGal[index] };
        const existingPhotos = Array.isArray(item.photos) && item.photos.length > 0
          ? [...item.photos]
          : item.photo
          ? [item.photo]
          : [];
        existingPhotos.push(base64);
        item.photos = existingPhotos;
        item.photo = existingPhotos[0];
        newGal[index] = item;
        return { ...prev, gallery: newGal };
      });
      onShowToast("Foto baru berhasil ditambahkan!", "success");
    }, 750, 0.60);
  }

  function handleRemoveGalleryPhoto(galleryIdx, photoIdx) {
    setFormData((prev) => {
      const newGal = [...prev.gallery];
      const item = { ...newGal[galleryIdx] };
      const existingPhotos = Array.isArray(item.photos) && item.photos.length > 0
        ? [...item.photos]
        : item.photo
        ? [item.photo]
        : [];
      existingPhotos.splice(photoIdx, 1);
      item.photos = existingPhotos;
      item.photo = existingPhotos[0] || "";
      newGal[galleryIdx] = item;
      return { ...prev, gallery: newGal };
    });
    onShowToast("Foto dihapus dari kegiatan", "info");
  }

  // Hero Pillars Management
  function handleHeroPillarChange(index, field, value) {
    setFormData((prev) => {
      const newPillars = [...(prev.heroPillars || [])];
      newPillars[index] = { ...newPillars[index], [field]: value };
      return { ...prev, heroPillars: newPillars };
    });
  }

  // About Header Management
  function handleAboutHeaderChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      aboutHeader: {
        ...(prev.aboutHeader || {}),
        [field]: value
      }
    }));
  }

  // About Pillars Management
  function handleAboutPillarChange(index, field, value) {
    setFormData((prev) => {
      const newPillars = [...(prev.aboutPillars || [])];
      newPillars[index] = { ...newPillars[index], [field]: value };
      return { ...prev, aboutPillars: newPillars };
    });
  }

  // Vision & Mission Management
  function handleVisionMissionChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      visionMission: {
        ...(prev.visionMission || {}),
        [field]: value
      }
    }));
  }

  function handleMissionItemChange(index, value) {
    setFormData((prev) => {
      const items = [...(prev.visionMission?.missionItems || [])];
      items[index] = value;
      return {
        ...prev,
        visionMission: {
          ...(prev.visionMission || {}),
          missionItems: items
        }
      };
    });
  }

  function handleAddMissionItem() {
    setFormData((prev) => {
      const items = [...(prev.visionMission?.missionItems || []), "Poin misi baru..."];
      return {
        ...prev,
        visionMission: {
          ...(prev.visionMission || {}),
          missionItems: items
        }
      };
    });
  }

  function handleRemoveMissionItem(index) {
    setFormData((prev) => {
      const items = [...(prev.visionMission?.missionItems || [])];
      items.splice(index, 1);
      return {
        ...prev,
        visionMission: {
          ...(prev.visionMission || {}),
          missionItems: items
        }
      };
    });
  }

  // Save to Firebase
  async function handleSave() {
    setIsSaving(true);
    try {
      await saveCloudData(formData);
      // Synchronize session storage with active password hash
      const activeHash = formData.adminPassHash || DEFAULT_ADMIN_HASH;
      if (localStorage.getItem(ADMIN_STORAGE_KEY)) {
        localStorage.setItem(ADMIN_STORAGE_KEY, activeHash);
      } else if (sessionStorage.getItem(ADMIN_STORAGE_KEY)) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, activeHash);
      }
      onDataSaved(formData);
      onShowToast("Perubahan berhasil disimpan ke Database!", "success");
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Gagal menyimpan perubahan data.";
      onShowToast(`Gagal menyimpan: ${msg}`, "error");
    } finally {
      setIsSaving(false);
    }
  }

  // Reset to Default
  function handleReset() {
    setConfirmModal({
      isOpen: true,
      title: "Reset Konfigurasi Default",
      message: "Apakah Anda yakin ingin mereset seluruh data website PPS ke pengaturan awal bawaan sistem? Seluruh perubahan konfigurasi yang belum disimpan akan dikembalikan.",
      confirmText: "Ya, Reset Semua",
      variant: "warning",
      onConfirm: async () => {
        try {
          const resetData = await resetCloudData();
          setFormData(resetData);
          onDataSaved(resetData);
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          sessionStorage.removeItem(ADMIN_STORAGE_KEY);
          onShowToast("Data berhasil direset ke pengaturan awal!", "success");
          onClose();
        } catch {
          onShowToast("Gagal mereset data.", "error");
        }
      },
    });
  }

  const tabs = [
    { id: "identity", label: "Brand & Menu", icon: Layout },
    { id: "hero", label: "Beranda & 4 Pilar", icon: Compass },
    { id: "about", label: "Tentang & Visi", icon: FileText },
    { id: "org", label: "Pengurus", icon: Users },
    { id: "gallery", label: "Galeri Foto", icon: Camera },
    { id: "submissions", label: `Kotak Masuk (${submissions.length})`, icon: Inbox },
    { id: "members_db", label: `Database Anggota (${membersList.length})`, icon: Users2 },
    { id: "event_db", label: `Kelola Event (${eventsList.length})`, icon: Ticket },
    { id: "bansos_db", label: `Bansos Warga (${bansosClaims.length})`, icon: Gift },
    { id: "security", label: "Keamanan", icon: Shield },
  ];

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getCurrentMonthLabel();
  const currentWeekKey = getCurrentWeekKey();
  const currentWeekLabel = getCurrentWeekLabel();

  const totalKasLunasCount = membersList.filter((m) => isMemberKasPaidCurrentMonth(m, currentMonthKey)).length;
  const totalKasRupiah = totalKasLunasCount * 4000;
  const totalVoucherJasraCount = membersList.filter((m) => isMemberVoucherReceivedCurrentWeek(m, currentWeekKey)).length;

  const filteredMembers = membersList.filter((m) => {
    // 1. Text Search Filter
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase();
      const name = (m.fullName || "").toLowerCase();
      const ic = (m.icNumber || "").toLowerCase();
      const phone = (m.phone || "").toLowerCase();
      const discord = (m.discordTag || "").toLowerCase();
      if (!name.includes(q) && !ic.includes(q) && !phone.includes(q) && !discord.includes(q)) {
        return false;
      }
    }

    // 2. Filter Kas Status (Bulanan - Otomatis Reset Tiap Bulan)
    const isKasPaid = isMemberKasPaidCurrentMonth(m, currentMonthKey);
    if (filterKas === "paid" && !isKasPaid) return false;
    if (filterKas === "unpaid" && isKasPaid) return false;

    // 3. Filter Voucher Jasra Status (Mingguan - Otomatis Reset Tiap Senin)
    const isVoucherReceived = isMemberVoucherReceivedCurrentWeek(m, currentWeekKey);
    if (filterVoucher === "received" && !isVoucherReceived) return false;
    if (filterVoucher === "unreceived" && isVoucherReceived) return false;

    return true;
  });

  const filteredEvents = eventRegistrations.filter((r) => {
    if (selectedEventFilter !== "all") {
      const matchId =
        r.eventId === selectedEventFilter ||
        (!r.eventId && selectedEventFilter === "evt-pizzarena-civilian");
      if (!matchId) return false;
    }
    if (!eventSearchQuery.trim()) return true;
    const q = eventSearchQuery.toLowerCase();
    const name = (r.fullName || "").toLowerCase();
    const phone = (r.phone || "").toLowerCase();
    const discord = (r.discordTag || r.telegram || "").toLowerCase();
    const ticket = (r.ticketCode || "").toLowerCase();
    const cid = (r.citizenId || "").toLowerCase();
    const cat = (r.category || r.eventTitle || "").toLowerCase();
    return (
      name.includes(q) ||
      phone.includes(q) ||
      discord.includes(q) ||
      ticket.includes(q) ||
      cid.includes(q) ||
      cat.includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-[100] w-full h-full bg-[#F3F4F6] dark:bg-[#0D0F17] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 select-text"
    >
      {/* Header Panel Administrator (Full Width Bar) */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1A1D26] shadow-[0_2px_0px_#000]/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#DC2626] border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_#000]">
            <Shield size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 dark:text-slate-100">
                Panel Kontrol Administrator
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-400">
                LSM PPS SANDY SHORES
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud Terhubung
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono hidden md:block">
              Sistem Manajemen Konten & Verifikasi Pengajuan Warga
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {isAuthenticated && (
            <>
              {/* Top Quick Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] rounded border-2 border-black shadow-[2px_2px_0px_#000] disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5"
                title="Simpan semua perubahan ke Cloud Database"
              >
                <Save size={13} className="text-[#DC2626]" />
                <span className="hidden sm:inline">{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari sesi admin"
                className="btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-red-50 hover:bg-red-100 dark:bg-red-950/80 dark:hover:bg-red-900 text-red-600 dark:text-red-300 rounded border-2 border-black dark:border-red-500 shadow-[2px_2px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <LogOut size={13} className="text-red-600 dark:text-red-300" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn py-1.5 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-900 dark:text-red-200 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
            title="Tutup Panel Admin dan kembali ke website utama"
          >
            <span>Tutup Panel</span>
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Full Viewport Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
          {!isAuthenticated ? (
            /* Login Screen Full Center */
            <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
              <div className="card-brutal p-6 sm:p-8 bg-white dark:bg-[#1A1D26] border-3 border-black max-w-sm w-full rounded text-center flex flex-col items-center shadow-[6px_6px_0px_#000]">
                <div className="w-12 h-12 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-[#111827] mb-3 shadow-[3px_3px_0px_#000]">
                  <Lock size={22} className="text-[#DC2626]" />
                </div>
                <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-100 mb-1">
                  Autentikasi Pengelola Portal
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-4">
                  Masukkan password admin untuk mengelola isi website.
                </p>

                {/* Anti Brute-Force Lockout Warning */}
                {lockoutState.isLocked && (
                  <div className="w-full mb-4 p-3 bg-red-100 dark:bg-red-950/70 border-2 border-red-600 rounded text-red-900 dark:text-red-200 text-xs flex items-center gap-2.5 text-left shadow-[2px_2px_0px_#DC2626] animate-pulse">
                    <ShieldAlert size={22} className="text-red-600 shrink-0" />
                    <div>
                      <div className="font-heading font-black">AKSES TERKUNCI SEMENTARA!</div>
                      <div className="text-[11px] mt-0.5">
                        Terlalu banyak percobaan gagal. Tunggu <span className="font-mono font-bold underline">{lockoutState.remainingSeconds} detik</span> lagi.
                      </div>
                    </div>
                  </div>
                )}

                {!lockoutState.isLocked && lockoutState.attempts > 0 && (
                  <div className="w-full mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-500 rounded text-amber-900 dark:text-amber-200 text-[11px] flex items-center justify-center gap-1.5 font-bold">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                    <span>Percobaan gagal: {lockoutState.attempts}/{MAX_ATTEMPTS} (Tersisa {MAX_ATTEMPTS - lockoutState.attempts}x)</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-3.5">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan kode akses admin..."
                    disabled={lockoutState.isLocked}
                    autoFocus
                    className="input-field text-center font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-slate-800"
                  />

                  <label className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none py-0.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={lockoutState.isLocked}
                      className="w-4 h-4 rounded border-2 border-black accent-[#DC2626] cursor-pointer"
                    />
                    <span>Ingat saya di browser ini</span>
                  </label>

                  <button
                    type="submit"
                    disabled={lockoutState.isLocked}
                    className="btn w-full py-2.5 bg-[#FACC15] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-[#111827] border-2 border-black font-black shadow-[3px_3px_0px_#000]"
                  >
                    {lockoutState.isLocked ? `Terkunci (${lockoutState.remainingSeconds}s)` : "Masuk ke Panel"}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Authenticated Dashboard */
            <>
              {/* SPLIT WORKSPACE: Left Sidebar (Desktop) + Right Content Area (Mobile/Desktop) */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                {/* DESKTOP SIDEBAR KIRI (md:flex) */}
                <aside className="hidden md:flex w-64 lg:w-72 shrink-0 bg-[#FFFDF9] dark:bg-[#161822] border-r-3 border-black dark:border-[#475569] flex-col justify-between overflow-y-auto z-10 shadow-[3px_0px_0px_rgba(0,0,0,0.08)]">
                  <div className="p-3.5 space-y-1.5">
                    {/* Sidebar Header Title */}
                    <div className="px-2.5 py-1.5 mb-1.5 bg-black/5 dark:bg-white/5 rounded border border-black/10 dark:border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-heading font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                        Menu Navigasi
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-black px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">
                        {tabs.length} Tab
                      </span>
                    </div>

                    {/* Vertical Tab Buttons */}
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const hasCount = tab.label.includes("(");
                      const countText = hasCount ? tab.label.match(/\((\d+)\)/)?.[1] : null;
                      const cleanTitle = tab.label.split(" (")[0];

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded border-2 border-black dark:border-[#475569] font-heading font-black text-xs transition-all text-left cursor-pointer ${
                            isActive
                              ? "bg-[#FACC15] text-[#111827] shadow-[3px_3px_0px_#000] -translate-y-0.5 border-black ring-1 ring-black/20"
                              : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 shadow-[1.5px_1.5px_0px_#000]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon size={16} className={isActive ? "text-[#DC2626]" : "text-slate-600 dark:text-slate-400"} />
                            <span className="truncate">{cleanTitle}</span>
                          </div>
                          {countText !== null && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] ${
                                isActive
                                  ? "bg-black text-[#FACC15]"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {countText}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sidebar Footer Status */}
                  <div className="p-3 border-t-2 border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-500 flex items-center justify-between bg-black/5 dark:bg-white/5">
                    <span>LSM Sandy Shores</span>
                    <span className="font-bold text-[#DC2626] dark:text-[#FACC15]">Admin CMS</span>
                  </div>
                </aside>

                {/* RIGHT WORKSPACE AREA (Mobile Full-Width, Desktop Flex-1) */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  {/* MOBILE ONLY TOP BAR (< md): Quick Tab Selector Dropdown */}
                  <div className="md:hidden shrink-0 bg-[#FFFDF9] dark:bg-[#161822] border-b-2 border-black/15 dark:border-white/10 px-3 py-2 flex items-center gap-2">
                    <span className="text-[11px] font-heading font-black text-slate-600 dark:text-slate-300 uppercase shrink-0">
                      Menu:
                    </span>
                    <div className="relative flex-1">
                      <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 font-heading font-black text-xs py-2 px-3 pr-8 rounded border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                      >
                        {tabs.map((tab) => (
                          <option key={tab.id} value={tab.id}>
                            {tab.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-700 dark:text-slate-300">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* MOBILE ONLY HORIZONTAL PILLS (< md) with Left/Right Scroll Nudge */}
                  <div className="md:hidden shrink-0 bg-[#FFFDF9] dark:bg-[#161822] border-b-2 border-black/15 dark:border-white/10 px-2 py-1.5 relative flex items-center">
                    <button
                      type="button"
                      onClick={() => scrollTabs("left")}
                      className="shrink-0 p-1.5 mr-1 bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-2 border-black dark:border-[#475569] rounded shadow-[1px_1px_0px_#000] active:translate-x-0.5"
                      title="Geser tab ke kiri"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <div
                      ref={tabsNavRef}
                      className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-1"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            id={`tab-nav-btn-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab-btn flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded shrink-0 border-2 border-black dark:border-[#475569] font-heading font-black transition-all ${
                              isActive
                                ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000] -translate-y-0.5"
                                : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Icon size={13} className={isActive ? "text-[#DC2626]" : ""} />
                            <span className="whitespace-nowrap">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollTabs("right")}
                      className="shrink-0 p-1.5 ml-1 bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-2 border-black dark:border-[#475569] rounded shadow-[1px_1px_0px_#000] active:translate-x-0.5"
                      title="Geser tab ke kanan"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Main Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">

                  {/* Tab 1: Identity */}
                  {activeTab === "identity" && (
                    <div className="flex flex-col gap-4">
                      {/* Brand Name */}
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                        <label className="card-label text-slate-700 dark:text-slate-300">Nama Brand / Judul Navbar</label>
                        <input
                          type="text"
                          value={formData.brand || ""}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>

                      {/* Discord Links Settings Card */}
                      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b-2 border-black/10 dark:border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#5865F2] text-white flex items-center justify-center border border-black shadow-[1px_1px_0px_#000]">
                              <MessageSquare size={16} />
                            </div>
                            <div>
                              <h4 className="font-heading font-black text-xs sm:text-sm uppercase tracking-tight text-slate-950 dark:text-slate-100">
                                Pengaturan Tautan Discord Komunitas & Layanan (OOC)
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Tautan invite Discord resmi yang digunakan di seluruh tombol, pop-up, formulir pendaftaran, dan redirect website.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Input 1: Discord Utama / Resmi */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="card-label text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span>1. Link Discord Resmi / Utama PPS</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#5865F2]/15 text-[#5865F2] dark:text-[#8ea1ff] font-bold border border-[#5865F2]/30">
                                Redirect /discord • Anggota • Footer
                              </span>
                            </label>
                            {formData.discordUrl && (
                              <a
                                href={formData.discordUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5865F2] dark:text-[#8ea1ff] hover:underline"
                              >
                                <span>Buka Link</span>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <input
                            type="url"
                            value={formData.discordUrl || ""}
                            onChange={(e) => handleDiscordUrlChange(e.target.value)}
                            placeholder="https://discord.gg/gb7ajBMduF"
                            className="input-field text-xs sm:text-sm font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Mengatur tautan invite server Discord resmi. Otomatis mengubah pintasan <code>/discord</code> & <code>#discord</code>, tombol Discord di Footer, dan tombol ajakan di akhir pendaftaran anggota.
                          </span>
                        </div>

                        {/* Input 2: Discord Visitor / Layanan Lapak & Audiensi */}
                        <div className="flex flex-col gap-1.5 pt-3 border-t border-black/10 dark:border-white/10">
                          <div className="flex items-center justify-between">
                            <label className="card-label text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span>2. Link Discord Visitor (Layanan Stan Lapak & Audiensi)</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
                                Portal Layanan • Tracking Tiket • Visitor
                              </span>
                            </label>
                            {formData.discordVisitorUrl && (
                              <a
                                href={formData.discordVisitorUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5865F2] dark:text-[#8ea1ff] hover:underline"
                              >
                                <span>Buka Link</span>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <input
                            type="url"
                            value={formData.discordVisitorUrl || ""}
                            onChange={(e) => handleDiscordVisitorUrlChange(e.target.value)}
                            placeholder="https://discord.gg/gb7ajBMduF"
                            className="input-field text-xs sm:text-sm font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Mengatur channel visitor untuk pemohon stan lapak UMKM dan permohonan audiensi meeting. Tampil pada tiket bukti pendaftaran dan tombol pelacakan status tiket.
                          </span>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                        <label className="card-label text-slate-700 dark:text-slate-300">Link Navigasi Navbar (Format: Nama | URL, pisahkan koma)</label>
                        <input
                          type="text"
                          value={formData.navLinks || ""}
                          onChange={(e) => handleNavLinksChange(e.target.value)}
                          className="input-field text-xs font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tautan menu navigasi atas. Jika kolom link Discord di atas diubah, tautan Discord di menu navigasi ini akan otomatis ikut tersinkronisasi.
                        </span>
                      </div>
                    </div>
                  )}

              {/* Tab 2: Hero & 4 Pilar */}
              {activeTab === "hero" && (
                <div className="flex flex-col gap-4">
                  {/* Slogan */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">
                      Slogan / Kalimat Penggerak (Bawah Banner)
                    </label>
                    <input
                      type="text"
                      value={formData.subtext || ""}
                      onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                      placeholder="Bersatu • Berkarya • Untuk Masyarakat Sandy Shores"
                      className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Tampil tebal di bawah banner foto pps.jpg di beranda.
                    </span>
                  </div>

                  {/* 4 Pilar Fokus Lapangan */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading font-black text-xs uppercase tracking-tight text-slate-950 dark:text-slate-100 flex items-center gap-1.5">
                        <Compass size={15} className="text-[#DC2626]" />
                        <span>4 Pilar Fokus Lapangan</span>
                      </h4>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        4 Kotak Utama Beranda
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(formData.heroPillars || []).map((pilar, idx) => (
                        <div
                          key={idx}
                          className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="card-label text-[10px] text-slate-700 dark:text-slate-300">
                              Pilar #{idx + 1}
                            </span>
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Kategori / Label Atas
                            </label>
                            <input
                              type="text"
                              value={pilar.label || ""}
                              onChange={(e) => handleHeroPillarChange(idx, "label", e.target.value)}
                              placeholder="Contoh: Wilayah Kerja"
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Judul / Arah Gerakan
                            </label>
                            <input
                              type="text"
                              value={pilar.title || ""}
                              onChange={(e) => handleHeroPillarChange(idx, "title", e.target.value)}
                              placeholder="Contoh: Sandy Shores & Sekitarnya"
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Tentang & Visi */}
              {activeTab === "about" && (
                <div className="flex flex-col gap-5">
                  {/* 1. Header Bagian Tentang */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-slate-950 dark:text-slate-100">
                      <FileText size={15} className="text-[#DC2626]" />
                      <span>Header Bagian Tentang Kami</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Label Atas (Kecil)
                        </label>
                        <input
                          type="text"
                          value={formData.aboutHeader?.label || ""}
                          onChange={(e) => handleAboutHeaderChange("label", e.target.value)}
                          placeholder="TENTANG KAMI"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Judul Utama
                        </label>
                        <input
                          type="text"
                          value={formData.aboutHeader?.title || ""}
                          onChange={(e) => handleAboutHeaderChange("title", e.target.value)}
                          placeholder="Profil & Arah Gerakan PPS"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Badge Kanan (Kuning)
                        </label>
                        <input
                          type="text"
                          value={formData.aboutHeader?.badge || ""}
                          onChange={(e) => handleAboutHeaderChange("badge", e.target.value)}
                          placeholder="MANIFESTO RESMI"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Tiga Program Unggulan (About Pillars) */}
                  <div className="flex flex-col gap-2.5">
                    <h4 className="font-heading font-black text-xs uppercase tracking-tight text-slate-950 dark:text-slate-100">
                      3 Program Unggulan Lapangan
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(formData.aboutPillars || []).map((pillar, idx) => (
                        <div
                          key={idx}
                          className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="card-label text-[10px] text-slate-700 dark:text-slate-300">
                              Program #{idx + 1}
                            </span>
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Badge / Kategori
                            </label>
                            <input
                              type="text"
                              value={pillar.badge || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "badge", e.target.value)}
                              placeholder="Kepedulian Warga"
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Judul Program
                            </label>
                            <input
                              type="text"
                              value={pillar.title || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "title", e.target.value)}
                              placeholder="Solidaritas & Aksi Sosial"
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Deskripsi
                            </label>
                            <textarea
                              rows={3}
                              value={pillar.desc || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "desc", e.target.value)}
                              placeholder="Deskripsi kegiatan..."
                              className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Status Tag
                            </label>
                            <input
                              type="text"
                              value={pillar.status || ""}
                              onChange={(e) => handleAboutPillarChange(idx, "status", e.target.value)}
                              placeholder="Program Aktif Berkelanjutan"
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Visi & Misi Komunitas */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-slate-950 dark:text-slate-100">
                      <Target size={15} className="text-[#DC2626]" />
                      <span>Visi & Misi Komunitas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Label Visi
                        </label>
                        <input
                          type="text"
                          value={formData.visionMission?.visionLabel || ""}
                          onChange={(e) => handleVisionMissionChange("visionLabel", e.target.value)}
                          placeholder="Visi Komunitas"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Judul / Pernyataan Visi (Kutipan Besar)
                        </label>
                        <input
                          type="text"
                          value={formData.visionMission?.visionTitle || ""}
                          onChange={(e) => handleVisionMissionChange("visionTitle", e.target.value)}
                          placeholder="“Terwujudnya Masyarakat Sandy Shores yang Kompak, Mandiri, dan Bermartabat Bersama.”"
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Uraian / Penjelasan Visi
                      </label>
                      <textarea
                        rows={3}
                        value={formData.visionMission?.visionDesc || ""}
                        onChange={(e) => handleVisionMissionChange("visionDesc", e.target.value)}
                        placeholder="Kemajuan suatu kawasan bertumpu pada solidaritas warganya..."
                        className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                      />
                    </div>

                    {/* Misi Pokok */}
                    <div className="pt-2 border-t border-dashed border-[#1A1A1A]/20 dark:border-slate-700/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block">
                          Judul Bagian Misi
                        </label>
                        <button
                          type="button"
                          onClick={handleAddMissionItem}
                          className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                        >
                          <Plus size={12} className="text-[#DC2626]" />
                          <span>Tambah Poin Misi</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.visionMission?.missionTitle || ""}
                        onChange={(e) => handleVisionMissionChange("missionTitle", e.target.value)}
                        placeholder="Misi Pokok Lembaga:"
                        className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                      />

                      <div className="flex flex-col gap-2 mt-1">
                        {(formData.visionMission?.missionItems || []).map((mItem, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#FACC15] text-black border border-black flex items-center justify-center shrink-0 text-xs font-black">
                              {mIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={mItem}
                              onChange={(e) => handleMissionItemChange(mIdx, e.target.value)}
                              placeholder="Isi poin misi..."
                              className="input-field flex-1 text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMissionItem(mIdx)}
                              className="btn btn-secondary text-xs py-1 px-2 border-2 border-black text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626] hover:text-white shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Naskah Pendirian & Dokumen LSM */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5">
                    <label className="card-label text-slate-700 dark:text-slate-300">
                      Judul Akordion / Bar Dokumen
                    </label>
                    <input
                      type="text"
                      value={formData.charterTitle || ""}
                      onChange={(e) => setFormData({ ...formData, charterTitle: e.target.value })}
                      placeholder="Naskah Pendirian & Penjelasan Lengkap LSM"
                      className="input-field text-xs font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />

                    <label className="card-label text-slate-700 dark:text-slate-300 mt-2">
                      Naskah Pendirian & Penjelasan Lengkap LSM (Pisahkan antar paragraf dengan 2 enter)
                    </label>
                    <textarea
                      rows={8}
                      value={formData.aboutText || ""}
                      onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
                      className="input-field text-xs leading-relaxed bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Organization */}
              {activeTab === "org" && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                      Total: {formData.org?.length || 0} Pengurus
                    </span>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                    >
                      <Plus size={14} className="text-[#DC2626]" />
                      <span>Tambah Anggota</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formData.org?.map((member, idx) => (
                      <div
                        key={idx}
                        className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="card-label text-[11px] text-slate-700 dark:text-slate-300">
                            Anggota #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="btn btn-secondary text-xs py-1 px-2 border-2 border-black text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626] hover:text-white"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Level (1-5)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={member.level || 1}
                              onChange={(e) => handleMemberChange(idx, "level", e.target.value)}
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Jabatan / Peran
                            </label>
                            <input
                              type="text"
                              value={member.role || ""}
                              onChange={(e) => handleMemberChange(idx, "role", e.target.value)}
                              className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Nama Lengkap
                            </label>
                            <input
                              type="text"
                              value={member.name || ""}
                              onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Foto Profil
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleMemberPhoto(idx, e.target.files[0])}
                              className="text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-2 file:border-black file:bg-[#FACC15] file:text-[#111827] file:font-heading file:font-black"
                            />
                            {member.photo && (
                              <img
                                src={member.photo}
                                alt="Pratinjau"
                                className="w-8 h-8 rounded object-cover border-2 border-black"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Gallery */}
              {activeTab === "gallery" && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                      Total: {formData.gallery?.length || 0} Dokumentasi
                    </span>
                    <button
                      type="button"
                      onClick={handleAddGallery}
                      className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                    >
                      <Plus size={14} className="text-[#DC2626]" />
                      <span>Tambah Foto</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formData.gallery?.map((item, idx) => (
                      <div
                        key={idx}
                        className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="card-label text-[11px] text-slate-700 dark:text-slate-300">
                            Dokumentasi #{formData.gallery.length - idx}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGallery(idx)}
                            className="btn btn-secondary text-xs py-1 px-2 border-2 border-black text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626] hover:text-white"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Judul Kegiatan
                          </label>
                          <input
                            type="text"
                            value={item.title || ""}
                            onChange={(e) => handleGalleryChange(idx, "title", e.target.value)}
                            className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Keterangan Kegiatan
                          </label>
                          <textarea
                            rows={5}
                            placeholder="Tulis keterangan kegiatan di sini (tekan Enter untuk baris baru)..."
                            value={item.desc || ""}
                            onChange={(e) => handleGalleryChange(idx, "desc", e.target.value)}
                            className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Waktu Kegiatan (Pilih / Format Tanggal)
                          </label>
                          <BrutalistDatePicker
                            value={item.date || ""}
                            onChange={(val) => handleGalleryChange(idx, "date", val)}
                            placeholder="Contoh: Kamis, 15 Oktober 2026"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Tempat Kegiatan
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: SS Area / Sandy Shores Park"
                            value={item.location || ""}
                            onChange={(e) => handleGalleryChange(idx, "location", e.target.value)}
                            className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300">
                              Foto Dokumentasi ({getGalleryItemPhotos(item).length} Foto)
                            </label>
                            <label className="cursor-pointer text-[10px] font-heading font-black py-1 px-2.5 rounded bg-[#FACC15] text-[#111827] border-2 border-black shadow-[1px_1px_0px_#000] hover:bg-[#EAB308] flex items-center gap-1 active:translate-x-0.5">
                              <Plus size={12} className="text-[#DC2626]" />
                              <span>+ Tambah Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files) {
                                    Array.from(e.target.files).forEach((f) => handleAddGalleryPhoto(idx, f));
                                  }
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Thumbnails of All Photos in this event */}
                          {getGalleryItemPhotos(item).length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-[#1C1F2A] rounded border border-black/15 dark:border-white/10">
                              {getGalleryItemPhotos(item).map((p, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="relative group w-16 h-14 rounded overflow-hidden border-2 border-black dark:border-slate-600 shrink-0 bg-black"
                                >
                                  <img src={p} alt="" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGalleryPhoto(idx, pIdx)}
                                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Hapus foto ini"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  {pIdx === 0 && (
                                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-[#FACC15] text-center font-bold">
                                      Sampul
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 dark:bg-[#1A1D26] border border-dashed border-black/30 dark:border-white/20 rounded text-center text-xs text-slate-500">
                              Belum ada foto kegiatan. Klik tombol <strong>"+ Tambah Foto"</strong> di atas untuk mengunggah.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Kotak Masuk Pengajuan (Lapak UMKM & Request Meeting) */}
              {activeTab === "submissions" && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="font-heading font-black text-xs sm:text-sm uppercase text-slate-800 dark:text-slate-200">
                        Total: {submissions.length} Pengajuan Warga
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block sm:inline sm:ml-2">
                        (🏪 {submissions.filter((s) => s.type === "lapak").length} Stan Lapak UMKM • 🤝 {submissions.filter((s) => s.type === "meeting").length} Permohonan Pertemuan)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 dark:bg-[#1A1D26] p-1 rounded border border-black/10 dark:border-white/10 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setSubmissionFilter("all")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          submissionFilter === "all" ? "bg-[#FACC15] text-[#111827] shadow-sm font-black border border-black" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Semua ({submissions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionFilter("lapak")}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                          submissionFilter === "lapak" ? "bg-[#FACC15] text-[#111827] shadow-sm font-black border border-black" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>🏪 Stan Lapak UMKM</span>
                        <span>({submissions.filter((s) => s.type === "lapak").length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionFilter("meeting")}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                          submissionFilter === "meeting" ? "bg-[#DC2626] text-white shadow-sm font-black border border-black" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>🤝 Permohonan Pertemuan</span>
                        <span>({submissions.filter((s) => s.type === "meeting").length})</span>
                      </button>
                    </div>
                  </div>

                  {submissions.filter((s) => submissionFilter === "all" || s.type === submissionFilter).length === 0 ? (
                    <div className="card-brutal p-8 text-center bg-[var(--card-bg)] border-2 border-dashed border-black/30 dark:border-slate-600 text-slate-500 text-xs">
                      Belum ada data pengajuan warga yang tercatat.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {submissions
                        .filter((s) => submissionFilter === "all" || s.type === submissionFilter)
                        .map((sub) => {
                          const isLapak = sub.type === "lapak";
                          return (
                            <div
                              key={sub.id}
                              className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-heading font-black border border-black uppercase ${
                                      isLapak ? "bg-[#FACC15] text-[#111827]" : "bg-[#DC2626] text-white"
                                    }`}
                                  >
                                    {isLapak ? "🏪 Stan Lapak UMKM" : "🤝 Permohonan Pertemuan"}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                    #{sub.id}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <select
                                    value={sub.status || "pending"}
                                    onChange={(e) => handleUpdateSubmissionStatus(sub.id, e.target.value)}
                                    className={`text-[11px] font-heading font-bold py-1 px-2 rounded border border-black cursor-pointer ${
                                      sub.status === "approved"
                                        ? "bg-emerald-100 text-emerald-900 border-emerald-500"
                                        : sub.status === "completed"
                                        ? "bg-blue-100 text-blue-900 border-blue-500"
                                        : sub.status === "rejected"
                                        ? "bg-red-100 text-red-900 border-red-500"
                                        : "bg-amber-100 text-amber-900 border-amber-500"
                                    }`}
                                  >
                                    <option value="pending">⏳ Menunggu</option>
                                    <option value="approved">✅ Disetujui</option>
                                    <option value="completed">🎉 Selesai</option>
                                    <option value="rejected">❌ Ditolak</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubmission(sub.id)}
                                    className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 border border-transparent hover:border-red-400"
                                    title="Hapus Tiket"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-center">
                                <div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">
                                    NAMA KTP / PEMOHON
                                  </span>
                                  <span className="font-heading font-black text-slate-900 dark:text-slate-100 text-sm block">
                                    {sub.firstName ? `${sub.firstName} ${sub.lastName}` : (sub.namaKtp || sub.characterName)}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px] font-mono">
                                    {sub.citizenId && (
                                      <span className="font-bold text-[#DC2626] dark:text-[#FACC15]">
                                        ID: {sub.citizenId}
                                      </span>
                                    )}
                                    {sub.dob && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        • {sub.dob}
                                      </span>
                                    )}
                                    {sub.sex && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        • {sub.sex}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">
                                    KONTAK PENGAJU
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-black text-[10px] border border-amber-400/70 shrink-0">
                                      📞 No. IC:
                                    </span>
                                    <strong className="text-slate-900 dark:text-slate-100 font-black tracking-wide truncate">
                                      {sub.phoneNumber || "-"}
                                    </strong>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-black text-[10px] border border-indigo-400/70 shrink-0">
                                      💬 Discord:
                                    </span>
                                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate">
                                      {sub.discordTag ? sub.discordTag : <span className="text-slate-400 font-normal italic">Tidak diisi</span>}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wider">
                                    WAKTU & MOU
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-300 text-[11px] block font-mono">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("id-ID") : "-"}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {sub.agreedMOU ? "✓ MOU Disetujui" : "Persetujuan Tertib"}
                                  </span>
                                </div>
                              </div>

                              {isLapak ? (
                                <div className="p-3.5 rounded bg-amber-50/70 dark:bg-[#1E212B] border-2 border-black/15 dark:border-white/10 text-xs font-sans">
                                  <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-black/10 dark:border-white/10 text-[11px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider">
                                    <span>🏪 Rincian Usaha & Lokasi Lapak</span>
                                    {(sub.fotoWajahIc || sub.ktpImage) && (
                                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                        ✓ Scan KTP Terlampir
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                                    {/* Kolom Kiri: 6 Field KTP IC + Rincian Lapak Usaha */}
                                    <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
                                      {/* 6 Data Terpisah KTP IC */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-white dark:bg-[#161820] border-2 border-black/15 dark:border-white/10 text-[11px] font-mono shadow-[2px_2px_0px_#000]/10">
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">FIRST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.firstName || (sub.namaKtp ? sub.namaKtp.split(" ")[0] : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">LAST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.lastName || (sub.namaKtp ? sub.namaKtp.split(" ").slice(1).join(" ") : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">DOB:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.dob || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">SEX:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.sex || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">NATIONALITY:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.nationality || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">CITIZEN ID:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.citizenId || "-"}</strong>
                                        </div>
                                      </div>

                                      {/* Rincian Usaha */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2.5 rounded bg-white/70 dark:bg-[#161820]/70 border border-black/10 dark:border-white/10">
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">NAMA USAHA / STAN:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.businessName}</strong>
                                        </div>
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">JENIS USAHA / PRODUK:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.businessType}</strong>
                                        </div>
                                        <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5">
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">PILIHAN LOKASI LAPAK SANDY SHORES:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.preferredLocation}</strong>
                                        </div>
                                        {sub.facilityNeeds && (
                                          <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5">
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">KEBUTUHAN STAND & FASILITAS:</span>
                                            <span className="text-slate-800 dark:text-slate-200">{sub.facilityNeeds}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Kolom Kanan Bawah: Gambar KTP IC */}
                                    <div className="lg:col-span-4 flex flex-col justify-between rounded border-2 border-black dark:border-slate-700 bg-white dark:bg-[#161820] p-2.5 shadow-[2px_2px_0px_#000]">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 dark:border-white/10">
                                        <span className="text-[10px] font-heading font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                                          <FileText size={12} className="text-[#DC2626] dark:text-[#FACC15]" />
                                          DOKUMEN KTP IC
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          {sub.citizenId ? `#${sub.citizenId}` : ""}
                                        </span>
                                      </div>

                                      {(sub.fotoWajahIc || sub.ktpImage) ? (
                                        <div
                                          className="relative group/ktp flex-1 min-h-[140px] rounded overflow-hidden border border-black/20 dark:border-white/10 bg-slate-950 flex items-center justify-center cursor-pointer"
                                          onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                          title="Klik untuk membuka dokumen KTP resolusi penuh"
                                        >
                                          <img
                                            src={sub.fotoWajahIc || sub.ktpImage}
                                            alt="Dokumen KTP IC"
                                            className="w-full h-full max-h-[175px] object-contain group-hover/ktp:scale-105 transition-transform"
                                          />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/ktp:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold font-mono">
                                            <Maximize2 size={16} className="text-[#FACC15]" />
                                            <span>Lihat Ukuran Penuh</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 min-h-[130px] rounded border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center bg-slate-50/50 dark:bg-slate-900/30">
                                          <FileText size={22} className="mb-1 text-slate-300 dark:text-slate-600" />
                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Tidak Ada Lampiran KTP</span>
                                          <span className="text-[9px] text-slate-400">Diinput manual tanpa upload foto</span>
                                        </div>
                                      )}

                                      <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                                        <span>FOTO IDENTITAS</span>
                                        {(sub.fotoWajahIc || sub.ktpImage) && (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                            className="text-[#DC2626] dark:text-[#FACC15] hover:underline font-bold font-sans flex items-center gap-0.5"
                                          >
                                            Buka Dokumen ↗
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3.5 rounded bg-red-50/70 dark:bg-[#1E212B] border-2 border-black/15 dark:border-white/10 text-xs font-sans">
                                  <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-black/10 dark:border-white/10 text-[11px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider">
                                    <span>🤝 Rincian Audiensi & Usulan Pertemuan</span>
                                    {(sub.fotoWajahIc || sub.ktpImage) && (
                                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                        ✓ Scan KTP Terlampir
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                                    {/* Kolom Kiri: 6 Field KTP IC + Rincian Audiensi / Pertemuan */}
                                    <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
                                      {/* 6 Data Terpisah KTP IC */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-white dark:bg-[#161820] border-2 border-black/15 dark:border-white/10 text-[11px] font-mono shadow-[2px_2px_0px_#000]/10">
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">FIRST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.firstName || (sub.characterName ? sub.characterName.split(" ")[0] : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">LAST NAME:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.lastName || (sub.characterName ? sub.characterName.split(" ").slice(1).join(" ") : "-")}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">DOB:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.dob || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">SEX:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.sex || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">NATIONALITY:</span>
                                          <strong className="text-slate-900 dark:text-slate-100">{sub.nationality || "-"}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans font-black">CITIZEN ID:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.citizenId || "-"}</strong>
                                        </div>
                                      </div>

                                      {/* Rincian Pertemuan */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-2.5 rounded bg-white/70 dark:bg-[#161820]/70 border border-black/10 dark:border-white/10">
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">ASAL INSTANSI / FRAKSI / KOMUNITAS:</span>
                                          <strong className="text-[#DC2626] dark:text-[#FACC15] text-xs">{sub.agencyName}</strong>
                                        </div>
                                        <div>
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">TOPIK POKOK PERTEMUAN:</span>
                                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{sub.meetingTopic}</strong>
                                        </div>
                                        <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5">
                                          <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">RINCIAN AGENDA & PEMBAHASAN:</span>
                                          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">{sub.agendaDetail}</p>
                                        </div>
                                        <div className="sm:col-span-2 pt-2 border-t border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                          <div>
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">USULAN TANGGAL:</span>
                                            <strong className="text-slate-900 dark:text-slate-100">📅 {sub.preferredDate}</strong>
                                          </div>
                                          <div>
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">USULAN WAKTU:</span>
                                            <strong className="text-slate-900 dark:text-slate-100">⏰ {sub.preferredTime}</strong>
                                          </div>
                                          <div>
                                            <span className="font-black text-slate-600 dark:text-slate-400 block text-[10px]">TEMPAT PERTEMUAN:</span>
                                            <strong className="text-slate-900 dark:text-slate-100">📍 {sub.meetingLocation}</strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Kolom Kanan Bawah: Gambar KTP IC */}
                                    <div className="lg:col-span-4 flex flex-col justify-between rounded border-2 border-black dark:border-slate-700 bg-white dark:bg-[#161820] p-2.5 shadow-[2px_2px_0px_#000]">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 dark:border-white/10">
                                        <span className="text-[10px] font-heading font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                                          <FileText size={12} className="text-[#DC2626] dark:text-[#FACC15]" />
                                          DOKUMEN KTP IC
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          {sub.citizenId ? `#${sub.citizenId}` : ""}
                                        </span>
                                      </div>

                                      {(sub.fotoWajahIc || sub.ktpImage) ? (
                                        <div
                                          className="relative group/ktp flex-1 min-h-[140px] rounded overflow-hidden border border-black/20 dark:border-white/10 bg-slate-950 flex items-center justify-center cursor-pointer"
                                          onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                          title="Klik untuk membuka dokumen KTP resolusi penuh"
                                        >
                                          <img
                                            src={sub.fotoWajahIc || sub.ktpImage}
                                            alt="Dokumen KTP IC"
                                            className="w-full h-full max-h-[175px] object-contain group-hover/ktp:scale-105 transition-transform"
                                          />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/ktp:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold font-mono">
                                            <Maximize2 size={16} className="text-[#FACC15]" />
                                            <span>Lihat Ukuran Penuh</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 min-h-[130px] rounded border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center bg-slate-50/50 dark:bg-slate-900/30">
                                          <FileText size={22} className="mb-1 text-slate-300 dark:text-slate-600" />
                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Tidak Ada Lampiran KTP</span>
                                          <span className="text-[9px] text-slate-400">Diinput manual tanpa upload foto</span>
                                        </div>
                                      )}

                                      <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                                        <span>FOTO IDENTITAS</span>
                                        {(sub.fotoWajahIc || sub.ktpImage) && (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewKtp({ image: sub.fotoWajahIc || sub.ktpImage, name: sub.firstName ? (sub.firstName + " " + sub.lastName) : (sub.namaKtp || sub.characterName || "Warga"), citizenId: sub.citizenId || "" })}
                                            className="text-[#DC2626] dark:text-[#FACC15] hover:underline font-bold font-sans flex items-center gap-0.5"
                                          >
                                            Buka Dokumen ↗
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Catatan / Balasan Pengurus untuk Pengaju */}
                              <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-1.5">
                                <label className="text-[10px] font-heading font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                  <span>💬 Catatan / Balasan Pengurus (Terlihat oleh Warga saat Lacak Tiket):</span>
                                  <span className="text-[9px] font-normal text-slate-500">Ketik lalu klik Simpan</span>
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Contoh: Disetujui! Datang jam 20.00 IC ke Markas PPS Sandy Shores, temui Jack Sullivan."
                                    defaultValue={sub.adminNotes || ""}
                                    id={`note-input-${sub.id}`}
                                    className="input-field text-xs py-1 px-2.5 flex-1 bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 border border-black dark:border-slate-600 rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputElem = document.getElementById(`note-input-${sub.id}`);
                                      if (inputElem) {
                                        handleUpdateSubmissionNote(sub.id, inputElem.value);
                                      }
                                    }}
                                    className="px-3 py-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] text-xs font-heading font-black border border-black shadow-[1px_1px_0px_#000] rounded"
                                  >
                                    Simpan Catatan
                                  </button>
                                </div>

                                {/* Template Cepat untuk Pengurus */}
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputElem = document.getElementById(`note-input-${sub.id}`);
                                      if (inputElem) {
                                        inputElem.value = "MOU & Berkas disetujui! Silakan masuk ke channel Discord visitor untuk koordinasi jadwal meeting IC di Markas Sandy Shores.";
                                        handleUpdateSubmissionNote(sub.id, inputElem.value);
                                        handleUpdateSubmissionStatus(sub.id, "approved");
                                      }
                                    }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-500 hover:bg-emerald-200"
                                  >
                                    + Preset: Setujui & Arahkan Discord Visitor
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputElem = document.getElementById(`note-input-${sub.id}`);
                                      if (inputElem) {
                                        inputElem.value = "Jadwal meeting IC disetujui. Silakan hadir di Markas LSM PPS Sandy Shores jam 20.30 IC.";
                                        handleUpdateSubmissionNote(sub.id, inputElem.value);
                                      }
                                    }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-500 hover:bg-blue-200"
                                  >
                                    + Preset: Jadwal Meeting IC Siap
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Database Anggota (Integrated from pendaftaran-paps) */}
              {activeTab === "members_db" && (
                <div className="flex flex-col gap-4">
                  {/* Top Header Card with Actions */}
                  <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-900 shadow-[2px_2px_0px_#000] shrink-0">
                        <Users2 size={20} className="text-[#DC2626]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                            Database Anggota Terdaftar ({membersList.length})
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-400">
                            TERVERIFIKASI
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Data pendaftaran anggota terintegrasi resmi LSM PPS Sandy Shores (GTA V IME Roleplay)
                        </p>
                      </div>
                    </div>

                    {/* Export Actions: Excel & ZIP */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={membersList.length === 0}
                        className="btn py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                        title="Download seluruh data anggota dalam format Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={15} />
                        <span>Unduh Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportZip}
                        disabled={isExportingZip || membersList.length === 0}
                        className="btn py-2 px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                        title="Download arsip ZIP lengkap (Excel + seluruh folder Foto Profil & Foto KTP)"
                      >
                        <Archive size={15} />
                        <span>{isExportingZip ? "Membuat ZIP..." : "Backup ZIP (+ Foto)"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Stats Ringkasan Kas (4k) & Voucher Jasra */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center shrink-0">
                        <Users size={18} className="text-slate-900" />
                      </div>
                      <div>
                        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Total Anggota</span>
                        <strong className="text-base font-mono font-black text-slate-900 dark:text-slate-100">
                          {membersList.length} Warga
                        </strong>
                      </div>
                    </div>

                    <div className="card-brutal p-3 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-emerald-500 border-2 border-black flex items-center justify-center shrink-0 text-white shadow-xs">
                            <DollarSign size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-sans font-black text-emerald-800 dark:text-emerald-400 uppercase block">
                              Uang Kas ({currentMonthLabel})
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <strong className="text-base font-mono font-black text-emerald-800 dark:text-emerald-300">
                                Rp {totalKasRupiah.toLocaleString("id-ID")}
                              </strong>
                              <span className="text-[10px] font-mono text-emerald-700">
                                ({totalKasLunasCount} Lunas)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200 dark:border-emerald-800/40 text-[10px] font-mono">
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Clock size={11} /> Reset Otomatis Bulanan
                        </span>
                        <button
                          type="button"
                          onClick={handleConfirmResetAllKas}
                          disabled={totalKasLunasCount === 0}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-black shadow-[1px_1px_0px_#000] disabled:opacity-40 cursor-pointer text-[10px]"
                          title="Reset manual status kas seluruh anggota ke Belum Bayar"
                        >
                          Reset Kas
                        </button>
                      </div>
                    </div>

                    <div className="card-brutal p-3 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500 dark:border-amber-400 shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center shrink-0 text-[#DC2626] shadow-xs">
                            <Gift size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-sans font-black text-amber-800 dark:text-amber-300 uppercase block">
                              Voucher Tritmen & Pingsan
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <strong className="text-base font-mono font-black text-amber-900 dark:text-[#FACC15]">
                                {totalVoucherJasraCount} Aktif
                              </strong>
                              <span className="text-[10px] font-mono text-amber-700">
                                ({membersList.length - totalVoucherJasraCount} Belum)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-amber-200 dark:border-amber-800/40 text-[10px] font-mono">
                        <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1 font-bold" title={currentWeekLabel}>
                          <Clock size={11} /> Reset Tiap Senin
                        </span>
                        <button
                          type="button"
                          onClick={handleConfirmResetAllVouchers}
                          disabled={totalVoucherJasraCount === 0}
                          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-black shadow-[1px_1px_0px_#000] disabled:opacity-40 cursor-pointer text-[10px]"
                          title="Reset manual status voucher seluruh anggota untuk minggu baru"
                        >
                          Reset Voucher
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filter Pills Bar */}
                  <div className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:max-w-md">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Cari nama IC, No KTP, atau No HP..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                        {memberSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMemberSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 shrink-0 self-start sm:self-center">
                        Menampilkan <span className="text-[#DC2626] dark:text-[#FACC15]">{filteredMembers.length}</span> dari {membersList.length} anggota
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs">
                      {/* Filter Kas */}
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Kas:</span>
                      <button
                        type="button"
                        onClick={() => setFilterKas("all")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterKas === "all"
                            ? "bg-[#1A1A1A] text-white border-black dark:bg-white dark:text-black"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 border-black/20 hover:border-black"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterKas("paid")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterKas === "paid"
                            ? "bg-emerald-600 text-white border-black"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                        }`}
                      >
                        ✓ Lunas (Rp 4k)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterKas("unpaid")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterKas === "unpaid"
                            ? "bg-rose-600 text-white border-black"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-400"
                        }`}
                      >
                        Belum Bayar
                      </button>

                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

                      {/* Filter Voucher Jasra */}
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Voucher:</span>
                      <button
                        type="button"
                        onClick={() => setFilterVoucher("all")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterVoucher === "all"
                            ? "bg-[#1A1A1A] text-white border-black dark:bg-white dark:text-black"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 border-black/20 hover:border-black"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterVoucher("received")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterVoucher === "received"
                            ? "bg-amber-500 text-slate-950 border-black font-black"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-400"
                        }`}
                      >
                        ✓ Diterima
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterVoucher("unreceived")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterVoucher === "unreceived"
                            ? "bg-slate-600 text-white border-black"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        Belum Diterima
                      </button>
                    </div>
                  </div>

                  {/* Members Grid Cards */}
                  {filteredMembers.length === 0 ? (
                    <div className="card-brutal p-12 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] text-center flex flex-col items-center justify-center gap-2">
                      <Users2 size={36} className="text-slate-300 dark:text-slate-600" />
                      <p className="font-heading font-black text-sm text-slate-700 dark:text-slate-300">
                        {memberSearchQuery ? "Tidak ditemukan anggota yang sesuai pencarian" : "Belum ada anggota terdaftar"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {memberSearchQuery ? "Coba kata kunci pencarian yang lain." : "Anggota yang mendaftar via web akan otomatis muncul di sini."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {filteredMembers.map((member, idx) => {
                        return (
                          <div
                            key={member.id || idx}
                            className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
                          >
                            {/* Card Header: Avatar & Nama */}
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div
                                onClick={() => {
                                  if (member.profilePhoto) {
                                    setPreviewKtp({
                                      image: member.profilePhoto,
                                      name: `${member.fullName || "Anggota"} (Foto Profil)`,
                                      citizenId: member.icNumber || "",
                                    });
                                  }
                                }}
                                className={`w-12 h-12 rounded-full border-2 border-black dark:border-[#475569] overflow-hidden shrink-0 flex items-center justify-center shadow-[2px_2px_0px_#000] bg-amber-100 dark:bg-amber-950/50 ${
                                  member.profilePhoto ? "cursor-pointer group relative" : ""
                                }`}
                                title={member.profilePhoto ? "Klik untuk memperbesar foto profil" : "Foto profil belum diunggah"}
                              >
                                {member.profilePhoto ? (
                                  <img
                                    src={member.profilePhoto}
                                    alt={member.fullName}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                ) : (
                                  <span className="font-heading font-black text-sm text-[#DC2626]">
                                    {(member.fullName || "P").charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="font-heading font-black text-sm text-slate-950 dark:text-slate-100 truncate" title={member.fullName}>
                                    {member.fullName || "Nama Tidak Tertera"}
                                  </h5>
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-400 shrink-0">
                                    RESMI
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 block truncate">
                                  Terdaftar: {member.regDate || (member.createdAt ? new Date(member.createdAt).toLocaleDateString("id-ID") : "-")}
                                </span>
                              </div>
                            </div>

                            {/* Details List */}
                            <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded bg-slate-50 dark:bg-[#14161F] border border-black/10 dark:border-white/10 font-mono">
                              <div>
                                <span className="text-[9px] text-slate-400 font-sans font-bold block">NO KTP / IC:</span>
                                <strong className="text-[#DC2626] dark:text-[#FACC15] truncate block text-[11px]" title={member.icNumber}>
                                  {member.icNumber || "-"}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-sans font-bold block">NO TLP / WA:</span>
                                <span className="text-slate-800 dark:text-slate-200 truncate block text-[11px]" title={member.phone}>
                                  {member.phone || "-"}
                                </span>
                              </div>
                            </div>

                            {/* Admin Checklist: Status Kas Bulanan (4k) & Voucher Jasra */}
                            <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-[#14161F] border-2 border-black/15 dark:border-white/10">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300">
                                  KONTROL HAK AKSES ADMIN
                                </span>
                                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                                  VERIFIKASI
                                </span>
                              </div>

                              {/* Checkbox 1: Kas Bulanan (Rp 4.000) */}
                              <button
                                type="button"
                                onClick={() => handleToggleKas(member)}
                                className={`w-full py-1.5 px-2.5 rounded border-2 flex items-center justify-between text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isMemberKasPaidCurrentMonth(member, currentMonthKey)
                                    ? "bg-emerald-600 text-white border-black shadow-[2px_2px_0px_#000]"
                                    : "bg-white dark:bg-[#1F222C] text-slate-800 dark:text-slate-200 border-black/30 dark:border-white/20 hover:border-black shadow-sm"
                                }`}
                                title={
                                  isMemberKasPaidCurrentMonth(member, currentMonthKey)
                                    ? `Kas Lunas (${member.kasPeriodLabel || currentMonthLabel}). Klik untuk batalkan.`
                                    : `Klik untuk menandai kas LUNAS (${currentMonthLabel})`
                                }
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isMemberKasPaidCurrentMonth(member, currentMonthKey) ? (
                                    <CheckSquare size={15} className="shrink-0 text-[#FACC15]" />
                                  ) : (
                                    <Square size={15} className="shrink-0 text-slate-400" />
                                  )}
                                  <span className="truncate">
                                    {isMemberKasPaidCurrentMonth(member, currentMonthKey)
                                      ? `KAS: LUNAS (${member.kasPeriodLabel || currentMonthLabel})`
                                      : "KAS: BELUM BAYAR (4K)"}
                                  </span>
                                </div>
                                {isMemberKasPaidCurrentMonth(member, currentMonthKey) && member.kasPaidDate && (
                                  <span className="text-[9px] opacity-90 shrink-0 font-normal ml-1">
                                    {member.kasPaidDate}
                                  </span>
                                )}
                              </button>

                              {/* Checkbox 2: Voucher Tritmen & Pingsan (Mingguan) */}
                              <button
                                type="button"
                                onClick={() => handleToggleVoucherJasra(member)}
                                className={`w-full py-1.5 px-2.5 rounded border-2 flex items-center justify-between text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isMemberVoucherReceivedCurrentWeek(member, currentWeekKey)
                                    ? "bg-[#FACC15] text-slate-950 border-black shadow-[2px_2px_0px_#000]"
                                    : "bg-white dark:bg-[#1F222C] text-slate-800 dark:text-slate-200 border-black/30 dark:border-white/20 hover:border-black shadow-sm"
                                }`}
                                title={
                                  isMemberVoucherReceivedCurrentWeek(member, currentWeekKey)
                                    ? "Voucher Aktif Minggu Ini. Klik untuk reset."
                                    : `Klik untuk berikan voucher minggu ini (${currentWeekLabel})`
                                }
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isMemberVoucherReceivedCurrentWeek(member, currentWeekKey) ? (
                                    <CheckSquare size={15} className="shrink-0 text-[#DC2626]" />
                                  ) : (
                                    <Square size={15} className="shrink-0 text-slate-400" />
                                  )}
                                  <span className="truncate">
                                    {isMemberVoucherReceivedCurrentWeek(member, currentWeekKey)
                                      ? "VOUCHER MINGGU INI AKTIF"
                                      : "VOUCHER: BELUM KLAIM"}
                                  </span>
                                </div>
                                <span className="text-[9px] shrink-0 font-normal ml-1">
                                  {isMemberVoucherReceivedCurrentWeek(member, currentWeekKey)
                                    ? "10 T • 10 P"
                                    : "10 Tritmen + Pingsan"}
                                </span>
                              </button>
                            </div>

                            {/* Action Buttons: Lihat KTP & Hapus */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 dark:border-white/10">
                              <div className="flex items-center gap-1.5">
                                {member.icPhoto ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewKtp({
                                        image: member.icPhoto,
                                        name: member.fullName || "Anggota",
                                        citizenId: member.icNumber || "",
                                      })
                                    }
                                    className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-900 font-black border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                                    title="Lihat dokumen KTP IC"
                                  >
                                    <FileText size={12} className="text-[#DC2626]" />
                                    <span>Lihat KTP</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Tanpa Foto KTP</span>
                                )}

                                {member.profilePhoto && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewKtp({
                                        image: member.profilePhoto,
                                        name: `${member.fullName || "Anggota"} (Foto Profil)`,
                                        citizenId: member.icNumber || "",
                                      })
                                    }
                                    className="btn text-[11px] py-1 px-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-black dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                                    title="Lihat foto profil resolusi penuh"
                                  >
                                    <Eye size={12} />
                                    <span>Foto</span>
                                  </button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, member.fullName)}
                                className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-500 transition-colors cursor-pointer"
                                title="Hapus data anggota dari database"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Kelola Event & Database Pendaftar */}
              {activeTab === "event_db" && (
                <div className="flex flex-col gap-4">
                  {/* Sub-Nav Pills: 1. Kelola Event & 2. Data Pendaftar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEventSubTab("events_manage")}
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border-2 border-black transition-all cursor-pointer ${
                          eventSubTab === "events_manage"
                            ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000]"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>🎯 Kelola Event & Bikin Baru ({eventsList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEventSubTab("registrations")}
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border-2 border-black transition-all cursor-pointer ${
                          eventSubTab === "registrations"
                            ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000]"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>📋 Data Pendaftar Peserta ({eventRegistrations.length})</span>
                      </button>
                    </div>

                    {eventSubTab === "events_manage" && (
                      <button
                        type="button"
                        onClick={handleOpenAddEvent}
                        className="btn py-2 px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                      >
                        <Plus size={16} className="text-[#FACC15]" />
                        <span>+ Buat Event Baru</span>
                      </button>
                    )}
                  </div>

                  {/* SUB-TAB 1: KELOLA EVENT & BIKIN BARU */}
                  {eventSubTab === "events_manage" && (
                    <div className="flex flex-col gap-4">
                      {/* Banner Info */}
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-950 shadow-[2px_2px_0px_#000] shrink-0">
                            <Ticket size={20} />
                          </div>
                          <div>
                            <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                              Daftar Event & Pengaturan Pendaftaran ({eventsList.length})
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Buka/tutup pendaftaran langsung lewat tombol 1-klik, sesuaikan biaya & syarat, atau tambah event baru tanpa ubah kode program.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAddEvent}
                          className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>+ Buat Event Baru</span>
                        </button>
                      </div>

                      {/* Grid Event Cards */}
                      {eventsList.length === 0 ? (
                        <div className="card-brutal p-8 sm:p-10 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] text-center flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-black flex items-center justify-center text-[#DC2626] dark:text-[#FACC15] shadow-[2px_2px_0px_#000]">
                            <Ticket size={28} />
                          </div>
                          <div>
                            <h5 className="font-heading font-black text-base uppercase text-slate-900 dark:text-slate-100">
                              Belum Ada Event Aktif
                            </h5>
                            <p className="text-xs text-slate-500 mt-1 max-w-md">
                              Semua event telah dihapus atau selesai. Klik tombol di bawah untuk membuat event atau turnamen baru kapan pun dibutuhkan.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAddEvent}
                            className="btn py-2.5 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                          >
                            <Plus size={16} className="text-[#DC2626]" />
                            <span>+ Buat Event Baru Sekarang</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eventsList.map((evt) => {
                          const regCount = eventRegistrations.filter(
                            (r) => r.eventId === evt.id || (!r.eventId && evt.id === "evt-pizzarena-civilian")
                          ).length;
                          const checkinCount = eventRegistrations.filter(
                            (r) =>
                              (r.eventId === evt.id || (!r.eventId && evt.id === "evt-pizzarena-civilian")) &&
                              r.checkedIn
                          ).length;
                          const paidCount = eventRegistrations.filter(
                            (r) =>
                              (r.eventId === evt.id || (!r.eventId && evt.id === "evt-pizzarena-civilian")) &&
                              r.feePaid
                          ).length;
                          const isOpen = evt.status === "OPEN";

                          return (
                            <div
                              key={evt.id}
                              className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-3 relative"
                            >
                              {/* Header Card: Status & Prefix */}
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black text-white border border-black shadow-[1px_1px_0px_#000] ${
                                      isOpen ? "bg-emerald-600" : "bg-red-600"
                                    }`}
                                  >
                                    {isOpen ? "PENDAFTARAN DIBUKA" : "PENDAFTARAN DITUTUP"}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-black/30 rounded">
                                    TIKET: {evt.ticketPrefix || "PZR"}-XXXX
                                  </span>
                                </div>

                                <span className="text-xs font-mono font-black text-slate-900 dark:text-slate-100 bg-[#FACC15]/30 dark:bg-[#FACC15]/20 px-2 py-0.5 rounded border border-black/20">
                                  {evt.entryFee || "$10.000 USD"}
                                </span>
                              </div>

                              {/* Title & Organizer */}
                              <div>
                                <h5 className="font-heading font-black text-base text-slate-950 dark:text-slate-100 uppercase">
                                  {evt.title}
                                </h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                                  {evt.organizer || "LSM Paguyuban Pizza Sandy Shores"}
                                </p>
                                {evt.tagline && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                                    "{evt.tagline}"
                                  </p>
                                )}
                              </div>

                              {/* Rules & Config Chips */}
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                                <span className={`px-1.5 py-0.5 rounded border ${
                                  evt.requireOcr !== false
                                    ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300"
                                }`}>
                                  {evt.requireOcr !== false ? "✓ Scan OCR KTP" : "Tanpa OCR"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded border ${
                                  evt.requireCivilianOnly !== false
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300"
                                }`}>
                                  {evt.requireCivilianOnly !== false ? "✓ Khusus Civilian" : "Bebas Job"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded border ${
                                  evt.requireNoGangOnly !== false
                                    ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300"
                                }`}>
                                  {evt.requireNoGangOnly !== false ? "✓ No Gang" : "Bebas Gang"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded border ${
                                  evt.showMessengerNotification !== false
                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300"
                                }`}>
                                  {evt.showMessengerNotification !== false ? "✓ Notif Pop-up On" : "Pop-up Off"}
                                </span>
                              </div>

                              {/* Preview Syarat Wajib Peserta */}
                              {Array.isArray(evt.requirements) && evt.requirements.length > 0 && (
                                <div className="p-2.5 bg-amber-50/60 dark:bg-[#14161F] rounded-md border border-black/10 dark:border-white/10 text-[11px]">
                                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                                    Syarat Peserta ({evt.requirements.length} butir mengurut):
                                  </span>
                                  <div className="flex flex-col gap-1 text-slate-800 dark:text-slate-200">
                                    {evt.requirements.slice(0, 3).map((r, i) => (
                                      <div key={i} className="flex items-start gap-1.5">
                                        <span className="w-4 h-4 rounded bg-[#DC2626] text-[#FACC15] font-mono font-bold flex items-center justify-center shrink-0 text-[9px] border border-black shadow-[0.5px_0.5px_0px_#000]">
                                          {i + 1}
                                        </span>
                                        <span className="truncate">{r}</span>
                                      </div>
                                    ))}
                                    {evt.requirements.length > 3 && (
                                      <span className="text-[10px] text-slate-400 italic pl-5">
                                        +{evt.requirements.length - 3} syarat lainnya...
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Stats Bar */}
                              <div className="p-2.5 bg-slate-50 dark:bg-[#14161F] rounded border border-black/10 dark:border-white/10 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-sans block">PENDAFTAR</span>
                                  <strong className="text-sm font-black text-slate-900 dark:text-slate-100">{regCount}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-sans block">CHECK-IN</span>
                                  <strong className="text-sm font-black text-emerald-600">{checkinCount}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-sans block">BAYAR FEE</span>
                                  <strong className="text-sm font-black text-amber-600">{paidCount}</strong>
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                                {/* Quick Toggle Status */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleEventStatus(evt)}
                                  className={`btn text-xs py-2 px-2 font-heading font-black border border-black rounded flex items-center justify-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all ${
                                    isOpen
                                      ? "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 shadow-sm"
                                      : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm"
                                  }`}
                                  title="Klik untuk membuka atau menutup pendaftaran event ini"
                                >
                                  <span>{isOpen ? "Tutup Pendaftaran" : "Buka Pendaftaran"}</span>
                                </button>

                                {/* Edit Config */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditEvent(evt)}
                                  className="btn text-xs py-2 px-2 bg-white dark:bg-[#20232E] hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-heading font-black border border-black rounded flex items-center justify-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-sm"
                                  title="Edit detail event, biaya, dan aturan validasi"
                                >
                                  <Edit2 size={13} />
                                  <span>Edit Event</span>
                                </button>

                                {/* Lihat Pendaftar */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEventFilter(evt.id);
                                    setEventSubTab("registrations");
                                  }}
                                  className="btn text-xs py-1.5 px-2 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black border border-black rounded flex items-center justify-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-sm col-span-2 sm:col-span-1"
                                >
                                  <Eye size={13} />
                                  <span>Pendaftar ({regCount})</span>
                                </button>

                                {/* Hapus Event */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvent(evt)}
                                  className="btn text-xs py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white font-heading font-black border border-black rounded flex items-center justify-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-sm col-span-2 sm:col-span-1"
                                  title="Hapus event dari database"
                                >
                                  <Trash2 size={13} />
                                  <span>Hapus Event</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  )}

                  {/* SUB-TAB 2: DATA PENDAFTAR PESERTA */}
                  {eventSubTab === "registrations" && (
                    <div className="flex flex-col gap-4">
                      {/* Top Header Card */}
                      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#DC2626] border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_#000] shrink-0">
                            <Ticket size={20} className="text-[#FACC15]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                                Data Pendaftar Event ({filteredEvents.length})
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FACC15] text-slate-950 border border-black">
                                {filteredEvents.filter((r) => r.checkedIn).length} CHECK-IN
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white border border-black">
                                {filteredEvents.filter((r) => r.feePaid).length} BAYAR FEE
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Data registrasi online warga dan peserta kegiatan akbar LSM Paguyuban Pizza Sandy Shores
                            </p>
                          </div>
                        </div>

                        {/* Event Selector & Export Action */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Filter Dropdown Event */}
                          <select
                            value={selectedEventFilter}
                            onChange={(e) => setSelectedEventFilter(e.target.value)}
                            className="text-xs font-heading font-black py-2 px-3 rounded border-2 border-black bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_#000] cursor-pointer"
                          >
                            <option value="all">Semua Event ({eventRegistrations.length})</option>
                            {eventsList.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.title}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleExportEventExcel}
                            disabled={filteredEvents.length === 0}
                            className="btn py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                            title="Download rekap pendaftar event dalam format Excel"
                          >
                            <FileSpreadsheet size={15} />
                            <span>Unduh Excel</span>
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="card-brutal p-3 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:max-w-md">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari kode tiket, nama IC, no telp, atau kategori..."
                            value={eventSearchQuery}
                            onChange={(e) => setEventSearchQuery(e.target.value)}
                            className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                          {eventSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setEventSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 shrink-0 self-start sm:self-center">
                          Menampilkan <span className="text-[#DC2626] dark:text-[#FACC15]">{filteredEvents.length}</span> dari {eventRegistrations.length} pendaftar
                        </div>
                      </div>

                      {/* Event Registrants Cards */}
                      {filteredEvents.length === 0 ? (
                        <div className="card-brutal p-12 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] text-center flex flex-col items-center justify-center gap-2">
                          <Ticket size={36} className="text-slate-300 dark:text-slate-600" />
                          <p className="font-heading font-black text-sm text-slate-700 dark:text-slate-300">
                            {eventSearchQuery ? "Tidak ditemukan pendaftar event yang sesuai" : "Belum ada pendaftar pada event ini"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {eventSearchQuery ? "Coba gunakan kata kunci pencarian yang lain." : "Peserta yang mendaftar melalui formulir web akan otomatis tercatat di sini."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                          {filteredEvents.map((reg) => (
                            <div
                              key={reg.id}
                              className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
                            >
                              {/* Ticket Header */}
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-black text-xs text-[#DC2626] dark:text-[#FACC15] bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-300 dark:border-red-900">
                                    {reg.ticketCode}
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                    reg.feePaid
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                                      : "bg-[#FACC15]/20 dark:bg-[#FACC15]/10 text-amber-900 dark:text-amber-200 border-amber-400"
                                  }`}>
                                    {reg.feePaid ? `FEE: LUNAS` : `FEE: BELUM`}
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                    reg.checkedIn
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                                      : "bg-[#FACC15]/20 dark:bg-[#FACC15]/10 text-amber-900 dark:text-amber-200 border-amber-400"
                                  }`}>
                                    {reg.checkedIn ? `CHECK-IN: HADIR` : `CHECK-IN: BELUM`}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {reg.ssDate || reg.regDate || "-"}
                                </span>
                              </div>

                              {/* Participant Info */}
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="font-heading font-black text-sm text-slate-950 dark:text-slate-100 uppercase truncate" title={reg.fullName}>
                                    {reg.fullName || "Tanpa Nama"}
                                  </h5>
                                  {reg.citizenId && (
                                    <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                                      CID: {reg.citizenId}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                                  Event: {reg.eventTitle || reg.category || "Pizzarena"}
                                </div>

                                {/* Civilian & Gang Verified Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-400">
                                    ✓ {reg.jobStatus || "Civilian"}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-400">
                                    ✓ {reg.gangStatus || "No Gang"}
                                  </span>
                                </div>
                              </div>

                              {/* Contact Details */}
                              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded bg-slate-50 dark:bg-[#14161F] border border-black/10 dark:border-white/10 font-mono">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-sans font-bold block">NO HP IC:</span>
                                  <strong className="text-slate-900 dark:text-slate-100 truncate block text-[11px]" title={reg.phone}>
                                    {reg.phone || "-"}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 font-sans font-bold block">DISCORD (OOC):</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate block text-[11px]" title={reg.discordTag || reg.telegram}>
                                    {reg.discordTag || reg.telegram || "-"}
                                  </span>
                                </div>
                              </div>

                              {/* Preview Screenshot Button if available */}
                              {reg.ktpScreenshot && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewKtp({
                                      image: reg.ktpScreenshot,
                                      name: `${reg.fullName} (Bukti KTP & HUD)`,
                                      citizenId: reg.citizenId || "",
                                    })
                                  }
                                  className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-900 font-black border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                                  title="Lihat screenshot KTP IC dan HUD"
                                >
                                  <FileText size={12} className="text-[#DC2626]" />
                                  <span>Lihat Bukti Screenshot KTP & HUD</span>
                                </button>
                              )}

                              {/* Bottom Actions: Toggle Fee, Checkin & Delete */}
                              <div className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Toggle Fee Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFeePaid(reg)}
                                    style={{
                                      backgroundColor: reg.feePaid ? "#059669" : "#FACC15",
                                      color: reg.feePaid ? "#FFFFFF" : "#020617",
                                    }}
                                    className="w-full text-xs py-2 px-2.5 rounded font-mono font-black border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_#000]"
                                    title="Klik untuk mengubah status pembayaran fee"
                                  >
                                    {reg.feePaid ? (
                                      <CheckCircle2 size={14} className="text-white shrink-0" />
                                    ) : (
                                      <DollarSign size={14} className="text-slate-950 shrink-0" />
                                    )}
                                    <span>{reg.feePaid ? "FEE LUNAS" : "BAYAR FEE"}</span>
                                  </button>

                                  {/* Toggle Check-in Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEventCheckin(reg)}
                                    style={{
                                      backgroundColor: reg.checkedIn ? "#059669" : "#FACC15",
                                      color: reg.checkedIn ? "#FFFFFF" : "#020617",
                                    }}
                                    className="w-full text-xs py-2 px-2.5 rounded font-mono font-black border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_#000]"
                                    title="Klik untuk mengubah status kehadiran di arena"
                                  >
                                    {reg.checkedIn ? (
                                      <CheckCircle2 size={14} className="text-white shrink-0" />
                                    ) : (
                                      <Clock size={14} className="text-slate-950 shrink-0" />
                                    )}
                                    <span>{reg.checkedIn ? "HADIR ARENA" : "CHECK-IN"}</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteEventReg(reg)}
                                  className="text-[11px] text-red-600 dark:text-red-400 hover:underline flex items-center justify-center gap-1 py-0.5 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>Hapus Pendaftar</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Penyaluran Bansos Warga LSM Sandy Shores */}
              {activeTab === "bansos_db" && (
                <div className="flex flex-col gap-4">
                  {/* Sub-Nav Pills: 1. Kelola Program Bansos & 2. Data Klaim Warga */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBansosSubTab("programs_manage")}
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border-2 border-black transition-all cursor-pointer ${
                          bansosSubTab === "programs_manage"
                            ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000]"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>🎁 Kelola Program Bansos ({bansosPrograms.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBansosSubTab("claims_data")}
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border-2 border-black transition-all cursor-pointer ${
                          bansosSubTab === "claims_data"
                            ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000]"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>📋 Data Klaim Warga ({bansosClaims.length})</span>
                      </button>
                    </div>

                    {bansosSubTab === "programs_manage" && (
                      <button
                        type="button"
                        onClick={handleOpenAddBansosProgram}
                        className="btn py-2 px-3.5 bg-[#059669] hover:bg-[#047857] text-white font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                      >
                        <Plus size={16} className="text-[#FACC15]" />
                        <span>+ Buat Program Bansos Baru</span>
                      </button>
                    )}
                  </div>

                  {/* SUB-TAB 1: KELOLA PROGRAM BANSOS */}
                  {bansosSubTab === "programs_manage" && (
                    <div className="flex flex-col gap-4">
                      {/* Banner Info */}
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-950 shadow-[2px_2px_0px_#000] shrink-0">
                            <Gift size={20} />
                          </div>
                          <div>
                            <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                              Daftar Program Bantuan Sosial ({bansosPrograms.length})
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Buat program bansos baru, atur paket barang/sembako, dan aktifkan/nonaktifkan program kapan saja tanpa ubah kode.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAddBansosProgram}
                          className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>+ Buat Program Bansos</span>
                        </button>
                      </div>

                      {/* Grid Program Cards */}
                      {bansosPrograms.length === 0 ? (
                        <div className="card-brutal p-8 sm:p-10 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] text-center flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border-2 border-black flex items-center justify-center text-emerald-600 shadow-[2px_2px_0px_#000]">
                            <Gift size={28} />
                          </div>
                          <div>
                            <h5 className="font-heading font-black text-base uppercase text-slate-900 dark:text-slate-100">
                              Belum Ada Program Bansos
                            </h5>
                            <p className="text-xs text-slate-500 mt-1 max-w-md">
                              Klik tombol di bawah untuk menambahkan program bansos baru untuk warga Sandy Shores.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAddBansosProgram}
                            className="btn py-2.5 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                          >
                            <Plus size={16} className="text-emerald-700" />
                            <span>+ Buat Program Bansos Sekarang</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bansosPrograms.map((prog) => {
                            const progClaims = bansosClaims.filter((c) => c.programId === prog.id);
                            const claimedCount = progClaims.filter((c) => c.claimed).length;
                            const unclaimedCount = progClaims.filter((c) => !c.claimed).length;
                            const isActive = prog.status === "ACTIVE";

                            return (
                              <div
                                key={prog.id}
                                className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3"
                              >
                                <div>
                                  {/* Header with Title and Badges */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100 truncate">
                                        {prog.title}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                                        {prog.tagline || "Program Kepedulian LSM Paguyuban Pizza"}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border border-black shadow-[1px_1px_0px_#000] ${
                                          isActive
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-400 text-slate-950"
                                        }`}
                                      >
                                        {isActive ? "AKTIF" : "NONAKTIF"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Items Breakdown Badges */}
                                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                                    {(prog.items || []).map((it, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/40 text-amber-950 dark:text-amber-200 text-[10.5px] font-bold rounded"
                                      >
                                        {it.icon === "DollarSign" ? (
                                          <DollarSign size={11} className="text-green-600 shrink-0" />
                                        ) : (
                                          <Gift size={11} className="text-emerald-600 shrink-0" />
                                        )}
                                        <span>{it.name}</span>
                                      </span>
                                    ))}
                                    {Number(prog.totalCash) > 0 && !(prog.items || []).some((i) => i.icon === "DollarSign" || /uang|tunai|cash|\$/i.test(i.name)) && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/40 text-emerald-950 dark:text-emerald-200 text-[10.5px] font-bold rounded">
                                        <DollarSign size={11} className="text-green-600 shrink-0" />
                                        <span>${Number(prog.totalCash).toLocaleString("id-ID")} USD</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Stats row */}
                                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-black/10 dark:border-white/10 text-center text-xs">
                                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-black/10 dark:border-white/10">
                                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Klaim</span>
                                      <span className="font-heading font-black text-sm">{progClaims.length}</span>
                                    </div>
                                    <div className="p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-300/60 dark:border-amber-700/40">
                                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block uppercase font-bold">Belum Diambil</span>
                                      <span className="font-heading font-black text-sm text-amber-600">{unclaimedCount}</span>
                                    </div>
                                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-300/60 dark:border-emerald-700/40">
                                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-bold">Sudah Diambil</span>
                                      <span className="font-heading font-black text-sm text-emerald-600">{claimedCount}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom Action Buttons */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* 1-Click Status Toggle */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBansosProgramStatus(prog.id, prog.status)}
                                      className={`btn py-1 px-2.5 text-[11px] font-heading font-black border border-black transition-all cursor-pointer ${
                                        isActive
                                          ? "bg-amber-100 hover:bg-amber-200 text-amber-950"
                                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                      }`}
                                    >
                                      {isActive ? "Nonaktifkan" : "Jadikan Aktif"}
                                    </button>

                                    {/* 1-Click Messenger Pop-up Toggle */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBansosProgramMessenger(prog)}
                                      className={`btn py-1 px-2 text-[10.5px] font-mono font-bold border border-black transition-all cursor-pointer ${
                                        prog.showMessengerNotification !== false
                                          ? "bg-yellow-300 text-slate-950"
                                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                      }`}
                                      title="Aktifkan atau matikan pop-up mengambang di web"
                                    >
                                      {prog.showMessengerNotification !== false ? "🔔 Pop-up On" : "Pop-up Off"}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditBansosProgram(prog)}
                                      className="p-1.5 bg-white dark:bg-[#1E212B] hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
                                      title="Edit Program Bansos"
                                    >
                                      <Edit2 size={13} />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBansosProgram(prog)}
                                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
                                      title="Hapus Program Bansos"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 2: DATA KLAIM WARGA */}
                  {bansosSubTab === "claims_data" && (
                    <div className="flex flex-col gap-4">
                      {/* Bansos Header Info Card */}
                      <div className="card-brutal p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-12 h-12 bg-[#FACC15] text-[#111827] border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_#000] shrink-0">
                            <Gift size={26} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-black text-base uppercase text-slate-900 dark:text-slate-100">
                                Bantuan Sosial (Bansos) Warga
                              </h3>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-[#FACC15] border border-black shadow-[1px_1px_0px_#000]">
                                Total {bansosClaims.length} Pengajuan
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              Kelola dan pantau pengambilan paket bantuan sosial warga sipil Sandy Shores.
                            </p>
                          </div>
                        </div>

                        <a
                          href="/bansos"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-2 border-black font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                        >
                          <ExternalLink size={14} />
                          <span>Buka Form /bansos</span>
                        </a>
                      </div>

                      {/* Summary Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {/* 1. Total Permohonan */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-slate-500 block truncate">
                            Total Pemohon
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-slate-100">
                            {bansosClaims.length}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Warga Terdaftar</span>
                        </div>

                        {/* 2. Belum Diambil */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-amber-700 dark:text-amber-400 block truncate">
                            Belum Diambil
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-amber-600">
                            {bansosClaims.filter((c) => !c.claimed).length}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Menunggu Di Kantor</span>
                        </div>

                        {/* 3. Sudah Diambil */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-emerald-700 dark:text-emerald-400 block truncate">
                            Sudah Diambil
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-emerald-600">
                            {bansosClaims.filter((c) => c.claimed).length}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Telah Diserahkan</span>
                        </div>

                        {/* 4. Total Bantuan Tunai Tersalurkan */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-green-700 dark:text-green-400 block truncate">
                            Dana Tersalurkan
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-green-600">
                            ${bansosClaims
                              .filter((c) => c.claimed)
                              .reduce((acc, c) => acc + (typeof c.cashAmount === "number" ? c.cashAmount : 2500), 0)
                              .toLocaleString("en-US")}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Bantuan Tunai Total</span>
                        </div>
                      </div>

                      {/* Filter & Search Toolbar */}
                      <div className="card-brutal p-3 sm:p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Search size={16} />
                          </div>
                          <input
                            type="text"
                            placeholder="Cari Nama IC, Citizen ID (CID), atau Kode Kupon..."
                            value={bansosSearchQuery}
                            onChange={(e) => setBansosSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                          />
                          {bansosSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setBansosSearchQuery("")}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-black dark:hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Program Filter */}
                          <select
                            value={selectedBansosProgramFilter}
                            onChange={(e) => setSelectedBansosProgramFilter(e.target.value)}
                            className="bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] py-2 px-3 text-xs font-heading font-black shadow-[2px_2px_0px_#000] focus:outline-none cursor-pointer max-w-[200px] truncate"
                          >
                            <option value="ALL">Semua Program ({bansosClaims.length})</option>
                            {bansosPrograms.map((p) => {
                              const count = bansosClaims.filter((c) => c.programId === p.id).length;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.title} ({count})
                                </option>
                              );
                            })}
                          </select>

                          {/* Status Filter */}
                          <select
                            value={bansosStatusFilter}
                            onChange={(e) => setBansosStatusFilter(e.target.value)}
                            className="bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] py-2 px-3 text-xs font-heading font-black shadow-[2px_2px_0px_#000] focus:outline-none cursor-pointer"
                          >
                            <option value="all">Semua Status ({bansosClaims.length})</option>
                            <option value="unclaimed">
                              Belum Diambil ({bansosClaims.filter((c) => !c.claimed).length})
                            </option>
                            <option value="claimed">
                              Sudah Diambil ({bansosClaims.filter((c) => c.claimed).length})
                            </option>
                          </select>

                          {/* Export to Excel */}
                          <button
                            type="button"
                            onClick={handleExportBansosExcel}
                            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 shrink-0"
                          >
                            <FileSpreadsheet size={15} />
                            <span>Unduh (.xlsx)</span>
                          </button>
                        </div>
                      </div>

                      {/* Bansos Claims Cards List */}
                      {(() => {
                        let filtered = bansosClaims;
                        if (bansosStatusFilter === "unclaimed") {
                          filtered = filtered.filter((c) => !c.claimed);
                        } else if (bansosStatusFilter === "claimed") {
                          filtered = filtered.filter((c) => c.claimed);
                        }

                        if (selectedBansosProgramFilter !== "ALL") {
                          filtered = filtered.filter((c) => c.programId === selectedBansosProgramFilter);
                        }

                        if (bansosSearchQuery.trim()) {
                          const q = bansosSearchQuery.trim().toLowerCase();
                          filtered = filtered.filter(
                            (c) =>
                              (c.fullName && c.fullName.toLowerCase().includes(q)) ||
                              (c.citizenId && c.citizenId.toLowerCase().includes(q)) ||
                              (c.claimCode && c.claimCode.toLowerCase().includes(q)) ||
                              (c.programTitle && c.programTitle.toLowerCase().includes(q))
                          );
                        }

                        if (filtered.length === 0) {
                          return (
                            <div className="card-brutal p-8 text-center bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] space-y-2">
                              <Gift className="mx-auto text-slate-400" size={36} />
                              <h4 className="font-heading font-black text-sm uppercase text-slate-700 dark:text-slate-300">
                                Tidak Ada Data Pengajuan Bansos
                              </h4>
                              <p className="text-xs text-slate-500">
                                {bansosSearchQuery
                                  ? `Tidak ditemukan klaim yang cocok dengan kata kunci "${bansosSearchQuery}".`
                                  : "Belum ada warga yang mengajukan formulir bansos."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-3">
                            {filtered.map((claim) => (
                              <div
                                key={claim.id}
                                className="card-brutal p-4 bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                              >
                                {/* Left Section: KTP Thumbnail + Profile Details */}
                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                  {/* Thumbnail KTP with Click to View Safely */}
                                  {claim.screenshotUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openImageSafely(
                                          claim.screenshotUrl,
                                          `KTP IC - ${claim.fullName} (${claim.citizenId})`
                                        )
                                      }
                                      className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 border-2 border-black shrink-0 overflow-hidden shadow-[2px_2px_0px_#000] cursor-pointer hover:border-[#FACC15]"
                                      title="Klik untuk melihat foto KTP IC lengkap"
                                    >
                                      <img
                                        src={claim.screenshotUrl}
                                        alt={`KTP ${claim.fullName}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex flex-col items-center justify-center text-white transition-opacity">
                                        <Eye size={14} />
                                        <span className="text-[9px] font-black uppercase mt-0.5">KTP</span>
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 dark:bg-slate-800 border-2 border-black flex flex-col items-center justify-center text-slate-500 shrink-0">
                                      <User size={20} />
                                      <span className="text-[9px] font-black uppercase mt-1">No KTP</span>
                                    </div>
                                  )}

                                  {/* Details */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-black text-xs px-2 py-0.5 bg-black text-[#FACC15] border border-black shadow-[1px_1px_0px_#000] tracking-wide select-all">
                                        {claim.claimCode}
                                      </span>
                                      <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100 truncate">
                                        {claim.fullName}
                                      </h4>
                                    </div>

                                    <div className="flex items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                                      <span className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-slate-200">
                                        <CreditCard size={13} className="text-slate-500" />
                                        CID: {claim.citizenId}
                                      </span>
                                      <span>&bull;</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">Sex: {claim.sex || "Laki-laki"}</span>
                                    </div>

                                    {/* Package info & timeline */}
                                    <div className="flex items-center gap-2 text-[11px] pt-1 flex-wrap">
                                      <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-600">
                                        {claim.programTitle ? `${claim.programTitle}: ` : ""}
                                        {Array.isArray(claim.packageItems)
                                          ? claim.packageItems.join(" + ")
                                          : (claim.packageItems || "1 Paket Makanan + $2.500 USD")}
                                      </span>
                                      <span className="text-slate-400">&bull;</span>
                                      <span className="text-slate-500">
                                        Diajukan: {claim.claimDate} {claim.claimTime}
                                      </span>
                                    </div>

                                    {claim.claimed && claim.claimedAt && (
                                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                        Diserahkan pada: {claim.claimedAt}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right Section: Status Toggle & Delete Action */}
                                <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-black/10 dark:border-white/10 shrink-0">
                                  {/* 1-Click Status Toggle Button with explicit colors */}
                                  {claim.claimed ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBansos(claim)}
                                      style={{ backgroundColor: "#059669", color: "#FFFFFF" }}
                                      className="py-2 px-3.5 border-2 border-black font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Status SUDAH DIAMBIL. Klik untuk kembalikan ke BELUM DIAMBIL jika keliru."
                                    >
                                      <Check size={14} className="stroke-[3]" />
                                      <span>SUDAH DIAMBIL</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBansos(claim)}
                                      style={{ backgroundColor: "#FACC15", color: "#111827" }}
                                      className="py-2 px-3.5 border-2 border-black font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Status BELUM DIAMBIL. Klik untuk tandai SUDAH DIAMBIL saat penyerahan."
                                    >
                                      <Clock size={14} className="stroke-[3]" />
                                      <span>BELUM DIAMBIL</span>
                                    </button>
                                  )}

                                  {/* Delete Claim Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBansos(claim)}
                                    className="p-2 bg-white dark:bg-slate-800 text-red-600 hover:bg-red-600 hover:text-white border-2 border-black shadow-[2px_2px_0px_#000] transition-colors cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                                    title="Hapus data klaim ini"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Security */}
              {activeTab === "security" && (
                <div className="flex flex-col gap-5">
                  {/* Security Architecture Card */}
                  <div className="card-brutal p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-4">
                    <div className="flex items-center gap-3 border-b-2 border-black/10 dark:border-white/10 pb-3">
                      <div className="w-10 h-10 rounded bg-emerald-500/10 border-2 border-emerald-600 flex items-center justify-center text-emerald-600 shadow-[2px_2px_0px_#059669]">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                          Sistem Keamanan & Enkripsi Portal
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Standar pengamanan akses dashboard LSM Sandy Shores
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-[#1E222D] border-2 border-black/15 dark:border-white/10 rounded">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Enkripsi Kata Sandi
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> SHA-256 Cryptographic Hash
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          Password dienkripsi satu arah sebelum disimpan ke database.
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-[#1E222D] border-2 border-black/15 dark:border-white/10 rounded">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Proteksi Anti Brute-Force
                        </div>
                        <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <ShieldAlert size={14} /> Maks 5 Percobaan / Kunci 60 Detik
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          Mencegah bot dan serangan tebak password otomatis.
                        </div>
                      </div>
                    </div>

                    {/* Hash fingerprint info */}
                    <div className="p-3 bg-slate-100 dark:bg-[#181A22] border-2 border-black/20 dark:border-white/15 rounded flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Fingerprint Hash Aktif (SHA-256):
                      </span>
                      <code className="text-[11px] font-mono break-all text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111319] p-2 border border-black/10 dark:border-white/10 rounded select-all">
                        {formData.adminPassHash || DEFAULT_ADMIN_HASH}
                      </code>
                    </div>
                  </div>

                  {/* Change Password Card */}
                  <div className="card-brutal p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b-2 border-black/10 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <KeyRound size={18} className="text-[#DC2626]" />
                        <div>
                          <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                            Ganti Kode Sandi Admin
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Ubah password akses untuk mengunci panel pengelola
                          </p>
                        </div>
                      </div>
                      {!showPasswordForm && (
                        <button
                          type="button"
                          onClick={() => setShowPasswordForm(true)}
                          className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black font-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Ubah Password
                        </button>
                      )}
                    </div>

                    {showPasswordForm ? (
                      <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-[#1C1F2A] p-4 border-2 border-black/20 dark:border-white/15 rounded">
                        <div>
                          <label className="card-label text-slate-700 dark:text-slate-300 mb-1 block">
                            Password Baru (Minimal 6 Karakter)
                          </label>
                          <input
                            type="password"
                            placeholder="Ketik password baru..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-field font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="card-label text-slate-700 dark:text-slate-300 mb-1 block">
                            Konfirmasi Ulang Password Baru
                          </label>
                          <input
                            type="password"
                            placeholder="Ulangi password baru..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-field font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isApplyingPassword}
                            onClick={handleApplyNewPassword}
                            className="btn text-xs py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                          >
                            {isApplyingPassword ? "Menyimpan ke Database..." : "Simpan & Terapkan Password Baru"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            className="btn btn-secondary text-xs py-2 px-3 border-2 border-black dark:border-[#475569]"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Klik tombol <strong>"Ubah Password"</strong> di atas jika Anda ingin memperbarui kode sandi otentikasi admin.
                      </p>
                    )}
                  </div>

                  {/* Browser Session Card */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
                        Sesi Login di Browser Ini
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersimpan aman (SHA-256 Session Token)</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn text-xs py-2 px-3.5 bg-red-600 hover:bg-red-700 text-white font-heading font-black border-2 border-black dark:border-red-400 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
                    >
                      <LogOut size={14} className="text-white" />
                      <span>Hapus Sesi & Logout</span>
                    </button>
                  </div>
                </div>
              )}

                </div>
              </div>

              {/* Bottom Actions (Fixed Bar at Bottom) */}
              <div className="shrink-0 border-t-2 border-[#1A1A1A]/15 dark:border-slate-700/60 bg-white/95 dark:bg-[#1F222C]/95 backdrop-blur-sm px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_-2px_0_#000]/5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-heading font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Reset Konfigurasi Awal</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary text-xs py-2 px-4 border-2 border-black dark:border-[#475569]"
                    title="Tutup panel admin dan lihat website utama"
                  >
                    Tutup Panel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn text-xs py-2 px-5 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] disabled:opacity-50 font-black"
                  >
                    <Save size={15} className="text-[#DC2626]" />
                    <span>{isSaving ? "Menyimpan Data..." : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
        </div>

      {/* Lightbox / Modal Preview Dokumen KTP Resolusi Penuh */}
      {previewKtp && (
        <div
          onClick={() => setPreviewKtp(null)}
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-brutal p-4 bg-white dark:bg-[#1E212B] border-3 border-black max-w-3xl w-full rounded-lg flex flex-col gap-3 shadow-[8px_8px_0px_#000] max-h-[92vh]"
          >
            {/* Header Modal Lightbox */}
            <div className="flex items-center justify-between w-full pb-2 border-b-2 border-black/15 dark:border-white/15">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[#DC2626] dark:text-[#FACC15]" />
                <div>
                  <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide block">
                    DOKUMEN KTP IC: {previewKtp.name}
                  </span>
                  {previewKtp.citizenId && (
                    <span className="text-[10px] font-mono text-[#DC2626] dark:text-[#FACC15] font-bold">
                      CITIZEN ID / NIK: #{previewKtp.citizenId}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKtp(null)}
                className="w-8 h-8 rounded border-2 border-black bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 flex items-center justify-center font-bold text-sm shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                title="Tutup Preview"
              >
                <X size={16} />
              </button>
            </div>

            {/* Container Gambar KTP Resolusi Penuh */}
            <div className="bg-slate-950 rounded-lg p-2 flex items-center justify-center border-2 border-black/30 min-h-[280px] max-h-[62vh] overflow-hidden">
              <img
                src={previewKtp.image}
                alt={"KTP " + previewKtp.name}
                className="max-h-[60vh] w-auto max-w-full object-contain rounded"
              />
            </div>

            {/* Footer Aksi */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-[11px] text-slate-500 font-mono">
                💡 Dokumen KTP IC tersimpan aman di sistem pendaftaran warga.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openImageSafely(previewKtp.image, "KTP-" + (previewKtp.citizenId || previewKtp.name))}
                  className="btn py-1.5 px-3 bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 hover:bg-slate-100"
                  title="Buka gambar di tab baru dengan URL Blob (Aman dari blank tab)"
                >
                  <ExternalLink size={13} />
                  <span>Buka di Tab Baru</span>
                </button>
                <a
                  href={previewKtp.image}
                  download={"KTP_" + (previewKtp.citizenId || "IC") + ".jpg"}
                  className="btn py-1.5 px-3 bg-[#FACC15] text-[#111827] text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 hover:bg-yellow-400"
                  title="Unduh file KTP ke komputer"
                >
                  <span>Unduh KTP</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewKtp(null)}
                  className="btn py-1.5 px-3.5 bg-slate-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM BUAT / EDIT EVENT */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl max-h-[92vh] rounded-xl border-[3px] border-black shadow-[8px_8px_0px_#000] bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-black bg-[#FACC15] text-slate-950">
              <div className="flex items-center gap-2">
                <Ticket size={20} className="text-[#DC2626]" />
                <h4 className="font-heading font-black text-sm uppercase">
                  {editingEvent.id ? "Edit Konfigurasi Event" : "Buat Event Komunitas Baru"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="w-7 h-7 rounded border border-black bg-white flex items-center justify-center font-bold cursor-pointer"
                title="Batal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveEvent} className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Nama Event */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Nama Event / Turnamen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pizzarena : Civilian Street Fight"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="input-field w-full text-xs font-bold"
                />
              </div>

              {/* Grid 2 Kolom: Penyelenggara & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Penyelenggara
                  </label>
                  <input
                    type="text"
                    placeholder="LSM Paguyuban Pizza Sandy Shores"
                    value={editingEvent.organizer}
                    onChange={(e) => setEditingEvent({ ...editingEvent, organizer: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Tagline / Sub-judul Singkat
                  </label>
                  <input
                    type="text"
                    placeholder="Turnamen Tarung Bebas Resmi Khusus Warga Sipil"
                    value={editingEvent.tagline}
                    onChange={(e) => setEditingEvent({ ...editingEvent, tagline: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              {/* Grid 3 Kolom: Status, Biaya, Prefix Tiket */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Pendaftaran */}
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Status Pendaftaran
                  </label>
                  <select
                    value={editingEvent.status}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                    className="input-field w-full text-xs font-bold cursor-pointer"
                  >
                    <option value="OPEN">DIBUKA (Hijau)</option>
                    <option value="CLOSED">DITUTUP (Merah)</option>
                    <option value="DRAFT">DRAF (Disimpan)</option>
                  </select>
                </div>

                {/* Biaya Pendaftaran */}
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Biaya Pendaftaran
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: $10.000 USD / Gratis"
                    value={editingEvent.entryFee}
                    onChange={(e) => setEditingEvent({ ...editingEvent, entryFee: e.target.value })}
                    className="input-field w-full text-xs font-mono font-bold"
                  />
                </div>

                {/* Prefix Kode Tiket */}
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Prefix Tiket (3-8 Huruf)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PZR-CIV / PPS-EVT"
                    value={editingEvent.ticketPrefix}
                    onChange={(e) => setEditingEvent({ ...editingEvent, ticketPrefix: e.target.value.toUpperCase() })}
                    className="input-field w-full text-xs font-mono font-black uppercase"
                  />
                </div>
              </div>

              {/* Syarat Validasi Form (Checkboxes) */}
              <div className="p-3 bg-amber-50/70 dark:bg-[#14161F] border-2 border-black/20 dark:border-white/10 rounded-lg flex flex-col gap-2">
                <span className="font-heading font-black uppercase text-xs text-slate-900 dark:text-slate-100">
                  Pengaturan Validasi Formulir & Syarat:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={editingEvent.requireOcr !== false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, requireOcr: e.target.checked })}
                      className="w-4 h-4 accent-[#DC2626]"
                    />
                    <span>Wajib Scan OCR KTP & HUD</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={editingEvent.requireCivilianOnly !== false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, requireCivilianOnly: e.target.checked })}
                      className="w-4 h-4 accent-[#DC2626]"
                    />
                    <span>Khusus Civilian (Tolak Faksi)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={editingEvent.requireNoGangOnly !== false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, requireNoGangOnly: e.target.checked })}
                      className="w-4 h-4 accent-[#DC2626]"
                    />
                    <span>Wajib No Gang (Tolak Gang)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={editingEvent.requireHpIc !== false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, requireHpIc: e.target.checked })}
                      className="w-4 h-4 accent-[#DC2626]"
                    />
                    <span>Wajib Nomor HP / Telepon IC</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={editingEvent.requireDiscord !== false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, requireDiscord: e.target.checked })}
                      className="w-4 h-4 accent-[#DC2626]"
                    />
                    <span>Wajib Username Discord (OOC)</span>
                  </label>
                </div>
              </div>

              {/* Syarat Wajib Peserta (Editable List Mengurut 1, 2, 3 ke Bawah) */}
              <div className="p-3.5 bg-amber-50/70 dark:bg-[#14161F] border-2 border-black/20 dark:border-white/10 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={15} className="text-[#DC2626]" />
                    <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200">
                      Syarat Wajib Peserta (Tampil Mengurut 1, 2, 3 ke Bawah)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    1 baris = 1 nomor urut
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={
                    Array.isArray(editingEvent.requirements)
                      ? editingEvent.requirements.join("\n")
                      : editingEvent.requirements || ""
                  }
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      requirements: e.target.value.split("\n"),
                    })
                  }
                  placeholder={`Contoh:\nKhusus warga sipil / Civilian (Freelancer)\nWajib No Gang (Unaffiliated)\nBiaya pendaftaran $10.000 USD diserahkan di arena\nWajib membawa KTP IC yang masih berlaku`}
                  className="input-field w-full text-xs font-medium leading-relaxed font-mono"
                />

                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  💡 <strong>Tips:</strong> Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[9px] border border-black/30">Enter</kbd> untuk membuat butir baru. Setiap baris teks otomatis tampil dengan nomor urut <strong>1, 2, 3...</strong> menurun ke bawah di formulir pendaftaran warga.
                </p>
              </div>

              {/* Pengaturan Pop-up Messenger Web */}
              <div className="p-3 bg-slate-50 dark:bg-[#14161F] border-2 border-black/20 dark:border-white/10 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black uppercase text-xs text-slate-900 dark:text-slate-100">
                    Pengaturan Notifikasi Messenger Web:
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-mono font-bold text-[11px]">
                    <input
                      type="checkbox"
                      checked={editingEvent.showMessengerNotification !== false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, showMessengerNotification: e.target.checked })}
                      className="w-3.5 h-3.5 accent-[#DC2626]"
                    />
                    <span>Tampilkan Pop-up</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Judul Notifikasi Pop-up
                  </label>
                  <input
                    type="text"
                    value={editingEvent.messengerHeading || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, messengerHeading: e.target.value })}
                    placeholder="Contoh: Ada Event Baru!"
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Pesan Teks Chat Pop-up
                  </label>
                  <textarea
                    rows={2}
                    value={editingEvent.messengerMessage || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, messengerMessage: e.target.value })}
                    placeholder="Tulis pesan ajakan chat yang menarik untuk pengunjung web..."
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              {/* Deskripsi Event */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Deskripsi & Aturan Lengkap Event
                </label>
                <textarea
                  rows={2}
                  value={editingEvent.description || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Keterangan format turnamen, lokasi penimbangan badan, hadiah, dll."
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="btn py-2 px-4 bg-white dark:bg-[#1E222D] text-slate-800 dark:text-slate-200 border-2 border-black font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="btn py-2 px-5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] text-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} className="text-[#DC2626]" />
                  <span>{isSavingEvent ? "Menyimpan Event..." : "Simpan Konfigurasi Event"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM BUAT / EDIT PROGRAM BANSOS */}
      {editingBansosProgram && (
        <div
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl max-h-[92vh] rounded-xl border-[3px] border-black shadow-[8px_8px_0px_#000] bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-black bg-[#FACC15] text-slate-950">
              <div className="flex items-center gap-2">
                <Gift size={20} className="text-[#059669]" />
                <h4 className="font-heading font-black text-sm uppercase">
                  {editingBansosProgram.id ? "Edit Program Bansos" : "Buat Program Bansos Baru"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingBansosProgram(null)}
                className="w-7 h-7 rounded border border-black bg-white flex items-center justify-center font-bold cursor-pointer"
                title="Batal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveBansosProgram} className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Nama Program */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Nama Program Bansos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bantuan Sosial Warga Sandy Shores"
                  value={editingBansosProgram.title}
                  onChange={(e) => setEditingBansosProgram({ ...editingBansosProgram, title: e.target.value })}
                  className="input-field w-full text-xs font-bold"
                />
              </div>

              {/* Tagline / Sub-judul */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Tagline / Sub-judul Singkat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Program Kepedulian LSM Paguyuban Pizza Sandy Shores"
                  value={editingBansosProgram.tagline}
                  onChange={(e) => setEditingBansosProgram({ ...editingBansosProgram, tagline: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Status Program & Total Uang Saku */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Status Program
                  </label>
                  <select
                    value={editingBansosProgram.status}
                    onChange={(e) => setEditingBansosProgram({ ...editingBansosProgram, status: e.target.value })}
                    className="input-field w-full text-xs font-bold"
                  >
                    <option value="ACTIVE">ACTIVE (Dapat Diajukan Warga)</option>
                    <option value="INACTIVE">INACTIVE (Nonaktif / Arsip)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                    Bantuan Tunai / Uang Saku ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="2500"
                    value={editingBansosProgram.totalCash ?? ""}
                    onChange={(e) => handleTotalCashChange(e.target.value)}
                    className="input-field w-full text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Daftar Barang / Komoditas Paket Bansos */}
              <div className="p-3 bg-amber-50/50 dark:bg-[#1E212B] border-2 border-black/40 rounded-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-black/10 dark:border-white/10">
                  <span className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Package size={14} className="text-amber-600" />
                    <span>Daftar Isi Paket Barang (Komoditas)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBansosItem}
                    className="py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-[11px] border border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
                  >
                    + Tambah Barang
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {(editingBansosProgram.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white dark:bg-[#14161F] border border-black/30 rounded flex items-center gap-2"
                    >
                      {/* Nama Barang */}
                      <input
                        type="text"
                        placeholder="Nama Barang (contoh: 2 Jerigen Bensin)"
                        value={it.name}
                        onChange={(e) => handleUpdateBansosItem(idx, "name", e.target.value)}
                        className="input-field flex-1 text-xs font-bold py-1 px-2"
                      />

                      {/* Icon Select */}
                      <select
                        value={it.icon || "Gift"}
                        onChange={(e) => handleUpdateBansosItem(idx, "icon", e.target.value)}
                        className="input-field text-xs py-1 px-2 font-mono"
                      >
                        <option value="Fuel">⛽ Fuel (Bensin)</option>
                        <option value="Utensils">🥫 Utensils (Makanan)</option>
                        <option value="DollarSign">💵 Dollar (Uang)</option>
                        <option value="ShoppingBag">🛍️ Shopping (Sembako)</option>
                        <option value="Wheat">🌾 Wheat (Bibit)</option>
                        <option value="Package">📦 Package</option>
                        <option value="Sparkles">✨ Sparkles</option>
                        <option value="Gift">🎁 Gift</option>
                      </select>

                      {/* Keterangan */}
                      <input
                        type="text"
                        placeholder="Ket (opsional)"
                        value={it.desc || ""}
                        onChange={(e) => handleUpdateBansosItem(idx, "desc", e.target.value)}
                        className="input-field w-28 text-[11px] py-1 px-2"
                      />

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleRemoveBansosItem(idx)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Hapus barang ini"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {(editingBansosProgram.items || []).length === 0 && (
                    <p className="text-[11px] text-slate-500 italic text-center py-2">
                      Belum ada barang dalam paket. Klik "+ Tambah Barang" di atas.
                    </p>
                  )}
                </div>
              </div>

              {/* Pengaturan Pop-up Messenger */}
              <div className="p-3 bg-yellow-50/60 dark:bg-[#1E212B] border-2 border-black/40 rounded-lg flex flex-col gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={editingBansosProgram.showMessengerNotification !== false}
                    onChange={(e) =>
                      setEditingBansosProgram({
                        ...editingBansosProgram,
                        showMessengerNotification: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#059669] cursor-pointer"
                  />
                  <span>Tampilkan Pop-up Notifikasi Mengambang di Web</span>
                </label>

                {editingBansosProgram.showMessengerNotification !== false && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          Judul Notifikasi Pop-up
                        </label>
                        <input
                          type="text"
                          value={editingBansosProgram.messengerHeading || ""}
                          onChange={(e) =>
                            setEditingBansosProgram({
                              ...editingBansosProgram,
                              messengerHeading: e.target.value,
                            })
                          }
                          placeholder="Bansos Warga Sandy Shores"
                          className="input-field w-full text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          Teks Ringkasan Tombol Pill
                        </label>
                        <input
                          type="text"
                          value={editingBansosProgram.pillLabel || ""}
                          onChange={(e) =>
                            setEditingBansosProgram({
                              ...editingBansosProgram,
                              pillLabel: e.target.value,
                            })
                          }
                          placeholder="1 Makanan + $2.500 USD"
                          className="input-field w-full text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Pesan Teks Chat Pop-up
                      </label>
                      <textarea
                        rows={2}
                        value={editingBansosProgram.messengerMessage || ""}
                        onChange={(e) =>
                          setEditingBansosProgram({
                            ...editingBansosProgram,
                            messengerMessage: e.target.value,
                          })
                        }
                        placeholder="Tulis pesan pengumuman singkat yang ramah kepada warga..."
                        className="input-field w-full text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Syarat & Aturan */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-800 dark:text-slate-200 mb-1">
                  Syarat & Ketentuan Pengambilan (1 Baris Per Aturan)
                </label>
                <textarea
                  rows={3}
                  value={
                    Array.isArray(editingBansosProgram.rules)
                      ? editingBansosProgram.rules.join("\n")
                      : editingBansosProgram.rules || ""
                  }
                  onChange={(e) =>
                    setEditingBansosProgram({
                      ...editingBansosProgram,
                      rules: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  placeholder="Wajib mengunggah foto KTP IC yang jelas&#10;1 Citizen ID (CID) hanya berhak menerima 1 kali bantuan"
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingBansosProgram(null)}
                  className="btn py-2 px-4 bg-white dark:bg-[#1E222D] text-slate-800 dark:text-slate-200 border-2 border-black font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingBansosProgram}
                  className="btn py-2 px-5 bg-[#059669] hover:bg-[#047857] text-white font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] text-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} className="text-[#FACC15]" />
                  <span>{isSavingBansosProgram ? "Menyimpan Program..." : "Simpan Program Bansos"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BrutalistConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText || "Batal"}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
