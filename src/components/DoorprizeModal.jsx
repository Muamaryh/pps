import React, { useState, useEffect, useMemo } from "react";
import {
  Ticket,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  X,
  Users,
  ShieldAlert,
  Loader2,
  Award,
  User,
  DollarSign,
  Search,
  Lock,
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
  const [activeTab, setActiveTab] = useState("form");
  const [icName, setIcName] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [agreedRule, setAgreedRule] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [claimedTicketState, setClaimedTicketState] = useState(null);
  const [clearedLocalTicket, setClearedLocalTicket] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  const activeConfig = config || {};
  const title = activeConfig.title || "Undian Senam Sehat Bersama LSM PPS";
  const subtitle =
    activeConfig.subtitle ||
    "Program Undian Doorprize Resmi LSM Paguyuban Pizza Sandy Shores";
  const prizePerWinner = activeConfig.prizePerWinner || "$10.000";
  const maxWinners = Math.max(1, Number(activeConfig.maxWinners) || 10);
  const isOpenStatus = activeConfig.status === "OPEN";
  const winners = useMemo(
    () => (Array.isArray(activeConfig.winners) ? activeConfig.winners : []),
    [activeConfig.winners]
  );
  const disqualifiedList = useMemo(
    () =>
      Array.isArray(activeConfig.disqualifiedHistory)
        ? activeConfig.disqualifiedHistory
        : [],
    [activeConfig.disqualifiedHistory]
  );

  // Handle ESC key to close modal (same as BansosModal)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const myTicket = useMemo(() => {
    if (clearedLocalTicket) return claimedTicketState;
    if (claimedTicketState) {
      const liveFromClaimed = tickets.find((t) => t.id === claimedTicketState.id);
      return liveFromClaimed || claimedTicketState;
    }
    const saved = getSavedMyTicket(activeConfig.roundId);
    if (!saved) return null;
    const liveMatch = tickets.find((t) => t.id === saved.id);
    if (liveMatch) return liveMatch;
    if (tickets.length === 0) return saved;
    const byCidOrName = tickets.find((t) => {
      const sameCid =
        saved.citizenId &&
        t.citizenId &&
        String(t.citizenId).toLowerCase() === String(saved.citizenId).toLowerCase();
      const sameName =
        String(t.icName || "").toLowerCase() ===
        String(saved.icName || "").toLowerCase();
      return sameCid || sameName;
    });
    return byCidOrName || null;
  }, [claimedTicketState, clearedLocalTicket, activeConfig.roundId, tickets]);

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const name = String(t.icName || "").toLowerCase();
      const cid = String(t.citizenId || "").toLowerCase();
      const code = String(t.ticketCode || "").toLowerCase();
      const num = String(
        t.numberFormatted || formatTicketNumber(t.ticketNumber)
      ).toLowerCase();
      return (
        name.includes(q) ||
        cid.includes(q) ||
        code.includes(q) ||
        num.includes(q)
      );
    });
  }, [tickets, participantSearch]);

  if (!isOpen) return null;

  async function handleClaimTicket(e) {
    e.preventDefault();
    setErrorMsg("");

    const trimmedName = icName.replace(/\s+/g, " ").trim().toUpperCase();
    const trimmedCid = citizenId.replace(/\s+/g, "").trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg("Nama Lengkap IC wajib diisi sesuai yang tertera di KTP IC.");
      return;
    }

    if (!trimmedCid || trimmedCid.length < 2) {
      setErrorMsg("Citizen ID (CID) wajib diisi sesuai yang tertera di KTP IC.");
      return;
    }

    if (!agreedRule) {
      setErrorMsg(
        "Anda wajib menyetujui aturan bahwa Nama IC & Citizen ID harus sesuai dengan KTP IC."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await claimDoorprizeTicketCloud({
        icName: trimmedName,
        citizenId: trimmedCid,
      });
      setClearedLocalTicket(false);
      setClaimedTicketState(result.ticket);
      setIcName("");
      setCitizenId("");
      const numStr =
        result.ticket.numberFormatted ||
        formatTicketNumber(result.ticket.ticketNumber);
      if (result.alreadyClaimed) {
        onShowToast?.(
          `Data "${result.ticket.icName}" (${result.ticket.citizenId || trimmedCid}) sudah terdaftar dengan Nomor #${numStr}!`,
          "info"
        );
      } else {
        onShowToast?.(
          `Berhasil mengambil Nomor Doorprize #${numStr} (${result.ticket.ticketCode})!`,
          "success"
        );
      }
    } catch (err) {
      setErrorMsg(err?.message || "Gagal mengambil nomor doorprize.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const myWinnerRecord = myTicket
    ? winners.find((w) => w.ticketId === myTicket.id)
    : null;
  const myDisqualifiedRecord = myTicket
    ? disqualifiedList.find((d) => d.ticketId === myTicket.id)
    : null;

  const winnerIds = new Set(winners.map((w) => w.ticketId));
  const disqualifiedIds = new Set(disqualifiedList.map((d) => d.ticketId));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doorprize-modal-title"
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div className="relative w-full max-w-3xl bg-[#FFFDF9] dark:bg-[#161822] border border-black/20 dark:border-white/15 shadow-2xl text-slate-900 dark:text-slate-100 my-auto rounded-2xl overflow-hidden transition-all">
        {/* Top Header Banner (Identical style to BansosModal) */}
        <div className="bg-[#FACC15] text-[#111827] border-b border-black/20 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-black text-[#FACC15] flex items-center justify-center font-black border border-black/20 shadow-sm shrink-0">
              <Ticket size={22} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/70 block">
                {subtitle}
              </span>
              <h2
                id="doorprize-modal-title"
                className="font-heading font-black text-base sm:text-lg leading-tight uppercase"
              >
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Jendela Doorprize"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-red-500/80 shadow-sm cursor-pointer active:scale-95 transition-all shrink-0"
            title="Tutup (Esc)"
          >
            <X size={18} className="stroke-[3]" />
          </button>
        </div>

        {/* Navigation Tabs (Ambil Nomor Doorprize vs Daftar Peserta & Pemenang) */}
        <div className="flex items-center border-b border-black/10 dark:border-white/10 bg-[#F6F4ED] dark:bg-[#0E111B] px-4 sm:px-6 py-2.5 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`py-2 px-3.5 text-xs font-heading font-black uppercase rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "form"
                ? "bg-[#FACC15] text-slate-950 border-amber-500/80 shadow-sm"
                : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-black/15 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/10"
            }`}
          >
            <Ticket
              size={15}
              className={!isOpenStatus ? "text-slate-400" : "text-[#DC2626]"}
            />
            <span>Formulir Ambil Nomor</span>
            {!isOpenStatus && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 border border-amber-400 uppercase">
                Tutup
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("participants")}
            className={`py-2 px-3.5 text-xs font-heading font-black uppercase rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "participants"
                ? "bg-[#FACC15] text-slate-950 border-amber-500/80 shadow-sm"
                : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-black/15 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/10"
            }`}
          >
            <Users size={15} className="text-emerald-600" />
            <span>Daftar Peserta & Pemenang</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400/70">
              {tickets.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* TAB 1: FORMULIR AMBIL NOMOR DOORPRIZE */}
          {activeTab === "form" && (
            <>
              {/* Hadiah Utama Highlight Banner */}
              <div className="bg-[#FAF8F3] dark:bg-[#121622] border border-amber-400/50 dark:border-amber-700/40 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="text-[11px] font-black uppercase text-[#92400E] dark:text-[#FBBF24] tracking-wider">
                    Rincian Hadiah Utama Undian Senam Sehat:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md border border-emerald-500/70 uppercase">
                      Peserta Tanpa Batas Kuota
                    </span>
                    <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-md border border-red-500/70 uppercase">
                      1 CID = 1 Nomor Undian
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1A1F2E] border border-black/15 dark:border-white/10 flex flex-col items-center justify-center">
                    <DollarSign
                      className="text-emerald-600 dark:text-emerald-400 mb-1"
                      size={24}
                    />
                    <span className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      Uang Tunai {prizePerWinner} USD
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Hadiah Tunai Langsung Per Pemenang ($10k)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#1A1F2E] border border-black/15 dark:border-white/10 flex flex-col items-center justify-center">
                    <Trophy
                      className="text-amber-600 dark:text-amber-400 mb-1"
                      size={24}
                    />
                    <span className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      Untuk {maxWinners} Orang Pemenang
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Masing-masing dapat {prizePerWinner} ({tickets.length} Peserta Terdaftar)
                    </span>
                  </div>
                </div>
              </div>

              {/* Aturan Wajib KTP IC & Citizen ID Box */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-400/60 dark:border-amber-600/50 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#DC2626] text-white border border-red-500/70 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert size={15} />
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-heading font-black uppercase text-red-700 dark:text-amber-300 block tracking-wide">
                    Aturan Wajib: Nama IC & Citizen ID Harus Sesuai KTP IC!
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    Pastikan <strong>Nama Lengkap IC</strong> dan{" "}
                    <strong>Citizen ID (CID)</strong> yang Anda masukkan{" "}
                    <span className="underline decoration-red-600 font-bold">
                      sama persis dengan data di KTP IC
                    </span>
                    . Apabila saat pemanggilan pemenang berbeda dengan KTP IC, maka
                    dinyatakan{" "}
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

              {/* VIEW: EITHER CLAIMED TICKET COUPON OR CLAIM FORM */}
              {myTicket ? (
                /* SUCCESS DIGITAL COUPON VIEW */
                <div className="rounded-2xl border border-emerald-500/60 bg-emerald-50 dark:bg-[#06241a] p-5 shadow-sm space-y-4 animate-fadeIn">
                  <div className="text-center space-y-1">
                    <div className="inline-flex p-2 bg-emerald-600 text-white rounded-full border border-emerald-500/70 shadow-sm mb-1">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="font-heading font-black text-xl text-emerald-800 dark:text-emerald-300 uppercase">
                      Nomor Doorprize Berhasil Diambil!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Simpan nomor undian berikut dan siapkan KTP IC Anda saat pengundian dimulai.
                    </p>
                  </div>

                  {/* Digital Coupon Box */}
                  <div className="rounded-xl bg-white dark:bg-[#121622] border border-dashed border-black/25 dark:border-white/25 p-4 text-center space-y-3 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">
                      Nomor Undian Doorprize Resmi
                    </span>
                    <div className="flex items-center justify-center">
                      <span className="font-mono font-black text-3xl sm:text-4xl text-slate-900 dark:text-[#FACC15] tracking-wider select-all">
                        #
                        {myTicket.numberFormatted ||
                          formatTicketNumber(myTicket.ticketNumber)}{" "}
                        <span className="text-base sm:text-lg text-slate-500 dark:text-slate-400">
                          ({myTicket.ticketCode})
                        </span>
                      </span>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 grid grid-cols-2 gap-2.5 text-left text-xs">
                      <div className="col-span-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Event Undian
                        </span>
                        <span className="font-heading font-black text-emerald-700 dark:text-emerald-400 block">
                          {title} ({maxWinners} Pemenang @ {prizePerWinner})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Nama Lengkap IC
                        </span>
                        <span className="font-heading font-black uppercase">
                          {myTicket.icName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Citizen ID (CID)
                        </span>
                        <span className="font-mono font-bold">
                          {myTicket.citizenId || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Hadiah Utama
                        </span>
                        <span className="font-heading font-black text-amber-700 dark:text-amber-400">
                          {prizePerWinner} USD
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Status Nomor
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-md font-black text-[10px] border uppercase ${
                            myWinnerRecord
                              ? "bg-emerald-600 text-white border-emerald-500/70"
                              : myDisqualifiedRecord ||
                                myTicket.status === "DISQUALIFIED"
                              ? "bg-red-600 text-white border-red-500/70"
                              : "bg-[#FACC15] text-black border-amber-500/70"
                          }`}
                        >
                          {myWinnerRecord
                            ? "PEMENANG UNDIAN!"
                            : myDisqualifiedRecord ||
                              myTicket.status === "DISQUALIFIED"
                            ? "TIDAK SAH / DIKOCOK ULANG"
                            : "TERDAFTAR & AKTIF"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {myWinnerRecord && (
                    <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/50 border border-amber-400/70 text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                      <Trophy size={18} className="text-amber-600 shrink-0" />
                      <span>
                        Selamat! Nomor Anda terpilih sebagai pemenang hadiah{" "}
                        <strong>{myWinnerRecord.prize || prizePerWinner}</strong>.
                        Silakan tunjukkan KTP IC asli Anda kepada panitia!
                      </span>
                    </div>
                  )}

                  {(myDisqualifiedRecord || myTicket.status === "DISQUALIFIED") && (
                    <div className="p-3 rounded-xl bg-red-600 text-white border border-red-500/70 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span>
                        Nomor ini dinyatakan TIDAK SAH karena Nama IC / Citizen ID
                        berbeda dengan KTP IC dan telah dikocok ulang.
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setClaimedTicketState(null);
                        setClearedLocalTicket(true);
                        saveMyTicketLocal(null);
                      }}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/15 dark:border-white/15 font-heading font-black text-xs uppercase shadow-sm cursor-pointer transition-all"
                    >
                      Cek / Input Citizen ID Lain
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-black border border-amber-500/70 font-heading font-black text-xs uppercase shadow-sm active:translate-y-0.5 cursor-pointer transition-all"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                </div>
              ) : !isOpenStatus ? (
                /* CLOSED STATE */
                <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#121622] border border-black/15 dark:border-white/15 shadow-sm text-center flex flex-col items-center justify-center gap-3.5 my-2">
                  <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-400/70 flex items-center justify-center text-amber-800 dark:text-amber-300 shadow-sm">
                    <Lock size={28} />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-400 uppercase tracking-wide inline-block">
                      Status: Pengambilan Nomor Ditutup
                    </span>
                    <h3 className="font-heading font-black text-base sm:text-lg uppercase text-slate-900 dark:text-slate-100">
                      Pengambilan Nomor Doorprize Sedang Ditutup
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Saat ini sesi pengambilan nomor doorprize telah ditutup oleh panitia. Silakan buka tab Daftar Peserta & Pemenang untuk melihat daftar nomor dan hasil kocokan pemenang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("participants")}
                    className="py-2.5 px-4 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-heading font-black text-xs uppercase border border-amber-500/70 shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Users size={16} />
                    <span>Lihat Daftar Peserta & Pemenang ({tickets.length})</span>
                  </button>
                </div>
              ) : (
                /* CLAIM FORM */
                <form onSubmit={handleClaimTicket} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-500/60 text-red-900 dark:text-red-200 text-xs font-bold flex items-start gap-2">
                      <AlertTriangle className="shrink-0 text-red-600" size={16} />
                      <div className="space-y-0.5">
                        <p>{errorMsg}</p>
                        <p className="text-[11px] font-normal text-red-800 dark:text-red-300">
                          Setiap Citizen ID hanya berhak mengambil 1 nomor doorprize.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rincian Data Peserta Doorprize Card */}
                  <div className="p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#121622] border border-black/15 dark:border-white/15 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] pb-1.5 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <User size={14} />
                        <span>Rincian Data Peserta Undian (Sesuai KTP IC)</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] px-2 py-0.5 rounded-md border border-amber-500/70">
                        WAJIB SESUAI KTP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Nama Lengkap IC */}
                      <div>
                        <label
                          htmlFor="doorprize-ic-name"
                          className="font-bold text-slate-700 dark:text-slate-300 block mb-1"
                        >
                          Nama Lengkap IC <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="doorprize-ic-name"
                          type="text"
                          required
                          disabled={isSubmitting}
                          placeholder="Contoh: MAMANG RESING"
                          value={icName}
                          onChange={(e) => {
                            setIcName(e.target.value.toUpperCase());
                            if (errorMsg) setErrorMsg("");
                          }}
                          className="input-field w-full px-3 py-2.5 text-xs font-bold uppercase"
                        />
                      </div>

                      {/* Citizen ID (CID) */}
                      <div>
                        <label
                          htmlFor="doorprize-citizen-id"
                          className="font-bold text-slate-700 dark:text-slate-300 block mb-1"
                        >
                          Citizen ID (CID) <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="doorprize-citizen-id"
                          type="text"
                          required
                          disabled={isSubmitting}
                          placeholder="Contoh: PPS12345"
                          value={citizenId}
                          onChange={(e) => {
                            setCitizenId(e.target.value.toUpperCase());
                            if (errorMsg) setErrorMsg("");
                          }}
                          className="input-field w-full px-3 py-2.5 text-xs font-mono font-bold uppercase"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#0B0D14] border border-black/15 dark:border-white/10 cursor-pointer select-none mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreedRule}
                        onChange={(e) => setAgreedRule(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#DC2626] rounded cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug font-medium">
                        Saya memastikan <strong>Nama Lengkap IC</strong> dan{" "}
                        <strong>Citizen ID (CID)</strong> di atas sudah{" "}
                        <strong>sesuai persis dengan KTP IC</strong>. Jika berbeda
                        saat verifikasi pemenang, nomor dinyatakan{" "}
                        <strong className="text-red-600 dark:text-red-400">
                          TIDAK SAH dan dikocok ulang
                        </strong>
                        .
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn py-3.5 px-4 bg-[#FACC15] hover:bg-[#EAB308] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-[#111827] border border-amber-500/70 font-heading font-black text-sm uppercase tracking-wider shadow-sm active:translate-y-0.5 flex items-center justify-center gap-2 transition-all min-h-[48px] cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Mengambil Nomor Doorprize...</span>
                        </>
                      ) : (
                        <>
                          <Ticket size={18} className="text-[#DC2626]" />
                          <span>Ambil Nomor Doorprize Sekarang</span>
                        </>
                      )}
                    </button>
                    <span className="block text-center text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      Sudah pernah mengambil nomor? Masukkan kembali Nama IC & Citizen ID Anda untuk melihat nomor undian Anda.
                    </span>
                  </div>
                </form>
              )}

              {/* Live Winners Board if any winner has been drawn */}
              {winners.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-[#0b241b] border border-emerald-500/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Award size={16} className="text-[#DC2626]" />
                      <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        Pemenang Hasil Pengundian ({winners.length}/{maxWinners})
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#FACC15] text-black border border-amber-500/70">
                      Hadiah @ {prizePerWinner}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {winners.map((w, idx) => (
                      <div
                        key={w.ticketId || idx}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#121622] border border-black/15 dark:border-white/10 shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-[#FACC15] text-black border border-amber-500/70 font-heading font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-[11px] px-1.5 py-0.5 rounded bg-slate-900 text-[#FACC15]">
                                #
                                {w.numberFormatted ||
                                  formatTicketNumber(w.ticketNumber)}
                              </span>
                              <strong className="font-heading font-black text-xs text-slate-900 dark:text-white truncate">
                                {w.icName}
                              </strong>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              CID: {w.citizenId || "-"} •{" "}
                              <strong>{w.prize || prizePerWinner}</strong>
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 rounded-md border font-mono font-black text-[9px] uppercase shrink-0 ${
                            w.verifiedKtp
                              ? "bg-emerald-600 text-white border-emerald-500/70"
                              : "bg-amber-300 text-black border-amber-500/70"
                          }`}
                        >
                          {w.verifiedKtp ? "✓ SAH" : "CEK KTP"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: DAFTAR PESERTA & PEMENANG DOORPRIZE */}
          {activeTab === "participants" && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#0b241b] dark:to-[#0f2e24] border border-emerald-500/50 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white border border-emerald-500/70 flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Trophy size={20} />
                </div>
                <div>
                  <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-slate-950 dark:text-slate-100">
                    Transparansi Peserta & Pemenang Doorprize
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                    Kuota {maxWinners} Pemenang @ {prizePerWinner} • {title}
                  </p>
                </div>
              </div>

              {/* 3 Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white dark:bg-[#121622] border border-black/15 dark:border-white/10 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FACC15] border border-amber-500/70 flex items-center justify-center font-bold text-slate-950 shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                      Total Peserta
                    </span>
                    <span className="font-heading font-black text-sm text-slate-950 dark:text-slate-100">
                      {tickets.length} Nomor
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#121622] border border-black/15 dark:border-white/10 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 border border-emerald-500/70 flex items-center justify-center font-bold text-white shrink-0">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                      Pemenang Terpilih
                    </span>
                    <span className="font-heading font-black text-sm text-emerald-700 dark:text-emerald-400">
                      {winners.length} / {maxWinners} Pemenang
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#121622] border border-black/15 dark:border-white/10 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 border border-red-500/70 flex items-center justify-center font-bold text-white shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                      Gugur (Beda KTP)
                    </span>
                    <span className="font-heading font-black text-sm text-red-600 dark:text-red-400">
                      {disqualifiedList.length} Nomor
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Cari nomor undian, Nama Lengkap IC, atau Citizen ID..."
                  className="input-field w-full !pl-9 !pr-8 py-2 text-xs"
                />
              </div>

              {/* Participant List */}
              {filteredParticipants.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-black/20 dark:border-white/20 rounded-xl">
                  Belum ada peserta yang terdaftar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {filteredParticipants.map((t) => {
                    const isWin = winnerIds.has(t.id);
                    const isDisq =
                      t.status === "DISQUALIFIED" || disqualifiedIds.has(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                          isWin
                            ? "bg-emerald-50 dark:bg-emerald-950/35 border-emerald-500/50"
                            : isDisq
                            ? "bg-red-50 dark:bg-red-950/30 border-red-400/50 opacity-75"
                            : "bg-white dark:bg-[#121622] border-black/15 dark:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-1 rounded-lg bg-slate-900 text-[#FACC15] font-mono font-black text-xs shrink-0">
                            #
                            {t.numberFormatted ||
                              formatTicketNumber(t.ticketNumber)}
                          </span>
                          <div className="min-w-0">
                            <strong
                              className={`font-heading font-black text-xs block truncate ${
                                isDisq
                                  ? "line-through text-red-700 dark:text-red-400"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {t.icName}
                            </strong>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              CID: <strong>{t.citizenId || "-"}</strong> •{" "}
                              {t.ticketCode}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md border font-mono font-black text-[9px] uppercase shrink-0 ${
                            isWin
                              ? "bg-emerald-600 text-white border-emerald-500/70"
                              : isDisq
                              ? "bg-red-600 text-white border-red-500/70"
                              : "bg-[#FACC15] text-black border-amber-500/70"
                          }`}
                        >
                          {isWin
                            ? "PEMENANG"
                            : isDisq
                            ? "BEDA KTP"
                            : "TERDAFTAR"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
