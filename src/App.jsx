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
import Toast from "./components/Toast";
import FloatingActions from "./components/FloatingActions";

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
      try {
        const cloud = await loadCloudData();
        setData(cloud);
      } catch (err) {
        console.warn("Using fallback data due to:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Lightbox State
  const [lightbox, setLightbox] = useState({ isOpen: false, photo: "", caption: "", desc: "", location: "" });

  function handleOpenLightbox(photo, caption, desc = "", location = "") {
    setLightbox({ isOpen: true, photo, caption, desc, location });
  }

  function handleCloseLightbox() {
    setLightbox({ isOpen: false, photo: "", caption: "", desc: "", location: "" });
  }

  // Admin Route Management (/admin or #/admin)
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  useEffect(() => {
    function checkAdminRoute() {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === "/admin" || path.endsWith("/admin") || hash === "#/admin" || hash === "#admin") {
        setAdminModalOpen(true);
      }
    }

    checkAdminRoute();
    window.addEventListener("popstate", checkAdminRoute);
    window.addEventListener("hashchange", checkAdminRoute);

    return () => {
      window.removeEventListener("popstate", checkAdminRoute);
      window.removeEventListener("hashchange", checkAdminRoute);
    };
  }, []);

  function handleCloseAdminModal() {
    setAdminModalOpen(false);
    if (window.location.pathname.includes("/admin") || window.location.hash.includes("admin")) {
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
  let discordUrl = "https://discord.gg/92QASf3fus";
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
      />

      {/* Main Content (Wide edge-to-edge max-w-[98%] 2xl:max-w-[1600px]) */}
      <main className="flex-1 w-full max-w-[98%] 2xl:max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="py-28 flex flex-col items-center justify-center">
            <div className="card-brutal p-8 text-center max-w-sm w-full bg-[var(--card-bg)] border-[2.5px] border-[#1A1A1A] dark:border-[#475569]">
              <div className="w-10 h-10 border-[3px] border-[#1A1A1A] border-t-[#FACC15] rounded-full animate-spin mx-auto mb-4" />
              <p className="font-heading font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                Memuat Portal PPS...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <Hero heading={data.heading} subtext={data.subtext} />

            {/* Tentang Kami Section */}
            <About aboutText={data.aboutText} />

            {/* Struktur Organisasi Section */}
            <OrgStructure org={data.org} onOpenLightbox={handleOpenLightbox} />

            {/* Galeri Kegiatan Section */}
            <Gallery gallery={data.gallery} onOpenLightbox={handleOpenLightbox} />
          </>
        )}
      </main>

      {/* Floating Action Buttons: Discord & Daftar Anggota (Bottom Right) */}
      <FloatingActions discordUrl={discordUrl} registerUrl={registerUrl} />

      {/* Footer */}
      <Footer brand={data.brand} />

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        photo={lightbox.photo}
        caption={lightbox.caption}
        desc={lightbox.desc}
        location={lightbox.location}
        onClose={handleCloseLightbox}
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
