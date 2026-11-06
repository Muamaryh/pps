import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Gift,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Fuel,
  Utensils,
  DollarSign,
  Copy,
  Check,
  Loader2,
  User,
  CreditCard,
  Sparkles,
  ScanLine,
  HelpCircle,
  Eye,
  Package,
  ShoppingBag,
  Wheat,
  Clock,
  Users,
  Search,
  Lock,
} from "lucide-react";
import { scanKtpImage } from "../utils/ktpOcr";
import {
  submitBansosClaimCloud,
  subscribeBansosClaimsCloud,
  DEFAULT_BANSOS_PROGRAM,
} from "../services/bansosService";
import BrutalistSelect from "./BrutalistSelect";

function getBansosIcon(iconName) {
  switch (String(iconName || "").toLowerCase()) {
    case "fuel":
    case "bensin":
      return Fuel;
    case "utensils":
    case "makanan":
      return Utensils;
    case "dollarsign":
    case "uang":
      return DollarSign;
    case "wheat":
    case "bibit":
      return Wheat;
    case "shoppingbag":
    case "sembako":
      return ShoppingBag;
    case "package":
      return Package;
    case "sparkles":
      return Sparkles;
    default:
      return Gift;
  }
}

const SEX_OPTIONS = [
  { value: "Laki-laki", label: "Laki-laki (Male)", subtext: "Sesuai identitas KTP IC" },
  { value: "Perempuan", label: "Perempuan (Female)", subtext: "Sesuai identitas KTP IC" },
];

