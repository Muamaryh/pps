// Default team members mapping if not yet customized in cloud data
export const DEFAULT_SUB_MEMBERS = {
  "EVAN S KENNEDY": [
    { name: "Staff Khusus Pimpinan", role: "Ajudan & Asisten Operasional", photo: "" },
  ],
  "MR.B": [
    { name: "Anggota Kehormatan", role: "Staf Ahli Kebijakan Komunitas", photo: "" },
  ],
  "MANG KUMIS": [
    { name: "Satgas Lapangan 1", role: "Pengawas Lapangan Pesisir", photo: "" },
  ],
  "DE BRACUK": [
    { name: "Satgas Lapangan 2", role: "Pengawas Hubungan Antar-Warga", photo: "" },
  ],
  "VINO": [
    { name: "Rendi Pratama", role: "Staf Administrasi & Notulensi", photo: "" },
    { name: "Deni Sanjaya", role: "Staf Pengarsipan Surat & Berkas", photo: "" },
  ],
  "ANNELIESE & DARREN": [
    { name: "Clara Wijaya", role: "Staf Pembukuan Kas Harian", photo: "" },
    { name: "Toni Kusuma", role: "Staf Rekap Iuran & Audit Anggota", photo: "" },
  ],
  "GIBBON": [
    { name: "Fajar Nugraha", role: "Staf Publikasi & Media Warga", photo: "" },
    { name: "Bayu Saputra", role: "Staf Komunikasi Eksternal & Warga", photo: "" },
  ],
  "WAZA": [
    { name: "Rian Hidayat", role: "Staf Gudang & Inventaris", photo: "" },
    { name: "Joko Prabowo", role: "Staf Distribusi Stand & Tenda UMKM", photo: "" },
    { name: "Budi Santoso", role: "Staf Pengadaan Perlengkapan Kegiatan", photo: "" },
  ],
  "BENTO": [
    { name: "Agus Perkasa", role: "Satgas Pengamanan Lapak 01", photo: "" },
    { name: "Hendro Wibowo", role: "Satgas Patroli Wilayah 02", photo: "" },
    { name: "Yudi Santosa", role: "Satgas Penertiban Koordinat 1012", photo: "" },
  ],
  "KRAI ANDORYU & RIZMAN": [
    { name: "Dimas Anggara", role: "Kreator Konten & Dokumentasi Visual", photo: "" },
    { name: "Aldi Setiawan", role: "Operator Siaran & Desain Media", photo: "" },
  ],
  "MULA IDARI": [
    { name: "Sandi Kurnia", role: "Koordinator Lapangan Sektor Pesisir", photo: "" },
    { name: "Eko Wahyudi", role: "Petugas Penghubung Tokoh Warga", photo: "" },
  ],
};

export function getSubMembers(member) {
  if (!member) return [];
  if (Array.isArray(member.subMembers) && member.subMembers.length > 0) {
    return member.subMembers;
  }
  if (Array.isArray(member.team) && member.team.length > 0) {
    return member.team.map((t) =>
      typeof t === "string" ? { name: t, role: `Anggota Tim ${member.role || ""}`, photo: "" } : t
    );
  }
  return DEFAULT_SUB_MEMBERS[member.name] || [];
}
