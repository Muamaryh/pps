import React from "react";
import {
  Shield,
  ArrowUp,
  ExternalLink,
  Lock,
  MapPin,
  Store,
  UserPlus,
  Users,
  FileText,
  Camera,
  Compass,
} from "lucide-react";

export default function Footer({
  brand,
  onOpenServicePortal,
  onOpenRegister,
  onOpenMembersDirectory,
  onOpenAdmin,
}) {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="mt-14 sm:mt-20 bg-[var(--card-bg)] text-xs text-slate-700 dark:text-slate-300 font-heading border-t-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[0_-6px_0px_#000000] overflow-hidden transition-colors">
      {/* Top Banner inside Footer */}
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto pt-10 pb-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b-2 border-black/10 dark:border-white/10">
          
          {/* Column 1: Organization Identity & Mission (Span 5) */}
          <div className="lg:col-span-5 flex flex-col items-start gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#161820] border-2 border-black dark:border-[#475569] flex items-center justify-center p-1 shrink-0 shadow-[3px_3px_0px_#000]">
                <img
                  src="/logo.png"
                  alt="Logo LSM Paguyuban Pizza Sandy Shores"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="leading-tight">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] block">
                  LEMBAGA SWADAYA MASYARAKAT
                </span>
                <h3 className="font-heading font-black text-sm sm:text-base text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                  {brand || "PAGUYUBAN PIZZA SANDY SHORES"}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-body font-medium max-w-md">
              Wadah persatuan, advokasi aspirasi warga, pembinaan stan & lapak UMKM mandiri, serta aksi kepedulian sosial di wilayah Sandy Shores dan sekitarnya.
            </p>

            {/* Jurisdiction Badge */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFFDF9] dark:bg-[#1F222C] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] text-[11px] font-bold text-slate-900 dark:text-slate-100">
                <MapPin size={13} className="text-[#DC2626]" />
                <span>Sandy Shores, Blaine County</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-600 font-bold text-[10px] shadow-[2px_2px_0px_#000]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>SERVER IME ROLEPLAY</span>
              </div>
            </div>
          </div>

          {/* Column 2: Navigasi Cepat (Span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] border-b-2 border-black/10 dark:border-white/10 pb-1.5 flex items-center gap-1.5">
              <Compass size={14} />
              <span>Navigasi</span>
            </h4>
            <ul className="space-y-1.5 text-xs font-bold">
              <li>
                <a
                  href="#home"
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300"
                >
                  Beranda Utama
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300"
                >
                  Profil & Visi Misi
                </a>
              </li>
              <li>
                <a
                  href="#structure"
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300"
                >
                  Struktur Pengurus
                </a>
              </li>
              <li>
                <a
                  href="#gallery"
                  className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-block transition-transform text-slate-700 dark:text-slate-300"
                >
                  Galeri Dokumentasi
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Layanan Publik & Warga (Span 3) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] border-b-2 border-black/10 dark:border-white/10 pb-1.5 flex items-center gap-1.5">
              <Store size={14} />
              <span>Layanan Warga</span>
            </h4>
            <ul className="space-y-2 text-xs font-bold">
              {onOpenRegister && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-transform"
                  >
                    <UserPlus size={13} className="text-[#FACC15] shrink-0" />
                    <span>Pendaftaran Anggota Resmi</span>
                  </button>
                </li>
              )}
              {onOpenMembersDirectory && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenMembersDirectory}
                    className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-transform"
                  >
                    <Users size={13} className="text-[#DC2626] shrink-0" />
                    <span>Direktori Publik Anggota</span>
                  </button>
                </li>
              )}
              {onOpenServicePortal && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenServicePortal("lapak")}
                      className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-transform"
                    >
                      <Store size={13} className="text-emerald-600 shrink-0" />
                      <span>Pendaftaran Lapak UMKM</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenServicePortal("meeting")}
                      className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-transform"
                    >
                      <FileText size={13} className="text-sky-600 shrink-0" />
                      <span>Request Meeting / Audiensi</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenServicePortal("tracking")}
                      className="hover:text-[#DC2626] dark:hover:text-[#FACC15] hover:translate-x-1 inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-transform"
                    >
                      <Shield size={13} className="text-amber-500 shrink-0" />
                      <span>Lacak Status Tiket Pengajuan</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 4: Koordinasi & Akses Pengurus (Span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] border-b-2 border-black/10 dark:border-white/10 pb-1.5 flex items-center gap-1.5">
              <Shield size={14} />
              <span>Komunitas & CMS</span>
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://discord.gg/2wpeukyDdu"
                target="_blank"
                rel="noopener noreferrer"
                className="btn py-1.5 px-3 bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-black shadow-[2px_2px_0px_#000] text-[11px] font-black flex items-center justify-between"
              >
                <span>Discord Resmi PPS</span>
                <ExternalLink size={12} />
              </a>

              <a
                href="https://discord.gg/duZhRpJEWY"
                target="_blank"
                rel="noopener noreferrer"
                className="btn py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E212B] dark:hover:bg-[#2A2E3D] text-slate-900 dark:text-slate-100 border-2 border-black shadow-[2px_2px_0px_#000] text-[11px] font-bold flex items-center justify-between"
              >
                <span>Visitor Sandy Shores</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Tech Badge & Back to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 dark:text-slate-400 font-bold">
          <p className="text-center sm:text-left text-[11px]">
            &copy; 2026{" "}
            <span className="font-black text-slate-950 dark:text-slate-100">
              {brand || "LSM Paguyuban Pizza Sandy Shores"}
            </span>
            . Seluruh aset, naskah manifesto, dan sistem pendaftaran dilindungi.
          </p>

          <div className="flex items-center gap-3">
            <div className="badge-brutal text-[10px] py-1 px-2.5 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
              <Shield size={12} className="text-[#DC2626]" />
              <span>Portal Terverifikasi PPS</span>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              className="btn btn-secondary text-[11px] py-1 px-2.5 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1 cursor-pointer active:translate-y-0.5"
              title="Kembali ke atas halaman"
            >
              <ArrowUp size={12} />
              <span>Atas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Yellow & Red Dual Bottom Strip */}
      <div className="w-full flex h-2">
        <div className="flex-1 bg-[#FACC15]" />
        <div className="w-24 sm:w-36 bg-[#DC2626]" />
      </div>
    </footer>
  );
}
