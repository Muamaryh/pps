import React, { useState, useEffect } from "react";
import {
  X,
  Store,
  Users2,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Search,
  AlertCircle,
  FileText,
  HelpCircle,
  RefreshCw,
  Camera,
  ExternalLink,
  User,
  CreditCard,
  ChevronDown,
  ScanLine,
  Upload,
} from "lucide-react";
import { submitServiceRequest, searchSubmissions, loadSubmissions } from "../services/firebase";
import BrutalistSelect from "./BrutalistSelect";
import BrutalistDatePicker from "./BrutalistDatePicker";
import { scanKtpImage } from "../utils/ktpOcr";

const DISCORD_SERVER_INVITE_URL = "https://discord.gg/duZhRpJEWY";
const DISCORD_VISITOR_CHANNEL_URL = "https://discord.gg/duZhRpJEWY";

// Helper untuk membuka gambar Base64 di Tab Baru tanpa blank
function openImageSafely(dataUrl, title = "Dokumen KTP IC") {
  if (!dataUrl) return;
  try {
    if (dataUrl.startsWith("data:")) {
      const parts = dataUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const byteString = atob(parts[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([uint8Array], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } else {
      window.open(dataUrl, "_blank");
    }
  } catch (err) {
    console.error("Gagal membuka gambar via blob:", err);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
              img { max-width: 95vw; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border: 3px solid #000; border-radius: 8px; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="${title}" />
          </body>
        </html>
      `);
      w.document.close();
    }
  }
}


// Opsi Pilihan Jenis Usaha (stand kopi & pakaian dihapus, layanan kesehatan ditambahkan, opsi lainnya)
const BUSINESS_TYPE_OPTIONS = [
  {
    value: "Kuliner Makanan & Minuman",
    label: "🍔 Kuliner Makanan & Minuman",
    subtext: "Stand kuliner, camilan gurun, burger, pizza, & minuman segar",
  },
  {
    value: "Layanan Kesehatan & Medis",
    label: "🩺 Layanan Kesehatan & Medis",
    subtext: "Pos pertolongan pertama, obat-obatan, apotek / klinik darurat warga",
  },
  {
    value: "Bengkel Kustom & Cuci Mobil",
    label: "🔧 Bengkel Kustom & Cuci Mobil",
    subtext: "Jasa reparasi mesin, servis darurat, kustom kendaraan, cuci mobil",
  },
  {
    value: "Lainnya",
    label: "📦 Usaha / Jasa Lainnya (Wajib Tuliskan)",
    subtext: "Pilih ini untuk jenis usaha lain yang wajib Anda sebutkan secara spesifik",
  },
];

// Opsi Pilihan Lokasi Lapak (HANYA DI PIZZA AJA, GADA YANG LAIN)
const LOCATION_OPTIONS = [
  {
    value: "Area Pizza Sandy Shores",
    label: "🍕 Area Pizza Sandy Shores",
    subtext: "Sentra resmi penataan stan UMKM binaan LSM Paguyuban Pizza Sandy Shores",
  },
];

// Opsi Asal Instansi (Request Meeting)
const AGENCY_OPTIONS = [
  { value: "Government Ime City (Pemkot)", label: "🏛️ Government Ime City (Pemkot)" },
  { value: "Instansi Kepolisian (SAPD / Sheriff)", label: "🚔 Instansi Kepolisian (SAPD / Sheriff)" },
  { value: "Instansi Medis (EMS / Rumah Sakit)", label: "🚑 Instansi Medis (EMS / RS)" },
  { value: "Komunitas Pelaku Usaha / UMKM", label: "🏪 Komunitas Pelaku Usaha / UMKM" },
  { value: "Organisasi / Komunitas / Paguyuban Lain", label: "👥 Organisasi / Komunitas Lain (Wajib Tuliskan)" },
  { value: "Warga Pribadi / Perorangan", label: "👤 Warga Pribadi / Perorangan" },
];

// Opsi Topik Meeting
const TOPIC_OPTIONS = [
  { value: "Koordinasi Program & Kerjasama Usaha", label: "🤝 Kerjasama Program Usaha / Kemitraan Lapak" },
  { value: "Dialog Kebijakan Wilayah dengan Pemerintah", label: "🏛️ Dialog Kebijakan Publik & Wilayah Sandy Shores" },
  { value: "Aspirasi & Pengaduan Warga", label: "📢 Aspirasi Warga / Pengaduan Masalah Lingkungan" },
  { value: "Rencana Event & Kegiatan Sosial Bersama", label: "🎉 Kolaborasi Event Komunitas / Baksos" },
  { value: "Kunjungan Silaturahmi Resmi", label: "☕ Kunjungan Silaturahmi Antar Organisasi" },
  { value: "Topik Khusus Lainnya", label: "📌 Topik Khusus Lainnya (Wajib Tuliskan)" },
];

export default function ServicePortalModal({ isOpen, onClose, onShowToast, initialTab = "lapak" }) {
  const [activeTab, setActiveTab] = useState(initialTab || "lapak"); // "lapak" | "meeting" | "tracking"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedVisitorData, setCopiedVisitorData] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Tracking State (Visitor POV)
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [visitorTickets, setVisitorTickets] = useState([]);

  // Preview Image Modal
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Load visitor's recent tickets from this browser
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pps_visitor_tickets") || "[]");
      if (Array.isArray(saved)) {
        setVisitorTickets(saved);
      }
    } catch {
      setVisitorTickets([]);
    }
  }, [isOpen]);

  // Form State: Lapak UMKM (dengan Auto-Scan KTP: firstName, lastName, dob, sex, nationality, citizenId)
  const [lapakForm, setLapakForm] = useState({
    firstName: "",
    lastName: "",
    namaKtp: "",
    dob: "",
    sex: "Male",
    nationality: "Sandy Shores",
    citizenId: "",
    phoneNumber: "",
    discordTag: "",
    fotoWajahIc: "",
    ktpImage: "",
    businessName: "",
    businessType: "Kuliner Makanan & Minuman",
    businessTypeOther: "",
    preferredLocation: "Area Pizza Sandy Shores",
    facilityNeeds: "",
    notes: "",
    agreedMOU: false,
  });

  // State OCR Scan KTP
  const [isScanningKtp, setIsScanningKtp] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrSuccess, setOcrSuccess] = useState(null);

  // Form State: Request Meeting (dengan KTP IC & Auto-Scan)
  const [meetingForm, setMeetingForm] = useState({
    characterName: "",
    firstName: "",
    lastName: "",
    dob: "",
    sex: "Male",
    nationality: "Sandy Shores",
    citizenId: "",
    fotoWajahIc: "",
    ktpImage: "",
    agencyName: "Warga Pribadi / Perorangan",
    agencyNameOther: "",
    phoneNumber: "",
    discordTag: "",
    meetingTopic: "Koordinasi Program & Kerjasama Usaha",
    meetingTopicOther: "",
    agendaDetail: "",
    preferredDate: "Sabtu, 17 Oktober 2026",
    preferredTime: "",
    meetingLocation: "",
  });

  // State OCR Scan KTP untuk Meeting
  const [isScanningMeetingKtp, setIsScanningMeetingKtp] = useState(false);
  const [meetingOcrProgress, setMeetingOcrProgress] = useState(0);
  const [meetingOcrSuccess, setMeetingOcrSuccess] = useState(null);

  if (!isOpen) return null;

  // Compress and run OCR scan on KTP for Meeting
  async function handleMeetingKtpUpload(file) {
    if (!file) return;

    // Generate compressed base64 preview for display & storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 720;
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
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.78);

        // Store KTP image preview in meetingForm
        setMeetingForm((prev) => ({
          ...prev,
          fotoWajahIc: compressedBase64,
          ktpImage: compressedBase64,
        }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Run OCR scan on original raw file for 100% text recognition accuracy
    setIsScanningMeetingKtp(true);
    setMeetingOcrProgress(0);
    setMeetingOcrSuccess(null);

    try {
      const scanResult = await scanKtpImage(file, (prog) => {
        setMeetingOcrProgress(prog);
      });

      if (scanResult.success) {
        const { firstName, lastName, fullName, dob, sex, nationality, citizenId } = scanResult.fields;

        setMeetingForm((prev) => {
          const newFirstName = (firstName || prev.firstName || '').toUpperCase();
          const newLastName = (lastName || prev.lastName || '').toUpperCase();
          const newCharName = (fullName || ((newFirstName || newLastName) ? `${newFirstName} ${newLastName}` : prev.characterName)).trim().toUpperCase();

          return {
            ...prev,
            firstName: newFirstName,
            lastName: newLastName,
            characterName: newCharName,
            dob: dob || prev.dob,
            sex: sex || prev.sex || "Male",
            nationality: nationality || prev.nationality || "Sandy Shores",
            citizenId: citizenId || prev.citizenId,
          };
        });

        const foundAny = firstName || lastName || dob || citizenId || nationality;
        if (foundAny) {
          setMeetingOcrSuccess(true);
          onShowToast("KTP berhasil dipindai! Data pemohon pertemuan telah dipisahkan.", "success");
        } else {
          setMeetingOcrSuccess(false);
          onShowToast("Teks KTP belum terbaca jelas. Silakan lengkapi kolom secara manual.", "info");
        }
      } else {
        setMeetingOcrSuccess(false);
        onShowToast("Gagal memindai otomatis. Anda tetap dapat mengisi kolom secara manual.", "info");
      }
    } catch (err) {
      console.error(err);
      setMeetingOcrSuccess(false);
    } finally {
      setIsScanningMeetingKtp(false);
    }
  }

  // Compress and run OCR scan on KTP
  async function handleKtpUpload(file) {
    if (!file) return;

    // Generate compressed base64 preview for display & storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 720;
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
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.78);

        // Store KTP image preview
        setLapakForm((prev) => ({
          ...prev,
          fotoWajahIc: compressedBase64,
          ktpImage: compressedBase64,
        }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Run OCR scan on original raw file for 100% text recognition accuracy
    setIsScanningKtp(true);
    setOcrProgress(0);
    setOcrSuccess(null);

    try {
      const scanResult = await scanKtpImage(file, (prog) => {
        setOcrProgress(prog);
      });

      if (scanResult.success) {
        const { firstName, lastName, fullName, dob, sex, nationality, citizenId } = scanResult.fields;

        setLapakForm((prev) => {
          const newFirstName = (firstName || prev.firstName || '').toUpperCase();
          const newLastName = (lastName || prev.lastName || '').toUpperCase();
          const newNamaKtp = (fullName || ((newFirstName || newLastName) ? `${newFirstName} ${newLastName}` : prev.namaKtp)).trim().toUpperCase();

          return {
            ...prev,
            firstName: newFirstName,
            lastName: newLastName,
            namaKtp: newNamaKtp,
            dob: dob || prev.dob,
            sex: sex || prev.sex || "Male",
            nationality: nationality || prev.nationality || "Sandy Shores",
            citizenId: citizenId || prev.citizenId,
          };
        });

        const foundAny = firstName || lastName || dob || citizenId || nationality;
        if (foundAny) {
          setOcrSuccess(true);
          onShowToast("KTP berhasil dipindai! Data telah dipisahkan otomatis ke kolom.", "success");
        } else {
          setOcrSuccess(false);
          onShowToast("Teks KTP belum terbaca jelas. Silakan lengkapi kolom secara manual.", "info");
        }
      } else {
        setOcrSuccess(false);
        onShowToast("Gagal memindai otomatis. Anda tetap dapat mengisi kolom secara manual.", "info");
      }
    } catch (err) {
      console.error(err);
      setOcrSuccess(false);
    } finally {
      setIsScanningKtp(false);
    }
  }

  // Save new ticket to local history
  function rememberTicket(ticket) {
    try {
      const saved = JSON.parse(localStorage.getItem("pps_visitor_tickets") || "[]");
      const updated = [
        {
          id: ticket.id,
          title: ticket.title,
          type: ticket.type,
          characterName: ticket.characterName || ticket.namaKtp,
          phoneNumber: ticket.phoneNumber,
          createdAt: ticket.createdAt,
        },
        ...saved.filter((t) => t.id !== ticket.id),
      ].slice(0, 10);
      localStorage.setItem("pps_visitor_tickets", JSON.stringify(updated));
      setVisitorTickets(updated);
    } catch (e) {
      console.warn("Could not save ticket to local storage:", e);
    }
  }

  // Handle Submit Lapak
  async function handleSubmitLapak(e) {
    e.preventDefault();

    const finalNamaKtp = (lapakForm.firstName || lapakForm.lastName)
      ? `${lapakForm.firstName.trim()} ${lapakForm.lastName.trim()}`.trim()
      : lapakForm.namaKtp.trim();

    if (!finalNamaKtp) {
      onShowToast("Mohon lengkapi Nama Karakter KTP (First Name / Last Name)!", "error");
      return;
    }
    if (!lapakForm.citizenId.trim()) {
      onShowToast("Mohon isi Citizen ID IC Anda!", "error");
      return;
    }
    if (!lapakForm.phoneNumber.trim()) {
      onShowToast("Mohon isi Nomor Telepon IC Anda!", "error");
      return;
    }
    if (!lapakForm.businessName.trim()) {
      onShowToast("Mohon isi Nama Usaha / Lapak!", "error");
      return;
    }
    if (lapakForm.businessType === "Lainnya" && !lapakForm.businessTypeOther.trim()) {
      onShowToast("Wajib menuliskan jenis usaha Anda secara spesifik karena memilih opsi 'Lainnya'!", "error");
      return;
    }
    if (!lapakForm.agreedMOU) {
      onShowToast("Wajib membaca dan menyetujui MOU Operasional Lapak Sandy Shores!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalBusinessType =
        lapakForm.businessType === "Lainnya"
          ? `Lainnya: ${lapakForm.businessTypeOther.trim()}`
          : lapakForm.businessType;

      const ticket = await submitServiceRequest({
        type: "lapak",
        title: `Lapak UMKM: ${lapakForm.businessName}`,
        characterName: finalNamaKtp,
        ...lapakForm,
        namaKtp: finalNamaKtp,
        businessType: finalBusinessType,
      });
      rememberTicket(ticket);
      setSubmittedTicket(ticket);
      onShowToast("Pengajuan Lapak UMKM berhasil dikirim! Silakan ikuti instruksi Discord.", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Gagal mengirim pengajuan. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Submit Meeting
  async function handleSubmitMeeting(e) {
    e.preventDefault();

    const finalCharacterName = (meetingForm.firstName || meetingForm.lastName)
      ? `${meetingForm.firstName.trim()} ${meetingForm.lastName.trim()}`.trim()
      : meetingForm.characterName.trim();

    if (!finalCharacterName) {
      onShowToast("Mohon lengkapi Nama Karakter KTP (First Name / Last Name)!", "error");
      return;
    }
    if (!meetingForm.phoneNumber.trim()) {
      onShowToast("Mohon isi Nomor Telepon IC Anda!", "error");
      return;
    }
    if (!meetingForm.agendaDetail.trim()) {
      onShowToast("Mohon lengkapi Rincian Agenda & Poin Pembahasan!", "error");
      return;
    }
    if (meetingForm.agencyName === "Organisasi / Komunitas / Paguyuban Lain" && !meetingForm.agencyNameOther.trim()) {
      onShowToast("Wajib menuliskan nama organisasi/komunitas Anda!", "error");
      return;
    }
    if (meetingForm.meetingTopic === "Topik Khusus Lainnya" && !meetingForm.meetingTopicOther.trim()) {
      onShowToast("Wajib menuliskan pokok topik khusus pertemuan Anda!", "error");
      return;
    }
    if (!meetingForm.meetingLocation.trim()) {
      onShowToast("Mohon isi tempat pertemuan atau koordinat GPS IC!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalAgency =
        meetingForm.agencyName === "Organisasi / Komunitas / Paguyuban Lain"
          ? `Organisasi Lain: ${meetingForm.agencyNameOther.trim()}`
          : meetingForm.agencyName;

      const finalTopic =
        meetingForm.meetingTopic === "Topik Khusus Lainnya"
          ? `Topik Khusus: ${meetingForm.meetingTopicOther.trim()}`
          : meetingForm.meetingTopic;

      const ticket = await submitServiceRequest({
        type: "meeting",
        title: `Audiensi: ${finalAgency} - ${finalTopic}`,
        characterName: finalCharacterName,
        namaKtp: finalCharacterName,
        ...meetingForm,
        agencyName: finalAgency,
        meetingTopic: finalTopic,
      });
      rememberTicket(ticket);
      setSubmittedTicket(ticket);
      onShowToast("Permohonan Pertemuan berhasil diajukan!", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Gagal mengajukan jadwal. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Perform search / tracking
  async function handlePerformSearch(query) {
    const q = (query || searchQuery).trim();
    if (!q) {
      onShowToast("Masukkan nomor tiket atau nomor telepon IC terlebih dahulu!", "info");
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchSubmissions(q);
      setSearchResults(results);
      if (results.length === 0) {
        onShowToast("Tiket tidak ditemukan. Periksa kembali kodenya.", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Gagal memeriksa status tiket.", "error");
    } finally {
      setIsSearching(false);
    }
  }

  // Switch to tracking tab with preloaded ticket
  function handleTrackCurrentTicket(ticketId) {
    setSubmittedTicket(null);
    setActiveTab("tracking");
    setSearchQuery(ticketId);
    handlePerformSearch(ticketId);
  }

  function handleCopyTicket() {
    if (!submittedTicket) return;
    const isLapak = submittedTicket.type === "lapak";
    const text = `[TIKET RESMI LSM PPS]\nID: #${submittedTicket.id}\nLayanan: ${
      isLapak ? "Pendaftaran Lapak UMKM Warga" : "Request Meeting & Audiensi"
    }\nNama KTP IC: ${submittedTicket.namaKtp || submittedTicket.characterName}\nCitizen ID: ${
      submittedTicket.citizenId || "-"
    }\nTelepon IC: ${submittedTicket.phoneNumber}\nDiscord: ${
      submittedTicket.discordTag || "-"
    }\nStatus: Menunggu Verifikasi Pengurus & Pertemuan di Sandy Shores\nServer Discord LSM PPS: ${DISCORD_SERVER_INVITE_URL}\nChannel Langsung Visitor: ${DISCORD_VISITOR_CHANNEL_URL}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast("Ringkasan tiket berhasil disalin ke clipboard!", "success");
  }

  function getVisitorFormatText(ticket) {
    if (!ticket) return "";
    const isLapak = ticket.type === "lapak";
    const fullName = (ticket.firstName || ticket.lastName)
      ? `${ticket.firstName || ""} ${ticket.lastName || ""}`.trim()
      : (ticket.namaKtp || ticket.characterName || "-");
    const nationality = ticket.nationality || "INDONESIA";
    const citizenId = ticket.citizenId || "-";
    const phoneNumber = ticket.phoneNumber || "-";

    if (isLapak) {
      const businessName = ticket.businessName || "-";
      const businessType = ticket.businessType || "-";
      const standNeeds = ticket.standNeeds || "-";
      return `Rincian Profil Pemohon\nNama Lengkap : ${fullName}\nKewarganegaraan : ${nationality}\nNomor KTP IC : ${citizenId}\nNomor HP IC : ${phoneNumber}\nRole : VISITOR\n\nRincian Usaha & Lokasi Lapak\nNama Usaha/Stan : ${businessName}\nJenis Usaha/Produk : ${businessType}\nLokasi Lapak : Area Pizza Sandy Shores\nKebutuhan Stan/Fasilitas : ${standNeeds}`;
    } else {
      const discordTag = ticket.discordTag || "-";
      const agencyName = ticket.agencyName || "-";
      const meetingTopic = ticket.meetingTopic || "-";
      return `Rincian Profil Pemohon\nTag / Username Discord (OOC) : ${discordTag}\nNama Lengkap : ${fullName}\nKewarganegaraan : ${nationality}\nNomor KTP IC : ${citizenId}\nNomor HP IC : ${phoneNumber}\nAsal Instansi / Fraksi / Komunitas : ${agencyName}\nTopik Pokok Pertemuan : ${meetingTopic}\nRole : VISITOR`;
    }
  }

  function handleCopyVisitorData() {
    if (!submittedTicket) return;
    const text = getVisitorFormatText(submittedTicket);
    navigator.clipboard.writeText(text);
    setCopiedVisitorData(true);
    setTimeout(() => setCopiedVisitorData(false), 2000);
    onShowToast("Format data visitor berhasil disalin!", "success");
  }

  function handleResetAndClose() {
    setSubmittedTicket(null);
    onClose();
  }

  return (
    /* Modal Wrapper: Klik ruang kosong TIDAK akan menutup modal */
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl max-h-[92vh] rounded border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] bg-[var(--card-bg)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header: Logo PPS Ukuran Full & Judul Resmi LSM PPS */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b-[2.5px] border-[#1A1A1A] dark:border-[#475569] bg-[#FFFDF9] dark:bg-[#1F222C]">
          <div className="flex items-center gap-3">
            {/* Logo PPS Image - Full Size, Prominent & Sharp */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white dark:bg-[#161820] border-2 border-black dark:border-[#475569] flex items-center justify-center shrink-0 p-1 shadow-[3px_3px_0px_#000]">
              <img
                src="/logo.png"
                alt="Logo LSM Paguyuban Pizza Sandy Shores"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#DC2626] dark:text-[#FACC15] block">
                PORTAL LAYANAN SATU PINTU • LSM PPS
              </span>
              <h3 className="font-heading font-black text-sm sm:text-base md:text-lg text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                Pendaftaran Lapak & Request Meeting
              </h3>
            </div>
          </div>

          {/* Tombol Tutup X Eksplisit */}
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] bg-[var(--card-bg)] text-slate-900 dark:text-slate-200 flex items-center justify-center font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
            title="Tutup Jendela Layanan"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {submittedTicket ? (
            /* Ticket Receipt Success Screen */
            (() => {
              const isLapak = submittedTicket.type === "lapak";
              const fullName = (submittedTicket.firstName || submittedTicket.lastName)
                ? `${submittedTicket.firstName || ""} ${submittedTicket.lastName || ""}`.trim()
                : (submittedTicket.namaKtp || submittedTicket.characterName || "-");
              const visitorFormatText = getVisitorFormatText(submittedTicket);

              return (
                <div className="py-4 flex flex-col items-center text-center max-w-xl mx-auto">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white border-[3px] border-black flex items-center justify-center mb-3 shadow-[4px_4px_0px_#000]">
                    <CheckCircle2 size={30} />
                  </div>
                  <span className="badge-brutal text-xs py-1 px-3 bg-[#FACC15] text-[#111827] border-2 border-black font-black mb-1.5 shadow-[2px_2px_0px_#000]">
                    PENGAJUAN TERCATAT • #{submittedTicket.id}
                  </span>
                  <h3 className="font-heading font-black text-lg sm:text-2xl text-slate-950 dark:text-slate-100 uppercase">
                    {isLapak ? "MOU & Berkas Berhasil Diterima!" : "Permohonan Meeting Berhasil Diterima!"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 mb-4">
                    {isLapak
                      ? "Pengurus LSM PPS akan memverifikasi berkas KTP & mengatur pertemuan (meeting) tatap muka di wilayah Sandy Shores."
                      : "Pengurus LSM PPS akan meninjau agenda audiensi & menghubungi perwakilan instansi/komunitas Anda."}
                  </p>

                  {/* Langkah Wajib Lanjutan dari Pihak LSM PPS */}
                  <div className="w-full text-left p-4 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-[#1A1A1A] dark:border-[#475569] shadow-[4px_4px_0px_#000] flex flex-col gap-3.5 mb-4">
                    <div className="flex items-center gap-2 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] border-b pb-2 border-black/15 dark:border-white/15">
                      <ShieldCheck size={16} />
                      <span>ALUR VERIFIKASI & JAWABAN RESMI LSM PPS:</span>
                    </div>

                    <div className="text-xs space-y-3.5 text-slate-800 dark:text-slate-200">
                      {/* Step 1 */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#111827] font-black flex items-center justify-center shrink-0 text-[10px]">
                          1
                        </span>
                        <div>
                          <strong>{isLapak ? "MOU & Berkas Identitas Disimpan:" : "Berkas Permohonan Disimpan:"}</strong>{" "}
                          {isLapak ? (
                            <>Data KTP IC (<strong>{fullName}</strong>), Citizen ID (<strong>{submittedTicket.citizenId || "-"}</strong>), dan persetujuan MOU Anda sudah masuk antrean verifikasi.</>
                          ) : (
                            <>Data KTP IC (<strong>{fullName}</strong>), Citizen ID (<strong>{submittedTicket.citizenId || "-"}</strong>), instansi/komunitas (<strong>{submittedTicket.agencyName || "-"}</strong>), dan topik pertemuan sudah masuk antrean verifikasi.</>
                          )}
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#111827] font-black flex items-center justify-center shrink-0 text-[10px]">
                          2
                        </span>
                        <div className="flex-1 space-y-2">
                          <div>
                            <strong>Wajib Masuk Discord & Isi Data Visitor:</strong> Silakan salin format data visitor di bawah ini dan kirimkan ke channel visitor server Discord LSM PPS agar pengurus dapat segera memberikan role visitor (hanya dapat melihat channel publik layanan & koordinasi).
                          </div>

                          {/* Box Salin Format Data Visitor */}
                          <div className="rounded border-2 border-black dark:border-[#475569] bg-slate-100 dark:bg-[#14161E] p-3 shadow-[2px_2px_0px_#000]">
                            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-black/10 dark:border-white/10">
                              <span className="font-heading font-black text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Format Data Visitor ({isLapak ? "Lapak UMKM" : "Request Meeting"})
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Sparkles size={11} />
                                Otomatis Terisi
                              </span>
                            </div>
                            <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all text-slate-900 dark:text-slate-100 bg-white dark:bg-[#1C1F2B] p-2.5 rounded border border-black/20 dark:border-white/10 overflow-x-auto">
                              {visitorFormatText}
                            </pre>
                            <button
                              type="button"
                              onClick={handleCopyVisitorData}
                              className={`mt-2.5 w-full btn text-xs py-2 px-3 border-2 border-black font-heading font-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] transition-all ${
                                copiedVisitorData
                                  ? "bg-emerald-500 text-white"
                                  : "bg-[#FACC15] hover:bg-[#FDE047] text-[#111827]"
                              }`}
                            >
                              {copiedVisitorData ? (
                                <>
                                  <Check size={14} className="stroke-[3]" />
                                  <span>Format Data Visitor Berhasil Disalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  <span>Salin Format Data Visitor</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#111827] font-black flex items-center justify-center shrink-0 text-[10px]">
                          3
                        </span>
                        <div>
                          <strong>{isLapak ? "Penjadwalan Pertemuan / Meeting IC:" : "Penjadwalan & Konfirmasi Meeting IC:"}</strong>{" "}
                          {isLapak
                            ? "Pengurus LSM PPS akan menghubungi Anda via Discord / Telepon IC untuk verifikasi langsung di lapangan dan penetapan titik lapak Sandy Shores."
                            : "Pengurus LSM PPS akan menghubungi Anda via Discord / Telepon IC untuk konfirmasi jadwal waktu dan penetapan lokasi pertemuan audiensi."}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Langsung ke Discord Visitor Channel */}
                    <div className="flex flex-col gap-1.5 mt-1 pt-2.5 border-t border-black/10 dark:border-white/10">
                      <a
                        href={DISCORD_VISITOR_CHANNEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn py-2.5 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-black shadow-[3px_3px_0px_#000] font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        <span>Masuk ke Channel Visitor Discord LSM PPS</span>
                        <ExternalLink size={13} />
                      </a>
                      <p className="text-[11px] text-slate-500 text-center leading-tight">
                        Tautan invite resmi yang otomatis mengarahkan Anda langsung mendarat di channel visitor server Discord LSM PPS.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyTicket}
                      className="btn btn-secondary text-xs py-2 px-4 border-2 border-black flex items-center gap-1.5"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copied ? "Tersalin!" : "Salin Ringkasan Tiket"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTrackCurrentTicket(submittedTicket.id)}
                      className="btn text-xs py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white border-2 border-black shadow-[2px_2px_0px_#000] font-heading font-black flex items-center gap-1.5"
                    >
                      <Search size={14} />
                      <span>Lacak Status Tiket Ini</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      className="btn text-xs py-2 px-5 bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] font-heading font-black"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {/* Tab Switcher Pills */}
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded bg-slate-200/70 dark:bg-[#1A1D26] border-2 border-black dark:border-[#475569]">
                <button
                  type="button"
                  onClick={() => setActiveTab("lapak")}
                  className={`py-2 px-2 sm:px-3 rounded flex items-center justify-center gap-1.5 font-heading font-black text-xs sm:text-sm uppercase tracking-wide transition-all ${
                    activeTab === "lapak"
                      ? "bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Store size={15} />
                  <span>Daftar Lapak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("meeting")}
                  className={`py-2 px-2 sm:px-3 rounded flex items-center justify-center gap-1.5 font-heading font-black text-xs sm:text-sm uppercase tracking-wide transition-all ${
                    activeTab === "meeting"
                      ? "bg-[#DC2626] text-white border-2 border-black shadow-[2px_2px_0px_#000]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Users2 size={15} />
                  <span>Request Meeting</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tracking")}
                  className={`py-2 px-2 sm:px-3 rounded flex items-center justify-center gap-1.5 font-heading font-black text-xs sm:text-sm uppercase tracking-wide transition-all ${
                    activeTab === "tracking"
                      ? "bg-sky-500 text-white border-2 border-black shadow-[2px_2px_0px_#000]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Search size={15} />
                  <span>Lacak Status</span>
                </button>
              </div>





              {/* TAB 1: FORMULIR LAPAK UMKM (NAMA KTP IC, CITIZEN ID, FOTO WAJAH IC, MOU) */}
              {activeTab === "lapak" && (
                <form onSubmit={handleSubmitLapak} className="flex flex-col gap-4">
                  {/* Banner Informasi Alur */}
                  <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                    <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Pendaftaran Stan Lapak Sandy Shores:</strong> Isi data identitas KTP IC, Citizen ID, dan unggah foto wajah karakter. Setelah submit, Anda akan diarahkan ke Discord untuk melengkapi data visitor serta mengatur jadwal pertemuan (meeting) dengan pengurus.
                    </div>
                  </div>

                  {/* Bagian Identitas KTP & Citizen ID IC */}
                  <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15]">
                        <CreditCard size={14} />
                        <span>1. Identitas Karakter Warga (KTP & Citizen ID)</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
                        <ScanLine size={12} />
                        <span>AUTO-SCAN OCR AKTIF</span>
                      </span>
                    </div>

                    {/* Area Unggah KTP dengan Auto-Scan OCR */}
                    <div className="p-3 rounded bg-amber-50/70 dark:bg-[#181B24] border-2 border-dashed border-[#1A1A1A] dark:border-slate-600 flex flex-col gap-2.5">
                      <div className="leading-tight">
                        <label className="text-xs font-heading font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
                          <Upload size={15} className="text-[#DC2626]" />
                          <span>Unggah Foto / Screenshot KTP IC</span>
                        </label>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Upload screenshot kartu identitas (KTP) in-game Anda. Sistem AI OCR kami otomatis memindai dan memisahkan data ke kolom di bawah.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {lapakForm.fotoWajahIc ? (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-28 h-18 sm:w-32 sm:h-20 rounded border-2 border-black shadow-[3px_3px_0px_#000] overflow-hidden bg-slate-900 shrink-0 group">
                              <img
                                src={lapakForm.fotoWajahIc}
                                alt="Foto KTP IC"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setPreviewPhoto(lapakForm.fotoWajahIc)}
                                title="Klik untuk perbesar KTP"
                              />
                              <div
                                onClick={() => setPreviewPhoto(lapakForm.fotoWajahIc)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity"
                              >
                                Perbesar
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="px-3 py-1.5 rounded bg-white dark:bg-[#20232E] border-2 border-black dark:border-slate-600 text-xs font-heading font-black shadow-[2px_2px_0px_#000] hover:bg-[#FACC15] hover:text-black cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                                <RefreshCw size={13} className={isScanningKtp ? "animate-spin" : ""} />
                                <span>{isScanningKtp ? "Memindai..." : "Ganti Foto KTP"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isScanningKtp}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleKtpUpload(file);
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(lapakForm.fotoWajahIc)}
                                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline text-left"
                              >
                                🔍 Lihat Gambar KTP Penuh
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="w-full py-4 px-3 rounded border-2 border-dashed border-black dark:border-slate-500 bg-white dark:bg-[#20232E] hover:bg-amber-50/50 dark:hover:bg-slate-800 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer shadow-[2px_2px_0px_#000] transition-colors">
                            <Upload size={24} className="text-[#DC2626] mb-1 animate-bounce" />
                            <span className="font-heading font-black text-xs uppercase tracking-wide text-slate-900 dark:text-slate-100">
                              Klik untuk Pilih / Unggah Gambar KTP IC
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              Mendukung format JPG, PNG, WEBP, atau screenshot in-game
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isScanningKtp}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleKtpUpload(file);
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Status / Indikator OCR Scan */}
                      {isScanningKtp && (
                        <div className="p-2.5 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-500 text-xs font-mono text-amber-950 dark:text-amber-200 flex flex-col gap-1.5 animate-pulse">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <RefreshCw size={13} className="animate-spin text-[#DC2626]" />
                              <span>Sedang memindai dan memisahkan teks KTP...</span>
                            </span>
                            <span>{ocrProgress}%</span>
                          </div>
                          <div className="w-full bg-amber-200 dark:bg-amber-900/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#DC2626] h-1.5 transition-all duration-200"
                              style={{ width: `${Math.max(ocrProgress, 15)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {!isScanningKtp && ocrSuccess === true && (
                        <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-500 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>✓ KTP berhasil dipindai otomatis! Silakan tinjau atau sesuaikan 6 data di bawah jika diperlukan.</span>
                        </div>
                      )}

                      {!isScanningKtp && ocrSuccess === false && (
                        <div className="p-2 rounded bg-sky-100 dark:bg-sky-950/40 border border-sky-400 text-[11px] text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                          <AlertCircle size={15} className="text-sky-600 shrink-0" />
                          <span>Teks KTP belum terbaca sempurna. Anda dapat melengkapi 6 kolom di bawah secara manual.</span>
                        </div>
                      )}
                    </div>

                    {/* 6 Data Hasil Pemisahan KTP (First Name, Last Name, DOB, Sex, Nationality, Citizen ID) */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-heading font-black text-slate-700 dark:text-slate-300 uppercase">
                        <span>Hasil Pemisahan Data KTP IC (Dapat Diedit Manual):</span>
                        <span className="text-[10px] font-normal text-slate-500">Wajib Lengkap</span>
                      </div>

                      {/* Baris 1: First Name & Last Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            First Name (Nama Depan) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Jack"
                            value={lapakForm.firstName}
                            onChange={(e) => {
                              const fName = e.target.value;
                              setLapakForm({
                                ...lapakForm,
                                firstName: fName,
                                namaKtp: `${fName} ${lapakForm.lastName}`.trim(),
                              });
                            }}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Last Name (Nama Belakang) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Sullivan"
                            value={lapakForm.lastName}
                            onChange={(e) => {
                              const lName = e.target.value;
                              setLapakForm({
                                ...lapakForm,
                                lastName: lName,
                                namaKtp: `${lapakForm.firstName} ${lName}`.trim(),
                              });
                            }}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>
                      </div>

                      {/* Baris 2: DOB & Sex */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            DOB (Date of Birth / Tanggal Lahir) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: 1995-04-12 atau 12/04/1995"
                            value={lapakForm.dob}
                            onChange={(e) => setLapakForm({ ...lapakForm, dob: e.target.value })}
                            className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Sex (Jenis Kelamin) *
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setLapakForm({ ...lapakForm, sex: "Male" })}
                              className={`py-2 px-3 rounded text-xs font-heading font-black border-2 border-black transition-all ${
                                lapakForm.sex === "Male"
                                  ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000]"
                                  : "bg-white dark:bg-[#20232E] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              ♂ Male (Laki-laki)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLapakForm({ ...lapakForm, sex: "Female" })}
                              className={`py-2 px-3 rounded text-xs font-heading font-black border-2 border-black transition-all ${
                                lapakForm.sex === "Female"
                                  ? "bg-[#DC2626] text-white shadow-[2px_2px_0px_#000]"
                                  : "bg-white dark:bg-[#20232E] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              ♀ Female (Perempuan)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Baris 3: Nationality & Citizen ID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Nationality (Kewarganegaraan) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Sandy Shores / Blaine County / Los Santos"
                            value={lapakForm.nationality}
                            onChange={(e) => setLapakForm({ ...lapakForm, nationality: e.target.value })}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Citizen ID (IC) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: CTZ-9481 atau 18942"
                            value={lapakForm.citizenId}
                            onChange={(e) => setLapakForm({ ...lapakForm, citizenId: e.target.value })}
                            className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Baris Kontak: No Telp IC & Tag Discord */}
                    <div className="pt-2 border-t border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                          Nomor Telepon IC *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 555-0192 / 210499"
                          value={lapakForm.phoneNumber}
                          onChange={(e) => setLapakForm({ ...lapakForm, phoneNumber: e.target.value })}
                          className="input-field w-full text-xs font-mono py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                          Tag / Username Discord (OOC)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: @jacksullivan"
                          value={lapakForm.discordTag}
                          onChange={(e) => setLapakForm({ ...lapakForm, discordTag: e.target.value })}
                          className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian Detail Usaha Lapak */}
                  <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15] pb-1 border-b border-black/10 dark:border-white/10">
                      <Store size={14} />
                      <span>2. Rincian Usaha & Lokasi Sandy Shores</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                          Nama Usaha / Stan Dagang *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Pizza Gurun Sandy Shores"
                          value={lapakForm.businessName}
                          onChange={(e) => setLapakForm({ ...lapakForm, businessName: e.target.value })}
                          className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                          Jenis Usaha / Produk *
                        </label>
                        <BrutalistSelect
                          value={lapakForm.businessType}
                          onChange={(val) => setLapakForm({ ...lapakForm, businessType: val })}
                          options={BUSINESS_TYPE_OPTIONS}
                          ariaLabel="Pilih Jenis Usaha / Produk"
                        />

                        {/* Wajib Tulis jika memilih opsi Lainnya */}
                        {lapakForm.businessType === "Lainnya" && (
                          <div className="mt-2.5 animate-fadeIn">
                            <label className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] block mb-1">
                              Tuliskan Jenis Usaha Anda * (Wajib Diisi)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: Toko Elektronik / Servis Radio / Hiburan Rakyat..."
                              value={lapakForm.businessTypeOther || ""}
                              onChange={(e) => setLapakForm({ ...lapakForm, businessTypeOther: e.target.value })}
                              className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-[#DC2626] dark:border-[#FACC15] shadow-[2px_2px_0px_#000]"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Pilihan Lokasi Lapak Sandy Shores *
                      </label>
                      <BrutalistSelect
                        value={lapakForm.preferredLocation}
                        onChange={(val) => setLapakForm({ ...lapakForm, preferredLocation: val })}
                        options={LOCATION_OPTIONS}
                        ariaLabel="Pilih Lokasi Lapak Sandy Shores"
                      />
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 block">
                        Seluruh penataan stand lapak difokuskan di area Pizza Sandy Shores.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Kebutuhan Stand & Fasilitas Tambahan (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Contoh: Butuh blast buat mainin lagu biar ga bosen..."
                        value={lapakForm.facilityNeeds}
                        onChange={(e) => setLapakForm({ ...lapakForm, facilityNeeds: e.target.value })}
                        className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* KOTAK MOU RESMI: KESEPAKATAN HAK PENGGUNAAN LAHAN VENDOR */}
                  <div className="card-brutal p-3.5 bg-amber-50/70 dark:bg-[#1E212B] border-2 border-black dark:border-slate-600 rounded flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-black/15 dark:border-white/15">
                      <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-slate-900 dark:text-slate-100">
                        <FileText size={15} className="text-[#DC2626]" />
                        <span>MEMORANDUM OF UNDERSTANDING (MOU) • NO: 001/MOU/LPS/VENDOR/X/2026</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">
                        DOKUMEN RESMI
                      </span>
                    </div>

                    <div className="max-h-64 sm:max-h-72 overflow-y-auto p-3 rounded bg-white dark:bg-[#161820] border-2 border-black/20 dark:border-white/10 text-xs leading-relaxed text-slate-800 dark:text-slate-200 space-y-3 font-sans select-text">
                      {/* Title Header */}
                      <div className="text-center pb-2 border-b border-black/10 dark:border-white/10">
                        <h4 className="font-heading font-black text-sm uppercase text-slate-950 dark:text-slate-100 tracking-tight">
                          MEMORANDUM OF UNDERSTANDING (MOU)
                        </h4>
                        <h5 className="font-heading font-black text-xs uppercase text-[#DC2626] dark:text-[#FACC15]">
                          KESEPAKATAN HAK PENGGUNAAN LAHAN VENDOR
                        </h5>
                        <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                          LSM PIZZA SHANDY SHORE’S • Nomor: 001/MOU/LPS/VENDOR/X/2026
                        </p>
                      </div>

                      <p className="text-[11px] italic text-slate-600 dark:text-slate-400">
                        Pada hari ini, para pihak yang bertanda tangan di bawah ini sepakat untuk menjalin kerja sama mengenai hak penggunaan lahan bagi kegiatan usaha vendor, dengan ketentuan sebagai berikut:
                      </p>

                      {/* PASAL I */}
                      <div className="space-y-1">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL I — PARA PIHAK
                        </strong>
                        <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                          <li><strong>Pihak Pertama:</strong> LSM Pizza Shandy Shore’s, selaku fasilitator dan perwakilan kepentingan masyarakat dalam kerja sama penggunaan lahan.</li>
                          <li><strong>Pihak Kedua:</strong> Vendor, selaku pihak yang menggunakan lahan untuk menjalankan kegiatan usaha.</li>
                          <li><strong>Pihak Terkait:</strong> Pemerintah (Government), petugas penjaga lahan, serta perwakilan warga lokal yang memiliki kepentingan dalam penggunaan lahan tersebut.</li>
                        </ol>
                      </div>

                      {/* PASAL II */}
                      <div className="space-y-1">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL II — MAKSUD DAN TUJUAN
                        </strong>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          MOU ini dibuat sebagai dasar kesepahaman mengenai penggunaan lahan oleh vendor, pengaturan kontribusi mingguan, pembagian dana secara transparan, serta pemeliharaan ketertiban dan hubungan baik antara vendor, pemerintah, LSM, petugas penjaga, dan masyarakat setempat.
                        </p>
                      </div>

                      {/* PASAL III */}
                      <div className="space-y-1.5">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL III — TARIF DAN PEMBAGIAN DANA
                        </strong>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          Para pihak menyepakati tarif penggunaan lahan sebesar <strong>$30.000 (tiga puluh ribu dolar) per minggu</strong>, dengan rincian pembagian sebagai berikut:
                        </p>

                        <div className="overflow-x-auto my-1">
                          <table className="w-full text-left font-mono text-[11px] border border-black/30 dark:border-slate-600 rounded">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                              <tr>
                                <th className="p-1.5 border-b border-r border-black/20">Penerima Alokasi Dana</th>
                                <th className="p-1.5 border-b border-black/20 text-right">Nominal per Minggu</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-black/10">
                                <td className="p-1.5 border-r border-black/10">Pemerintah (Government)</td>
                                <td className="p-1.5 text-right font-bold">$10.000</td>
                              </tr>
                              <tr className="border-b border-black/10">
                                <td className="p-1.5 border-r border-black/10">LSM Pizza Shandy Shore’s</td>
                                <td className="p-1.5 text-right font-bold">$10.000</td>
                              </tr>
                              <tr className="border-b border-black/10">
                                <td className="p-1.5 border-r border-black/10">Petugas Penjaga Lahan</td>
                                <td className="p-1.5 text-right font-bold">$5.000</td>
                              </tr>
                              <tr className="border-b border-black/10">
                                <td className="p-1.5 border-r border-black/10">Hak / Kompensasi Warga Lokal</td>
                                <td className="p-1.5 text-right font-bold">$5.000</td>
                              </tr>
                              <tr className="bg-[#FACC15]/20 font-black text-slate-950 dark:text-slate-100">
                                <td className="p-1.5 border-r border-black/10">TOTAL KONTRIBUSI MINGGUAN</td>
                                <td className="p-1.5 text-right text-[#DC2626] dark:text-[#FACC15]">$30.000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[10px] italic text-slate-600 dark:text-slate-400">
                          Pembagian dana wajib dilakukan secara transparan dan dicatat dalam laporan penerimaan mingguan. Setiap penerima berhak memperoleh bukti pembayaran sesuai bagiannya.
                        </p>
                      </div>

                      {/* PASAL IV */}
                      <div className="space-y-1">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL IV — HAK DAN KEWAJIBAN VENDOR
                        </strong>
                        <div className="text-[11px] space-y-1">
                          <p><strong>Hak Vendor:</strong></p>
                          <ul className="list-disc list-inside pl-1 space-y-0.5 text-slate-700 dark:text-slate-300">
                            <li>Menggunakan lahan sesuai lokasi, batas, dan tujuan yang telah disepakati.</li>
                            <li>Memperoleh kepastian mengenai masa penggunaan lahan selama perjanjian berlaku.</li>
                            <li>Mendapatkan informasi yang jelas mengenai tarif, jadwal pembayaran, dan aturan penggunaan lahan.</li>
                          </ul>
                          <p className="pt-1"><strong>Kewajiban Vendor:</strong></p>
                          <ul className="list-disc list-inside pl-1 space-y-0.5 text-slate-700 dark:text-slate-300">
                            <li>Membayar tarif penggunaan lahan sebesar $30.000 setiap minggu sesuai jadwal yang disepakati.</li>
                            <li>Menjaga kebersihan, ketertiban, dan keamanan area usaha.</li>
                            <li>Tidak mengalihkan hak penggunaan lahan kepada pihak lain tanpa persetujuan tertulis.</li>
                            <li>Mematuhi peraturan pemerintah dan ketentuan penggunaan lahan yang berlaku.</li>
                          </ul>
                        </div>
                      </div>

                      {/* PASAL V */}
                      <div className="space-y-1">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL V — HAK DAN KEWAJIBAN LSM PIZZA SHANDY SHORE’S
                        </strong>
                        <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                          <li>Memfasilitasi komunikasi antara vendor, pemerintah, petugas penjaga, dan warga lokal.</li>
                          <li>Membantu memastikan pembagian kontribusi sesuai kesepakatan.</li>
                          <li>Menyediakan catatan penerimaan dan penyaluran dana secara transparan.</li>
                          <li>Menindaklanjuti keluhan atau perselisihan melalui musyawarah bersama.</li>
                          <li>Tidak menyalahgunakan kewenangan maupun dana yang diterima berdasarkan MOU ini.</li>
                        </ol>
                      </div>

                      {/* PASAL VI */}
                      <div className="space-y-1">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL VI — MASA BERLAKU DAN EVALUASI
                        </strong>
                        <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                          <li>MOU berlaku sejak tanggal ditandatangani oleh para pihak.</li>
                          <li>Pembayaran dilakukan setiap minggu pada hari dan waktu yang disepakati bersama.</li>
                          <li>Evaluasi kerja sama dilakukan secara berkala atau apabila terdapat perubahan kebijakan pemerintah.</li>
                          <li>Perpanjangan, perubahan tarif, maupun perubahan pembagian dana harus disepakati secara tertulis oleh para pihak.</li>
                        </ol>
                      </div>

                      {/* PASAL VII & VIII */}
                      <div className="space-y-1">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL VII — PENYELESAIAN PERSELISIHAN
                        </strong>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          Setiap perselisihan diselesaikan terlebih dahulu melalui musyawarah antara vendor, LSM Pizza Shandy Shore’s, dan pihak terkait. Apabila tidak tercapai kesepakatan, penyelesaian dilakukan melalui mekanisme yang disetujui bersama.
                        </p>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-black/10 dark:border-white/10">
                        <strong className="font-heading font-black text-[11px] text-slate-900 dark:text-slate-100 uppercase block">
                          PASAL VIII — PENUTUP
                        </strong>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          MOU ini dibuat dengan itikad baik sebagai bentuk komitmen bersama untuk menciptakan penggunaan lahan yang tertib, transparan, adil, serta memberikan manfaat bagi pemerintah, pelaku usaha, petugas penjaga, LSM Pizza Shandy Shore’s, dan masyarakat lokal.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={lapakForm.agreedMOU}
                        onChange={(e) => setLapakForm({ ...lapakForm, agreedMOU: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-[#DC2626] rounded border-black cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        Saya telah membaca, memahami, dan MENYETUJUI seluruh ketentuan MOU No. 001/MOU/LPS/VENDOR/X/2026 Hak Penggunaan Lahan Vendor LSM Pizza Sandy Shores di atas.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn w-full py-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-[#111827] border-2 border-black shadow-[3px_3px_0px_#000] font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send size={15} className="text-[#DC2626]" />
                    <span>{isSubmitting ? "Mengirim Data & Berkas..." : "Kirim Formulir Lapak UMKM"}</span>
                  </button>
                </form>
              )}

              {/* TAB 2: FORMULIR REQUEST MEETING / AUDIENSI */}
              {activeTab === "meeting" && (
                <form onSubmit={handleSubmitMeeting} className="flex flex-col gap-4">
                  <div className="p-3 rounded bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-700/60 text-xs text-red-950 dark:text-red-200 flex items-start gap-2">
                    <ShieldCheck size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <strong>Pertemuan Resmi & Audiensi Terbuka:</strong> LSM Paguyuban Pizza Sandy Shores siap bermitra dialog dengan Government Ime City, instansi kepolisian/kesehatan, paguyuban warga, maupun perorangan demi kemajuan bersama.
                    </div>
                  </div>

                  {/* Bagian Identitas KTP & Citizen ID Pemohon Pertemuan */}
                  <div className="p-3.5 rounded bg-[#FFFDF9] dark:bg-[#1E212B] border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000] flex flex-col gap-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5 text-xs font-heading font-black uppercase text-[#DC2626] dark:text-[#FACC15]">
                        <CreditCard size={14} />
                        <span>1. Identitas Karakter & Berkas KTP (Pemohon Pertemuan)</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#FACC15] text-[#111827] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
                        <ScanLine size={12} />
                        <span>AUTO-SCAN OCR AKTIF</span>
                      </span>
                    </div>

                    {/* Area Unggah KTP Pemohon Pertemuan dengan Auto-Scan OCR */}
                    <div className="p-3 rounded bg-red-50/60 dark:bg-[#181B24] border-2 border-dashed border-[#1A1A1A] dark:border-slate-600 flex flex-col gap-2.5">
                      <div className="leading-tight">
                        <label className="text-xs font-heading font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
                          <Upload size={15} className="text-[#DC2626]" />
                          <span>Unggah Foto / Screenshot KTP IC Pemohon</span>
                        </label>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Upload screenshot kartu identitas (KTP) in-game Anda. Sistem AI OCR kami otomatis memindai dan memisahkan data ke kolom di bawah.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {meetingForm.fotoWajahIc ? (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-28 h-18 sm:w-32 sm:h-20 rounded border-2 border-black shadow-[3px_3px_0px_#000] overflow-hidden bg-slate-900 shrink-0 group">
                              <img
                                src={meetingForm.fotoWajahIc}
                                alt="Foto KTP IC"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setPreviewPhoto(meetingForm.fotoWajahIc)}
                                title="Klik untuk perbesar KTP"
                              />
                              <div
                                onClick={() => setPreviewPhoto(meetingForm.fotoWajahIc)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity"
                              >
                                Perbesar
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="px-3 py-1.5 rounded bg-white dark:bg-[#20232E] border-2 border-black dark:border-slate-600 text-xs font-heading font-black shadow-[2px_2px_0px_#000] hover:bg-[#FACC15] hover:text-black cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                                <RefreshCw size={13} className={isScanningMeetingKtp ? "animate-spin" : ""} />
                                <span>{isScanningMeetingKtp ? "Memindai..." : "Ganti Foto KTP"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isScanningMeetingKtp}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleMeetingKtpUpload(file);
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(meetingForm.fotoWajahIc)}
                                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline text-left"
                              >
                                🔍 Lihat Gambar KTP Penuh
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="w-full py-4 px-3 rounded border-2 border-dashed border-black dark:border-slate-500 bg-white dark:bg-[#20232E] hover:bg-red-50/40 dark:hover:bg-slate-800 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer shadow-[2px_2px_0px_#000] transition-colors">
                            <Upload size={24} className="text-[#DC2626] mb-1 animate-bounce" />
                            <span className="font-heading font-black text-xs uppercase tracking-wide text-slate-900 dark:text-slate-100">
                              Klik untuk Pilih / Unggah Gambar KTP IC
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              Mendukung format JPG, PNG, WEBP, atau screenshot in-game
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isScanningMeetingKtp}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMeetingKtpUpload(file);
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Status / Indikator OCR Scan */}
                      {isScanningMeetingKtp && (
                        <div className="p-2.5 rounded bg-red-100 dark:bg-red-950/40 border border-red-500 text-xs font-mono text-red-950 dark:text-red-200 flex flex-col gap-1.5 animate-pulse">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <RefreshCw size={13} className="animate-spin text-[#DC2626]" />
                              <span>Sedang memindai dan memisahkan teks KTP...</span>
                            </span>
                            <span>{meetingOcrProgress}%</span>
                          </div>
                          <div className="w-full bg-red-200 dark:bg-red-900/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#DC2626] h-1.5 transition-all duration-200"
                              style={{ width: `${Math.max(meetingOcrProgress, 15)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {!isScanningMeetingKtp && meetingOcrSuccess === true && (
                        <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-500 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>✓ KTP berhasil dipindai otomatis! Silakan tinjau atau sesuaikan 6 data di bawah jika diperlukan.</span>
                        </div>
                      )}

                      {!isScanningMeetingKtp && meetingOcrSuccess === false && (
                        <div className="p-2 rounded bg-sky-100 dark:bg-sky-950/40 border border-sky-400 text-[11px] text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                          <AlertCircle size={15} className="text-sky-600 shrink-0" />
                          <span>Teks KTP belum terbaca sempurna. Anda dapat melengkapi 6 kolom di bawah secara manual.</span>
                        </div>
                      )}
                    </div>

                    {/* 6 Data Hasil Pemisahan KTP (First Name, Last Name, DOB, Sex, Nationality, Citizen ID) */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-heading font-black text-slate-700 dark:text-slate-300 uppercase">
                        <span>Hasil Pemisahan Data KTP IC (Dapat Diedit Manual):</span>
                        <span className="text-[10px] font-normal text-slate-500">Wajib Lengkap</span>
                      </div>

                      {/* Baris 1: First Name & Last Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            First Name (Nama Depan) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Jack"
                            value={meetingForm.firstName}
                            onChange={(e) => {
                              const fName = e.target.value;
                              setMeetingForm({
                                ...meetingForm,
                                firstName: fName,
                                characterName: `${fName} ${meetingForm.lastName}`.trim(),
                              });
                            }}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Last Name (Nama Belakang) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Sullivan"
                            value={meetingForm.lastName}
                            onChange={(e) => {
                              const lName = e.target.value;
                              setMeetingForm({
                                ...meetingForm,
                                lastName: lName,
                                characterName: `${meetingForm.firstName} ${lName}`.trim(),
                              });
                            }}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>
                      </div>

                      {/* Baris 2: DOB & Sex */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            DOB (Date of Birth / Tanggal Lahir) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: 1995-04-12 atau 12/04/1995"
                            value={meetingForm.dob}
                            onChange={(e) => setMeetingForm({ ...meetingForm, dob: e.target.value })}
                            className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Sex (Jenis Kelamin) *
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setMeetingForm({ ...meetingForm, sex: "Male" })}
                              className={`py-2 px-3 rounded text-xs font-heading font-black border-2 border-black transition-all ${
                                meetingForm.sex === "Male"
                                  ? "bg-[#FACC15] text-[#111827] shadow-[2px_2px_0px_#000]"
                                  : "bg-white dark:bg-[#20232E] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              ♂ Male (Laki-laki)
                            </button>
                            <button
                              type="button"
                              onClick={() => setMeetingForm({ ...meetingForm, sex: "Female" })}
                              className={`py-2 px-3 rounded text-xs font-heading font-black border-2 border-black transition-all ${
                                meetingForm.sex === "Female"
                                  ? "bg-[#DC2626] text-white shadow-[2px_2px_0px_#000]"
                                  : "bg-white dark:bg-[#20232E] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              ♀ Female (Perempuan)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Baris 3: Nationality & Citizen ID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Nationality (Kewarganegaraan) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Sandy Shores / Blaine County / Los Santos"
                            value={meetingForm.nationality}
                            onChange={(e) => setMeetingForm({ ...meetingForm, nationality: e.target.value })}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                            Citizen ID (IC) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: CTZ-9481 atau 18942"
                            value={meetingForm.citizenId}
                            onChange={(e) => setMeetingForm({ ...meetingForm, citizenId: e.target.value })}
                            className="input-field w-full text-xs font-mono font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian Asal Instansi & Topik Pertemuan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Asal Instansi / Fraksi / Komunitas *
                      </label>
                      <BrutalistSelect
                        value={meetingForm.agencyName}
                        onChange={(val) => setMeetingForm({ ...meetingForm, agencyName: val })}
                        options={AGENCY_OPTIONS}
                        ariaLabel="Pilih Asal Instansi / Komunitas"
                      />

                      {/* Wajib Tulis jika memilih Organisasi / Komunitas Lain */}
                      {meetingForm.agencyName === "Organisasi / Komunitas / Paguyuban Lain" && (
                        <div className="mt-2.5 animate-fadeIn">
                          <label className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] block mb-1">
                            Tuliskan Nama Organisasi / Komunitas Anda * (Wajib Diisi)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Paguyuban Truk Sandy, Komunitas Pemancing, Klub Motor, dll."
                            value={meetingForm.agencyNameOther || ""}
                            onChange={(e) => setMeetingForm({ ...meetingForm, agencyNameOther: e.target.value })}
                            className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-[#DC2626] dark:border-[#FACC15] shadow-[2px_2px_0px_#000]"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Nomor Telepon IC *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 555-0192 / 210499"
                        value={meetingForm.phoneNumber}
                        onChange={(e) => setMeetingForm({ ...meetingForm, phoneNumber: e.target.value })}
                        className="input-field w-full text-xs font-mono py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Tag / Username Discord (OOC)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: @jacksullivan"
                        value={meetingForm.discordTag}
                        onChange={(e) => setMeetingForm({ ...meetingForm, discordTag: e.target.value })}
                        className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Topik Pokok Pertemuan *
                    </label>
                    <BrutalistSelect
                      value={meetingForm.meetingTopic}
                      onChange={(val) => setMeetingForm({ ...meetingForm, meetingTopic: val })}
                      options={TOPIC_OPTIONS}
                      ariaLabel="Pilih Topik Pokok Pertemuan"
                    />

                    {/* Wajib Tulis jika memilih Topik Khusus Lainnya */}
                    {meetingForm.meetingTopic === "Topik Khusus Lainnya" && (
                      <div className="mt-2.5 animate-fadeIn">
                        <label className="text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15] block mb-1">
                          Tuliskan Pokok Topik Khusus Pertemuan Anda * (Wajib Diisi)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Tuliskan pokok topik khusus yang ingin dibahas bersama pengurus..."
                          value={meetingForm.meetingTopicOther || ""}
                          onChange={(e) => setMeetingForm({ ...meetingForm, meetingTopicOther: e.target.value })}
                          className="input-field w-full text-xs font-bold py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-[#DC2626] dark:border-[#FACC15] shadow-[2px_2px_0px_#000]"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-heading font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Rincian Agenda & Poin Pembahasan *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Jelaskan secara singkat apa saja yang ingin dibahas bersama jajaran pengurus LSM PPS..."
                      value={meetingForm.agendaDetail}
                      onChange={(e) => setMeetingForm({ ...meetingForm, agendaDetail: e.target.value })}
                      className="input-field w-full text-xs py-2 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Usulan Tanggal *
                      </label>
                      <BrutalistDatePicker
                        value={meetingForm.preferredDate}
                        onChange={(val) => setMeetingForm({ ...meetingForm, preferredDate: val })}
                        placeholder="Klik untuk pilih tanggal..."
                        readOnlyInput={true}
                        dropUp={true}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Usulan Waktu / Jam
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 20:00 - 22:00 IC"
                        value={meetingForm.preferredTime}
                        onChange={(e) => setMeetingForm({ ...meetingForm, preferredTime: e.target.value })}
                        className="input-field w-full text-xs py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Tempat Pertemuan (Tempat / Koordinat) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Cth: Resto Pizza Sandy Shores / Koordinat X: 1420, Y: 3620"
                        value={meetingForm.meetingLocation}
                        onChange={(e) => setMeetingForm({ ...meetingForm, meetingLocation: e.target.value })}
                        className="input-field w-full text-xs font-bold py-1.5 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white border-2 border-black shadow-[3px_3px_0px_#000] font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>{isSubmitting ? "Mengajukan Jadwal..." : "Ajukan Permohonan Pertemuan"}</span>
                  </button>
                </form>
              )}

              {/* TAB 3: LACAK STATUS PENGAJUAN (TRACKING & DISCORD VISITOR LINK) */}
              {activeTab === "tracking" && (
                <div className="flex flex-col gap-4">
                  <div className="p-3 rounded bg-sky-50 dark:bg-sky-950/20 border-2 border-sky-300 dark:border-sky-700/60 text-xs text-sky-950 dark:text-sky-200 flex items-start gap-2">
                    <Search size={16} className="text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Lacak Status Tiket & Koordinasi Pertemuan:</strong> Masukkan kode tiket resmi (contoh: <code>#PPS-1234</code>) atau nomor telepon IC kamu untuk memeriksa apakah pengajuan telah disetujui serta mengecek instruksi pertemuan dari pengurus LSM PPS.
                    </div>
                  </div>

                  {/* Riwayat Tiket di Browser Ini */}
                  {visitorTickets.length > 0 && (
                    <div className="p-2.5 rounded bg-slate-100 dark:bg-[#1A1D26] border border-black/15 dark:border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-500 text-[11px] block sm:inline">
                        Tiket Anda di Perangkat Ini:
                      </span>
                      {visitorTickets.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery(t.id);
                            handlePerformSearch(t.id);
                          }}
                          className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-white dark:bg-[#20232E] border border-black dark:border-slate-600 hover:bg-[#FACC15] dark:hover:bg-[#FACC15] hover:text-black transition-colors"
                          title="Klik untuk langsung melacak tiket ini"
                        >
                          #{t.id}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Form Pencarian Tiket */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePerformSearch();
                    }}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ketik Kode Tiket (cth: PPS-1234 atau 1234) / No. Telepon IC..."
                        className="input-field w-full text-xs font-mono py-2.5 px-3 bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[2px_2px_0px_#000]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="btn py-2.5 px-5 bg-sky-500 hover:bg-sky-600 text-white border-2 border-black shadow-[2px_2px_0px_#000] font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                      <span>{isSearching ? "Mencari..." : "Cek Status"}</span>
                    </button>
                  </form>

                  {/* Hasil Pencarian */}
                  {hasSearched && (
                    <div className="flex flex-col gap-3 mt-1">
                      {searchResults.length === 0 ? (
                        <div className="p-6 text-center rounded bg-slate-50 dark:bg-[#1E212B] border-2 border-dashed border-black/30 dark:border-slate-600 text-slate-500 text-xs space-y-1.5">
                          <AlertCircle size={24} className="mx-auto text-amber-500" />
                          <h4 className="font-heading font-black text-sm text-slate-800 dark:text-slate-200 uppercase">
                            Tiket Tidak Ditemukan
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                            Pastikan format kode tiket (contoh: <code>#PPS-1234</code>) atau nomor telepon IC yang Anda masukkan sudah sama persis saat pengajuan.
                          </p>
                        </div>
                      ) : (
                        searchResults.map((ticket) => {
                          const isLapak = ticket.type === "lapak";
                          const status = ticket.status || "pending";

                          let badgeColor = "bg-amber-100 text-amber-900 border-amber-500";
                          let statusLabel = "⏳ MENUNGGU VERIFIKASI PENGURUS";
                          let statusDesc =
                            "Pengajuan kamu telah masuk ke sistem dan sedang dalam antrean evaluasi pengurus LSM PPS. Silakan isi data di channel Discord visitor untuk kelancaran verifikasi.";

                          if (status === "approved") {
                            badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-500";
                            statusLabel = "✅ RESMI DISETUJUI";
                            statusDesc =
                              "Selamat! Pengajuan kamu telah DISETUJUI oleh pengurus LSM PPS. Silakan cek catatan instruksi pengurus di bawah untuk detail pertemuan IC.";
                          } else if (status === "completed") {
                            badgeColor = "bg-blue-100 text-blue-900 border-blue-500";
                            statusLabel = "🎉 SELESAI / TEREALISASI";
                            statusDesc =
                              "Kegiatan / penggunaan stan lapak ini telah selesai terlaksana bersama pihak pengurus.";
                          } else if (status === "rejected") {
                            badgeColor = "bg-red-100 text-red-900 border-red-500";
                            statusLabel = "❌ BELUM DISETUJUI / DITOLAK";
                            statusDesc =
                              "Mohon maaf, pengajuan ini saat ini belum dapat disetujui atau dibatalkan oleh pihak pengurus. Silakan cek catatan di bawah.";
                          }

                          return (
                            <div
                              key={ticket.id}
                              className="card-brutal p-4 rounded bg-[#FFFDF9] dark:bg-[#20232E] border-2 border-black dark:border-[#475569] shadow-[4px_4px_0px_#000] flex flex-col gap-3 text-xs"
                            >
                              {/* Header Status Tiket */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/15 dark:border-white/15">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-heading font-black border uppercase ${badgeColor}`}
                                  >
                                    {statusLabel}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-heading font-black border border-black uppercase ${
                                      isLapak ? "bg-[#FACC15] text-[#111827]" : "bg-[#DC2626] text-white"
                                    }`}
                                  >
                                    {isLapak ? "🏪 Stan Lapak UMKM" : "🤝 Permohonan Pertemuan"}
                                  </span>
                                  <span className="font-mono font-black text-sm text-[#DC2626] dark:text-[#FACC15]">
                                    #{ticket.id}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("id-ID") : "-"}
                                </span>
                              </div>

                              {/* Deskripsi Status */}
                              <div className="p-2.5 rounded bg-slate-100 dark:bg-[#1A1D26] border border-black/10 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200">
                                {statusDesc}
                              </div>

                              {/* Arahan Discord Visitor Box */}
                              <div className="p-3.5 rounded bg-indigo-50 dark:bg-indigo-950/25 border-2 border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                <div className="space-y-0.5">
                                  <div className="font-heading font-black text-xs uppercase text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-[#5865F2]" />
                                    <span>Channel Visitor Discord Resmi LSM PPS</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                    Tautan invite ini otomatis mengarahkan Anda langsung mendarat di channel visitor untuk mengisi data dan koordinasi meeting dengan pengurus.
                                  </p>
                                </div>
                                <a
                                  href={DISCORD_VISITOR_CHANNEL_URL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn shrink-0 py-2 px-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-heading font-black border border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                                >
                                  <span>Buka Channel Langsung</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>

                              {/* Catatan / Balasan Khusus dari Pengurus LSM PPS */}
                              {ticket.adminNotes ? (
                                <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-600 flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 font-heading font-black text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                    <MessageSquare size={14} />
                                    <span>Pesan / Instruksi dari Pengurus LSM PPS:</span>
                                  </div>
                                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                                    {ticket.adminNotes}
                                  </p>
                                </div>
                              ) : (
                                <div className="p-2 rounded bg-slate-50 dark:bg-[#1A1D26] text-[11px] text-slate-500 italic">
                                  Belum ada catatan khusus dari pengurus. Pengurus akan menghubungi Anda via Telepon IC / Discord.
                                </div>
                              )}

                              {/* Detail Data Tiket */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-black/10 dark:border-white/10 font-mono text-[11px]">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">NAMA KTP (IC):</span>
                                  <strong className="text-slate-900 dark:text-slate-100">
                                    {ticket.firstName ? `${ticket.firstName} ${ticket.lastName}` : (ticket.namaKtp || ticket.characterName)}
                                  </strong>
                                  {(ticket.dob || ticket.sex || ticket.nationality) && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                                      {[ticket.dob && `DOB: ${ticket.dob}`, ticket.sex, ticket.nationality].filter(Boolean).join(" • ")}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">CITIZEN ID (IC):</span>
                                  <strong className="text-slate-900 dark:text-slate-100 font-mono">
                                    {ticket.citizenId || "-"}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">KONTAK (IC & DISCORD):</span>
                                  <div className="flex flex-col gap-0.5 text-xs font-mono">
                                    <span>📞 No. IC: <strong className="text-slate-900 dark:text-slate-100">{ticket.phoneNumber || "-"}</strong></span>
                                    {ticket.discordTag && (
                                      <span className="text-slate-600 dark:text-slate-400">💬 Discord: <strong className="text-slate-900 dark:text-slate-100">{ticket.discordTag}</strong></span>
                                    )}
                                  </div>
                                </div>

                                {ticket.fotoWajahIc && (
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">DOKUMEN KTP IC:</span>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhoto(ticket.fotoWajahIc)}
                                      className="text-xs text-sky-600 dark:text-sky-400 underline font-bold flex items-center gap-1"
                                    >
                                      <span>Lihat Gambar KTP</span>
                                      <Camera size={12} />
                                    </button>
                                  </div>
                                )}

                                {isLapak ? (
                                  <>
                                    <div>
                                      <span className="text-slate-500 block text-[10px]">NAMA USAHA & KATEGORI:</span>
                                      <strong className="text-[#DC2626] dark:text-[#FACC15]">{ticket.businessName}</strong> ({ticket.businessType})
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[10px]">LOKASI DI SANDY SHORES:</span>
                                      <strong>{ticket.preferredLocation}</strong>
                                    </div>
                                    {ticket.facilityNeeds && (
                                      <div className="sm:col-span-2">
                                        <span className="text-slate-500 block text-[10px]">KEBUTUHAN FASILITAS:</span>
                                        <span>{ticket.facilityNeeds}</span>
                                      </div>
                                    )}
                                    <div className="sm:col-span-2">
                                      <span className="text-slate-500 block text-[10px]">STATUS MOU:</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Telah Disetujui Pemohon</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <span className="text-slate-500 block text-[10px]">ASAL INSTANSI / FRAKSI:</span>
                                      <strong className="text-[#DC2626] dark:text-[#FACC15]">{ticket.agencyName}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[10px]">TOPIK PERTEMUAN:</span>
                                      <strong>{ticket.meetingTopic}</strong>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <span className="text-slate-500 block text-[10px]">RINCIAN AGENDA:</span>
                                      <p className="whitespace-pre-line text-slate-800 dark:text-slate-200">{ticket.agendaDetail}</p>
                                    </div>
                                    <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1 text-[10px] text-slate-600 dark:text-slate-400">
                                      <span>📅 Tanggal: <strong>{ticket.preferredDate}</strong></span>
                                      <span>⏰ Jam: <strong>{ticket.preferredTime}</strong></span>
                                      <span>📍 Tempat: <strong>{ticket.meetingLocation}</strong></span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox / Modal Preview Foto Wajah / Dokumen KTP IC */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-brutal p-4 bg-white dark:bg-[#1E212B] border-3 border-black max-w-2xl w-full rounded-lg flex flex-col gap-3 shadow-[8px_8px_0px_#000] max-h-[92vh]"
          >
            <div className="flex items-center justify-between w-full pb-2 border-b-2 border-black/15 dark:border-white/15">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#DC2626] dark:text-[#FACC15]" />
                <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                  Lampiran Dokumen KTP (IC)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded border-2 border-black bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 flex items-center justify-center font-bold text-sm shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                title="Tutup Preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-950 rounded-lg p-2 flex items-center justify-center border-2 border-black/30 min-h-[260px] max-h-[60vh] overflow-hidden">
              <img
                src={previewPhoto}
                alt="Dokumen KTP IC"
                className="max-h-[58vh] w-auto max-w-full object-contain rounded"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-[11px] text-slate-500 font-mono">
                💡 Dokumen KTP identitas warga Sandy Shores.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openImageSafely(previewPhoto, "KTP-IC-Sandy-Shores")}
                  className="btn py-1.5 px-3 bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 hover:bg-slate-100"
                >
                  <ExternalLink size={13} />
                  <span>Buka di Tab Baru</span>
                </button>
                <a
                  href={previewPhoto}
                  download="KTP_IC_SandyShores.jpg"
                  className="btn py-1.5 px-3 bg-[#FACC15] text-[#111827] text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 hover:bg-yellow-400"
                >
                  <span>Unduh Foto</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="btn py-1.5 px-3.5 bg-slate-800 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
