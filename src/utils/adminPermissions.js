// ==========================================================================
// ADMIN ROLE-BASED ACCESS CONTROL (RBAC) - LSM PAGUYUBAN PIZZA SANDY SHORES
// Single source of truth for division permissions across the Admin Panel
// ==========================================================================

export const ALL_ADMIN_TABS = [
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
  "doorprize_db",
  "event_db",
  "bansos_db",
  "security",
];

export const ADMIN_TAB_LABELS = {
  overview: "Ringkasan Panel",
  identity: "Brand & Menu",
  hero: "Beranda & 4 Pilar",
  about: "Tentang & Visi",
  org: "Pengurus & Divisi",
  gallery: "Dokumentasi",
  submissions: "Kotak Masuk",
  member_registrations: "Verifikasi Anggota",
  members_db: "Database Anggota",
  member_kas: "Catat Uang Kas",
  jasra_panel: "Voucher Jasra",
  kas_db: "Keuangan",
  doorprize_db: "Undian Senam",
  event_db: "Kelola Event",
  bansos_db: "Bansos Warga",
  security: "Keamanan",
};

export const ADMIN_ACCESS_ROLES = {
  master: {
    id: "master",
    label: "Master (Pembuat Web)",
    shortLabel: "Master",
    description: "Akses penuh ke semua tab, manajemen akun pengurus, hak akses, dan keamanan sistem.",
    badgeClass:
      "bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-rose-300 border-red-400/70 dark:border-rose-600/60",
    allowedTabs: [...ALL_ADMIN_TABS],
  },
  sekretaris: {
    id: "sekretaris",
    label: "Sekretaris",
    shortLabel: "Sekretaris",
    description: "Konten portal, kepengurusan, kotak masuk, undian senam, event, dan bansos warga.",
    badgeClass:
      "bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-400/70 dark:border-amber-600/60",
    allowedTabs: [
      "overview",
      "identity",
      "hero",
      "about",
      "org",
      "submissions",
      "doorprize_db",
      "event_db",
      "bansos_db",
      "security",
    ],
  },
  media: {
    id: "media",
    label: "Media",
    shortLabel: "Media",
    description: "Mengelola galeri dan dokumentasi kegiatan warga Sandy Shores.",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-300 border-purple-400/70 dark:border-purple-600/60",
    allowedTabs: ["gallery", "security"],
  },
  koordinator_humas: {
    id: "koordinator_humas",
    label: "Koordinator & Humas",
    shortLabel: "Korlap / Humas",
    description: "Mengelola kotak masuk layanan, verifikasi calon anggota (SC), dan database anggota.",
    badgeClass:
      "bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 border-sky-400/70 dark:border-sky-600/60",
    allowedTabs: ["submissions", "member_registrations", "members_db", "security"],
  },
  bendahara: {
    id: "bendahara",
    label: "Bendahara",
    shortLabel: "Bendahara",
    description: "Pencatatan uang kas anggota dan buku keuangan kas LSM.",
    badgeClass:
      "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-emerald-400/70 dark:border-emerald-600/60",
    allowedTabs: ["member_kas", "kas_db", "security"],
  },
  logistik: {
    id: "logistik",
    label: "Logistik",
    shortLabel: "Logistik",
    description: "Mengelola batch, jatah, dan distribusi Voucher Jasra.",
    badgeClass:
      "bg-orange-100 dark:bg-orange-950/70 text-orange-900 dark:text-orange-300 border-orange-400/70 dark:border-orange-600/60",
    allowedTabs: ["jasra_panel", "security"],
  },
};

export const ADMIN_ACCESS_ROLE_LIST = [
  ADMIN_ACCESS_ROLES.master,
  ADMIN_ACCESS_ROLES.sekretaris,
  ADMIN_ACCESS_ROLES.media,
  ADMIN_ACCESS_ROLES.koordinator_humas,
  ADMIN_ACCESS_ROLES.bendahara,
  ADMIN_ACCESS_ROLES.logistik,
];

