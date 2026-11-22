// ==========================================================================
// AUTOMATED MONTHLY KAS REPORT BOT -> DISCORD WEBHOOK (KEUANGAN LSM IC)
// Runs via GitHub Actions on the last day of every month at ~23:55-23:59 WIB.
// Zero external dependencies (Node 20+ native fetch). Public-safe (no /admin links).
// ==========================================================================

const KAS_PROJECT_ID = "pendaftaran-paps";
const CONFIG_PROJECT_ID = "branda-pps";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function getWibNow() {
  const nowUtc = Date.now();
  const wibDate = new Date(nowUtc + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const monthIdx = wibDate.getUTCMonth(); // 0-11
  const day = wibDate.getUTCDate();

  // Check if tomorrow in WIB is the 1st of the next month
  const tomorrowWib = new Date(nowUtc + WIB_OFFSET_MS + 24 * 60 * 60 * 1000);
  const isLastDayOfMonth = tomorrowWib.getUTCDate() === 1;

  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
  const monthLabel = `${INDO_MONTHS[monthIdx]} ${year}`;
  return { year, monthIdx, day, isLastDayOfMonth, monthKey, monthLabel };
}

function parseMonthKey(monthKeyStr) {
  const m = String(monthKeyStr || "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return {
    year,
    monthIdx,
    monthKey: `${year}-${String(monthIdx + 1).padStart(2, "0")}`,
    monthLabel: `${INDO_MONTHS[monthIdx]} ${year}`,
  };
}

function getFieldValue(field) {
  if (!field) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  return null;
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num < 0) return `-$${Math.abs(num).toLocaleString("id-ID")}`;
  return `$${num.toLocaleString("id-ID")}`;
}

function formatKasDate(ts, fallback) {
  if (!ts) return String(fallback || "-");
  const d = new Date(Number(ts) + WIB_OFFSET_MS);
  if (isNaN(d.getTime())) return String(fallback || "-");
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getUTCDate()} ${shortMonths[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function isValidWebhookUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(url.trim());
}

async function fetchWebhookConfig() {
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG_PROJECT_ID}/databases/(default)/documents/pps_website/discord_webhook_config`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal membaca konfigurasi webhook (HTTP ${res.status})`);
  const data = await res.json();
  const f = data.fields || {};
  return {
    webhookUrl: getFieldValue(f.webhookUrl) || "",
    kasWebhookUrl: getFieldValue(f.kasWebhookUrl) || "",
    enabled: getFieldValue(f.enabled) !== false,
    notifyKas: getFieldValue(f.notifyKas) !== false,
    lastAutoKasReportMonth: getFieldValue(f.lastAutoKasReportMonth) || "",
  };
}

async function saveLastAutoReportMonth(monthKey) {
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG_PROJECT_ID}/databases/(default)/documents/pps_website/discord_webhook_config?updateMask.fieldPaths=lastAutoKasReportMonth&updateMask.fieldPaths=lastAutoKasReportSentAt`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        lastAutoKasReportMonth: { stringValue: monthKey },
        lastAutoKasReportSentAt: { stringValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) {
    console.warn(`[Monthly Kas] Warning: gagal menyimpan guard lastAutoKasReportMonth (HTTP ${res.status})`);
  }
}

async function fetchAllKasTransactions() {
  let pageToken = "";
  let allDocs = [];
  let guard = 0;

  do {
    guard++;
    const url =
      `https://firestore.googleapis.com/v1/projects/${KAS_PROJECT_ID}/databases/(default)/documents/artifacts/portal-anggota-app/public/data/kas_ledger?pageSize=200` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gagal memuat buku kas (HTTP ${res.status})`);
    const data = await res.json();
    allDocs = allDocs.concat(data.documents || []);
    pageToken = data.nextPageToken || "";
  } while (pageToken && guard < 30);

  const list = allDocs.map((d) => {
    const f = d.fields || {};
    return {
      id: d.name.split("/").pop(),
      type: String(getFieldValue(f.type) || "").toUpperCase(),
      amount: Number(getFieldValue(f.amount) || 0),
      title: String(getFieldValue(f.title) || ""),
      category: String(getFieldValue(f.category) || ""),
      wallet: String(getFieldValue(f.wallet) || ""),
      fromWallet: String(getFieldValue(f.fromWallet) || ""),
      toWallet: String(getFieldValue(f.toWallet) || ""),
      responsible: String(getFieldValue(f.responsible) || ""),
      memberName: String(getFieldValue(f.memberName) || ""),
      date: String(getFieldValue(f.date) || ""),
      timestamp: Number(getFieldValue(f.timestamp) || 0),
    };
  });

  list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return list;
}

