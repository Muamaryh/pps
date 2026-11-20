/**
 * Discord Webhook Notification Service for LSM Paguyuban Pizza Sandy Shores (PPS)
 * Sends clean, non-blocking embed notifications to the admin Discord channel
 * whenever new registrations, service requests, or Bansos claims arrive.
 */

import { loadDiscordWebhookConfig, saveDiscordWebhookConfig } from "./firebase";

export const DEFAULT_DISCORD_WEBHOOK_CONFIG = {
  webhookUrl: "",
  enabled: true,
  notifyMemberReg: true,
  notifyServiceUmkm: true,
  notifyServiceMeeting: true,
  notifyBansos: true,
};

let cachedWebhookConfig = null;
let loadConfigPromise = null;

export function isValidDiscordWebhookUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(url.trim());
}

export async function getDiscordWebhookConfig(forceRefresh = false) {
  if (!forceRefresh && cachedWebhookConfig) return cachedWebhookConfig;

  try {
    if (!loadConfigPromise || forceRefresh) {
      loadConfigPromise = loadDiscordWebhookConfig().finally(() => {
        loadConfigPromise = null;
      });
    }
    const cloudCfg = await loadConfigPromise;
    cachedWebhookConfig = {
      ...DEFAULT_DISCORD_WEBHOOK_CONFIG,
      ...(cloudCfg || {}),
    };
    return cachedWebhookConfig;
  } catch (err) {
    console.warn("[Discord Webhook] Failed to load config:", err);
    return { ...DEFAULT_DISCORD_WEBHOOK_CONFIG };
  }
}

export async function updateDiscordWebhookConfig(nextConfig) {
  const saved = await saveDiscordWebhookConfig(nextConfig);
  cachedWebhookConfig = {
    ...DEFAULT_DISCORD_WEBHOOK_CONFIG,
    ...saved,
  };
  return cachedWebhookConfig;
}

function getAdminPortalUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/admin`;
  }
  return "https://lsm-pps.netlify.app/admin";
}

function buildEmbed(eventType, data = {}) {
  const adminUrl = getAdminPortalUrl();
  const timestamp = new Date().toISOString();
  const footer = { text: "LSM Paguyuban Pizza Sandy Shores Notifikasi Otomatis" };

  if (eventType === "MEMBER_REGISTRATION") {
    return {
      title: "Pendaftaran Anggota Baru Masuk",
      description: `Calon anggota baru telah mengirim berkas KTP IC & Status HUD dan menunggu verifikasi di [Portal Admin](${adminUrl}).`,
      color: 0xfacc15,
      fields: [
        { name: "Nama Lengkap (IC)", value: String(data.fullName || "-"), inline: true },
        { name: "Citizen ID / No KTP", value: `\`${data.icNumber || "-"}\``, inline: true },
        { name: "No. HP / WA IC", value: String(data.phone || "-"), inline: true },
        { name: "Discord", value: String(data.discordTag || "-"), inline: true },
        { name: "Pekerjaan (Job)", value: String(data.statusJob || "-"), inline: true },
        { name: "Afiliasi / Gang", value: String(data.statusGang || "-"), inline: true },
        { name: "Waktu HUD IC", value: String(data.statusTime || "-"), inline: true },
        { name: "Role", value: "Menunggu Verifikasi Anggota", inline: true },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "SERVICE_UMKM") {
    return {
      title: "Pengajuan Stan Lapak UMKM Baru",
      description: `Tiket layanan UMKM baru telah masuk dan menunggu peninjauan di [Portal Admin](${adminUrl}).`,
      color: 0x10b981,
      fields: [
        { name: "Nomor Tiket", value: `\`#${data.id || "-"}\``, inline: true },
        { name: "Role", value: "VISITOR", inline: true },
        { name: "Tag / Username Discord (OOC)", value: String(data.discordTag || "-"), inline: true },
        { name: "Nama Lengkap IC", value: String(data.characterName || data.namaKtp || "-"), inline: true },
        { name: "Kewarganegaraan", value: String(data.nationality || "INDONESIA"), inline: true },
        { name: "Nomor KTP IC", value: `\`${data.citizenId || "-"}\``, inline: true },
        { name: "Nomor HP IC", value: String(data.phoneNumber || "-"), inline: true },
        { name: "Nama Usaha/Stan", value: String(data.businessName || "-"), inline: true },
        { name: "Jenis Usaha/Produk", value: String(data.businessCategory || data.businessType || "-"), inline: true },
        { name: "Lokasi Lapak", value: String(data.preferredLocation || data.locationPreference || "Area Pizza Sandy Shores"), inline: true },
        { name: "Kebutuhan Stan/Fasilitas", value: String(data.facilityNeeds || data.standNeeds || "-"), inline: false },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "SERVICE_MEETING") {
    return {
      title: "Permintaan Jadwal Meeting Baru",
      description: `Permintaan meeting / audiensi baru telah diajukan warga. Tinjau di [Portal Admin](${adminUrl}).`,
      color: 0x3b82f6,
      fields: [
        { name: "Nomor Tiket", value: `\`#${data.id || "-"}\``, inline: true },
        { name: "Role", value: "VISITOR", inline: true },
        { name: "Tag / Username Discord (OOC)", value: String(data.discordTag || "-"), inline: true },
        { name: "Nama Lengkap", value: String(data.characterName || data.namaKtp || "-"), inline: true },
        { name: "Kewarganegaraan", value: String(data.nationality || "INDONESIA"), inline: true },
        { name: "Nomor KTP IC", value: `\`${data.citizenId || "-"}\``, inline: true },
        { name: "Nomor HP IC", value: String(data.phoneNumber || "-"), inline: true },
        { name: "Asal Instansi / Fraksi / Komunitas", value: String(data.organization || data.agencyName || "-"), inline: true },
        { name: "Topik Pokok Pertemuan", value: String(data.meetingTopic || "-"), inline: true },
        { name: "Rincian Agenda & Poin Pembahasan", value: String(data.agendaDetail || data.description || "-").slice(0, 1000), inline: false },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "BANSOS_CLAIM") {
    return {
      title: "Klaim Bantuan Sosial (Bansos) Masuk",
      description: `Warga baru saja mendaftarkan klaim bantuan sosial. Cek berkas di [Portal Admin](${adminUrl}).`,
      color: 0xdc2626,
      fields: [
        { name: "Program Bansos", value: String(data.programTitle || "-"), inline: false },
        { name: "Nama Lengkap IC", value: String(data.fullName || "-"), inline: true },
        { name: "Citizen ID", value: `\`${data.citizenId || "-"}\``, inline: true },
        { name: "Kode Kupon", value: `\`${data.couponCode || data.claimCode || data.kodeKupon || "-"}\``, inline: true },
      ],
      footer,
      timestamp,
    };
  }

  // TEST notification
  return {
    title: "Tes Koneksi Webhook LSM PPS Berhasil",
    description: `Notifikasi otomatis dari [Portal Admin LSM PPS](${adminUrl}) sudah terhubung ke channel Discord ini.`,
    color: 0xfacc15,
    fields: [
      { name: "Status", value: "Aktif & Siap Menerima Laporan", inline: true },
      { name: "Pengirim", value: "Sistem Portal Admin LSM PPS", inline: true },
    ],
    footer,
    timestamp,
  };
}

/**
 * Send Discord webhook notification (non-blocking by default for user flows)
 */
export async function sendDiscordNotification(eventType, data = {}, customUrl = null) {
  try {
    const cfg = await getDiscordWebhookConfig(eventType === "TEST");
    const targetUrl = (customUrl || cfg.webhookUrl || "").trim();

    if (!isValidDiscordWebhookUrl(targetUrl)) {
      return { ok: false, skipped: true, reason: "URL Webhook Discord belum diisi atau tidak valid." };
    }

    if (eventType !== "TEST") {
      if (!cfg.enabled) return { ok: false, skipped: true, reason: "Notifikasi Discord sedang dinonaktifkan." };
      if (eventType === "MEMBER_REGISTRATION" && !cfg.notifyMemberReg) return { ok: false, skipped: true };
      if (eventType === "SERVICE_UMKM" && !cfg.notifyServiceUmkm) return { ok: false, skipped: true };
      if (eventType === "SERVICE_MEETING" && !cfg.notifyServiceMeeting) return { ok: false, skipped: true };
      if (eventType === "BANSOS_CLAIM" && !cfg.notifyBansos) return { ok: false, skipped: true };
    }

    const embed = buildEmbed(eventType, data);
    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Portal LSM PPS",
        embeds: [embed],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return { ok: false, error: `Discord merespons HTTP ${resp.status}${errText ? `: ${errText.slice(0, 120)}` : ""}` };
    }

    return { ok: true };
  } catch (err) {
    console.warn("[Discord Webhook] Send failed:", err);
    return { ok: false, error: err?.message || "Gagal menghubungi server Discord." };
  }
}