export default function BansosModal({
  isOpen,
  onClose,
  onShowToast,
  activeProgram,
  bansosPrograms = [],
}) {
  const activePrograms = (bansosPrograms || []).filter((p) => p.status === "ACTIVE");
  const isBansosClosed = activePrograms.length === 0;
  const availablePrograms = activePrograms;

  const [selectedProgramId, setSelectedProgramId] = useState(() => {
    if (activeProgram && activeProgram.status === "ACTIVE") return activeProgram.id;
    return activePrograms[0]?.id || "";
  });

  useEffect(() => {
    if (activeProgram && activeProgram.status === "ACTIVE") {
      setSelectedProgramId(activeProgram.id);
    } else if (activePrograms.length > 0 && !activePrograms.some((p) => p.id === selectedProgramId)) {
      setSelectedProgramId(activePrograms[0].id);
    }
  }, [activeProgram, activePrograms, selectedProgramId]);

  const selectedProgram =
    activePrograms.find((p) => p.id === selectedProgramId) ||
    activePrograms[0] ||
    bansosPrograms.find((p) => p.id === selectedProgramId) ||
    bansosPrograms[0] ||
    DEFAULT_BANSOS_PROGRAM;

  // View Tab State ("form" = Formulir Pengajuan, "recipients" = Transparansi Daftar Penerima)
  const [activeTab, setActiveTab] = useState("form");
  const [claimsList, setClaimsList] = useState([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("ALL"); // "ALL" | "CLAIMED" | "PENDING"
  const [recipientProgramFilter, setRecipientProgramFilter] = useState("ALL");

  // Real-time subscription to bansos claims list
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingClaims(true);
    const unsub = subscribeBansosClaimsCloud(
      (list) => {
        setClaimsList(Array.isArray(list) ? list : []);
        setIsLoadingClaims(false);
      },
      (err) => {
        console.error("Gagal memuat transparansi penerima bansos:", err);
        setIsLoadingClaims(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [isOpen]);

  const totalClaims = claimsList.length;
  const claimedCount = claimsList.filter((c) => c.claimed).length;
  const pendingCount = totalClaims - claimedCount;

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    return claimsList.filter((c) => {
      if (recipientProgramFilter !== "ALL" && c.programId !== recipientProgramFilter) return false;
      if (recipientFilter === "CLAIMED" && !c.claimed) return false;
      if (recipientFilter === "PENDING" && c.claimed) return false;
      if (!q) return true;
      const name = (c.fullName || "").toLowerCase();
      const cid = (c.citizenId || "").toLowerCase();
      const code = (c.claimCode || "").toLowerCase();
      const prog = (c.programTitle || "").toLowerCase();
      const items = Array.isArray(c.packageItems) ? c.packageItems.join(" ").toLowerCase() : "";
      return name.includes(q) || cid.includes(q) || code.includes(q) || prog.includes(q) || items.includes(q);
    });
  }, [claimsList, recipientSearch, recipientFilter, recipientProgramFilter]);

  // Form State
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrSuccess, setOcrSuccess] = useState(null);
  const [showSampleKtp, setShowSampleKtp] = useState(false);

  // Exact 3 fields requested by user (same as member registration + sex)
  const [fullName, setFullName] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [sex, setSex] = useState("Laki-laki");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [issuedClaim, setIssuedClaim] = useState(null); // When claim is successful
  const [copiedCode, setCopiedCode] = useState(false);

  const fileInputRef = useRef(null);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        handleModalClose();
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
  }, [isOpen]);

  function handleModalClose() {
    setErrorMessage("");
    if (typeof onClose === "function") {
      onClose();
    }
  }

  // Handle KTP Upload + Auto-Scan OCR (Identical pattern to MemberRegistrationModal)
  function handleKtpUploadWithOcr(file) {
    if (!file) return;

    setErrorMessage("");
    setOcrSuccess(null);

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran foto maksimal 10 MB. Silakan pilih foto dengan resolusi lebih ringan.");
      return;
    }

    // 1. Generate compressed base64 preview for display & cloud doc storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 650;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // Ultra-lightweight 20KB compression for zero cloud storage bloat
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
        setScreenshotPreview(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // 2. Run OCR scan on original raw file for 100% recognition accuracy
    setIsScanningOcr(true);
    setScanProgress(0);

    scanKtpImage(file, (prog) => {
      setScanProgress(prog);
    })
      .then((scanResult) => {
        setIsScanningOcr(false);
        if (scanResult && scanResult.success) {
          const fields = scanResult.fields || scanResult.parsed || {};
          const { firstName, lastName, citizenId: detectedCid, fullName: detectedFullName, sex: detectedSex } = fields;

          const scannedFullName = (
            detectedFullName || [firstName, lastName].filter(Boolean).join(" ")
          )
            .trim()
            .toUpperCase();

          if (scannedFullName) {
            setFullName(scannedFullName);
          }
          if (detectedCid) {
            setCitizenId(detectedCid.toUpperCase());
          }
          if (detectedSex) {
            setSex(
              /female|perempuan|wanita|\bf\b/i.test(detectedSex) ? "Perempuan" : "Laki-laki"
            );
          }

          if (scannedFullName && detectedCid) {
            setOcrSuccess(true);
            setErrorMessage("");
            if (typeof onShowToast === "function") {
              onShowToast(
                `KTP berhasil dipindai! Nama: ${scannedFullName} • CID: ${detectedCid}`,
                "success"
              );
            }
          } else if (scannedFullName || detectedCid) {
            setOcrSuccess(true);
            setErrorMessage("");
            if (typeof onShowToast === "function") {
              onShowToast(
                `KTP terdeteksi: ${scannedFullName ? `Nama: ${scannedFullName}` : ""} ${detectedCid ? `• CID: ${detectedCid}` : ""}. Silakan periksa kelengkapan form.`,
                "info"
              );
            }
          } else {
            setOcrSuccess(false);
            setErrorMessage("");
            if (typeof onShowToast === "function") {
              onShowToast(
                "Foto KTP tersimpan. Silakan lengkapi Nama Lengkap & Citizen ID di bawah.",
                "info"
              );
            }
          }
        } else {
          setOcrSuccess(false);
          setErrorMessage("");
          if (typeof onShowToast === "function") {
            onShowToast(
              "Foto KTP tersimpan. Silakan isi data formulir secara manual.",
              "info"
            );
          }
        }
      })
      .catch((err) => {
        console.error("Gagal OCR KTP Bansos:", err);
        setIsScanningOcr(false);
        setOcrSuccess(false);
        setErrorMessage("");
        if (typeof onShowToast === "function") {
          onShowToast("Foto KTP tersimpan. Silakan isi data secara manual.", "info");
        }
      });
  }

  // Handle Submit Claim
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");

    if (isBansosClosed || !selectedProgram || selectedProgram.status !== "ACTIVE") {
      setErrorMessage("Pendaftaran bantuan sosial saat ini sedang ditutup atau dinonaktifkan oleh pengurus.");
      return;
    }

    if (!screenshotPreview) {
      setErrorMessage("Wajib mengunggah foto atau tangkapan layar KTP IC.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Nama Lengkap IC wajib diisi.");
      return;
    }

    if (!citizenId.trim()) {
      setErrorMessage("Citizen ID (CID) wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitBansosClaimCloud({
        fullName: fullName.trim().toUpperCase(),
        citizenId: citizenId.trim().toUpperCase(),
        sex,
        screenshotUrl: screenshotPreview,
        programId: selectedProgram.id,
        programTitle: selectedProgram.title,
        packageItems: Array.isArray(selectedProgram.items)
          ? selectedProgram.items.map((i) => i.name)
          : ["1 Paket Makanan", "Uang Tunai $2.500 USD"],
        cashAmount: selectedProgram.totalCash ?? 2500,
      });

      setIssuedClaim(result);
      setIsSubmitting(false);

      if (typeof onShowToast === "function") {
        onShowToast(`Klaim Bansos berhasil! Kode Kupon: ${result.claimCode}`, "success");
      }
    } catch (err) {
      setIsSubmitting(false);
      if (err.code === "ALREADY_CLAIMED") {
        setErrorMessage(err.message);
        if (typeof onShowToast === "function") {
          onShowToast(err.message, "error");
        }
      } else {
        setErrorMessage(err.message || "Terjadi kesalahan saat memproses klaim bansos. Silakan coba lagi.");
        if (typeof onShowToast === "function") {
          onShowToast("Gagal memproses klaim bansos.", "error");
        }
      }
    }
  }

  // Copy Coupon Code
  function handleCopyCode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    if (typeof onShowToast === "function") {
      onShowToast("Kode kupon berhasil disalin ke clipboard.", "info");
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bansos-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div className="relative w-full max-w-4xl bg-[#FFFDF9] dark:bg-[#161822] border border-black/20 dark:border-white/15 shadow-2xl text-slate-900 dark:text-slate-100 my-auto rounded-2xl overflow-hidden transition-all">
        {/* Top Header Banner */}
        <div className="bg-[#FACC15] text-[#111827] border-b border-black/20 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-[#FACC15] flex items-center justify-center font-black border border-black/20 shadow-sm">
              <Gift size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-black/70 block">
                {selectedProgram.tagline || "LSM Paguyuban Pizza Sandy Shores"}
              </span>
              <h2 id="bansos-modal-title" className="font-heading font-black text-base sm:text-lg leading-tight uppercase">
                {selectedProgram.title || "Bantuan Sosial Warga (Bansos)"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            aria-label="Tutup Formulir Bansos"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-red-500/80 shadow-sm cursor-pointer active:scale-95 transition-all"
            title="Tutup (Esc)"
          >
            <X size={18} className="stroke-[3]" />
          </button>
        </div>

        {/* Navigation Tabs (Formulir Klaim vs Transparansi Penerima Bansos) */}
        <div className="flex items-center border-b-2 border-black bg-slate-100 dark:bg-[#1C1F2B] px-4 sm:px-6 pt-2.5 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`py-2 px-3 sm:px-4 text-xs font-heading font-black uppercase border-t-2 border-x-2 border-black transition-all flex items-center gap-1.5 cursor-pointer -mb-[2px] ${
              activeTab === "form"
                ? "bg-[#FFFDF9] dark:bg-[#161822] text-slate-900 dark:text-slate-100 border-b-2 border-b-transparent shadow-xs"
                : "bg-slate-200 dark:bg-[#12141D] text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-[#191C27] border-b-2 border-black"
            }`}
          >
            <Gift size={15} className={isBansosClosed ? "text-slate-400" : "text-[#DC2626]"} />
            <span>Formulir Klaim Bansos</span>
            {isBansosClosed && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 border border-amber-400 uppercase">
                Tutup
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("recipients")}
            className={`py-2 px-3 sm:px-4 text-xs font-heading font-black uppercase border-t-2 border-x-2 border-black transition-all flex items-center gap-1.5 cursor-pointer -mb-[2px] ${
              activeTab === "recipients"
                ? "bg-[#FFFDF9] dark:bg-[#161822] text-slate-900 dark:text-slate-100 border-b-2 border-b-transparent shadow-xs"
                : "bg-slate-200 dark:bg-[#12141D] text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-[#191C27] border-b-2 border-black"
            }`}
          >
            <Users size={15} className="text-emerald-600" />
            <span>Daftar Penerima Bansos</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400">
              {claimsList.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* TAB 1: FORMULIR KLAIM BANSOS */}
          {activeTab === "form" && (
            <>
              {isBansosClosed ? (
                /* BANSOS CLOSED / INACTIVE STATE */
                <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] text-center flex flex-col items-center justify-center gap-3.5 my-2">
                  <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-black flex items-center justify-center text-amber-800 dark:text-amber-300 shadow-[2px_2px_0px_#000]">
                    <Lock size={28} />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-400 uppercase tracking-wide inline-block">
                      Status: Pendaftaran Nonaktif / Ditutup
                    </span>
                    <h3 className="font-heading font-black text-base sm:text-lg uppercase text-slate-900 dark:text-slate-100">
                      Pendaftaran Bansos Sedang Ditutup
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Saat ini belum ada program bantuan sosial yang dibuka untuk permohonan baru. Program bansos sebelumnya telah dinonaktifkan atau telah selesai disalurkan oleh Pengurus LSM Paguyuban Pizza Sandy Shores.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("recipients")}
                      className="py-2.5 px-4 rounded bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-heading font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Users size={16} />
                      <span>Lihat Transparansi Penerima Bansos ({claimsList.length})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Multiple Programs Switcher (Shown if more than 1 active program) */}
                  {availablePrograms.length > 1 && !issuedClaim && (
                    <div className="bg-amber-100/70 dark:bg-[#1E212B] border-2 border-black p-3 shadow-[2px_2px_0px_#000] flex flex-col gap-1.5">
                      <span className="text-[10px] font-heading font-black uppercase text-amber-950 dark:text-amber-300">
                        Pilih Program Bansos Yang Ingin Diajukan:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {availablePrograms.map((p) => {
                          const isSel = p.id === selectedProgramId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedProgramId(p.id)}
                              className={`px-3 py-1.5 rounded text-xs font-heading font-black uppercase border-2 border-black transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#FACC15] text-slate-950 shadow-[2px_2px_0px_#000] -translate-y-0.5"
                                  : "bg-white dark:bg-[#28251e] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              {p.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

          {/* Package Highlight Banner */}
          <div className="bg-[#FFF8E7] dark:bg-[#1f1b13] border-2 border-black dark:border-[#715413] p-4 shadow-[3px_3px_0px_#000]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-[#92400E] dark:text-[#FBBF24] tracking-wider">
                Isi Paket Bantuan Sosial Per Warga:
              </span>
              <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] uppercase">
                1 CID = 1 Klaim
              </span>
            </div>

            <div className={`grid grid-cols-1 ${
              (selectedProgram.items || []).length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"
            } gap-2.5 text-center`}>
              {(selectedProgram.items && selectedProgram.items.length > 0
                ? selectedProgram.items
                : DEFAULT_BANSOS_PROGRAM.items
              ).map((it, idx) => {
                const IconComponent = getBansosIcon(it.icon);
                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-white dark:bg-[#28251e] border-2 border-black flex flex-col items-center justify-center"
                  >
                    <IconComponent className="text-amber-600 dark:text-amber-400 mb-1" size={24} />
                    <span className="font-heading font-black text-xs sm:text-sm">{it.name}</span>
                    {it.desc && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {it.desc}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIEW: EITHER SUCCESS TICKET OR CLAIM FORM */}
          {issuedClaim ? (
                /* SUCCESS TICKET VIEW */
                <div className="border-3 border-black bg-emerald-50 dark:bg-[#06241a] p-5 shadow-[4px_4px_0px_#000] space-y-4 animate-fadeIn">
                  <div className="text-center space-y-1">
                    <div className="inline-flex p-2 bg-emerald-600 text-white rounded-full border-2 border-black shadow-[2px_2px_0px_#000] mb-1">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="font-heading font-black text-xl text-emerald-800 dark:text-emerald-300 uppercase">
                      Klaim Bansos Berhasil Diajukan!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Simpan kode kupon berikut untuk ditunjukkan kepada pengurus di Kantor LSM Sandy Shores.
                    </p>
                  </div>

                  {/* Digital Coupon Box */}
                  <div className="bg-white dark:bg-[#1E212B] border-2 border-dashed border-black p-4 text-center space-y-3 shadow-[3px_3px_0px_#000]">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">
                      Kode Kupon Digital
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-black text-2xl sm:text-3xl text-slate-900 dark:text-[#FACC15] tracking-wider select-all">
                        {issuedClaim.claimCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(issuedClaim.claimCode)}
                        className="px-2.5 py-1.5 bg-[#FACC15] hover:bg-yellow-300 text-black border-2 border-black font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                        title="Salin Kode Kupon"
                      >
                        {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                        {copiedCode ? "Tersalin" : "Salin"}
                      </button>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 grid grid-cols-2 gap-2 text-left text-xs">
                      <div className="col-span-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Program Bansos</span>
                        <span className="font-heading font-black text-emerald-700 dark:text-emerald-400 block truncate">
                          {issuedClaim.programTitle || selectedProgram.title}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Nama Penerima</span>
                        <span className="font-heading font-black uppercase">{issuedClaim.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Citizen ID</span>
                        <span className="font-mono font-bold">{issuedClaim.citizenId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Jenis Kelamin</span>
                        <span className="font-bold">{issuedClaim.sex}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Status Pengambilan</span>
                        <span className="inline-block px-1.5 py-0.5 bg-yellow-400 text-black font-black text-[10px] border border-black uppercase">
                          BELUM DIAMBIL
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-100 dark:bg-amber-950/40 border border-amber-500 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                    <span className="font-black block uppercase text-[11px]">
                      Lokasi & Cara Pengambilan:
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Kunjungi <strong>Kantor LSM Paguyuban Pizza Sandy Shores</strong>. Beritahukan Citizen ID (<strong>{issuedClaim.citizenId}</strong>) atau tunjukkan kode kupon <strong>{issuedClaim.claimCode}</strong> kepada staf pengurus yang bertugas untuk menerima paket fisik bansos.
                    </p>
                    <div className="p-2 bg-white/70 dark:bg-black/30 border border-amber-600/30 rounded text-[11px] leading-relaxed">
                      <span className="font-bold block text-amber-800 dark:text-amber-300 mb-0.5">
                        Panduan Roleplay (RP):
                      </span>
                      Bisa langsung sebutkan kode kupon secara lisan: <em>"Bang, mau klaim kupon {issuedClaim.claimCode}"</em>, atau berbisik menggunakan otot T: <code className="font-mono font-bold bg-amber-200 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-900 dark:text-amber-100">/me membisikkan kode kupon {issuedClaim.claimCode}</code>.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="w-full py-3 bg-[#FACC15] hover:bg-yellow-300 text-black border-2 border-black font-heading font-black text-xs uppercase shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              ) : (
                /* CLAIM FORM */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 bg-red-100 dark:bg-red-950/60 border-2 border-red-600 text-red-900 dark:text-red-200 text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_#000]">
                      <AlertTriangle className="shrink-0 text-red-600" size={16} />
                      <div className="space-y-1">
                        <p>{errorMessage}</p>
                        <p className="text-[11px] font-normal text-red-800 dark:text-red-300">
                          Setiap Citizen ID hanya berhak mendapatkan 1 kali bantuan bansos. Hubungi Pengurus LSM Sandy Shores jika Anda memerlukan bantuan verifikasi.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Area 1: Unggah KTP dengan Auto-Scan OCR (Mirip Pendaftaran Anggota) */}
                  <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15]">
                        <CreditCard size={14} />
                        <span>1. Dokumen KTP IC (Auto-Scan OCR Aktif)</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowSampleKtp(true)}
                          className="py-1 px-2.5 bg-white dark:bg-[#1E222D] hover:bg-amber-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-heading font-black text-[11px] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-colors"
                        >
                          <HelpCircle size={13} className="text-[#DC2626]" />
                          <span>Contoh KTP yang Benar</span>
                        </button>
                        <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
                          <ScanLine size={12} />
                          <span>AUTO-FILL AKTIF</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-1/2">
                        <div className="border-2 border-dashed border-black/30 dark:border-white/20 rounded p-3 text-center bg-slate-50 dark:bg-[#14161F] hover:bg-amber-50/50 transition-colors">
                          {screenshotPreview ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <img
                                src={screenshotPreview}
                                alt="KTP IC Preview"
                                className="w-full max-h-32 object-contain rounded border border-black shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setScreenshotPreview("");
                                  setOcrSuccess(null);
                                }}
                                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                              >
                                Ganti Foto KTP
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full py-1">
                              <CreditCard size={28} className="text-slate-400" />
                              <span className="text-xs font-bold text-[#DC2626] dark:text-[#FACC15] underline">
                                Unggah Foto KTP IC
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Format JPG/PNG • Otomatis Deteksi Teks KTP
                              </span>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                required
                                onChange={(e) => handleKtpUploadWithOcr(e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Tombol Terpisah di Luar Label Upload */}
                        <div className="mt-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => setShowSampleKtp(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-heading font-black text-amber-800 dark:text-amber-300 hover:text-black dark:hover:text-white underline cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Lihat Contoh Format KTP yang Benar</span>
                          </button>
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2 text-xs flex flex-col justify-center">
                        {isScanningOcr ? (
                          <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-amber-900 dark:text-amber-200 flex flex-col gap-1.5 animate-pulse">
                            <div className="flex items-center gap-2 font-bold">
                              <ScanLine size={16} className="animate-spin text-amber-600" />
                              <span>Memindai Dokumen KTP IC... {scanProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full transition-all duration-200"
                                style={{ width: `${scanProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Mendeteksi Nama Lengkap, Citizen ID, dan Jenis Kelamin...
                            </span>
                          </div>
                        ) : ocrSuccess === true ? (
                          <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">✓ KTP Terdeteksi Sukses!</strong>
                              <span className="text-[11px] block mt-0.5">
                                Nama, Citizen ID, dan Jenis Kelamin telah otomatis diisi di bawah. Periksa kembali sebelum submit.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded bg-slate-100 dark:bg-[#161820] border border-black/15 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                            💡 <strong>Tips OCR:</strong> Pastikan foto KTP IC tampak jelas dan tidak terpotong agar sistem membaca Nama Lengkap, Citizen ID, dan Sex secara otomatis.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Area 2: Rincian Data Bansos (Sama seperti daftar anggota + Sex) */}
                  <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] pb-1 border-b border-black/10 dark:border-white/10">
                      <User size={14} />
                      <span>2. Rincian Data Penerima Bansos</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Nama Lengkap IC */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Nama Lengkap IC <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Mamang Resing"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value.toUpperCase())}
                          className="w-full bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] px-3 py-2 text-xs font-bold uppercase shadow-[1.5px_1.5px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                        />
                      </div>

                      {/* Citizen ID (CID) */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Citizen ID (CID) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: PPS12345"
                          value={citizenId}
                          onChange={(e) => setCitizenId(e.target.value.toUpperCase())}
                          className="w-full bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] px-3 py-2 text-xs font-mono font-bold uppercase shadow-[1.5px_1.5px_0px_#000] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                        />
                      </div>

                      {/* Jenis Kelamin (Sex) */}
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Jenis Kelamin (Sex) <span className="text-red-500">*</span>
                        </label>
                        <BrutalistSelect
                          value={sex}
                          onChange={(val) => setSex(val)}
                          options={SEX_OPTIONS}
                          ariaLabel="Pilih Jenis Kelamin (Sex)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isScanningOcr}
                      className="w-full py-3.5 px-4 bg-[#FACC15] hover:bg-yellow-300 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-[#111827] border-2 border-black font-heading font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 transition-colors min-h-[48px] cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Memproses Pengajuan Bansos...
                        </>
                      ) : (
                        <>
                          <Gift size={18} />
                          Klaim Bantuan Sosial Sekarang
                        </>
                      )}
                    </button>
                    <span className="block text-center text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      Dengan mengajukan formulir ini, Anda menyatakan data KTP IC yang diunggah adalah sah dan benar.
                    </span>
                  </div>
                </form>
              )}
                </>
              )}
            </>
          )}

          {/* TAB 2: TRANSPARANSI DAFTAR PENERIMA BANSOS WARGA */}
          {activeTab === "recipients" && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#0b241b] dark:to-[#0f2e24] border-2 border-black dark:border-emerald-700/60 shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-emerald-600 text-white border-2 border-black flex items-center justify-center font-bold shadow-[1.5px_1.5px_0px_#000] shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-slate-950 dark:text-slate-100">
                      Transparansi Penyaluran Bansos Warga
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      Daftar resmi warga penerima paket bantuan sosial LSM Paguyuban Pizza Sandy Shores
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-[#181B24] border border-black text-slate-800 dark:text-slate-200 shadow-xs">
                    Update Real-Time
                  </span>
                </div>
              </div>

              {/* 3 Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#FACC15] border border-black flex items-center justify-center font-bold text-slate-950 shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Total Pemohon</span>
                    <span className="font-heading font-black text-sm text-slate-950 dark:text-slate-100">{totalClaims} Warga</span>
                  </div>
                </div>

                <div className="p-3 rounded bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-emerald-500 border border-black flex items-center justify-center font-bold text-white shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Sudah Disalurkan</span>
                    <span className="font-heading font-black text-sm text-emerald-700 dark:text-emerald-400">{claimedCount} Penerima</span>
                  </div>
                </div>

                <div className="p-3 rounded bg-white dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-amber-400 border border-black flex items-center justify-center font-bold text-slate-950 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Siap Diserahkan</span>
                    <span className="font-heading font-black text-sm text-amber-800 dark:text-amber-300">{pendingCount} Warga</span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Cari nama warga, Citizen ID / No KTP, atau nama bansos..."
                    className="input-field w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[1.5px_1.5px_0px_#000]"
                  />
                  {recipientSearch && (
                    <button
                      type="button"
                      onClick={() => setRecipientSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Program Filter Dropdown (jika ada lebih dari 1 program bansos) */}
                {bansosPrograms.length > 1 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Program:</span>
                    <select
                      value={recipientProgramFilter}
                      onChange={(e) => setRecipientProgramFilter(e.target.value)}
                      className="py-1.5 px-2 text-[11px] font-heading font-black bg-white dark:bg-[#1E212B] text-slate-800 dark:text-slate-200 border-2 border-black dark:border-[#475569] shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
                    >
                      <option value="ALL">Semua Program ({claimsList.length})</option>
                      {bansosPrograms.map((p) => {
                        const cnt = claimsList.filter((c) => c.programId === p.id).length;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.title} ({cnt})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("ALL")}
                    className={`py-1.5 px-2.5 rounded text-[11px] font-heading font-bold border-2 border-black cursor-pointer transition-all ${
                      recipientFilter === "ALL"
                        ? "bg-slate-900 text-white shadow-[1px_1px_0px_#000]"
                        : "bg-white dark:bg-[#1E212B] text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    Semua ({totalClaims})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("CLAIMED")}
                    className={`py-1.5 px-2.5 rounded text-[11px] font-heading font-bold border-2 border-black cursor-pointer transition-all ${
                      recipientFilter === "CLAIMED"
                        ? "bg-emerald-600 text-white shadow-[1px_1px_0px_#000]"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    Sudah Diterima ({claimedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("PENDING")}
                    className={`py-1.5 px-2.5 rounded text-[11px] font-heading font-bold border-2 border-black cursor-pointer transition-all ${
                      recipientFilter === "PENDING"
                        ? "bg-amber-500 text-slate-950 shadow-[1px_1px_0px_#000]"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    Siap Ambil ({pendingCount})
                  </button>
                </div>
              </div>

              {/* List Cards of Recipients */}
              {isLoadingClaims ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                  <span>Memuat data transparansi penerima bansos...</span>
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]">
                  <Package size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-heading font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                    Tidak Ada Data Penerima Bansos
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {recipientSearch
                      ? `Tidak ditemukan warga dengan kata kunci "${recipientSearch}".`
                      : "Belum ada permohonan bansos yang tercatat."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredRecipients.map((c) => {
                    const isClaimed = Boolean(c.claimed);
                    return (
                      <div
                        key={c.id || c.claimCode}
                        className="p-3 sm:p-3.5 rounded bg-white dark:bg-[#1C1F2B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        {/* Warga Info */}
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded flex items-center justify-center font-heading font-black text-xs border-2 border-black shrink-0 shadow-[1px_1px_0px_#000] ${
                              isClaimed ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {(c.fullName || "W")[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                {c.fullName}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                CID: {c.citizenId || "-"}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                KODE: {c.claimCode || "-"}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#DC2626] dark:text-[#FACC15] font-heading font-bold mt-0.5 truncate">
                              {c.programTitle || "Program Bansos Warga"}
                            </p>

                            {/* Paket Bansos yang Diterima */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                              <span className="text-slate-500 font-bold">Bantuan:</span>
                              {(Array.isArray(c.packageItems) && c.packageItems.length > 0
                                ? c.packageItems
                                : ["1 Paket Makanan", "Uang Tunai $2.500 USD"]
                              ).map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold"
                                >
                                  <Gift size={10} className="text-amber-600" />
                                  <span>{it}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Status & Timestamp */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10 dark:border-white/10">
                          {isClaimed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-500 text-[11px] font-mono font-black uppercase shadow-xs">
                              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                              <span>Sudah Diterima</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-500 text-[11px] font-mono font-bold uppercase shadow-xs">
                              <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                              <span>Siap Ambil</span>
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-500">
                            {c.claimDate || "Baru saja"} {c.claimTime ? `• ${c.claimTime}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FFFDF9] dark:bg-[#161822] border-t-2 border-black/20 dark:border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>LSM Paguyuban Pizza Sandy Shores &copy; 2026 • Transparansi Bansos</span>
          {activeTab === "form" ? (
            <button
              type="button"
              onClick={() => setActiveTab("recipients")}
              className="text-xs font-mono font-bold text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Lihat Daftar Penerima ({claimsList.length}) &rarr;</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className="text-xs font-mono font-bold text-[#DC2626] dark:text-[#FACC15] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>&larr; Ajukan Klaim Bansos</span>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox / Modal Contoh Format KTP IC yang Benar */}
      {showSampleKtp && (
        <div
          onClick={() => setShowSampleKtp(false)}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border-[3px] border-black shadow-[8px_8px_0px_#000] bg-[#FFFDF9] dark:bg-[#1A1D27] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-[#FACC15] text-slate-950">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-[#DC2626]" />
                <h4 className="font-heading font-black text-xs sm:text-sm uppercase">
                  Contoh Format KTP IC yang Benar
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleKtp(false)}
                className="w-7 h-7 rounded border border-black bg-white flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                title="Tutup Preview"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto">
              <div className="flex justify-center items-center py-1">
                <div className="rounded-lg border-2 border-black shadow-[3px_3px_0px_#000] overflow-hidden inline-block bg-slate-50 dark:bg-slate-900">
                  <img
                    src="/contoh-ktp-bansos.png"
                    alt="Contoh Format KTP IC yang Benar"
                    className="max-h-[320px] w-auto block object-contain"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-[#14161F] border border-amber-300 dark:border-amber-900 rounded text-xs text-slate-800 dark:text-slate-200 space-y-1.5">
                <strong className="block font-bold text-[#DC2626] uppercase text-[11px]">
                  Ketentuan Foto KTP IC Warga:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    <strong>Format Kartu:</strong> Pastikan judul kartu <code>LOS SANTOS IDENTITY</code> terlihat jelas.
                  </li>
                  <li>
                    <strong>Bagian Wajib Terbaca:</strong> Kolom <code>FIRST NAME</code>, <code>LAST NAME</code>, <code>SEX</code>, dan <code>CITIZEN ID</code>.
                  </li>
                  <li>
                    <strong>Kualitas Foto:</strong> Tidak buram (blur), tidak terpotong, dan teks terbaca jelas agar sistem auto-scan OCR mengisi formulir secara otomatis.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setShowSampleKtp(false)}
                className="w-full py-2.5 bg-[#FACC15] hover:bg-yellow-300 text-black border-2 border-black font-heading font-black text-xs uppercase shadow-[2px_2px_0px_#000] mt-1 cursor-pointer"
              >
                Saya Mengerti, Lanjutkan Upload KTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