function computeBalances(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  let oitaBalance = 0;
  let darrenBalance = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    const isDarren =
      tx.wallet === "Darren" ||
      `${tx.wallet} ${tx.responsible} ${tx.title}`.toLowerCase().includes("darren");

    if (tx.type === "TRANSFER") {
      const fromIsDarren = (tx.fromWallet || tx.wallet) === "Darren";
      if (fromIsDarren) {
        darrenBalance -= amt;
        oitaBalance += amt;
      } else {
        oitaBalance -= amt;
        darrenBalance += amt;
      }
    } else if (tx.type === "INCOME") {
      totalIncome += amt;
      if (isDarren) darrenBalance += amt;
      else oitaBalance += amt;
    } else if (tx.type === "EXPENSE") {
      totalExpense += amt;
      if (isDarren) darrenBalance -= amt;
      else oitaBalance -= amt;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    oitaBalance,
    darrenBalance,
  };
}

function buildMonthlyEmbeds(allTx, targetYear, targetMonthIdx, monthLabel) {
  const overall = computeBalances(allTx);

  const monthTx = allTx.filter((tx) => {
    if (!tx.timestamp) return false;
    const d = new Date(tx.timestamp + WIB_OFFSET_MS);
    return d.getUTCFullYear() === targetYear && d.getUTCMonth() === targetMonthIdx;
  });

  let monthIncome = 0;
  let monthExpense = 0;
  let monthIncomeCount = 0;
  let monthExpenseCount = 0;
  let monthTransferCount = 0;

  for (const tx of monthTx) {
    if (tx.type === "INCOME") {
      monthIncome += tx.amount;
      monthIncomeCount++;
    } else if (tx.type === "EXPENSE") {
      monthExpense += tx.amount;
      monthExpenseCount++;
    } else if (tx.type === "TRANSFER") {
      monthTransferCount++;
    }
  }

  const monthNetDelta = monthIncome - monthExpense;
  const monthNetSign = monthNetDelta >= 0 ? "+" : "";

  let headerText = `RINGKASAN SALDO AKHIR BULAN:\n`;
  headerText += `• Kas di Darren : ${formatCurrency(overall.darrenBalance)}\n`;
  headerText += `• Kas di Oita   : ${formatCurrency(overall.oitaBalance)}\n`;
  headerText += `----------------------------------------\n`;
  headerText += `TOTAL SALDO BERSIH LSM: ${formatCurrency(overall.netBalance)}\n`;
  headerText += `----------------------------------------\n\n`;
  headerText += `ARUS KAS BULAN ${monthLabel.toUpperCase()}:\n`;
  headerText += `• Pemasukan Bulan Ini  : +${formatCurrency(monthIncome)} (${monthIncomeCount} transaksi)\n`;
  headerText += `• Pengeluaran Bulan Ini: -${formatCurrency(monthExpense)} (${monthExpenseCount} transaksi)\n`;
  headerText += `• Selisih Arus Kas     : ${monthNetSign}${formatCurrency(monthNetDelta)}\n`;
  if (monthTransferCount > 0) {
    headerText += `• Pindah Kas Internal  : ${monthTransferCount} kali (saldo total tetap)\n`;
  }
  headerText += `• Total Mutasi Bulan Ini: ${monthTx.length} transaksi\n`;

  const formattedEntries = monthTx.map((tx, idx) => {
    const isTransfer = tx.type === "TRANSFER";
    const isIncome = tx.type === "INCOME";
    const sign = isTransfer ? "[↔]" : isIncome ? "[+]" : "[-]";
    const dateStr = tx.date || formatKasDate(tx.timestamp);
    const fromW = tx.fromWallet || tx.wallet || "Oita";
    const toW = tx.toWallet || (fromW === "Darren" ? "Oita" : "Darren");
    const walletLabel = isTransfer
      ? `Kas ${fromW} -> Kas ${toW}`
      : tx.wallet
      ? `Kas ${tx.wallet}`
      : tx.responsible || "Kas LSM";
    const title = tx.title || tx.category || "Transaksi Kas";
    const memberInfo =
      tx.memberName && !title.toLowerCase().includes(tx.memberName.toLowerCase())
        ? ` (${tx.memberName})`
        : "";
    return {
      num: idx + 1,
      line: `${idx + 1}. ${sign} ${formatCurrency(tx.amount)} | ${dateStr} | ${walletLabel}\n   ${title}${memberInfo}\n`,
    };
  });

  // Pack into chunks safely under Discord's 4096-char embed description limit
  const MAX_CHUNK_CHARS = 3500;
  const chunks = [];

  if (formattedEntries.length === 0) {
    chunks.push({
      isFirst: true,
      body: `${headerText}\nBelum ada mutasi transaksi tercatat di bulan ${monthLabel}.\n----------------------------------------\nDicatat otomatis oleh Sistem Buku Kas LSM PPS`,
    });
  } else {
    let currentLines = [];
    let currentStart = 1;
    let currentLen = headerText.length + 120;
    let isFirst = true;

    for (let i = 0; i < formattedEntries.length; i++) {
      const entry = formattedEntries[i];
      if (currentLines.length > 0 && currentLen + entry.line.length > MAX_CHUNK_CHARS) {
        chunks.push({
          isFirst,
          startNum: currentStart,
          endNum: formattedEntries[i - 1].num,
          lines: currentLines.join(""),
        });
        isFirst = false;
        currentLines = [];
        currentStart = entry.num;
        currentLen = 140;
      }
      currentLines.push(entry.line);
      currentLen += entry.line.length;
    }

    if (currentLines.length > 0) {
      chunks.push({
        isFirst,
        startNum: currentStart,
        endNum: formattedEntries[formattedEntries.length - 1].num,
        lines: currentLines.join(""),
      });
    }
  }

  const totalParts = chunks.length;
  const nowIso = new Date().toISOString();

  return chunks.map((chunk, idx) => {
    const partNum = idx + 1;
    const isLast = partNum === totalParts;
    const partSuffix = totalParts > 1 ? ` (Bagian ${partNum}/${totalParts})` : "";

    let textContent = "";
    if (chunk.body) {
      textContent = chunk.body;
    } else {
      const rangeHeader =
        totalParts > 1
          ? `DAFTAR MUTASI ${monthLabel.toUpperCase()} (No. ${chunk.startNum} - ${chunk.endNum}):\n`
          : `DAFTAR MUTASI ${monthLabel.toUpperCase()} (${monthTx.length} Transaksi):\n`;
      if (chunk.isFirst) {
        textContent += `${headerText}\n${rangeHeader}${chunk.lines}`;
      } else {
        textContent += `${rangeHeader}${chunk.lines}`;
      }
      if (isLast) {
        textContent += `----------------------------------------\n`;
        textContent += `Akhir Laporan Mutasi ${monthLabel} (Total ${monthTx.length} transaksi tercatat)\n`;
        textContent += `Dicatat otomatis oleh Sistem Buku Kas LSM PPS`;
      }
    }

    return {
      title: chunk.isFirst
        ? `Laporan Bulanan Keuangan LSM PPS - ${monthLabel}${partSuffix}`
        : `Lanjutan Mutasi Keuangan - ${monthLabel}${partSuffix}`,
      description: `\`\`\`text\n${textContent}\n\`\`\``,
      color: 0xfacc15,
      footer: {
        text: `LSM Paguyuban Pizza Sandy Shores Laporan Bulanan Otomatis${partSuffix}`,
      },
      timestamp: nowIso,
    };
  });
}

