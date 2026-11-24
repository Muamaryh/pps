import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { X, Lock, Save, RotateCcw, Plus, Trash2, Shield, Layout, LayoutDashboard, FileText, Users, Camera, Compass, Target, LogOut, Inbox, Phone, MessageSquare, Tag, CheckCircle2, Maximize2, ExternalLink, ShieldCheck, ShieldAlert, KeyRound, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Users2, User, FileSpreadsheet, Archive, Search, Download, Eye, EyeOff, Ticket, CheckSquare, Square, DollarSign, Gift, Check, Clock, Calendar, Edit2, Settings2, SlidersHorizontal, Dices, CreditCard, Fuel, Utensils, Wheat, ShoppingBag, Package, TrendingDown, TrendingUp, Copy, HeartHandshake, ScanLine, Menu, Landmark, Wallet, GitBranch, UserMinus, UserX, UserCheck, UserPlus, Briefcase, AlertCircle, Upload, Loader2, Layers, Send, ArrowLeftRight } from "lucide-react";
import { saveCloudData, resetCloudData, loadCloudData, loadSubmissions, updateSubmissions, loadAdminAccountsConfig, saveAdminAccountsConfig, loadAdminActivityLogsCloud, logAdminActivityCloud } from "../services/firebase";
import {
  subscribeMembersCloud,
  deleteMemberCloud,
  approveMemberCloud,
  rejectMemberCloud,
  revertMemberToPendingCloud,
  purgeApprovedHudPhotosCloud,
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
  subscribeDismissedMembersCloud,
  dismissMemberCloud,
  restoreMemberCloud,
  deleteDismissedMemberPermanentlyCloud,
  exportDismissedMembersToExcel,
  formatDismissedDateTime,
  cleanupDuplicateMembersCloud,
  updateMemberProfileCloud,
} from "../services/memberService";
import { scanKtpImage, getGeminiApiKey, resolveGeminiApiKey, setGeminiApiKey } from "../utils/ktpOcr";
import {
  DEFAULT_DISCORD_WEBHOOK_CONFIG,
  getDiscordWebhookConfig,
  updateDiscordWebhookConfig,
  sendDiscordNotification,
  isValidDiscordWebhookUrl,
} from "../services/discordWebhook";
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
import { hashPassword, verifyPassword, verifyPersonalCredential, getLockoutState, recordFailedAttempt, resetLockoutState, DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_PIN, DEFAULT_PIN_HASH, MAX_ATTEMPTS, LOCKOUT_DURATION_SECONDS } from "../utils/security";
import BrutalistDatePicker from "./BrutalistDatePicker";
import BrutalistSelect from "./BrutalistSelect";
import BrutalistConfirmModal from "./BrutalistConfirmModal";
import { getSubMembers } from "../services/orgService";

