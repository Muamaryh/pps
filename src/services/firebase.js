// ==========================================================================
// FIREBASE FIRESTORE SERVICE - PIZZA SANDY SHORES
// ==========================================================================

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtipNgmsCRHweROy71Wz1a1WMe9nimMew",
  authDomain: "branda-pps.firebaseapp.com",
  projectId: "branda-pps",
  storageBucket: "branda-pps.firebasestorage.app",
  messagingSenderId: "89910079254",
  appId: "1:89910079254:web:330207d5a53354d715ea37"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const CONFIG_DOC_PATH = ["pps_website", "config"];

export function sanitizeSandyShores(data) {
  if (!data) return data;
  try {
    const jsonStr = JSON.stringify(data);
    const replaced = jsonStr
      .replace(/SHANDYSHORE/g, "SANDY SHORES")
      .replace(/Shandyshore/g, "Sandy Shores")
      .replace(/shandyshore/g, "sandy shores")
      .replace(/Shandy Shore/g, "Sandy Shores")
      .replace(/SHANDY SHORE/g, "SANDY SHORES");
    return JSON.parse(replaced);
  } catch {
    return data;
  }
}

export const defaultData = {
  brand: "PIZZA SANDY SHORES",
  navLinks: "Beranda | #home, Tentang | #about, Struktur | #structure, Galeri | #gallery, Discord | https://discord.gg/92QASf3fus, Daftar Anggota | https://daftaranggotapaps.netlify.app/",
  heading: "LEMBAGA SWADAYA MASYARAKAT PAGUYUBAN PIZZA SANDY SHORES",
  subtext: "Bersatu • Berkarya • Untuk Masyarakat Sandy Shores",
  aboutText: "Kehidupan bermasyarakat merupakan salah satu unsur penting dalam membangun lingkungan yang aman, tertib, harmonis, dan sejahtera. Dalam kehidupan masyarakat Sandy Shores, diperlukan adanya wadah yang mampu menyatukan berbagai lapisan masyarakat, menampung aspirasi warga, serta mendorong terciptanya hubungan yang baik antara masyarakat, pelaku usaha, dan pemerintah.\n\nBerangkat dari semangat kebersamaan, solidaritas, dan kepedulian terhadap lingkungan sekitar, terbentuklah Lembaga Swadaya Masyarakat (LSM) Paguyuban Pizza Sandy Shores. Organisasi ini hadir sebagai wadah bagi masyarakat untuk berkumpul, berorganisasi, menyampaikan aspirasi, serta melaksanakan berbagai kegiatan sosial dan kemasyarakatan yang memberikan manfaat bagi warga Sandy Shores.\n\nPendirian LSM Paguyuban Pizza Sandy Shores dilandasi oleh keinginan untuk membangun masyarakat yang lebih kompak, mandiri, dan memiliki kepedulian terhadap kepentingan bersama. Organisasi ini tidak hanya berorientasi pada kegiatan perkumpulan, tetapi juga berupaya menjalankan fungsi sosial melalui kegiatan penggalangan dana, bantuan kemasyarakatan, pertemuan warga, kegiatan olahraga bersama, serta berbagai program yang dapat mempererat persaudaraan dan meningkatkan kesejahteraan masyarakat.\n\nSelain menjalankan kegiatan sosial, LSM Paguyuban Pizza Sandy Shores juga berkomitmen menjadi jembatan komunikasi antara masyarakat dan Government Ime City. Melalui dialog, musyawarah, penyampaian aspirasi, dan kerja sama yang konstruktif, organisasi ini diharapkan mampu membantu menciptakan solusi atas berbagai persoalan masyarakat serta mendorong kebijakan yang memperhatikan kebutuhan warga.\n\nSejalan dengan tujuan tersebut, LSM Paguyuban Pizza Sandy Shores berinisiatif mengembangkan program pemberdayaan ekonomi masyarakat melalui penyediaan dan pengelolaan lapak dagang, pendirian stand usaha, serta pengembangan fasilitas pembelajaran bagi warga. Program-program tersebut diharapkan dapat membuka kesempatan usaha, mendorong kemandirian ekonomi, dan menyediakan ruang yang bermanfaat bagi aktivitas masyarakat Sandy Shores, dengan tetap mengikuti ketentuan dan perizinan yang berlaku.\n\nDengan berlandaskan nilai solidaritas, gotong royong, keterbukaan, dan tanggung jawab, LSM Paguyuban Pizza Sandy Shores bertekad menjadi organisasi yang aktif, tertib, dan bermanfaat bagi masyarakat. Oleh karena itu, dukungan serta kerja sama dari Government Ime City sangat diharapkan agar seluruh program dan kegiatan organisasi dapat terlaksana secara terarah, terkoordinasi, dan memberikan dampak positif bagi kemajuan Sandy Shores.\n\nMelalui pembentukan LSM Paguyuban Pizza Sandy Shores, diharapkan tercipta sebuah wadah organisasi yang mampu menyatukan masyarakat, memperjuangkan aspirasi secara bertanggung jawab, mengembangkan potensi ekonomi lokal, serta berkontribusi dalam mewujudkan lingkungan Sandy Shores yang lebih maju, sejahtera, dan harmonis.",
  
  org: [
    { level: 1, role: "Ketua Umum", name: "EVAN S KENNEDY", photo: "" },
    { level: 2, role: "Penasihat", name: "MR.B", photo: "" },
    { level: 3, role: "Wakil Ketua Umum Penggerak", name: "MANG KUMIS", photo: "" },
    { level: 3, role: "Wakil Ketua Umum Penggerak", name: "DE BRACUK", photo: "" },
    { level: 4, role: "Sekjen", name: "VINO", photo: "" },
    { level: 4, role: "Bendahara", name: "ANNELIESE & DARREN", photo: "" },
    { level: 4, role: "Humas", name: "GIBBON", photo: "" },
    { level: 4, role: "Logistik", name: "WAZA", photo: "" },
    { level: 5, role: "Korda Mula Idari", name: "MULA IDARI", photo: "" },
    { level: 5, role: "Korda Keamanan", name: "BENTO", photo: "" },
    { level: 5, role: "Korda Media LSM", name: "KRAI ANDORYU & RIZMAN", photo: "" }
  ],

  gallery: [
    {
      title: "Aksi Berbagi Untuk Warga",
      desc: "Makan, berbagi, dan peduli untuk sesama. Kegiatan sosial LSM Pizza Sandy Shores — hadir untuk masyarakat.",
      date: "Kamis, 15 Oktober 2026",
      location: "SS Area",
      photo: ""
    }
  ],

  // 4 Pilar Fokus Lapangan (Hero)
  heroPillars: [
    { label: "Wilayah Kerja", title: "Sandy Shores & Sekitarnya" },
    { label: "Pemberdayaan UMKM", title: "Pengelolaan Lapak Warga" },
    { label: "Solidaritas Sosial", title: "Aksi Gotong Royong Warga" },
    { label: "Advokasi Aspirasi", title: "Mitra Dialog Pemerintah Kota" }
  ],

  // Header Section Tentang Kami
  aboutHeader: {
    label: "TENTANG KAMI",
    title: "Profil & Arah Gerakan PPS",
    badge: "MANIFESTO RESMI"
  },

  // 3 Program Unggulan (Tentang Kami)
  aboutPillars: [
    {
      badge: "Kepedulian Warga",
      title: "Solidaritas & Aksi Sosial",
      desc: "Menghidupkan gotong royong warga melalui bakti sosial, pertemuan rutin, serta kepedulian nyata bagi warga yang membutuhkan di kawasan Sandy Shores.",
      status: "Program Aktif Berkelanjutan"
    },
    {
      badge: "Kemandirian Usaha",
      title: "Pemberdayaan UMKM",
      desc: "Mendorong kemandirian ekonomi warga melalui penyediaan stand usaha, pengelolaan lapak dagang berizin, serta pembinaan keterampilan usaha lokal.",
      status: "Program Aktif Berkelanjutan"
    },
    {
      badge: "Jembatan Komunikasi",
      title: "Advokasi & Aspirasi Kota",
      desc: "Menjadi mitra dialog yang konstruktif bagi Government Ime City dalam menyalurkan suara warga demi terciptanya kebijakan publik yang adil dan terbuka.",
      status: "Program Aktif Berkelanjutan"
    }
  ],

  // Visi & Misi Lembaga
  visionMission: {
    visionLabel: "Visi Komunitas",
    visionTitle: "“Terwujudnya Masyarakat Sandy Shores yang Kompak, Mandiri, dan Bermartabat Bersama.”",
    visionDesc: "Kemajuan suatu kawasan bertumpu pada solidaritas warganya. Melalui gotong royong dan keterbukaan, LSM Paguyuban Pizza Sandy Shores berikhtiar merangkul setiap potensi demi lingkungan yang tertib, harmonis, dan mandiri.",
    missionTitle: "Misi Pokok Lembaga:",
    missionItems: [
      "Menampung dan memperjuangkan aspirasi warga secara bertanggung jawab ke otoritas kota.",
      "Membuka ruang usaha mandiri melalui fasilitas stan & lapak UMKM warga berizin.",
      "Menggerakkan aksi sosial, pertemuan warga, dan kegiatan kebersamaan yang teratur."
    ]
  },

  charterTitle: "Naskah Pendirian & Penjelasan Lengkap LSM",

  adminPass: "pps123123"
};

