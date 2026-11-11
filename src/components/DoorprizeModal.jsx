import React, { useState, useEffect } from "react";
import {
  Ticket,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
  Users,
  Copy,
  Check,
  ShieldAlert,
  RefreshCw,
  Award,
  UserCheck,
} from "lucide-react";
import {
  claimDoorprizeTicketCloud,
  formatTicketNumber,
  getSavedMyTicket,
  saveMyTicketLocal,
} from "../services/doorprizeService";

export default function DoorprizeModal({
  isOpen,
  onClose,
  config,
  tickets = [],
  onShowToast,
}) {
  const [icName, setIcName] = useState("");
  const [agreedRule, setAgreedRule] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [myTicket, setMyTicket] = useState(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  const activeConfig = config || {};
  const title = activeConfig.title || "Undian Senam Sehat Bersama LSM PPS";
  const prizePerWinner = activeConfig.prizePerWinner || "$15.000";
  const maxWinners = Number(activeConfig.maxWinners) || 5;
  const isOpenStatus = activeConfig.status === "OPEN";
  const winners = Array.isArray(activeConfig.winners) ? activeConfig.winners : [];
  const disqualifiedList = Array.isArray(activeConfig.disqualifiedHistory)
    ? activeConfig.disqualifiedHistory
    : [];

  useEffect(() => {
    const saved = getSavedMyTicket(activeConfig.roundId);
    if (saved) {
      const liveMatch = tickets.find((t) => t.id === saved.id);
      if (liveMatch) {
        setMyTicket(liveMatch);
      } else if (tickets.length === 0) {
        setMyTicket(saved);
      } else {
        const byName = tickets.find(
          (t) =>
            String(t.icName || "").toLowerCase() ===
            String(saved.icName || "").toLowerCase()
        );
        if (byName) {
          setMyTicket(byName);
          saveMyTicketLocal(byName);
        } else {
          setMyTicket(null);
          saveMyTicketLocal(null);
        }
      }
    }
  }, [activeConfig.roundId, tickets]);

  if (!isOpen) return null;

  async function handleClaimTicket(e) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = icName.replace(/\s+/g, " ").trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorMsg("Masukkan Nama IC lengkap Anda sesuai yang tertera di KTP IC.");
      return;
    }

    if (!agreedRule) {
      setErrorMsg(
        "Anda wajib menyetujui aturan bahwa Nama IC harus sesuai dengan KTP IC."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await claimDoorprizeTicketCloud({ icName: trimmed });
      setMyTicket(result.ticket);
      setIcName("");
      if (result.alreadyClaimed) {
        onShowToast?.(
          `Nama IC "${result.ticket.icName}" sudah terdaftar dengan Nomor #${
            result.ticket.numberFormatted ||
            formatTicketNumber(result.ticket.ticketNumber)
          }!`,
          "info"
        );
      } else {
        onShowToast?.(
          `Berhasil mengambil Nomor Doorprize #${
            result.ticket.numberFormatted ||
            formatTicketNumber(result.ticket.ticketNumber)
          }!`,
          "success"
        );
      }
    } catch (err) {
      setErrorMsg(err?.message || "Gagal mengambil nomor doorprize.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyTicketInfo() {
    if (!myTicket) return;
    const numStr =
      myTicket.numberFormatted || formatTicketNumber(myTicket.ticketNumber);
    const text = `NOMOR DOORPRIZE ${title.toUpperCase()}\nNomor Undian: #${numStr} (${myTicket.ticketCode})\nNama IC (Sesuai KTP): ${myTicket.icName}`;
    navigator.clipboard?.writeText(text);
    setCopiedTicket(true);
    onShowToast?.("Nomor doorprize berhasil disalin!", "success");
    setTimeout(() => setCopiedTicket(false), 2000);
  }

  const myWinnerRecord = myTicket
    ? winners.find((w) => w.ticketId === myTicket.id)
    : null;
  const myDisqualifiedRecord = myTicket
    ? disqualifiedList.find((d) => d.ticketId === myTicket.id)
    : null;

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doorprize-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border-[3px] border-black bg-[#FFFDF8] dark:bg-[#151821] shadow-[8px_8px_0px_#000] overflow-hidden my-auto text-slate-900 dark:text-slate-100">
        {/* Top Banner Header */}
        <div className="relative bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#991B1B] text-white px-4 sm:px-6 py-4 border-b-[3px] border-black">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FACC15] text-black border-2 border-black font-mono font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                <Sparkles size={11} className="text-[#DC2626]" />
                <span>EVENT SPESIAL WARGA • DOORPRIZE RESMI</span>
              </div>
              <h2
                id="doorprize-modal-title"
                className="font-heading font-black text-lg sm:text-xl uppercase tracking-tight text-white drop-shadow-[1.5px_1.5px_0px_#000] leading-tight pt-0.5"
              >
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] hover:bg-red-100 active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0 cursor-pointer"
              aria-label="Tutup pop-up doorprize"
            >
              <X size={16} />
            </button>
          </div>

          {/* Prize Highlight Pill Bar */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-black/35 backdrop-blur-xs border-2 border-[#FACC15] rounded-xl px-3 py-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FACC15] text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                <Trophy size={16} className="text-[#DC2626]" />
              </div>
              <div className="min-w-0">
                <span className="block text-[9px] font-mono uppercase text-amber-200 font-bold">
                  KUOTA HADIAH UTAMA
                </span>
                <strong className="font-heading font-black text-xs sm:text-sm text-[#FACC15] truncate block">
                  {maxWinners} Pemenang @ {prizePerWinner}
                </strong>
              </div>
            </div>

            <div className="bg-black/35 backdrop-blur-xs border-2 border-white/40 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                <Users size={16} className="text-[#059669]" />
              </div>
              <div className="min-w-0">
                <span className="block text-[9px] font-mono uppercase text-slate-200 font-bold">
                  PESERTA TERDAFTAR
                </span>
                <strong className="font-heading font-black text-xs sm:text-sm text-white truncate block">
                  {tickets.length} Nomor Diambil
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Mandatory Rule Alert Box */}
          <div className="rounded-xl border-2 border-black bg-amber-100/90 dark:bg-amber-950/50 p-3.5 shadow-[3px_3px_0px_#000]">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#DC2626] text-white border-2 border-black flex items-center justify-center shrink-0 mt-0.5 shadow-[1.5px_1.5px_0px_#000]">
                <ShieldAlert size={15} />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-heading font-black uppercase text-red-700 dark:text-amber-300 tracking-wide">
                  ATURAN WAJIB: NAMA IC HARUS SESUAI KTP IC!
                </p>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  Pastikan <strong>Nama IC</strong> yang Anda masukkan{" "}
                  <span className="underline decoration-red-600 font-bold">
                    sama persis dengan nama di KTP IC
                  </span>
                  . Apabila saat pemanggilan pemenang nama berbeda dengan KTP IC,
                  maka dinyatakan{" "}
                  <strong className="text-red-700 dark:text-red-400">
                    TIDAK SAH
                  </strong>{" "}
                  dan akan langsung{" "}
                  <strong className="text-red-700 dark:text-red-400">
                    DIKOCOK ULANG
                  </strong>
                  !
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Claimed View vs Input Form */}
          {myTicket ? (
            <div className="space-y-3">
              <div
                className={`rounded-2xl border-[3px] border-black p-4 shadow-[4px_4px_0px_#000] relative overflow-hidden ${
                  myWinnerRecord
                    ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-slate-950"
                    : myDisqualifiedRecord || myTicket.status === "DISQUALIFIED"
                    ? "bg-red-100 dark:bg-red-950/60 text-slate-900 dark:text-slate-100"
                    : "bg-[#FACC15] text-slate-950"
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b-2 border-black/20 pb-2.5 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Ticket size={16} className="text-[#DC2626]" />
                    <span className="font-mono font-black text-[11px] uppercase tracking-wider">
                      KUPON NOMOR DOORPRIZE ANDA
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border border-black font-mono font-black text-[10px] uppercase shadow-[1.5px_1.5px_0px_#000] ${
                      myWinnerRecord
                        ? "bg-white text-emerald-800"
                        : myDisqualifiedRecord || myTicket.status === "DISQUALIFIED"
                        ? "bg-red-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {myWinnerRecord
                      ? "PEMENANG UNDIAN!"
                      : myDisqualifiedRecord || myTicket.status === "DISQUALIFIED"
                      ? "TIDAK SAH / GUGUR"
                      : "TERDAFTAR RESMI"}
                  </span>
                </div>

                <div className="text-center py-2">
                  <span className="block font-mono font-bold text-[11px] uppercase tracking-widest opacity-80">
                    NOMOR UNDIAN PESERTA
                  </span>
                  <div className="font-heading font-black text-5xl sm:text-6xl tracking-tight my-1 drop-shadow-[2px_2px_0px_rgba(255,255,255,0.7)]">
                    #
                    {myTicket.numberFormatted ||
                      formatTicketNumber(myTicket.ticketNumber)}
                  </div>
                  <span className="inline-block px-3 py-0.5 rounded-full bg-black text-[#FACC15] font-mono font-black text-xs tracking-wider">
                    KODE TIKET: {myTicket.ticketCode}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t-2 border-black/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border-2 border-black text-slate-900 dark:text-slate-100">
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
                      NAMA IC TERDAFTAR (SESUAI KTP IC)
                    </span>
                    <strong className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck size={15} className="text-emerald-600 shrink-0" />
                      <span>{myTicket.icName}</span>
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyTicketInfo}
                    className="btn py-1.5 px-3 bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black rounded-lg font-heading font-black text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
                  >
                    {copiedTicket ? (
                      <>
                        <Check size={13} className="text-emerald-700" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Salin Nomor</span>
                      </>
                    )}
                  </button>
                </div>

                {myWinnerRecord && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white border-2 border-black text-slate-900 text-xs font-bold flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500 shrink-0" />
                    <span>
                      Selamat! Nomor Anda terpilih sebagai pemenang hadiah{" "}
                      <strong>{myWinnerRecord.prize || prizePerWinner}</strong>.
                      Tunjukkan KTP IC asli Anda ke panitia!
                    </span>
                  </div>
                )}

                {(myDisqualifiedRecord || myTicket.status === "DISQUALIFIED") && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-600 text-white border-2 border-black text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>
                      Nomor ini dinyatakan TIDAK SAH karena Nama IC tidak sesuai
                      dengan KTP IC dan telah dikocok ulang.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 px-1">
                <span>
                  Siapkan KTP IC Anda saat pengundian berlangsung di lokasi senam.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMyTicket(null);
                    saveMyTicketLocal(null);
                  }}
                  className="font-heading font-bold text-[#DC2626] dark:text-[#FACC15] underline hover:opacity-80 cursor-pointer shrink-0 ml-2"
                >
                  Input Nama IC Lain
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClaimTicket} className="space-y-3.5">
              <div>
                <label
                  htmlFor="doorprize-ic-name"
                  className="block font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  Masukkan Nama Lengkap IC (Wajib Sesuai KTP IC){" "}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="doorprize-ic-name"
                  type="text"
                  required
                  disabled={!isOpenStatus || isSubmitting}
                  value={icName}
                  onChange={(e) => {
                    setIcName(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Contoh: Ujang Slebew (Harus sama persis dengan KTP IC)"
                  className="input-field w-full text-sm font-bold py-2.5 px-3.5 border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] focus:ring-2 focus:ring-[#FACC15]"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Jika Anda sudah pernah mengambil nomor sebelumnya, ketik kembali
                  Nama IC Anda untuk menampilkan nomor undian Anda.
                </p>
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border-2 border-black/20 dark:border-white/15 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedRule}
                  onChange={(e) => setAgreedRule(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#DC2626] rounded cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug font-medium">
                  Saya memastikan <strong>Nama IC di atas sesuai dengan KTP IC</strong>.
                  Jika berbeda saat verifikasi pemenang, saya menerima nomor dinyatakan{" "}
                  <strong>TIDAK SAH dan dikocok ulang</strong>.
                </span>
              </label>

              {errorMsg && (
                <div className="p-2.5 rounded-xl border-2 border-black bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} className="text-[#DC2626] shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!isOpenStatus ? (
                <div className="p-3 rounded-xl border-2 border-black bg-slate-200 dark:bg-slate-800 text-center font-heading font-black text-xs uppercase text-slate-700 dark:text-slate-300">
                  Pengambilan Nomor Doorprize Sedang Ditutup Oleh Panitia
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn w-full py-3 px-5 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 border-[3px] border-black rounded-xl font-heading font-black text-sm uppercase tracking-wide shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-[#DC2626]" />
                      <span>Mengambil Nomor Doorprize...</span>
                    </>
                  ) : (
                    <>
                      <Ticket size={18} className="text-[#DC2626]" />
                      <span>Ambil Nomor Doorprize Sekarang</span>
                    </>
                  )}
                </button>
              )}
            </form>
          )}

          {/* Live Winners Board if any winner has been drawn */}
          {winners.length > 0 && (
            <div className="pt-2 border-t-2 border-black/15 dark:border-white/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Award size={16} className="text-[#DC2626]" />
                  <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Pemenang Hasil Pengundian ({winners.length}/{maxWinners})
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-600/40">
                  Hadiah @ {prizePerWinner}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {winners.map((w, idx) => (
                  <div
                    key={w.ticketId || idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border-2 border-black bg-emerald-50/90 dark:bg-emerald-950/30 shadow-[2px_2px_0px_#000]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#FACC15] text-black border-2 border-black font-heading font-black text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-black text-[#FACC15]">
                            #{w.numberFormatted || formatTicketNumber(w.ticketNumber)}
                          </span>
                          <strong className="font-heading font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {w.icName}
                          </strong>
                        </div>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 block">
                          Hadiah: <strong>{w.prize || prizePerWinner}</strong>
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded border border-black font-mono font-black text-[9px] uppercase shrink-0 ${
                        w.verifiedKtp
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-300 text-black"
                      }`}
                    >
                      {w.verifiedKtp ? "✓ SAH SESUAI KTP" : "CEK KTP IC"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disqualified / Re-rolled Notice if any */}
          {disqualifiedList.length > 0 && (
            <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
              <span className="block font-mono font-bold text-[10px] uppercase text-red-600 dark:text-red-400">
                Riwayat Nomor Gugur / Tidak Sah (Dikocok Ulang):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {disqualifiedList.slice(0, 6).map((d, i) => (
                  <span
                    key={d.ticketId || i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-500/40 bg-red-100/80 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-mono text-[10px] line-through"
                    title={d.reason || "Nama IC berbeda dengan KTP IC"}
                  >
                    #{d.numberFormatted || formatTicketNumber(d.ticketNumber)}{" "}
                    {d.icName} (Beda KTP)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-100 dark:bg-[#10121A] border-t-2 border-black flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>LSM Paguyuban Pizza Sandy Shores</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn py-1.5 px-3.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-black rounded-lg font-heading font-black text-xs shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
}
