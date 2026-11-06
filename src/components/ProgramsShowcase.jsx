import React from "react";
import {
  HeartPulse,
  Store,
  HandHeart,
  MessageSquareText,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export default function ProgramsShowcase({
  onOpenTransparency,
  onOpenServicePortal,
  onOpenBansos,
}) {
  const programs = [
    {
      id: "jasra",
      title: "Subsidi Kesehatan JASRA Medis",
      category: "Kesehatan Warga",
      badge: "SUBSIDI AKTIF",
      badgeColor: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700",
      icon: HeartPulse,
      iconBg: "bg-[#DC2626] text-white",
      desc: "Distribusi voucher subsidi biaya pengobatan medis (Treatment & Pemulihan Pingsan) bekerjasama dengan klinik/rumah sakit untuk meringankan beban warga dan anggota.",
      highlights: [
        "Voucher Treatment Medis Resmi",
        "Voucher Pemulihan Rawat Pingsan",
        "Rekapitulasi Riwayat Transparan",
      ],
      ctaText: "Lihat Transparansi Jasra",
      action: () => onOpenTransparency && onOpenTransparency("jasra"),
      accentBorder: "hover:border-[#DC2626]",
    },
    {
      id: "umkm",
      title: "Pemberdayaan Lapak UMKM Warga",
      category: "Ekonomi Mandiri",
      badge: "PENDAFTARAN TERBUKA",
      badgeColor: "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-700",
      icon: Store,
      iconBg: "bg-[#FACC15] text-[#111827]",
      desc: "Fasilitasi titik stand dagang dan lapak usaha berizin resmi di kawasan strategis Sandy Shores. Menjamin pedagang warga lokal beroperasi secara aman, tertib, dan bebas pungli.",
      highlights: [
        "Pengurusan Stand Berizin Resmi",
        "Bebas Pungutan Liar & Tertib",
        "Dukungan Promosi Usaha Warga",
      ],
      ctaText: "Daftar Lapak UMKM",
      action: () => onOpenServicePortal && onOpenServicePortal("lapak"),
      accentBorder: "hover:border-[#FACC15]",
    },
    {
      id: "bansos",
      title: "Bantuan Sosial Warga (Bansos)",
      category: "Solidaritas Lapangan",
      badge: "KEMASYARAKATAN",
      badgeColor: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-400 dark:border-blue-700",
      icon: HandHeart,
      iconBg: "bg-[#DC2626] text-white",
      desc: "Penyaluran logistik bahan pokok, sembako, dan bantuan pangan gotong royong bagi warga pra-sejahtera serta masyarakat kawasan pesisir Sandy Shores yang membutuhkan.",
      highlights: [
        "Bantuan Paket Pangan Pokok",
        "Prioritas Warga Prasejahtera",
        "Pencatatan Penyaluran Terbuka",
      ],
      ctaText: "Informasi & Pengajuan Bansos",
      action: () => onOpenBansos && onOpenBansos(),
      accentBorder: "hover:border-[#DC2626]",
    },
    {
      id: "advokasi",
      title: "Audiensi Aspirasi & Aduan Warga",
      category: "Advokasi Kebijakan",
      badge: "MITRA PEMERINTAH",
      badgeColor: "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-400 dark:border-purple-700",
      icon: MessageSquareText,
      iconBg: "bg-[#FACC15] text-[#111827]",
      desc: "Jembatan komunikasi terbuka bagi warga Sandy Shores untuk menyampaikan aduan fasilitas umum, usulan kemasyarakatan, maupun permohonan audiensi langsung dengan pengurus.",
      highlights: [
        "Penyaluran Suara ke Otoritas Kota",
        "Audiensi Tatap Muka Resmi",
        "Pendampingan Masalah Warga",
      ],
      ctaText: "Ajukan Audiensi / Pertemuan",
      action: () => onOpenServicePortal && onOpenServicePortal("meeting"),
      accentBorder: "hover:border-[#FACC15]",
    },
  ];

  return (
    <section id="program" className="py-10 sm:py-14 w-full scroll-mt-24">
      {/* Title Bar */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-black/20 dark:border-white/10 flex-wrap">
        <div>
          <div className="card-label mb-1">
            PELAYANAN NYATA WARGA
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Program &amp; Layanan Unggulan
          </h2>
        </div>
        <div className="badge-brutal badge-red font-black">
          4 PILAR AKSI
        </div>
      </div>

      {/* Program Grid (2x2 Balanced Spacious Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {programs.map((prog) => {
          const Icon = prog.icon;
          return (
            <div
              key={prog.id}
              className="card-brutal p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 group hover:border-[#FACC15]/60"
            >
              <div>
                {/* Header: Icon & Category Badges */}
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl ${prog.iconBg} border border-black/10 dark:border-white/15 shadow-sm dark:shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block">
                        {prog.category}
                      </span>
                      <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white group-hover:text-[#DC2626] dark:group-hover:text-[#FACC15] transition-colors leading-snug">
                        {prog.title}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-md border shadow-sm ${prog.badgeColor}`}
                  >
                    {prog.badge}
                  </span>
                </div>

                {/* Deskripsi Program */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-5">
                  {prog.desc}
                </p>

                {/* Key Highlights Checklist */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-black/[0.03] dark:bg-[#07080E]/60 border border-black/20 dark:border-white/10 mb-5">
                  <ul className="space-y-2">
                    {prog.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <CheckCircle2
                          size={15}
                          className="shrink-0 text-emerald-600 dark:text-emerald-400"
                        />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={prog.action}
                  className="btn btn-secondary w-full py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer group hover:border-[#FACC15]/60"
                >
                  <span>{prog.ctaText}</span>
                  <ArrowRight
                    size={15}
                    className="group-hover:translate-x-1 transition-transform text-[#DC2626] dark:text-[#FACC15]"
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
