import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  UserPlus,
  CreditCard,
  Phone,
  Calendar,
  ShieldCheck,
  FileText,
  Eye,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { subscribeMembersCloud } from "../services/memberService";

export default function MembersDirectoryModal({
  isOpen,
  onClose,
  onOpenRegister,
}) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewKtp, setPreviewKtp] = useState(null); // { image, name, citizenId }

  // Subscribe to real-time Cloud Database
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const unsub = subscribeMembersCloud(
      (list) => {
        setMembers(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Gagal memuat direktori anggota:", err);
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter members based on search query
  const q = searchQuery.trim().toLowerCase();
  const filteredMembers = members.filter((m) => {
    if (!q) return true;
    const name = (m.fullName || "").toLowerCase();
    const ic = (m.icNumber || "").toLowerCase();
    const phone = (m.phone || "").toLowerCase();
    return name.includes(q) || ic.includes(q) || phone.includes(q);
  });

  return (
    <>
      <div
        className="fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-5xl max-h-[92vh] rounded-xl border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] bg-[var(--card-bg)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1F222C]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-[#161820] border-2 border-black dark:border-[#475569] flex items-center justify-center shrink-0 p-1 shadow-[2px_2px_0px_#000]">
                <img
                  src="/logo.png"
                  alt="Logo LSM PPS"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15]">
                    DIREKTORI PUBLIK • LSM PPS
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    LIVE CLOUD
                  </span>
                </div>
                <h3 className="font-heading font-black text-sm sm:text-base md:text-lg text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                  Daftar Anggota Resmi Paguyuban Sandy Shores
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-[var(--card-bg)] text-slate-900 dark:text-slate-200 flex items-center justify-center font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-transform cursor-pointer"
              title="Tutup Direktori"
            >
              <X size={16} />
            </button>
          </div>

          {/* Subheader Toolbar & Stats */}
          <div className="p-3.5 sm:p-5 bg-amber-50/60 dark:bg-[#171922] border-b-2 border-black/15 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Total Members Pill */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-lg bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center gap-2 font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                <Users size={16} />
                <span>
                  {isLoading ? "Memuat..." : `${members.length} Anggota Terdaftar`}
                </span>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 hidden md:inline">
                Tersinkronisasi otomatis dari cloud database resmi PAPS.
              </span>
            </div>

            {/* Quick Action: Daftar Baru */}
            {onOpenRegister && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="btn py-2 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[2.5px_2.5px_0px_#000] font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all shrink-0"
                title="Daftar Menjadi Anggota LSM PPS Baru"
              >
                <UserPlus size={14} />
                <span>+ Daftar Anggota Baru</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="px-4 sm:px-6 pt-4 pb-2">
            <div className="relative w-full">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Cari nama IC, Citizen ID / No KTP, atau No HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
              <span>
                Menampilkan <strong>{filteredMembers.length}</strong> dari{" "}
                <strong>{members.length}</strong> anggota resmi
              </span>
              {searchQuery && (
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  Hasil filter: "{searchQuery}"
                </span>
              )}
            </div>
          </div>

          {/* Member Cards Grid */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-slate-100 dark:bg-[#161820] border-2 border-black/20 h-40"
                  />
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-black dark:border-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-3 shadow-[2px_2px_0px_#000]">
                  <Search size={24} />
                </div>
                <h4 className="font-heading font-black text-base uppercase text-slate-800 dark:text-slate-200">
                  Anggota Tidak Ditemukan
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Tidak ada data anggota dengan kata kunci "<strong>{searchQuery}</strong>". Silakan periksa ejaan nama atau Citizen ID Anda.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="btn text-xs py-1.5 px-4 bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-200 border-2 border-black shadow-[2px_2px_0px_#000] font-bold cursor-pointer"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="card-brutal p-3.5 bg-white dark:bg-[#1A1D27] border-[2.5px] border-black dark:border-[#475569] shadow-[3.5px_3.5px_0px_#000] flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                  >
                    <div>
                      {/* Top: Avatar & Name */}
                      <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b border-black/10 dark:border-white/10">
                        <div className="w-12 h-12 rounded-full border-2 border-black dark:border-[#475569] overflow-hidden bg-slate-100 dark:bg-[#14161F] shrink-0 shadow-sm flex items-center justify-center">
                          {member.profilePhoto ? (
                            <img
                              src={member.profilePhoto}
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users size={20} className="text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className="font-heading font-black text-xs sm:text-sm text-slate-950 dark:text-slate-100 uppercase truncate"
                              title={member.fullName}
                            >
                              {member.fullName || "Nama Tidak Tertera"}
                            </h4>
                            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-500 shrink-0">
                              RESMI
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block truncate">
                            Terdaftar: {member.regDate || (member.createdAt ? new Date(member.createdAt).toLocaleDateString("id-ID") : "-")}
                          </span>
                        </div>
                      </div>

                      {/* Details Info: Citizen ID & Phone */}
                      <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-[#14161F] border border-black/10 dark:border-white/10 font-mono mb-2.5">
                        <div>
                          <span className="text-[9px] text-slate-400 font-sans font-bold block">
                            CITIZEN ID / KTP:
                          </span>
                          <strong
                            className="text-[#DC2626] dark:text-[#FACC15] truncate block text-[11px]"
                            title={member.icNumber}
                          >
                            {member.icNumber || "-"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-sans font-bold block">
                            NO TLP / WA:
                          </span>
                          <span
                            className="text-slate-800 dark:text-slate-200 truncate block text-[11px]"
                            title={member.phone}
                          >
                            {member.phone || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: Preview KTP Document */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                      {member.icPhoto ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewKtp({
                              image: member.icPhoto,
                              name: member.fullName || "Anggota",
                              citizenId: member.icNumber || "",
                            })
                          }
                          className="btn text-[11px] py-1 px-2.5 bg-[#FACC15] hover:bg-yellow-400 text-slate-900 font-black border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                          title="Lihat dokumen KTP IC"
                        >
                          <FileText size={12} className="text-[#DC2626]" />
                          <span>Lihat KTP</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Tanpa Dokumen KTP
                        </span>
                      )}

                      {member.profilePhoto && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewKtp({
                              image: member.profilePhoto,
                              name: `${member.fullName || "Anggota"} (Foto Profil)`,
                              citizenId: member.icNumber || "",
                            })
                          }
                          className="btn text-[11px] py-1 px-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-black dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                          title="Lihat foto profil resolusi penuh"
                        >
                          <Eye size={12} />
                          <span>Foto Profil</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-4 sm:px-6 py-3 border-t-2 border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1F222C] flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] hidden sm:inline">
              LSM Paguyuban Pizza Sandy Shores • Data Publik
            </span>
            <button
              type="button"
              onClick={onClose}
              className="btn py-1.5 px-5 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] font-heading font-black uppercase text-xs cursor-pointer ml-auto"
            >
              Tutup Direktori
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Preview KTP Dialog */}
      {previewKtp && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewKtp(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl bg-[var(--card-bg)] border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 border-black/15">
              <div>
                <h4 className="font-heading font-black text-sm uppercase text-slate-900 dark:text-slate-100">
                  {previewKtp.name}
                </h4>
                {previewKtp.citizenId && (
                  <span className="text-xs font-mono font-bold text-[#DC2626] dark:text-[#FACC15]">
                    Citizen ID: {previewKtp.citizenId}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewKtp(null)}
                className="w-7 h-7 rounded border border-black flex items-center justify-center font-bold bg-slate-100 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-hidden rounded border-2 border-black flex items-center justify-center bg-black">
              <img
                src={previewKtp.image}
                alt={previewKtp.name}
                className="w-full h-full object-contain max-h-[70vh]"
              />
            </div>

            <button
              type="button"
              onClick={() => setPreviewKtp(null)}
              className="btn py-2 bg-[#FACC15] text-[#111827] border-2 border-black font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000]"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </>
  );
}