export const NON_MASTER_ACCESS_ROLE_LIST = ADMIN_ACCESS_ROLE_LIST.filter(
  (role) => role.id !== "master"
);

// Founder / web creator IC names that always hold Master authority
const FOUNDER_MASTER_NAMES = ["kwaza waza"];

/**
 * Resolve normalized access level ID for an admin account.
 * Supports explicit `accessLevel` field and automatic inference for legacy accounts from `role`.
 */
export function resolveAdminAccessLevel(account) {
  if (!account) return "sekretaris";

  const cleanName = String(account.name || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (cleanName && FOUNDER_MASTER_NAMES.includes(cleanName)) {
    return "master";
  }

  const explicit = String(account.accessLevel || "").trim().toLowerCase();
  if (explicit && ADMIN_ACCESS_ROLES[explicit]) {
    return explicit;
  }

  const roleText = String(account.role || "").trim().toLowerCase();
  if (
    roleText.includes("master") ||
    roleText.includes("pembuat") ||
    roleText.includes("developer") ||
    roleText.includes("creator") ||
    roleText.includes("owner") ||
    roleText.includes("super")
  ) {
    return "master";
  }
  if (roleText.includes("sekretaris") || roleText.includes("sekertaris") || roleText.includes("sekre")) {
    return "sekretaris";
  }
  if (
    roleText.includes("media") ||
    roleText.includes("dokumentasi") ||
    roleText.includes("publikasi") ||
    roleText.includes("editor")
  ) {
    return "media";
  }
  if (
    roleText.includes("koordinator") ||
    roleText.includes("kordinator") ||
    roleText.includes("korlap") ||
    roleText.includes("humas")
  ) {
    return "koordinator_humas";
  }
  if (roleText.includes("bendahara") || roleText.includes("keuangan") || roleText.includes("kas")) {
    return "bendahara";
  }
  if (roleText.includes("logistik") || roleText.includes("jasra")) {
    return "logistik";
  }

  // Safe default for older generic "Pengurus LSM" accounts until Master sets their division
  return "sekretaris";
}

export function getAdminRoleConfig(accountOrLevel) {
  const levelId =
    typeof accountOrLevel === "string" && ADMIN_ACCESS_ROLES[accountOrLevel]
      ? accountOrLevel
      : resolveAdminAccessLevel(accountOrLevel);
  return ADMIN_ACCESS_ROLES[levelId] || ADMIN_ACCESS_ROLES.sekretaris;
}

export function isMasterAdmin(account) {
  return resolveAdminAccessLevel(account) === "master";
}

export function hasAnyMasterAccount(accounts = []) {
  if (!Array.isArray(accounts)) return false;
  return accounts.some((acc) => resolveAdminAccessLevel(acc) === "master");
}

export function getAllowedTabsForAdmin(account) {
  return getAdminRoleConfig(account).allowedTabs;
}

export function canAccessAdminTab(account, tabId) {
  if (!tabId) return false;
  return getAllowedTabsForAdmin(account).includes(tabId);
}

export function getDefaultTabForAdmin(account) {
  const allowed = getAllowedTabsForAdmin(account);
  return allowed.find((t) => t !== "security") || "security";
}

export function getAllowedRoleNamesForTab(tabId) {
  return ADMIN_ACCESS_ROLE_LIST.filter(
    (roleCfg) => roleCfg.id !== "master" && roleCfg.allowedTabs.includes(tabId)
  ).map((roleCfg) => roleCfg.label);
}

export function getTabAccessDeniedMessage(tabId) {
  const tabLabel = ADMIN_TAB_LABELS[tabId] || tabId;
  const divisionNames = getAllowedRoleNamesForTab(tabId);
  if (divisionNames.length === 0) {
    return `Menu "${tabLabel}" hanya dapat diakses oleh Master.`;
  }
  return `Menu "${tabLabel}" hanya dapat diakses oleh: ${divisionNames.join(", ")}, atau Master.`;
}
