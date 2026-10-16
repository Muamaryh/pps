import React, { useState, useEffect } from "react";
import { BookOpen, Users, Camera, MapPin, Store, HeartHandshake, ShieldCheck } from "lucide-react";

export default function Hero({ heading: _heading, subtext, heroPillars }) {
  // Typewriter effect state (3 distinct lines)
  const targetLine1 = "LEMBAGA SWADAYA MASYARAKAT";
  const targetLine2 = "PAGUYUBAN PIZZA";
  const targetLine3 = "SANDY SHORES";

  const defaultHeroPillars = [
    { label: "Wilayah Kerja", title: "Sandy Shores & Sekitarnya" },
    { label: "Pemberdayaan UMKM", title: "Pengelolaan Lapak Warga" },
    { label: "Solidaritas Sosial", title: "Aksi Gotong Royong Warga" },
    { label: "Advokasi Aspirasi", title: "Mitra Dialog Pemerintah Kota" }
  ];

  const pillarMeta = [
    { icon: MapPin, bg: "bg-[#FACC15] text-[#111827]", iconColor: "text-[#DC2626]" },
    { icon: Store, bg: "bg-[#DC2626] text-white", iconColor: "text-[#FACC15]" },
    { icon: HeartHandshake, bg: "bg-[#FACC15] text-[#111827]", iconColor: "text-[#DC2626]" },
    { icon: ShieldCheck, bg: "bg-[#DC2626] text-white", iconColor: "text-[#FACC15]" },
  ];

  const activePillars = heroPillars && heroPillars.length === 4 ? heroPillars : defaultHeroPillars;

  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [text3, setText3] = useState("");
  const [step, setStep] = useState(0); // 0 = logo arrival animation, 1 = line 1, 2 = line 2, 3 = line 3, 4 = completed

  useEffect(() => {
    let timeout;
    if (step === 0) {
      // Tunggu animasi kedatangan logo mendarat mantap (~450ms) baru mulai ketik baris 1
      timeout = setTimeout(() => {
        setStep(1);
      }, 450);
    } else if (step === 1) {
      if (text1.length < targetLine1.length) {
        timeout = setTimeout(() => {
          setText1(targetLine1.slice(0, text1.length + 1));
        }, 35);
      } else {
        timeout = setTimeout(() => {
          setStep(2);
        }, 180);
      }
    } else if (step === 2) {
      if (text2.length < targetLine2.length) {
        timeout = setTimeout(() => {
          setText2(targetLine2.slice(0, text2.length + 1));
        }, 40);
      } else {
        timeout = setTimeout(() => {
          setStep(3);
        }, 180);
      }
    } else if (step === 3) {
      if (text3.length < targetLine3.length) {
        timeout = setTimeout(() => {
          setText3(targetLine3.slice(0, text3.length + 1));
        }, 45);
      } else {
        timeout = setTimeout(() => {
          setStep(4);
        }, 300);
      }
    }
    return () => clearTimeout(timeout);
  }, [text1, text2, text3, step]);

  return (
    <section id="home" className="pt-2 pb-10 sm:pb-14 w-full scroll-mt-24">
      {/* 1. Box Gambar pps.jpg (Ukuran Menyesuaikan Gambar, Teks di Depan Gambar dengan Efek Typing 3 Baris) */}
      <div className="w-full relative rounded-lg overflow-hidden border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] aspect-[1840/855] min-h-[280px] sm:min-h-[400px] md:min-h-[500px] flex items-center justify-center p-4 sm:p-8 text-center group">
        {/* Gambar pps.jpg sebagai latar belakang (atur tingkat blur pada class `blur-[1px]` di bawah) */}
        <img
          src="/pps.jpg"
          alt="LSM Paguyuban Pizza Sandy Shores"
          className="absolute inset-0 w-full h-full object-cover object-center scale-102 filter blur-[0px] group-hover:scale-105 transition-all duration-500"
        />

        {/* Lapisan solid gelap agar teks putih, kuning, & merah sangat tajam terbaca di kedua mode tanpa gradasi */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Kalimat Utama Berada Tepat di Depan pps.jpg dengan Logo & Efek Typing 3 Baris Rapi */}
        <div className="relative z-10 max-w-5xl px-3 sm:px-6 py-4 flex flex-col items-center justify-center">
          {/* Logo PPS di atas Judul Banner dengan Animasi Kedatangan */}
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

      {/* 2. Seluruh Konten Lainnya Dipindahkan ke Luar / di Bawah Box Gambar */}
      <div className="mt-8 text-center max-w-4xl mx-auto flex flex-col items-center w-full px-4">
        {/* Slogan */}
        <p className="font-body text-base sm:text-xl md:text-2xl text-slate-900 dark:text-slate-100 leading-relaxed mb-6 font-black">
          {subtext || "Bersatu • Berkarya • Untuk Masyarakat Sandy Shores"}
        </p>

        {/* Tombol Aksi Taktil (Kuning & Merah) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <a
            href="#about"
            className="btn bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black"
          >
            <BookOpen size={17} className="text-[#DC2626]" />
            <span>Visi & Profil</span>
          </a>

          <a
            href="#structure"
            className="btn btn-red border-2 border-black shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black"
          >
            <Users size={17} className="text-[#FACC15]" />
            <span>Susunan Pengurus</span>
          </a>

          <a
            href="#gallery"
            className="btn btn-secondary border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] px-5 py-2.5 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100"
          >
            <Camera size={17} className="text-[#DC2626] dark:text-[#FACC15]" />
            <span>Dokumentasi Kegiatan</span>
          </a>
        </div>
      </div>

      {/* 3. 4 Pilar Fokus Lapangan (Dinamis dari Admin Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
        {activePillars.map((pilar, idx) => {
          const meta = pillarMeta[idx % pillarMeta.length];
          const Icon = meta.icon;
          return (
            <div
              key={idx}
              className="card-brutal p-5 bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000000] flex items-start gap-3.5"
            >
              <div className={`w-10 h-10 rounded ${meta.bg} border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0`}>
                <Icon size={20} className={meta.iconColor} />
              </div>
              <div>
                <div className="card-label text-[11px] mb-1 text-slate-700 dark:text-slate-300">
                  {pilar.label}
                </div>
                <div className="font-heading font-black text-sm sm:text-base text-slate-950 dark:text-slate-100">
                  {pilar.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