// Lazy-loaded heavy Admin tabs & sub-modals (improves mobile load speed & reduces main Admin chunk)
const DoorprizeAdminPanel = lazy(() => import("./DoorprizeAdminPanel"));
const KasPaymentModal = lazy(() => import("./KasPaymentModal"));
const KasExpenseModal = lazy(() => import("./KasExpenseModal"));
const KasIncomeModal = lazy(() => import("./KasIncomeModal"));
const KasTransferModal = lazy(() => import("./KasTransferModal"));
const KasLedgerModal = lazy(() => import("./KasLedgerModal"));
const KasCopyModal = lazy(() => import("./KasCopyModal"));
const JasraPanel = lazy(() => import("./JasraPanel"));
const AdminOverviewTab = lazy(() => import("./admin/AdminOverviewTab"));
const AdminSubmissionsTab = lazy(() => import("./admin/AdminSubmissionsTab"));
const AdminKasTab = lazy(() => import("./admin/AdminKasTab"));
const AdminSecurityTab = lazy(() => import("./admin/AdminSecurityTab"));
import {
  loadJasraBatchesCloud,
  subscribeJasraBatchesCloud,
  loadJasraDistributionsCloud,
  subscribeJasraDistributionsCloud,
  distributeJasraCloud,
  getActiveJasraBatch,
  getBatchDistributions,
  findMemberJasraDistribution,
  calculateRecipientRemaining,
} from "../services/jasraService";
import {
  loadKasLedgerCloud,
  subscribeKasLedger,
  getKasSummary,
  computeKasRunningBalances,
  formatRupiah,
  formatCurrency,
  formatKasDate,
  exportKasLedgerToExcel,
  updateKasTransactionCloud,
  deleteKasTransactionCloud,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "../services/kasService";

const LEGACY_ADMIN_STORAGE_KEY = "pps_admin_session";
const ADMIN_ACCOUNT_SESSION_KEY = "pps_admin_account_session_v2";
const LAST_ADMIN_ACCOUNT_ID_KEY = "pps_admin_last_account_id";

function readStoredAdminSession() {
  if (typeof window === "undefined") return null;
  try {
    // Purge legacy shared-password sessions so every pengurus activates their personal IC account
    localStorage.removeItem(LEGACY_ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_ADMIN_STORAGE_KEY);
    const raw =
      localStorage.getItem(ADMIN_ACCOUNT_SESSION_KEY) ||
      sessionStorage.getItem(ADMIN_ACCOUNT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.accountId && parsed.name && parsed.tokenHash) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeStoredAdminSession(sessionObj, persist = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_ADMIN_STORAGE_KEY);
    const raw = JSON.stringify(sessionObj);
    if (persist) {
      localStorage.setItem(ADMIN_ACCOUNT_SESSION_KEY, raw);
      sessionStorage.removeItem(ADMIN_ACCOUNT_SESSION_KEY);
    } else {
      sessionStorage.setItem(ADMIN_ACCOUNT_SESSION_KEY, raw);
      localStorage.removeItem(ADMIN_ACCOUNT_SESSION_KEY);
    }
    if (sessionObj?.accountId) {
      localStorage.setItem(LAST_ADMIN_ACCOUNT_ID_KEY, sessionObj.accountId);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function clearStoredAdminSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_ACCOUNT_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_ACCOUNT_SESSION_KEY);
  } catch {
    // Ignore
  }
}

export default function AdminModal({
  isOpen,
  onClose,
  initialData,
  onDataSaved,
  onShowToast,
  isCloudLoading = false,
  eventsList: externalEventsList = [],
  bansosPrograms: externalBansosPrograms = [],
  doorprizeTickets = [],
  onOpenTransparency,
}) {
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    const sess = readStoredAdminSession();
    return sess ? { id: sess.accountId, name: sess.name, role: sess.role || "Pengurus LSM" } : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readStoredAdminSession()));
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [allowMasterOnboarding, setAllowMasterOnboarding] = useState(true);
  const [isAdminAccountsLoaded, setIsAdminAccountsLoaded] = useState(false);
  const [selectedLoginAccountId, setSelectedLoginAccountId] = useState(() => {
    try {
      return localStorage.getItem(LAST_ADMIN_ACCOUNT_ID_KEY) || "";
    } catch {
      return "";
    }
  });
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef(null);
  const [loginStep, setLoginStep] = useState("login"); // "login" | "onboarding"
  const [onboardingForm, setOnboardingForm] = useState({
    name: "",
    role: "",
    password: "",
    pin: "",
  });
  const [showOnboardingPassword, setShowOnboardingPassword] = useState(false);
  const [showOnboardingPin, setShowOnboardingPin] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [showSelfCredForm, setShowSelfCredForm] = useState(false);
  const [selfCredForm, setSelfCredForm] = useState({
    currentSecret: "",
    newPassword: "",
    newPin: "",
  });
  const [isSavingSelfCred, setIsSavingSelfCred] = useState(false);
  const [adminAccountAction, setAdminAccountAction] = useState(null);
  const [isProcessingAccountAction, setIsProcessingAccountAction] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] = useState(false);
  const [activityLogCategory, setActivityLogCategory] = useState("ALL");
  const [activityLogSearch, setActivityLogSearch] = useState("");
  const [activityLogVisibleCount, setActivityLogVisibleCount] = useState(25);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginMode, setLoginMode] = useState("password"); // "password" (default) | "pin"
  const [rememberMe, setRememberMe] = useState(true);
  const activeAdminName = currentAdmin?.name || "Admin LSM PPS";

  function recordActivity(category, action, detail = "", overrideAdmin = null) {
    const actorName = overrideAdmin?.name || currentAdmin?.name || "Admin LSM PPS";
    const actorRole = overrideAdmin?.role || currentAdmin?.role || "Pengurus LSM";
    const optimistic = {
      id: `log-local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      adminName: actorName,
      adminRole: actorRole,
      category: String(category || "KONTEN").toUpperCase(),
      action: String(action || "").trim(),
      detail: String(detail || "").trim(),
    };
    setActivityLogs((prev) => [optimistic, ...prev].slice(0, 150));
    logAdminActivityCloud({
      adminName: actorName,
      adminRole: actorRole,
      category,
      action,
      detail,
    }).catch(() => {});
  }

  async function refreshActivityLogs() {
    setIsLoadingActivityLogs(true);
    try {
      const items = await loadAdminActivityLogsCloud();
      setActivityLogs(items);
    } finally {
      setIsLoadingActivityLogs(false);
    }
  }

  const ADMIN_ACTIVE_TAB_KEY = "pps_admin_active_tab";
  const ADMIN_MEMBER_SUBTAB_KEY = "pps_admin_member_subtab";

  function resolveAdminTabFromQuery() {
    if (typeof window === "undefined") return null;
    try {
      const rawTab = new URLSearchParams(window.location.search).get("tab");
      if (!rawTab) return null;
      const key = rawTab.trim().toLowerCase();
      const aliasMap = {
        ringkasan: "overview",
        overview: "overview",
        dashboard: "overview",
        verifikasi: "member_registrations",
        member_registrations: "member_registrations",
        anggota: "members_db",
        members_db: "members_db",
        layanan: "submissions",
        submissions: "submissions",
        bansos: "bansos_db",
        bansos_db: "bansos_db",
        kas: "kas_db",
        keuangan: "kas_db",
        kas_db: "kas_db",
        member_kas: "member_kas",
        jasra: "jasra_panel",
        jasra_panel: "jasra_panel",
        event: "event_db",
        event_db: "event_db",
        doorprize: "doorprize_db",
        doorprize_db: "doorprize_db",
        keamanan: "security",
        security: "security",
        identity: "identity",
        hero: "hero",
        about: "about",
        org: "org",
        gallery: "gallery",
      };
      return aliasMap[key] || null;
    } catch {
      return null;
    }
  }

  function resolveSavedAdminTab() {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem(ADMIN_ACTIVE_TAB_KEY);
      if (!saved) return null;
      const validTabs = new Set([
        "overview",
        "identity",
        "hero",
        "about",
        "org",
        "gallery",
        "submissions",
        "member_registrations",
        "members_db",
        "member_kas",
        "jasra_panel",
        "kas_db",
        "event_db",
        "bansos_db",
        "doorprize_db",
        "security",
      ]);
      return validTabs.has(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  const [activeTab, setActiveTab] = useState(
    () => resolveAdminTabFromQuery() || resolveSavedAdminTab() || "overview"
  );

  useEffect(() => {
    if (!isOpen || !isAuthenticated || (activeTab !== "security" && activeTab !== "overview")) return;
    refreshActivityLogs();
  }, [isOpen, isAuthenticated, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const requestedTab = resolveAdminTabFromQuery();
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [isOpen]);

  // Keep active admin tab standby across page refresh (sync to sessionStorage + URL ?tab=...)
  useEffect(() => {
    if (!isOpen || !activeTab) return;
    try {
      sessionStorage.setItem(ADMIN_ACTIVE_TAB_KEY, activeTab);
    } catch {}
    if (typeof window !== "undefined") {
      try {
        const path = window.location.pathname.toLowerCase();
        if (path === "/admin" || path.endsWith("/admin")) {
          const params = new URLSearchParams(window.location.search);
          if (params.get("tab") !== activeTab) {
            params.set("tab", activeTab);
            const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
            window.history.replaceState(null, "", nextUrl);
          }
        }
      } catch {}
    }
  }, [isOpen, activeTab]);
  const [jasraInitialDistributeType, setJasraInitialDistributeType] = useState(null);
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

  // Discord Webhook Notification Config State for Tab Keamanan
  const [discordWebhookConfig, setDiscordWebhookConfig] = useState(() => ({
    ...DEFAULT_DISCORD_WEBHOOK_CONFIG,
  }));
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

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
  const [filterKas, setFilterKas] = useState("all"); // 'all' | 'active' | 'unpaid'
  const [filterVoucher, setFilterVoucher] = useState("all"); // 'all' | 'active' | 'ready'
  const [filterJob, setFilterJob] = useState("all");
  const [filterGang, setFilterGang] = useState("all");
  const [isPurgingHudPhotos, setIsPurgingHudPhotos] = useState(false);
  const [editKasTxModal, setEditKasTxModal] = useState({
    isOpen: false,
    tx: null,
    title: "",
    amount: "",
    wallet: "Oita",
    category: "",
    responsible: "",
    customDate: "",
    notes: "",
    isSubmitting: false,
  });

  // Member Registration Verification State (Verifikasi Anggota Baru)
  const [memberRegFilterTab, setMemberRegFilterTab] = useState("PENDING"); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [memberRegSearchQuery, setMemberRegSearchQuery] = useState("");
  const [previewImageDetail, setPreviewImageDetail] = useState(null); // { url, title, subtitle }
  const [rejectTargetMember, setRejectTargetMember] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isProcessingRegAction, setIsProcessingRegAction] = useState(false);

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
  const [isKasTransferModalOpen, setIsKasTransferModalOpen] = useState(false);
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
  // Dismissed Members State (Arsip Riwayat Pengeluaran Anggota)
  const [dismissedMembersList, setDismissedMembersList] = useState([]);
  const [memberSubTab, setMemberSubTab] = useState(() => {
    if (typeof window === "undefined") return "active";
    try {
      const saved = sessionStorage.getItem(ADMIN_MEMBER_SUBTAB_KEY);
      if (saved === "active" || saved === "pending" || saved === "dismissed") return saved;
    } catch {}
    return "active";
  }); // 'active' | 'pending' | 'dismissed'

  useEffect(() => {
    try {
      sessionStorage.setItem(ADMIN_MEMBER_SUBTAB_KEY, memberSubTab);
    } catch {}
  }, [memberSubTab]);
  const [dismissedSearchQuery, setDismissedSearchQuery] = useState("");
  const [dismissModal, setDismissModal] = useState({
    isOpen: false,
    member: null,
    reason: "",
    dismissedBy: "Pengurus LSM PPS",
    isSubmitting: false,
  });

  // Edit Member Profile Modal State (Ganti Identitas / Foto / KTP / No HP)
  const [editMemberModal, setEditMemberModal] = useState({
    isOpen: false,
    member: null,
    fullName: "",
    icNumber: "",
    phone: "",
    statusJob: "",
    statusGang: "",
    profilePhoto: "",
    icPhoto: "",
    isSubmitting: false,
  });
  const [isScanningEditKtp, setIsScanningEditKtp] = useState(false);
  const [editKtpOcrResult, setEditKtpOcrResult] = useState(null);

  // Modal Tambah Divisi / Jabatan Baru
  const [addDivisionModal, setAddDivisionModal] = useState({
    isOpen: false,
    level: 4,
    role: "",
    name: "",
    desc: "",
    photo: "",
    subMembers: [],
  });

  const [memberTabSubView, setMemberTabSubView] = useState("members"); // 'members' | 'external_jasra'
  const [editingExternalJasra, setEditingExternalJasra] = useState(null);
  const [isScanningExternalOcr, setIsScanningExternalOcr] = useState(false);
  const [externalJasraSearch, setExternalJasraSearch] = useState("");

  // Jasra Government Batches & Distributions State
  const [jasraBatches, setJasraBatches] = useState([]);
  const [jasraDistributions, setJasraDistributions] = useState([]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      resolveGeminiApiKey().then((k) => {
        if (k) setGeminiKeyInput(k);
      }).catch(() => {});
      getDiscordWebhookConfig(true).then((cfg) => {
        if (cfg) setDiscordWebhookConfig(cfg);
      }).catch(() => {});
      loadSubmissions().then((data) => setSubmissions(data || []));
      const unsubscribeMembers = subscribeMembersCloud((list) => {
        setMembersList(list || []);
      });
      const unsubscribeDismissed = subscribeDismissedMembersCloud((list) => {
        setDismissedMembersList(list || []);
      });
      loadExternalJasraCloud().then((list) => {
        if (Array.isArray(list)) setExternalJasraList(list);
      });
      const unsubscribeExternalJasra = subscribeExternalJasraCloud((list) => {
        if (Array.isArray(list)) setExternalJasraList(list);
      });
      loadJasraBatchesCloud().then((list) => {
        if (Array.isArray(list)) setJasraBatches(list);
      });
      const unsubscribeJasraBatches = subscribeJasraBatchesCloud((list) => {
        if (Array.isArray(list)) setJasraBatches(list);
      });
      loadJasraDistributionsCloud().then((list) => {
        if (Array.isArray(list)) setJasraDistributions(list);
      });
      const unsubscribeJasraDistributions = subscribeJasraDistributionsCloud((list) => {
        if (Array.isArray(list)) setJasraDistributions(list);
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
        if (typeof unsubscribeDismissed === "function") unsubscribeDismissed();
        if (typeof unsubscribeExternalJasra === "function") unsubscribeExternalJasra();
        if (typeof unsubscribeJasraBatches === "function") unsubscribeJasraBatches();
        if (typeof unsubscribeJasraDistributions === "function") unsubscribeJasraDistributions();
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

  // Handler: Berikan / Perbarui Voucher Mingguan (Sinkron dengan Batch Pemerintah 7 Hari)
  async function handleClaimVoucher(member, days = VOUCHER_SUBSCRIPTION_DAYS) {
    try {
      // Prioritaskan pemotongan dari Batch Pemerintah yang sedang Aktif
      const activeBatch = getActiveJasraBatch(jasraBatches);

      if (activeBatch && activeBatch.expiresAt > Date.now()) {
        await distributeJasraCloud(
          {
            recipientType: "MEMBER",
            recipientName: member.fullName || "Anggota",
            citizenId: member.icNumber || member.citizenId || "",
            phone: member.phone || "",
            memberId: member.id,
            treatmentCount: 10,
            pingsanCount: 10,
            officerName: "Admin Paguyuban",
            notes: "Diserahkan langsung dari Database Anggota",
          },
          activeBatch
        );

        const remDays = Math.ceil((activeBatch.expiresAt - Date.now()) / 86400000);
        onShowToast(
          `Voucher (10 Tritmen • 10 Pingsan) untuk ${member.fullName || "Anggota"} berhasil dibagikan! Sisa masa berlaku ${remDays} hari (mengikuti batch pemerintah). Stok otomatis dipotong.`,
          "success"
        );
      } else {
        const res = await claimMemberVoucherSubscriptionCloud(member, days, activeBatch);
        const sub = getMemberVoucherSubscription(res, new Date(), activeBatch);
        onShowToast(
          `Voucher 10 Tritmen & 10 Pingsan untuk ${member.fullName || "Anggota"} aktif 7 hari (s/d ${sub.expiresAtFormatted}).`,
          "success"
        );
      }
    } catch (err) {
      console.error("Gagal berikan voucher:", err);
      onShowToast(err.message || "Gagal memberikan voucher anggota.", "error");
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
  async function handleExportEventExcel() {
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
    const success = await exportEventRegistrationsToExcel(
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
      const nextStatus = await toggleBansosStatusCloud(claim.id, claim.claimed, activeAdminName);
      recordActivity(
        "BANSOS",
        nextStatus ? "Serah Terima Bansos" : "Batalkan Status Bansos",
        `${claim.fullName || "Warga"} (${claim.claimCode || "-"})`
      );
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
  async function handleExportBansosExcel() {
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

    const ok = await exportBansosToExcel(list);
    if (ok) {
      onShowToast(`Data ${list.length} penerima Bansos berhasil diekspor ke Excel.`, 'success');
    } else {
      onShowToast('Gagal mengunduh file Excel Bansos.', 'error');
    }
  }

  // =========================================================================
  // HANDLERS: MANAJEMEN BUKU KAS & KEUANGAN LSM
  // =========================================================================

  function handleOpenEditKasTx(tx) {
    if (!tx || !tx.id) return;
    const typeUpper = String(tx.type || "INCOME").toUpperCase();
    const isTransfer = typeUpper === "TRANSFER";
    const initialWallet = isTransfer
      ? tx.fromWallet === "Darren" || tx.wallet === "Darren"
        ? "Darren"
        : "Oita"
      : tx.wallet === "Darren" || String(tx.responsible || "").toLowerCase().includes("darren")
      ? "Darren"
      : "Oita";

    const d = tx.timestamp ? new Date(tx.timestamp) : new Date();
    const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
    const INDO_MONTHS = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const formattedDate = !isNaN(d.getTime())
      ? `${INDO_DAYS[d.getDay()]}, ${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`
      : tx.date || "";

    setEditKasTxModal({
      isOpen: true,
      tx,
      title: tx.title || "",
      amount: String(Number(tx.amount) || ""),
      wallet: initialWallet,
      category: tx.category || (isTransfer ? "Pindah Kas Antar Bendahara" : "Lainnya"),
      responsible: tx.responsible || tx.recordedBy || initialWallet,
      customDate: formattedDate,
      notes: tx.notes || "",
      isSubmitting: false,
    });
  }

  async function handleSaveEditKasTx(e) {
    e?.preventDefault();
    const targetTx = editKasTxModal.tx;
    if (!targetTx || !targetTx.id) return;

    const numericAmount = Number(editKasTxModal.amount) || 0;
    const cleanTitle = (editKasTxModal.title || "").trim();
    if (!cleanTitle) {
      onShowToast("Judul / keterangan transaksi wajib diisi.", "warning");
      return;
    }
    if (numericAmount <= 0) {
      onShowToast("Nominal transaksi harus lebih dari $0.", "warning");
      return;
    }

    setEditKasTxModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const typeUpper = String(targetTx.type || "INCOME").toUpperCase();
      const isTransfer = typeUpper === "TRANSFER";
      await updateKasTransactionCloud(targetTx.id, {
        type: typeUpper,
        title: cleanTitle,
        amount: numericAmount,
        wallet: editKasTxModal.wallet,
        fromWallet: isTransfer ? editKasTxModal.wallet : undefined,
        category: editKasTxModal.category,
        responsible: editKasTxModal.responsible,
        customDate: editKasTxModal.customDate,
        timestamp: targetTx.timestamp,
        notes: editKasTxModal.notes,
        editedBy: activeAdminName,
      });

      const updated = await loadKasLedgerCloud();
      if (Array.isArray(updated)) setKasTransactions(updated);

      const oldAmt = formatCurrency(targetTx.amount);
      const newAmt = formatCurrency(numericAmount);
      recordActivity(
        "KEUANGAN",
        "Edit Transaksi Kas",
        `${cleanTitle} (${oldAmt} -> ${newAmt}, Pos: Kas ${editKasTxModal.wallet})`
      );
      onShowToast("Transaksi kas berhasil diperbarui (tanpa mengirim ulang webhook Discord).", "success");
      setEditKasTxModal({
        isOpen: false,
        tx: null,
        title: "",
        amount: "",
        wallet: "Oita",
        category: "",
        responsible: "",
        customDate: "",
        notes: "",
        isSubmitting: false,
      });
    } catch (err) {
      console.error("Gagal mengedit transaksi kas:", err);
      onShowToast("Gagal menyimpan perubahan transaksi: " + (err?.message || "Error"), "error");
      setEditKasTxModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

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
          recordActivity(
            "KEUANGAN",
            "Hapus Transaksi Kas",
            `${tx.title || "Transaksi"} (${formatCurrency(tx.amount)}, Kas ${tx.wallet || "Oita"})`
          );
          onShowToast("Catatan transaksi kas berhasil dihapus.", "success");
        } catch (err) {
          console.error("Gagal menghapus transaksi kas:", err);
          onShowToast("Gagal menghapus transaksi: " + (err.message || "Error"), "error");
        }
      },
    });
  }

  async function handleExportKasExcel() {
    try {
      if (kasTransactions.length === 0) {
        onShowToast("Belum ada data transaksi kas untuk diekspor.", "warning");
        return;
      }
      const ok = await exportKasLedgerToExcel(kasTransactions, kasSummary);
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

  // Handlers for Member Registration Verification
  async function handleApproveMemberRegistration(member) {
    if (!member || !member.id) return;
    setIsProcessingRegAction(true);
    try {
      await approveMemberCloud(member.id, activeAdminName);
      recordActivity(
        "ANGGOTA",
        "ACC Pendaftaran Anggota",
        `${member.fullName || "-"} (${member.icNumber || "-"})`
      );
      sendDiscordNotification("MEMBER_APPROVED", {
        fullName: member.fullName || "-",
        icNumber: member.icNumber || "-",
        discordTag: member.discordTag || "-",
        verifiedBy: activeAdminName,
      }).catch(() => {});
      onShowToast(`Pendaftaran ${member.fullName || "Anggota"} berhasil DISETUJUI menjadi Anggota Resmi!`, "success");
    } catch (err) {
      console.error("Gagal menyetujui pendaftaran anggota:", err);
      onShowToast("Gagal menyetujui pendaftaran anggota.", "error");
    } finally {
      setIsProcessingRegAction(false);
    }
  }

  function handleOpenRejectModal(member) {
    setRejectTargetMember(member);
    setRejectionReasonInput("");
  }

  async function handleConfirmRejectMember() {
    if (!rejectTargetMember || !rejectTargetMember.id) return;
    const reason = (rejectionReasonInput || "").trim() || "Berkas tidak memenuhi syarat verifikasi LSM PPS.";
    setIsProcessingRegAction(true);
    try {
      await rejectMemberCloud(rejectTargetMember.id, reason, activeAdminName);
      recordActivity(
        "ANGGOTA",
        "Tolak Pendaftaran Anggota",
        `${rejectTargetMember.fullName || "-"} (${rejectTargetMember.icNumber || "-"}) - ${reason}`
      );
      sendDiscordNotification("MEMBER_REJECTED", {
        fullName: rejectTargetMember.fullName || "-",
        icNumber: rejectTargetMember.icNumber || "-",
        discordTag: rejectTargetMember.discordTag || "-",
        reason,
        rejectedBy: activeAdminName,
      }).catch(() => {});
      onShowToast(`Pendaftaran ${rejectTargetMember.fullName || "Calon Anggota"} DITOLAK.`, "info");
      setRejectTargetMember(null);
      setRejectionReasonInput("");
    } catch (err) {
      console.error("Gagal menolak pendaftaran anggota:", err);
      onShowToast("Gagal menolak pendaftaran anggota.", "error");
    } finally {
      setIsProcessingRegAction(false);
    }
  }

  async function handleRevertMemberToPending(member) {
    if (!member || !member.id) return;
    setIsProcessingRegAction(true);
    try {
      await revertMemberToPendingCloud(member.id, activeAdminName);
      recordActivity(
        "ANGGOTA",
        "Kembalikan ke Verifikasi",
        `${member.fullName || "-"} (${member.icNumber || "-"})`
      );
      onShowToast(`Status ${member.fullName || "Calon Anggota"} dikembalikan ke Tahap Menunggu Verifikasi.`, "info");
    } catch (err) {
      console.error("Gagal mengembalikan status anggota:", err);
      onShowToast("Gagal mengembalikan status pendaftaran.", "error");
    } finally {
      setIsProcessingRegAction(false);
    }
  }

  function handlePurgeApprovedHudPhotos() {
    const eligibleCount = membersList.filter(
      (m) =>
        m.statusPhoto &&
        m.status !== "PENDING_VERIFIKASI" &&
        m.status !== "REJECTED"
    ).length;

    if (eligibleCount === 0) {
      onShowToast("Tidak ada foto Status HUD anggota terverifikasi yang perlu dibersihkan.", "info");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Bersihkan Foto Status HUD Lama",
      message: `Hapus ${eligibleCount} screenshot Status HUD milik anggota yang SUDAH DISETUJUI (Resmi) untuk memperingan dan mempercepat database? Foto Profil, Foto KTP, dan berkas calon anggota yang masih Menunggu Verifikasi TIDAK akan disentuh.`,
      confirmText: `Ya, Bersihkan (${eligibleCount} Foto HUD)`,
      variant: "warning",
      onConfirm: async () => {
        setIsPurgingHudPhotos(true);
        try {
          const res = await purgeApprovedHudPhotosCloud();
          onShowToast(
            `Berhasil membersihkan ${res.purgedCount} foto Status HUD anggota terverifikasi. Database kini lebih ringan!`,
            "success"
          );
        } catch (err) {
          console.error("Gagal membersihkan foto HUD:", err);
          onShowToast("Gagal membersihkan foto HUD: " + (err?.message || "Coba lagi."), "error");
        } finally {
          setIsPurgingHudPhotos(false);
        }
      },
    });
  }

  async function handleExportExcel() {
    if (membersList.length === 0) {
      onShowToast("Tidak ada data anggota untuk diexport.", "error");
      return;
    }
    const ok = await exportMembersToExcel(membersList);
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

  // Handler: Periksa & Bersihkan Data Duplikat di Database
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  async function handleAuditAndCleanDuplicates() {
    setIsCleaningDuplicates(true);
    try {
      const result = await cleanupDuplicateMembersCloud();
      if (result.deletedCount > 0) {
        onShowToast(`Berhasil merapikan database! ${result.deletedCount} data anggota duplikat telah dihapus.`, "success");
      } else {
        onShowToast("Database bersih! Tidak ada data anggota duplikat yang ditemukan.", "info");
      }
    } catch (err) {
      console.error("Clean duplicates err:", err);
      onShowToast("Gagal memeriksa data duplikat di database.", "error");
    } finally {
      setIsCleaningDuplicates(false);
    }
  }

  // Handlers for Edit Member Profile
  function handleOpenEditMemberModal(member) {
    if (!member) return;
    setIsScanningEditKtp(false);
    setEditKtpOcrResult(null);
    setEditMemberModal({
      isOpen: true,
      member,
      fullName: member.fullName || "",
      icNumber: member.icNumber || "",
      phone: member.phone || "",
      statusJob: member.statusJob || "",
      statusGang: member.statusGang || "",
      profilePhoto: member.profilePhoto || "",
      icPhoto: member.icPhoto || "",
      isSubmitting: false,
    });
  }

  function handleEditMemberPhotoUpload(file, field) {
    if (!file) return;

    compressImage(file, (compressedBase64) => {
      setEditMemberModal((prev) => ({
        ...prev,
        [field]: compressedBase64,
      }));
      if (field === "profilePhoto") {
        onShowToast("Foto profil baru siap disimpan!", "info");
      }
    }, 1200, 0.88);

    // Jika yang diunggah adalah Dokumen KTP, jalankan pemindaian OCR (Gemini Vision AI Anti-Typo) yang sama
    if (field === "icPhoto") {
      setIsScanningEditKtp(true);
      setEditKtpOcrResult(null);
      onShowToast("Sedang memindai KTP dengan AI Vision OCR...", "info");

      scanKtpImage(file)
        .then((res) => {
          const fields = res?.fields || res || {};
          const detectedName = (
            fields.fullName ||
            [fields.firstName, fields.lastName].filter(Boolean).join(" ").trim() ||
            fields.name ||
            ""
          ).toUpperCase();

          const detectedCid = (
            fields.citizenId ||
            (fields.citizenIdCandidates && fields.citizenIdCandidates[0]) ||
            ""
          ).toUpperCase();

          if (detectedName || detectedCid) {
            setEditMemberModal((prev) => ({
              ...prev,
              fullName: detectedName || prev.fullName,
              icNumber: detectedCid || prev.icNumber,
            }));
            setEditKtpOcrResult({ name: detectedName, cid: detectedCid });
            onShowToast(
              `KTP berhasil dipindai AI OCR! ${detectedName ? `Nama: ${detectedName}` : ""} ${detectedCid ? `• CID: ${detectedCid}` : ""}`,
              "success"
            );
          } else {
            onShowToast("Foto KTP berhasil diunggah. Silakan sesuaikan Nama & No KTP manual jika perlu.", "info");
          }
        })
        .catch((err) => {
          console.warn("Scan KTP edit modal notice:", err);
          onShowToast("Foto KTP diunggah. Anda tetap dapat menyesuaikan Nama & No KTP secara manual.", "info");
        })
        .finally(() => {
          setIsScanningEditKtp(false);
        });
    }
  }

  async function handleSaveEditMember(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!editMemberModal.member) return;

    const cleanName = (editMemberModal.fullName || "").trim().toUpperCase();
    const cleanCid = (editMemberModal.icNumber || "").trim().toUpperCase();
    const cleanPhone = (editMemberModal.phone || "").trim();

    if (!cleanName) {
      onShowToast("Nama Lengkap IC wajib diisi!", "error");
      return;
    }
    if (!cleanCid) {
      onShowToast("Citizen ID (No KTP IC) wajib diisi!", "error");
      return;
    }

    setEditMemberModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const payload = {
        fullName: cleanName,
        icNumber: cleanCid,
        phone: cleanPhone,
        statusJob: (editMemberModal.statusJob || "").trim(),
        statusGang: (editMemberModal.statusGang || "").trim(),
        profilePhoto: editMemberModal.profilePhoto,
        icPhoto: editMemberModal.icPhoto,
      };

      await updateMemberProfileCloud(editMemberModal.member.id, payload);

      setMembersList((prev) =>
        prev.map((m) =>
          m.id === editMemberModal.member.id ? { ...m, ...payload } : m
        )
      );

      recordActivity("ANGGOTA", "Edit Profil Anggota", `${cleanName} (${cleanCid})`);
      onShowToast(`Data anggota "${cleanName}" berhasil diperbarui!`, "success");
      setEditMemberModal({
        isOpen: false,
        member: null,
        fullName: "",
        icNumber: "",
        phone: "",
        statusJob: "",
        statusGang: "",
        profilePhoto: "",
        icPhoto: "",
        isSubmitting: false,
      });
    } catch (err) {
      console.error("Gagal update profil anggota:", err);
      onShowToast("Gagal memperbarui data: " + (err.message || "Terjadi kesalahan"), "error");
    } finally {
      setEditMemberModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  // Handlers for Dismissed Members (Keluarkan Anggota & Arsip Riwayat)
  function handleOpenDismissModal(member) {
    if (!member) return;
    setDismissModal({
      isOpen: true,
      member,
      reason: "",
      dismissedBy: activeAdminName,
      isSubmitting: false,
    });
  }

  async function handleConfirmDismiss(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!dismissModal.member) return;
    if (!dismissModal.reason.trim()) {
      onShowToast("Mohon masukkan alasan pengeluaran anggota.", "error");
      return;
    }

    setDismissModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await dismissMemberCloud(dismissModal.member, {
        reason: dismissModal.reason.trim(),
        dismissedBy: dismissModal.dismissedBy.trim() || "Pengurus LSM PPS",
      });
      const memberName = dismissModal.member.fullName || dismissModal.member.icNumber || "Anggota";
      recordActivity(
        "ANGGOTA",
        "Keluarkan Anggota",
        `${memberName} (${dismissModal.member.icNumber || "-"}) - ${dismissModal.reason.trim()}`
      );
      onShowToast(`${memberName} telah berhasil dikeluarkan dari keanggotaan dan dicatat ke riwayat.`, "success");
      setDismissModal({
        isOpen: false,
        member: null,
        reason: "",
        dismissedBy: "Pengurus LSM PPS",
        isSubmitting: false,
      });
    } catch (err) {
      console.error("Gagal mengeluarkan anggota:", err);
      onShowToast("Gagal memproses pengeluaran anggota: " + (err.message || "Terjadi kesalahan"), "error");
      setDismissModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  function handleRestoreMember(dismissedMember) {
    if (!dismissedMember) return;
    const name = dismissedMember.fullName || dismissedMember.icNumber || "Anggota";
    setConfirmModal({
      isOpen: true,
      title: "Pulihkan Keanggotaan Warga",
      message: `Apakah Anda yakin ingin memulihkan status keanggotaan "${name}" kembali menjadi Anggota Aktif LSM PPS? Data akan kembali muncul di Database Anggota dan direktori resmi.`,
      confirmText: "Ya, Pulihkan Anggota",
      variant: "primary",
      onConfirm: async () => {
        try {
          await restoreMemberCloud(dismissedMember);
          onShowToast(`Keanggotaan ${name} berhasil dipulihkan menjadi Anggota Aktif!`, "success");
        } catch (err) {
          console.error("Gagal memulihkan anggota:", err);
          onShowToast("Gagal memulihkan keanggotaan: " + (err.message || "Terjadi kesalahan"), "error");
        }
      },
    });
  }

  function handleDeleteDismissedPermanently(dismissedMember) {
    if (!dismissedMember) return;
    const name = dismissedMember.fullName || dismissedMember.icNumber || "Anggota";
    setConfirmModal({
      isOpen: true,
      title: "Hapus Permanen Dari Riwayat",
      message: `PERINGATAN: Apakah Anda yakin ingin menghapus data arsip pengeluaran "${name}" secara permanen? Catatan alasan dan riwayat tanggal/jam pengeluaran ini akan hilang selamanya.`,
      confirmText: "Hapus Permanen",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteDismissedMemberPermanentlyCloud(dismissedMember.id);
          onShowToast(`Riwayat pengeluaran ${name} berhasil dihapus permanen.`, "info");
        } catch (err) {
          console.error("Gagal menghapus permanen riwayat:", err);
          onShowToast("Gagal menghapus riwayat pengeluaran: " + (err.message || "Terjadi kesalahan"), "error");
        }
      },
    });
  }

  async function handleExportDismissedExcel() {
    if (dismissedMembersList.length === 0) {
      onShowToast("Belum ada riwayat anggota yang dikeluarkan untuk diexport.", "error");
      return;
    }
    const ok = await exportDismissedMembersToExcel(dismissedMembersList);
    if (ok) {
      onShowToast("File Excel riwayat anggota dikeluarkan berhasil diunduh!", "success");
    } else {
      onShowToast("Gagal mengekspor riwayat ke Excel.", "error");
    }
  }

  // =========================================================================
  // HANDLER: PENERIMA MANFAAT JASRA LUAR ANGGOTA (NON-MEMBER)
  // =========================================================================

  async function handleExternalKtpUpload(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onShowToast("File harus berupa gambar (JPG, PNG, WebP).", "error");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      onShowToast("Ukuran gambar maksimal 8MB.", "error");
      return;
    }

    // 1. Kompres foto KTP untuk preview & penyimpanan cloud yang ringan
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 750;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);

        setEditingExternalJasra((prev) => ({
          ...prev,
          ktpPhoto: compressedBase64,
        }));
      };
      img.src = ev.target?.result;
    };
    reader.readAsDataURL(file);

    // 2. Jalankan AI Vision OCR fokus First Name, Last Name & Citizen ID langsung pada file asli
    setIsScanningExternalOcr(true);
    try {
      const ocrResult = await scanKtpImage(file, undefined, { minimal: true });
      const fields = ocrResult?.fields || ocrResult || {};
      const detectedName = (
        fields.fullName ||
        [fields.firstName, fields.lastName].filter(Boolean).join(" ") ||
        fields.name ||
        ""
      )
        .trim()
        .toUpperCase();
      const detectedCid = (
        fields.citizenId ||
        (fields.citizenIdCandidates && fields.citizenIdCandidates[0]) ||
        ""
      )
        .trim()
        .toUpperCase();

      if (detectedName || detectedCid) {
        setEditingExternalJasra((prev) => ({
          ...prev,
          fullName: detectedName || (prev?.fullName || ""),
          citizenId: detectedCid || (prev?.citizenId || ""),
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

  async function handleExportExternalJasraExcel() {
    if (!externalJasraList || externalJasraList.length === 0) {
      onShowToast("Tidak ada data penerima Jasra luar untuk diunduh.", "warning");
      return;
    }
    try {
      const ok = await exportExternalJasraToExcel(externalJasraList);
      if (ok) {
        onShowToast("File Excel penerima Jasra luar anggota berhasil diunduh!", "success");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Gagal mengekspor data Excel.", "error");
    }
  }

  async function handleUpdateSubmissionStatus(id, newStatus) {
    const isFinalized = newStatus !== "pending" && newStatus !== "in_progress";
    const statusLabels = {
      pending: "Baru",
      in_progress: "Diproses",
      approved: "Disetujui",
      completed: "Selesai",
      rejected: "Ditolak",
    };
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        const item = {
          ...sub,
          status: newStatus,
          handledBy: activeAdminName,
          statusUpdatedAt: Date.now(),
        };
        // Otomatis bersihkan foto KTP hanya jika tiket sudah final (approved / completed / rejected)
        if (isFinalized) {
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
    const label = statusLabels[newStatus] || newStatus;
    recordActivity("KONTEN", "Update Status Tiket Layanan", `Tiket #${id} -> ${label}`);
    if (isFinalized) {
      onShowToast(`Status tiket #${id} diubah ke ${label}. Foto KTP otomatis dibersihkan dari arsip.`, "success");
    } else {
      onShowToast(`Status tiket #${id} diubah ke ${label}`, "info");
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

  // Load registered pengurus accounts from Firestore & validate personal v2 session
  useEffect(() => {
    let active = true;
    async function loadAccountsAndValidateSession() {
      if (!isOpen) return;
      const storedSession = readStoredAdminSession();
      try {
        const cfg = await loadAdminAccountsConfig();
        if (!active) return;
        const accounts = Array.isArray(cfg.accounts) ? cfg.accounts : [];
        setAdminAccounts(accounts);
        setAllowMasterOnboarding(cfg.allowMasterOnboarding !== false);
        setIsAdminAccountsLoaded(true);

        // Pre-select last used account or first registered account on login form
        setSelectedLoginAccountId((prev) => {
          if (prev === "__NEW__") return prev;
          if (prev && accounts.some((a) => a.id === prev)) return prev;
          return accounts.length > 0 ? accounts[0].id : "__NEW__";
        });

        if (!storedSession) {
          setCurrentAdmin(null);
          setIsAuthenticated(false);
          return;
        }

        const matchedAcc = accounts.find((a) => a.id === storedSession.accountId);
        const tokenHash = String(storedSession.tokenHash || "").toLowerCase();
        const isValidSession =
          matchedAcc &&
          ((matchedAcc.passwordHash && matchedAcc.passwordHash.toLowerCase() === tokenHash) ||
            (matchedAcc.pinHash && matchedAcc.pinHash.toLowerCase() === tokenHash));

        if (isValidSession) {
          setCurrentAdmin({
            id: matchedAcc.id,
            name: matchedAcc.name,
            role: matchedAcc.role || "Pengurus LSM",
          });
          setIsAuthenticated(true);
        } else {
          // Account was removed or credentials were reset -> force logout
          clearStoredAdminSession();
          setCurrentAdmin(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn("Notice validating admin account session:", err);
        if (!active) return;
        setIsAdminAccountsLoaded(true);
        if (!storedSession) {
          setCurrentAdmin(null);
          setIsAuthenticated(false);
        }
      }
    }
    loadAccountsAndValidateSession();
    return () => {
      active = false;
    };
  }, [isOpen, isCloudLoading]);

  useEffect(() => {
    if (!isOpen) {
      setPasswordInput("");
      setLoginStep("login");
      setIsAccountDropdownOpen(false);
      const storedSession = readStoredAdminSession();
      if (!storedSession) {
        setCurrentAdmin(null);
        setIsAuthenticated(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isAccountDropdownOpen) return;
    function handleOutsideClick(e) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) {
        setIsAccountDropdownOpen(false);
      }
    }
    function handleEscKey(e) {
      if (e.key === "Escape") setIsAccountDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isAccountDropdownOpen]);

  if (!isOpen || !formData) return null;

  // Handle Login: personal account (Password or PIN) OR auto-detect Master Password/PIN for onboarding
  async function handleLogin(e) {
    e?.preventDefault();

    const currentLockout = getLockoutState();
    if (currentLockout.isLocked) {
      onShowToast(`Sistem terkunci sementara! Tunggu ${currentLockout.remainingSeconds} detik lagi.`, "error");
      return;
    }

    const input = passwordInput.trim();
    if (!input) {
      onShowToast(loginMode === "pin" ? "Masukkan PIN terlebih dahulu!" : "Masukkan password terlebih dahulu!", "error");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      let credentialSource = initialData;
      try {
        const fresh = await loadCloudData();
        if (fresh) credentialSource = fresh;
      } catch (err) {
        console.warn("Could not fetch fresh cloud data for login verification:", err);
      }

      const freshAccountsCfg = await loadAdminAccountsConfig();
      const freshAccounts = Array.isArray(freshAccountsCfg.accounts) ? freshAccountsCfg.accounts : [];
      const freshAllowOnboarding = freshAccountsCfg.allowMasterOnboarding !== false;
      setAdminAccounts(freshAccounts);
      setAllowMasterOnboarding(freshAllowOnboarding);
      setIsAdminAccountsLoaded(true);

      const masterCredential = credentialSource?.adminPassHash || credentialSource?.adminPass || DEFAULT_ADMIN_HASH;
      const isRegisterSelection = freshAccounts.length === 0 || selectedLoginAccountId === "__NEW__";
      const targetAccount = !isRegisterSelection
        ? freshAccounts.find((a) => a.id === selectedLoginAccountId) || null
        : null;

      // 1. Check personal account credentials first when a registered pengurus is selected
      if (targetAccount) {
        const matchPass = await verifyPersonalCredential(input, targetAccount.passwordHash);
        const matchPin = !matchPass && (await verifyPersonalCredential(input, targetAccount.pinHash));
        if (matchPass || matchPin) {
          resetLockoutState();
          setLockoutState(getLockoutState());

          const matchedTokenHash = matchPass ? targetAccount.passwordHash : targetAccount.pinHash;
          writeStoredAdminSession(
            {
              accountId: targetAccount.id,
              name: targetAccount.name,
              role: targetAccount.role || "Pengurus LSM",
              tokenHash: matchedTokenHash,
            },
            rememberMe
          );
          setCurrentAdmin({
            id: targetAccount.id,
            name: targetAccount.name,
            role: targetAccount.role || "Pengurus LSM",
          });
          setIsAuthenticated(true);
          setPasswordInput("");

          // Update lastLoginAt in background
          const updatedAccounts = freshAccounts.map((a) =>
            a.id === targetAccount.id ? { ...a, lastLoginAt: Date.now() } : a
          );
          setAdminAccounts(updatedAccounts);
          saveAdminAccountsConfig({
            accounts: updatedAccounts,
            allowMasterOnboarding: freshAllowOnboarding,
          }).catch(() => {});

          recordActivity(
            "KEAMANAN",
            "Login ke Panel Admin",
            `Masuk via ${matchPass ? "Password" : "PIN"}`,
            { name: targetAccount.name, role: targetAccount.role || "Pengurus LSM" }
          );
          onShowToast(`Selamat datang kembali, ${targetAccount.name}!`, "success");
          return;
        }
      }

      // 2. Check Master Password / PIN -> automatically open Pengurus Onboarding form
      const isMasterValid = await verifyPassword(input, masterCredential);
      if (isMasterValid) {
        if (freshAllowOnboarding || freshAccounts.length === 0) {
          resetLockoutState();
          setLockoutState(getLockoutState());
          setPasswordInput("");
          setOnboardingForm({ name: "", role: "", password: "", pin: "" });
          setShowOnboardingPassword(false);
          setShowOnboardingPin(false);
          setLoginStep("onboarding");
          onShowToast(
            "Kode Akses Utama terverifikasi! Silakan isi Nama IC, Password, dan PIN pribadi Anda.",
            "info"
          );
          return;
        } else {
          onShowToast(
            "Aktivasi pengurus baru sedang ditutup. Silakan pilih akun Anda dan masuk dengan Password/PIN pribadi.",
            "warning"
          );
          return;
        }
      }

      // 3. Invalid credentials
      const nextLockout = recordFailedAttempt();
      setLockoutState(nextLockout);
      if (nextLockout.isLocked) {
        onShowToast(`Percobaan salah 5x! Akses terkunci selama ${LOCKOUT_DURATION_SECONDS} detik.`, "error");
      } else {
        const remaining = MAX_ATTEMPTS - nextLockout.attempts;
        onShowToast(
          `${loginMode === "pin" ? "PIN" : "Password"} salah! Sisa percobaan: ${remaining}x lagi.`,
          "error"
        );
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  // Handle First-Time Pengurus Account Activation (after Master Password/PIN verified)
  async function handleCompleteOnboarding(e) {
    e?.preventDefault();
    const cleanName = (onboardingForm.name || "").trim();
    const cleanRole = (onboardingForm.role || "").trim() || "Pengurus LSM";
    const cleanPassword = (onboardingForm.password || "").trim();
    const cleanPin = (onboardingForm.pin || "").replace(/\D/g, "").trim();

    if (cleanName.length < 2) {
      onShowToast("Nama IC pengurus wajib diisi (minimal 2 huruf).", "warning");
      return;
    }
    if (cleanPassword.length < 4) {
      onShowToast("Password pribadi minimal 4 karakter.", "warning");
      return;
    }
    if (!/^\d{4,6}$/.test(cleanPin)) {
      onShowToast("PIN pribadi wajib 4 sampai 6 digit angka.", "warning");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const freshCfg = await loadAdminAccountsConfig();
      const freshAccounts = Array.isArray(freshCfg.accounts) ? freshCfg.accounts : [];
      if (!freshCfg.allowMasterOnboarding && freshAccounts.length > 0) {
        onShowToast("Aktivasi pengurus baru baru saja ditutup oleh admin.", "error");
        setLoginStep("login");
        return;
      }

      const duplicate = freshAccounts.find(
        (a) => String(a.name || "").trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        onShowToast(
          `Nama IC "${duplicate.name}" sudah terdaftar! Silakan kembali ke Login dan masuk pakai akun tersebut.`,
          "warning"
        );
        return;
      }

      const passwordHash = await hashPassword(cleanPassword);
      const pinHash = await hashPassword(cleanPin);
      const now = Date.now();
      const newAccount = {
        id: `adm-${now}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        role: cleanRole,
        passwordHash,
        pinHash,
        createdAt: now,
        lastLoginAt: now,
      };

      const nextAccounts = [...freshAccounts, newAccount];
      await saveAdminAccountsConfig({
        accounts: nextAccounts,
        allowMasterOnboarding: freshCfg.allowMasterOnboarding !== false,
      });

      setAdminAccounts(nextAccounts);
      setAllowMasterOnboarding(freshCfg.allowMasterOnboarding !== false);
      setSelectedLoginAccountId(newAccount.id);

      writeStoredAdminSession(
        {
          accountId: newAccount.id,
          name: newAccount.name,
          role: newAccount.role,
          tokenHash: passwordHash,
        },
        rememberMe
      );
      setCurrentAdmin({
        id: newAccount.id,
        name: newAccount.name,
        role: newAccount.role,
      });
      setIsAuthenticated(true);
      setLoginStep("login");
      setOnboardingForm({ name: "", role: "", password: "", pin: "" });
      recordActivity(
        "KEAMANAN",
        "Aktivasi Akun Pengurus Baru",
        `${newAccount.name} (${newAccount.role})`,
        { name: newAccount.name, role: newAccount.role }
      );
      onShowToast(`Akun pengurus ${newAccount.name} berhasil dibuat! Selamat datang.`, "success");
    } catch (err) {
      console.error("Gagal membuat akun pengurus:", err);
      onShowToast("Gagal menyimpan akun pengurus ke database. Coba lagi.", "error");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  // Handle self password/PIN update inside Security tab
  async function handleUpdateSelfCredentials(e) {
    e?.preventDefault();
    if (!currentAdmin?.id) return;
    const currentSecret = (selfCredForm.currentSecret || "").trim();
    const nextPass = (selfCredForm.newPassword || "").trim();
    const nextPin = (selfCredForm.newPin || "").replace(/\D/g, "").trim();

    if (!currentSecret) {
      onShowToast("Masukkan Password atau PIN Anda saat ini untuk konfirmasi.", "warning");
      return;
    }
    if (!nextPass && !nextPin) {
      onShowToast("Isi Password baru atau PIN baru yang ingin diubah.", "warning");
      return;
    }
    if (nextPass && nextPass.length < 4) {
      onShowToast("Password baru minimal 4 karakter.", "warning");
      return;
    }
    if (nextPin && !/^\d{4,6}$/.test(nextPin)) {
      onShowToast("PIN baru wajib 4 sampai 6 digit angka.", "warning");
      return;
    }

    setIsSavingSelfCred(true);
    try {
      const freshCfg = await loadAdminAccountsConfig();
      const freshAccounts = Array.isArray(freshCfg.accounts) ? freshCfg.accounts : [];
      const me = freshAccounts.find((a) => a.id === currentAdmin.id);
      if (!me) {
        clearStoredAdminSession();
        setCurrentAdmin(null);
        setIsAuthenticated(false);
        onShowToast("Akun Anda tidak ditemukan. Silakan login ulang.", "error");
        return;
      }

      const validPass = await verifyPersonalCredential(currentSecret, me.passwordHash);
      const validPin = !validPass && (await verifyPersonalCredential(currentSecret, me.pinHash));
      if (!validPass && !validPin) {
        onShowToast("Password / PIN saat ini salah.", "error");
        return;
      }

      const updatedPassHash = nextPass ? await hashPassword(nextPass) : me.passwordHash;
      const updatedPinHash = nextPin ? await hashPassword(nextPin) : me.pinHash;

      const updatedAccounts = freshAccounts.map((a) =>
        a.id === me.id
          ? { ...a, passwordHash: updatedPassHash, pinHash: updatedPinHash, updatedAt: Date.now() }
          : a
      );

      await saveAdminAccountsConfig({
        accounts: updatedAccounts,
        allowMasterOnboarding: freshCfg.allowMasterOnboarding !== false,
      });

      setAdminAccounts(updatedAccounts);
      const persist = Boolean(localStorage.getItem(ADMIN_ACCOUNT_SESSION_KEY));
      writeStoredAdminSession(
        {
          accountId: me.id,
          name: me.name,
          role: me.role || "Pengurus LSM",
          tokenHash: updatedPassHash,
        },
        persist
      );

      setSelfCredForm({ currentSecret: "", newPassword: "", newPin: "" });
      setShowSelfCredForm(false);
      recordActivity("KEAMANAN", "Ubah Password / PIN Pribadi", `Akun ${me.name}`);
      onShowToast("Password / PIN akun Anda berhasil diperbarui!", "success");
    } catch (err) {
      console.error("Gagal ubah kredensial akun:", err);
      onShowToast("Gagal menyimpan perubahan password/PIN.", "error");
    } finally {
      setIsSavingSelfCred(false);
    }
  }

  // Handle Master-Password-protected admin account actions (delete, reset, toggle onboarding)
  async function handleExecuteAdminAccountAction(e) {
    e?.preventDefault();
    if (!adminAccountAction) return;

    const masterInput = (adminAccountAction.masterInput || "").trim();
    if (!masterInput) {
      onShowToast("Masukkan Kode Akses Utama (Master Password) untuk konfirmasi.", "warning");
      return;
    }

    setIsProcessingAccountAction(true);
    try {
      let credentialSource = formData || initialData;
      try {
        const fresh = await loadCloudData();
        if (fresh) credentialSource = fresh;
      } catch {}

      const masterCred = credentialSource?.adminPassHash || credentialSource?.adminPass || DEFAULT_ADMIN_HASH;
      const isMasterOk = await verifyPassword(masterInput, masterCred);
      if (!isMasterOk) {
        onShowToast("Kode Akses Utama salah! Aksi dibatalkan.", "error");
        return;
      }

      const freshCfg = await loadAdminAccountsConfig();
      const freshAccounts = Array.isArray(freshCfg.accounts) ? freshCfg.accounts : [];

      if (adminAccountAction.type === "toggle_onboarding") {
        const nextAllow = !freshCfg.allowMasterOnboarding;
        await saveAdminAccountsConfig({
          accounts: freshAccounts,
          allowMasterOnboarding: nextAllow,
        });
        setAdminAccounts(freshAccounts);
        setAllowMasterOnboarding(nextAllow);
        setAdminAccountAction(null);
        recordActivity(
          "KEAMANAN",
          nextAllow ? "Buka Aktivasi Pengurus Baru" : "Tutup Aktivasi Pengurus Baru",
          `Status aktivasi via Kode Utama: ${nextAllow ? "DIBUKA" : "DITUTUP"}`
        );
        onShowToast(
          nextAllow
            ? "Aktivasi pengurus baru via Kode Akses Utama DIBUKA."
            : "Aktivasi pengurus baru via Kode Akses Utama DITUTUP.",
          "success"
        );
        return;
      }

      if (adminAccountAction.type === "delete" && adminAccountAction.account) {
        const target = adminAccountAction.account;
        const nextAccounts = freshAccounts.filter((a) => a.id !== target.id);
        await saveAdminAccountsConfig({
          accounts: nextAccounts,
          allowMasterOnboarding:
            nextAccounts.length === 0 ? true : freshCfg.allowMasterOnboarding !== false,
        });
        setAdminAccounts(nextAccounts);
        if (nextAccounts.length === 0) setAllowMasterOnboarding(true);
        setAdminAccountAction(null);
        recordActivity("KEAMANAN", "Cabut Akses Pengurus", `${target.name} (${target.role || "Pengurus LSM"})`);

        if (currentAdmin?.id === target.id) {
          clearStoredAdminSession();
          setCurrentAdmin(null);
          setIsAuthenticated(false);
          onShowToast(`Akun ${target.name} dicabut. Anda telah keluar dari panel.`, "info");
        } else {
          onShowToast(`Akses pengurus ${target.name} berhasil dicabut & otomatis ter-logout.`, "success");
        }
        return;
      }

      if (adminAccountAction.type === "reset" && adminAccountAction.account) {
        const target = adminAccountAction.account;
        const nextPass = (adminAccountAction.newPassword || "").trim();
        const nextPin = (adminAccountAction.newPin || "").replace(/\D/g, "").trim();
        if (nextPass.length < 4) {
          onShowToast("Password baru minimal 4 karakter.", "warning");
          return;
        }
        if (!/^\d{4,6}$/.test(nextPin)) {
          onShowToast("PIN baru wajib 4 sampai 6 digit angka.", "warning");
          return;
        }

        const passwordHash = await hashPassword(nextPass);
        const pinHash = await hashPassword(nextPin);
        const nextAccounts = freshAccounts.map((a) =>
          a.id === target.id ? { ...a, passwordHash, pinHash, updatedAt: Date.now() } : a
        );
        await saveAdminAccountsConfig({
          accounts: nextAccounts,
          allowMasterOnboarding: freshCfg.allowMasterOnboarding !== false,
        });
        setAdminAccounts(nextAccounts);
        setAdminAccountAction(null);
        recordActivity("KEAMANAN", "Reset Password & PIN Pengurus", `${target.name} (${target.role || "Pengurus LSM"})`);

        if (currentAdmin?.id === target.id) {
          const persist = Boolean(localStorage.getItem(ADMIN_ACCOUNT_SESSION_KEY));
          writeStoredAdminSession(
            {
              accountId: target.id,
              name: target.name,
              role: target.role || "Pengurus LSM",
              tokenHash: passwordHash,
            },
            persist
          );
        }

        onShowToast(
          `Password & PIN untuk ${target.name} berhasil direset! Sesi lama di perangkat lain otomatis keluar.`,
          "success"
        );
      }
    } catch (err) {
      console.error("Gagal memproses aksi akun pengurus:", err);
      onShowToast("Gagal memproses perubahan akun pengurus.", "error");
    } finally {
      setIsProcessingAccountAction(false);
    }
  }

  // Handle Logout
  function handleLogout() {
    clearStoredAdminSession();
    setCurrentAdmin(null);
    setIsAuthenticated(false);
    setPasswordInput("");
    setLoginStep("login");
    onShowToast("Berhasil keluar dari sesi admin.", "info");
  }

  // Handle apply new Master Password in Tab Keamanan
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

      await saveCloudData(updatedFormData);

      setFormData(updatedFormData);
      onDataSaved(updatedFormData);

      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      onShowToast("Kode Akses Utama baru berhasil disimpan ke Database!", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyimpan password ke database: " + (err?.message || ""), "error");
    } finally {
      setIsApplyingPassword(false);
    }
  }

  // Handle reset Master Password to default "@adminpps22h6"
  function handleResetPasswordToDefault() {
    setConfirmModal({
      isOpen: true,
      title: "Reset Kode Akses Utama ke Default?",
      message: "Kode Akses Utama (Master Password) akan dikembalikan ke default: '@adminpps22h6'. Akun pribadi pengurus yang sudah terdaftar tetap aktif.",
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
          setShowPasswordForm(false);
          onShowToast("Kode Akses Utama berhasil dikembalikan ke default (@adminpps22h6)", "success");
        } catch (err) {
          console.error("Gagal reset password:", err);
          onShowToast("Gagal mengembalikan password ke default.", "error");
        } finally {
          setIsApplyingPassword(false);
        }
      },
    });
  }

  // Handle reset Master PIN to default "114123"
  function handleResetPinToDefault() {
    setConfirmModal({
      isOpen: true,
      title: "Reset Kode Akses Utama ke PIN 114123?",
      message: "Kode Akses Utama akan diatur ke 6-digit PIN default: '114123'. Akun pribadi pengurus yang sudah terdaftar tetap aktif.",
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
          setShowPasswordForm(false);
          onShowToast("Kode Akses Utama berhasil diatur ke PIN: 114123", "success");
        } catch (err) {
          console.error("Gagal reset PIN:", err);
          onShowToast("Gagal mengatur PIN ke default.", "error");
        } finally {
          setIsApplyingPassword(false);
        }
      },
    });
  }

  // Handle Save Gemini API Key (syncs to both localStorage and Cloud Firestore for public OCR)
  async function handleSaveGeminiKey() {
    try {
      await setGeminiApiKey(geminiKeyInput.trim(), { syncCloud: true });
      onShowToast("Gemini API Key berhasil disimpan ke Cloud! Seluruh pendaftar kini menggunakan AI Vision OCR.", "success");
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

  // Handle Save Discord Webhook Config to Cloud Firestore
  async function handleSaveDiscordWebhook() {
    const cleanUrl = (discordWebhookConfig.webhookUrl || "").trim();
    const cleanKasUrl = (discordWebhookConfig.kasWebhookUrl || "").trim();
    if (cleanUrl && !isValidDiscordWebhookUrl(cleanUrl)) {
      onShowToast("Format URL Webhook Utama tidak valid! Harus diawali https://discord.com/api/webhooks/...", "error");
      return;
    }
    if (cleanKasUrl && !isValidDiscordWebhookUrl(cleanKasUrl)) {
      onShowToast("Format URL Webhook Keuangan tidak valid! Harus diawali https://discord.com/api/webhooks/...", "error");
      return;
    }
    setIsSavingWebhook(true);
    try {
      const saved = await updateDiscordWebhookConfig({
        ...discordWebhookConfig,
        webhookUrl: cleanUrl,
        kasWebhookUrl: cleanKasUrl,
      });
      setDiscordWebhookConfig(saved);
      recordActivity(
        "KEAMANAN",
        "Simpan Konfigurasi Webhook Discord",
        `Utama: ${cleanUrl ? "Aktif" : "Kosong"} • Keuangan: ${cleanKasUrl ? "Aktif" : "Ikut Utama"}`
      );
      onShowToast(
        cleanUrl || cleanKasUrl
          ? "Pengaturan Discord Webhook berhasil disimpan ke Cloud!"
          : "URL Discord Webhook dikosongkan (notifikasi nonaktif).",
        "success"
      );
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyimpan pengaturan Webhook: " + err.message, "error");
    } finally {
      setIsSavingWebhook(false);
    }
  }

  // Handle Test Discord Webhook Notification (supports main or kas webhook)
  async function handleTestDiscordWebhook(target = "main") {
    const cleanUrl =
      target === "kas"
        ? (discordWebhookConfig.kasWebhookUrl || discordWebhookConfig.webhookUrl || "").trim()
        : (discordWebhookConfig.webhookUrl || "").trim();
    if (!isValidDiscordWebhookUrl(cleanUrl)) {
      onShowToast("Masukkan URL Discord Webhook yang valid terlebih dahulu!", "error");
      return;
    }
    setIsTestingWebhook(true);
    try {
      const res = await sendDiscordNotification("TEST", { isKasTest: target === "kas" }, cleanUrl);
      if (res.ok) {
        onShowToast(
          target === "kas"
            ? "Pesan tes berhasil terkirim ke channel Discord Keuangan!"
            : "Pesan tes berhasil terkirim ke channel Discord pengurus!",
          "success"
        );
      } else {
        onShowToast("Gagal mengirim tes Webhook: " + (res.error || res.reason || "Periksa URL webhook"), "error");
      }
    } finally {
      setIsTestingWebhook(false);
    }
  }

  // Smart HD Image Compressor via Canvas (Max ~1MB ceiling, crystal clear non-burik resolution)
  function compressImage(file, callback, maxSize = 1200, quality = 0.88) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let outputQuality = quality;
        let compressed = canvas.toDataURL("image/jpeg", outputQuality);

        // Safety guard: if output base64 somehow exceeds 1MB (~1.33M characters), adjust quality gracefully
        if (compressed.length > 1300000 && outputQuality > 0.75) {
          compressed = canvas.toDataURL("image/jpeg", 0.78);
        }

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

  // Member & Division Management
  const DIVISION_PRESETS = [
    {
      label: "Keamanan & Satgas",
      role: "Divisi Keamanan & Satgas Wilayah",
      level: 5,
      desc: "Pengamanan teritorial, ketertiban lapak usaha, dan perlindungan warga Sandy Shores.",
    },
    {
      label: "Penggerak Lapangan",
      role: "Koordinator Penggerak Lapangan",
      level: 5,
      desc: "Mobilisasi warga, koordinasi pergerakan massa aksi sosial, dan pendampingan lapangan.",
    },
    {
      label: "Humas & Hubungan Warga",
      role: "Divisi Humas & Hubungan Warga",
      level: 4,
      desc: "Komunikasi publik, sosialisasi program kerja, dan penerimaan aspirasi warga.",
    },
    {
      label: "Logistik & Aset",
      role: "Divisi Logistik & Inventaris Komunitas",
      level: 4,
      desc: "Pengelolaan aset paguyuban, distribusi tenda UMKM, dan perlengkapan kegiatan warga.",
    },
    {
      label: "Hukum & Advokasi",
      role: "Divisi Hukum, Advokasi & Kebijakan",
      level: 4,
      desc: "Bantuan advokasi warga dan perizinan operasional bersama pemerintah kota.",
    },
    {
      label: "Medis & Tanggap Darurat",
      role: "Divisi Medis & Tanggap Darurat",
      level: 4,
      desc: "Pertolongan pertama medis warga, koordinasi voucher Jasra, dan bantuan darurat.",
    },
    {
      label: "Acara & Olahraga",
      role: "Divisi Acara, Olahraga & Kreatif",
      level: 4,
      desc: "Penyelenggaraan event turnamen, senam sehat, dan kegiatan kebersamaan warga.",
    },
    {
      label: "Pemberdayaan UMKM",
      role: "Divisi Pemberdayaan Ekonomi & UMKM",
      level: 4,
      desc: "Pembinaan stand usaha mandiri, perizinan lapak dagang, dan pameran produk warga.",
    },
  ];

  function handleOpenAddDivisionModal() {
    setAddDivisionModal({
      isOpen: true,
      level: 4,
      role: "",
      name: "",
      desc: "",
      photo: "",
      subMembers: [],
    });
  }

  function handleSelectDivisionPreset(preset) {
    if (!preset) return;
    setAddDivisionModal((prev) => ({
      ...prev,
      role: preset.role,
      level: preset.level,
      desc: preset.desc,
    }));
  }

  function handleAddDivisionPhoto(file) {
    if (!file) return;
    compressImage(file, (base64) => {
      setAddDivisionModal((prev) => ({
        ...prev,
        photo: base64,
      }));
      onShowToast("Foto kepala divisi siap disimpan!", "info");
    }, 1200, 0.88);
  }

  function handleAddDivisionSubMember() {
    setAddDivisionModal((prev) => ({
      ...prev,
      subMembers: [
        ...(prev.subMembers || []),
        { name: "", role: `Staf ${prev.role || "Divisi"}`, photo: "" },
      ],
    }));
  }

  function handleRemoveDivisionSubMember(sIdx) {
    setAddDivisionModal((prev) => {
      const next = [...(prev.subMembers || [])];
      next.splice(sIdx, 1);
      return { ...prev, subMembers: next };
    });
  }

  function handleDivisionSubMemberChange(sIdx, field, val) {
    setAddDivisionModal((prev) => {
      const next = [...(prev.subMembers || [])];
      next[sIdx] = { ...next[sIdx], [field]: val };
      return { ...prev, subMembers: next };
    });
  }

  function handleSaveAddDivision(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!addDivisionModal.role.trim()) {
      onShowToast("Nama divisi atau jabatan wajib diisi!", "error");
      return;
    }
    if (!addDivisionModal.name.trim()) {
      onShowToast("Nama kepala / koordinator divisi wajib diisi!", "error");
      return;
    }

    const newDivision = {
      level: Number(addDivisionModal.level) || 4,
      role: addDivisionModal.role.trim(),
      name: addDivisionModal.name.trim().toUpperCase(),
      desc: addDivisionModal.desc.trim(),
      photo: addDivisionModal.photo || "",
      subMembers: (addDivisionModal.subMembers || []).filter((s) => s.name && s.name.trim()),
    };

    setFormData((prev) => ({
      ...prev,
      org: [...(prev.org || []), newDivision],
    }));

    onShowToast(
      `Divisi "${newDivision.role}" berhasil ditambahkan! Jangan lupa klik "Simpan Perubahan" di pojok kanan atas.`,
      "success"
    );

    setAddDivisionModal({
      isOpen: false,
      level: 4,
      role: "",
      name: "",
      desc: "",
      photo: "",
      subMembers: [],
    });
  }

  function handleAddMember() {
    setFormData((prev) => ({
      ...prev,
      org: [...prev.org, { level: 4, role: "Divisi Baru", name: "Nama Pejabat", photo: "" }]
    }));
    onShowToast("Baris divisi baru ditambahkan", "info");
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
    }, 1200, 0.88);
  }

  function handleSubMemberPhoto(memberIndex, subIndex, file) {
    if (!file) return;
    compressImage(file, (base64) => {
      setFormData((prev) => {
        const newOrg = [...prev.org];
        const currentSubs = Array.isArray(newOrg[memberIndex]?.subMembers)
          ? [...newOrg[memberIndex].subMembers]
          : getSubMembers(newOrg[memberIndex]).map((s) => ({ ...s }));
        if (currentSubs[subIndex]) {
          currentSubs[subIndex] = { ...currentSubs[subIndex], photo: base64 };
          newOrg[memberIndex] = { ...newOrg[memberIndex], subMembers: currentSubs };
        }
        return { ...prev, org: newOrg };
      });
      onShowToast("Foto staf divisi berhasil diunggah!", "success");
    }, 960, 0.88);
  }

  function handleAddSubMember(memberIndex) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      const currentSubs = Array.isArray(newOrg[memberIndex]?.subMembers)
        ? [...newOrg[memberIndex].subMembers]
        : getSubMembers(newOrg[memberIndex]).map((s) => ({ ...s }));
      const newSubs = [
        ...currentSubs,
        {
          name: "Nama Staf Baru",
          role: `Staf ${newOrg[memberIndex]?.role || "Divisi"}`,
          photo: ""
        }
      ];
      newOrg[memberIndex] = { ...newOrg[memberIndex], subMembers: newSubs };
      return { ...prev, org: newOrg };
    });
    onShowToast("Anggota staf baru ditambahkan", "info");
  }

  function handleRemoveSubMember(memberIndex, subIndex) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      const currentSubs = Array.isArray(newOrg[memberIndex]?.subMembers)
        ? [...newOrg[memberIndex].subMembers]
        : getSubMembers(newOrg[memberIndex]).map((s) => ({ ...s }));
      currentSubs.splice(subIndex, 1);
      newOrg[memberIndex] = { ...newOrg[memberIndex], subMembers: currentSubs };
      return { ...prev, org: newOrg };
    });
    onShowToast("Anggota staf berhasil dihapus", "info");
  }

  function handleSubMemberChange(memberIndex, subIndex, field, value) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      const currentSubs = Array.isArray(newOrg[memberIndex]?.subMembers)
        ? [...newOrg[memberIndex].subMembers]
        : getSubMembers(newOrg[memberIndex]).map((s) => ({ ...s }));
      if (currentSubs[subIndex]) {
        currentSubs[subIndex] = { ...currentSubs[subIndex], [field]: value };
        newOrg[memberIndex] = { ...newOrg[memberIndex], subMembers: currentSubs };
      }
      return { ...prev, org: newOrg };
    });
  }

  function handleClearAllSubMembers(memberIndex) {
    setFormData((prev) => {
      const newOrg = [...prev.org];
      newOrg[memberIndex] = { ...newOrg[memberIndex], subMembers: [] };
      return { ...prev, org: newOrg };
    });
    onShowToast("Seluruh staf anggota divisi ini berhasil dikosongkan/dihapus", "info");
  }

  function handleTierTitleChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      orgTierTitles: {
        ...(prev.orgTierTitles || {}),
        [field]: value,
      },
    }));
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
      const savedSnapshot = JSON.parse(JSON.stringify(formData));
      setLastSavedData(savedSnapshot);
      onDataSaved(savedSnapshot);
      recordActivity("KONTEN", "Simpan Perubahan Konten Web", `Tab aktif: ${activeTab}`);
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
          clearStoredAdminSession();
          setCurrentAdmin(null);
          setIsAuthenticated(false);
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

  const activeJasraBatch = getActiveJasraBatch(jasraBatches);
  const activeBatchJasraDists = getBatchDistributions(jasraDistributions, activeJasraBatch);

  const approvedMembersList = membersList.filter(
    (m) => m.status !== "PENDING_VERIFIKASI" && m.status !== "REJECTED"
  );
  const pendingMembersList = membersList.filter((m) => m.status === "PENDING_VERIFIKASI");

  // Subscription-based stats aggregation (hanya anggota resmi yang sudah disetujui)
  const kasSubs = approvedMembersList.map((m) => ({
    member: m,
    kas: getMemberKasSubscription(m),
    voucher: getMemberVoucherSubscription(m, new Date(), activeJasraBatch),
  }));
  const totalKasActiveCount = kasSubs.filter((item) => item.kas.isActive).length;
  const totalKasExpiringCount = kasSubs.filter((item) => item.kas.isExpiringSoon).length;
  const totalKasExpiredCount = kasSubs.filter((item) => item.kas.isExpired).length;
  const totalKasRupiah = totalKasActiveCount * 4000;
  const kasSummary = getKasSummary(kasTransactions, totalKasRupiah);
  const kasRunningBalances = computeKasRunningBalances(kasTransactions);

  const pendingMembersCount = membersList.filter((m) => m.status === "PENDING_VERIFIKASI").length;

  let pendingRegistrationsCount = 0;
  let approvedRegistrationsCount = 0;
  let rejectedRegistrationsCount = 0;

  membersList.forEach((m) => {
    if (m.status === "PENDING_VERIFIKASI") pendingRegistrationsCount++;
    else if (m.status === "REJECTED") rejectedRegistrationsCount++;
    else approvedRegistrationsCount++;
  });

  const memberRegSearchQ = memberRegSearchQuery.trim().toLowerCase();

  const memberRegistrationsList = membersList.filter((m) => {
    if (memberRegFilterTab === "PENDING" && m.status !== "PENDING_VERIFIKASI") return false;
    if (memberRegFilterTab === "APPROVED" && (m.status === "PENDING_VERIFIKASI" || m.status === "REJECTED")) return false;
    if (memberRegFilterTab === "REJECTED" && m.status !== "REJECTED") return false;

    if (!memberRegSearchQ) return true;
    const name = (m.fullName || "").toLowerCase();
    const cid = (m.icNumber || "").toLowerCase();
    const phone = (m.phone || "").toLowerCase();
    const discord = (m.discordTag || "").toLowerCase();
    const job = (m.statusJob || "").toLowerCase();
    const gang = (m.statusGang || "").toLowerCase();
    return (
      name.includes(memberRegSearchQ) ||
      cid.includes(memberRegSearchQ) ||
      phone.includes(memberRegSearchQ) ||
      discord.includes(memberRegSearchQ) ||
      job.includes(memberRegSearchQ) ||
      gang.includes(memberRegSearchQ)
    );
  });

  memberRegistrationsList.sort((a, b) => {
    if (a.status === "PENDING_VERIFIKASI" && b.status !== "PENDING_VERIFIKASI") return -1;
    if (b.status === "PENDING_VERIFIKASI" && a.status !== "PENDING_VERIFIKASI") return 1;
    const timeA = a.submittedAt || (a.regDate ? new Date(a.regDate).getTime() : 0);
    const timeB = b.submittedAt || (b.regDate ? new Date(b.regDate).getTime() : 0);
    return timeB - timeA;
  });

  function parseTabLabel(label) {
    const match = String(label || "").match(/^(.*?)\s*\(([^)]+)\)$/);
    return match ? { cleanTitle: match[1], countText: match[2] } : { cleanTitle: label, countText: null };
  }

  const openSubmissionsCount = submissions.filter(
    (s) => !s.status || s.status === "pending" || s.status === "in_progress"
  ).length;

  const tabGroups = [
    {
      group: "Umum & Konten",
      shortLabel: "Umum",
      icon: Layout,
      badgeCount: null,
      tabs: [
        { id: "overview", label: "Ringkasan Panel", icon: LayoutDashboard },
        { id: "identity", label: "Brand & Menu", icon: Layout },
        { id: "hero", label: "Beranda & 4 Pilar", icon: Compass },
        { id: "about", label: "Tentang & Visi", icon: FileText },
        { id: "org", label: "Pengurus & Divisi", icon: Users },
        { id: "gallery", label: "Dokumentasi", icon: Camera },
      ],
    },
    {
      group: "Warga & Keuangan",
      shortLabel: "Warga",
      icon: Users2,
      badgeCount: (openSubmissionsCount > 0 || pendingMembersCount > 0) ? (openSubmissionsCount + pendingMembersCount) : null,
      tabs: [
        { id: "submissions", label: `Kotak Masuk (${openSubmissionsCount})`, icon: Inbox },
        { id: "member_registrations", label: `Verifikasi Anggota (${pendingMembersCount})`, icon: UserCheck },
        { id: "members_db", label: `Database Anggota (${membersList.length})`, icon: Users2 },
        { id: "member_kas", label: "Catat Uang Kas", icon: DollarSign },
        { id: "jasra_panel", label: "Voucher Jasra", icon: HeartHandshake },
        { id: "kas_db", label: "Keuangan", icon: Landmark },
      ],
    },
    {
      group: "Event & Bansos",
      shortLabel: "Event",
      icon: Ticket,
      badgeCount: (doorprizeTickets.length + eventsList.length + bansosClaims.length) > 0
        ? (doorprizeTickets.length + eventsList.length + bansosClaims.length)
        : null,
      tabs: [
        { id: "doorprize_db", label: `Undian Senam (${doorprizeTickets.length})`, icon: Dices },
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
    const isTransfer = txTypeUpper === "TRANSFER";
    const txWalletText = (tx.wallet || tx.responsible || tx.title || "").toLowerCase();
    const isDarren = tx.wallet === "Darren" || txWalletText.includes("darren");
    const isOita = !isDarren;

    if (kasFilterType === "INCOME" && txTypeUpper !== "INCOME") return false;
    if (kasFilterType === "EXPENSE" && txTypeUpper !== "EXPENSE") return false;
    if (kasFilterType === "TRANSFER" && !isTransfer) return false;
    if (kasFilterType === "OITA" && !isOita && !isTransfer) return false;
    if (kasFilterType === "DARREN" && !isDarren && !isTransfer) return false;

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

  const isMemberVoucherActive = (m) => {
    if (activeBatchJasraDists.length > 0) {
      const dist = findMemberJasraDistribution(activeBatchJasraDists, m);
      if (dist) return !calculateRecipientRemaining(dist, activeJasraBatch).isExpired;
      return false;
    }
    return getMemberVoucherSubscription(m, new Date(), activeJasraBatch).isActive;
  };

  const totalVoucherActiveCount = approvedMembersList.filter((m) => isMemberVoucherActive(m)).length;
  const totalVoucherReadyCount = approvedMembersList.length - totalVoucherActiveCount;
  const approvedHudPhotosCount = approvedMembersList.filter((m) => Boolean(m.statusPhoto)).length;

  // Dynamic unique Job & Afiliasi filter options from approved members
  const { jobFilterOptions, gangFilterOptions } = (() => {
    const jobMap = new Map();
    const gangMap = new Map();
    let emptyJobCount = 0;
    let emptyGangCount = 0;

    approvedMembersList.forEach((m) => {
      const rawJob = String(m.statusJob || "").trim();
      if (rawJob) {
        const key = rawJob.toLowerCase();
        const prev = jobMap.get(key);
        jobMap.set(key, { label: prev ? prev.label : rawJob, count: (prev?.count || 0) + 1 });
      } else {
        emptyJobCount++;
      }

      const rawGang = String(m.statusGang || "").trim();
      if (rawGang) {
        const key = rawGang.toLowerCase();
        const prev = gangMap.get(key);
        gangMap.set(key, { label: prev ? prev.label : rawGang, count: (prev?.count || 0) + 1 });
      } else {
        emptyGangCount++;
      }
    });

    const sortedJobs = Array.from(jobMap.entries())
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .map(([key, info]) => ({ value: key, label: `${info.label} (${info.count})` }));

    const sortedGangs = Array.from(gangMap.entries())
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .map(([key, info]) => ({ value: key, label: `${info.label} (${info.count})` }));

    const jOpts = [
      { value: "all", label: `Semua Pekerjaan (${approvedMembersList.length})` },
      ...sortedJobs,
      ...(emptyJobCount > 0 ? [{ value: "__EMPTY__", label: `Belum Diisi (${emptyJobCount})` }] : []),
    ];
    const gOpts = [
      { value: "all", label: `Semua Afiliasi / Gang (${approvedMembersList.length})` },
      ...sortedGangs,
      ...(emptyGangCount > 0 ? [{ value: "__EMPTY__", label: `Belum Diisi (${emptyGangCount})` }] : []),
    ];

    return { jobFilterOptions: jOpts, gangFilterOptions: gOpts };
  })();

  const filteredMembers = approvedMembersList.filter((m) => {
    // 1. Text Search Filter
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase();
      const name = (m.fullName || "").toLowerCase();
      const ic = (m.icNumber || "").toLowerCase();
      const phone = (m.phone || "").toLowerCase();
      const discord = (m.discordTag || "").toLowerCase();
      const job = (m.statusJob || "").toLowerCase();
      const gang = (m.statusGang || "").toLowerCase();
      if (
        !name.includes(q) &&
        !ic.includes(q) &&
        !phone.includes(q) &&
        !discord.includes(q) &&
        !job.includes(q) &&
        !gang.includes(q)
      ) {
        return false;
      }
    }

    // 2. Filter Kas Subscription Status
    const kasSub = getMemberKasSubscription(m);
    if (filterKas === "active" && !kasSub.isActive) return false;
    if (filterKas === "unpaid" && kasSub.isActive) return false;

    // 3. Filter Voucher Status
    const isVActive = isMemberVoucherActive(m);
    if (filterVoucher === "active" && !isVActive) return false;
    if (filterVoucher === "ready" && isVActive) return false;

    // 4. Filter Job (Pekerjaan IC)
    if (filterJob !== "all") {
      const mJob = String(m.statusJob || "").trim().toLowerCase();
      if (filterJob === "__EMPTY__" ? mJob !== "" : mJob !== filterJob) return false;
    }

    // 5. Filter Afiliasi / Gang
    if (filterGang !== "all") {
      const mGang = String(m.statusGang || "").trim().toLowerCase();
      if (filterGang === "__EMPTY__" ? mGang !== "" : mGang !== filterGang) return false;
    }

    return true;
  });

  const filteredPendingMembers = pendingMembersList.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    const name = (m.fullName || "").toLowerCase();
    const ic = (m.icNumber || "").toLowerCase();
    const phone = (m.phone || "").toLowerCase();
    const discord = (m.discordTag || "").toLowerCase();
    return name.includes(q) || ic.includes(q) || phone.includes(q) || discord.includes(q);
  });

  const filteredDismissedMembers = dismissedMembersList.filter((m) => {
    if (!dismissedSearchQuery.trim()) return true;
    const q = dismissedSearchQuery.toLowerCase().trim();
    const name = (m.fullName || "").toLowerCase();
    const ic = (m.icNumber || "").toLowerCase();
    const phone = (m.phone || "").toLowerCase();
    const reason = (m.dismissedReason || "").toLowerCase();
    const by = (m.dismissedBy || "").toLowerCase();
    return name.includes(q) || ic.includes(q) || phone.includes(q) || reason.includes(q) || by.includes(q);
  });

  const filteredKasMembers = approvedMembersList.filter((m) => {
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
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-8 py-2.5 sm:py-3.5 border-b-2 border-black dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1A1D26] shadow-[0_2px_0px_#000]/10">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#DC2626] border border-black/20 dark:border-white/15 flex items-center justify-center text-white shadow-xs shrink-0">
            <Shield size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-xs sm:text-base uppercase tracking-tight text-slate-950 dark:text-slate-100 truncate">
                <span className="sm:hidden">Admin PPS</span>
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
            <>
              <div
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-black/20 dark:border-amber-700/60 text-[11px] sm:text-xs font-heading font-black text-slate-900 dark:text-amber-200 max-w-[115px] sm:max-w-[210px] min-h-[36px]"
                title={`Masuk sebagai: ${activeAdminName}${currentAdmin?.role ? ` (${currentAdmin.role})` : ""}`}
              >
                <User size={13} className="text-[#DC2626] dark:text-[#FACC15] shrink-0" />
                <span className="truncate">{activeAdminName}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari sesi admin"
                aria-label="Logout"
                className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[36px] min-w-[36px] text-xs font-heading font-black bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg border border-black/20 dark:border-rose-500/60 shadow-xs transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                <LogOut size={14} className="text-rose-600 dark:text-rose-300" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel"
            className="py-1.5 px-2.5 sm:px-3 min-h-[36px] min-w-[36px] bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-900 dark:text-red-200 text-xs font-heading font-black border border-black/20 dark:border-white/15 shadow-xs flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer rounded-lg"
            title="Tutup Panel Admin dan kembali ke website utama"
          >
            <span className="hidden sm:inline">Tutup Panel</span>
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Full Viewport Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
          {!isAuthenticated ? (
            /* Login & Pengurus Onboarding Screen (Safe scroll on mobile & keyboard open) */
            <div className="flex-1 overflow-y-auto px-3.5 py-5 sm:p-6 flex flex-col items-center">
              <div className="my-auto card-brutal p-5 sm:p-7 bg-white dark:bg-[#1A1D26] border border-black/20 dark:border-white/15 max-w-sm w-full rounded-2xl text-center flex flex-col items-center shadow-xl">
                <div className="w-12 h-12 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-[#111827] mb-3 shadow-sm">
                  {loginStep === "onboarding" ? (
                    <UserPlus size={22} className="text-[#DC2626]" />
                  ) : (
                    <Lock size={22} className="text-[#DC2626]" />
                  )}
                </div>

                {loginStep === "onboarding" ? (
                  <>
                    <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-100 mb-1">
                      Aktivasi Akun Pengurus
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                      Kode Akses Utama cocok. Buat akun IC pribadi Anda agar setiap ACC, kas, dan verifikasi tercatat atas nama Anda.
                    </p>

                    <form onSubmit={handleCompleteOnboarding} className="w-full flex flex-col gap-3 text-left">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Nama IC Pengurus <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="text"
                          value={onboardingForm.name}
                          onChange={(e) => setOnboardingForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Contoh: Oita, Darren, Ray Fullbuster"
                          autoFocus
                          required
                          className="input-field text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Jabatan <span className="text-slate-400 font-normal normal-case">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={onboardingForm.role}
                          onChange={(e) => setOnboardingForm((prev) => ({ ...prev, role: e.target.value }))}
                          placeholder="Contoh: Ketua, Bendahara, Humas"
                          className="input-field text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Password Pribadi <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showOnboardingPassword ? "text" : "password"}
                            value={onboardingForm.password}
                            onChange={(e) => setOnboardingForm((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Minimal 4 karakter..."
                            required
                            className="input-field w-full pr-9 font-mono text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOnboardingPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            aria-label={showOnboardingPassword ? "Sembunyikan password" : "Lihat password"}
                          >
                            {showOnboardingPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          PIN Pribadi (4-6 Digit Angka) <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showOnboardingPin ? "text" : "password"}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={onboardingForm.pin}
                            onChange={(e) =>
                              setOnboardingForm((prev) => ({
                                ...prev,
                                pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                              }))
                            }
                            placeholder="Contoh: 123456"
                            required
                            className="input-field w-full pr-9 font-mono text-sm tracking-widest bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOnboardingPin((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            aria-label={showOnboardingPin ? "Sembunyikan PIN" : "Lihat PIN"}
                          >
                            {showOnboardingPin ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none pt-0.5">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border border-black/20 dark:border-white/15 accent-[#DC2626] cursor-pointer"
                        />
                        <span>Ingat saya di browser ini</span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSubmittingAuth}
                        className="btn w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white border border-black/20 dark:border-white/15 font-black shadow-sm mt-1"
                      >
                        {isSubmittingAuth ? "Menyimpan Akun..." : "Buat Akun & Masuk Panel"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep("login");
                          setPasswordInput("");
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline text-center py-1 cursor-pointer"
                      >
                        Kembali ke Login
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 className="font-heading font-black text-lg text-slate-950 dark:text-slate-100 mb-1">
                      Autentikasi Pengelola Portal
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-4">
                      {adminAccounts.length === 0 || selectedLoginAccountId === "__NEW__"
                        ? "Masukkan Password atau PIN Utama untuk aktivasi akun IC pengurus Anda."
                        : "Pilih akun pengurus lalu masukkan Password atau PIN pribadi Anda."}
                    </p>

                    {isAdminAccountsLoaded && adminAccounts.length === 0 && (
                      <div className="w-full mb-3.5 p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-400/70 text-left text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                        <strong className="font-heading block text-xs mb-0.5">Sistem Akun Pengurus Baru</strong>
                        Masukkan Password/PIN admin lama (1-untuk-semua) di bawah, lalu Anda akan diarahkan membuat akun IC pribadi.
                      </div>
                    )}

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
                      {adminAccounts.length > 0 && (() => {
                        const activeValue = selectedLoginAccountId || (adminAccounts[0]?.id || "__NEW__");
                        const activeAcc =
                          activeValue === "__NEW__"
                            ? null
                            : adminAccounts.find((a) => a.id === activeValue) || adminAccounts[0];
                        return (
                          <div className="flex flex-col gap-1 text-left" ref={accountDropdownRef}>
                            <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Akun Pengurus
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                disabled={lockoutState.isLocked}
                                onClick={() => setIsAccountDropdownOpen((v) => !v)}
                                aria-haspopup="listbox"
                                aria-expanded={isAccountDropdownOpen}
                                className={`w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border transition-all cursor-pointer disabled:opacity-50 ${
                                  isAccountDropdownOpen
                                    ? "border-[#FACC15] ring-3 ring-[#FACC15]/25 shadow-sm"
                                    : "border-black/15 dark:border-white/15 hover:border-amber-400/80 shadow-xs"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {activeValue === "__NEW__" ? (
                                    <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 flex items-center justify-center shrink-0">
                                      <UserPlus size={14} />
                                    </span>
                                  ) : (
                                    <span className="w-7 h-7 rounded-lg bg-[#FACC15]/90 text-slate-950 border border-amber-500/50 flex items-center justify-center font-heading font-black text-xs shrink-0">
                                      {(activeAcc?.name || "A").slice(0, 1).toUpperCase()}
                                    </span>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-xs sm:text-sm font-bold truncate leading-tight">
                                      {activeValue === "__NEW__"
                                        ? "Aktivasi Pengurus Baru"
                                        : activeAcc?.name || "Pilih Akun"}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                      {activeValue === "__NEW__"
                                        ? "Pakai Kode Akses Utama"
                                        : activeAcc?.role || "Pengurus LSM"}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                                    isAccountDropdownOpen
                                      ? "rotate-180 bg-[#FACC15] text-slate-950"
                                      : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  <ChevronDown size={14} strokeWidth={2.5} />
                                </span>
                              </button>

                              {isAccountDropdownOpen && (
                                <div
                                  role="listbox"
                                  className="absolute left-0 top-full mt-1.5 w-full z-50 rounded-xl bg-white dark:bg-[#1B1E29] border border-amber-400/80 dark:border-amber-500/40 shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                                >
                                  {adminAccounts.map((acc) => {
                                    const isSelected = activeValue === acc.id;
                                    return (
                                      <button
                                        key={acc.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                          setSelectedLoginAccountId(acc.id);
                                          setPasswordInput("");
                                          setIsAccountDropdownOpen(false);
                                        }}
                                        className={`w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3 py-2 text-left border-b border-black/5 dark:border-white/5 last:border-b-0 transition-colors cursor-pointer ${
                                          isSelected
                                            ? "bg-amber-50 dark:bg-amber-500/15 text-slate-950 dark:text-amber-200"
                                            : "text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <span
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-heading font-black text-xs shrink-0 ${
                                              isSelected
                                                ? "bg-[#FACC15] text-slate-950 border border-amber-500/60"
                                                : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                                            }`}
                                          >
                                            {(acc.name || "A").slice(0, 1).toUpperCase()}
                                          </span>
                                          <div className="min-w-0">
                                            <div className="text-xs font-bold truncate leading-tight">
                                              {acc.name}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                              {acc.role || "Pengurus LSM"}
                                            </div>
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <span className="w-5 h-5 rounded-full bg-[#FACC15] text-slate-950 flex items-center justify-center shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}

                                  {allowMasterOnboarding && (
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected={activeValue === "__NEW__"}
                                      onClick={() => {
                                        setSelectedLoginAccountId("__NEW__");
                                        setPasswordInput("");
                                        setIsAccountDropdownOpen(false);
                                      }}
                                      className={`w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3 py-2 text-left border-t border-black/10 dark:border-white/10 transition-colors cursor-pointer ${
                                        activeValue === "__NEW__"
                                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200"
                                          : "bg-slate-50/70 dark:bg-white/[0.03] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 flex items-center justify-center shrink-0">
                                          <UserPlus size={14} />
                                        </span>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold truncate leading-tight">
                                            Aktivasi Pengurus Baru
                                          </div>
                                          <div className="text-[10px] opacity-80 truncate leading-tight mt-0.5">
                                            Daftar pakai Kode Akses Utama
                                          </div>
                                        </div>
                                      </div>
                                      {activeValue === "__NEW__" && (
                                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                          <Check size={12} strokeWidth={3} />
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-heading font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {adminAccounts.length === 0 || selectedLoginAccountId === "__NEW__"
                            ? loginMode === "pin"
                              ? "PIN Utama (Aktivasi)"
                              : "Password Utama (Aktivasi)"
                            : loginMode === "pin"
                            ? "Kode PIN Pribadi"
                            : "Password Pribadi"}
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
                            adminAccounts.length === 0 || selectedLoginAccountId === "__NEW__"
                              ? loginMode === "pin"
                                ? "Masukkan PIN admin lama..."
                                : "Masukkan password admin lama..."
                              : loginMode === "pin"
                              ? "Masukkan 4-6 digit PIN Anda..."
                              : "Masukkan password pribadi..."
                          }
                          disabled={lockoutState.isLocked}
                          autoFocus
                          className="input-field text-center font-mono text-sm tracking-widest bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 shadow-xs disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-slate-800"
                        />
                      </div>

                      <label className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none py-0.5">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={lockoutState.isLocked}
                          className="w-4 h-4 rounded border border-black/20 dark:border-white/15 accent-[#DC2626] cursor-pointer"
                        />
                        <span>Ingat saya di browser ini</span>
                      </label>

                      <button
                        type="submit"
                        disabled={lockoutState.isLocked || isSubmittingAuth}
                        className="btn w-full py-2.5 bg-[#FACC15] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-[#111827] border border-black/20 dark:border-white/15 font-black shadow-sm"
                      >
                        {lockoutState.isLocked
                          ? `Terkunci (${lockoutState.remainingSeconds}s)`
                          : isSubmittingAuth
                          ? "Memverifikasi..."
                          : adminAccounts.length === 0 || selectedLoginAccountId === "__NEW__"
                          ? "Lanjut Aktivasi Akun"
                          : "Masuk ke Panel"}
                      </button>

                      {/* Toggle Link below: Login menggunakan PIN / Login menggunakan Password */}
                      <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col items-center gap-1">
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

                        {allowMasterOnboarding && adminAccounts.length > 0 && selectedLoginAccountId !== "__NEW__" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLoginAccountId("__NEW__");
                              setPasswordInput("");
                            }}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer py-0.5"
                          >
                            <UserPlus size={12} />
                            <span>Pengurus baru? Aktivasi pakai Kode Utama</span>
                          </button>
                        )}
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Authenticated Dashboard */
            <>
              {/* SPLIT WORKSPACE: Left Sidebar (Desktop) + Right Content Area (Mobile/Desktop) */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                {/* DESKTOP SIDEBAR KIRI (md:flex) */}
                <aside className="hidden md:flex w-64 lg:w-72 shrink-0 bg-[#FFFDF9] dark:bg-[#161822] border-r border-black/15 dark:border-white/10 flex-col justify-between overflow-y-auto z-10 shadow-[3px_0px_0px_rgba(0,0,0,0.08)]">
                  <div className="p-3.5 space-y-1.5">
                    {/* Sidebar Header Title */}
                    <div className="px-2.5 py-1.5 mb-1.5 bg-black/5 dark:bg-white/5 rounded border border-black/10 dark:border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-heading font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                        Menu Navigasi
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-black px-1.5 py-0.5 rounded border border-black shadow-xs">
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
                              const { cleanTitle, countText } = parseTabLabel(tab.label);

                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setActiveTab(tab.id)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-black/15 dark:border-white/10 font-heading font-black text-xs transition-all text-left cursor-pointer ${
                                    isActive
                                      ? "bg-[#FACC15] text-[#111827] shadow-sm -translate-y-0.5 border-black ring-1 ring-black/20"
                                      : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 shadow-xs"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Icon size={15} className={isActive ? "text-[#DC2626]" : "text-slate-600 dark:text-slate-400"} />
                                    <span className="truncate">{cleanTitle}</span>
                                  </div>
                                  {Boolean(countText) && (
                                    <span
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-black shadow-xs ${
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
                    <span>LSM PPS Sandy Shores</span>
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
                        <div className="w-7 h-7 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-[#111827] shadow-xs shrink-0">
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
                        className="px-2.5 py-1.5 bg-[#FACC15] hover:bg-amber-400 text-slate-950 text-xs font-heading font-black rounded border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 shrink-0 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
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
                        const { cleanTitle, countText } = parseTabLabel(tab.label);

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-md shrink-0 border-2 font-heading font-black transition-all cursor-pointer min-h-[34px] ${
                              isActive
                                ? "bg-slate-900 text-white border-black shadow-xs -translate-y-0.5"
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
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
                <div className="max-w-7xl mx-auto w-full min-w-0 flex flex-col gap-4 sm:gap-6">

                  {/* Tab 0: Ringkasan Panel (Overview Operasional Pengurus) */}
                  <Suspense
                    fallback={
                      <div className="p-8 text-center text-xs font-mono text-slate-500">
                        Memuat modul panel admin...
                      </div>
                    }
                  >
                  {activeTab === "overview" && (
                    <AdminOverviewTab
                      activeAdminName={activeAdminName}
                      currentAdmin={currentAdmin}
                      pendingMembersCount={pendingMembersCount}
                      submissions={submissions}
                      approvedMembersList={approvedMembersList}
                      totalKasActiveCount={totalKasActiveCount}
                      totalKasExpiringCount={totalKasExpiringCount}
                      totalVoucherActiveCount={totalVoucherActiveCount}
                      bansosClaims={bansosClaims}
                      kasSummary={kasSummary}
                      kasTransactions={kasTransactions}
                      activityLogs={activityLogs}
                      formatCurrency={formatCurrency}
                      formatKasDate={formatKasDate}
                      setActiveTab={setActiveTab}
                      setKasMemberStatusFilter={setKasMemberStatusFilter}
                      setIsKasExpenseModalOpen={setIsKasExpenseModalOpen}
                    />
                  )}

                  {/* Tab 1: Identity */}
                  {activeTab === "identity" && (
                    <div className="flex flex-col gap-4">
                      {/* Brand Name */}
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2">
                        <label className="card-label text-slate-700 dark:text-slate-300">Nama Brand / Judul Navbar</label>
                        <input
                          type="text"
                          value={formData.brand || ""}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>

                      {/* Discord Links Settings Card */}
                      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b-2 border-black/10 dark:border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#5865F2] text-white flex items-center justify-center border border-black shadow-xs">
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
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <label className="card-label text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-1.5">
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
                            className="input-field text-xs sm:text-sm font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Mengatur tautan invite server Discord resmi. Otomatis mengubah pintasan <code>/discord</code> & <code>#discord</code>, tombol Discord di Footer, dan tombol ajakan di akhir pendaftaran anggota.
                          </span>
                        </div>

                        {/* Input 2: Discord Visitor / Layanan Lapak & Audiensi */}
                        <div className="flex flex-col gap-1.5 pt-3 border-t border-black/10 dark:border-white/10">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <label className="card-label text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-1.5">
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
                            className="input-field text-xs sm:text-sm font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Mengatur channel visitor untuk pemohon stan lapak UMKM dan permohonan audiensi meeting. Tampil pada tiket bukti pendaftaran dan tombol pelacakan status tiket.
                          </span>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2">
                        <label className="card-label text-slate-700 dark:text-slate-300">Link Navigasi Navbar (Format: Nama | URL, pisahkan koma)</label>
                        <input
                          type="text"
                          value={formData.navLinks || ""}
                          onChange={(e) => handleNavLinksChange(e.target.value)}
                          className="input-field text-xs font-mono bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2">
                    <label className="card-label text-slate-700 dark:text-slate-300">
                      Slogan / Kalimat Penggerak (Bawah Banner)
                    </label>
                    <input
                      type="text"
                      value={formData.subtext || ""}
                      onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                      placeholder="Bersatu • Berkarya • Untuk Masyarakat Sandy Shores"
                      className="input-field text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                          className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2"
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
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
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
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                          className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2"
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
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                              className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 leading-relaxed"
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
                              className="input-field w-full text-xs font-bold py-1 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Visi & Misi Komunitas */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
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
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                          className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                        className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 leading-relaxed"
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
                          className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] text-[#111827] border border-black/20 dark:border-white/15 shadow-xs"
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
                        className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                              className="input-field flex-1 text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMissionItem(mIdx)}
                              className="btn btn-secondary text-xs py-1 px-2 border border-black/20 dark:border-white/15 text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626] hover:text-white shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Naskah Pendirian & Dokumen LSM */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2.5">
                    <label className="card-label text-slate-700 dark:text-slate-300">
                      Judul Akordion / Bar Dokumen
                    </label>
                    <input
                      type="text"
                      value={formData.charterTitle || ""}
                      onChange={(e) => setFormData({ ...formData, charterTitle: e.target.value })}
                      placeholder="Naskah Pendirian & Penjelasan Lengkap LSM"
                      className="input-field text-xs font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                    />

                    <label className="card-label text-slate-700 dark:text-slate-300 mt-2">
                      Naskah Pendirian & Penjelasan Lengkap LSM (Pisahkan antar paragraf dengan 2 enter)
                    </label>
                    <textarea
                      rows={8}
                      value={formData.aboutText || ""}
                      onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
                      className="input-field text-xs leading-relaxed bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Organization */}
              {activeTab === "org" && (
                <div className="flex flex-col gap-3.5">
                  {/* Card: Kustomisasi Label & Nama Tingkatan Bagan Struktur */}
                  <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-black/15 dark:border-white/10">
                      <GitBranch size={16} className="text-[#DC2626] dark:text-[#FACC15]" />
                      <span className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                        Judul &amp; Label Tingkatan Bagan Struktur
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Tingkat 1 (Pimpinan Puncak)
                        </label>
                        <input
                          type="text"
                          placeholder="Dewan Pimpinan Pusat (DPP)"
                          value={formData.orgTierTitles?.tier1 || ""}
                          onChange={(e) => handleTierTitleChange("tier1", e.target.value)}
                          className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Tingkat 2 (MPO / Penasihat)
                        </label>
                        <input
                          type="text"
                          placeholder="Majelis Pertimbangan Organisasi (MPO)"
                          value={formData.orgTierTitles?.tier2Left || ""}
                          onChange={(e) => handleTierTitleChange("tier2Left", e.target.value)}
                          className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Tingkat 3 (Wakil Ketua Umum)
                        </label>
                        <input
                          type="text"
                          placeholder="Wakil Ketua Umum"
                          value={formData.orgTierTitles?.tier2Right || ""}
                          onChange={(e) => handleTierTitleChange("tier2Right", e.target.value)}
                          className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Tingkat 4 (BPH &amp; Divisi)
                        </label>
                        <input
                          type="text"
                          placeholder="Badan Pengurus Harian (BPH)"
                          value={formData.orgTierTitles?.tier3 || ""}
                          onChange={(e) => handleTierTitleChange("tier3", e.target.value)}
                          className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Tingkat 5 (Satgas &amp; Wilayah)
                        </label>
                        <input
                          type="text"
                          placeholder="Koordinator Daerah (Korda) & Komando Satgas"
                          value={formData.orgTierTitles?.tier4 || ""}
                          onChange={(e) => handleTierTitleChange("tier4", e.target.value)}
                          className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                    <div>
                      <span className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200 block">
                        Daftar Pengurus &amp; Divisi ({formData.org?.length || 0} Posisi)
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        Kelola struktur pimpinan, kepala divisi, dan staf tim
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenAddDivisionModal}
                        className="btn text-xs py-1.5 px-3.5 bg-[#FACC15] hover:bg-yellow-400 text-[#111827] font-black border border-black/20 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        title="Tambah divisi baru dengan panduan template & jabatan"
                      >
                        <Plus size={14} className="text-[#DC2626]" />
                        <span>Tambah Divisi</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="btn text-xs py-1.5 px-2.5 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-black/15 dark:border-white/10 shadow-xs flex items-center gap-1 cursor-pointer"
                        title="Tambah baris jabatan manual kosong"
                      >
                        <Plus size={13} />
                        <span>Baris Manual</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formData.org?.map((member, idx) => (
                      <div
                        key={idx}
                        className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-black/10 dark:border-white/10">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="card-label text-[11px] font-black text-slate-900 dark:text-slate-100 truncate">
                              #{idx + 1} {member.role || "Jabatan Belum Diisi"}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold shrink-0">
                              {Number(member.level) === 1
                                ? "Tingkat 1 (Pimpinan)"
                                : Number(member.level) === 2
                                ? "Tingkat 2 (Penasihat)"
                                : Number(member.level) === 3
                                ? "Tingkat 3 (Wakil)"
                                : Number(member.level) === 4
                                ? "Tingkat 4 (BPH / Divisi)"
                                : "Tingkat 5 (Satgas / Korda)"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="btn btn-secondary text-xs py-1 px-2 border border-black/20 dark:border-white/15 text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626] hover:text-white"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Urutan Tampilan
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={member.level || 1}
                              onChange={(e) => handleMemberChange(idx, "level", e.target.value)}
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                              className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                              className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Deskripsi / Tugas Jabatan (Teks di Bawah Nama)
                          </label>
                          <input
                            type="text"
                            placeholder="Biarkan kosong untuk deskripsi otomatis atau ketik deskripsi khusus..."
                            value={member.desc || ""}
                            onChange={(e) => handleMemberChange(idx, "desc", e.target.value)}
                            className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
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
                                className="w-8 h-8 rounded object-cover border border-black/20 dark:border-white/15"
                              />
                            )}
                          </div>
                        </div>

                        {/* Subordinate Staff / Anggota Tim Manager */}
                        <div className="mt-2 pt-2.5 border-t border-black/15 dark:border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-heading font-black text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                              <Users size={13} className="text-[#DC2626] dark:text-[#FACC15]" />
                              <span>
                                Anggota Tim / Staf Divisi (
                                {Array.isArray(member.subMembers)
                                  ? member.subMembers.length
                                  : getSubMembers(member).length}
                                )
                              </span>
                            </label>
                            <div className="flex items-center gap-1.5">
                              {(Array.isArray(member.subMembers)
                                ? member.subMembers.length
                                : getSubMembers(member).length) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleClearAllSubMembers(idx)}
                                  className="btn text-[10px] py-1 px-2 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-400 font-bold cursor-pointer hover:bg-red-200"
                                  title="Hapus semua staf dari divisi ini sehingga tidak memiliki staf"
                                >
                                  Kosongkan Staf
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAddSubMember(idx)}
                                className="btn text-[10px] py-1 px-2.5 bg-[#FACC15] text-[#111827] border border-black shadow-xs font-black cursor-pointer"
                              >
                                + Tambah Staf
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {(Array.isArray(member.subMembers)
                              ? member.subMembers
                              : getSubMembers(member)
                            ).map((sub, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2 rounded-lg bg-slate-50 dark:bg-[#1A1D26] border border-black/20 dark:border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                              >
                                {/* Sub Member Photo Upload */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-9 h-9 rounded border border-black dark:border-white/20 overflow-hidden bg-slate-200 dark:bg-[#20232E] shrink-0 flex items-center justify-center">
                                    {sub.photo ? (
                                      <img
                                        src={sub.photo}
                                        alt={sub.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                        {(sub.name || "ST").slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <label className="cursor-pointer text-[10px] font-bold py-1 px-2 rounded bg-white dark:bg-[#222634] border border-black dark:border-white/20 hover:bg-[#FACC15] hover:text-black">
                                    Foto
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        handleSubMemberPhoto(idx, sIdx, e.target.files[0])
                                      }
                                    />
                                  </label>
                                </div>

                                {/* Sub Member Name & Role Input */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Nama Staf"
                                    value={sub.name || ""}
                                    onChange={(e) =>
                                      handleSubMemberChange(idx, sIdx, "name", e.target.value)
                                    }
                                    className="input-field text-xs py-1 px-2 bg-white dark:bg-[#20232E] border border-black/30 dark:border-white/20"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Jabatan Staf (contoh: Staf Gudang)"
                                    value={sub.role || ""}
                                    onChange={(e) =>
                                      handleSubMemberChange(idx, sIdx, "role", e.target.value)
                                    }
                                    className="input-field text-xs py-1 px-2 bg-white dark:bg-[#20232E] border border-black/30 dark:border-white/20"
                                  />
                                </div>

                                {/* Delete Sub Member */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubMember(idx, sIdx)}
                                  className="btn btn-secondary text-xs p-1.5 border border-black text-[#DC2626] hover:bg-[#DC2626] hover:text-white shrink-0 self-end sm:self-center cursor-pointer"
                                  title="Hapus Staf"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
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
                      className="btn text-xs py-1.5 px-3 bg-[#FACC15] text-[#111827] border border-black/20 dark:border-white/15 shadow-xs"
                    >
                      <Plus size={14} className="text-[#DC2626]" />
                      <span>Tambah Foto</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {formData.gallery?.map((item, idx) => (
                      <div
                        key={idx}
                        className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="card-label text-[11px] text-slate-700 dark:text-slate-300">
                            Dokumentasi #{formData.gallery.length - idx}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGallery(idx)}
                            className="btn btn-secondary text-xs py-1 px-2 border border-black/20 dark:border-white/15 text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626] hover:text-white"
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
                            className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                            className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 leading-relaxed"
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
                            className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-heading font-bold text-slate-700 dark:text-slate-300">
                              Foto Dokumentasi ({getGalleryItemPhotos(item).length} Foto)
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <label className="cursor-pointer text-[10px] font-heading font-black py-1 px-2 rounded bg-[#FACC15] text-[#111827] border border-black/20 dark:border-white/15 shadow-xs hover:bg-[#EAB308] flex items-center gap-1 active:translate-x-0.5">
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
                                className="cursor-pointer text-[10px] font-heading font-black py-1 px-2 rounded bg-white dark:bg-[#161822] text-[#111827] dark:text-slate-200 border border-black/20 dark:border-white/15 dark:border-slate-500 shadow-xs hover:bg-slate-100 flex items-center gap-1 active:translate-x-0.5"
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
                                  className="relative group w-16 h-14 rounded overflow-hidden border border-black/15 dark:border-white/10 shrink-0 bg-black"
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
                <AdminSubmissionsTab
                  submissions={submissions}
                  submissionFilter={submissionFilter}
                  setSubmissionFilter={setSubmissionFilter}
                  handleUpdateSubmissionStatus={handleUpdateSubmissionStatus}
                  handleUpdateSubmissionNote={handleUpdateSubmissionNote}
                  handleDeleteSubmission={handleDeleteSubmission}
                  setPreviewKtp={setPreviewKtp}
                />
              )}

              {/* Tab: Verifikasi Anggota Baru (member_registrations) */}
              {activeTab === "member_registrations" && (
                <div className="flex flex-col gap-4">
                  {/* Top Header Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151824] border border-black/10 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-400/90 border border-amber-500/50 flex items-center justify-center text-slate-900 shadow-sm shrink-0">
                        <UserCheck size={20} className="text-slate-900" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                            Verifikasi Pendaftaran Anggota Baru
                          </h4>
                          {pendingRegistrationsCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              {pendingRegistrationsCount} Menunggu Tindakan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Tinjau berkas pendaftaran calon anggota: Foto Profil IC, Dokumen KTP IC, dan Screenshot Status HUD IC.
                        </p>
                      </div>
                    </div>

                    {/* Stats Counter Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <div className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5 shadow-xs">
                        <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                        <span>Menunggu: {pendingRegistrationsCount}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-1.5 shadow-xs">
                        <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Resmi: {approvedRegistrationsCount}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 font-bold flex items-center gap-1.5 shadow-xs">
                        <X size={13} className="text-red-600 dark:text-red-400" />
                        <span>Ditolak: {rejectedRegistrationsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs and Search Bar */}
                  <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151824] border border-black/10 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setMemberRegFilterTab("PENDING")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                          memberRegFilterTab === "PENDING"
                            ? "bg-[#FACC15] text-slate-950 shadow-sm border border-amber-400/80 font-black"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10"
                        }`}
                      >
                        <Clock size={13} />
                        <span>Menunggu Verifikasi ({pendingRegistrationsCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberRegFilterTab("ALL")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                          memberRegFilterTab === "ALL"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm border border-black/20 dark:border-white/20 font-black"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10"
                        }`}
                      >
                        <Users2 size={13} />
                        <span>Semua Pendaftar ({membersList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberRegFilterTab("APPROVED")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                          memberRegFilterTab === "APPROVED"
                            ? "bg-emerald-500 text-white shadow-sm border border-emerald-600 font-black"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10"
                        }`}
                      >
                        <Check size={13} />
                        <span>Disetujui ({approvedRegistrationsCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberRegFilterTab("REJECTED")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                          memberRegFilterTab === "REJECTED"
                            ? "bg-red-500 text-white shadow-sm border border-red-600 font-black"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10"
                        }`}
                      >
                        <X size={13} />
                        <span>Ditolak ({rejectedRegistrationsCount})</span>
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-80">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder="Cari nama IC, CID, HP, Discord, Job..."
                        value={memberRegSearchQuery}
                        onChange={(e) => setMemberRegSearchQuery(e.target.value)}
                        className="input-field w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-[#161820] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-400"
                      />
                      {memberRegSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMemberRegSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Applicants List */}
                  {memberRegistrationsList.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-[#151824] border border-black/10 dark:border-white/10 rounded-2xl space-y-2 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400">
                        <Users2 size={24} />
                      </div>
                      <h5 className="font-heading font-black text-sm uppercase text-slate-800 dark:text-slate-200">
                        Tidak Ada Data Pendaftaran
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {memberRegSearchQuery
                          ? `Tidak ditemukan berkas pendaftaran dengan kata kunci "${memberRegSearchQuery}".`
                          : memberRegFilterTab === "PENDING"
                          ? "Semua pendaftaran telah diverifikasi. Tidak ada berkas yang menunggu tindakan saat ini."
                          : "Belum ada berkas pendaftaran anggota pada kategori filter ini."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {memberRegistrationsList.map((applicant) => {
                        const isPending = applicant.status === "PENDING_VERIFIKASI";
                        const isApproved = !applicant.status || applicant.status === "APPROVED";
                        const isRejected = applicant.status === "REJECTED";
                        const applicantProfilePhoto = applicant.profilePhoto || applicant.photoUrl || applicant.avatarUrl || "";
                        const applicantKtpPhoto = applicant.icPhoto || applicant.ktpImage || applicant.ktpPhoto || applicant.ktpUrl || "";
                        const applicantStatusPhoto = applicant.statusPhoto || applicant.hudPhoto || "";

                        return (
                          <div
                            key={applicant.id}
                            className={`p-4 sm:p-5 bg-white dark:bg-[#151824] border rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-all ${
                              isPending
                                ? "border-amber-400/80 dark:border-amber-500/60 bg-amber-50/[0.04]"
                                : isRejected
                                ? "opacity-85 border-red-300/60 dark:border-red-900/40"
                                : "border-black/15 dark:border-white/10"
                            }`}
                          >
                            {/* Card Header: Profil, Nama IC, CID & Status Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
                              <div className="flex items-center gap-3">
                                {/* Small Avatar */}
                                <div
                                  className="w-12 h-12 rounded-full border border-black/15 dark:border-white/15 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer group relative shadow-xs"
                                  onClick={() => {
                                    if (applicantProfilePhoto) {
                                      setPreviewImageDetail({
                                        url: applicantProfilePhoto,
                                        title: `Foto Profil IC - ${applicant.fullName || "Anggota"}`,
                                        subtitle: `Citizen ID: ${applicant.icNumber || "-"}`,
                                      });
                                    }
                                  }}
                                  title={applicantProfilePhoto ? "Klik untuk perbesar foto profil" : "Foto Profil"}
                                >
                                  {applicantProfilePhoto ? (
                                    <>
                                      <img
                                        src={applicantProfilePhoto}
                                        alt={applicant.fullName}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                                        <Eye size={14} />
                                      </div>
                                    </>
                                  ) : (
                                    <User size={20} className="text-slate-400" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                                      {applicant.fullName || "Tanpa Nama IC"}
                                    </h4>
                                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-amber-300 border border-red-300 dark:border-red-900">
                                      CID: {applicant.icNumber || "-"}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>Tgl Daftar: {applicant.regDate || "-"}</span>
                                    {applicant.submittedAt && (
                                      <span>
                                        • Jam: {new Date(applicant.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="self-start sm:self-center">
                                {isPending ? (
                                  <span className="px-3 py-1 rounded-full text-[11px] font-heading font-black border border-amber-400 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 flex items-center gap-1.5 shadow-xs">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span>MENUNGGU VERIFIKASI</span>
                                  </span>
                                ) : isApproved ? (
                                  <span className="px-3 py-1 rounded-full text-[11px] font-heading font-black border border-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 shadow-xs">
                                    <Check size={13} className="text-emerald-700 dark:text-emerald-400" />
                                    <span>ANGGOTA RESMI</span>
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-[11px] font-heading font-black border border-rose-400 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 flex items-center gap-1.5 shadow-xs">
                                    <X size={13} className="text-rose-700 dark:text-rose-400" />
                                    <span>PENDAFTARAN DITOLAK</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 3-Panel Verification Grid: Profil, KTP, Status HUD */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {/* Panel 1: Foto Profil Karakter IC */}
                              <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50/80 dark:bg-[#12141d] flex flex-col gap-2.5 shadow-xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
                                  <span className="text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Camera size={13} className="text-blue-500" />
                                    <span>1. Foto Profil IC</span>
                                  </span>
                                  {applicantProfilePhoto && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Check size={11} /> Terunggah
                                    </span>
                                  )}
                                </div>

                                <div className="h-44 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-black/40 flex items-center justify-center relative group">
                                  {applicantProfilePhoto ? (
                                    <>
                                      <img
                                        src={applicantProfilePhoto}
                                        alt={`Foto Profil ${applicant.fullName}`}
                                        className="w-full h-full object-contain"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewImageDetail({
                                            url: applicantProfilePhoto,
                                            title: `Foto Profil IC - ${applicant.fullName || "Anggota"}`,
                                            subtitle: `Citizen ID: ${applicant.icNumber || "-"}`,
                                          })
                                        }
                                        className="absolute inset-0 bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-heading font-bold cursor-pointer"
                                      >
                                        <Eye size={18} />
                                        <span>Perbesar Foto</span>
                                      </button>
                                    </>
                                  ) : (
                                    <div className="text-center p-3 text-slate-400 text-xs">
                                      <User size={28} className="mx-auto mb-1 opacity-50" />
                                      <span>Tidak melampirkan foto profil</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Panel 2: Dokumen KTP IC */}
                              <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50/80 dark:bg-[#12141d] flex flex-col gap-2.5 shadow-xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
                                  <span className="text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <FileText size={13} className="text-amber-500" />
                                    <span>2. Dokumen KTP IC</span>
                                  </span>
                                  {applicantKtpPhoto && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Check size={11} /> Terunggah
                                    </span>
                                  )}
                                </div>

                                <div className="h-44 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-black/40 flex items-center justify-center relative group">
                                  {applicantKtpPhoto ? (
                                    <>
                                      <img
                                        src={applicantKtpPhoto}
                                        alt={`KTP ${applicant.fullName}`}
                                        className="w-full h-full object-contain"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewImageDetail({
                                            url: applicantKtpPhoto,
                                            title: `Dokumen KTP IC - ${applicant.fullName || "Anggota"}`,
                                            subtitle: `Citizen ID: ${applicant.icNumber || "-"}`,
                                          })
                                        }
                                        className="absolute inset-0 bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-heading font-bold cursor-pointer"
                                      >
                                        <Eye size={18} />
                                        <span>Perbesar KTP</span>
                                      </button>
                                    </>
                                  ) : (
                                    <div className="text-center p-3 text-slate-400 text-xs">
                                      <FileText size={28} className="mx-auto mb-1 opacity-50" />
                                      <span>Tidak melampirkan berkas KTP</span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-slate-400 font-mono pt-1">
                                  <div className="truncate">
                                    <span className="text-slate-400">Nama:</span> <strong>{applicant.fullName || "-"}</strong>
                                  </div>
                                  <div className="truncate">
                                    <span className="text-slate-400">CID:</span> <strong className="text-red-600 dark:text-amber-300">{applicant.icNumber || "-"}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Panel 3: Screenshot Status HUD IC */}
                              <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50/80 dark:bg-[#12141d] flex flex-col gap-2.5 shadow-xs">
                                <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
                                  <span className="text-[11px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Clock size={13} className="text-emerald-500" />
                                    <span>3. Status HUD IC</span>
                                  </span>
                                  {applicantStatusPhoto && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Check size={11} /> Terunggah
                                    </span>
                                  )}
                                </div>

                                <div className="h-44 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-black/40 flex items-center justify-center relative group">
                                  {applicantStatusPhoto ? (
                                    <>
                                      <img
                                        src={applicantStatusPhoto}
                                        alt={`Status HUD ${applicant.fullName}`}
                                        className="w-full h-full object-contain"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewImageDetail({
                                            url: applicantStatusPhoto,
                                            title: `Screenshot Status HUD IC - ${applicant.fullName || "Anggota"}`,
                                            subtitle: `Waktu: ${applicant.statusTime || "-"} • Pekerjaan: ${applicant.statusJob || "-"} • Gang: ${applicant.statusGang || "-"}`,
                                          })
                                        }
                                        className="absolute inset-0 bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-heading font-bold cursor-pointer"
                                      >
                                        <Eye size={18} />
                                        <span>Perbesar Status HUD</span>
                                      </button>
                                    </>
                                  ) : (
                                    <div className="text-center p-3 text-slate-400 text-xs">
                                      <Clock size={28} className="mx-auto mb-1 opacity-50" />
                                      <span>Tidak melampirkan screenshot HUD</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 pt-1 text-[11px]">
                                  {/* Waktu IC */}
                                  <div className="flex items-center justify-between font-mono bg-white dark:bg-[#1a1d26] px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10">
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <Clock size={11} className="text-amber-500" /> Waktu IC:
                                    </span>
                                    <strong className="text-slate-900 dark:text-slate-100">
                                      {applicant.statusTime || "-"}
                                    </strong>
                                  </div>

                                  {/* Status Pekerjaan */}
                                  <div className="flex items-center justify-between font-mono bg-white dark:bg-[#1a1d26] px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10">
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <Briefcase size={11} className="text-blue-500" /> Job:
                                    </span>
                                    <strong className="text-slate-900 dark:text-slate-100 truncate max-w-[130px]" title={applicant.statusJob}>
                                      {applicant.statusJob || "-"}
                                    </strong>
                                  </div>

                                  {/* Afiliasi Gang / Kelompok */}
                                  <div className="flex items-center justify-between font-mono bg-white dark:bg-[#1a1d26] px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10">
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <Shield size={11} className="text-emerald-500" /> Afiliasi:
                                    </span>
                                    <strong className="text-slate-900 dark:text-slate-100 truncate max-w-[130px]" title={applicant.statusGang}>
                                      {applicant.statusGang || "No Gang - Unaffiliated"}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Info Kontak & Persetujuan MOU */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border border-black/10 dark:border-white/10 text-xs">
                              <div className="flex items-center gap-4 flex-wrap text-slate-700 dark:text-slate-300">
                                <span className="flex items-center gap-1.5 font-mono">
                                  <Phone size={12} className="text-emerald-500" />
                                  <span>HP: {applicant.phone || "-"}</span>
                                </span>
                                <span className="flex items-center gap-1.5 font-mono">
                                  <MessageSquare size={12} className="text-indigo-500" />
                                  <span>Discord: {applicant.discordTag || "-"}</span>
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={12} /> Menyetujui Ketentuan & MOU LSM PPS
                              </span>
                            </div>

                            {/* Audit Rejection Note (if rejected) */}
                            {isRejected && applicant.rejectedReason && (
                              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/80 text-xs text-red-950 dark:text-red-200 space-y-1">
                                <div className="font-heading font-black uppercase text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                  <AlertTriangle size={13} />
                                  <span>Alasan Penolakan:</span>
                                </div>
                                <p className="font-mono">{applicant.rejectedReason}</p>
                                {applicant.rejectedAt && (
                                  <div className="text-[10px] text-red-600 dark:text-red-400 pt-0.5">
                                    Ditolak pada: {new Date(applicant.rejectedAt).toLocaleString("id-ID")} {applicant.rejectedBy ? `• Oleh: ${applicant.rejectedBy}` : ""}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Audit Approval Info (if approved) */}
                            {isApproved && applicant.verifiedAt && (
                              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                <span>
                                  ✓ Diverifikasi pada: {new Date(applicant.verifiedAt).toLocaleString("id-ID")}
                                </span>
                                {applicant.verifiedBy && (
                                  <span className="font-bold">Oleh: {applicant.verifiedBy}</span>
                                )}
                              </div>
                            )}

                            {/* Action Buttons Bar */}
                            <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center gap-2 flex-wrap">
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleApproveMemberRegistration(applicant)}
                                    className="py-2.5 px-4 rounded-xl bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border border-amber-400/80 font-heading font-black text-xs uppercase flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                                  >
                                    <Check size={14} className="stroke-[2.5]" />
                                    <span>Setujui (Jadikan Anggota Resmi)</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleOpenRejectModal(applicant)}
                                    className="py-2.5 px-4 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-slate-900 dark:text-amber-200 border border-amber-400/60 font-heading font-black text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                                  >
                                    <X size={14} className="stroke-[2.5]" />
                                    <span>Tolak Pendaftaran</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleDeleteMember(applicant.id, applicant.fullName)}
                                    className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-950/30 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 border border-black/10 dark:border-white/10 font-heading font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                                    title="Hapus berkas pendaftaran ini"
                                  >
                                    <Trash2 size={13} />
                                    <span>Hapus</span>
                                  </button>
                                </>
                              ) : isApproved ? (
                                <>
                                  <span className="text-[11px] font-heading font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Anggota Resmi LSM PPS
                                  </span>

                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleRevertMemberToPending(applicant)}
                                    className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-heading font-bold text-xs uppercase flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ml-auto"
                                  >
                                    <RotateCcw size={12} />
                                    <span>Kembalikan ke Pending</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleDeleteMember(applicant.id, applicant.fullName)}
                                    className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-950/30 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 border border-black/10 dark:border-white/10 font-heading font-bold text-xs uppercase flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleApproveMemberRegistration(applicant)}
                                    className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 font-heading font-black text-xs uppercase flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <Check size={13} />
                                    <span>Ubah Menjadi Setujui</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleRevertMemberToPending(applicant)}
                                    className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-heading font-bold text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <RotateCcw size={12} />
                                    <span>Kembalikan ke Pending</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessingRegAction}
                                    onClick={() => handleDeleteMember(applicant.id, applicant.fullName)}
                                    className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-950/30 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 border border-black/10 dark:border-white/10 font-heading font-bold text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer ml-auto"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
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
                  <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-slate-900 shadow-xs shrink-0">
                        <Users2 size={20} className="text-[#DC2626]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                            Database Anggota Terdaftar ({membersList.length})
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-400">
                            {approvedRegistrationsCount} RESMI
                          </span>
                          {pendingRegistrationsCount > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-400">
                              {pendingRegistrationsCount} MENUNGGU VERIFIKASI
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Data pendaftaran anggota terintegrasi resmi LSM PPS Sandy Shores (GTA V IME Roleplay)
                        </p>
                      </div>
                    </div>

                    {/* Export & Maintenance Actions: Excel, ZIP, Duplikat, Bersihkan HUD */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center sm:flex-wrap gap-2 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={membersList.length === 0}
                        className="btn py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-heading font-black border border-emerald-500/80 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                        title="Download seluruh data anggota dalam format Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={15} className="shrink-0" />
                        <span className="truncate">Unduh Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportZip}
                        disabled={isExportingZip || membersList.length === 0}
                        className="btn py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] sm:text-xs font-heading font-black border border-red-500/80 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                        title="Download arsip ZIP lengkap (Excel + seluruh folder Foto Profil & Foto KTP)"
                      >
                        <Archive size={15} className="shrink-0" />
                        <span className="truncate">{isExportingZip ? "Membuat ZIP..." : "Backup ZIP (+ Foto)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAuditAndCleanDuplicates}
                        disabled={isCleaningDuplicates || membersList.length === 0}
                        className="btn py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] sm:text-xs font-heading font-black border border-amber-600/70 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                        title="Audit database dan hapus data anggota duplikat secara otomatis"
                      >
                        <ShieldAlert size={15} className="text-slate-950 shrink-0" />
                        <span className="truncate">{isCleaningDuplicates ? "Memeriksa..." : "Bersihkan Duplikat"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePurgeApprovedHudPhotos}
                        disabled={isPurgingHudPhotos || approvedHudPhotosCount === 0}
                        className="btn py-2.5 sm:py-2 px-2.5 sm:px-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] sm:text-xs font-heading font-black border border-black/30 dark:border-white/15 shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                        title="Hapus screenshot Status HUD milik anggota yang sudah disetujui agar database lebih ringan (Foto Profil & KTP tetap aman)"
                      >
                        <Trash2 size={14} className="shrink-0" />
                        <span className="truncate">
                          {isPurgingHudPhotos
                            ? "Membersihkan..."
                            : `Bersihkan HUD (${approvedHudPhotosCount})`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tab Navigation: Anggota Aktif vs Menunggu Verifikasi vs Riwayat Dikeluarkan */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 bg-slate-100 dark:bg-[#15171E] border border-black/15 dark:border-white/10 rounded-lg shadow-xs">
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => setMemberSubTab("active")}
                        className={`flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded text-xs font-heading font-black border-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                          memberSubTab === "active"
                            ? "bg-[#FACC15] text-slate-950 border-yellow-500/80 shadow-xs"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/15 hover:border-black"
                        }`}
                      >
                        <Users2 size={15} className="text-[#DC2626]" />
                        <span>Anggota Aktif ({approvedMembersList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberSubTab("pending")}
                        className={`flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded text-xs font-heading font-black border-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                          memberSubTab === "pending"
                            ? "bg-amber-500 text-slate-950 border-amber-600/80 shadow-xs"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/15 hover:border-black"
                        }`}
                      >
                        <Clock size={15} className={memberSubTab === "pending" ? "text-slate-950" : "text-amber-600 dark:text-amber-400"} />
                        <span>Menunggu Verifikasi ({pendingMembersList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberSubTab("dismissed")}
                        className={`flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded text-xs font-heading font-black border-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                          memberSubTab === "dismissed"
                            ? "bg-[#DC2626] text-white border-red-500/80 shadow-xs"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/15 hover:border-black"
                        }`}
                      >
                        <UserX size={15} className={memberSubTab === "dismissed" ? "text-white" : "text-rose-600 dark:text-rose-400"} />
                        <span>Riwayat Dikeluarkan ({dismissedMembersList.length})</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 py-1">
                      {memberSubTab === "active" ? (
                        <span>Warga aktif resmi berhak menerima kas & voucher</span>
                      ) : memberSubTab === "pending" ? (
                        <span>Calon anggota menunggu persetujuan verifikasi pengurus</span>
                      ) : (
                        <span>Arsip riwayat tanggal, jam & alasan pengeluaran</span>
                      )}
                    </div>
                  </div>

                  {memberSubTab === "active" && (
                    <>
                      {/* Stats Ringkasan Kas (Langganan 30 Hari) & Voucher (7 Hari) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center shrink-0">
                        <Users size={18} className="text-slate-900" />
                      </div>
                      <div>
                        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Total Anggota Resmi</span>
                        <strong className="text-base font-mono font-black text-slate-900 dark:text-slate-100">
                          {approvedMembersList.length} Warga
                        </strong>
                      </div>
                    </div>

                    <div className="card-brutal p-3 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-xs flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-emerald-500 border border-black/20 dark:border-white/15 flex items-center justify-center shrink-0 text-white shadow-xs">
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
                                / {Math.max(0, approvedMembersList.length - totalKasActiveCount)} Belum Bayar
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("kas_db")}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold border border-black shadow-xs cursor-pointer flex items-center gap-1"
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
                          onClick={() => setActiveTab("member_kas")}
                          className="px-2 py-0.5 rounded bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-bold border border-black shadow-xs cursor-pointer text-[10px] flex items-center gap-1"
                          title="Buka tab Catat Uang Kas untuk mengelola pembayaran kas anggota"
                        >
                          <DollarSign size={11} className="text-[#DC2626]" />
                          <span>Kelola Kas &rarr;</span>
                        </button>
                      </div>
                    </div>

                    <div className="card-brutal p-3 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500 dark:border-amber-400 shadow-xs flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center shrink-0 text-[#DC2626] shadow-xs">
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
                          onClick={() => setActiveTab("jasra_panel")}
                          className="px-2 py-0.5 rounded bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-bold border border-black shadow-xs cursor-pointer text-[10px] flex items-center gap-1"
                          title="Buka panel Voucher Jasra untuk mengelola jatah dan distribusi voucher"
                        >
                          <Gift size={11} className="text-[#DC2626]" />
                          <span>Kelola di Panel Jasra &rarr;</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filter Pills Bar */}
                  <div className="relative z-30 card-brutal hover:!transform-none p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:max-w-md">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Cari nama IC, No KTP, No HP, Job, atau Afiliasi..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                        Menampilkan <span className="text-[#DC2626] dark:text-[#FACC15]">{filteredMembers.length}</span> dari {approvedMembersList.length} anggota resmi
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
                        ✕ Belum Bayar ({Math.max(0, approvedMembersList.length - totalKasActiveCount)})
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

                    {/* Filter Pekerjaan (Job) & Afiliasi / Gang */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-2 lg:w-64">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">
                          Job:
                        </span>
                        <BrutalistSelect
                          value={filterJob}
                          onChange={(val) => setFilterJob(val)}
                          options={jobFilterOptions}
                          ariaLabel="Filter Pekerjaan Anggota"
                        />
                      </div>

                      <div className="flex items-center gap-2 lg:w-64">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">
                          Afiliasi:
                        </span>
                        <BrutalistSelect
                          value={filterGang}
                          onChange={(val) => setFilterGang(val)}
                          options={gangFilterOptions}
                          ariaLabel="Filter Afiliasi Anggota"
                        />
                      </div>

                      {(memberSearchQuery.trim() ||
                        filterKas !== "all" ||
                        filterVoucher !== "all" ||
                        filterJob !== "all" ||
                        filterGang !== "all") && (
                        <button
                          type="button"
                          onClick={() => {
                            setMemberSearchQuery("");
                            setFilterKas("all");
                            setFilterVoucher("all");
                            setFilterJob("all");
                            setFilterGang("all");
                          }}
                          className="btn py-2 px-3 text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-400/70 flex items-center justify-center gap-1.5 cursor-pointer lg:ml-auto"
                        >
                          <RotateCcw size={12} />
                          <span>Reset Filter</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members Grid Cards */}
                  {filteredMembers.length === 0 ? (
                    <div className="card-brutal p-12 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center flex flex-col items-center justify-center gap-2">
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
                            className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
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
                                className={`w-12 h-12 rounded-full border border-black/15 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-xs bg-amber-100 dark:bg-amber-950/50 ${
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
                                  {member.status === "PENDING_VERIFIKASI" ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMemberRegFilterTab("PENDING");
                                        setActiveTab("member_registrations");
                                      }}
                                      title="Klik untuk membuka tab Verifikasi Anggota"
                                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-500 shrink-0 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors"
                                    >
                                      MENUNGGU VERIFIKASI
                                    </button>
                                  ) : member.status === "REJECTED" ? (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-400 shrink-0">
                                      DITOLAK
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-400 shrink-0">
                                      RESMI
                                    </span>
                                  )}
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
                              {(member.statusJob || member.statusGang) && (
                                <>
                                  <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
                                    <span className="text-[9px] text-slate-400 font-sans font-bold block">PEKERJAAN (JOB):</span>
                                    <span className="text-slate-800 dark:text-slate-200 truncate block text-[11px] font-sans font-semibold" title={member.statusJob || "-"}>
                                      {member.statusJob || "-"}
                                    </span>
                                  </div>
                                  <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
                                    <span className="text-[9px] text-slate-400 font-sans font-bold block">AFILIASI / GANG:</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 truncate block text-[11px] font-sans font-semibold" title={member.statusGang || "-"}>
                                      {member.statusGang || "-"}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Admin Controls: Status Kas (30 Hari) & Voucher Jasra (7 Hari) */}
                            <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-[#14161F] border border-black/20 dark:border-white/15/15 dark:border-white/10">
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
                                const voucherSub = getMemberVoucherSubscription(member, new Date(), activeJasraBatch);
                                const dist = findMemberJasraDistribution(activeBatchJasraDists, member);
                                const distRem = dist ? calculateRecipientRemaining(dist, activeJasraBatch) : null;
                                const isVoucherActive = dist
                                  ? !distRem.isExpired
                                  : (activeBatchJasraDists.length === 0 && voucherSub.isActive);
                                const daysRem = dist && !distRem.isExpired ? distRem.daysRemaining : voucherSub.daysRemaining;

                                return (
                                  <div className={`p-2 rounded border-2 transition-all ${
                                    isVoucherActive
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100"
                                      : "bg-white dark:bg-[#1F222C] border-black/20 dark:border-white/20 text-slate-800 dark:text-slate-200"
                                  }`}>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                          isVoucherActive ? "bg-amber-500" : "bg-slate-400"
                                        }`} />
                                        <span className="font-heading font-black text-[11px] uppercase truncate">
                                          VOUCHER JASRA (10T • 10P)
                                        </span>
                                      </div>
                                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${
                                        isVoucherActive
                                          ? "bg-[#FACC15] text-slate-950 border-amber-500"
                                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300"
                                      }`}>
                                        {isVoucherActive ? `${daysRem} HARI LAGI` : "SIAP DIAMBIL"}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-2">
                                      <span>{isVoucherActive ? "Berlaku s/d:" : "Jatah Mingguan:"}</span>
                                      <strong className="text-slate-900 dark:text-slate-100">
                                        {isVoucherActive ? (dist?.batchExpiresFormatted || voucherSub.expiresAtFormatted) : "10 Tritmen • 10 Pingsan"}
                                      </strong>
                                    </div>

                                    {/* Link & Status ke Panel Jasra */}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-black/10 dark:border-white/10 text-[10px]">
                                      <span className="font-mono text-slate-500">
                                        {isVoucherActive ? "Status: Kuota Terdistribusi" : "Status: Belum Menerima"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setActiveTab("jasra_panel")}
                                        className="text-[10px] font-heading font-black text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                                        title="Buka panel Voucher Jasra untuk mengelola alokasi voucher"
                                      >
                                        <Gift size={11} className="text-[#DC2626]" />
                                        <span>Kelola di Panel Jasra &rarr;</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Action Buttons: Lihat Dokumen & Kelola Anggota */}
                            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-black/10 dark:border-white/10 mt-auto">
                              {/* Left: Dokumen KTP & Foto Profil */}
                              <div className="flex items-center gap-1.5 min-w-0">
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
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans font-bold bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border border-black shadow-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                                    title="Lihat dokumen KTP IC"
                                  >
                                    <FileText size={12} className="text-[#DC2626] shrink-0" />
                                    <span>Lihat KTP</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic shrink-0">Tanpa Foto KTP</span>
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
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/30 dark:border-slate-600 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                    title="Lihat foto profil resolusi penuh"
                                  >
                                    <Eye size={12} className="shrink-0" />
                                    <span>Foto</span>
                                  </button>
                                )}
                              </div>

                              {/* Right: Tombol Edit, Keluarkan & Hapus */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMemberModal(member)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-sans font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                                  title="Edit data identitas & dokumen anggota (nama IC, no HP, foto profil, KTP)"
                                >
                                  <Edit2 size={11} className="text-amber-700 dark:text-amber-400 shrink-0" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDismissModal(member)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-sans font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                                  title="Keluarkan anggota dari paguyuban (catat riwayat tanggal, jam & alasan)"
                                >
                                  <UserMinus size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                  <span>Keluarkan</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(member.id, member.fullName)}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-300 dark:hover:border-red-900 transition-colors cursor-pointer shrink-0"
                                  title="Hapus data anggota dari database"
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
                    </>
                  )}

                  {/* Sub-Tab: Menunggu Verifikasi */}
                  {memberSubTab === "pending" && (
                    <div className="flex flex-col gap-4">
                      <div className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:max-w-md">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari calon anggota (nama IC, CID, HP, Discord)..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                          {memberSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setMemberSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                            Menampilkan <span className="text-amber-600 dark:text-[#FACC15]">{filteredPendingMembers.length}</span> dari {pendingMembersList.length} antrean
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setMemberRegFilterTab("PENDING");
                              setActiveTab("member_registrations");
                            }}
                            className="btn py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-heading font-black border border-amber-600/80 shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck size={13} />
                            <span>Buka Verifikasi Lengkap &rarr;</span>
                          </button>
                        </div>
                      </div>

                      {filteredPendingMembers.length === 0 ? (
                        <div className="card-brutal p-10 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 size={36} className="text-emerald-500" />
                          <p className="font-heading font-black text-sm text-slate-800 dark:text-slate-200">
                            {memberSearchQuery ? "Tidak ada calon anggota yang cocok" : "Semua berkas sudah diverifikasi"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {memberSearchQuery ? "Coba kata kunci pencarian lain." : "Saat ini tidak ada calon anggota yang menunggu verifikasi."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                          {filteredPendingMembers.map((member, idx) => (
                            <div
                              key={member.id || idx}
                              className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-amber-400/80 dark:border-amber-600/60 shadow-sm flex flex-col justify-between gap-3"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  onClick={() => {
                                    if (member.profilePhoto) {
                                      setPreviewKtp({
                                        image: member.profilePhoto,
                                        name: `${member.fullName || "Calon Anggota"} (Foto Profil)`,
                                        citizenId: member.icNumber || "",
                                      });
                                    }
                                  }}
                                  className={`w-12 h-12 rounded-full border border-amber-400 overflow-hidden shrink-0 flex items-center justify-center shadow-xs bg-amber-100 dark:bg-amber-950/50 ${
                                    member.profilePhoto ? "cursor-pointer" : ""
                                  }`}
                                >
                                  {member.profilePhoto ? (
                                    <img src={member.profilePhoto} alt={member.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-heading font-black text-sm text-amber-800 dark:text-amber-300">
                                      {(member.fullName || "P").charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="font-heading font-black text-sm text-slate-950 dark:text-slate-100 truncate" title={member.fullName}>
                                      {member.fullName || "Nama Tidak Tertera"}
                                    </h5>
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-500 shrink-0">
                                      MENUNGGU VERIFIKASI
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500 block truncate">
                                    Dikirim: {member.regDate || (member.createdAt ? new Date(member.createdAt).toLocaleDateString("id-ID") : "-")}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded bg-slate-50 dark:bg-[#14161F] border border-black/10 dark:border-white/10 font-mono">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-sans font-bold block">NO KTP / IC:</span>
                                  <strong className="text-[#DC2626] dark:text-[#FACC15] truncate block text-[11px]">{member.icNumber || "-"}</strong>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 font-sans font-bold block">NO TLP / WA:</span>
                                  <span className="text-slate-800 dark:text-slate-200 truncate block text-[11px]">{member.phone || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 font-sans font-bold block">DISCORD:</span>
                                  <span className="text-slate-800 dark:text-slate-200 truncate block text-[11px]">{member.discordTag || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 font-sans font-bold block">PEKERJAAN / GANG:</span>
                                  <span className="text-slate-800 dark:text-slate-200 truncate block text-[11px]" title={`${member.statusJob || "-"} / ${member.statusGang || "-"}`}>
                                    {member.statusJob || "-"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {member.icPhoto && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewKtp({
                                        image: member.icPhoto,
                                        name: `${member.fullName || "Calon Anggota"} (KTP IC)`,
                                        citizenId: member.icNumber || "",
                                      })
                                    }
                                    className="flex-1 py-1.5 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-black/15 dark:border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    <span>KTP</span>
                                  </button>
                                )}
                                {member.statusPhoto && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewKtp({
                                        image: member.statusPhoto,
                                        name: `${member.fullName || "Calon Anggota"} (Status HUD)`,
                                        citizenId: member.icNumber || "",
                                      })
                                    }
                                    className="flex-1 py-1.5 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-black/15 dark:border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    <span>HUD</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                                <button
                                  type="button"
                                  disabled={isProcessingRegAction}
                                  onClick={() => handleApproveMemberRegistration(member)}
                                  className="flex-1 py-2 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-heading font-black border border-emerald-500/80 shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Check size={13} />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessingRegAction}
                                  onClick={() => handleOpenRejectModal(member)}
                                  className="flex-1 py-2 px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-heading font-black border border-rose-500/80 shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <X size={13} />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-Tab: Riwayat Anggota Dikeluarkan */}
                  {memberSubTab === "dismissed" && (
                    <div className="flex flex-col gap-4">
                      {/* Search Bar & Export Riwayat */}
                      <div className="card-brutal p-3.5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:max-w-md">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari nama IC, No KTP, alasan pengeluaran, atau nama petugas..."
                            value={dismissedSearchQuery}
                            onChange={(e) => setDismissedSearchQuery(e.target.value)}
                            className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                          />
                          {dismissedSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setDismissedSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                            Menampilkan <span className="text-rose-600 dark:text-rose-400">{filteredDismissedMembers.length}</span> dari {dismissedMembersList.length} arsip
                          </span>

                          <button
                            type="button"
                            onClick={handleExportDismissedExcel}
                            disabled={dismissedMembersList.length === 0}
                            className="btn py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border border-emerald-500/80 shadow-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                            title="Unduh rekap riwayat pengeluaran dalam format Excel (.xlsx)"
                          >
                            <FileSpreadsheet size={14} />
                            <span>Unduh Excel Riwayat</span>
                          </button>
                        </div>
                      </div>

                      {/* Riwayat Grid Cards */}
                      {filteredDismissedMembers.length === 0 ? (
                        <div className="card-brutal p-12 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center flex flex-col items-center justify-center gap-2">
                          <UserX size={36} className="text-slate-300 dark:text-slate-600" />
                          <p className="font-heading font-black text-sm text-slate-700 dark:text-slate-300">
                            {dismissedSearchQuery ? "Tidak ditemukan riwayat yang sesuai pencarian" : "Belum ada anggota yang dikeluarkan"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {dismissedSearchQuery ? "Coba gunakan kata kunci pencarian lain." : "Anggota yang dikeluarkan dari database aktif akan tercatat lengkap dengan tanggal dan jam di sini."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                          {filteredDismissedMembers.map((dismissedItem, idx) => {
                            const formattedTime = formatDismissedDateTime(dismissedItem.dismissedAt);
                            return (
                              <div
                                key={dismissedItem.id || idx}
                                className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border-2 border-rose-300 dark:border-rose-900/60 shadow-sm flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
                              >
                                {/* Header: Avatar & Info */}
                                <div className="flex items-start gap-3">
                                  <div
                                    onClick={() => {
                                      if (dismissedItem.profilePhoto) {
                                        setPreviewKtp({
                                          image: dismissedItem.profilePhoto,
                                          name: `${dismissedItem.fullName || "Anggota"} (Foto Profil)`,
                                          citizenId: dismissedItem.icNumber || "",
                                        });
                                      }
                                    }}
                                    className={`w-12 h-12 rounded-full border-2 border-rose-500 overflow-hidden shrink-0 flex items-center justify-center shadow-xs bg-rose-50 dark:bg-rose-950/40 ${
                                      dismissedItem.profilePhoto ? "cursor-pointer group relative" : ""
                                    }`}
                                    title={dismissedItem.profilePhoto ? "Klik untuk memperbesar foto profil" : "Foto profil"}
                                  >
                                    {dismissedItem.profilePhoto ? (
                                      <img
                                        src={dismissedItem.profilePhoto}
                                        alt={dismissedItem.fullName}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform grayscale contrast-125"
                                      />
                                    ) : (
                                      <UserMinus size={20} className="text-rose-600 dark:text-rose-400" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <h5 className="font-heading font-black text-sm text-slate-950 dark:text-slate-100 truncate" title={dismissedItem.fullName}>
                                        {dismissedItem.fullName || "Nama Tidak Tertera"}
                                      </h5>
                                      <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-400 shrink-0">
                                        DIKELUARKAN
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 block truncate">
                                      Terdaftar awal: {dismissedItem.regDate || (dismissedItem.createdAt ? new Date(dismissedItem.createdAt).toLocaleDateString("id-ID") : "-")}
                                    </span>
                                  </div>
                                </div>

                                {/* Kontak / IC */}
                                <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-[#14161F] border border-black/10 dark:border-white/10 font-mono">
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-sans font-bold block">NO KTP / IC:</span>
                                    <strong className="text-rose-700 dark:text-rose-400 truncate block text-[11px]" title={dismissedItem.icNumber}>
                                      {dismissedItem.icNumber || "-"}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-sans font-bold block">NO TLP / WA:</span>
                                    <span className="text-slate-800 dark:text-slate-200 truncate block text-[11px]" title={dismissedItem.phone}>
                                      {dismissedItem.phone || "-"}
                                    </span>
                                  </div>
                                </div>

                                {/* Box Waktu & Alasan Pengeluaran */}
                                <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-900/60">
                                  {/* Tanggal & Jam Pengeluaran */}
                                  <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-rose-200 dark:border-rose-900/40">
                                    <span className="text-[10px] font-heading font-black text-rose-800 dark:text-rose-300 uppercase flex items-center gap-1">
                                      <Clock size={12} className="text-rose-600 dark:text-rose-400" />
                                      WAKTU DIKELUARKAN:
                                    </span>
                                    <strong className="text-[11px] font-mono font-black text-rose-900 dark:text-rose-200 bg-white dark:bg-[#1A1D26] px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                                      {formattedTime}
                                    </strong>
                                  </div>

                                  {/* Alasan */}
                                  <div>
                                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-0.5">
                                      Alasan Pengeluaran:
                                    </span>
                                    <p className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-[#14161F] p-2 rounded border border-black/10 dark:border-white/10 italic leading-snug">
                                      "{dismissedItem.dismissedReason || "Tidak ada alasan tercatat"}"
                                    </p>
                                  </div>

                                  {/* Dicatat Oleh */}
                                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 pt-1">
                                    <span className="flex items-center gap-1">
                                      <ShieldCheck size={11} className="text-slate-500" /> Dicatat Oleh:
                                    </span>
                                    <strong className="text-slate-900 dark:text-slate-200">
                                      {dismissedItem.dismissedBy || "Pengurus LSM PPS"}
                                    </strong>
                                  </div>
                                </div>

                                {/* Footer Actions: Dokumen, Pulihkan, Hapus Permanen */}
                                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-black/10 dark:border-white/10 mt-auto">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {dismissedItem.icPhoto ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewKtp({
                                            image: dismissedItem.icPhoto,
                                            name: dismissedItem.fullName || "Anggota",
                                            citizenId: dismissedItem.icNumber || "",
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/30 dark:border-slate-600 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                        title="Lihat dokumen KTP IC"
                                      >
                                        <FileText size={12} className="text-rose-600 shrink-0" />
                                        <span>KTP</span>
                                      </button>
                                    ) : null}

                                    {dismissedItem.profilePhoto ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewKtp({
                                            image: dismissedItem.profilePhoto,
                                            name: `${dismissedItem.fullName || "Anggota"} (Foto Profil)`,
                                            citizenId: dismissedItem.icNumber || "",
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/30 dark:border-slate-600 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                        title="Lihat foto profil"
                                      >
                                        <Eye size={12} className="shrink-0" />
                                        <span>Foto</span>
                                      </button>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreMember(dismissedItem)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-sans font-black bg-emerald-600 hover:bg-emerald-700 text-white border border-black shadow-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
                                      title="Pulihkan status anggota ini menjadi aktif kembali"
                                    >
                                      <RotateCcw size={12} className="shrink-0" />
                                      <span>Pulihkan</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDismissedPermanently(dismissedItem)}
                                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-300 dark:hover:border-red-900 transition-colors cursor-pointer shrink-0"
                                      title="Hapus riwayat pengeluaran ini secara permanen"
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
                </div>
              )}

              {/* Tab: Catat Uang Kas & Iuran Anggota */}
              {activeTab === "member_kas" && (
                <div className="flex flex-col gap-4">
                  {/* Top Header Card with Actions */}
                  <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-slate-900 shadow-xs shrink-0">
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
                        className="py-2 px-3.5 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-heading font-black border border-black/15 dark:border-white/10 shadow-xs flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Buka menu Keuangan & mutasi kas"
                      >
                        <Landmark size={15} className="text-[#DC2626]" />
                        <span>Keuangan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("members_db")}
                        className="py-2 px-3.5 bg-white dark:bg-[#20232E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-heading font-black border border-black/15 dark:border-white/10 shadow-xs flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded"
                        title="Kembali ke Database Anggota & Foto KTP"
                      >
                        <Users2 size={15} className="text-[#DC2626]" />
                        <span>Database Anggota</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs">
                      <span className="text-[10px] font-sans font-black text-slate-500 uppercase">
                        Total Anggota Resmi
                      </span>
                      <div className="text-xl font-mono font-black text-slate-900 dark:text-slate-100 mt-1">
                        {approvedMembersList.length}
                      </div>
                      <span className="text-[10px] text-slate-500">Sudah disetujui pengurus</span>
                    </div>

                    <div className="card-brutal p-3 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500 shadow-xs">
                      <span className="text-[10px] font-sans font-black text-emerald-900 dark:text-emerald-300 uppercase">
                        Sudah Bayar
                      </span>
                      <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {totalKasActiveCount}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-mono">
                        {Math.round((totalKasActiveCount / (approvedMembersList.length || 1)) * 100)}% anggota bayar kas
                      </span>
                    </div>

                    <div className="card-brutal p-3 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500 dark:border-rose-400 shadow-xs">
                      <span className="text-[10px] font-sans font-black text-rose-900 dark:text-rose-300 uppercase">
                        Belum Bayar
                      </span>
                      <div className="text-xl font-mono font-black text-rose-700 dark:text-rose-300 mt-1">
                        {Math.max(0, approvedMembersList.length - totalKasActiveCount)}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono">Belum iuran kas</span>
                    </div>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="card-brutal p-3 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    {/* Search box */}
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari anggota berdasarkan nama, nomor telepon, atau CID..."
                        value={kasMemberSearchQuery}
                        onChange={(e) => setKasMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-slate-50 dark:bg-[#20232E] border border-black/15 dark:border-white/10 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626]"
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
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all ${
                          kasMemberStatusFilter === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        Semua ({approvedMembersList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasMemberStatusFilter("active")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all ${
                          kasMemberStatusFilter === "active"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        ✓ Sudah Bayar ({totalKasActiveCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKasMemberStatusFilter("unpaid")}
                        className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-black/20 dark:border-white/15 cursor-pointer transition-all ${
                          kasMemberStatusFilter === "unpaid"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 hover:bg-rose-50"
                        }`}
                      >
                        ✕ Belum Bayar ({Math.max(0, approvedMembersList.length - totalKasActiveCount)})
                      </button>
                    </div>
                  </div>

                  {/* List / Cards of Members for Kas */}
                  {filteredKasMembers.length === 0 ? (
                    <div className="card-brutal p-8 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center text-slate-500">
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
                            className="card-brutal p-4 rounded-xl border-2 bg-white dark:bg-[#1A1D26] border-black dark:border-[#475569] shadow-xs transition-all flex flex-col justify-between gap-3"
                          >
                            {/* Member Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white border border-black/20 dark:border-white/15 flex items-center justify-center font-heading font-black text-sm shadow-xs shrink-0">
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
                                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs border border-black/20 dark:border-white/15 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
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

              {/* Tab: Panel Kelola Voucher Jasra Pemerintah */}
              {activeTab === "jasra_panel" && (
                <JasraPanel
                  batches={jasraBatches}
                  distributions={jasraDistributions}
                  membersList={approvedMembersList}
                  externalJasraList={externalJasraList}
                  onShowToast={onShowToast}
                  initialDistributeType={jasraInitialDistributeType}
                  onResetInitialDistributeType={() => setJasraInitialDistributeType(null)}
                  onOpenTransparency={onOpenTransparency}
                />
              )}

              {/* Tab: Buku Kas & Keuangan LSM PPS */}
              {activeTab === "kas_db" && (
                <AdminKasTab
                  kasSummary={kasSummary}
                  kasTransactions={kasTransactions}
                  filteredKasTransactions={filteredKasTransactions}
                  kasRunningBalances={kasRunningBalances}
                  kasSearchQuery={kasSearchQuery}
                  setKasSearchQuery={setKasSearchQuery}
                  kasFilterType={kasFilterType}
                  setKasFilterType={setKasFilterType}
                  formatCurrency={formatCurrency}
                  formatKasDate={formatKasDate}
                  setActiveTab={setActiveTab}
                  setIsKasIncomeModalOpen={setIsKasIncomeModalOpen}
                  setIsKasExpenseModalOpen={setIsKasExpenseModalOpen}
                  setIsKasTransferModalOpen={setIsKasTransferModalOpen}
                  setIsKasCopyModalOpen={setIsKasCopyModalOpen}
                  handleExportKasExcel={handleExportKasExcel}
                  handleOpenEditKasTx={handleOpenEditKasTx}
                  handleDeleteKasTx={handleDeleteKasTx}
                />
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
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border border-black/20 dark:border-white/15 transition-all cursor-pointer ${
                          eventSubTab === "events_manage"
                            ? "bg-[#FACC15] text-slate-950 shadow-xs"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>🎯 Kelola Event & Bikin Baru ({eventsList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEventSubTab("registrations")}
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border border-black/20 dark:border-white/15 transition-all cursor-pointer ${
                          eventSubTab === "registrations"
                            ? "bg-[#FACC15] text-slate-950 shadow-xs"
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
                        className="btn py-2 px-3.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-heading font-black text-xs uppercase border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
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
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-slate-950 shadow-xs shrink-0">
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
                          className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>+ Buat Event Baru</span>
                        </button>
                      </div>

                      {/* Grid Event Cards */}
                      {eventsList.length === 0 ? (
                        <div className="card-brutal p-8 sm:p-10 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-black/20 dark:border-white/15 flex items-center justify-center text-[#DC2626] dark:text-[#FACC15] shadow-xs">
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
                            className="btn py-2.5 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
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
                              className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-md flex flex-col justify-between gap-3 relative"
                            >
                              {/* Header Card: Status & Prefix */}
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black text-white border border-black shadow-xs ${
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
                      <div className="card-brutal p-4 sm:p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#DC2626] border border-black/20 dark:border-white/15 flex items-center justify-center text-white shadow-xs shrink-0">
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
                            className="text-xs font-heading font-black py-2 px-3 rounded border border-black/20 dark:border-white/15 bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 shadow-xs cursor-pointer"
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
                            className="btn py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border border-emerald-500/80 shadow-xs flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                            title="Download rekap pendaftar event dalam format Excel"
                          >
                            <FileSpreadsheet size={15} />
                            <span>Unduh Excel</span>
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="card-brutal p-3 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:max-w-md">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari kode tiket, nama IC, no telp, atau kategori..."
                            value={eventSearchQuery}
                            onChange={(e) => setEventSearchQuery(e.target.value)}
                            className="input-field w-full pl-9 pr-8 text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
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
                        <div className="card-brutal p-12 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center flex flex-col items-center justify-center gap-2">
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
                              className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
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
                                  className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-900 font-black border border-black shadow-xs flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
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
                                    className="w-full text-xs py-2 px-2.5 rounded font-mono font-black border border-black/20 dark:border-white/15 flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-xs"
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
                                    className="w-full text-xs py-2 px-2.5 rounded font-mono font-black border border-black/20 dark:border-white/15 flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-xs"
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
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border border-black/20 dark:border-white/15 transition-all cursor-pointer ${
                          bansosSubTab === "programs_manage"
                            ? "bg-[#FACC15] text-slate-950 shadow-xs"
                            : "bg-white dark:bg-[#1A1D26] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>🎁 Kelola Program Bansos ({bansosPrograms.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBansosSubTab("claims_data")}
                        className={`btn py-1.5 px-3.5 text-xs font-heading font-black border border-black/20 dark:border-white/15 transition-all cursor-pointer ${
                          bansosSubTab === "claims_data"
                            ? "bg-[#FACC15] text-slate-950 shadow-xs"
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
                        className="btn py-2 px-3.5 bg-[#059669] hover:bg-[#047857] text-white font-heading font-black text-xs uppercase border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
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
                      <div className="card-brutal p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-slate-950 shadow-xs shrink-0">
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
                          className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>+ Buat Program Bansos</span>
                        </button>
                      </div>

                      {/* Grid Program Cards */}
                      {bansosPrograms.length === 0 ? (
                        <div className="card-brutal p-8 sm:p-10 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-black/20 dark:border-white/15 flex items-center justify-center text-emerald-600 shadow-xs">
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
                            className="btn py-2.5 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-xs uppercase border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
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
                                className="card-brutal p-4 bg-white dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3"
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
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border border-black shadow-xs ${
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
                                      className="p-1.5 bg-white dark:bg-[#1E212B] hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-black shadow-xs cursor-pointer"
                                      title="Edit Program Bansos"
                                    >
                                      <Edit2 size={13} />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBansosProgram(prog)}
                                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-black shadow-xs cursor-pointer"
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
                      <div className="card-brutal p-5 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-12 h-12 bg-[#FACC15] text-[#111827] border border-black/20 dark:border-white/15 flex items-center justify-center font-black shadow-xs shrink-0">
                            <Gift size={26} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-black text-base uppercase text-slate-900 dark:text-slate-100">
                                Bantuan Sosial (Bansos) Warga
                              </h3>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-[#FACC15] border border-black shadow-xs">
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
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-black/20 dark:border-white/15 font-heading font-black text-xs uppercase shadow-xs hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                        >
                          <ExternalLink size={14} />
                          <span>Buka Form /bansos</span>
                        </a>
                      </div>

                      {/* Summary Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {/* 1. Total Permohonan */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 shadow-xs">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-slate-500 block truncate">
                            Total Pemohon
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-slate-100">
                            {bansosClaims.length}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Warga Terdaftar</span>
                        </div>

                        {/* 2. Belum Diambil */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 shadow-xs">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-amber-700 dark:text-amber-400 block truncate">
                            Belum Diambil
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-amber-600">
                            {bansosClaims.filter((c) => !c.claimed).length}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Menunggu Di Kantor</span>
                        </div>

                        {/* 3. Sudah Diambil */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 shadow-xs">
                          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase text-emerald-700 dark:text-emerald-400 block truncate">
                            Sudah Diambil
                          </span>
                          <span className="font-heading font-black text-xl sm:text-2xl text-emerald-600">
                            {bansosClaims.filter((c) => c.claimed).length}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Telah Diserahkan</span>
                        </div>

                        {/* 4. Total Bantuan Tunai Tersalurkan */}
                        <div className="card-brutal p-3 sm:p-3.5 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 shadow-xs">
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
                      <div className="card-brutal p-3 sm:p-4 bg-[var(--card-bg)] border border-black/15 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
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

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Program Filter - Styled Brutalist with Chevron */}
                          {bansosPrograms.length > 1 && (
                            <div className="relative inline-block">
                              <select
                                value={selectedBansosProgramFilter}
                                onChange={(e) => setSelectedBansosProgramFilter(e.target.value)}
                                className="appearance-none bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 py-1.5 pl-3 pr-8 rounded-lg text-xs font-heading font-black shadow-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
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
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                                <ChevronDown size={14} />
                              </div>
                            </div>
                          )}

                          {/* Filter Pills Status Bansos */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              { id: "all", label: `Semua (${bansosClaims.length})` },
                              { id: "unclaimed", label: `Belum Diambil (${bansosClaims.filter((c) => !c.claimed).length})` },
                              { id: "claimed", label: `Sudah Diambil (${bansosClaims.filter((c) => c.claimed).length})` },
                            ].map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setBansosStatusFilter(f.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-heading font-black border-2 transition-all cursor-pointer ${
                                  bansosStatusFilter === f.id
                                    ? "bg-[#FACC15] text-[#111827] border-black shadow-xs -translate-y-0.5"
                                    : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 border-black/30 dark:border-slate-700 hover:border-black"
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>

                          {/* Tombol Salin Link Transparansi Pemerintah */}
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/transparansi?tab=bansos`;
                              navigator.clipboard.writeText(url);
                              onShowToast?.(`Link laporan bansos berhasil disalin: ${url}`, "success");
                            }}
                            className="py-2 px-3.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border border-black/20 dark:border-white/15 font-heading font-black text-xs uppercase shadow-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Salin link laporan transparansi Bansos"
                          >
                            <Copy size={14} className="text-[#DC2626]" />
                            <span>Salin Link</span>
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
                            <div className="card-brutal p-8 text-center bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 shadow-sm space-y-2">
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
                                className="card-brutal p-4 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
                                      className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 border border-black/20 dark:border-white/15 shrink-0 overflow-hidden shadow-xs cursor-pointer hover:border-[#FACC15]"
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
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 dark:bg-slate-800 border border-black/20 dark:border-white/15 flex flex-col items-center justify-center text-slate-500 shrink-0">
                                      <User size={20} />
                                      <span className="text-[9px] font-black uppercase mt-1">No KTP</span>
                                    </div>
                                  )}

                                  {/* Details */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-black text-xs px-2 py-0.5 bg-black text-[#FACC15] border border-black shadow-xs tracking-wide select-all">
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
                                      className="py-2 px-3.5 border border-black/20 dark:border-white/15 font-heading font-black text-xs uppercase shadow-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                                      className="py-2 px-3.5 border border-black/20 dark:border-white/15 font-heading font-black text-xs uppercase shadow-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                                    className="p-2 bg-white dark:bg-slate-800 text-red-600 hover:bg-red-600 hover:text-white border border-black/20 dark:border-white/15 shadow-xs transition-colors cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
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
                <AdminSecurityTab
                  activeAdminName={activeAdminName}
                  currentAdmin={currentAdmin}
                  allowMasterOnboarding={allowMasterOnboarding}
                  adminAccounts={adminAccounts}
                  adminAccountAction={adminAccountAction}
                  setAdminAccountAction={setAdminAccountAction}
                  isProcessingAccountAction={isProcessingAccountAction}
                  handleExecuteAdminAccountAction={handleExecuteAdminAccountAction}
                  showSelfCredForm={showSelfCredForm}
                  setShowSelfCredForm={setShowSelfCredForm}
                  selfCredForm={selfCredForm}
                  setSelfCredForm={setSelfCredForm}
                  isSavingSelfCred={isSavingSelfCred}
                  handleUpdateSelfCredentials={handleUpdateSelfCredentials}
                  activityLogs={activityLogs}
                  isLoadingActivityLogs={isLoadingActivityLogs}
                  refreshActivityLogs={refreshActivityLogs}
                  activityLogCategory={activityLogCategory}
                  setActivityLogCategory={setActivityLogCategory}
                  activityLogSearch={activityLogSearch}
                  setActivityLogSearch={setActivityLogSearch}
                  activityLogVisibleCount={activityLogVisibleCount}
                  setActivityLogVisibleCount={setActivityLogVisibleCount}
                  formData={formData}
                  showPasswordForm={showPasswordForm}
                  setShowPasswordForm={setShowPasswordForm}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  isApplyingPassword={isApplyingPassword}
                  handleApplyNewPassword={handleApplyNewPassword}
                  handleResetPinToDefault={handleResetPinToDefault}
                  handleResetPasswordToDefault={handleResetPasswordToDefault}
                  geminiKeyInput={geminiKeyInput}
                  setGeminiKeyInput={setGeminiKeyInput}
                  isTestingGemini={isTestingGemini}
                  handleTestGeminiKey={handleTestGeminiKey}
                  handleSaveGeminiKey={handleSaveGeminiKey}
                  discordWebhookConfig={discordWebhookConfig}
                  setDiscordWebhookConfig={setDiscordWebhookConfig}
                  isTestingWebhook={isTestingWebhook}
                  isSavingWebhook={isSavingWebhook}
                  handleTestDiscordWebhook={handleTestDiscordWebhook}
                  handleSaveDiscordWebhook={handleSaveDiscordWebhook}
                  handleLogout={handleLogout}
                />
              )}

              {activeTab === "doorprize_db" && (
                <DoorprizeAdminPanel onShowToast={onShowToast} />
              )}
                  </Suspense>

                </div>
              </div>

              {/* Bottom Actions (Fixed Bar at Bottom) - Kondisional: Hanya muncul di tab pengeditan form umum & konten */}
              {isContentConfigTab && (
                <div className="shrink-0 border-t-2 border-[#1A1A1A]/15 dark:border-slate-700/60 bg-white/95 dark:bg-[#1F222C]/95 backdrop-blur-sm px-3.5 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[0_-2px_0_#000]/5 animate-fadeIn">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-heading font-bold text-red-600 dark:text-red-400 hover:underline flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer py-1"
                    title="Reset konfigurasi website ke pengaturan bawaan awal"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Konfigurasi Awal</span>
                  </button>

                  <div className="flex items-center justify-end gap-2 w-full sm:w-auto flex-wrap">
                    {isDirty && (
                      <button
                        type="button"
                        onClick={() => {
                          if (lastSavedData) {
                            setFormData(JSON.parse(JSON.stringify(lastSavedData)));
                            onShowToast("Perubahan form dibatalkan.", "info");
                          }
                        }}
                        className="btn text-xs py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-black/20 dark:border-white/15/30 dark:border-white/20 font-bold active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                        title="Batalkan perubahan formulir dan kembalikan ke kondisi tersimpan terakhir"
                      >
                        Batal Editan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-secondary text-xs py-2 px-4 border border-black/15 dark:border-white/10 cursor-pointer"
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
                          ? "bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-black shadow-xs cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
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
            className="p-4 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 max-w-3xl w-full rounded-xl overflow-hidden flex flex-col gap-3 shadow-2xl max-h-[92vh]"
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
                className="w-8 h-8 rounded border border-black/20 dark:border-white/15 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 flex items-center justify-center font-bold text-sm shadow-xs active:translate-x-0.5 active:translate-y-0.5"
                title="Tutup Preview"
              >
                <X size={16} />
              </button>
            </div>

            {/* Container Gambar KTP Resolusi Penuh */}
            <div className="bg-slate-950 rounded-lg p-2 flex items-center justify-center border border-black/20 dark:border-white/15/30 min-h-[280px] max-h-[62vh] overflow-hidden">
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
                  className="btn py-1.5 px-3 bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs font-bold border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 hover:bg-slate-100"
                  title="Buka gambar di tab baru dengan URL Blob (Aman dari blank tab)"
                >
                  <ExternalLink size={13} />
                  <span>Buka di Tab Baru</span>
                </button>
                <a
                  href={previewKtp.image}
                  download={"KTP_" + (previewKtp.citizenId || "IC") + ".jpg"}
                  className="btn py-1.5 px-3 bg-[#FACC15] text-[#111827] text-xs font-black border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-1.5 hover:bg-yellow-400"
                  title="Unduh file KTP ke komputer"
                >
                  <span>Unduh KTP</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewKtp(null)}
                  className="btn py-1.5 px-3.5 bg-slate-800 text-white text-xs font-bold border border-black/20 dark:border-white/15 shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal for Member Registration Images (Photo / KTP / Status HUD) */}
      {previewImageDetail && (
        <div
          className="fixed inset-0 z-[135] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setPreviewImageDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-[#161820] border border-black/15 dark:border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div>
                <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                  {previewImageDetail.title || "Pratinjau Berkas"}
                </h4>
                {previewImageDetail.subtitle && (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {previewImageDetail.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageDetail(null)}
                className="w-8 h-8 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[65vh] overflow-hidden rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-center bg-black/90">
              <img
                src={previewImageDetail.url}
                alt={previewImageDetail.title || "Berkas"}
                className="w-full h-full object-contain max-h-[65vh]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => openImageSafely(previewImageDetail.url, previewImageDetail.title)}
                className="py-2 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-heading font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ExternalLink size={13} />
                <span>Buka di Tab Baru</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewImageDetail(null)}
                className="py-2 px-4 rounded-xl bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border border-amber-400 font-heading font-black text-xs uppercase shadow-sm cursor-pointer transition-all active:scale-98"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Tolak Pendaftaran Anggota */}
      {rejectTargetMember && (
        <div
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-[#161820] border border-black/15 dark:border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-heading font-black text-sm uppercase">
                <AlertTriangle size={18} />
                <span>Tolak Pendaftaran Anggota</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectTargetMember(null)}
                className="w-7 h-7 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                Anda akan menolak pengajuan calon anggota{" "}
                <strong className="text-red-600 dark:text-red-400 font-heading">
                  {rejectTargetMember.fullName || "Calon Anggota"}
                </strong>{" "}
                (CID: {rejectTargetMember.icNumber || "-"}). Masukkan alasan penolakan agar tercatat di sistem:
              </p>

              {/* Quick presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-heading font-black uppercase text-slate-500 dark:text-slate-400">
                  Pilih Alasan Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Foto KTP IC buram / Citizen ID tidak terbaca jelas",
                    "Screenshot Status HUD tidak utuh (Jam / Pekerjaan / Afiliasi terpotong)",
                    "Data formulir tidak sesuai dengan bukti KTP atau Status HUD",
                    "Foto profil karakter tidak jelas / tidak sesuai ketentuan",
                    "Terindikasi akun perusuh / data pendaftaran tidak valid",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReasonInput(preset)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 border border-black/10 dark:border-white/10 transition-colors text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-heading font-black uppercase text-slate-600 dark:text-slate-400">
                  Rincian Alasan Penolakan:
                </label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Tulis alasan penolakan pendaftaran anggota..."
                  rows={3}
                  className="input-field w-full p-2.5 text-xs bg-slate-50 dark:bg-[#12141a] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setRejectTargetMember(null)}
                className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10 font-heading font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingRegAction}
                onClick={handleConfirmRejectMember}
                className="py-2 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white border border-red-600 font-heading font-black text-xs uppercase shadow-sm cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                Konfirmasi Tolak
              </button>
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
          <div className="w-full max-w-xl max-h-[92vh] rounded-xl border border-black/15 dark:border-white/10 shadow-2xl bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
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
              <div className="p-3 bg-amber-50/70 dark:bg-[#14161F] border border-black/20 dark:border-white/15/20 dark:border-white/10 rounded-lg flex flex-col gap-2">
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
              <div className="p-3.5 bg-amber-50/70 dark:bg-[#14161F] border border-black/20 dark:border-white/15/20 dark:border-white/10 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText size={15} className="text-[#DC2626]" />
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
              <div className="p-3 bg-slate-50 dark:bg-[#14161F] border border-black/20 dark:border-white/15/20 dark:border-white/10 rounded-lg flex flex-col gap-2">
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
                  className="btn py-2 px-4 bg-white dark:bg-[#1E222D] text-slate-800 dark:text-slate-200 border border-black/20 dark:border-white/15 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="btn py-2 px-5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black border border-black/20 dark:border-white/15 shadow-xs text-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
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
          <div className="w-full max-w-xl max-h-[92vh] rounded-xl border border-black/15 dark:border-white/10 shadow-2xl bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
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
                    step="any"
                    placeholder="2500"
                    value={editingBansosProgram.totalCash ?? ""}
                    onChange={(e) => handleTotalCashChange(e.target.value)}
                    className="input-field w-full text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Daftar Barang / Komoditas Paket Bansos */}
              <div className="p-3 bg-amber-50/50 dark:bg-[#1E212B] border border-black/20 dark:border-white/15/40 rounded-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-black/10 dark:border-white/10">
                  <span className="font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Package size={14} className="text-amber-600" />
                    <span>Daftar Isi Paket Barang (Komoditas)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBansosItem}
                    className="py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-heading font-black text-[11px] border border-black shadow-xs cursor-pointer"
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
              <div className="p-3 bg-yellow-50/60 dark:bg-[#1E212B] border border-black/20 dark:border-white/15/40 rounded-lg flex flex-col gap-2.5">
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
                  className="btn py-2 px-4 bg-white dark:bg-[#1E222D] text-slate-800 dark:text-slate-200 border border-black/20 dark:border-white/15 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingBansosProgram}
                  className="btn py-2 px-5 bg-[#059669] hover:bg-[#047857] text-white font-heading font-black border border-black/20 dark:border-white/15 shadow-xs text-xs flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer"
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
      {isKasPaymentModalOpen && (
        <Suspense fallback={null}>
          <KasPaymentModal
            isOpen={isKasPaymentModalOpen}
            member={selectedKasMember}
            adminName={activeAdminName}
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
                recordActivity(
                  "KEUANGAN",
                  "Catat Iuran Kas Anggota",
                  `${updatedMember.fullName || selectedKasMember?.fullName || "Anggota"} (${updatedMember.icNumber || selectedKasMember?.icNumber || "-"})`
                );
              }
              loadKasLedgerCloud().then((list) => {
                if (Array.isArray(list)) setKasTransactions(list);
              });
            }}
          />
        </Suspense>
      )}

      {/* Modal Catat Pengeluaran Kas */}
      {isKasExpenseModalOpen && (
        <Suspense fallback={null}>
          <KasExpenseModal
            isOpen={isKasExpenseModalOpen}
            currentBalance={kasSummary.netBalance}
            oitaBalance={kasSummary.oitaBalance}
            darrenBalance={kasSummary.darrenBalance}
            adminName={activeAdminName}
            onClose={() => setIsKasExpenseModalOpen(false)}
            onShowToast={onShowToast}
            onSuccess={(tx) => {
              if (tx) {
                recordActivity(
                  "KEUANGAN",
                  "Catat Pengeluaran Kas",
                  `${tx.title || "Pengeluaran"} (-${formatCurrency(tx.amount)}, Kas ${tx.wallet || "Oita"})`
                );
              }
              loadKasLedgerCloud().then((list) => {
                if (Array.isArray(list)) setKasTransactions(list);
              });
            }}
          />
        </Suspense>
      )}

      {/* Modal Catat Pemasukan Kas (Non-Iuran / Donasi / Sponsorship / UMKM) */}
      {isKasIncomeModalOpen && (
        <Suspense fallback={null}>
          <KasIncomeModal
            isOpen={isKasIncomeModalOpen}
            currentBalance={kasSummary.netBalance}
            oitaBalance={kasSummary.oitaBalance}
            darrenBalance={kasSummary.darrenBalance}
            adminName={activeAdminName}
            onClose={() => setIsKasIncomeModalOpen(false)}
            onShowToast={onShowToast}
            onSuccess={(tx) => {
              if (tx) {
                recordActivity(
                  "KEUANGAN",
                  "Catat Pemasukan Kas",
                  `${tx.title || "Pemasukan"} (+${formatCurrency(tx.amount)}, Kas ${tx.wallet || "Oita"})`
                );
              }
              loadKasLedgerCloud().then((list) => {
                if (Array.isArray(list)) setKasTransactions(list);
              });
            }}
          />
        </Suspense>
      )}

      {/* Modal Edit Transaksi Kas (Revisi tanpa spam webhook Discord) */}
      {editKasTxModal.isOpen && editKasTxModal.tx && (() => {
        const txType = String(editKasTxModal.tx.type || "INCOME").toUpperCase();
        const isTransfer = txType === "TRANSFER";
        const isIncome = txType === "INCOME";
        const categoryOpts = isTransfer
          ? ["Pindah Kas Antar Bendahara"]
          : isIncome
          ? ["Iuran Kas Anggota", "Iuran Kas Donatur", ...INCOME_CATEGORIES]
          : [...EXPENSE_CATEGORIES];
        if (editKasTxModal.category && !categoryOpts.includes(editKasTxModal.category)) {
          categoryOpts.unshift(editKasTxModal.category);
        }

        return (
          <div
            className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={() => setEditKasTxModal((prev) => ({ ...prev, isOpen: false }))}
          >
            <div
              className="w-full max-w-lg bg-white dark:bg-[#161820] border-[3px] border-black dark:border-[#475569] rounded-2xl shadow-[8px_8px_0px_#000] p-4 sm:p-5 flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-black/15 dark:border-white/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FACC15] border border-black flex items-center justify-center text-slate-950 shrink-0">
                    <Edit2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                      Edit Transaksi Kas
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {isTransfer ? "Pindah Kas" : isIncome ? "Pemasukan" : "Pengeluaran"} • Tidak mengirim ulang notif Discord
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditKasTxModal((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditKasTx} className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                    Judul / Keterangan Transaksi *
                  </label>
                  <input
                    type="text"
                    required
                    value={editKasTxModal.title}
                    onChange={(e) => setEditKasTxModal((prev) => ({ ...prev, title: e.target.value }))}
                    className="input-field w-full text-xs sm:text-sm bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                      Nominal ($) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={editKasTxModal.amount}
                      onChange={(e) => setEditKasTxModal((prev) => ({ ...prev, amount: e.target.value }))}
                      className="input-field w-full font-mono text-sm font-bold bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                      {isTransfer ? "Arah Pindah Kas" : "Pos Kas Bendahara"}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["Oita", "Darren"].map((w) => {
                        const active = editKasTxModal.wallet === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setEditKasTxModal((prev) => ({ ...prev, wallet: w }))}
                            className={`py-2 px-2 rounded-lg text-xs font-heading font-black border cursor-pointer transition-colors ${
                              active
                                ? "bg-[#FACC15] text-slate-950 border-black shadow-xs"
                                : "bg-slate-50 dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/10"
                            }`}
                          >
                            {isTransfer ? (w === "Oita" ? "Oita -> Darren" : "Darren -> Oita") : `Kas ${w}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                      Kategori
                    </label>
                    <BrutalistSelect
                      value={editKasTxModal.category}
                      onChange={(val) => setEditKasTxModal((prev) => ({ ...prev, category: val }))}
                      options={categoryOpts}
                      ariaLabel="Kategori Transaksi Kas"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                      Penanggung Jawab
                    </label>
                    <input
                      type="text"
                      value={editKasTxModal.responsible}
                      onChange={(e) => setEditKasTxModal((prev) => ({ ...prev, responsible: e.target.value }))}
                      placeholder="Oita / Darren / Pengurus"
                      className="input-field w-full text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Transaksi
                  </label>
                  <BrutalistDatePicker
                    value={editKasTxModal.customDate}
                    onChange={(val) => setEditKasTxModal((prev) => ({ ...prev, customDate: val }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">
                    Catatan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={editKasTxModal.notes}
                    onChange={(e) => setEditKasTxModal((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Opsional..."
                    className="input-field w-full text-xs bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditKasTxModal((prev) => ({ ...prev, isOpen: false }))}
                    className="btn btn-secondary text-xs py-2 px-3.5 border border-black/15 dark:border-white/10 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editKasTxModal.isSubmitting}
                    className="btn text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black border border-emerald-700 shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>{editKasTxModal.isSubmitting ? "Menyimpan..." : "Simpan Revisi"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Pindah Kas Antar Bendahara (Oita <-> Darren) */}
      {isKasTransferModalOpen && (
        <Suspense fallback={null}>
          <KasTransferModal
            isOpen={isKasTransferModalOpen}
            currentBalance={kasSummary.netBalance}
            oitaBalance={kasSummary.oitaBalance}
            darrenBalance={kasSummary.darrenBalance}
            adminName={activeAdminName}
            onClose={() => setIsKasTransferModalOpen(false)}
            onShowToast={onShowToast}
            onSuccess={(tx) => {
              if (tx) {
                recordActivity(
                  "KEUANGAN",
                  "Pindah Kas Antar Bendahara",
                  `${formatCurrency(tx.amount)} (Kas ${tx.fromWallet || "Oita"} -> Kas ${tx.toWallet || "Darren"})`
                );
              }
              loadKasLedgerCloud().then((list) => {
                if (Array.isArray(list)) setKasTransactions(list);
              });
            }}
          />
        </Suspense>
      )}

      {/* Modal Buku Kas & Mutasi Keuangan */}
      {isKasLedgerModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Modal Salin Teks Laporan Kas (Discord / WA) */}
      {isKasCopyModalOpen && (
        <Suspense fallback={null}>
          <KasCopyModal
            isOpen={isKasCopyModalOpen}
            onClose={() => setIsKasCopyModalOpen(false)}
            transactions={kasTransactions}
            summary={kasSummary}
            onShowToast={onShowToast}
          />
        </Suspense>
      )}

      {/* Modal Tambah / Edit Penerima Jasra Luar Anggota */}
      {editingExternalJasra && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#151821] border border-black/20 dark:border-white/15 rounded-xl shadow-xl overflow-hidden my-auto text-slate-900 dark:text-slate-100">
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
                className="w-7 h-7 rounded border border-black/20 dark:border-white/15 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
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
                    <div className="relative w-28 h-20 rounded border border-black/20 dark:border-white/15 overflow-hidden bg-slate-900 shrink-0">
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
                  <BrutalistDatePicker
                    value={editingExternalJasra.dateGiven || ""}
                    onChange={(val) =>
                      setEditingExternalJasra({
                        ...editingExternalJasra,
                        dateGiven: val,
                      })
                    }
                    placeholder="Pilih tanggal..."
                    dropUp="auto"
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
                  className="btn py-2 px-4 bg-white dark:bg-[#1E222D] text-slate-800 dark:text-slate-200 border border-black/20 dark:border-white/15 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn py-2 px-5 bg-[#059669] hover:bg-[#047857] text-white font-heading font-black border border-black/20 dark:border-white/15 shadow-xs text-xs flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
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
                <div className="w-8 h-8 rounded bg-[#FACC15] border border-black/20 dark:border-white/15 flex items-center justify-center text-black shadow-xs">
                  <Menu size={16} className="text-[#DC2626]" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm text-slate-900 dark:text-slate-100">
                    Navigasi Menu Admin
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {activeAdminName} • {tabs.length} Menu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-lg bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border border-black/15 dark:border-white/10 flex items-center justify-center shadow-xs active:translate-y-0.5 cursor-pointer"
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
                        const { cleanTitle, countText } = parseTabLabel(tab.label);

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
                                ? "bg-[#FACC15] text-[#111827] border-black shadow-sm -translate-y-0.5"
                                : "bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 border-black/20 dark:border-[#475569] hover:bg-amber-50 dark:hover:bg-slate-800 shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon size={16} className={isActive ? "text-[#DC2626]" : "text-slate-500"} />
                              <span className="truncate">{cleanTitle}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {Boolean(countText) && (
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-black shadow-xs ${
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
                className="btn w-full py-2.5 bg-white dark:bg-[#20232E] text-slate-800 dark:text-slate-200 border border-black/15 dark:border-white/10 font-heading font-black text-xs rounded-lg shadow-xs active:translate-y-0.5 cursor-pointer min-h-[44px]"
              >
                Tutup Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Keluarkan Anggota & Catat Riwayat */}
      {dismissModal.isOpen && dismissModal.member && (
        <div
          onClick={() => {
            if (!dismissModal.isSubmitting) {
              setDismissModal((prev) => ({ ...prev, isOpen: false, member: null }));
            }
          }}
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-4 sm:p-5 bg-white dark:bg-[#1E212B] border border-black/15 dark:border-white/10 max-w-lg w-full rounded-xl overflow-hidden flex flex-col gap-4 shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between w-full pb-3 border-b-2 border-black/15 dark:border-white/15">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-rose-100 dark:bg-rose-950 border-2 border-rose-600 flex items-center justify-center text-rose-600 shrink-0">
                  <UserMinus size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                    Keluarkan Anggota Paguyuban
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Catat tanggal, jam, dan alasan resmi pengeluaran
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={dismissModal.isSubmitting}
                onClick={() => setDismissModal((prev) => ({ ...prev, isOpen: false, member: null }))}
                className="w-8 h-8 rounded border border-black/15 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info Anggota Yang Akan Dikeluarkan */}
            <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-900/60 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-black/20 dark:border-white/15 overflow-hidden shrink-0 bg-amber-100 flex items-center justify-center">
                {dismissModal.member.profilePhoto ? (
                  <img
                    src={dismissModal.member.profilePhoto}
                    alt={dismissModal.member.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-heading font-black text-base text-[#DC2626]">
                    {(dismissModal.member.fullName || "P").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="font-heading font-black text-sm text-slate-950 dark:text-slate-100 truncate">
                  {dismissModal.member.fullName || "Nama Tidak Tertera"}
                </h5>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                  <span>KTP: <strong className="text-slate-900 dark:text-slate-200">{dismissModal.member.icNumber || "-"}</strong></span>
                  <span>•</span>
                  <span>HP: <strong className="text-slate-900 dark:text-slate-200">{dismissModal.member.phone || "-"}</strong></span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                  Terdaftar: {dismissModal.member.regDate || (dismissModal.member.createdAt ? new Date(dismissModal.member.createdAt).toLocaleDateString("id-ID") : "-")}
                </span>
              </div>
            </div>

            {/* Form Input Alasan & Petugas */}
            <form onSubmit={handleConfirmDismiss} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Pengeluaran <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Mengundurkan diri secara baik-baik, melanggar aturan paguyuban, tidak aktif dalam jangka panjang..."
                  value={dismissModal.reason}
                  onChange={(e) => setDismissModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="input-field w-full p-2.5 text-xs bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg"
                />

                {/* Quick Chips Alasan */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500">Pilihan Cepat:</span>
                  {[
                    "Mengundurkan diri / mutasi",
                    "Melanggar aturan paguyuban",
                    "Tidak aktif / inaktif lama",
                    "Pelanggaran disiplin berat",
                    "Pindah kota / domisili",
                  ].map((quickText) => (
                    <button
                      key={quickText}
                      type="button"
                      onClick={() => setDismissModal((prev) => ({ ...prev, reason: quickText }))}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-black/20 dark:border-white/20 transition-colors cursor-pointer"
                    >
                      + {quickText}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Dicatat Oleh (Nama Petugas / Pengurus)
                </label>
                <div className="relative">
                  <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={dismissModal.dismissedBy}
                    onChange={(e) => setDismissModal((prev) => ({ ...prev, dismissedBy: e.target.value }))}
                    placeholder="Nama Pengurus LSM PPS"
                    className="input-field w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong>Pemberitahuan:</strong> Anggota ini akan dipindahkan ke arsip <em>Riwayat Dikeluarkan</em> lengkap dengan stempel waktu real-time (tanggal dan jam WIB). Hak kas dan jatah voucher Jasra akan otomatis dinonaktifkan. Data dapat dipulihkan sewaktu-waktu jika diperlukan.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  disabled={dismissModal.isSubmitting}
                  onClick={() => setDismissModal((prev) => ({ ...prev, isOpen: false, member: null }))}
                  className="btn py-2 px-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-heading font-black border border-black/15 dark:border-white/10 rounded cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={dismissModal.isSubmitting || !dismissModal.reason.trim()}
                  className="btn py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-black border border-black/20 dark:border-white/15 shadow-xs flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer rounded"
                >
                  <UserMinus size={14} />
                  <span>{dismissModal.isSubmitting ? "Memproses..." : "Konfirmasi Keluarkan Anggota"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Edit Profil & Dokumen Anggota */}
      {editMemberModal.isOpen && editMemberModal.member && (
        <div
          onClick={() => {
            if (!editMemberModal.isSubmitting) {
              setEditMemberModal((prev) => ({ ...prev, isOpen: false, member: null }));
            }
          }}
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-4 sm:p-6 bg-white dark:bg-[#1E212B] border border-black/20 dark:border-white/15 max-w-xl w-full rounded-2xl overflow-hidden flex flex-col gap-4 shadow-2xl max-h-[92vh] overflow-y-auto select-text"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between w-full pb-3 border-b border-black/15 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-500/80 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 shadow-xs">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                    Edit Identitas Anggota
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Perbarui nama IC, Citizen ID, no HP, atau perbaiki foto profil & KTP
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={editMemberModal.isSubmitting}
                onClick={() => setEditMemberModal((prev) => ({ ...prev, isOpen: false, member: null }))}
                className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Edit */}
            <form onSubmit={handleSaveEditMember} className="flex flex-col gap-4">
              {/* Nama IC & No KTP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap IC <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editMemberModal.fullName}
                    onChange={(e) => setEditMemberModal((prev) => ({ ...prev, fullName: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: LEENO HAN"
                    className="input-field w-full px-3 py-2 text-xs font-bold uppercase bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Sesuai nama KTP IC terbaru</span>
                </div>

                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Citizen ID (No KTP) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editMemberModal.icNumber}
                    onChange={(e) => setEditMemberModal((prev) => ({ ...prev, icNumber: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
                    placeholder="Contoh: E8P9Y93R"
                    className="input-field w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">ID unik warga di Los Santos</span>
                </div>
              </div>

              {/* No Telepon / WA */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon / WA (IC)
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={editMemberModal.phone}
                    onChange={(e) => setEditMemberModal((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Contoh: 88919658"
                    className="input-field w-full pl-9 pr-3 py-2 text-xs font-mono bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                </div>
              </div>

              {/* Pekerjaan (Job) & Afiliasi / Gang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Pekerjaan (Job IC)
                  </label>
                  <input
                    type="text"
                    value={editMemberModal.statusJob || ""}
                    onChange={(e) => setEditMemberModal((prev) => ({ ...prev, statusJob: e.target.value }))}
                    placeholder="Contoh: Civilian - Freelancer"
                    className="input-field w-full px-3 py-2 text-xs bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Afiliasi / Gang
                  </label>
                  <input
                    type="text"
                    value={editMemberModal.statusGang || ""}
                    onChange={(e) => setEditMemberModal((prev) => ({ ...prev, statusGang: e.target.value }))}
                    placeholder="Contoh: No Gang - Unaffiliated"
                    className="input-field w-full px-3 py-2 text-xs bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                </div>
              </div>

              {/* Upload Foto Profil & KTP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-black/10 dark:border-white/10">
                {/* Foto Profil */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#15171F] border border-black/15 dark:border-white/10 flex flex-col gap-2">
                  <span className="text-[11px] font-heading font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera size={13} className="text-amber-600" />
                    <span>Foto Profil Karakter</span>
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full border border-black/20 dark:border-white/15 overflow-hidden shrink-0 bg-amber-100 flex items-center justify-center">
                      {editMemberModal.profilePhoto ? (
                        <img
                          src={editMemberModal.profilePhoto}
                          alt="Profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-heading font-black text-sm text-[#DC2626]">
                          {(editMemberModal.fullName || "P").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border border-black/20 shadow-xs cursor-pointer active:scale-95 transition-all text-center">
                        <Upload size={13} />
                        <span>Ganti Foto Profil</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleEditMemberPhotoUpload(e.target.files[0], "profilePhoto");
                            }
                          }}
                        />
                      </label>

                      {editMemberModal.profilePhoto !== editMemberModal.member?.profilePhoto && (
                        <button
                          type="button"
                          onClick={() => setEditMemberModal((prev) => ({ ...prev, profilePhoto: prev.member?.profilePhoto || "" }))}
                          className="text-[10px] font-mono text-rose-600 hover:underline text-left cursor-pointer"
                        >
                          Batalkan perubahan foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Foto KTP IC */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#15171F] border border-black/15 dark:border-white/10 flex flex-col gap-2">
                  <span className="text-[11px] font-heading font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText size={13} className="text-[#DC2626]" />
                    <span>Dokumen KTP IC</span>
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg border border-black/20 dark:border-white/15 overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      {editMemberModal.icPhoto ? (
                        <img
                          src={editMemberModal.icPhoto}
                          alt="KTP"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-400 italic">Tanpa KTP</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-black/15 dark:border-white/10 shadow-xs cursor-pointer active:scale-95 transition-all text-center">
                        <Upload size={13} />
                        <span>Ganti Foto KTP</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleEditMemberPhotoUpload(e.target.files[0], "icPhoto");
                            }
                          }}
                        />
                      </label>

                      {isScanningEditKtp && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-300 dark:border-amber-800 animate-pulse">
                          <Loader2 size={12} className="animate-spin text-amber-600 shrink-0" />
                          <span>Memindai KTP (AI OCR)...</span>
                        </div>
                      )}

                      {editKtpOcrResult && !isScanningEditKtp && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Auto-Fill OCR: {editKtpOcrResult.name || "-"} ({editKtpOcrResult.cid || "-"})</span>
                        </div>
                      )}

                      {editMemberModal.icPhoto !== editMemberModal.member?.icPhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditMemberModal((prev) => ({ ...prev, icPhoto: prev.member?.icPhoto || "" }));
                            setEditKtpOcrResult(null);
                          }}
                          className="text-[10px] font-mono text-rose-600 hover:underline text-left cursor-pointer"
                        >
                          Batalkan perubahan KTP
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Note Keamanan Data */}
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/50 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong>Riwayat Tetap Aman:</strong> Tanggal awal pendaftaran, status langganan iuran kas 30 hari, dan riwayat voucher Jasra tetap dipertahankan utuh di database.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  disabled={editMemberModal.isSubmitting}
                  onClick={() => setEditMemberModal((prev) => ({ ...prev, isOpen: false, member: null }))}
                  className="btn py-2 px-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-heading font-black border border-black/15 dark:border-white/10 rounded-lg cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={editMemberModal.isSubmitting || !editMemberModal.fullName.trim() || !editMemberModal.icNumber.trim()}
                  className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border border-black/20 shadow-xs flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer rounded-lg"
                >
                  <Save size={14} />
                  <span>{editMemberModal.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Tambah Divisi / Jabatan Baru */}
      {addDivisionModal.isOpen && (
        <div
          onClick={() => setAddDivisionModal((prev) => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-4 sm:p-6 bg-white dark:bg-[#1E212B] border border-black/20 dark:border-white/15 max-w-xl w-full rounded-2xl overflow-hidden flex flex-col gap-4 shadow-2xl max-h-[92vh] overflow-y-auto select-text"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between w-full pb-3 border-b border-black/15 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#FACC15] text-[#111827] border border-yellow-500/80 flex items-center justify-center shrink-0 shadow-xs">
                  <Layers size={18} className="text-[#111827]" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                    Tambah Divisi / Jabatan Baru
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Tambahkan divisi kepengurusan baru ke bagan struktur organisasi LSM PPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddDivisionModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Template Chips */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#15171F] border border-black/10 dark:border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-heading font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                PILIHAN TEMPLATE DIVISI CEPAT (KLIK UNTUK MENGISI OTOMATIS):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DIVISION_PRESETS.map((preset, pIdx) => {
                  const isSelected = addDivisionModal.role === preset.role;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleSelectDivisionPreset(preset)}
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[#FACC15] text-slate-950 border-black font-black shadow-xs"
                          : "bg-white dark:bg-[#20232E] text-slate-700 dark:text-slate-300 border-black/15 dark:border-white/15 hover:border-black"
                      }`}
                    >
                      + {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Input Divisi */}
            <form onSubmit={handleSaveAddDivision} className="flex flex-col gap-4">
              {/* Nama Divisi & Tingkat Struktur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Nama Divisi / Jabatan <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Divisi Keamanan & Satgas"
                    value={addDivisionModal.role}
                    onChange={(e) => setAddDivisionModal((prev) => ({ ...prev, role: e.target.value }))}
                    className="input-field w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Nama jabatan resmi yang tampil di bagan</span>
                </div>

                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Bagan Struktur <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={addDivisionModal.level}
                    onChange={(e) => setAddDivisionModal((prev) => ({ ...prev, level: Number(e.target.value) || 4 }))}
                    className="input-field w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs cursor-pointer"
                  >
                    <option value={4}>Tingkat 4: Badan Pengurus Harian (BPH) / Kepala Divisi</option>
                    <option value={5}>Tingkat 5: Koordinator Wilayah & Komando Satgas</option>
                    <option value={3}>Tingkat 3: Wakil Ketua Umum & Komando Lapangan</option>
                    <option value={2}>Tingkat 2: Majelis Pertimbangan Organisasi (MPO)</option>
                    <option value={1}>Tingkat 1: Dewan Pimpinan Pusat (DPP)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Menentukan posisi hirarki di diagram alur</span>
                </div>
              </div>

              {/* Nama Kepala Divisi & Foto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Nama Kepala / Koordinator Divisi <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BENTO"
                    value={addDivisionModal.name}
                    onChange={(e) => setAddDivisionModal((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))}
                    className="input-field w-full px-3 py-2 text-xs font-bold uppercase bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Nama karakter pejabat in-game</span>
                </div>

                <div>
                  <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Foto Profil Kepala Divisi
                  </label>
                  <div className="flex items-center gap-2.5">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border border-black/20 shadow-xs cursor-pointer active:scale-95 transition-all text-center">
                      <Upload size={13} />
                      <span>Unggah Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAddDivisionPhoto(e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {addDivisionModal.photo ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={addDivisionModal.photo}
                          alt="Foto"
                          className="w-8 h-8 rounded-lg object-cover border border-black/20 dark:border-white/15"
                        />
                        <button
                          type="button"
                          onClick={() => setAddDivisionModal((prev) => ({ ...prev, photo: "" }))}
                          className="text-[10px] font-mono text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Belum ada foto</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Deskripsi Tugas Divisi */}
              <div>
                <label className="block text-xs font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Tugas Divisi (Teks di Bawah Nama)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ketik tugas dan fungsi pokok divisi ini atau gunakan otomatis dari template..."
                  value={addDivisionModal.desc}
                  onChange={(e) => setAddDivisionModal((prev) => ({ ...prev, desc: e.target.value }))}
                  className="input-field w-full p-2.5 text-xs bg-white dark:bg-[#14161F] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/10 rounded-lg shadow-xs"
                />
              </div>

              {/* Staf Divisi Awal (Opsional) */}
              <div className="pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-heading font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users size={13} className="text-[#DC2626]" />
                    <span>Anggota / Staf Divisi ({addDivisionModal.subMembers?.length || 0})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDivisionSubMember}
                    className="btn text-[10px] py-1 px-2.5 bg-[#FACC15] text-[#111827] border border-black/20 font-black cursor-pointer shadow-xs"
                  >
                    + Tambah Staf
                  </button>
                </div>

                {addDivisionModal.subMembers?.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {addDivisionModal.subMembers.map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 flex items-center gap-2"
                      >
                        <span className="text-[10px] font-mono font-bold text-slate-400">#{sIdx + 1}</span>
                        <input
                          type="text"
                          placeholder="Nama Staf"
                          value={sub.name || ""}
                          onChange={(e) => handleDivisionSubMemberChange(sIdx, "name", e.target.value)}
                          className="input-field text-xs py-1 px-2 flex-1 bg-white dark:bg-[#20232E] border border-black/15 dark:border-white/10 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Jabatan Staf"
                          value={sub.role || ""}
                          onChange={(e) => handleDivisionSubMemberChange(sIdx, "role", e.target.value)}
                          className="input-field text-xs py-1 px-2 flex-1 bg-white dark:bg-[#20232E] border border-black/15 dark:border-white/10 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDivisionSubMember(sIdx)}
                          className="w-6 h-6 rounded flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          title="Hapus Staf"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-slate-500 italic">
                    Belum ada staf awal. Anda dapat menambahkannya nanti kapan saja.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setAddDivisionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="btn py-2 px-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-heading font-black border border-black/15 dark:border-white/10 rounded-lg cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={!addDivisionModal.role.trim() || !addDivisionModal.name.trim()}
                  className="btn py-2 px-4 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 text-xs font-heading font-black border border-black/20 shadow-xs flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer rounded-lg"
                >
                  <Plus size={14} className="text-[#DC2626]" />
                  <span>Tambahkan Divisi</span>
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