async function postEmbedToDiscord(webhookUrl, embed) {
  const baseBody = {
    username: "Portal LSM PPS",
    embeds: [embed],
  };
  let res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baseBody),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 400 && (errText.includes("220001") || errText.includes("thread_name"))) {
      res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseBody,
          thread_name: String(embed.title || "Laporan Bulanan Keuangan LSM PPS").slice(0, 100),
        }),
      });
    } else {
      throw new Error(`Discord HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
  }

  if (!res.ok) {
    const retryErr = await res.text().catch(() => "");
    throw new Error(`Discord retry HTTP ${res.status}: ${retryErr.slice(0, 200)}`);
  }
}

async function main() {
  const forceRun = String(process.env.FORCE_RUN || "").toLowerCase() === "true";
  const dryRun = String(process.env.DRY_RUN || "").toLowerCase() === "true";
  const overrideMonth = parseMonthKey(process.env.TARGET_MONTH);
  const wibNow = getWibNow();

  console.log(
    `[Monthly Kas] WIB date: ${wibNow.day} ${wibNow.monthLabel} (lastDay=${wibNow.isLastDayOfMonth}, forceRun=${forceRun}, dryRun=${dryRun})`
  );

  if (!forceRun && !wibNow.isLastDayOfMonth) {
    console.log("[Monthly Kas] Hari ini bukan hari terakhir bulan ini (WIB). Melewati pengiriman.");
    return;
  }

  const target = overrideMonth || {
    year: wibNow.year,
    monthIdx: wibNow.monthIdx,
    monthKey: wibNow.monthKey,
    monthLabel: wibNow.monthLabel,
  };

  const cfg = await fetchWebhookConfig();
  const targetUrl = (
    isValidWebhookUrl(cfg.kasWebhookUrl) ? cfg.kasWebhookUrl : cfg.webhookUrl
  ).trim();

  if (!isValidWebhookUrl(targetUrl)) {
    console.log("[Monthly Kas] URL Webhook Keuangan belum diatur. Melewati.");
    return;
  }
  if (!forceRun && (!cfg.enabled || !cfg.notifyKas)) {
    console.log("[Monthly Kas] Notifikasi kas sedang nonaktif di pengaturan admin. Melewati.");
    return;
  }
  if (!forceRun && cfg.lastAutoKasReportMonth === target.monthKey) {
    console.log(`[Monthly Kas] Laporan bulan ${target.monthKey} sudah pernah dikirim. Anti-duplikat aktif.`);
    return;
  }

  const allTx = await fetchAllKasTransactions();
  const embeds = buildMonthlyEmbeds(allTx, target.year, target.monthIdx, target.monthLabel);

  console.log(
    `[Monthly Kas] Siap mengirim laporan bulan ${target.monthLabel} dalam ${embeds.length} bagian (total transaksi DB: ${allTx.length}).`
  );

  if (dryRun) {
    embeds.forEach((emb, i) => {
      console.log(`\n=== DRY RUN EMBED ${i + 1}/${embeds.length} ===`);
      console.log("Title:", emb.title);
      console.log("Length:", emb.description.length, "chars");
      console.log(emb.description.slice(0, 600) + (emb.description.length > 600 ? "\n...[truncated in dry-run log]..." : ""));
    });
    return;
  }

  for (let i = 0; i < embeds.length; i++) {
    await postEmbedToDiscord(targetUrl, embeds[i]);
    console.log(`[Monthly Kas] Bagian ${i + 1}/${embeds.length} terkirim!`);
    if (i < embeds.length - 1) {
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  if (!overrideMonth) {
    await saveLastAutoReportMonth(target.monthKey);
  }
  console.log(`[Monthly Kas] Selesai! Laporan bulan ${target.monthLabel} berhasil dipublikasikan.`);
}

main().catch((err) => {
  console.error("[Monthly Kas] Fatal error:", err);
  process.exit(1);
});
