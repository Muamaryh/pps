import React from "react";
import { Calendar, Clock, MapPin, Award, Users, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function EventSection({ onOpenRegisterEvent }) {
  return (
    <section id="event" className="py-14 sm:py-20 px-3 sm:px-6 relative select-none">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15] border-2 border-black shadow-[2px_2px_0px_#000] mb-3">
              <Sparkles size={14} className="text-[#DC2626]" />
              <span className="font-heading font-black text-xs uppercase tracking-wider text-[#111827]">
                TURNAMEN RESMI LSM PPS
              </span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-slate-950 dark:text-slate-100 uppercase tracking-tight">
              UFC Sandy Shores: Civilian Brawl
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mt-1">
              Turnamen tarung bebas resmi khusus warga sipil (<strong>Civilian Only</strong>). Sistem verifikasi OCR otomatis menyaring petarung agar murni non-gang.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenRegisterEvent}
            className="self-start md:self-auto btn py-3 px-6 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-heading font-black text-sm uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all shrink-0"
          >
            <span>Daftar UFC (Biaya 10K)</span>
            <ArrowRight size={16} className="text-[#FACC15]" />
          </button>
        </div>

        {/* Main Event Card (Neo-Brutalist Sandy Shores Style) */}
        <div className="card-brutal p-6 sm:p-8 bg-[#FFFDF9] dark:bg-[#1A1D27] border-[3px] border-black dark:border-[#475569] shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
          {/* Accent Ribbon */}
          <div className="absolute top-0 right-0 bg-[#FACC15] border-b-2 border-l-2 border-black font-heading font-black text-xs uppercase px-4 py-1.5 shadow-sm text-slate-950">
            PENDAFTARAN DIBUKA • BIAYA 10K
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Event Core Info */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div>
                <span className="text-xs font-mono font-black text-[#DC2626] dark:text-[#FACC15] uppercase tracking-wider block mb-1">
                  ATURAN MUTLAK: KHUSUS CIVILIAN & NO GANG
                </span>
                <h3 className="font-heading font-black text-xl sm:text-2xl md:text-3xl text-slate-950 dark:text-white uppercase leading-tight">
                  Turnamen Tarung Bebas Antar Warga Sipil
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Ajang adu ketangkasan fisik resmi di Sandy Shores yang diperuntukkan <strong>khusus Civilian (Freelancer)</strong>. Tidak diperkenankan bagi anggota faksi kepolisian, medis, maupun petarung terafiliasi Gang. Verifikasi dilakukan langsung dengan sistem pemindai OCR KTP & HUD in-game.
              </p>

              {/* Event Metadatas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-100 dark:bg-[#14161F] border-2 border-black/15 dark:border-white/10 rounded-lg flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-[#FACC15] border border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                    <Calendar size={18} className="text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Jadwal Tanding</span>
                    <strong className="text-xs font-mono text-slate-900 dark:text-slate-100">Sabtu, 24 Oktober 2026</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#14161F] border-2 border-black/15 dark:border-white/10 rounded-lg flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-[#DC2626] border border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                    <Clock size={18} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Waktu Mulai</span>
                    <strong className="text-xs font-mono text-slate-900 dark:text-slate-100">20.30 WIB - Selesai</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#14161F] border-2 border-black/15 dark:border-white/10 rounded-lg flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-emerald-500 border border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                    <MapPin size={18} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Arena Oktagon</span>
                    <strong className="text-xs font-mono text-slate-900 dark:text-slate-100">Ring Utama Sandy Shores PPS</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#14161F] border-2 border-black/15 dark:border-white/10 rounded-lg flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-amber-400 border border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                    <Award size={18} className="text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Biaya & Hadiah</span>
                    <strong className="text-xs font-mono text-[#DC2626] dark:text-[#FACC15]">Biaya 10K • Sabuk Juara + Kas</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Benefits Box & Direct CTA */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full bg-amber-50/70 dark:bg-[#14161F] p-5 sm:p-6 rounded-xl border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                  <Users size={18} className="text-[#DC2626] dark:text-[#FACC15]" />
                  <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                    Syarat Pendaftaran Petarung
                  </h4>
                </div>

                <ul className="flex flex-col gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Screenshot KTP + HUD</strong>: Terlihat waktu, status Civilian, dan No Gang.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Biaya Pendaftaran 10K</strong>: Diserahkan saat konfirmasi kehadiran di arena.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Kontak Lengkap</strong>: Cukup No HP IC dan Username Telegram aktif.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Sistem Verifikasi OCR</strong>: Otomatis menolak pendaftar jika terdeteksi anggota Gang.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-5 mt-4 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onOpenRegisterEvent}
                  className="w-full btn py-3.5 px-4 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-heading font-black text-sm uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
                >
                  <Sparkles size={16} className="text-[#DC2626]" />
                  <span>Daftar UFC Civilian (Biaya 10K)</span>
                </button>
                <span className="text-[11px] text-center font-mono text-slate-500">
                  Verifikasi otomatis via Tesseract OCR in-game Los Santos ID.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
