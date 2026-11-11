import React, { useState, useEffect } from "react";
import {
  Trophy,
  Ticket,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Search,
  Copy,
  Users,
  ShieldAlert,
  Play,
  RotateCcw,
  Plus,
  Settings,
  Save,
  ExternalLink,
  Dices,
} from "lucide-react";
import {
  subscribeDoorprizeConfigCloud,
  subscribeDoorprizeTicketsCloud,
  saveDoorprizeConfigCloud,
  claimDoorprizeTicketCloud,
  drawDoorprizeWinnerCloud,
  verifyDoorprizeWinnerKtpCloud,
  disqualifyAndRerollWinnerCloud,
  deleteDoorprizeTicketCloud,
  resetDoorprizeSessionCloud,
  formatTicketNumber,
} from "../services/doorprizeService";
import BrutalistConfirmModal from "./BrutalistConfirmModal";

export default function DoorprizeAdminPanel({ onShowToast, onOpenVisitorModal }) {
  const [config, setConfig] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollingTicket, setRollingTicket] = useState(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [draftConfig, setDraftConfig] = useState({
    title: "Undian Senam Sehat Bersama LSM PPS",
    prizePerWinner: "$10.000",
    maxWinners: 10,
    ticketPrefix: "SNM",
  });
  const [manualIcName, setManualIcName] = useState("");
  const [manualCitizenId, setManualCitizenId] = useState("");
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Ya, Lanjutkan",
    variant: "danger",
    onConfirm: () => {},
  });

  useEffect(() => {
    const unsubCfg = subscribeDoorprizeConfigCloud((cfg) => {
      setConfig(cfg);
      setDraftConfig({
        title: cfg.title || "Undian Senam Sehat Bersama LSM PPS",
        prizePerWinner: cfg.prizePerWinner || "$10.000",
        maxWinners: Number(cfg.maxWinners) || 10,
        ticketPrefix: cfg.ticketPrefix || "SNM",
      });
    });
    const unsubTickets = subscribeDoorprizeTicketsCloud((list) => {
      setTickets(list);
    });
    return () => {
      unsubCfg();
      unsubTickets();
    };
  }, []);

  const activeConfig = config || {
    title: "Undian Senam Sehat Bersama LSM PPS",
    prizePerWinner: "$10.000",
    maxWinners: 10,
    status: "OPEN",
    autoPopupOnVisit: true,
    winners: [],
    disqualifiedHistory: [],
  };

  const winners = Array.isArray(activeConfig.winners) ? activeConfig.winners : [];
  const disqualifiedList = Array.isArray(activeConfig.disqualifiedHistory)
    ? activeConfig.disqualifiedHistory
    : [];
  const maxWinners = Math.max(1, Number(activeConfig.maxWinners) || 10);
  const remainingSlots = Math.max(0, maxWinners - winners.length);

  const winnerIds = new Set(winners.map((w) => w.ticketId));
  const disqualifiedIds = new Set(disqualifiedList.map((d) => d.ticketId));
  const eligibleTickets = tickets.filter(
    (t) =>
      t.status !== "DISQUALIFIED" &&
      !winnerIds.has(t.id) &&
      !disqualifiedIds.has(t.id)
  );

  async function handleToggleStatus() {
    const nextStatus = activeConfig.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      await saveDoorprizeConfigCloud({ status: nextStatus });
      onShowToast?.(
        nextStatus === "OPEN"
          ? "Pengambilan nomor doorprize DIBUKA!"
          : "Pengambilan nomor doorprize DITUTUP!",
        "success"
      );
    } catch (err) {
      onShowToast?.("Gagal mengubah status: " + err.message, "error");
    }
  }

  async function handleToggleAutoPopup() {
    const nextVal = activeConfig.autoPopupOnVisit === false;
    try {
      await saveDoorprizeConfigCloud({ autoPopupOnVisit: nextVal });
      onShowToast?.(
        nextVal
          ? "Pop-up otomatis saat warga masuk web DIAKTIFKAN!"
          : "Pop-up otomatis saat masuk web DINONAKTIFKAN!",
        "info"
      );
    } catch (err) {
      onShowToast?.("Gagal mengubah pengaturan pop-up: " + err.message, "error");
    }
  }

  async function handleSaveConfigForm(e) {
    e.preventDefault();
    try {
      await saveDoorprizeConfigCloud({
        title: draftConfig.title.trim() || "Undian Senam Sehat Bersama LSM PPS",
        prizePerWinner: draftConfig.prizePerWinner.trim() || "$10.000",
        maxWinners: Math.max(1, Number(draftConfig.maxWinners) || 10),
        ticketPrefix: (draftConfig.ticketPrefix || "SNM").trim().toUpperCase(),
      });
      setIsEditingConfig(false);
      onShowToast?.("Konfigurasi doorprize berhasil disimpan!", "success");
    } catch (err) {
      onShowToast?.("Gagal menyimpan konfigurasi: " + err.message, "error");
    }
  }

  function runRollingAnimation(durationMs = 1400) {
    return new Promise((resolve) => {
      if (eligibleTickets.length === 0) {
        resolve();
        return;
      }
      const interval = setInterval(() => {
        const rand =
          eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
        if (rand) setRollingTicket(rand);
      }, 75);
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, durationMs);
    });
  }

  async function handleDrawWinner(count = 1) {
    if (eligibleTickets.length === 0) {
      onShowToast?.(
        "Tidak ada nomor peserta aktif yang tersisa untuk dikocok!",
        "error"
      );
      return;
    }
    if (remainingSlots <= 0) {
      onShowToast?.(
        `Kuota ${maxWinners} pemenang sudah penuh! Gugurkan atau reset jika ingin mengocok lagi.`,
        "error"
      );
      return;
    }

    setIsSpinning(true);
    try {
      await runRollingAnimation(1400);
      const res = await drawDoorprizeWinnerCloud(count);
      const firstNew = res.newlyDrawn?.[0];
      if (firstNew) {
        setRollingTicket(firstNew);
      }
      onShowToast?.(
        res.newlyDrawn.length === 1
          ? `Pemenang terpilih: #${firstNew.numberFormatted} • ${firstNew.icName} (${firstNew.citizenId || "-"})! Silakan cek KTP IC.`
          : `Berhasil mengocok ${res.newlyDrawn.length} pemenang doorprize!`,
        "success"
      );
    } catch (err) {
      onShowToast?.(err.message || "Gagal mengocok pemenang.", "error");
    } finally {
      setIsSpinning(false);
    }
  }

  async function handleVerifyWinner(winner) {
    try {
      await verifyDoorprizeWinnerKtpCloud(winner.ticketId);
      onShowToast?.(
        `Nomor #${winner.numberFormatted} (${winner.icName}) disahkan sesuai KTP IC!`,
        "success"
      );
    } catch (err) {
      onShowToast?.("Gagal memverifikasi pemenang: " + err.message, "error");
    }
  }

  function handleDisqualifyAndReroll(winner) {
    setConfirmModal({
      isOpen: true,
      title: "Gugurkan & Kocok Ulang?",
      message: `Gugurkan Nomor #${winner.numberFormatted} (${winner.icName} • CID: ${winner.citizenId || "-"}) karena Nama IC / Citizen ID berbeda dengan KTP IC, lalu langsung KOCOK ULANG penggantinya?`,
      confirmText: "Ya, Gugurkan & Kocok Ulang",
      variant: "danger",
      onConfirm: async () => {
        setIsSpinning(true);
        try {
          await runRollingAnimation(1200);
          const res = await disqualifyAndRerollWinnerCloud(winner.ticketId, {
            reason: "Nama IC / Citizen ID tidak sesuai dengan KTP IC",
            autoReroll: true,
          });
          if (res.replacementWinner) {
            setRollingTicket(res.replacementWinner);
            onShowToast?.(
              `#${winner.numberFormatted} (${winner.icName}) TIDAK SAH! Pengganti terpilih: #${res.replacementWinner.numberFormatted} (${res.replacementWinner.icName})`,
              "success"
            );
          } else {
            setRollingTicket(null);
            onShowToast?.(
              `#${winner.numberFormatted} (${winner.icName}) dinyatakan TIDAK SAH (Tidak ada peserta tersisa untuk dikocok ulang).`,
              "info"
            );
          }
        } catch (err) {
          onShowToast?.("Gagal mengocok ulang: " + err.message, "error");
        } finally {
          setIsSpinning(false);
        }
      },
    });
  }

  async function handleAddManualParticipant(e) {
    e.preventDefault();
    const trimmedName = manualIcName.replace(/\s+/g, " ").trim().toUpperCase();
    const trimmedCid = manualCitizenId.replace(/\s+/g, "").trim().toUpperCase();
    if (!trimmedName || !trimmedCid) {
      onShowToast?.("Masukkan Nama Lengkap IC dan Citizen ID terlebih dahulu.", "error");
      return;
    }
    setIsAddingManual(true);
    try {
      const res = await claimDoorprizeTicketCloud({
        icName: trimmedName,
        citizenId: trimmedCid,
      });
      setManualIcName("");
      setManualCitizenId("");
      onShowToast?.(
        res.alreadyClaimed
          ? `Data "${res.ticket.icName}" (${res.ticket.citizenId}) sudah terdaftar di Nomor #${res.ticket.numberFormatted}`
          : `Peserta "${res.ticket.icName}" (${res.ticket.citizenId}) ditambahkan ke Nomor #${res.ticket.numberFormatted}`,
        "success"
      );
    } catch (err) {
      onShowToast?.(err.message || "Gagal menambah peserta.", "error");
    } finally {
      setIsAddingManual(false);
    }
  }

  function handleDeleteTicket(ticket) {
    const numStr = ticket.numberFormatted || formatTicketNumber(ticket.ticketNumber);
    setConfirmModal({
      isOpen: true,
      title: `Hapus Nomor #${numStr}?`,
      message: `Hapus Nomor #${numStr} atas nama "${ticket.icName}" (CID: ${ticket.citizenId || "-"}) dari daftar peserta doorprize?`,
      confirmText: "Ya, Hapus Nomor",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteDoorprizeTicketCloud(ticket.id);
          onShowToast?.(`Nomor #${numStr} dihapus.`, "info");
        } catch (err) {
          onShowToast?.("Gagal menghapus nomor: " + err.message, "error");
        }
      },
    });
  }

  function handleResetAll() {
    setConfirmModal({
      isOpen: true,
      title: "Reset Semua Nomor & Pemenang?",
      message:
        "Seluruh daftar nomor peserta dan riwayat pemenang saat ini akan dikosongkan ke 0 untuk memulai sesi undian baru. Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Reset Sesi",
      variant: "danger",
      onConfirm: async () => {
        try {
          await resetDoorprizeSessionCloud();
          setRollingTicket(null);
          onShowToast?.("Sesi doorprize berhasil direset ke 0 peserta!", "success");
        } catch (err) {
          onShowToast?.("Gagal mereset sesi: " + err.message, "error");
        }
      },
    });
  }

  function handleCopyWinnersReport() {
    const lines = [
      `🏆 **DAFTAR PEMENANG ${activeConfig.title.toUpperCase()}** 🏆`,
      `🎁 Hadiah: **${maxWinners} Pemenang @ ${activeConfig.prizePerWinner}**`,
      `📋 Aturan: Nama IC & Citizen ID wajib sesuai KTP IC (Berbeda = Tidak Sah & Dikocok Ulang)`,
      "",
    ];
    if (winners.length === 0) {
      lines.push("_Belum ada pemenang yang dikocok._");
    } else {
      winners.forEach((w, idx) => {
        const statusStr = w.verifiedKtp
          ? "✅ SAH (Sesuai KTP IC)"
          : "⏳ Menunggu Cek KTP IC";
        lines.push(
          `${idx + 1}. **#${w.numberFormatted}** (${w.ticketCode}) • **${w.icName}** (CID: \`${
            w.citizenId || "-"
          }\`) • ${w.prize || activeConfig.prizePerWinner} [${statusStr}]`
        );
      });
    }
    if (disqualifiedList.length > 0) {
      lines.push("");
      lines.push("❌ **Nomor Gugur / Tidak Sah (Beda KTP IC - Dikocok Ulang):**");
      disqualifiedList.forEach((d) => {
        lines.push(
          `- ~#${d.numberFormatted} ${d.icName} (${d.citizenId || "-"})~ (Tidak Sesuai KTP IC)`
        );
      });
    }
    navigator.clipboard?.writeText(lines.join("\n"));
    onShowToast?.("Pengumuman pemenang berhasil disalin ke clipboard!", "success");
  }

  function handleCopyDirectLink() {
    const url = `${window.location.origin}${window.location.pathname}#/doorprize`;
    navigator.clipboard?.writeText(url);
    onShowToast?.("Link langsung Pop-up Doorprize berhasil disalin!", "success");
  }

  function handleCopyAllParticipants() {
    if (tickets.length === 0) {
      onShowToast?.("Belum ada peserta yang mengambil nomor.", "info");
      return;
    }
    const header = `DAFTAR PESERTA ${activeConfig.title.toUpperCase()} (${tickets.length} Peserta)\nNomor Undian | Nama Lengkap IC | Citizen ID (CID) | Status`;
    const rows = tickets.map((t) => {
      const num = `#${t.numberFormatted || formatTicketNumber(t.ticketNumber)}`;
      const isWin = winnerIds.has(t.id);
      const isDisq = t.status === "DISQUALIFIED" || disqualifiedIds.has(t.id);
      const status = isWin ? "PEMENANG" : isDisq ? "TIDAK SAH (BEDA KTP)" : "AKTIF";
      return `${num} | ${t.icName} | ${t.citizenId || "-"} | ${status}`;
    });
    navigator.clipboard?.writeText([header, ...rows].join("\n"));
    onShowToast?.(
      `Daftar ${tickets.length} peserta (Nomor Undian, Nama, CID) berhasil disalin!`,
      "success"
    );
  }

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = String(t.icName || "").toLowerCase();
    const cid = String(t.citizenId || "").toLowerCase();
    const code = String(t.ticketCode || "").toLowerCase();
    const num = String(
      t.numberFormatted || formatTicketNumber(t.ticketNumber)
    ).toLowerCase();
    return (
      name.includes(q) || cid.includes(q) || code.includes(q) || num.includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header Banner & Status Controls */}
      <div className="rounded-xl border-2 border-black bg-[#FACC15] text-[#111827] p-4 sm:p-5 shadow-[4px_4px_0px_#000]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black text-[#FACC15] border border-black font-mono font-black text-[10px] uppercase">
              <Dices size={12} />
              <span>PANEL UNDIAN & DOORPRIZE WARGA</span>
            </div>
            <h3 className="font-heading font-black text-lg sm:text-xl uppercase tracking-tight">
              {activeConfig.title}
            </h3>
            <p className="text-xs text-slate-800 font-medium">
              Kuota Hadiah: <strong>{maxWinners} Pemenang</strong> masing-masing{" "}
              <strong>{activeConfig.prizePerWinner}</strong> • Wajib Nama IC &
              Citizen ID sesuai KTP IC (Beda KTP = Tidak Sah & Dikocok Ulang)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`py-2 px-3.5 rounded-lg border-2 border-black font-heading font-black text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeConfig.status === "OPEN"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-[#DC2626] hover:bg-red-700 text-white"
              }`}
            >
              <Ticket size={14} />
              <span>
                Status: {activeConfig.status === "OPEN" ? "DIBUKA" : "DITUTUP"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleAutoPopup}
              className={`py-2 px-3.5 rounded-lg border-2 border-black font-heading font-black text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                activeConfig.autoPopupOnVisit !== false
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              Pop-up Masuk Web:{" "}
              {activeConfig.autoPopupOnVisit !== false ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={() => setIsEditingConfig((v) => !v)}
              className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-950 border-2 border-black font-heading font-black text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings size={14} className="text-[#DC2626]" />
              <span>Pengaturan</span>
            </button>

            {onOpenVisitorModal && (
              <button
                type="button"
                onClick={onOpenVisitorModal}
                className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-black text-[#FACC15] border-2 border-black font-heading font-black text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Lihat Pop-up Warga</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-black/20">
          <div className="bg-white rounded-lg p-2.5 border-2 border-black shadow-[2px_2px_0px_#000]">
            <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
              TOTAL AMBIL NOMOR
            </span>
            <strong className="font-heading font-black text-lg text-slate-900">
              {tickets.length} Peserta
            </strong>
          </div>
          <div className="bg-white rounded-lg p-2.5 border-2 border-black shadow-[2px_2px_0px_#000]">
            <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
              SIAP DIKOCOK (AKTIF)
            </span>
            <strong className="font-heading font-black text-lg text-emerald-700">
              {eligibleTickets.length} Nomor
            </strong>
          </div>
          <div className="bg-white rounded-lg p-2.5 border-2 border-black shadow-[2px_2px_0px_#000]">
            <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
              PEMENANG TERPILIH
            </span>
            <strong className="font-heading font-black text-lg text-[#DC2626]">
              {winners.length} / {maxWinners}
            </strong>
          </div>
          <div className="bg-white rounded-lg p-2.5 border-2 border-black shadow-[2px_2px_0px_#000]">
            <span className="block text-[10px] font-mono uppercase text-slate-500 font-bold">
              GUGUR (BEDA KTP IC)
            </span>
            <strong className="font-heading font-black text-lg text-red-600">
              {disqualifiedList.length} Nomor
            </strong>
          </div>
        </div>
      </div>

      {/* Collapsible Settings Form */}
      {isEditingConfig && (
        <form
          onSubmit={handleSaveConfigForm}
          className="rounded-xl border-2 border-black bg-amber-50 dark:bg-[#1B1F2B] p-4 shadow-[3px_3px_0px_#000] space-y-3"
        >
          <div className="flex items-center justify-between border-b border-black/15 pb-2">
            <h4 className="font-heading font-black text-xs uppercase text-slate-900 dark:text-white">
              Edit Konfigurasi Event Doorprize
            </h4>
            <button
              type="button"
              onClick={handleCopyDirectLink}
              className="text-[11px] font-mono font-bold text-[#DC2626] dark:text-[#FACC15] underline cursor-pointer"
            >
              Salin Link Langsung (#/doorprize)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-heading font-black uppercase mb-1">
                Judul Event Undian
              </label>
              <input
                type="text"
                value={draftConfig.title}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, title: e.target.value })
                }
                className="input-field w-full text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-heading font-black uppercase mb-1">
                Hadiah / Pemenang
              </label>
              <input
                type="text"
                value={draftConfig.prizePerWinner}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    prizePerWinner: e.target.value,
                  })
                }
                className="input-field w-full text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-heading font-black uppercase mb-1">
                Jumlah Pemenang
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={draftConfig.maxWinners}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    maxWinners: Number(e.target.value) || 10,
                  })
                }
                className="input-field w-full text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingConfig(false)}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-slate-100 border-2 border-black text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="py-1.5 px-4 bg-[#059669] hover:bg-[#047857] text-white border-2 border-black text-xs font-heading font-black rounded-lg shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={13} />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      )}

      {/* Mesin Pengocok Undian & Daftar Pemenang */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Raffle Spinner */}
        <div className="lg:col-span-5 rounded-xl border-2 border-black bg-white dark:bg-[#181B24] p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded bg-[#FACC15] text-black border border-black">
                MESIN UNDIAN ACAK
              </span>
              <span className="font-mono text-[11px] text-slate-500 font-bold">
                Sisa Kuota: {remainingSlots} Pemenang
              </span>
            </div>
            <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-white pt-1">
              Kocok Nomor Doorprize ({activeConfig.prizePerWinner})
            </h4>
          </div>

          {/* Rolling Number Display Box */}
          <div className="rounded-xl border-[3px] border-black bg-slate-950 text-white p-5 text-center shadow-inner relative overflow-hidden">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
              {isSpinning
                ? "MENGOCOK NOMOR PESERTA..."
                : rollingTicket
                ? "HASIL KOCOKAN TERAKHIR"
                : "SIAP MENGOCOK PEMENANG"}
            </span>
            <div
              className={`font-heading font-black text-4xl sm:text-5xl my-2 tracking-tight ${
                isSpinning ? "text-[#FACC15] animate-pulse" : "text-white"
              }`}
            >
              {rollingTicket
                ? `#${
                    rollingTicket.numberFormatted ||
                    formatTicketNumber(rollingTicket.ticketNumber)
                  }`
                : "#---"}
            </div>
            <div className="font-heading font-bold text-sm text-emerald-400 truncate">
              {rollingTicket
                ? `${rollingTicket.icName} (${rollingTicket.citizenId || "-"})`
                : "Klik tombol kocok di bawah"}
            </div>
          </div>

          {/* Draw Action Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isSpinning || eligibleTickets.length === 0 || remainingSlots <= 0}
              onClick={() => handleDrawWinner(1)}
              className="w-full py-3 px-4 bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black rounded-xl font-heading font-black text-xs sm:text-sm uppercase shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSpinning ? (
                <>
                  <RefreshCw size={16} className="animate-spin text-[#DC2626]" />
                  <span>Mengocok Undian...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="text-[#DC2626] fill-[#DC2626]" />
                  <span>
                    Kocok 1 Pemenang ({winners.length + 1}/{maxWinners})
                  </span>
                </>
              )}
            </button>

            {remainingSlots > 1 && eligibleTickets.length > 1 && (
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => handleDrawWinner(remainingSlots)}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-[#FACC15] border-2 border-black rounded-xl font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Dices size={14} />
                <span>
                  Kocok Sekaligus {Math.min(remainingSlots, eligibleTickets.length)} Slot
                  Tersisa
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: 10 Winners Verification & Re-roll List */}
        <div className="lg:col-span-7 rounded-xl border-2 border-black bg-white dark:bg-[#181B24] p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2.5">
            <div>
              <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                <Trophy size={16} className="text-[#DC2626]" />
                <span>
                  Daftar Pemenang & Verifikasi KTP IC ({winners.length}/{maxWinners})
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Cocokkan Nama IC & Citizen ID dengan KTP IC. Jika berbeda, klik{" "}
                <strong>Beda KTP / Kocok Ulang</strong>!
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyWinnersReport}
                className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-800 dark:text-slate-200 border-2 border-black rounded-lg font-heading font-black text-[11px] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Copy size={12} />
                <span>Salin Pemenang</span>
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="py-1.5 px-2.5 bg-red-100 hover:bg-red-200 text-red-800 border-2 border-black rounded-lg font-heading font-black text-[11px] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
                title="Reset semua peserta & pemenang untuk memulai event baru"
              >
                <RotateCcw size={12} />
                <span>Reset Sesi</span>
              </button>
            </div>
          </div>

          {winners.length === 0 ? (
            <div className="py-10 text-center text-slate-400 font-mono text-xs border-2 border-dashed border-black/15 dark:border-white/15 rounded-xl">
              Belum ada pemenang yang dikocok. Gunakan mesin kocok di sebelah kiri.
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {winners.map((w, idx) => (
                <div
                  key={w.ticketId || idx}
                  className={`p-3 rounded-xl border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[2px_2px_0px_#000] ${
                    w.verifiedKtp
                      ? "bg-emerald-50 dark:bg-emerald-950/30"
                      : "bg-amber-50/80 dark:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#FACC15] text-black border-2 border-black font-heading font-black text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-black text-[#FACC15] font-mono font-black text-xs">
                          #{w.numberFormatted || formatTicketNumber(w.ticketNumber)}
                        </span>
                        <strong className="font-heading font-black text-sm text-slate-900 dark:text-white truncate">
                          {w.icName}
                        </strong>
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                          [CID: {w.citizenId || "-"}]
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ({w.prize || activeConfig.prizePerWinner})
                        </span>
                      </div>
                      {w.replacedTicketCode && (
                        <span className="block text-[10px] font-mono text-slate-500">
                          Pengganti kocok ulang dari tiket {w.replacedTicketCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {w.verifiedKtp ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white border-2 border-black font-mono font-black text-[10px] flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>SAH SESUAI KTP</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleVerifyWinner(w)}
                        className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-black rounded-lg font-heading font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                        title="Tandai Nama IC & Citizen ID sudah sesuai dengan KTP IC"
                      >
                        <CheckCircle2 size={12} />
                        <span>Sah (Sesuai KTP)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSpinning}
                      onClick={() => handleDisqualifyAndReroll(w)}
                      className="py-1 px-2.5 bg-[#DC2626] hover:bg-red-700 text-white border-2 border-black rounded-lg font-heading font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      title="Gugurkan karena nama/CID berbeda dengan KTP IC dan langsung kocok ulang"
                    >
                      <XCircle size={12} />
                      <span>Beda KTP / Kocok Ulang</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {disqualifiedList.length > 0 && (
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-red-600 dark:text-red-400 mb-1">
                <ShieldAlert size={12} />
                <span>
                  Riwayat Gugur / Tidak Sah Karena Beda KTP IC ({disqualifiedList.length}):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {disqualifiedList.map((d, idx) => (
                  <span
                    key={d.ticketId || idx}
                    className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-500/40 font-mono text-[10px] line-through"
                  >
                    #{d.numberFormatted} {d.icName} ({d.citizenId || "-"})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Participant List & Manual Entry (Semua Peserta Tanpa Batas: Nama - Citizen ID - Nomor Undian) */}
      <div className="rounded-xl border-2 border-black bg-white dark:bg-[#181B24] p-4 shadow-[3px_3px_0px_#000] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Users size={16} className="text-[#DC2626]" />
              <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-white">
                Daftar Peserta Pengambil Nomor ({tickets.length})
              </h4>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-600/40 font-mono font-bold text-[10px] uppercase">
                Tanpa Batas Peserta (Unlimited)
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Setiap peserta yang mengambil nomor otomatis masuk di tabel ini (Nama IC, Citizen ID, & Nomor Undian).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAllParticipants}
              className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-800 dark:text-slate-200 border-2 border-black rounded-lg font-heading font-black text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
              title="Salin seluruh daftar Nama - Citizen ID - Nomor Undian"
            >
              <Copy size={12} />
              <span>Salin Semua Peserta</span>
            </button>

            <form
              onSubmit={handleAddManualParticipant}
              className="flex items-center gap-1.5 flex-wrap"
            >
              <input
                type="text"
                value={manualIcName}
                onChange={(e) => setManualIcName(e.target.value.toUpperCase())}
                placeholder="Nama Lengkap IC..."
                className="input-field text-xs py-1.5 px-2.5 w-36 sm:w-40 uppercase"
              />
              <input
                type="text"
                value={manualCitizenId}
                onChange={(e) => setManualCitizenId(e.target.value.toUpperCase())}
                placeholder="Citizen ID..."
                className="input-field text-xs py-1.5 px-2.5 w-24 sm:w-28 font-mono uppercase"
              />
              <button
                type="submit"
                disabled={isAddingManual}
                className="py-1.5 px-3 bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black rounded-lg font-heading font-black text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus size={13} />
                <span>Tambah</span>
              </button>
            </form>

            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, Nama IC, atau CID..."
                className="input-field text-xs py-1.5 pl-8 pr-3 w-full sm:w-48"
              />
            </div>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-mono text-xs border-2 border-dashed border-black/15 rounded-xl">
            Belum ada peserta yang mengambil nomor doorprize.
          </div>
        ) : (
          <div className="border-2 border-black rounded-xl overflow-hidden">
            <div className="max-h-[380px] overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-[#FACC15] sticky top-0 z-10 font-heading uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 border-b-2 border-black">Nomor Undian</th>
                    <th className="py-2.5 px-3 border-b-2 border-black">Nama Lengkap IC</th>
                    <th className="py-2.5 px-3 border-b-2 border-black">Citizen ID (CID)</th>
                    <th className="py-2.5 px-3 border-b-2 border-black">Status</th>
                    <th className="py-2.5 px-3 border-b-2 border-black text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/15 dark:divide-white/10">
                  {filteredTickets.map((t) => {
                    const isWin = winnerIds.has(t.id);
                    const winObj = winners.find((w) => w.ticketId === t.id);
                    const isDisq =
                      t.status === "DISQUALIFIED" || disqualifiedIds.has(t.id);
                    const numFormatted =
                      t.numberFormatted || formatTicketNumber(t.ticketNumber);
                    return (
                      <tr
                        key={t.id}
                        className={
                          isWin
                            ? "bg-emerald-50/90 dark:bg-emerald-950/35"
                            : isDisq
                            ? "bg-red-50/80 dark:bg-red-950/30 opacity-75"
                            : "bg-white dark:bg-[#181B24] hover:bg-amber-50/50 dark:hover:bg-slate-800/40"
                        }
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black text-[#FACC15] font-mono font-black text-xs">
                              #{numFormatted}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {t.ticketCode}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-heading font-black">
                          <span
                            className={
                              isDisq
                                ? "line-through text-red-700 dark:text-red-400"
                                : "text-slate-900 dark:text-white"
                            }
                          >
                            {t.icName}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {t.citizenId || "-"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isWin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-black bg-emerald-600 text-white font-mono font-black text-[10px]">
                              {winObj?.verifiedKtp ? "✓ SAH PEMENANG" : "🏆 PEMENANG"}
                            </span>
                          ) : isDisq ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-black bg-red-600 text-white font-mono font-black text-[10px]">
                              ❌ BEDA KTP IC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-black bg-[#FACC15] text-black font-mono font-black text-[10px]">
                              TERDAFTAR
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t)}
                            className="inline-flex w-7 h-7 rounded-lg border border-black/30 hover:bg-red-500 hover:text-white text-slate-500 items-center justify-center cursor-pointer transition-colors"
                            title="Hapus peserta"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <BrutalistConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="Batal"
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
