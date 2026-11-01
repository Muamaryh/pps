// ==========================================================================
// MODAL PEMBAYARAN KAS ANGGOTA - LSM PAGUYUBAN PIZZA SANDY SHORES
// Mendukung pilihan cepat 1-12 Bulan & Opsi Custom Nominal Konversi / Donatur
// Mata Uang: Dollar ($ / USD) FiveM GTA V
// ==========================================================================

import React, { useState, useEffect } from "react";
import { X, DollarSign, Calendar, SlidersHorizontal, Check } from "lucide-react";
import {
  STANDARD_KAS_MONTHLY,
  MONTHLY_PRESETS,
  calculateKasDuration,
  formatCurrency,
  formatKasDate,
  recordKasIncomeCloud,
} from "../services/kasService";
import {
  renewMemberKasSubscriptionCloud,
  getMemberKasSubscription,
} from "../services/memberService";

export default function KasPaymentModal({
  isOpen,
  onClose,
  member,
  onSuccess,
  onShowToast,
}) {
  if (!isOpen || !member) return null;

  const currentSub = getMemberKasSubscription(member);

  // Cek apakah anggota sebelumnya punya komitmen donatur khusus
  const hasPreviousCustomRate = Boolean(
    member.kasCustomMonthlyRate && member.kasCustomMonthlyRate !== STANDARD_KAS_MONTHLY
  );

  const [selectedPresetMonths, setSelectedPresetMonths] = useState(
    hasPreviousCustomRate ? null : 1
  );
  const [isCustomMode, setIsCustomMode] = useState(hasPreviousCustomRate);
  const [customAmount, setCustomAmount] = useState(
    hasPreviousCustomRate ? String(member.kasCustomMonthlyRate) : "50000"
  );
  const [allocationMode, setAllocationMode] = useState(
    hasPreviousCustomRate ? "CUSTOM_MONTHLY" : "CONVERT_DURATION"
  );
  const [wallet, setWallet] = useState("Oita"); // "Oita" | "Darren"
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state saat modal dibuka untuk member
  useEffect(() => {
    if (member) {
      const hasCustom = Boolean(
        member.kasCustomMonthlyRate && member.kasCustomMonthlyRate !== STANDARD_KAS_MONTHLY
      );
      if (hasCustom) {
        setIsCustomMode(true);
        setSelectedPresetMonths(null);
        setCustomAmount(String(member.kasCustomMonthlyRate));
        setAllocationMode("CUSTOM_MONTHLY");
      } else {
        setIsCustomMode(false);
        setSelectedPresetMonths(1);
        setCustomAmount("50000");
        setAllocationMode("CONVERT_DURATION");
      }
      setNotes("");
    }
  }, [member]);

  // Hitung nominal dan durasi aktif
  let activeAmount = 4000;
  let durationDays = 30;
  let durationLabel = "1 Bulan (+30 Hari)";

  if (!isCustomMode && selectedPresetMonths) {
    const preset = MONTHLY_PRESETS.find((p) => p.months === selectedPresetMonths) || MONTHLY_PRESETS[0];
    activeAmount = preset.amount;
    durationDays = preset.months * 30;
    durationLabel = `${preset.months} Bulan (+${durationDays} Hari)`;
  } else {
    activeAmount = Math.max(0, Number(customAmount) || 0);
    if (allocationMode === "CONVERT_DURATION") {
      const conv = calculateKasDuration(activeAmount, STANDARD_KAS_MONTHLY);
      durationDays = conv.days;
      durationLabel = conv.label;
    } else {
      durationDays = 30;
      durationLabel = "1 Bulan (+30 Hari)";
    }
  }

  // Hitung tanggal jatuh tempo baru
  const now = Date.now();
  const baseTime = currentSub.isActive && currentSub.expiresAt && currentSub.expiresAt > now
    ? currentSub.expiresAt
    : now;
  const projectedExpiresAt = baseTime + durationDays * 86400000;

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (activeAmount <= 0) {
      if (onShowToast) onShowToast("Nominal pembayaran harus lebih dari $0", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update masa aktif anggota di Cloud
      const updatedMember = await renewMemberKasSubscriptionCloud(member, durationDays, {
        amount: activeAmount,
        customMonthlyRate: isCustomMode && allocationMode === "CUSTOM_MONTHLY" ? activeAmount : null,
        allocationMode: isCustomMode ? allocationMode : "STANDARD_PRESET",
      });

      // 2. Catat transaksi pemasukan ke Buku Kas (Ledger)
      const txTitle = isCustomMode
        ? allocationMode === "CUSTOM_MONTHLY"
          ? `Iuran Kas Donatur (1 Bln) - ${member.fullName || "Anggota"}`
          : `Iuran Kas (${durationLabel}) - ${member.fullName || "Anggota"}`
        : `Iuran Kas (${selectedPresetMonths} Bulan) - ${member.fullName || "Anggota"}`;

      await recordKasIncomeCloud({
        amount: activeAmount,
        title: txTitle,
        category: isCustomMode && allocationMode === "CUSTOM_MONTHLY" ? "Iuran Kas Donatur" : "Iuran Kas Anggota",
        wallet,
        memberId: member.id,
        memberName: member.fullName || "",
        memberCid: member.icNumber || member.citizenId || "",
        allocationMode: isCustomMode ? allocationMode : "STANDARD_PRESET",
        durationDays,
        notes: notes.trim(),
        recordedBy: "Admin",
      });

      if (onShowToast) {
        onShowToast(
          `Pembayaran kas ${formatCurrency(activeAmount)} untuk ${member.fullName || "Anggota"} berhasil dicatat (+${durationDays} hari).`,
          "success"
        );
      }

      if (typeof onSuccess === "function") {
        onSuccess(updatedMember);
      }
      onClose();
    } catch (err) {
      console.error("Gagal memproses pembayaran kas:", err);
      if (onShowToast) onShowToast("Gagal menyimpan pembayaran kas. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="card-brutal w-full max-w-lg bg-[var(--modal-bg)] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] p-4 sm:p-5 flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-[#475569]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-500 border border-black flex items-center justify-center text-white shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black uppercase text-slate-900 dark:text-slate-100">
                Pencatatan Kas Anggota
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {member.fullName} • CID: {member.icNumber || member.citizenId || "-"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Masa Aktif Saat Ini */}
        <div className="p-2.5 rounded bg-slate-100 dark:bg-[#161820] border border-black/20 text-xs flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400">Status Saat Ini:</span>
          <span className={`font-mono font-bold ${currentSub.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {currentSub.isActive
              ? `Lunas (${currentSub.daysRemaining} hari lagi, s.d. ${currentSub.expiresAtFormatted})`
              : "Belum Bayar / Lewat Tempo"}
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 text-xs">
          {/* Pilihan Cepat 1 - 12 Bulan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Pilihan Durasi Cepat (1 - 12 Bulan)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Tarif standar: $4.000/bulan
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {MONTHLY_PRESETS.map((preset) => {
                const isSelected = !isCustomMode && selectedPresetMonths === preset.months;
                return (
                  <button
                    key={preset.months}
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setSelectedPresetMonths(preset.months);
                    }}
                    className={`py-1.5 px-2 rounded border font-mono text-[11px] font-bold text-center transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white border-black shadow-[1px_1px_0px_#000]"
                        : "bg-white dark:bg-[#1E212B] border-black/30 text-slate-800 dark:text-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>{preset.months} Bulan</div>
                    <div className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-slate-500"}`}>
                      ${(preset.amount / 1000).toFixed(0)}k
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tombol Toggle Opsi Custom / Nominal Lainnya */}
          <div>
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setSelectedPresetMonths(null);
              }}
              className={`w-full py-2 px-3 rounded border-2 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                isCustomMode
                  ? "bg-amber-500 text-slate-950 border-black shadow-[1.5px_1.5px_0px_#000]"
                  : "bg-slate-100 dark:bg-[#161820] text-slate-700 dark:text-slate-300 border-dashed border-black/40 hover:bg-amber-100 dark:hover:bg-amber-950/40"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Nominal Lainnya / Custom (Klik untuk buka input)</span>
            </button>
          </div>

          {/* Area Input Custom Nominal & Mode Alokasi (Hanya muncul jika isCustomMode aktif) */}
          {isCustomMode && (
            <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500/60 flex flex-col gap-3">
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                  Masukkan Nominal Bebas ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    required={isCustomMode}
                    autoFocus
                    placeholder="Contoh: 50000"
                    className="input-field pl-8 font-mono font-bold text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
                  />
                </div>
              </div>

              {/* Mode Alokasi */}
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1.5">
                  Pilihan Alokasi Nominal Ini:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded border-2 cursor-pointer flex flex-col gap-1 transition-colors ${
                      allocationMode === "CONVERT_DURATION"
                        ? "border-emerald-600 bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 shadow-[1px_1px_0px_#000]"
                        : "border-black/20 bg-white/60 dark:bg-[#14161F] text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-emerald-800 dark:text-emerald-400">
                        1. Konversi Durasi Otomatis
                      </span>
                      <input
                        type="radio"
                        name="allocationMode"
                        value="CONVERT_DURATION"
                        checked={allocationMode === "CONVERT_DURATION"}
                        onChange={() => setAllocationMode("CONVERT_DURATION")}
                        className="accent-emerald-600"
                      />
                    </div>
                    <p className="text-[10px] leading-tight text-slate-600 dark:text-slate-400">
                      Nominal dibagi $4.000/bulan. Durasi bertambah proporsional.
                    </p>
                  </label>

                  <label
                    className={`p-2.5 rounded border-2 cursor-pointer flex flex-col gap-1 transition-colors ${
                      allocationMode === "CUSTOM_MONTHLY"
                        ? "border-amber-600 bg-white dark:bg-[#1E212B] text-slate-900 dark:text-slate-100 shadow-[1px_1px_0px_#000]"
                        : "border-black/20 bg-white/60 dark:bg-[#14161F] text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-amber-800 dark:text-amber-400">
                        2. Iuran Khusus Donatur (1 Bulan)
                      </span>
                      <input
                        type="radio"
                        name="allocationMode"
                        value="CUSTOM_MONTHLY"
                        checked={allocationMode === "CUSTOM_MONTHLY"}
                        onChange={() => setAllocationMode("CUSTOM_MONTHLY")}
                        className="accent-amber-600"
                      />
                    </div>
                    <p className="text-[10px] leading-tight text-slate-600 dark:text-slate-400">
                      Durasi tetap 1 bulan (+30 hari). Bulan berikutnya iuran anggota disetel ke nominal ini.
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Rincian Hasil Perhitungan */}
          <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 flex flex-col gap-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span>Durasi Bertambah:</span>
              <strong className="font-bold">{durationLabel}</strong>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span>Jatuh Tempo Baru:</span>
              <strong className="font-bold">{formatKasDate(projectedExpiresAt)}</strong>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-emerald-300 dark:border-emerald-800/40">
              <span>Masuk ke Buku Kas:</span>
              <strong className="font-bold text-emerald-700 dark:text-emerald-300">
                +{formatCurrency(activeAmount)}
              </strong>
            </div>
          </div>

          {/* Pilihan Penerima Kas Bendahara */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Disetorkan ke Bendahara Siapa? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWallet("Oita")}
                className={`p-2.5 rounded border-2 text-left cursor-pointer transition-all ${
                  wallet === "Oita"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-[#FACC15] shadow-[2px_2px_0px_#000]"
                    : "bg-white dark:bg-[#1E212B] border-black/20 dark:border-white/20 hover:border-black"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-slate-900 dark:text-slate-100 uppercase">
                    Kas Oita
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${wallet === "Oita" ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-slate-300"}`} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Bendahara LSM PPS
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWallet("Darren")}
                className={`p-2.5 rounded border-2 text-left cursor-pointer transition-all ${
                  wallet === "Darren"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-[#FACC15] shadow-[2px_2px_0px_#000]"
                    : "bg-white dark:bg-[#1E212B] border-black/20 dark:border-white/20 hover:border-black"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-slate-900 dark:text-slate-100 uppercase">
                    Kas Darren
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${wallet === "Darren" ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-slate-300"}`} />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Bendahara LSM PPS
                </span>
              </button>
            </div>
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Catatan Transaksi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Titipan kas tunai di stand pizza Sandy Shores"
              className="input-field text-xs bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || activeAmount <= 0}
              className="py-2.5 px-5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <DollarSign size={15} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Pembayaran Kas"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
