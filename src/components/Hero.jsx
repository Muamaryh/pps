import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  Camera,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function Hero({
  heading: _heading,
  subtext,
  onOpenPermit,
  onNavigateToStructure,
  onNavigateToGallery,
}) {
  // Snappy Typewriter effect state (3 distinct lines)
  const targetLine1 = "LEMBAGA SWADAYA MASYARAKAT";
  const targetLine2 = "PAGUYUBAN PIZZA";
  const targetLine3 = "SANDY SHORES";

  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [text3, setText3] = useState("");
  const [step, setStep] = useState(0); // 0 = logo arrival, 1 = line 1, 2 = line 2, 3 = line 3, 4 = completed

  useEffect(() => {
    let timeout;
    if (step === 0) {
      // Tunggu animasi kedatangan logo mendarat mantap (~200ms) baru mulai ketik
      timeout = setTimeout(() => {
        setStep(1);
      }, 200);
    } else if (step === 1) {
      if (text1.length < targetLine1.length) {
        timeout = setTimeout(() => {
          setText1(targetLine1.slice(0, text1.length + 1));
        }, 16);
      } else {
        timeout = setTimeout(() => {
          setStep(2);
        }, 70);
      }
    } else if (step === 2) {
      if (text2.length < targetLine2.length) {
        timeout = setTimeout(() => {
          setText2(targetLine2.slice(0, text2.length + 1));
        }, 18);
      } else {
        timeout = setTimeout(() => {
          setStep(3);
        }, 70);
      }
    } else if (step === 3) {
      if (text3.length < targetLine3.length) {
        timeout = setTimeout(() => {
          setText3(targetLine3.slice(0, text3.length + 1));
        }, 20);
      } else {
        timeout = setTimeout(() => {
          setStep(4);
        }, 120);
      }
    }
    return () => clearTimeout(timeout);
  }, [text1, text2, text3, step]);

  return (
    <section id="home" className="pt-2 pb-8 sm:pb-12 w-full scroll-mt-24">
      {/* 1. Box Gambar pps.jpg (Teks di Depan Gambar dengan Efek Typing 3 Baris Cepat) */}
      <div className="w-full relative rounded-2xl overflow-hidden border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] aspect-[1840/855] min-h-[280px] sm:min-h-[400px] md:min-h-[500px] flex items-center justify-center p-4 sm:p-8 text-center">
        {/* Gambar pps.jpg sebagai latar belakang */}
        <img
          src="/pps.jpg"
          alt="LSM Paguyuban Pizza Sandy Shores"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />

        {/* Lapisan solid gelap agar teks putih, kuning, & merah sangat tajam terbaca */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Kalimat Utama Berada Tepat di Depan pps.jpg dengan Logo & Efek Typing 3 Baris Rapi */}
        <div className="relative z-10 max-w-5xl px-3 sm:px-6 py-4 flex flex-col items-center justify-center">
          {/* Logo PPS di atas Judul Banner */}
          <div className="mb-2.5 sm:mb-4 select-none animate-logo-arrival">
            <img
              src="/logo.png"
              alt="Logo LSM Paguyuban Pizza Sandy Shores"
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain hover:scale-110 hover:-rotate-3 transition-all duration-300 cursor-pointer"
            />
          </div>

          <h1 className="leading-[1.1] uppercase w-full flex flex-col items-center justify-center">
            {/* Baris 1: LEMBAGA SWADAYA MASYARAKAT (Typing Putih) */}
            <span className="block font-heading text-base sm:text-2xl md:text-3xl lg:text-4xl text-white tracking-widest font-black uppercase mb-1 sm:mb-2 drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]">
              {text1}
              {step === 1 && (
                <span className="inline-block w-1.5 sm:w-2 h-4 sm:h-7 bg-[#FACC15] ml-1 animate-pulse align-middle" />
              )}
            </span>

            {/* Baris 2: PAGUYUBAN PIZZA (Typing Kuning) */}
            <span className="block font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#FACC15] tracking-tight font-black uppercase drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] leading-tight">
              {text2}
              {step === 2 && (
                <span className="inline-block w-1.5 sm:w-2.5 h-6 sm:h-11 bg-[#FACC15] ml-1.5 animate-pulse align-middle" />
              )}
            </span>

            {/* Baris 3: SANDY SHORES (Typing Merah) */}
            <span className="block font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#DC2626] tracking-tight font-black uppercase drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] leading-tight mt-0.5 sm:mt-1">
              {text3}
              {(step === 3 || step === 4) && (
                <span className="inline-block w-1.5 sm:w-2.5 h-6 sm:h-11 bg-[#DC2626] ml-1.5 animate-pulse align-middle" />
              )}
            </span>
          </h1>
        </div>
      </div>

      {/* 2. Seluruh Konten Slogan, Legalitas & CTA */}
      <div className="mt-8 text-center max-w-4xl mx-auto flex flex-col items-center w-full px-4">
        {/* Slogan */}
        <p className="font-body text-base sm:text-xl md:text-2xl text-slate-900 dark:text-slate-200 leading-relaxed mb-4 font-black">
          {subtext || "Bersatu • Berkarya • Untuk Masyarakat Sandy Shores"}
        </p>

        {/* Lencana Verifikasi Surat Izin Operasional Pemerintah */}
        <button
          type="button"
          onClick={onOpenPermit}
          className="group inline-flex items-center gap-3 px-4 py-2.5 mb-7 rounded-xl bg-[#FFFDF9] dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[3.5px_3.5px_0px_#000] hover:shadow-[1.5px_1.5px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer transition-all text-left max-w-xl w-full sm:w-auto"
          title="Klik untuk membuka dokumen Surat Izin Komunitas Resmi dari Pemerintah San Andreas"
        >
          <div className="w-10 h-10 rounded-full bg-[#171A21] border-2 border-[#8A7131] flex items-center justify-center shrink-0 p-0.5 shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/documents/san_andreas_seal.png"
              alt="Seal San Andreas"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase text-[#DC2626] dark:text-[#FACC15] tracking-wider">
                Terverifikasi Pemerintah San Andreas
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                IZIN AKTIF
              </span>
            </div>
            <div className="font-heading font-black text-xs sm:text-sm text-slate-950 dark:text-slate-100 truncate mt-0.5">
              Surat Izin Operasional No: 001/SIK-DSC/SA/X/2026
            </div>
            <div className="text-[11px] font-mono text-slate-500 break-words sm:whitespace-nowrap">
              Sekretariat Koordinat 1012 • Penanggung Jawab: Evan Wongso
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-mono font-black text-[#DC2626] dark:text-[#FACC15] shrink-0 pl-2 border-l border-black/15 dark:border-white/15">
            <span>Lihat Izin</span>
            <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* Tombol Aksi Taktil (Kuning, Merah, & Dokumentasi) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <a
            href="#about"
            className="btn bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black"
          >
            <BookOpen size={17} className="text-[#DC2626]" />
            <span>Visi &amp; Profil</span>
          </a>

          <a
            href="#program"
            className="btn btn-red border-2 border-black shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black"
          >
            <Sparkles size={17} className="text-[#FACC15]" />
            <span>Program Warga</span>
          </a>

          <a
            href="#/struktur"
            onClick={(e) => {
              if (onNavigateToStructure) {
                e.preventDefault();
                onNavigateToStructure();
              }
            }}
            className="btn bg-white dark:bg-[#1E222D] hover:bg-slate-100 dark:hover:bg-[#252A38] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black cursor-pointer"
          >
            <Users size={17} className="text-[#DC2626] dark:text-[#FACC15]" />
            <span>Susunan Pengurus</span>
          </a>

          <a
            href="#/dokumentasi"
            onClick={(e) => {
              if (onNavigateToGallery) {
                e.preventDefault();
                onNavigateToGallery();
              }
            }}
            className="btn btn-secondary border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <Camera size={17} className="text-[#DC2626] dark:text-[#FACC15]" />
            <span>Dokumentasi Kegiatan</span>
          </a>
        </div>
      </div>
    </section>
  );
}