export function mergeWithDefaults(cloudData) {
  if (!cloudData) return defaultData;
  return {
    ...defaultData,
    ...cloudData,
    heroPillars: cloudData.heroPillars || defaultData.heroPillars,
    aboutHeader: { ...defaultData.aboutHeader, ...(cloudData.aboutHeader || {}) },
    aboutPillars: cloudData.aboutPillars || defaultData.aboutPillars,
    visionMission: { ...defaultData.visionMission, ...(cloudData.visionMission || {}) },
    charterTitle: cloudData.charterTitle || defaultData.charterTitle,
  };
}

// Helper: split items into safe chunks well under the 1MB Firestore limit (~350KB each)
function chunkArray(items, maxChunkBytes = 350000) {
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;
  for (const item of items) {
    const itemSize = JSON.stringify(item).length;
    if (currentChunk.length > 0 && currentSize + itemSize > maxChunkBytes) {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentSize = itemSize;
    } else {
      currentChunk.push(item);
      currentSize += itemSize;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
}

export async function loadCloudData() {
  try {
    const docRef = doc(db, ...CONFIG_DOC_PATH);
    const docSnap = await getDoc(docRef);

    let rawData = docSnap.exists() ? docSnap.data() : { ...defaultData };
    let data = mergeWithDefaults(sanitizeSandyShores(rawData));

    // 1. Load Org members from separate doc if available
    try {
      const orgSnap = await getDoc(doc(db, "pps_website", "org"));
      if (orgSnap.exists() && Array.isArray(orgSnap.data()?.items)) {
        data.org = orgSnap.data().items;
      }
    } catch (e) {
      console.warn("Notice loading org collection:", e);
    }

    // 2. Load Gallery from chunks or separate doc if available
    try {
      const metaSnap = await getDoc(doc(db, "pps_website", "gallery_meta"));
      if (metaSnap.exists()) {
        const { chunkCount } = metaSnap.data();
        const promises = [];
        for (let i = 0; i < (chunkCount || 1); i++) {
          promises.push(getDoc(doc(db, "pps_website", "gallery_" + i)));
        }
        const chunkSnaps = await Promise.all(promises);
        let loadedGallery = [];
        chunkSnaps.forEach((s) => {
          if (s.exists() && Array.isArray(s.data()?.items)) {
            loadedGallery = loadedGallery.concat(s.data().items);
          }
        });
        if (loadedGallery.length > 0) {
          data.gallery = loadedGallery;
        }
      } else {
        const galSnap = await getDoc(doc(db, "pps_website", "gallery"));
        if (galSnap.exists() && Array.isArray(galSnap.data()?.items)) {
          data.gallery = galSnap.data().items;
        }
      }
    } catch (e) {
      console.warn("Notice loading gallery collection:", e);
    }

    // Ensure navLinks has Discord & Daftar Anggota
    if (!data.navLinks || !data.navLinks.includes("discord.gg")) {
      data.navLinks = defaultData.navLinks;
    }

    localStorage.setItem("pps_cached_data", JSON.stringify(data));
    return data;
  } catch (err) {
    console.warn("Firestore connection notice, using local cache or default fallback:", err);
    const cached = localStorage.getItem("pps_cached_data");
    if (cached) {
      try {
        let parsed = mergeWithDefaults(sanitizeSandyShores(JSON.parse(cached)));
        if (!parsed.navLinks || !parsed.navLinks.includes("discord.gg")) {
          parsed.navLinks = defaultData.navLinks;
        }
        return parsed;
      } catch {
        return defaultData;
      }
    }
    return defaultData;
  }
}

export async function saveCloudData(newData) {
  try {
    // 1. Save Org to pps_website/org (Dedicated 1MB limit for members)
    const orgItems = newData.org || [];
    await setDoc(doc(db, "pps_website", "org"), {
      items: orgItems,
      updatedAt: new Date().toISOString(),
    });

    // 2. Save Gallery with automatic chunking (Uncapped capacity, supports unlimited photos!)
    const galleryItems = newData.gallery || [];
    const chunks = chunkArray(galleryItems, 350000);
    const chunkCount = Math.max(chunks.length, 1);

    await setDoc(doc(db, "pps_website", "gallery_meta"), {
      chunkCount: chunks.length,
      totalItems: galleryItems.length,
      updatedAt: new Date().toISOString(),
    });

    const chunkPromises = chunks.map((chunk, i) =>
      setDoc(doc(db, "pps_website", "gallery_" + i), {
        items: chunk,
        updatedAt: new Date().toISOString(),
      })
    );
    await Promise.all(chunkPromises);

    if (chunks.length > 0) {
      await setDoc(doc(db, "pps_website", "gallery"), {
        items: chunks[0],
        updatedAt: new Date().toISOString(),
      });
    }

    // Clean up any old unused chunks (if total chunks decreased)
    for (let i = chunks.length; i < 15; i++) {
      try {
        await deleteDoc(doc(db, "pps_website", "gallery_" + i));
      } catch {}
    }

    // 3. Save clean config to pps_website/config (Text-only, ~3KB, never hits 1MB limit!)
    const cleanConfig = { ...newData };
    delete cleanConfig.org;
    delete cleanConfig.gallery;
    cleanConfig._storageVersion = 2;
    cleanConfig.updatedAt = new Date().toISOString();

    await setDoc(doc(db, ...CONFIG_DOC_PATH), cleanConfig);

    // 4. Update local cache
    localStorage.setItem("pps_cached_data", JSON.stringify(newData));
    return true;
  } catch (err) {
    console.error("Critical error in saveCloudData:", err);
    throw err;
  }
}

export async function resetCloudData() {
  const cleanConfig = { ...defaultData };
  delete cleanConfig.org;
  delete cleanConfig.gallery;
  cleanConfig._storageVersion = 2;
  await setDoc(doc(db, ...CONFIG_DOC_PATH), cleanConfig);

  await setDoc(doc(db, "pps_website", "org"), { items: defaultData.org || [] });

  await setDoc(doc(db, "pps_website", "gallery_meta"), {
    chunkCount: 1,
    totalItems: (defaultData.gallery || []).length,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "pps_website", "gallery_0"), { items: defaultData.gallery || [] });
  await setDoc(doc(db, "pps_website", "gallery"), { items: defaultData.gallery || [] });

  localStorage.setItem("pps_cached_data", JSON.stringify(defaultData));
  return defaultData;
}
