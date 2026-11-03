import React, { useState, useEffect, useRef } from "react";
import { X, Lock, Save, RotateCcw, Plus, Trash2, Shield, Layout, FileText, Users, Camera, Compass, Target, LogOut, Inbox, Phone, MessageSquare, Tag, CheckCircle2, Maximize2, ExternalLink, ShieldCheck, ShieldAlert, KeyRound, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Users2, User, FileSpreadsheet, Archive, Search, Download, Eye, Ticket, CheckSquare, Square, DollarSign, Gift, Check, Clock, Calendar, Edit2, Settings2, SlidersHorizontal, Sparkles, CreditCard, Fuel, Utensils, Wheat, ShoppingBag, Package, TrendingDown, TrendingUp, Copy, HeartHandshake, ScanLine, Menu, Landmark, Wallet } from "lucide-react";
import { saveCloudData, resetCloudData, loadCloudData, loadSubmissions, updateSubmissions } from "../services/firebase";
import {
  subscribeMembersCloud,
  deleteMemberCloud,
  exportMembersToExcel,
  exportMembersToZip,
  updateMemberKasAndVoucherCloud,
  getMemberKasSubscription,
  getMemberVoucherSubscription,
  renewMemberKasSubscriptionCloud,
  cancelMemberKasSubscriptionCloud,
  claimMemberVoucherSubscriptionCloud,
  cancelMemberVoucherSubscriptionCloud,
  getCurrentMonthKey,
  getCurrentMonthLabel,
  getCurrentWeekKey,
  getCurrentWeekLabel,
  isMemberKasPaidCurrentMonth,
  isMemberVoucherReceivedCurrentWeek,
  resetAllMembersKasCloud,
  resetAllMembersVouchersCloud,
  KAS_SUBSCRIPTION_DAYS,
  VOUCHER_SUBSCRIPTION_DAYS,
  loadExternalJasraCloud,
  subscribeExternalJasraCloud,
  saveExternalJasraCloud,
  deleteExternalJasraCloud,
  exportExternalJasraToExcel,
} from "../services/memberService";
import { scanKtpImage, getGeminiApiKey, setGeminiApiKey } from "../utils/ktpOcr";
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
import { hashPassword, verifyPassword, getLockoutState, recordFailedAttempt, resetLockoutState, DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_PIN, DEFAULT_PIN_HASH, MAX_ATTEMPTS, LOCKOUT_DURATION_SECONDS } from "../utils/security";
import BrutalistDatePicker from "./BrutalistDatePicker";
import BrutalistConfirmModal from "./BrutalistConfirmModal";
import KasPaymentModal from "./KasPaymentModal";
import KasExpenseModal from "./KasExpenseModal";
import KasIncomeModal from "./KasIncomeModal";
import KasLedgerModal from "./KasLedgerModal";
import KasCopyModal from "./KasCopyModal";
import {
  loadKasLedgerCloud,
  subscribeKasLedger,
  getKasSummary,
  formatRupiah,
  formatCurrency,
  formatKasDate,
  exportKasLedgerToExcel,
  deleteKasTransactionCloud,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "../services/kasService";

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
  const [loginMode, setLoginMode] = useState("password"); // "password" (default) | "pin"
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState("identity");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Anti Brute-Force Rate Limiting Lockout State
  const [lockoutState, setLockoutState] = useState(() => getLockoutState());

  // Password Change State for Tab Keamanan
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isApplyingPassword, setIsApplyingPassword] = useState(false);

  // Gemini Vision AI API Key State for Tab Keamanan
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState(null);

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

  // Close mobile navigation drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

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

  // Snapshot of Last Saved Data for Dirty State Tracking
  const [lastSavedData, setLastSavedData] = useState(() => {
    if (!initialData) return null;
    try {
      return JSON.parse(JSON.stringify(initialData));
    } catch {
      return null;
    }
  });

  // Tabs that modify formData and require manual saving (Umum & Konten group)
  const CONTENT_CONFIG_TABS = ["identity", "hero", "about", "org", "gallery"];
  const isContentConfigTab = CONTENT_CONFIG_TABS.includes(activeTab);

  // Track if any content configuration fields have unsaved modifications
  const isDirty = React.useMemo(() => {
    if (!formData || !lastSavedData) return false;
    return JSON.stringify(formData) !== JSON.stringify(lastSavedData);
  }, [formData, lastSavedData]);

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

  // State Manajemen Kas, Pengeluaran & Ledger
  const [kasTransactions, setKasTransactions] = useState([]);
  const [isKasPaymentModalOpen, setIsKasPaymentModalOpen] = useState(false);
  const [selectedKasMember, setSelectedKasMember] = useState(null);
  const [isKasExpenseModalOpen, setIsKasExpenseModalOpen] = useState(false);
  const [isKasIncomeModalOpen, setIsKasIncomeModalOpen] = useState(false);
  const [isKasLedgerModalOpen, setIsKasLedgerModalOpen] = useState(false);
  const [isKasCopyModalOpen, setIsKasCopyModalOpen] = useState(false);
  const [kasFilterType, setKasFilterType] = useState("ALL"); // 'ALL' | 'INCOME' | 'EXPENSE'
  const [kasSearchQuery, setKasSearchQuery] = useState("");
  const [kasMemberSearchQuery, setKasMemberSearchQuery] = useState("");
  const [kasMemberStatusFilter, setKasMemberStatusFilter] = useState("all"); // 'all' | 'active' | 'expiring' | 'expired' | 'unpaid'

  // External Jasra Recipients State
  const [externalJasraList, setExternalJasraList] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_external_jasra_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [memberTabSubView, setMemberTabSubView] = useState("members"); // 'members' | 'external_jasra'
  const [editingExternalJasra, setEditingExternalJasra] = useState(null);
  const [isScanningExternalOcr, setIsScanningExternalOcr] = useState(false);
  const [externalJasraSearch, setExternalJasraSearch] = useState("");

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadSubmissions().then((data) => setSubmissions(data || []));
      const unsubscribeMembers = subscribeMembersCloud((list) => {
        setMembersList(list || []);
      });
      loadExternalJasraCloud().then((list) => {
        if (Array.isArray(list)) setExternalJasraList(list);
      });
      const unsubscribeExternalJasra = subscribeExternalJasraCloud((list) => {
        if (Array.isArray(list)) setExternalJasraList(list);
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
      loadKasLedgerCloud().then((list) => {
        if (Array.isArray(list)) setKasTransactions(list);
      });
      const unsubscribeKasLedger = subscribeKasLedger((list) => {
        if (Array.isArray(list)) setKasTransactions(list);
      });
      return () => {
        if (typeof unsubscribeMembers === "function") unsubscribeMembers();
        if (typeof unsubscribeExternalJasra === "function") unsubscribeExternalJasra();
        if (typeof unsubscribeEvents === "function") unsubscribeEvents();
        if (typeof unsubscribeEventsList === "function") unsubscribeEventsList();
        if (typeof unsubscribeBansos === "function") unsubscribeBansos();
        if (typeof unsubscribeBansosPrograms === "function") unsubscribeBansosPrograms();
        if (typeof unsubscribeKasLedger === "function") unsubscribeKasLedger();
      };
    }
  }, [isOpen, isAuthenticated]);

  // Handler: Catat Bayar / Tambah Masa Kas Anggota (+30 Hari)
  async function handleRenewKas(member, days = KAS_SUBSCRIPTION_DAYS) {
    try {
      const res = await renewMemberKasSubscriptionCloud(member, days);
      const sub = getMemberKasSubscription(res);
      onShowToast(
        `Kas $4.000 untuk ${member.fullName || "Anggota"} berhasil dicatat (+${days} hari, aktif s/d: ${sub.expiresAtFormatted}).`,
        "success"
      );
    } catch (err) {
      console.error("Gagal update kas:", err);
      onShowToast("Gagal memperbarui status kas anggota.", "error");
    }
  }

  // Handler: Reset Status Kas Anggota ke Belum Bayar
  function handleCancelKas(member) {
    setConfirmModal({
      isOpen: true,
      title: "Reset Status Kas Anggota?",
      message: `Reset status kas ${member.fullName || "Anggota"} menjadi Belum Bayar?`,
      confirmText: "Ya, Reset",
      cancelText: "Kembali",
      variant: "danger",
      onConfirm: async () => {
        try {
          await cancelMemberKasSubscriptionCloud(member.id);
          onShowToast(`Status kas ${member.fullName || "Anggota"} diubah menjadi Belum Bayar.`, "info");
        } catch (err) {
          console.error("Gagal reset kas:", err);
          onShowToast("Gagal me-reset status kas anggota.", "error");
        }
      },
    });
  }

  // Handler: Berikan / Perbarui Voucher Mingguan (7 Hari - 10T & 10P)
  async function handleClaimVoucher(member, days = VOUCHER_SUBSCRIPTION_DAYS) {
    try {
      const res = await claimMemberVoucherSubscriptionCloud(member, days);
      const sub = getMemberVoucherSubscription(res);
      onShowToast(
        `Voucher 10 Tritmen & 10 Pingsan untuk ${member.fullName || "Anggota"} aktif 7 hari (s/d ${sub.expiresAtFormatted}).`,
        "success"
      );
    } catch (err) {
      console.error("Gagal berikan voucher:", err);
      onShowToast("Gagal memberikan voucher anggota.", "error");
    }
  }

  // Handler: Reset Status Voucher Anggota
  function handleCancelVoucher(member) {
    setConfirmModal({
      isOpen: true,
      title: "Reset Voucher Anggota?",
      message: `Reset voucher mingguan untuk ${member.fullName || "Anggota"}? Status akan kembali menjadi Siap Diambil.`,
      confirmText: "Ya, Reset",
      cancelText: "Kembali",
      variant: "danger",
      onConfirm: async () => {
        try {
          await cancelMemberVoucherSubscriptionCloud(member.id);
          onShowToast(`Voucher ${member.fullName || "Anggota"} di-reset ke Siap Diambil.`, "info");
        } catch (err) {
          console.error("Gagal reset voucher:", err);
          onShowToast("Gagal me-reset voucher anggota.", "error");
        }
      },
    });
  }

  // Handler: Reset Kas Semua Anggota
  function handleConfirmResetAllKas() {
    setConfirmModal({
      isOpen: true,
      title: `Reset Status Kas Semua Anggota?`,
      message: `Apakah Anda yakin ingin me-reset status kas seluruh anggota menjadi Belum Bayar?`,
      confirmText: "Ya, Reset Kas Semua",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await resetAllMembersKasCloud(membersList);
          onShowToast(`Status Kas seluruh anggota berhasil di-reset ke Belum Bayar.`, "success");
        } catch (err) {
          console.error("Gagal reset kas massal:", err);
          onShowToast("Gagal me-reset status kas anggota.", "error");
        }
      },
    });
  }

  // Handler: Reset Voucher Semua Anggota
  function handleConfirmResetAllVouchers() {
    setConfirmModal({
      isOpen: true,
      title: `Reset Voucher Semua Anggota?`,
      message: `Apakah Anda yakin ingin me-reset voucher seluruh anggota menjadi Siap Diambil?`,
      confirmText: "Ya, Reset Voucher Semua",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await resetAllMembersVouchersCloud(membersList);
          onShowToast(`Voucher seluruh anggota berhasil di-reset ke Siap Diambil.`, "success");
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
  // HANDLERS: MANAJEMEN BUKU KAS & KEUANGAN LSM
  // =========================================================================

  function handleDeleteKasTx(tx) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Transaksi Kas",
      message: `Apakah Anda yakin ingin menghapus catatan transaksi "${tx.title}" (${formatCurrency(tx.amount)})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus Transaksi",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteKasTransactionCloud(tx.id);
          const updated = await loadKasLedgerCloud();
          if (Array.isArray(updated)) setKasTransactions(updated);
          onShowToast("Catatan transaksi kas berhasil dihapus.", "success");
        } catch (err) {
          console.error("Gagal menghapus transaksi kas:", err);
          onShowToast("Gagal menghapus transaksi: " + (err.message || "Error"), "error");
        }
      },
    });
  }

  function handleExportKasExcel() {
    try {
      if (kasTransactions.length === 0) {
        onShowToast("Belum ada data transaksi kas untuk diekspor.", "warning");
        return;
      }
      const ok = exportKasLedgerToExcel(kasTransactions, kasSummary);
      if (ok) {
        onShowToast(`Buku kas (${kasTransactions.length} transaksi) berhasil diekspor ke Excel.`, "success");
      } else {
        onShowToast("Gagal mengekspor buku kas ke Excel.", "error");
      }
    } catch (err) {
      console.error("Gagal ekspor kas ke Excel:", err);
      onShowToast("Gagal ekspor ke Excel.", "error");
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

  // =========================================================================
  // HANDLER: PENERIMA MANFAAT JASRA LUAR ANGGOTA (NON-MEMBER)
  // =========================================================================

  async function handleExternalKtpUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onShowToast("File harus berupa gambar (JPG, PNG, WebP).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast("Ukuran gambar maksimal 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result;
      if (!dataUrl) return;

      setEditingExternalJasra((prev) => ({
        ...prev,
        ktpPhoto: dataUrl,
      }));

      // Jalankan auto OCR scan untuk mendeteksi Nama & Citizen ID
      setIsScanningExternalOcr(true);
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
          setEditingExternalJasra((prev) => ({
            ...prev,
            fullName: detectedName ? detectedName.toUpperCase() : (prev?.fullName || ""),
            citizenId: detectedCid ? detectedCid.toUpperCase() : (prev?.citizenId || ""),
            cidCandidates: fields.citizenIdCandidates || [],
          }));
          onShowToast(
            `KTP berhasil dipindai! Terbaca: ${detectedName || "Nama"} (${detectedCid || "CID"})`,
            "success"
          );
        } else {
          onShowToast("Foto KTP diunggah. Silakan lengkapi Nama & CID.", "info");
        }
      } catch (err) {
        console.warn("OCR scan notice:", err);
        onShowToast("Foto KTP diunggah. Silakan periksa kembali Nama & CID.", "info");
      } finally {
        setIsScanningExternalOcr(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveExternalJasra(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingExternalJasra) return;

    if (!editingExternalJasra.fullName?.trim() && !editingExternalJasra.citizenId?.trim()) {
      onShowToast("Nama lengkap atau Citizen ID wajib diisi.", "error");
      return;
    }

    try {
      await saveExternalJasraCloud(editingExternalJasra);
      onShowToast(
        `Data Jasra untuk ${editingExternalJasra.fullName || "Warga"} berhasil disimpan!`,
        "success"
      );
      setEditingExternalJasra(null);
    } catch (err) {
      console.error("Gagal simpan data jasra luar:", err);
      onShowToast("Gagal menyimpan data penerima Jasra.", "error");
    }
  }

  function handleDeleteExternalJasra(id, name) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Data Jasra Luar Anggota?",
      message: `Hapus pencatatan manfaat Jasra untuk ${name || "warga ini"} dari sistem?`,
      confirmText: "Ya, Hapus",
      cancelText: "Kembali",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteExternalJasraCloud(id);
          onShowToast(`Data Jasra ${name || ""} berhasil dihapus.`, "info");
        } catch (err) {
          console.error("Gagal menghapus data:", err);
          onShowToast("Gagal menghapus data.", "error");
        }
      },
    });
  }

  function handleExportExternalJasraExcel() {
    if (!externalJasraList || externalJasraList.length === 0) {
      onShowToast("Tidak ada data penerima Jasra luar untuk diunduh.", "warning");
      return;
    }
    try {
      const ok = exportExternalJasraToExcel(externalJasraList);
      if (ok) {
        onShowToast("File Excel penerima Jasra luar anggota berhasil diunduh!", "success");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Gagal mengekspor data Excel.", "error");
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
      setLastSavedData(JSON.parse(JSON.stringify(cloned)));
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

      if (
        savedHash.toLowerCase() === targetHash.toLowerCase() ||
        savedHash === DEFAULT_ADMIN_HASH ||
        savedHash === DEFAULT_PIN_HASH
      ) {
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
      onShowToast(`Sistem terkunci sementara! Tunggu ${currentLockout.remainingSeconds} detik lagi.`, "error");
      return;
    }

    const input = passwordInput.trim();
    if (!input) {
      onShowToast("Masukkan password terlebih dahulu!", "error");
      return;
    }

    let credentialSource = initialData;
    // Selalu ambil fresh data dari Firestore untuk memastikan password terbaru selalu valid
    try {
      const fresh = await loadCloudData();
      if (fresh) credentialSource = fresh;
    } catch (err) {
      console.warn("Could not fetch fresh cloud data for login verification:", err);
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
      onShowToast("Password baru berhasil disimpan ke Database! Seluruh rekan admin bisa login dengan password ini.", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyimpan password ke database: " + (err?.message || ""), "error");
    } finally {
      setIsApplyingPassword(false);
    }
  }

  // Handle reset password to default "@adminpps22h6"
  function handleResetPasswordToDefault() {
    setConfirmModal({
      isOpen: true,
      title: "Reset Password ke Default?",
      message: "Kode akses admin akan dikembalikan ke password default: '@adminpps22h6'. Anda dan seluruh rekan admin bisa langsung masuk menggunakan password tersebut.",
      confirmText: "Ya, Kembalikan ke @adminpps22h6",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        setIsApplyingPassword(true);
        try {
          const updatedFormData = {
            ...formData,
            adminPassHash: DEFAULT_ADMIN_HASH,
          };
          delete updatedFormData.adminPass;
          await saveCloudData(updatedFormData);
          setFormData(updatedFormData);
          onDataSaved(updatedFormData);
          if (localStorage.getItem(ADMIN_STORAGE_KEY)) {
            localStorage.setItem(ADMIN_STORAGE_KEY, DEFAULT_ADMIN_HASH);
          } else {
            sessionStorage.setItem(ADMIN_STORAGE_KEY, DEFAULT_ADMIN_HASH);
          }
          setShowPasswordForm(false);
          onShowToast("Password admin berhasil dikembalikan ke default (@adminpps22h6)", "success");
        } catch (err) {
          console.error("Gagal reset password:", err);
          onShowToast("Gagal mengembalikan password ke default.", "error");
        } finally {
          setIsApplyingPassword(false);
        }
      },
    });
  }

  // Handle reset PIN to default "114123"
  function handleResetPinToDefault() {
    setConfirmModal({
      isOpen: true,
      title: "Reset ke PIN 114123?",
      message: "Kode akses admin akan diatur ke 6-digit PIN default: '114123'. Rekan admin dapat langsung masuk menggunakan PIN tersebut dari HP maupun PC.",
      confirmText: "Ya, Atur PIN ke 114123",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        setIsApplyingPassword(true);
        try {
          const updatedFormData = {
            ...formData,
            adminPassHash: DEFAULT_PIN_HASH,
          };
          delete updatedFormData.adminPass;
          await saveCloudData(updatedFormData);
          setFormData(updatedFormData);
          onDataSaved(updatedFormData);
          if (localStorage.getItem(ADMIN_STORAGE_KEY)) {
            localStorage.setItem(ADMIN_STORAGE_KEY, DEFAULT_PIN_HASH);
          } else {
            sessionStorage.setItem(ADMIN_STORAGE_KEY, DEFAULT_PIN_HASH);
          }
          setShowPasswordForm(false);
          onShowToast("PIN admin berhasil diatur ke: 114123", "success");
        } catch (err) {
          console.error("Gagal reset PIN:", err);
          onShowToast("Gagal mengatur PIN ke default.", "error");
        } finally {
          setIsApplyingPassword(false);
        }
      },
    });
  }

  // Handle Save Gemini API Key
  function handleSaveGeminiKey() {
    try {
      setGeminiApiKey(geminiKeyInput.trim());
      onShowToast("Gemini API Key berhasil disimpan!", "success");
      setGeminiTestStatus(null);
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyimpan API Key: " + err.message, "error");
    }
  }

  // Handle Test Gemini API Key
  async function handleTestGeminiKey() {
    const key = (geminiKeyInput || "").trim();
    if (!key) {
      onShowToast("Masukkan Gemini API Key terlebih dahulu!", "error");
      return;
    }
    setIsTestingGemini(true);
    setGeminiTestStatus(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || "Key tidak valid");
      }
      setGeminiTestStatus("success");
      onShowToast("Koneksi Gemini Vision AI Berhasil! KTP scan kini 99.9% akurat.", "success");
    } catch (err) {
      setGeminiTestStatus("error");
      onShowToast("Uji koneksi gagal: " + err.message, "error");
    } finally {
      setIsTestingGemini(false);
    }
  }

  // Image Compressor via Canvas
  function compressImage(file, callback, maxSize = 720, quality = 0.55) {
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
    }, 720, 0.55);
  }

  function handleAddGalleryPhotoUrl(index) {
    const rawUrl = window.prompt("Tempel URL gambar (misal link Discord, Imgur, PostImages, dll) untuk kualitas 100% tanpa kompresi:");
    if (!rawUrl || !rawUrl.trim()) return;
    const cleanUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      onShowToast("URL harus diawali dengan http:// atau https://", "error");
      return;
    }
    setFormData((prev) => {
      const newGal = [...prev.gallery];
      const item = { ...newGal[index] };
      const existingPhotos = Array.isArray(item.photos) && item.photos.length > 0
        ? [...item.photos]
        : item.photo
        ? [item.photo]
        : [];
      existingPhotos.push(cleanUrl);
      item.photos = existingPhotos;
      item.photo = existingPhotos[0];
      newGal[index] = item;
      return { ...prev, gallery: newGal };
    });
    onShowToast("Link foto HD (tanpa kompresi) berhasil ditambahkan!", "success");
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
      const savedSnapshot = JSON.parse(JSON.stringify(formData));
      setLastSavedData(savedSnapshot);
      onDataSaved(savedSnapshot);
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
          setLastSavedData(JSON.parse(JSON.stringify(resetData)));
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

  const currentMonthLabel = getCurrentMonthLabel();
  const currentWeekLabel = getCurrentWeekLabel();

  // Subscription-based stats aggregation (must be initialized before tabGroups)
  const kasSubs = membersList.map((m) => ({
    member: m,
    kas: getMemberKasSubscription(m),
    voucher: getMemberVoucherSubscription(m),
  }));
  const totalKasActiveCount = kasSubs.filter((item) => item.kas.isActive).length;
  const totalKasExpiringCount = kasSubs.filter((item) => item.kas.isExpiringSoon).length;
  const totalKasExpiredCount = kasSubs.filter((item) => item.kas.isExpired).length;
  const totalKasRupiah = totalKasActiveCount * 4000;
  const kasSummary = getKasSummary(kasTransactions, totalKasRupiah);

  const tabGroups = [
    {
      group: "Umum & Konten",
      shortLabel: "Umum",
      icon: Layout,
      badgeCount: null,
      tabs: [
        { id: "identity", label: "Brand & Menu", icon: Layout },
        { id: "hero", label: "Beranda & 4 Pilar", icon: Compass },
        { id: "about", label: "Tentang & Visi", icon: FileText },
        { id: "org", label: "Pengurus", icon: Users },
        { id: "gallery", label: "Galeri Foto", icon: Camera },
      ],
    },
    {
      group: "Warga & Keuangan",
      shortLabel: "Warga",
      icon: Users2,
      badgeCount: (submissions.length > 0 || membersList.length > 0) ? (submissions.length + membersList.length) : null,
      tabs: [
        { id: "submissions", label: `Kotak Masuk (${submissions.length})`, icon: Inbox },
        { id: "members_db", label: `Database Anggota (${membersList.length})`, icon: Users2 },
        { id: "member_kas", label: "Catat Uang Kas", icon: DollarSign },
        { id: "kas_db", label: "Keuangan", icon: Landmark },
      ],
    },
    {
      group: "Event & Bansos",
      shortLabel: "Event",
      icon: Ticket,
      badgeCount: (eventsList.length > 0 || bansosClaims.length > 0) ? (eventsList.length + bansosClaims.length) : null,
      tabs: [
        { id: "event_db", label: `Kelola Event (${eventsList.length})`, icon: Ticket },
        { id: "bansos_db", label: `Bansos Warga (${bansosClaims.length})`, icon: Gift },
      ],
    },
    {
      group: "Sistem & Keamanan",
      shortLabel: "Sistem",
      icon: Shield,
      badgeCount: null,
      tabs: [
        { id: "security", label: "Keamanan", icon: Shield },
      ],
    },
  ];

  const tabs = tabGroups.flatMap((g) => g.tabs);
  const activeGroup = tabGroups.find((g) => g.tabs.some((t) => t.id === activeTab)) || tabGroups[0];
  const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  const filteredKasTransactions = kasTransactions.filter((tx) => {
    const txTypeUpper = (tx.type || "").toUpperCase();
    const txWalletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
    const isDarren = tx.wallet === "Darren" || txWalletText.includes("darren");
    const isOita = !isDarren;

    if (kasFilterType === "INCOME" && txTypeUpper !== "INCOME") return false;
    if (kasFilterType === "EXPENSE" && txTypeUpper !== "EXPENSE") return false;
    if (kasFilterType === "OITA" && !isOita) return false;
    if (kasFilterType === "DARREN" && !isDarren) return false;

    if (kasSearchQuery.trim()) {
      const q = kasSearchQuery.toLowerCase();
      const title = (tx.title || "").toLowerCase();
      const member = (tx.memberName || "").toLowerCase();
      const cid = (tx.memberCid || "").toLowerCase();
      const by = (tx.recordedBy || "").toLowerCase();
      const resp = (tx.responsible || "").toLowerCase();
      const walletStr = (tx.wallet || "").toLowerCase();
      const notes = (tx.notes || "").toLowerCase();
      const cat = (tx.category || "").toLowerCase();
      if (
        !title.includes(q) &&
        !member.includes(q) &&
        !cid.includes(q) &&
        !by.includes(q) &&
        !resp.includes(q) &&
        !walletStr.includes(q) &&
        !notes.includes(q) &&
        !cat.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const totalVoucherActiveCount = kasSubs.filter((item) => item.voucher.isActive).length;
  const totalVoucherReadyCount = kasSubs.filter((item) => !item.voucher.isActive).length;

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

    // 2. Filter Kas Subscription Status
    const kasSub = getMemberKasSubscription(m);
    if (filterKas === "active" && !kasSub.isActive) return false;
    if (filterKas === "unpaid" && kasSub.isActive) return false;

    // 3. Filter Voucher Status
    const voucherSub = getMemberVoucherSubscription(m);
    if (filterVoucher === "active" && !voucherSub.isActive) return false;
    if (filterVoucher === "ready" && voucherSub.isActive) return false;

    return true;
  });

  const filteredKasMembers = membersList.filter((m) => {
    if (kasMemberSearchQuery.trim()) {
      const q = kasMemberSearchQuery.toLowerCase();
      const name = (m.fullName || "").toLowerCase();
      const ic = (m.icNumber || m.citizenId || "").toLowerCase();
      const phone = (m.phone || "").toLowerCase();
      if (!name.includes(q) && !ic.includes(q) && !phone.includes(q)) {
        return false;
      }
    }
    const kasSub = getMemberKasSubscription(m);
    if (kasMemberStatusFilter === "active" && !kasSub.isActive) return false;
    if (kasMemberStatusFilter === "unpaid" && kasSub.isActive) return false;
    return true;
  });

  const filteredExternalJasra = externalJasraList.filter((item) => {
    if (!externalJasraSearch.trim()) return true;
    const q = externalJasraSearch.toLowerCase().trim();
    const name = (item.fullName || "").toLowerCase();
    const cid = (item.citizenId || "").toLowerCase();
    const phone = (item.phone || "").toLowerCase();
    const notes = (item.notes || "").toLowerCase();
    return name.includes(q) || cid.includes(q) || phone.includes(q) || notes.includes(q);
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
      <header className="shrink-0 flex items-center justify-between px-3.5 sm:px-8 py-2.5 sm:py-3.5 border-b-2 border-black dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1A1D26] shadow-[0_2px_0px_#000]/10">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#DC2626] border-2 border-black flex items-center justify-center text-white shadow-[1.5px_1.5px_0px_#000] shrink-0">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-xs sm:text-base uppercase tracking-tight text-slate-950 dark:text-slate-100 truncate">
                <span className="sm:hidden">Admin Panel PPS</span>
                <span className="hidden sm:inline">Panel Kontrol Administrator</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-400 shrink-0">
                LSM PPS SANDY SHORES
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud Terhubung
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono hidden md:block">
              Sistem Manajemen Konten & Verifikasi Pengajuan Warga
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari sesi admin"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-heading font-black bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded border-2 border-black dark:border-rose-500 shadow-[1.5px_1.5px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <LogOut size={13} className="text-rose-600 dark:text-rose-300" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-2.5 sm:px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-900 dark:text-red-200 text-xs font-heading font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer rounded"
            title="Tutup Panel Admin dan kembali ke website utama"
          >
            <span className="hidden sm:inline">Tutup Panel</span>
            <span className="sm:hidden">Tutup</span>
            <X size={14} />
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
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {loginMode === "pin" ? "Kode PIN Admin" : "Password Admin"}
                    </label>
                    <input
                      type="password"
                      inputMode={loginMode === "pin" ? "numeric" : "text"}
                      pattern={loginMode === "pin" ? "[0-9]*" : undefined}
                      value={passwordInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (loginMode === "pin") {
                          setPasswordInput(val.replace(/\D/g, "").slice(0, 10));
                        } else {
                          setPasswordInput(val);
                        }
                      }}
                      placeholder={
                        loginMode === "pin"
                          ? "Masukkan 6-digit PIN..."
                          : "Masukkan password admin..."
                      }
                      disabled={lockoutState.isLocked}
                      autoFocus
                      className="input-field text-center font-mono text-sm tracking-widest bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-slate-800"
                    />
                  </div>

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

                  {/* Toggle Link below: Login menggunakan PIN / Login menggunakan Password */}
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode(loginMode === "pin" ? "password" : "pin");
                        setPasswordInput("");
                      }}
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:underline flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded transition-colors"
                    >
                      {loginMode === "pin" ? (
                        <>
                          <KeyRound size={13} className="text-[#DC2626] dark:text-[#FACC15]" />
                          <span>Login menggunakan Password</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={13} className="text-[#DC2626] dark:text-[#FACC15]" />
                          <span>Login menggunakan PIN</span>
                        </>
                      )}
                    </button>
                  </div>
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

                    {/* Grouped Sidebar Navigation */}
                    <div className="space-y-3.5">
                      {tabGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                          {/* Group Section Header */}
                          <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5">
                            <span className="text-[10px] font-heading font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                              {group.group}
                            </span>
                            <div className="flex-1 h-[1.5px] bg-black/10 dark:bg-white/10" />
                          </div>

                          {/* Group Tab Buttons */}
                          <div className="space-y-1">
                            {group.tabs.map((tab) => {
                              const Icon = tab.icon;
                              const isActive = activeTab === tab.id;
                              const hasCount = tab.label.includes("(");
                              const countMatch = hasCount ? tab.label.match(/\(([^)]+)\)/) : null;
                              const countText = countMatch ? countMatch[1] : null;
                              const cleanTitle = tab.label.split(" (")[0];

                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setActiveTab(tab.id)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 border-black dark:border-[#475569] font-heading font-black text-xs transition-all text-left cursor-pointer ${
                                    isActive
                                      ? "bg-[#FACC15] text-[#111827] shadow-[3px_3px_0px_#000] -translate-y-0.5 border-black ring-1 ring-black/20"
                                      : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 shadow-[1.5px_1.5px_0px_#000]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Icon size={15} className={isActive ? "text-[#DC2626]" : "text-slate-600 dark:text-slate-400"} />
                                    <span className="truncate">{cleanTitle}</span>
                                  </div>
                                  {Boolean(countText) && (
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
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Footer Status */}
                  <div className="p-3 border-t-2 border-black/10 dark:border-white/10 text-[10px] font-mono text-slate-500 flex items-center justify-between bg-black/5 dark:bg-white/5">
                    <span>LSM Sandy Shores</span>
                    <span className="font-bold text-[#DC2626] dark:text-[#FACC15]">Admin CMS</span>
                  </div>
                </aside>

                {/* RIGHT WORKSPACE AREA (Mobile Full-Width, Desktop Flex-1) */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  {/* MOBILE NAVIGATION (< md): Clean, Single Compact Bar */}
                  <div className="md:hidden shrink-0 bg-[#FFFDF9] dark:bg-[#161822] border-b-2 border-black dark:border-[#475569]">
                    {/* Top Line: Active Section Context & Quick Menu Trigger */}
                    <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-0.5 px-1 -ml-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer"
                        title="Buka menu navigasi"
                      >
                        <div className="w-7 h-7 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-[#111827] shadow-[1px_1px_0px_#000] shrink-0">
                          {React.createElement(activeTabObj.icon, { size: 14, className: "text-[#DC2626]" })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                            {activeGroup.group}
                          </div>
                          <div className="text-xs font-heading font-black text-slate-900 dark:text-slate-100 flex items-center gap-1 mt-0.5 truncate">
                            <span className="truncate">{activeTabObj.label.split(" (")[0]}</span>
                            <ChevronDown size={13} className="text-slate-400 shrink-0" />
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="px-2.5 py-1.5 bg-[#FACC15] hover:bg-amber-400 text-slate-950 text-xs font-heading font-black rounded border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 shrink-0 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                        title="Buka semua menu navigasi"
                      >
                        <Menu size={13} />
                        <span>Menu</span>
                      </button>
                    </div>

                    {/* Bottom Line: Sibling Tabs in Active Category (Smooth Touch Horizontal Scroll) */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar scroll-smooth"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {activeGroup.tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const hasCount = tab.label.includes("(");
                        const countMatch = hasCount ? tab.label.match(/\(([^)]+)\)/) : null;
                        const countText = countMatch ? countMatch[1] : null;
                        const cleanTitle = tab.label.split(" (")[0];

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-md shrink-0 border-2 font-heading font-black transition-all cursor-pointer min-h-[34px] ${
                              isActive
                                ? "bg-slate-900 text-white border-black shadow-[1.5px_1.5px_0px_#000] -translate-y-0.5"
                                : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/20 dark:border-[#475569] hover:bg-slate-100"
                            }`}
                          >
                            <Icon size={12} className={isActive ? "text-[#FACC15]" : "text-slate-500"} />
                            <span className="whitespace-nowrap">{cleanTitle}</span>
                            {Boolean(countText) && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  isActive
                                    ? "bg-[#FACC15] text-slate-950"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-black/10"
                                }`}
                              >
                                {countText}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <label className="cursor-pointer text-[10px] font-heading font-black py-1 px-2 rounded bg-[#FACC15] text-[#111827] border-2 border-black shadow-[1px_1px_0px_#000] hover:bg-[#EAB308] flex items-center gap-1 active:translate-x-0.5">
                                <Plus size={12} className="text-[#DC2626]" />
                                <span>+ Unggah File</span>
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
                              <button
                                type="button"
                                onClick={() => handleAddGalleryPhotoUrl(idx)}
                                className="cursor-pointer text-[10px] font-heading font-black py-1 px-2 rounded bg-white dark:bg-[#161822] text-[#111827] dark:text-slate-200 border-2 border-black dark:border-slate-500 shadow-[1px_1px_0px_#000] hover:bg-slate-100 flex items-center gap-1 active:translate-x-0.5"
                                title="Tempel link URL gambar langsung (Discord / Imgur / Web) dengan kualitas 100% tanpa kompresi"
                              >
                                <ExternalLink size={12} className="text-blue-600" />
                                <span>+ Link HD (Tanpa Kompresi)</span>
                              </button>
                            </div>
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

                    {/* Export Actions: Excel & ZIP & Add External Jasra */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExternalJasra({
                            id: "",
                            fullName: "",
                            citizenId: "",
                            phone: "",
                            ktpPhoto: "",
                            voucherDetail: { treatment: 10, pingsan: 10 },
                            packageLabel: "10 Tritmen • 10 Pingsan",
                            dateGiven: new Date().toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }),
                            notes: "",
                            status: "ACTIVE",
                          });
                        }}
                        className="btn py-2 px-3.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        title="Catat penerima voucher Jasra dari warga umum (luar anggota paguyuban)"
                      >
                        <HeartHandshake size={15} />
                        <span>+ Catat Jasra Luar Anggota</span>
                      </button>

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

                  {/* Stats Ringkasan Kas (Langganan 30 Hari) & Voucher (7 Hari) */}
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
                              Iuran Kas Anggota ($4.000/bln)
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <strong className="text-base font-mono font-black text-emerald-800 dark:text-emerald-300">
                                {totalKasActiveCount} Sudah Bayar
                              </strong>
                              <span className="text-[10px] font-mono text-slate-500">
                                / {membersList.length - totalKasActiveCount} Belum Bayar
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("kas_db")}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold border border-black shadow-[1px_1px_0px_#000] cursor-pointer flex items-center gap-1"
                          title="Buka tab Keuangan & Kas LSM"
                        >
                          <DollarSign size={12} />
                          <span>Keuangan →</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200 dark:border-emerald-800/40 text-[10px] font-mono">
                        <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                          Terkumpul: +{formatCurrency(totalKasRupiah)}
                        </span>
                        <button
                          type="button"
                          onClick={handleConfirmResetAllKas}
                          disabled={totalKasActiveCount === 0}
                          className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold border border-black/30 disabled:opacity-40 cursor-pointer text-[9px]"
                          title="Reset status kas seluruh anggota ke Belum Bayar"
                        >
                          Reset Status
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
                              Voucher Jasra Mingguan
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <strong className="text-base font-mono font-black text-amber-900 dark:text-[#FACC15]">
                                {totalVoucherActiveCount} Aktif
                              </strong>
                              <span className="text-[10px] font-mono text-amber-700">
                                ({totalVoucherReadyCount} Siap Ambil)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-amber-200 dark:border-amber-800/40 text-[10px] font-mono">
                        <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1 font-bold" title="Jatah 7 hari: 10 Tritmen + 10 Pingsan">
                          <Clock size={11} /> 10 Tritmen + 10 Pingsan (7 Hari)
                        </span>
                        <button
                          type="button"
                          onClick={handleConfirmResetAllVouchers}
                          disabled={totalVoucherActiveCount === 0}
                          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-black shadow-[1px_1px_0px_#000] disabled:opacity-40 cursor-pointer text-[10px]"
                          title="Reset jatah voucher seluruh anggota ke Siap Ambil"
                        >
                          Reset Voucher
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Navigation Switcher: Anggota Paguyuban vs Penerima Jasra Luar Anggota */}
                  <div className="flex items-center gap-2 border-b-2 border-black/20 dark:border-white/10 pb-2">
                    <button
                      type="button"
                      onClick={() => setMemberTabSubView("members")}
                      className={`px-4 py-2 rounded-lg text-xs font-heading font-black border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
                        memberTabSubView === "members"
                          ? "bg-slate-900 text-white shadow-[2px_2px_0px_#000] dark:bg-[#FACC15] dark:text-slate-950"
                          : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Users size={14} />
                      <span>Anggota Paguyuban ({membersList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberTabSubView("external_jasra")}
                      className={`px-4 py-2 rounded-lg text-xs font-heading font-black border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
                        memberTabSubView === "external_jasra"
                          ? "bg-slate-900 text-white shadow-[2px_2px_0px_#000] dark:bg-[#FACC15] dark:text-slate-950"
                          : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <HeartHandshake size={14} />
                      <span>Penerima Jasra Luar Anggota ({externalJasraList.length})</span>
                    </button>
                  </div>

                  {memberTabSubView === "members" ? (
                    <>
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
                        onClick={() => setFilterKas("active")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterKas === "active"
                            ? "bg-emerald-600 text-white border-black"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                        }`}
                      >
                        ✓ Sudah Bayar ({totalKasActiveCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterKas("unpaid")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterKas === "unpaid"
                            ? "bg-rose-600 text-white border-black"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                        }`}
                      >
                        ✕ Belum Bayar ({membersList.length - totalKasActiveCount})
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
                        onClick={() => setFilterVoucher("active")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterVoucher === "active"
                            ? "bg-amber-500 text-slate-950 border-black font-black"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-400"
                        }`}
                      >
                        ✓ Aktif ({totalVoucherActiveCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterVoucher("ready")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          filterVoucher === "ready"
                            ? "bg-slate-600 text-white border-black"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        Siap Ambil ({totalVoucherReadyCount})
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

                            {/* Admin Controls: Status Kas (30 Hari) & Voucher Jasra (7 Hari) */}
                            <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-[#14161F] border-2 border-black/15 dark:border-white/10">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <DollarSign size={12} className="text-emerald-600" /> STATUS KAS & VOUCHER
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-400">
                                  PERIODE AKTIF
                                </span>
                              </div>

                              {/* Box 1: Status Kas Ringkas (Aksi pembayaran dipindahkan ke tab Catat Uang Kas) */}
                              {(() => {
                                const kasSub = getMemberKasSubscription(member);
                                return (
                                  <div className={`p-2 rounded border-2 transition-all flex items-center justify-between gap-2 ${
                                    kasSub.isActive
                                      ? kasSub.isExpiringSoon
                                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100"
                                        : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-950 dark:text-emerald-100"
                                      : kasSub.isExpired
                                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100"
                                      : "bg-white dark:bg-[#1F222C] border-black/20 dark:border-white/20 text-slate-800 dark:text-slate-200"
                                  }`}>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                                        kasSub.isActive
                                          ? kasSub.isExpiringSoon ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                                          : kasSub.isExpired ? "bg-rose-500" : "bg-slate-400"
                                      }`} />
                                      <span className="font-heading font-black text-[11px] uppercase truncate">
                                        Kas:
                                      </span>
                                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${
                                        kasSub.isActive
                                          ? "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-400"
                                          : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                                      }`}>
                                        {kasSub.isActive ? "SUDAH BAYAR" : "BELUM BAYAR"}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedKasMember(member);
                                        setActiveTab("member_kas");
                                      }}
                                      className="text-[10px] font-heading font-black text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                                      title="Kelola pembayaran kas anggota ini di tab Catat Uang Kas"
                                    >
                                      <DollarSign size={11} />
                                      <span>Kelola Kas &rarr;</span>
                                    </button>
                                  </div>
                                );
                              })()}

                              {/* Box 2: Voucher Tritmen & Pingsan (7 Hari) */}
                              {(() => {
                                const voucherSub = getMemberVoucherSubscription(member);
                                return (
                                  <div className={`p-2 rounded border-2 transition-all ${
                                    voucherSub.isActive
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100"
                                      : "bg-white dark:bg-[#1F222C] border-black/20 dark:border-white/20 text-slate-800 dark:text-slate-200"
                                  }`}>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                          voucherSub.isActive ? "bg-amber-500" : "bg-slate-400"
                                        }`} />
                                        <span className="font-heading font-black text-[11px] uppercase truncate">
                                          VOUCHER JASRA (10T • 10P)
                                        </span>
                                      </div>
                                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${
                                        voucherSub.isActive
                                          ? "bg-[#FACC15] text-slate-950 border-amber-500"
                                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300"
                                      }`}>
                                        {voucherSub.isActive ? `${voucherSub.daysRemaining} HARI LAGI` : "SIAP DIAMBIL"}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-2">
                                      <span>{voucherSub.isActive ? "Berlaku s/d:" : "Jatah Mingguan:"}</span>
                                      <strong className="text-slate-900 dark:text-slate-100">
                                        {voucherSub.isActive ? voucherSub.expiresAtFormatted : "10 Tritmen • 10 Pingsan"}
                                      </strong>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleClaimVoucher(member)}
                                        className="flex-1 py-1 px-2 rounded bg-[#FACC15] hover:bg-amber-400 text-slate-950 font-heading font-black text-[10px] border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center gap-1 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                                        title="Berikan atau perpanjang voucher 7 hari (10 Tritmen + 10 Pingsan)"
                                      >
                                        <Gift size={11} className="text-[#DC2626]" />
                                        <span>{voucherSub.isActive ? "Perpanjang (+7 Hari)" : "Beri Voucher (7 Hari)"}</span>
                                      </button>
                                      {voucherSub.isActive && (
                                        <button
                                          type="button"
                                          onClick={() => handleCancelVoucher(member)}
                                          className="py-1 px-2 rounded bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-700 hover:text-rose-700 dark:text-slate-300 font-mono text-[10px] border border-black/30 cursor-pointer"
                                          title="Reset voucher anggota ini ke Siap Diambil"
                                        >
                                          Reset
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
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
                    </>
                  ) : (
                    /* Sub-View: Penerima Jasra Luar Anggota */
                    <div className="flex flex-col gap-4">
                      {/* Search & Actions Bar for External Jasra */}
                      <div className="card-brutal p-3.5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:max-w-md">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari nama IC, Citizen ID, no HP, atau catatan..."
                            value={externalJasraSearch}
                            onChange={(e) => setExternalJasraSearch(e.target.value)}
                            className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                          {externalJasraSearch && (
                            <button
                              type="button"
                              onClick={() => setExternalJasraSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                            Menampilkan <span className="text-[#DC2626] dark:text-[#FACC15]">{filteredExternalJasra.length}</span> dari {externalJasraList.length} warga
                          </span>

                          <button
                            type="button"
                            onClick={handleExportExternalJasraExcel}
                            disabled={externalJasraList.length === 0}
                            className="btn py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
                            title="Unduh daftar penerima Jasra luar anggota ke Excel"
                          >
                            <FileSpreadsheet size={13} />
                            <span>Unduh Excel</span>
                          </button>
                        </div>
                      </div>

                      {/* Cards Grid External Jasra */}
                      {filteredExternalJasra.length === 0 ? (
                        <div className="card-brutal p-10 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] text-center flex flex-col items-center justify-center gap-3">
                          <HeartHandshake size={38} className="text-slate-300 dark:text-slate-600" />
                          <div>
                            <p className="font-heading font-black text-sm text-slate-700 dark:text-slate-300">
                              {externalJasraSearch ? "Tidak ditemukan data yang sesuai pencarian" : "Belum ada warga luar anggota yang dicatat"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                              Jika ada warga umum / non-anggota yang Anda berikan voucher Jasra, klik tombol di bawah untuk mencatatnya langsung dari foto KTP IC mereka.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExternalJasra({
                                id: "",
                                fullName: "",
                                citizenId: "",
                                phone: "",
                                ktpPhoto: "",
                                voucherDetail: { treatment: 10, pingsan: 10 },
                                packageLabel: "10 Tritmen • 10 Pingsan",
                                dateGiven: new Date().toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }),
                                notes: "",
                                status: "ACTIVE",
                              });
                            }}
                            className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Plus size={14} />
                            <span>+ Catat Jasra Luar Anggota</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                          {filteredExternalJasra.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
                            >
                              <div className="flex flex-col gap-2.5">
                                {/* Header: Avatar/KTP Thumb + Name + Badge */}
                                <div className="flex items-center gap-3">
                                  {item.ktpPhoto ? (
                                    <div
                                      onClick={() =>
                                        setPreviewKtp({
                                          image: item.ktpPhoto,
                                          name: item.fullName || "Warga",
                                          citizenId: item.citizenId || "",
                                        })
                                      }
                                      className="w-12 h-12 rounded border-2 border-black overflow-hidden bg-slate-100 shrink-0 cursor-pointer shadow-xs hover:opacity-85"
                                      title="Klik untuk melihat foto KTP"
                                    >
                                      <img
                                        src={item.ktpPhoto}
                                        alt={item.fullName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded border-2 border-black bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0 text-blue-700 dark:text-blue-300 shadow-xs">
                                      <HeartHandshake size={22} />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <h4
                                        className="font-heading font-black text-sm text-slate-900 dark:text-slate-100 uppercase truncate"
                                        title={item.fullName}
                                      >
                                        {item.fullName || "Tanpa Nama"}
                                      </h4>
                                      <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-400 shrink-0">
                                        LUAR ANGGOTA
                                      </span>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                      <Calendar size={11} />
                                      <span>Diberikan: {item.dateGiven || "-"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Identity details */}
                                <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-[#151720] border border-black/10 dark:border-white/10 font-mono">
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-sans font-bold block uppercase">
                                      Citizen ID / KTP:
                                    </span>
                                    <strong
                                      className="text-[#DC2626] dark:text-[#FACC15] truncate block text-[11px]"
                                      title={item.citizenId}
                                    >
                                      {item.citizenId || "-"}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-sans font-bold block uppercase">
                                      No TLP / WA:
                                    </span>
                                    <span
                                      className="text-slate-800 dark:text-slate-200 truncate block text-[11px]"
                                      title={item.phone}
                                    >
                                      {item.phone || "-"}
                                    </span>
                                  </div>
                                </div>

                                {/* Benefit voucher box */}
                                <div className="p-2.5 rounded border-2 bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100">
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-heading font-black text-[11px] uppercase text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                      <Gift size={12} className="text-[#DC2626]" />
                                      MANFAAT JASRA KESEHATAN
                                    </span>
                                    <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                                      AKTIF
                                    </span>
                                  </div>
                                  <div className="font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                                    {item.packageLabel || "10 Tritmen • 10 Pingsan"}
                                  </div>
                                  {item.notes && (
                                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 italic border-t border-amber-200 dark:border-amber-800/40 pt-1">
                                      Catatan: {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-1.5">
                                  {item.ktpPhoto ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewKtp({
                                          image: item.ktpPhoto,
                                          name: item.fullName || "Warga",
                                          citizenId: item.citizenId || "",
                                        })
                                      }
                                      className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-900 font-black border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1 cursor-pointer"
                                      title="Lihat dokumen KTP IC warga"
                                    >
                                      <FileText size={12} className="text-[#DC2626]" />
                                      <span>Lihat KTP</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Tanpa Foto KTP</span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setEditingExternalJasra(item)}
                                    className="btn text-[11px] py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-black dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                                    title="Edit data penerima Jasra ini"
                                  >
                                    <Edit2 size={11} />
                                    <span>Edit</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteExternalJasra(item.id, item.fullName)}
                                  className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-500 transition-colors cursor-pointer"
                                  title="Hapus pencatatan Jasra ini"
                                >
                                  <Trash2 size={14} />
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

              {/* Tab: Catat Uang Kas & Iuran Anggota */}
              {activeTab === "member_kas" && (
                <div className="flex flex-col gap-4">
                  {/* Top Header Card with Actions */}
                  <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-900 shadow-[2px_2px_0px_#000] shrink-0">
                        <DollarSign size={20} className="text-[#DC2626]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                            Catat Uang Kas & Iuran Anggota
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-400">
                            $4.000 / BULAN
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Pencatatan resmi iuran kas anggota LSM PPS Sandy Shores • Terhubung langsung ke kas bendahara
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab("kas_db")}
                        className="py-2 px-3.5 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-heading font-black border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Buka menu Keuangan & mutasi kas"
                      >
                        <Landmark size={15} className="text-[#DC2626]" />
                        <span>Keuangan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("members_db")}
                        className="py-2 px-3.5 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-heading font-black border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Kembali ke Database Anggota & Foto KTP"
                      >
                        <Users2 size={15} className="text-[#DC2626]" />
                        <span>Database Anggota</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                      <span className="text-[10px] font-sans font-black text-slate-500 uppercase">
                        Total Anggota
                      </span>
                      <div className="text-xl font-mono font-black text-slate-900 dark:text-slate-100 mt-1">
                        {membersList.length}
                      </div>
                      <span className="text-[10px] text-slate-500">Warga terdaftar</span>
                    </div>

                    <div className="card-brutal p-3 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-[2px_2px_0px_#000]">
                      <span className="text-[10px] font-sans font-black text-emerald-900 dark:text-emerald-300 uppercase">
                        Sudah Bayar
                      </span>
                      <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {totalKasActiveCount}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-mono">
                        {Math.round((totalKasActiveCount / (membersList.length || 1)) * 100)}% anggota bayar kas
                      </span>
                    </div>

                    <div className="card-brutal p-3 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500 dark:border-rose-400 shadow-[2px_2px_0px_#000]">
                      <span className="text-[10px] font-sans font-black text-rose-900 dark:text-rose-300 uppercase">
                        Belum Bayar
                      </span>
                      <div className="text-xl font-mono font-black text-rose-700 dark:text-rose-300 mt-1">
                        {membersList.length - totalKasActiveCount}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono">Belum iuran kas</span>
                    </div>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    {/* Search box */}
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari anggota berdasarkan nama, nomor telepon, atau CID..."
                        value={kasMemberSearchQuery}
                        onChange={(e) => setKasMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-slate-50 dark:bg-[#20232E] border-2 border-black dark:border-[#475569] rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626]"
                      />
                      {kasMemberSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setKasMemberSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <button
                        type="button"
                        onClick={() => setKasMemberStatusFilter("all")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasMemberStatusFilter === "all"
                            ? "bg-slate-900 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Semua ({membersList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasMemberStatusFilter("active")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasMemberStatusFilter === "active"
                            ? "bg-emerald-600 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        ✓ Sudah Bayar ({totalKasActiveCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasMemberStatusFilter("unpaid")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasMemberStatusFilter === "unpaid"
                            ? "bg-rose-600 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-rose-50"
                        }`}
                      >
                        ✕ Belum Bayar ({membersList.length - totalKasActiveCount})
                      </button>
                    </div>
                  </div>

                  {/* List / Cards of Members for Kas */}
                  {filteredKasMembers.length === 0 ? (
                    <div className="card-brutal p-8 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] text-center text-slate-500">
                      <DollarSign size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-heading font-black text-sm">Tidak ada anggota yang cocok dengan filter pencarian.</p>
                      <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci nama atau nomor CID lain.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {filteredKasMembers.map((member) => {
                        const kasSub = getMemberKasSubscription(member);
                        return (
                          <div
                            key={member.id}
                            className="card-brutal p-4 rounded-xl border-2 bg-white dark:bg-[#1A1D26] border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] transition-all flex flex-col justify-between gap-3"
                          >
                            {/* Member Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white border-2 border-black flex items-center justify-center font-heading font-black text-sm shadow-[1.5px_1.5px_0px_#000] shrink-0">
                                  {member.fullName ? member.fullName.charAt(0).toUpperCase() : "A"}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-heading font-black text-sm text-slate-900 dark:text-slate-100 truncate">
                                    {member.fullName}
                                  </h4>
                                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 truncate">
                                    <span>CID: {member.icNumber || member.citizenId || "-"}</span>
                                    <span>•</span>
                                    <span>{member.phone || "-"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border shrink-0 ${
                                kasSub.isActive
                                  ? "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-400"
                                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              }`}>
                                {kasSub.isActive ? "SUDAH BAYAR" : "BELUM BAYAR"}
                              </span>
                            </div>

                            {/* Kas Info Box */}
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#14161F] border border-black/10 dark:border-white/10 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-500">Tarif Bulanan:</span>
                                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                                  {member.kasCustomMonthlyRate
                                    ? `$${Number(member.kasCustomMonthlyRate).toLocaleString("id-ID")} (Donatur)`
                                    : "$4.000 / Bulan"}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-500">Status Iuran:</span>
                                <strong className={`font-bold ${
                                  kasSub.isActive
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}>
                                  {kasSub.isActive
                                    ? kasSub.expiresAtFormatted ? `Sudah Bayar (s/d ${kasSub.expiresAtFormatted})` : "Sudah Bayar"
                                    : "Belum Bayar"}
                                </strong>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex items-center gap-2 pt-1 border-t border-black/10 dark:border-white/10">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedKasMember(member);
                                  setIsKasPaymentModalOpen(true);
                                }}
                                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                                title="Catat pembayaran iuran kas anggota ini"
                              >
                                <DollarSign size={14} />
                                <span>{kasSub.isActive ? "Perpanjang / Tambah Kas" : "Catat Pembayaran Kas"}</span>
                              </button>

                              {kasSub.isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelKas(member)}
                                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-700 hover:text-rose-700 dark:text-slate-300 font-heading font-bold text-xs border border-black/30 cursor-pointer transition-colors"
                                  title="Reset status kas anggota ini kembali ke Belum Bayar"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Buku Kas & Keuangan LSM PPS */}
              {activeTab === "kas_db" && (
                <div className="flex flex-col gap-4">
                  {/* Top Header Card with Actions */}
                  <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-slate-900 shadow-[2px_2px_0px_#000] shrink-0">
                        <DollarSign size={20} className="text-[#DC2626]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                            Keuangan LSM PPS
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-400">
                            TRANSPARAN
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Pencatatan kas organisasi, iuran anggota, donasi, dan alokasi dana operasional Sandy Shores
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab("member_kas")}
                        className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Buka menu khusus pencatatan iuran kas anggota LSM"
                      >
                        <DollarSign size={15} />
                        <span>Catat Kas Anggota</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsKasIncomeModalOpen(true)}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Catat dana masuk baru (donasi warga, sponsorship, hasil UMKM, dll)"
                      >
                        <Plus size={15} />
                        <span>Catat Pemasukan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsKasExpenseModalOpen(true)}
                        className="py-2 px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Catat pengeluaran baru kas LSM"
                      >
                        <TrendingDown size={15} />
                        <span>Catat Pengeluaran</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportKasExcel}
                        disabled={kasTransactions.length === 0}
                        className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer rounded"
                        title="Download seluruh mutasi kas dalam format Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={15} />
                        <span>Ekspor Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsKasCopyModalOpen(true)}
                        className="py-2 px-3.5 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Salin laporan kas dalam format teks untuk Discord / WhatsApp"
                      >
                        <Copy size={15} />
                        <span>Salin Laporan</span>
                      </button>
                    </div>
                  </div>

                  {/* Metric Cards: 2 Pos Kas Bendahara & Total Saldo Bersih */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1: Kas Oita */}
                    <div className="card-brutal p-3.5 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500 dark:border-amber-400 shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-black text-amber-900 dark:text-amber-300 uppercase">
                          Kas di Oita (Bendahara)
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <strong className="text-xl font-mono font-black text-amber-950 dark:text-amber-200">
                          {formatCurrency(kasSummary.oitaBalance)}
                        </strong>
                      </div>
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono">
                        Masuk: +{formatCurrency(kasSummary.oitaIncome)} • Keluar: -{formatCurrency(kasSummary.oitaExpense)}
                      </span>
                    </div>

                    {/* Card 2: Kas Darren */}
                    <div className="card-brutal p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-500 dark:border-indigo-400 shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-black text-indigo-900 dark:text-indigo-300 uppercase">
                          Kas di Darren (Bendahara)
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <strong className="text-xl font-mono font-black text-indigo-950 dark:text-indigo-200">
                          {formatCurrency(kasSummary.darrenBalance)}
                        </strong>
                      </div>
                      <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-mono">
                        Masuk: +{formatCurrency(kasSummary.darrenIncome)} • Keluar: -{formatCurrency(kasSummary.darrenExpense)}
                      </span>
                    </div>

                    {/* Card 3: Saldo Kas Bersih LSM */}
                    <div className="card-brutal p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-black text-emerald-900 dark:text-emerald-300 uppercase">
                          Total Saldo Bersih LSM
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <strong className="text-xl font-mono font-black text-emerald-800 dark:text-emerald-300">
                          {formatCurrency(kasSummary.netBalance)}
                        </strong>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        Total gabungan kas Oita + Darren
                      </span>
                    </div>
                  </div>

                  {/* Arus Kas: Total Pemasukan vs Total Pengeluaran */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-sans font-black text-slate-500 uppercase">
                          Akumulasi Pemasukan
                        </span>
                        <strong className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400">
                          +{formatCurrency(kasSummary.totalIncome)}
                        </strong>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                        {kasSummary.incomeCount} transaksi masuk
                      </span>
                    </div>

                    <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-sans font-black text-slate-500 uppercase">
                          Akumulasi Pengeluaran
                        </span>
                        <strong className="text-base font-mono font-black text-rose-700 dark:text-rose-400">
                          -{formatCurrency(kasSummary.totalExpense)}
                        </strong>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-1 rounded bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300">
                        {kasSummary.expenseCount} transaksi keluar
                      </span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    {/* Search box */}
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari transaksi, nama anggota, CID, bendahara, catatan..."
                        value={kasSearchQuery}
                        onChange={(e) => setKasSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#20232E] border-2 border-black dark:border-[#475569] rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setKasFilterType("ALL")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasFilterType === "ALL"
                            ? "bg-slate-900 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Semua ({kasTransactions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasFilterType("INCOME")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasFilterType === "INCOME"
                            ? "bg-emerald-600 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        Pemasukan ({kasSummary.incomeCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasFilterType("EXPENSE")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasFilterType === "EXPENSE"
                            ? "bg-rose-600 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-rose-50"
                        }`}
                      >
                        Pengeluaran ({kasSummary.expenseCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasFilterType("OITA")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasFilterType === "OITA"
                            ? "bg-amber-500 text-slate-950 shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-amber-50"
                        }`}
                      >
                        Kas Oita
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasFilterType("DARREN")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border-2 border-black cursor-pointer transition-all ${
                          kasFilterType === "DARREN"
                            ? "bg-indigo-600 text-white shadow-[1px_1px_0px_#000]"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
                        }`}
                      >
                        Kas Darren
                      </button>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="card-brutal bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-[#20232E] border-b-2 border-black dark:border-[#475569] text-[10px] font-heading font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Tanggal / Waktu</th>
                            <th className="py-2.5 px-3">Pos Kas</th>
                            <th className="py-2.5 px-3">Jenis & Kategori</th>
                            <th className="py-2.5 px-3">Keterangan / Terkait</th>
                            <th className="py-2.5 px-3">Penanggung Jawab</th>
                            <th className="py-2.5 px-3 text-right">Nominal ($)</th>
                            <th className="py-2.5 px-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/10 dark:divide-white/10 font-mono text-xs">
                          {filteredKasTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-500">
                                Tidak ada transaksi yang sesuai dengan filter.
                              </td>
                            </tr>
                          ) : (
                            filteredKasTransactions.map((tx) => {
                              const isIncome = (tx.type || "").toUpperCase() === "INCOME";
                              const txWalletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
                              const isDarren = tx.wallet === "Darren" || txWalletText.includes("darren");

                              return (
                                <tr
                                  key={tx.id}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
                                    {formatKasDate(tx.timestamp || tx.date)}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-heading font-black border ${
                                        isDarren
                                          ? "bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-300"
                                          : "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200"
                                      }`}
                                    >
                                      {isDarren ? "Kas Darren" : "Kas Oita"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                          isIncome
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300"
                                        }`}
                                      >
                                        {isIncome ? "Pemasukan" : "Pengeluaran"}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-sans">
                                        {tx.category || "Umum"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-sans font-bold text-slate-900 dark:text-slate-100 text-xs">
                                      {tx.title}
                                    </div>
                                    {(tx.memberName || tx.memberCid) && (
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Anggota: {tx.memberName} ({tx.memberCid})
                                      </div>
                                    )}
                                    {tx.notes && (
                                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                                        {tx.notes}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-700 dark:text-slate-300">
                                    {tx.responsible || tx.recordedBy || (isDarren ? "Darren" : "Oita")}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-right font-black">
                                    <span
                                      className={
                                        isIncome
                                          ? "text-emerald-700 dark:text-emerald-400"
                                          : "text-rose-700 dark:text-rose-400"
                                      }
                                    >
                                      {isIncome ? "+" : "-"}
                                      {formatCurrency(tx.amount)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteKasTx(tx)}
                                      className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer transition-colors"
                                      title="Hapus catatan transaksi ini"
                                    >
                                      <Trash2 size={13} />
                                    </button>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowPasswordForm(true)}
                            className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border-2 border-black font-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                          >
                            Ubah PIN / Password
                          </button>
                          <button
                            type="button"
                            onClick={handleResetPinToDefault}
                            className="btn text-xs py-1.5 px-3 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border-2 border-black font-bold shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                            title="Atur kode akses admin ke PIN default: 114123"
                          >
                            Reset ke PIN 114123
                          </button>
                          <button
                            type="button"
                            onClick={handleResetPasswordToDefault}
                            className="btn text-xs py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-black font-bold shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                            title="Kembalikan password ke default: @adminpps22h6"
                          >
                            Reset ke Password Default
                          </button>
                        </div>
                      )}
                    </div>

                    {showPasswordForm ? (
                      <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-[#1C1F2A] p-4 border-2 border-black/20 dark:border-white/15 rounded">
                        <div>
                          <label className="card-label text-slate-700 dark:text-slate-300 mb-1 block">
                            PIN / Password Baru (Minimal 6 Karakter atau 6 Digit)
                          </label>
                          <input
                            type="password"
                            placeholder="Ketik 6 digit PIN atau password baru..."
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
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 rounded text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-1">
                        <span className="font-heading font-black text-amber-900 dark:text-amber-200">
                          Informasi Akses Rekan Admin:
                        </span>
                        <p className="text-[11px] leading-relaxed">
                          PIN Default: <strong className="font-mono text-[#DC2626] dark:text-[#FACC15]">114123</strong> dan Password Default: <strong className="font-mono text-[#DC2626] dark:text-[#FACC15]">@adminpps22h6</strong> selalu aktif sebagai akses darurat jika ada rekan pengurus yang lupa kode akses baru.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Google Gemini Vision AI Card */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border-2 border-black dark:border-[#475569] flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shrink-0 border border-black/30 shadow-sm">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
                              Integrasi AI Vision (Google Gemini)
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              geminiKeyInput?.trim()
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/40"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                            }`}>
                              {geminiKeyInput?.trim() ? "AI Vision Aktif" : "Mode Standar (Tesseract)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Memindai foto KTP IC secara instan dengan kecerdasan multi-modal (99.9% akurat).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300">
                        Gemini API Key (Google AI Studio)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="password"
                          placeholder="AQ.Ab8RN6... atau AIzaSy..."
                          value={geminiKeyInput}
                          onChange={(e) => setGeminiKeyInput(e.target.value)}
                          className="input-field font-mono text-xs flex-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                        <button
                          type="button"
                          disabled={isTestingGemini}
                          onClick={handleTestGeminiKey}
                          className="btn text-xs py-2 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                        >
                          {isTestingGemini ? "Menguji..." : "Uji Koneksi AI"}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveGeminiKey}
                          className="btn text-xs py-2 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Simpan Key
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Kunci API disimpan secara lokal di browser dan otomatis dipakai untuk fitur pendaftaran anggota, klaim bansos, dan pencatatan Jasra. Jika kosong, sistem otomatis mundur ke OCR lokal (Tesseract).
                      </p>
                    </div>
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

              {/* Bottom Actions (Fixed Bar at Bottom) - Kondisional: Hanya muncul di tab pengeditan form umum & konten */}
              {isContentConfigTab && (
                <div className="shrink-0 border-t-2 border-[#1A1A1A]/15 dark:border-slate-700/60 bg-white/95 dark:bg-[#1F222C]/95 backdrop-blur-sm px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_-2px_0_#000]/5 animate-fadeIn">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-heading font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    title="Reset konfigurasi website ke pengaturan bawaan awal"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Konfigurasi Awal</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    {isDirty && (
                      <button
                        type="button"
                        onClick={() => {
                          if (lastSavedData) {
                            setFormData(JSON.parse(JSON.stringify(lastSavedData)));
                            onShowToast("Perubahan form dibatalkan.", "info");
                          }
                        }}
                        className="btn text-xs py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-black/30 dark:border-white/20 font-bold active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                        title="Batalkan perubahan formulir dan kembalikan ke kondisi tersimpan terakhir"
                      >
                        Batal Editan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-secondary text-xs py-2 px-4 border-2 border-black dark:border-[#475569] cursor-pointer"
                      title="Tutup panel admin dan lihat website utama"
                    >
                      Tutup Panel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || !isDirty}
                      className={`btn text-xs py-2 px-5 border-2 font-black transition-all flex items-center gap-1.5 ${
                        isDirty
                          ? "bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-black shadow-[2px_2px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-300 dark:border-slate-700 shadow-none"
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <Save size={15} className="text-[#DC2626] animate-spin" />
                          <span>Menyimpan Data...</span>
                        </>
                      ) : isDirty ? (
                        <>
                          <Save size={15} className="text-[#DC2626]" />
                          <span>Simpan Perubahan</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} className="text-emerald-500" />
                          <span>Sudah Tersimpan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
            className="p-4 bg-white dark:bg-[#1E212B] border-[3px] border-black max-w-3xl w-full rounded-xl overflow-hidden flex flex-col gap-3 shadow-[8px_8px_0px_#000] max-h-[92vh]"
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

      {/* Modal Pembayaran Kas Anggota */}
      <KasPaymentModal
        isOpen={isKasPaymentModalOpen}
        member={selectedKasMember}
        onClose={() => {
          setIsKasPaymentModalOpen(false);
          setSelectedKasMember(null);
        }}
        onShowToast={onShowToast}
        onSuccess={(updatedMember) => {
          if (updatedMember) {
            setMembersList((prev) =>
              prev.map((m) => (m.id === updatedMember.id ? { ...m, ...updatedMember } : m))
            );
          }
          loadKasLedgerCloud().then((list) => {
            if (Array.isArray(list)) setKasTransactions(list);
          });
        }}
      />

      {/* Modal Catat Pengeluaran Kas */}
      <KasExpenseModal
        isOpen={isKasExpenseModalOpen}
        currentBalance={kasSummary.netBalance}
        oitaBalance={kasSummary.oitaBalance}
        darrenBalance={kasSummary.darrenBalance}
        onClose={() => setIsKasExpenseModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={(updatedMember) => {
          if (updatedMember) {
            setMembersList((prev) =>
              prev.map((m) => (m.id === updatedMember.id ? { ...m, ...updatedMember } : m))
            );
          }
          loadKasLedgerCloud().then((list) => {
            if (Array.isArray(list)) setKasTransactions(list);
          });
        }}
      />

      {/* Modal Catat Pemasukan Kas (Non-Iuran / Donasi / Sponsorship / UMKM) */}
      <KasIncomeModal
        isOpen={isKasIncomeModalOpen}
        currentBalance={kasSummary.netBalance}
        oitaBalance={kasSummary.oitaBalance}
        darrenBalance={kasSummary.darrenBalance}
        onClose={() => setIsKasIncomeModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={(updatedMember) => {
          if (updatedMember) {
            setMembersList((prev) =>
              prev.map((m) => (m.id === updatedMember.id ? { ...m, ...updatedMember } : m))
            );
          }
          loadKasLedgerCloud().then((list) => {
            if (Array.isArray(list)) setKasTransactions(list);
          });
        }}
      />

      {/* Modal Buku Kas & Mutasi Keuangan */}
      <KasLedgerModal
        isOpen={isKasLedgerModalOpen}
        transactions={kasTransactions}
        fallbackActiveKasRupiah={totalKasRupiah}
        onClose={() => setIsKasLedgerModalOpen(false)}
        onOpenIncomeModal={() => setIsKasIncomeModalOpen(true)}
        onOpenExpenseModal={() => setIsKasExpenseModalOpen(true)}
        onShowToast={onShowToast}
        onReload={() => {
          loadKasLedgerCloud().then((list) => {
            if (Array.isArray(list)) setKasTransactions(list);
          });
        }}
      />

      {/* Modal Salin Teks Laporan Kas (Discord / WA) */}
      <KasCopyModal
        isOpen={isKasCopyModalOpen}
        onClose={() => setIsKasCopyModalOpen(false)}
        transactions={kasTransactions}
        summary={kasSummary}
        onShowToast={onShowToast}
      />

      {/* Modal Tambah / Edit Penerima Jasra Luar Anggota */}
      {editingExternalJasra && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#151821] border-3 border-black rounded-xl shadow-[6px_6px_0px_#000] overflow-hidden my-auto text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="bg-[#FACC15] text-[#111827] px-4 py-3 border-b-3 border-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake size={20} className="text-[#DC2626]" />
                <h3 className="font-heading font-black text-sm uppercase tracking-wide">
                  {editingExternalJasra.id ? "Edit Penerima Jasra (Luar Anggota)" : "Catat Penerima Jasra (Luar Anggota)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingExternalJasra(null)}
                className="w-7 h-7 rounded border-2 border-black bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveExternalJasra} className="p-4 sm:p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/50 rounded-lg p-2.5 text-xs text-amber-900 dark:text-amber-200">
                Pencatatan jatah voucher kesehatan Jasra (<strong>10 Tritmen • 10 Pingsan</strong>) untuk warga umum di luar keanggotaan resmi PPS. Warga cukup mengirimkan foto KTP IC.
              </div>

              {/* Upload Foto KTP IC dengan Auto OCR */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ScanLine size={14} className="text-[#DC2626]" />
                  <span>Foto KTP IC Warga & Scan Otomatis (OCR)</span>
                </label>

                {editingExternalJasra.ktpPhoto ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border-2 border-dashed border-black/30 dark:border-white/20 bg-slate-50 dark:bg-[#1C202C]">
                    <div className="relative w-28 h-20 rounded border-2 border-black overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={editingExternalJasra.ktpPhoto}
                        alt="KTP Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-black text-emerald-600 dark:text-emerald-400">
                          {isScanningExternalOcr ? "Memindai KTP via OCR..." : "✓ Foto KTP Siap Disimpan"}
                        </span>
                        {isScanningExternalOcr && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isScanningExternalOcr
                          ? "Membaca teks nama & Citizen ID otomatis..."
                          : "Foto tersimpan di database admin dan dapat dibuka kapan saja."}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-[10px] border border-black/30">
                          Ganti Foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleExternalKtpUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingExternalJasra((prev) => ({
                              ...prev,
                              ktpPhoto: "",
                            }))
                          }
                          className="px-2.5 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-[10px]"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-black/40 dark:border-white/20 bg-slate-50 dark:bg-[#1A1D27] hover:bg-amber-50 dark:hover:bg-[#202533] cursor-pointer transition-colors text-center">
                    <ScanLine size={24} className="text-slate-400 mb-1" />
                    <span className="font-heading font-black text-xs text-slate-800 dark:text-slate-200">
                      Klik untuk Unggah Foto KTP IC
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Sistem otomatis memindai Nama & Citizen ID dengan OCR
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleExternalKtpUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Data Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap (IC) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExternalJasra.fullName || ""}
                    onChange={(e) =>
                      setEditingExternalJasra({
                        ...editingExternalJasra,
                        fullName: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Contoh: AIDIL SIRG"
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Citizen ID / No KTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExternalJasra.citizenId || ""}
                    onChange={(e) =>
                      setEditingExternalJasra({
                        ...editingExternalJasra,
                        citizenId: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Contoh: E21J9V03"
                    className="input-field w-full text-xs font-mono uppercase"
                  />
                  {editingExternalJasra.cidCandidates && editingExternalJasra.cidCandidates.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">Pilihan OCR:</span>
                      {editingExternalJasra.cidCandidates.map((cand) => (
                        <button
                          key={cand}
                          type="button"
                          onClick={() =>
                            setEditingExternalJasra((prev) => ({
                              ...prev,
                              citizenId: cand,
                            }))
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                            editingExternalJasra.citizenId === cand
                              ? "bg-amber-400 text-slate-950 border-black"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-black/20 hover:bg-slate-200"
                          }`}
                        >
                          {cand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    No WhatsApp / HP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editingExternalJasra.phone || ""}
                    onChange={(e) =>
                      setEditingExternalJasra({
                        ...editingExternalJasra,
                        phone: e.target.value,
                      })
                    }
                    placeholder="Contoh: 08123456789 atau 555-0199"
                    className="input-field w-full text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Diberikan
                  </label>
                  <input
                    type="text"
                    value={editingExternalJasra.dateGiven || ""}
                    onChange={(e) =>
                      setEditingExternalJasra({
                        ...editingExternalJasra,
                        dateGiven: e.target.value,
                      })
                    }
                    placeholder="Contoh: 03 Nov 2026"
                    className="input-field w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* Paket Manfaat Jasra */}
              <div className="p-3 rounded-lg border-2 border-amber-400 bg-amber-50/70 dark:bg-amber-950/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 uppercase block">
                    Paket Voucher Manfaat:
                  </span>
                  <strong className="text-xs font-heading font-black text-slate-900 dark:text-slate-100">
                    10 Tritmen • 10 Pingsan (Kesehatan)
                  </strong>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-mono font-black text-[10px]">
                  STATUS: AKTIF
                </span>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={editingExternalJasra.notes || ""}
                  onChange={(e) =>
                    setEditingExternalJasra({
                      ...editingExternalJasra,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Contoh: Warga Grapeseed, dikirim via DM Discord, keadaan darurat"
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingExternalJasra(null)}
                  className="btn py-2 px-4 bg-white dark:bg-[#1E222D] text-slate-800 dark:text-slate-200 border-2 border-black font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn py-2 px-5 bg-[#059669] hover:bg-[#047857] text-white font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] text-xs flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Save size={14} className="text-[#FACC15]" />
                  <span>Simpan Data Jasra</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE FULL-MENU DRAWER MODAL (< md) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop dismiss */}
          <div
            className="flex-1"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu navigasi"
          />

          {/* Drawer Sheet Content */}
          <div className="bg-[#FFFDF9] dark:bg-[#1A1D26] border-t-3 border-black dark:border-[#475569] rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.35)] max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="p-3.5 border-b-2 border-black/10 dark:border-white/10 flex items-center justify-between bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#FACC15] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_#000]">
                  <Menu size={16} className="text-[#DC2626]" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm text-slate-900 dark:text-slate-100">
                    Navigasi Menu Admin
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    4 Kategori Sistem ({tabs.length} Menu)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-lg bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-2 border-black dark:border-[#475569] flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 cursor-pointer"
                title="Tutup Menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body: All 4 Groups */}
            <div className="p-3.5 overflow-y-auto space-y-4">
              {tabGroups.map((group, gIdx) => {
                const GroupIcon = group.icon;
                return (
                  <div key={gIdx} className="space-y-1.5">
                    {/* Category Header */}
                    <div className="flex items-center gap-2 px-1">
                      <GroupIcon size={14} className="text-[#DC2626] dark:text-[#FACC15]" />
                      <span className="text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                        {group.group}
                      </span>
                      <div className="flex-1 h-[1.5px] bg-black/10 dark:bg-white/10" />
                    </div>

                    {/* Tab Buttons */}
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const hasCount = tab.label.includes("(");
                        const countMatch = hasCount ? tab.label.match(/\(([^)]+)\)/) : null;
                        const countText = countMatch ? countMatch[1] : null;
                        const cleanTitle = tab.label.split(" (")[0];

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 font-heading font-black text-xs transition-all text-left cursor-pointer min-h-[44px] ${
                              isActive
                                ? "bg-[#FACC15] text-[#111827] border-black shadow-[3px_3px_0px_#000] -translate-y-0.5"
                                : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 border-black/20 dark:border-[#475569] hover:bg-amber-50 dark:hover:bg-slate-800 shadow-[1.5px_1.5px_0px_#000]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon size={16} className={isActive ? "text-[#DC2626]" : "text-slate-500"} />
                              <span className="truncate">{cleanTitle}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {Boolean(countText) && (
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
                              {isActive && (
                                <span className="text-xs font-black text-[#DC2626] bg-black/10 px-1 rounded">
                                  ✓
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="btn w-full py-2.5 bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 border-2 border-black dark:border-[#475569] font-heading font-black text-xs rounded-lg shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer min-h-[44px]"
              >
                Tutup Menu
              </button>
            </div>
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
