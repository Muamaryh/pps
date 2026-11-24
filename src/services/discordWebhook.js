/**
 * Discord Webhook Notification Service for LSM Paguyuban Pizza Sandy Shores (PPS)
 * Sends clean, non-blocking embed notifications to the admin Discord channel
 * whenever new registrations, service requests, or Bansos claims arrive.
 */

import { loadDiscordWebhookConfig, saveDiscordWebhookConfig } from "./firebase";

export const DISCORD_WEBHOOK_AVATAR_URL = "https://lsmpps.my.id/webhook-avatar.jpg";

export const DEFAULT_DISCORD_WEBHOOK_CONFIG = {
  webhookUrl: "",
  kasWebhookUrl: "",
  enabled: true,
  notifyMemberReg: true,
  notifyMemberDecision: true,
  notifyServiceUmkm: true,
  notifyServiceMeeting: true,
  notifyBansos: true,
  notifyKas: true,
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

function getAdminPortalUrl(tab = "") {
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/admin`
      : "https://lsmpps.my.id/admin";
  return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
}

function formatKasAmount(amount) {
  const num = Math.abs(Number(amount) || 0);
  return `$${num.toLocaleString("id-ID")}`;
}

function formatKasDateTime(timestampOrDate, fallbackDate) {
  const d = timestampOrDate ? new Date(timestampOrDate) : new Date();
  if (isNaN(d.getTime())) return String(fallbackDate || "-");
  const datePart = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart}, ${timePart} WIB`;
}

function formatSignedKasCurrency(amount) {
  const num = Number(amount) || 0;
  if (num < 0) return `-$${Math.abs(num).toLocaleString("id-ID")}`;
  return `$${num.toLocaleString("id-ID")}`;
}

function buildKasDetailText(data = {}) {
  const lines = [String(data.title || "-")];
  if (data.memberName || data.memberCid) {
    lines.push(`Anggota: ${data.memberName || "-"}${data.memberCid ? ` (${data.memberCid})` : ""}`);
  }
  if (data.notes) {
    lines.push(`Catatan: ${String(data.notes).slice(0, 350)}`);
  }
  return lines.join("\n");
}

function buildEmbed(eventType, data = {}) {
  const adminUrl = getAdminPortalUrl();
  const timestamp = new Date().toISOString();
  const footer = {
    text: "LSM Paguyuban Pizza Sandy Shores Notifikasi Otomatis",
    icon_url: DISCORD_WEBHOOK_AVATAR_URL,
  };

  if (eventType === "MEMBER_REGISTRATION") {
    const verifyUrl = getAdminPortalUrl("member_registrations");
    return {
      title: "Pendaftaran Anggota Baru Masuk",
      description: `Calon anggota baru telah mengirim berkas KTP IC & Status HUD dan menunggu verifikasi di [Portal Admin](${verifyUrl}).`,
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

  if (eventType === "MEMBER_APPROVED") {
    const membersUrl = getAdminPortalUrl("members_db");
    return {
      title: "Pendaftaran Anggota Disetujui",
      description: `Berkas calon anggota telah resmi diverifikasi dan diterima sebagai Anggota Resmi LSM PPS. Lihat di [Database Anggota](${membersUrl}).`,
      color: 0x10b981,
      fields: [
        { name: "Nama Lengkap (IC)", value: String(data.fullName || "-"), inline: true },
        { name: "Citizen ID / No KTP", value: `\`${data.icNumber || "-"}\``, inline: true },
        { name: "Discord", value: String(data.discordTag || "-"), inline: true },
        { name: "Status", value: "ANGGOTA RESMI (DISETUJUI)", inline: true },
        { name: "Diverifikasi Oleh", value: String(data.verifiedBy || "Admin LSM PPS"), inline: true },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "MEMBER_REJECTED") {
    const verifyUrl = getAdminPortalUrl("member_registrations");
    return {
      title: "Pendaftaran Anggota Ditolak",
      description: `Berkas calon anggota ditolak pada tahap verifikasi. Tinjau arsip di [Portal Admin](${verifyUrl}).`,
      color: 0xef4444,
      fields: [
        { name: "Nama Lengkap (IC)", value: String(data.fullName || "-"), inline: true },
        { name: "Citizen ID / No KTP", value: `\`${data.icNumber || "-"}\``, inline: true },
        { name: "Discord", value: String(data.discordTag || "-"), inline: true },
        { name: "Status", value: "DITOLAK", inline: true },
        { name: "Diproses Oleh", value: String(data.rejectedBy || "Admin LSM PPS"), inline: true },
        { name: "Alasan Penolakan", value: String(data.reason || "Berkas tidak memenuhi syarat verifikasi.").slice(0, 500), inline: false },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "SERVICE_UMKM") {
    const submissionsUrl = getAdminPortalUrl("submissions");
    return {
      title: "Pengajuan Stan Lapak UMKM Baru",
      description: `Tiket layanan UMKM baru telah masuk dan menunggu peninjauan di [Portal Admin](${submissionsUrl}).`,
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
    const submissionsUrl = getAdminPortalUrl("submissions");
    return {
      title: "Permintaan Jadwal Meeting Baru",
      description: `Permintaan meeting / audiensi baru telah diajukan warga. Tinjau di [Portal Admin](${submissionsUrl}).`,
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
    const bansosUrl = getAdminPortalUrl("bansos_db");
    return {
      title: "Klaim Bantuan Sosial (Bansos) Masuk",
      description: `Warga baru saja mendaftarkan klaim bantuan sosial. Cek berkas di [Portal Admin](${bansosUrl}).`,
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

  if (eventType === "KAS_INCOME") {
    const isDarren = data.wallet === "Darren";
    const isMemberKas = Boolean(
      data.memberName ||
      (data.allocationMode && data.allocationMode !== "MANUAL_INCOME")
    );
    const posKasLabel = isDarren ? "Kas Darren" : "Kas Oita";
    const netBalanceText =
      typeof data.netBalance === "number"
        ? `\`${formatSignedKasCurrency(data.netBalance)}\``
        : "-";

    return {
      title: isMemberKas ? "Catatan Uang Kas Anggota" : "Catatan Pemasukan Kas Baru",
      description: "Transaksi keuangan masuk telah resmi tercatat di Buku Kas LSM Paguyuban Pizza Sandy Shores.",
      color: 0x10b981,
      fields: [
        { name: "Tanggal / Waktu", value: formatKasDateTime(data.timestamp, data.date), inline: true },
        { name: "Pos Kas", value: posKasLabel, inline: true },
        { name: "Jenis & Kategori", value: `Pemasukan • ${data.category || "Pemasukan Kas"}`, inline: true },
        { name: "Keterangan / Terkait", value: buildKasDetailText(data), inline: false },
        { name: "Penanggung Jawab", value: String(data.responsible || data.recordedBy || (isDarren ? "Darren" : "Oita")), inline: true },
        { name: "Nominal ($)", value: `\`+${formatKasAmount(data.amount)}\``, inline: true },
        { name: "Saldo Bersih ($)", value: netBalanceText, inline: true },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "KAS_EXPENSE") {
    const isDarren = data.wallet === "Darren";
    const posKasLabel = isDarren ? "Kas Darren" : "Kas Oita";
    const netBalanceText =
      typeof data.netBalance === "number"
        ? `\`${formatSignedKasCurrency(data.netBalance)}\``
        : "-";

    return {
      title: "Catatan Pengeluaran Kas Baru",
      description: "Transaksi keuangan keluar telah resmi tercatat di Buku Kas LSM Paguyuban Pizza Sandy Shores.",
      color: 0xdc2626,
      fields: [
        { name: "Tanggal / Waktu", value: formatKasDateTime(data.timestamp, data.date), inline: true },
        { name: "Pos Kas", value: posKasLabel, inline: true },
        { name: "Jenis & Kategori", value: `Pengeluaran • ${data.category || "Operasional & Logistik"}`, inline: true },
        { name: "Keterangan / Terkait", value: buildKasDetailText(data), inline: false },
        { name: "Penanggung Jawab", value: String(data.responsible || data.recordedBy || "Pengurus LSM"), inline: true },
        { name: "Nominal ($)", value: `\`-${formatKasAmount(data.amount)}\``, inline: true },
        { name: "Saldo Bersih ($)", value: netBalanceText, inline: true },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "KAS_TRANSFER") {
    const fromW = data.fromWallet === "Darren" ? "Darren" : "Oita";
    const toW = data.toWallet === "Darren" ? "Darren" : "Oita";
    const oitaText =
      typeof data.oitaBalance === "number"
        ? `\`${formatSignedKasCurrency(data.oitaBalance)}\``
        : "-";
    const darrenText =
      typeof data.darrenBalance === "number"
        ? `\`${formatSignedKasCurrency(data.darrenBalance)}\``
        : "-";
    const netBalanceText =
      typeof data.netBalance === "number"
        ? `\`${formatSignedKasCurrency(data.netBalance)}\``
        : "-";

    return {
      title: "Catatan Pindah Kas Antar Bendahara",
      description: "Perpindahan kas internal antar bendahara telah tercatat (tidak masuk pengeluaran maupun pemasukan total LSM).",
      color: 0x6366f1,
      fields: [
        { name: "Tanggal / Waktu", value: formatKasDateTime(data.timestamp, data.date), inline: true },
        { name: "Pos Kas (Arah Transfer)", value: `Kas ${fromW} -> Kas ${toW}`, inline: true },
        { name: "Jenis & Kategori", value: "Pindah Kas • Transfer Antar Bendahara", inline: true },
        { name: "Keterangan / Terkait", value: buildKasDetailText(data), inline: false },
        { name: "Penanggung Jawab", value: String(data.responsible || `${fromW} -> ${toW}`), inline: true },
        { name: "Nominal Transfer ($)", value: `\`${formatKasAmount(data.amount)}\``, inline: true },
        { name: "Saldo Bersih ($)", value: netBalanceText, inline: true },
        { name: "Saldo Kas Oita", value: oitaText, inline: true },
        { name: "Saldo Kas Darren", value: darrenText, inline: true },
      ],
      footer,
      timestamp,
    };
  }

  if (eventType === "KAS_REPORT") {
    const modeLabel = data.mode === "SUMMARY" ? "Ringkasan Saldo Kas" : "Laporan Lengkap & Mutasi Kas";
    const walletLabel =
      data.walletFilter === "OITA"
        ? "Pos Kas Oita"
        : data.walletFilter === "DARREN"
        ? "Pos Kas Darren"
        : "Semua Pos Kas (Oita + Darren)";
    const rawReport = String(data.reportText || "").trim();
    const safeReport =
      rawReport.length > 3850
        ? `${rawReport.slice(0, 3820)}\n... (terpotong, hubungi Bendahara untuk arsip lengkap)`
        : rawReport;

    return {
      title: `Laporan Keuangan LSM PPS (${modeLabel})`,
      description: `Cakupan: **${walletLabel}**\n\`\`\`text\n${safeReport}\n\`\`\``,
      color: 0xfacc15,
      footer,
      timestamp,
    };
  }

  // TEST notification
  if (data?.isKasTest) {
    return {
      title: "Tes Koneksi Webhook Keuangan LSM PPS Berhasil",
      description: "Notifikasi otomatis Buku Kas LSM Paguyuban Pizza Sandy Shores sudah terhubung ke channel keuangan ini.",
      color: 0x10b981,
      fields: [
        { name: "Status", value: "Aktif & Siap Menerima Laporan Kas", inline: true },
        { name: "Pengirim", value: "Sistem Buku Kas LSM PPS", inline: true },
      ],
      footer,
      timestamp,
    };
  }

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

function splitReportTextIntoChunks(rawText, maxLen = 3600) {
  const clean = String(rawText || "").trim();
  if (!clean || clean.length <= maxLen) return [clean];

  const lines = clean.split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    const addition = current ? `\n${line}` : line;
    if (current && current.length + addition.length > maxLen) {
      chunks.push(current);
      current = line;
    } else {
      current += addition;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [clean.slice(0, maxLen)];
}

async function postSingleEmbed(targetUrl, embed, data = {}) {
  const baseBody = {
    username: "Portal LSM PPS",
    avatar_url: DISCORD_WEBHOOK_AVATAR_URL,
    embeds: [embed],
  };

  let resp = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baseBody),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    // Auto-handle Discord Forum Channels (code 220001 requires thread_name or ?thread_id=...)
    if (resp.status === 400 && (errText.includes("220001") || errText.includes("thread_name"))) {
      const suffix = data?.title
        ? ` - ${String(data.title).slice(0, 50)}`
        : data?.fullName
        ? ` - ${String(data.fullName).slice(0, 50)}`
        : "";
      const threadName = `${embed.title || "Notifikasi LSM PPS"}${suffix}`.slice(0, 100);
      resp = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseBody,
          thread_name: threadName,
        }),
      });
      if (resp.ok) {
        return { ok: true, forumThreadCreated: true };
      }
      const retryErr = await resp.text().catch(() => "");
      return {
        ok: false,
        error: `Discord merespons HTTP ${resp.status}${retryErr ? `: ${retryErr.slice(0, 120)}` : ""}`,
      };
    }
    return { ok: false, error: `Discord merespons HTTP ${resp.status}${errText ? `: ${errText.slice(0, 120)}` : ""}` };
  }

  return { ok: true };
}

/**
 * Send Discord webhook notification (non-blocking by default for user flows)
 */
export async function sendDiscordNotification(eventType, data = {}, customUrl = null) {
  try {
    const cfg = await getDiscordWebhookConfig(eventType === "TEST" || eventType === "KAS_REPORT");
    const isKasEvent =
      eventType === "KAS_INCOME" ||
      eventType === "KAS_EXPENSE" ||
      eventType === "KAS_TRANSFER" ||
      eventType === "KAS_REPORT";
    const targetUrl = (
      customUrl ||
      (isKasEvent && isValidDiscordWebhookUrl(cfg.kasWebhookUrl) ? cfg.kasWebhookUrl : cfg.webhookUrl) ||
      ""
    ).trim();

    if (!isValidDiscordWebhookUrl(targetUrl)) {
      return { ok: false, skipped: true, reason: "URL Webhook Discord belum diisi atau tidak valid." };
    }

    if (eventType !== "TEST" && eventType !== "KAS_REPORT") {
      if (!cfg.enabled) return { ok: false, skipped: true, reason: "Notifikasi Discord sedang dinonaktifkan." };
      if (eventType === "MEMBER_REGISTRATION" && !cfg.notifyMemberReg) return { ok: false, skipped: true };
      if ((eventType === "MEMBER_APPROVED" || eventType === "MEMBER_REJECTED") && !cfg.notifyMemberDecision) return { ok: false, skipped: true };
      if (eventType === "SERVICE_UMKM" && !cfg.notifyServiceUmkm) return { ok: false, skipped: true };
      if (eventType === "SERVICE_MEETING" && !cfg.notifyServiceMeeting) return { ok: false, skipped: true };
      if (eventType === "BANSOS_CLAIM" && !cfg.notifyBansos) return { ok: false, skipped: true };
      if (isKasEvent && !cfg.notifyKas) return { ok: false, skipped: true };
    }

    // Auto-split long KAS_REPORT into sequential parts so no transactions are truncated
    if (eventType === "KAS_REPORT") {
      const chunks = splitReportTextIntoChunks(data.reportText || "", 3600);
      const totalParts = chunks.length;
      const modeLabel = data.mode === "SUMMARY" ? "Ringkasan Saldo Kas" : "Laporan Lengkap & Mutasi Kas";
      const walletLabel =
        data.walletFilter === "OITA"
          ? "Pos Kas Oita"
          : data.walletFilter === "DARREN"
          ? "Pos Kas Darren"
          : "Semua Pos Kas (Oita + Darren)";
      const timestamp = new Date().toISOString();

      for (let i = 0; i < totalParts; i++) {
        const partSuffix = totalParts > 1 ? ` (Bagian ${i + 1}/${totalParts})` : "";
        const embed = {
          title:
            i === 0
              ? `Laporan Keuangan LSM PPS (${modeLabel})${partSuffix}`
              : `Lanjutan Laporan Keuangan LSM PPS${partSuffix}`,
          description:
            i === 0
              ? `Cakupan: **${walletLabel}**\n\`\`\`text\n${chunks[i]}\n\`\`\``
              : `\`\`\`text\n${chunks[i]}\n\`\`\``,
          color: 0xfacc15,
          footer: {
            text: `LSM Paguyuban Pizza Sandy Shores Notifikasi Otomatis${partSuffix}`,
            icon_url: DISCORD_WEBHOOK_AVATAR_URL,
          },
          timestamp,
        };
        const res = await postSingleEmbed(targetUrl, embed, data);
        if (!res.ok) return res;
        if (i < totalParts - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      return { ok: true, partsSent: totalParts };
    }

    const embed = buildEmbed(eventType, data);
    return await postSingleEmbed(targetUrl, embed, data);
  } catch (err) {
    console.warn("[Discord Webhook] Send failed:", err);
    return { ok: false, error: err?.message || "Gagal menghubungi server Discord." };
  }
}
