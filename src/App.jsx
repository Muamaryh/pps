import React, { useState, useEffect } from "react";
import { loadCloudData, defaultData } from "./services/firebase";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import OrgStructure from "./components/OrgStructure";
import Gallery from "./components/Gallery";
import Footer from "./components/Footer";
import LightboxModal from "./components/LightboxModal";
import AdminModal from "./components/AdminModal";
import ServicePortalModal from "./components/ServicePortalModal";
import MemberRegistrationModal from "./components/MemberRegistrationModal";
import MembersDirectoryModal from "./components/MembersDirectoryModal";
import Toast from "./components/Toast";
import FloatingActions from "./components/FloatingActions";
import PizzaLoader from "./components/PizzaLoader";

export default function App() {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pps_active_theme") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("pps_active_theme", theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  // Load Firestore Cloud Data on Mount
  useEffect(() => {
    async function fetchData() {
      const startTime = Date.now();
      try {
        const cloud = await loadCloudData();
        setData(cloud);
      } catch (err) {
        console.warn("Using fallback data due to:", err);
      } finally {
        const elapsed = Date.now() - startTime;
        const minWait = 1100; // Minimum duration to enjoy the pizza eating animation smoothly
        if (elapsed < minWait) {
          setTimeout(() => setLoading(false), minWait - elapsed);
        } else {
          setLoading(false);
        }
      }
    }
    fetchData();
  }, []);

  // Lightbox State (supports multiple photos or single photo)
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    photos: [],
    photo: "",
    initialIndex: 0,
    caption: "",
    desc: "",
    location: "",
    date: "",
  });

  function handleOpenLightbox(photoOrPhotos, caption, desc = "", location = "", date = "", initialIndex = 0) {
    const photosArray = Array.isArray(photoOrPhotos)
      ? photoOrPhotos
      : photoOrPhotos
      ? [photoOrPhotos]
      : [];
    setLightbox({
      isOpen: true,
      photos: photosArray,
      photo: photosArray[0] || "",
      initialIndex: Number(initialIndex) || 0,
      caption,
      desc,
      location,
      date,
    });
  }

  function handleCloseLightbox() {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  }

  // Admin Route Management (/admin or #/admin)
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Portal Layanan Warga (Lapak UMKM & Request Meeting) (/layanan, /umkm, /meeting)
  const [servicePortalOpen, setServicePortalOpen] = useState(false);
  const [servicePortalTab, setServicePortalTab] = useState("lapak");

  // Modal Khusus Pendaftaran Anggota LSM PPS (/daftar or #daftar)
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  // Direktori Publik Anggota Terdaftar (/anggota or #anggota)
  const [membersDirectoryOpen, setMembersDirectoryOpen] = useState(false);

  useEffect(() => {
    function checkRoutes() {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      // 1. Check Admin Route
      if (path === "/admin" || path.endsWith("/admin") || hash === "#/admin" || hash === "#admin") {
        setAdminModalOpen(true);
      } else {
        setAdminModalOpen(false);
      }

      // 2. Check Member Registration Route (/daftar or #daftar)
      if (
        path === "/daftar" ||
        path.endsWith("/daftar") ||
        hash === "#/daftar" ||
        hash === "#daftar"
      ) {
        setMemberModalOpen(true);
        setMembersDirectoryOpen(false);
        setServicePortalOpen(false);
      } else {
        setMemberModalOpen(false);
      }

      // 3. Check Members Directory Route (/anggota or #anggota)
      if (
        path === "/anggota" ||
        path.endsWith("/anggota") ||
        hash === "#/anggota" ||
        hash === "#anggota"
      ) {
        setMembersDirectoryOpen(true);
        setMemberModalOpen(false);
        setServicePortalOpen(false);
      } else {
        setMembersDirectoryOpen(false);
      }

      // 4. Check Service Portal Route (/layanan, /umkm, /meeting)
      if (
        path === "/umkm" ||
        path.endsWith("/umkm") ||
        hash === "#/umkm" ||
        hash === "#umkm"
      ) {
        setServicePortalTab("lapak");
        setServicePortalOpen(true);
      } else if (
        path === "/meeting" ||
        path.endsWith("/meeting") ||
        hash === "#/meeting" ||
        hash === "#meeting"
      ) {
        setServicePortalTab("meeting");
        setServicePortalOpen(true);
      } else if (
        path === "/layanan" ||
        path.endsWith("/layanan") ||
        hash === "#/layanan" ||
        hash === "#layanan"
      ) {
        setServicePortalTab("lapak");
        setServicePortalOpen(true);
      } else {
        setServicePortalOpen(false);
      }

      // 5. Check Discord Direct Shortcut (/discord or #discord)
      if (
        path === "/discord" ||
        path.endsWith("/discord") ||
        hash === "#/discord" ||
        hash === "#discord"
      ) {
        window.location.href = "https://discord.gg/auX6XYNfgz";
      }
    }

    function handleKeyDown(e) {
      if ((e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) || (e.altKey && (e.key === "a" || e.key === "A"))) {
        e.preventDefault();
        setAdminModalOpen((prev) => {
          const next = !prev;
          if (next) {
            if (!window.location.pathname.includes("/admin")) {
              window.history.pushState(null, "", "/admin");
            }
          } else {
            if (window.location.pathname.includes("/admin") || window.location.hash.includes("admin")) {
              window.history.pushState(null, "", "/");
            }
          }
          return next;
        });
      }
    }

    checkRoutes();
    window.addEventListener("popstate", checkRoutes);
    window.addEventListener("hashchange", checkRoutes);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", checkRoutes);
      window.removeEventListener("hashchange", checkRoutes);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleCloseAdminModal() {
    setAdminModalOpen(false);
    if (window.location.pathname.includes("/admin") || window.location.hash.includes("admin")) {
      window.history.pushState(null, "", "/");
    }
  }

  function handleOpenRegister() {
    setMemberModalOpen(true);
    if (!window.location.pathname.includes("/daftar")) {
      window.history.pushState(null, "", "/daftar");
    }
  }

  function handleCloseRegister() {
    setMemberModalOpen(false);
    if (window.location.pathname.includes("/daftar") || window.location.hash.includes("daftar")) {
      window.history.pushState(null, "", "/");
    }
  }

  function handleOpenMembersDirectory() {
    setMembersDirectoryOpen(true);
    if (!window.location.pathname.includes("/anggota")) {
      window.history.pushState(null, "", "/anggota");
    }
  }

  function handleCloseMembersDirectory() {
    setMembersDirectoryOpen(false);
    if (window.location.pathname.includes("/anggota") || window.location.hash.includes("anggota")) {
      window.history.pushState(null, "", "/");
    }
  }

  function handleOpenServicePortal(tab = "lapak") {
    setServicePortalTab(tab);
    setServicePortalOpen(true);
    if (!window.location.pathname.includes("/layanan")) {
      window.history.pushState(null, "", "/layanan");
    }
  }

  function handleCloseServicePortal() {
    setServicePortalOpen(false);
    if (
      window.location.pathname.includes("/layanan") ||
      window.location.pathname.includes("/umkm") ||
      window.location.pathname.includes("/meeting") ||
      window.location.hash.includes("layanan") ||
      window.location.hash.includes("umkm") ||
      window.location.hash.includes("meeting")
    ) {
      window.history.pushState(null, "", "/");
    }
  }

  // Toast Alerts State
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = "info") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Extract Discord and Register URLs from navLinks if customized
  let discordUrl = "https://discord.gg/auX6XYNfgz";
  let registerUrl = "https://daftaranggotapaps.netlify.app/";

  if (data.navLinks) {
    const items = data.navLinks.split(",");
    for (const item of items) {
      const parts = item.split("|");
      if (parts.length === 2) {
        const name = parts[0].trim().toLowerCase();
        const url = parts[1].trim();
        if (name.includes("discord")) discordUrl = url;
        if (name.includes("daftar")) registerUrl = url;
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-[#FACC15] selection:text-[#111827]">
      {/* Top Navbar */}
      <Navbar
        brand={data.brand}
        navLinks={data.navLinks}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenServicePortal={(tab) => handleOpenServicePortal(tab || "lapak")}
        onOpenRegister={handleOpenRegister}
        onOpenMembersDirectory={handleOpenMembersDirectory}
      />

      {/* Main Content (Wide edge-to-edge max-w-[98%] 2xl:max-w-[1600px]) */}
      <main className="flex-1 w-full max-w-[98%] 2xl:max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        {loading ? (
          <PizzaLoader />
        ) : (
          <>
            {/* Hero Section */}
            <Hero
              heading={data.heading}
              subtext={data.subtext}
              heroPillars={data.heroPillars}
            />

            {/* Tentang Kami Section */}
            <About
              aboutText={data.aboutText}
              aboutHeader={data.aboutHeader}
              aboutPillars={data.aboutPillars}
              visionMission={data.visionMission}
              charterTitle={data.charterTitle}
            />

            {/* Struktur Organisasi Section */}
            <OrgStructure org={data.org} onOpenLightbox={handleOpenLightbox} />

            {/* Galeri Kegiatan Section */}
            <Gallery gallery={data.gallery} onOpenLightbox={handleOpenLightbox} />
          </>
        )}
      </main>

      {/* Floating Action Buttons: Anggota LSM PPS & Daftar Layanan */}
      <FloatingActions
        onOpenRegister={handleOpenRegister}
        onOpenServicePortal={handleOpenServicePortal}
        onOpenMembersDirectory={handleOpenMembersDirectory}
      />

      {/* Footer */}
      <Footer brand={data.brand} />

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        photos={lightbox.photos}
        photo={lightbox.photo}
        initialIndex={lightbox.initialIndex}
        caption={lightbox.caption}
        desc={lightbox.desc}
        location={lightbox.location}
        date={lightbox.date}
        onClose={handleCloseLightbox}
      />

      {/* Direktori Publik Anggota Terdaftar (/anggota) */}
      <MembersDirectoryModal
        isOpen={membersDirectoryOpen}
        onClose={handleCloseMembersDirectory}
        onOpenRegister={handleOpenRegister}
      />

      {/* Modal Khusus Pendaftaran Anggota LSM PPS (Dengan OCR KTP Otomatis) */}
      <MemberRegistrationModal
        isOpen={memberModalOpen}
        onClose={handleCloseRegister}
        onShowToast={showToast}
      />

      {/* Portal Layanan Warga: Lapak UMKM, Request Meeting & Lacak Tiket (GTA V IME Roleplay) */}
      <ServicePortalModal
        isOpen={servicePortalOpen}
        onClose={handleCloseServicePortal}
        onShowToast={showToast}
        initialTab={servicePortalTab}
      />

      {/* Admin CMS Modal */}
      <AdminModal
        isOpen={adminModalOpen}
        onClose={handleCloseAdminModal}
        initialData={data}
        onDataSaved={(newData) => setData(newData)}
        onShowToast={showToast}
      />

      {/* Toast Notification Container (Positioned on the bottom-left so it never blocks floating actions) */}
      <div className="fixed bottom-5 left-5 z-[200] flex flex-col gap-2.5 max-w-sm pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}
