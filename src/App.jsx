import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { flushSync } from "react-dom";
import { loadCloudData, defaultData, mergeWithDefaults, sanitizeSandyShores } from "./services/firebase";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import ProgramsShowcase from "./components/ProgramsShowcase";
import DonorsSection from "./components/DonorsSection";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import PizzaLoader from "./components/PizzaLoader";
import { Users, Camera, ArrowRight, Ticket, Dices } from "lucide-react";
import { subscribeMembersCloud } from "./services/memberService";
import { subscribeEventsCloud } from "./services/eventService";
import { subscribeBansosProgramsCloud } from "./services/bansosService";
import {
  subscribeDoorprizeConfigCloud,
  subscribeDoorprizeTicketsCloud,
  DEFAULT_DOORPRIZE_CONFIG,
  getSavedMyTicket,
  formatTicketNumber,
} from "./services/doorprizeService";
import { recordVisitorHitCloud } from "./services/visitorService";

// Lazy-loaded secondary pages, floating widgets & heavy modals for instant FCP/LCP
const StructurePage = lazy(() => import("./components/StructurePage"));
const GalleryPage = lazy(() => import("./components/GalleryPage"));
const LightboxModal = lazy(() => import("./components/LightboxModal"));
const CommunityMessengerDock = lazy(() => import("./components/CommunityMessengerDock"));
const FloatingActions = lazy(() => import("./components/FloatingActions"));
const ScrollToTopMascot = lazy(() => import("./components/ScrollToTopMascot"));
const AdminModal = lazy(() => import("./components/AdminModal"));
const ServicePortalModal = lazy(() => import("./components/ServicePortalModal"));
const MemberRegistrationModal = lazy(() => import("./components/MemberRegistrationModal"));
const MembersDirectoryModal = lazy(() => import("./components/MembersDirectoryModal"));
const EventRegistrationModal = lazy(() => import("./components/EventRegistrationModal"));
const BansosModal = lazy(() => import("./components/BansosModal"));
const PermitModal = lazy(() => import("./components/PermitModal"));
const TransparencyModal = lazy(() => import("./components/TransparencyModal"));
const DoorprizeModal = lazy(() => import("./components/DoorprizeModal"));

export default function App() {
  const [memberCount, setMemberCount] = useState(0);
  const [approvedMembersCount, setApprovedMembersCount] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_home_approved_members");
      if (cached !== null) return Number(cached);
    } catch {}
    return null;
  });
  const [activeJasraCount, setActiveJasraCount] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_home_active_jasra");
      if (cached !== null) return Number(cached);
    } catch {}
    return null;
  });
  const [eventsList, setEventsList] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_events_list_cache");
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

  const [bansosPrograms, setBansosPrograms] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_bansos_programs_cache");
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [selectedBansosProgramForModal, setSelectedBansosProgramForModal] = useState(null);
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_cached_data");
      if (cached) {
        return mergeWithDefaults(sanitizeSandyShores(JSON.parse(cached)));
      }
    } catch (e) {
      console.warn("Could not read pps_cached_data:", e);
    }
    return defaultData;
  });
  const [loading] = useState(false);
  const [introSplash, setIntroSplash] = useState(() => {
    if (typeof window === "undefined") return "done";
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    // Lewati splash overlay kalau langsung buka Portal Admin
    if (p.includes("/admin") || h.includes("admin")) return "done";
    return "visible";
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);
  const [deferredReady, setDeferredReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    return p.includes("/admin") || h.includes("admin");
  });

  // Fast non-blocking Pizza Mascot intro overlay (~700ms visible + 260ms fade-out)
  useEffect(() => {
    if (introSplash !== "visible") return;
    const fadeTimer = window.setTimeout(() => {
      setIntroSplash("fading");
    }, 700);
    return () => window.clearTimeout(fadeTimer);
  }, [introSplash]);

  useEffect(() => {
    if (introSplash !== "fading") return;
    const doneTimer = window.setTimeout(() => {
      setIntroSplash("done");
    }, 280);
    return () => window.clearTimeout(doneTimer);
  }, [introSplash]);

  // Schedule non-critical widgets & secondary Firestore streams after first paint
  useEffect(() => {
    if (deferredReady) return;
    let timeoutId = null;
    let idleId = null;
    const enable = () => setDeferredReady(true);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1400 });
    } else {
      timeoutId = window.setTimeout(enable, 900);
    }
    return () => {
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [deferredReady]);

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

  function handleToggleTheme(e) {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      typeof document === "undefined" ||
      typeof document.startViewTransition !== "function" ||
      prefersReducedMotion
    ) {
      setTheme(nextTheme);
      return;
    }

    // Origin point: center of the theme button in top-right (or top-right fallback)
    let x = window.innerWidth - 48;
    let y = 56;
    const btnEl =
      e &&
      e.currentTarget &&
      typeof e.currentTarget.getBoundingClientRect === "function"
        ? e.currentTarget
        : null;

    if (btnEl) {
      const rect = btnEl.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if (e && typeof e.clientX === "number" && e.clientX > 0) {
      x = e.clientX;
      y = e.clientY;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Set CSS custom properties for the feathered radial mask wave (Soft Feathered Eclipse)
    root.style.setProperty("--eclipse-x", `${x}px`);
    root.style.setProperty("--eclipse-y", `${y}px`);
    root.style.setProperty("--eclipse-max-r", `${endRadius + 200}px`);
    root.classList.add("theme-transitioning", "theme-eclipse-active");

    // Soft glowing solar/twilight corona aura that expands with the feathered edge
    const corona = document.createElement("div");
    const isToDark = nextTheme === "dark";
    corona.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:40px;height:40px;border-radius:9999px;transform:translate(-50%,-50%) scale(0);border:28px solid ${
      isToDark ? "rgba(250,204,21,0.22)" : "rgba(250,204,21,0.35)"
    };box-shadow:0 0 60px 24px ${
      isToDark ? "rgba(99,102,241,0.25)" : "rgba(250,204,21,0.4)"
    },inset 0 0 40px 12px rgba(250,204,21,0.25);pointer-events:none;z-index:2147483647;`;
    document.body.appendChild(corona);

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
      if (nextTheme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
      localStorage.setItem("pps_active_theme", nextTheme);
    });

    transition.ready
      .then(() => {
        const scaleTarget = (endRadius * 2.15) / 40;
        corona.animate(
          [
            { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.95 },
            {
              transform: `translate(-50%, -50%) scale(${scaleTarget})`,
              opacity: 0,
            },
          ],
          {
            duration: 760,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          }
        );

        if (btnEl) {
          btnEl.animate(
            [
              { transform: "rotate(-160deg) scale(0.75)" },
              { transform: "rotate(12deg) scale(1.12)", offset: 0.7 },
              { transform: "rotate(0deg) scale(1)" },
            ],
            {
              duration: 560,
              easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }
          );
        }
      })
      .catch(() => {});

    transition.finished.finally(() => {
      corona.remove();
      root.classList.remove("theme-transitioning", "theme-eclipse-active");
    });
  }

  // Load Firestore Cloud Data on Mount (non-blocking: Hero renders instantly from defaults/cache)
  useEffect(() => {
    async function fetchData() {
      try {
        const cloud = await loadCloudData();
        setData(cloud);
      } catch (err) {
        console.warn("Using fallback data due to:", err);
      } finally {
        setIsCloudSyncing(false);
      }
    }
    fetchData();
  }, []);

  // Real-time Member Count Subscription (deferred after first paint)
  useEffect(() => {
    if (!deferredReady) return;
    const unsub = subscribeMembersCloud(
      (members) => {
        if (Array.isArray(members)) {
          setMemberCount(members.length);
          const approved = members.filter(
            (m) => m.status !== "PENDING_VERIFIKASI" && m.status !== "REJECTED"
          ).length;
          setApprovedMembersCount(approved);
          try {
            localStorage.setItem("pps_home_approved_members", String(approved));
          } catch {}
        }
      },
      () => {}
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [deferredReady]);

  // Deferred one-shot Jasra active recipient count for Homepage Live Stats Strip
  useEffect(() => {
    if (!deferredReady) return;
    let cancelled = false;
    (async () => {
      try {
        const jasraMod = await import("./services/jasraService");
        const [batches, dists] = await Promise.all([
          jasraMod.loadJasraBatchesCloud(),
          jasraMod.loadJasraDistributionsCloud(),
        ]);
        if (cancelled) return;
        const activeBatch = jasraMod.getActiveJasraBatch(batches);
        const batchDists = jasraMod.getBatchDistributions(dists, activeBatch);
        const count = batchDists.length;
        setActiveJasraCount(count);
        try {
          localStorage.setItem("pps_home_active_jasra", String(count));
        } catch {}
      } catch {
        // Keep cached or fallback value silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deferredReady]);

  // Real-time Dynamic Events Subscription (deferred after first paint)
  useEffect(() => {
    if (!deferredReady) return;
    const unsub = subscribeEventsCloud(
      (events) => {
        if (Array.isArray(events)) {
          setEventsList(events);
        }
      },
      () => {}
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [deferredReady]);

  // Real-time Dynamic Bansos Programs Subscription (deferred after first paint)
  useEffect(() => {
    if (!deferredReady) return;
    const unsub = subscribeBansosProgramsCloud(
      (programs) => {
        if (Array.isArray(programs)) {
          setBansosPrograms(programs);
        }
      },
      () => {}
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [deferredReady]);

  // Active Bansos Program for Public Visitors (strictly null if no active program)
  const activeBansosProgram =
    bansosPrograms.find((p) => p.status === "ACTIVE") || null;

  // Active Event for Public Visitors
  const activeEvent =
    eventsList.find((e) => e.status === "OPEN") ||
    eventsList.find((e) => e.status === "CLOSED") ||
    null;

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
  const [adminModalOpen, setAdminModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
    const hash = window.location.hash.toLowerCase().replace(/\/+$/, "");
    return path === "/admin" || path.endsWith("/admin") || hash === "#/admin" || hash === "#admin";
  });

  // Portal Layanan Warga (Lapak UMKM & Request Meeting) (/layanan, /umkm, /meeting)
  const [servicePortalOpen, setServicePortalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === "/umkm" || path.endsWith("/umkm") || hash === "#/umkm" || hash === "#umkm" ||
      path === "/meeting" || path.endsWith("/meeting") || hash === "#/meeting" || hash === "#meeting" ||
      path === "/layanan" || path.endsWith("/layanan") || hash === "#/layanan" || hash === "#layanan"
    );
  });
  const [servicePortalTab, setServicePortalTab] = useState(() => {
    if (typeof window === "undefined") return "lapak";
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (path === "/meeting" || path.endsWith("/meeting") || hash === "#/meeting" || hash === "#meeting")
      ? "meeting"
      : "lapak";
  });

  // Modal Khusus Pendaftaran Anggota LSM PPS (/daftar or #daftar)
  const [memberModalOpen, setMemberModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === "/daftar" || path.endsWith("/daftar") || hash === "#/daftar" || hash === "#daftar";
  });

  // Direktori Publik Anggota Terdaftar (/anggota or #anggota)
  const [membersDirectoryOpen, setMembersDirectoryOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === "/anggota" || path.endsWith("/anggota") || hash === "#/anggota" || hash === "#anggota";
  });

  // Modal Pendaftaran Event (/event or #event)
  const [eventModalOpen, setEventModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === "/event" || path.endsWith("/event") || hash === "#/event" || hash === "#event";
  });

  // Modal Bantuan Sosial Warga (/bansos or #bansos) - Hidden Route (tanpa tombol di navbar)
  const [bansosModalOpen, setBansosModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === "/bansos" || path.endsWith("/bansos") || hash === "#/bansos" || hash === "#bansos";
  });

  // Modal Portal Transparansi & Laporan Resmi Pemerintah (/transparansi, /laporan)
  const [transparencyModalOpen, setTransparencyModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
    const hash = window.location.hash.toLowerCase().replace(/\/+$/, "");
    return (
      path === "/transparansi" ||
      path.endsWith("/transparansi") ||
      path === "/laporan" ||
      path.endsWith("/laporan") ||
      hash === "#/transparansi" ||
      hash === "#transparansi" ||
      hash === "#/laporan" ||
      hash === "#laporan"
    );
  });
  const [transparencyInitialTab, setTransparencyInitialTab] = useState(() => {
    if (typeof window === "undefined") return "jasra";
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.includes("bansos") || hash.includes("bansos") || search.includes("bansos")) return "bansos";
    return "jasra";
  });

  // Modal Salurkan Donasi Warga (/donasi or #donasi)
  const [donationModalOpen, setDonationModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
    const hash = window.location.hash.toLowerCase().replace(/\/+$/, "");
    return path === "/donasi" || path.endsWith("/donasi") || hash === "#/donasi" || hash === "#donasi";
  });

  // Dedicated Page Routing (default 'home', can be 'gallery' for #/dokumentasi or 'structure' for #/struktur)
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === "undefined") return "home";
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (
      path === "/struktur" ||
      path.endsWith("/struktur") ||
      path === "/structure" ||
      path.endsWith("/structure") ||
      hash === "#/struktur" ||
      hash === "#struktur" ||
      hash === "#/structure" ||
      hash === "#structure"
    ) {
      return "structure";
    }

    if (
      path === "/dokumentasi" ||
      path.endsWith("/dokumentasi") ||
      path === "/galeri" ||
      path.endsWith("/galeri") ||
      path === "/gallery" ||
      path.endsWith("/gallery") ||
      hash === "#/dokumentasi" ||
      hash === "#dokumentasi" ||
      hash === "#/galeri" ||
      hash === "#galeri" ||
      hash === "#/gallery" ||
      hash === "#gallery"
    ) {
      return "gallery";
    }

    return "home";
  });

  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);

  useEffect(() => {
    function checkRoutes() {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
      const hash = window.location.hash.toLowerCase().replace(/\/+$/, "");

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
        setEventModalOpen(false);
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
        setEventModalOpen(false);
      } else {
        setMembersDirectoryOpen(false);
      }

      // 4. Check Event Registration Route (/event or #event)
      if (
        path === "/event" ||
        path.endsWith("/event") ||
        hash === "#/event" ||
        hash === "#event"
      ) {
        setEventModalOpen(true);
        setMemberModalOpen(false);
        setMembersDirectoryOpen(false);
        setServicePortalOpen(false);
        setBansosModalOpen(false);
      } else {
        setEventModalOpen(false);
      }

      // 5. Check Bansos Route (/bansos or #bansos) - Strictly Hidden Direct Route
      if (
        path === "/bansos" ||
        path.endsWith("/bansos") ||
        hash === "#/bansos" ||
        hash === "#bansos"
      ) {
        setBansosModalOpen(true);
        setMemberModalOpen(false);
        setMembersDirectoryOpen(false);
        setServicePortalOpen(false);
        setEventModalOpen(false);
      } else {
        setBansosModalOpen(false);
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
        window.location.href = data?.discordUrl || "https://discord.gg/gb7ajBMduF";
      }

      // 6. Check Structure Dedicated Route (/struktur, #/struktur, /structure, #structure)
      const isStructureRoute =
        path === "/struktur" ||
        path.endsWith("/struktur") ||
        path === "/structure" ||
        path.endsWith("/structure") ||
        hash === "#/struktur" ||
        hash === "#struktur" ||
        hash === "#/structure" ||
        hash === "#structure";

      // 7. Check Gallery / Dokumentasi Dedicated Route (/dokumentasi, #/dokumentasi, /galeri, #/galeri)
      const isGalleryRoute =
        path === "/dokumentasi" ||
        path.endsWith("/dokumentasi") ||
        path === "/galeri" ||
        path.endsWith("/galeri") ||
        path === "/gallery" ||
        path.endsWith("/gallery") ||
        hash === "#/dokumentasi" ||
        hash === "#dokumentasi" ||
        hash === "#/galeri" ||
        hash === "#galeri" ||
        hash === "#/gallery" ||
        hash === "#gallery";

      if (isStructureRoute) {
        setCurrentPage("structure");
      } else if (isGalleryRoute) {
        setCurrentPage("gallery");
      } else {
        setCurrentPage("home");
      }

      // 7. Check Transparency Report Route (/transparansi, /laporan, #transparansi, #laporan)
      if (
        path === "/transparansi" ||
        path.endsWith("/transparansi") ||
        path === "/laporan" ||
        path.endsWith("/laporan") ||
        hash === "#/transparansi" ||
        hash === "#transparansi" ||
        hash === "#/laporan" ||
        hash === "#laporan"
      ) {
        setTransparencyModalOpen(true);
        const search = window.location.search.toLowerCase();
        if (path.includes("bansos") || hash.includes("bansos") || search.includes("bansos")) {
          setTransparencyInitialTab("bansos");
        } else {
          setTransparencyInitialTab("jasra");
        }
      } else {
        setTransparencyModalOpen(false);
      }

      // 8. Check Donation Route (/donasi, /donate, #donasi)
      if (
        path === "/donasi" ||
        path.endsWith("/donasi") ||
        path === "/donate" ||
        path.endsWith("/donate") ||
        hash === "#/donasi" ||
        hash === "#donasi"
      ) {
        setDonationModalOpen(true);
      } else {
        setDonationModalOpen(false);
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

    // Record visitor hit atomically after initial paint (1x per browser session)
    const visitorTimer = window.setTimeout(() => {
      recordVisitorHitCloud();
    }, 1500);

    checkRoutes();
    window.addEventListener("popstate", checkRoutes);
    window.addEventListener("hashchange", checkRoutes);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(visitorTimer);
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

  function handleOpenTransparency(tab = "jasra") {
    setTransparencyInitialTab(tab);
    setTransparencyModalOpen(true);
    if (!window.location.pathname.includes("/transparansi")) {
      window.history.pushState(null, "", `/transparansi?tab=${tab}`);
    }
  }

  function handleCloseTransparency() {
    setTransparencyModalOpen(false);
    if (
      window.location.pathname.includes("/transparansi") ||
      window.location.pathname.includes("/laporan") ||
      window.location.hash.includes("transparansi") ||
      window.location.hash.includes("laporan")
    ) {
      window.history.pushState(null, "", "/");
    }
  }

  function handleOpenDonation() {
    setDonationModalOpen(true);
    if (!window.location.pathname.includes("/donasi")) {
      window.history.pushState(null, "", "/donasi");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pps:open-donasi"));
    }
  }

  function handleCloseDonation() {
    setDonationModalOpen(false);
    if (window.location.pathname.includes("/donasi") || window.location.hash.includes("donasi")) {
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

  function handleOpenEventModal(targetEvent = null) {
    if (targetEvent) {
      setSelectedEventForModal(targetEvent);
    } else {
      setSelectedEventForModal(activeEvent);
    }
    setEventModalOpen(true);
    if (!window.location.pathname.includes("/event")) {
      window.history.pushState(null, "", "/event");
    }
  }

  function handleCloseEventModal() {
    setEventModalOpen(false);
    setSelectedEventForModal(null);
    if (window.location.pathname.includes("/event") || window.location.hash.includes("event")) {
      window.history.pushState(null, "", "/");
    }
  }

  function handleOpenBansosModal(prog) {
    if (prog) {
      setSelectedBansosProgramForModal(prog);
    }
    setBansosModalOpen(true);
    if (
      !window.location.pathname.toLowerCase().includes("/bansos") &&
      !window.location.hash.toLowerCase().includes("bansos")
    ) {
      window.history.pushState(null, "", "/bansos");
    }
  }

  function handleCloseBansosModal() {
    setBansosModalOpen(false);
    setSelectedBansosProgramForModal(null);
    if (
      window.location.pathname.toLowerCase().includes("/bansos") ||
      window.location.hash.toLowerCase().includes("bansos")
    ) {
      window.history.pushState(null, "", "/");
    }
  }

  // Doorprize Undian Senam Sehat State & Live Cloud Sync
  const [doorprizeConfig, setDoorprizeConfig] = useState(() => ({
    ...DEFAULT_DOORPRIZE_CONFIG,
    status: "CLOSED",
    autoPopupOnVisit: false,
  }));
  const [doorprizeTickets, setDoorprizeTickets] = useState([]);
  const [doorprizeModalOpen, setDoorprizeModalOpen] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path.includes("/doorprize") ||
      path.includes("/undian") ||
      path.includes("/senam") ||
      hash.includes("doorprize") ||
      hash.includes("undian") ||
      hash.includes("senam")
    );
  });
  const [hasAutoOpenedDoorprize, setHasAutoOpenedDoorprize] = useState(false);

  useEffect(() => {
    if (!deferredReady) return;
    const unsubCfg = subscribeDoorprizeConfigCloud((cfg) => {
      setDoorprizeConfig(cfg);
      if (
        cfg.status === "OPEN" &&
        cfg.autoPopupOnVisit !== false &&
        !hasAutoOpenedDoorprize &&
        !adminModalOpen
      ) {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const isOtherDirectModal =
          adminModalOpen ||
          path.includes("/admin") ||
          hash.includes("admin") ||
          path.includes("/transparansi") ||
          hash.includes("transparansi") ||
          path.includes("/anggota") ||
          hash.includes("anggota");
        const alreadyPoppedInSession =
          typeof window !== "undefined" &&
          sessionStorage.getItem("pps_doorprize_auto_popup_shown") === "true";
        if (!isOtherDirectModal && !alreadyPoppedInSession) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("pps_doorprize_auto_popup_shown", "true");
          }
          setDoorprizeModalOpen(true);
          setHasAutoOpenedDoorprize(true);
        }
      }
    });
    const unsubTickets = subscribeDoorprizeTicketsCloud((list) => {
      setDoorprizeTickets(list);
    });
    return () => {
      unsubCfg();
      unsubTickets();
    };
  }, [hasAutoOpenedDoorprize, adminModalOpen, deferredReady]);

  function handleOpenDoorprizeModal() {
    setDoorprizeModalOpen(true);
  }

  function handleCloseDoorprizeModal() {
    setDoorprizeModalOpen(false);
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      path.includes("/doorprize") ||
      path.includes("/undian") ||
      path.includes("/senam") ||
      hash.includes("doorprize") ||
      hash.includes("undian") ||
      hash.includes("senam")
    ) {
      window.history.pushState(null, "", "/");
    }
  }

  // Dedicated Structure Page navigation handlers
  function handleNavigateToStructure() {
    setCurrentPage("structure");
    if (!window.location.hash.includes("struktur") && !window.location.pathname.includes("struktur")) {
      window.history.pushState(null, "", "#/struktur");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Dedicated Gallery / Dokumentasi Page navigation handlers
  function handleNavigateToGallery() {
    setCurrentPage("gallery");
    if (!window.location.hash.includes("dokumentasi") && !window.location.pathname.includes("dokumentasi")) {
      window.history.pushState(null, "", "#/dokumentasi");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNavigateToHome(targetAnchor = "") {
    setCurrentPage("home");
    if (targetAnchor && targetAnchor !== "#home") {
      window.history.pushState(null, "", targetAnchor);
      setTimeout(() => {
        const elem = document.getElementById(targetAnchor.replace("#", ""));
        if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 70);
    } else {
      window.history.pushState(null, "", "/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Toast Alerts State
  const [toasts, setToasts] = useState([]);
  const scrollProgressFillRef = useRef(null);

  // Smooth GPU-accelerated scroll progress rail on public pages
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId = null;
    const updateProgress = () => {
      rafId = null;
      const fillEl = scrollProgressFillRef.current;
      if (!fillEl) return;
      const docEl = document.documentElement;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      fillEl.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };
    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [loading, currentPage]);

  const isIntroReady = introSplash !== "visible";

  // Scroll Reveal Observer for all public pages (Beranda, Struktur, Dokumentasi, Footer)
  useEffect(() => {
    if (loading || typeof window === "undefined") return;

    const rootEl = document.documentElement;
    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      rootEl.classList.remove("sr-ready");
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.setAttribute("data-revealed", "true");
        el.setAttribute("data-reveal-done", "true");
      });
      return;
    }

    rootEl.classList.add("sr-ready");
    if (!isIntroReady) return;
    const timers = [];

    const markRevealed = (el) => {
      if (el.getAttribute("data-revealed") === "true") return;
      el.setAttribute("data-revealed", "true");
      const rawDelay = el.style.getPropertyValue("--reveal-delay") || "0ms";
      const delayMs = parseInt(rawDelay, 10) || 0;
      const t = window.setTimeout(() => {
        el.setAttribute("data-reveal-done", "true");
      }, 760 + delayMs);
      timers.push(t);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markRevealed(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -48px 0px" }
    );

    const observedSet = new WeakSet();
    let scanRafId = null;
    const scanAndObserve = () => {
      scanRafId = null;
      const nodes = document.querySelectorAll("[data-reveal]");
      nodes.forEach((el) => {
        if (el.getAttribute("data-revealed") === "true" || observedSet.has(el)) return;
        observedSet.add(el);
        observer.observe(el);
      });
    };

    scanAndObserve();

    // Only re-scan when new Element nodes are mounted (ignores text ticks like Hero typewriter)
    const mutationObserver = new MutationObserver((mutations) => {
      let hasNewElement = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            hasNewElement = true;
            break;
          }
        }
        if (hasNewElement) break;
      }
      if (hasNewElement && scanRafId === null) {
        scanRafId = window.requestAnimationFrame(scanAndObserve);
      }
    });
    const mainTarget = document.querySelector("main");
    if (mainTarget) {
      mutationObserver.observe(mainTarget, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      if (scanRafId !== null) window.cancelAnimationFrame(scanRafId);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [loading, isIntroReady, currentPage, data]);

  function showToast(message, type = "info") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // 3 Dokumentasi kegiatan terbaru (dengan foto valid) untuk preview langsung di beranda
  const latestGalleryPreviews = useMemo(() => {
    const list = Array.isArray(data?.gallery) ? data.gallery : [];
    const indoMonths = {
      januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
      juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
    };
    const getScore = (item) => {
      const str = String(item?.date || "");
      const m = str.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
      if (m) {
        const mon = indoMonths[m[2].toLowerCase()];
        if (mon !== undefined) return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10)).getTime();
      }
      const parsed = Date.parse(str);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    return list
      .map((item, idx) => {
        const photos = Array.isArray(item?.photos) && item.photos.length > 0
          ? item.photos.filter((p) => typeof p === "string" && p.trim().length > 0)
          : (typeof item?.photo === "string" && item.photo.trim() ? [item.photo.trim()] : []);
        return { item, photos, cover: photos[0] || "", score: getScore(item), idx };
      })
      .filter((entry) => Boolean(entry.cover))
      .sort((a, b) => (b.score - a.score) || (b.idx - a.idx))
      .slice(0, 3);
  }, [data?.gallery]);

  // Preview avatar jajaran pengurus inti untuk menyeimbangkan kartu Struktur & Dokumentasi
  const topOrgPreviews = useMemo(() => {
    const list = Array.isArray(data?.org) ? data.org : [];
    return list.slice(0, 5);
  }, [data?.org]);

  // Extract Discord and Register URLs from data / navLinks if customized
  let discordUrl = data?.discordUrl || "https://discord.gg/gb7ajBMduF";
  let discordVisitorUrl = data?.discordVisitorUrl || "https://discord.gg/gb7ajBMduF";
  let registerUrl = "https://daftaranggotapaps.netlify.app/";

  if (data?.navLinks) {
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
      {/* Non-blocking Fast Intro Splash (Maskot Makan Pizza ~700ms, Hero tetap siap di belakang) */}
      {introSplash !== "done" && (
        <div
          onClick={() => setIntroSplash("fading")}
          role="status"
          aria-live="polite"
          className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#FAF7EE]/95 dark:bg-[#07090E]/95 backdrop-blur-sm transition-all duration-300 cursor-pointer ${
            introSplash === "fading"
              ? "opacity-0 scale-[0.98] pointer-events-none"
              : "opacity-100 scale-100"
          }`}
        >
          <PizzaLoader />
        </div>
      )}

      {/* Cinematic Top Scroll Progress Rail */}
      <div className="scroll-progress-rail" aria-hidden="true">
        <div ref={scrollProgressFillRef} className="scroll-progress-fill" />
      </div>

      {/* Sticky Header Area: Signature Yellow & Red Dual Top Strip + Notice Bar Orang Baik */}
      <div className="sticky top-0 z-40 w-full bg-[#FAF7EE] dark:bg-[#07090E] shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors">
        {/* Signature Yellow & Red Dual Top Strip */}
        <div className="w-full flex h-1 sm:h-1.5 shrink-0 border-b border-black/10 dark:border-black/40">
          <div className="flex-1 bg-[#FACC15]" />
          <div className="w-24 sm:w-36 bg-[#DC2626]" />
        </div>

        {/* Notice Bar Orang Baik (Lebar Mentok Kiri-Kanan Di Atas Headbar) */}
        <DonorsSection
          onOpenTransparency={handleOpenTransparency}
          isOpen={donationModalOpen}
          onOpen={handleOpenDonation}
          onClose={handleCloseDonation}
        />
      </div>

      {/* Top Navbar */}
      <Navbar
        brand={data.brand}
        navLinks={data.navLinks}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenServicePortal={(tab) => handleOpenServicePortal(tab || "lapak")}
        onOpenRegister={handleOpenRegister}
        onOpenMembersDirectory={handleOpenMembersDirectory}
        currentPage={currentPage}
        onNavigateToStructure={handleNavigateToStructure}
        onNavigateToGallery={handleNavigateToGallery}
        onNavigateToHome={handleNavigateToHome}
      />

      {/* Main Content (Wide edge-to-edge max-w-[98%] 2xl:max-w-[1600px]) */}
      <main className="relative z-10 isolate flex-1 w-full max-w-[98%] 2xl:max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        {loading ? (
          <PizzaLoader />
        ) : currentPage === "gallery" ? (
          <Suspense fallback={<PizzaLoader />}>
            <GalleryPage
              gallery={data.gallery}
              onOpenLightbox={handleOpenLightbox}
              onNavigateHome={handleNavigateToHome}
              onOpenServicePortal={handleOpenServicePortal}
            />
          </Suspense>
        ) : currentPage === "structure" ? (
          <Suspense fallback={<PizzaLoader />}>
            <StructurePage
              org={data.org}
              tierTitles={data?.orgTierTitles}
              onOpenLightbox={handleOpenLightbox}
              onNavigateHome={handleNavigateToHome}
            />
          </Suspense>
        ) : (
          <>
            {/* Hero Section */}
            <Hero
              heading={data.heading}
              subtext={data.subtext}
              isIntroReady={isIntroReady}
              onOpenPermit={() => setIsPermitModalOpen(true)}
              onOpenRegister={handleOpenRegister}
              onOpenTransparency={handleOpenTransparency}
              onOpenMembersDirectory={handleOpenMembersDirectory}
              onNavigateToStructure={handleNavigateToStructure}
              onNavigateToGallery={handleNavigateToGallery}
              liveStats={{
                approvedMembers: approvedMembersCount,
                activeJasra: activeJasraCount,
                orgCount: Array.isArray(data?.org) ? data.org.length : 0,
                galleryCount: Array.isArray(data?.gallery) ? data.gallery.length : 0,
              }}
            />

            {/* Tentang Kami Section */}
            <About
              aboutText={data.aboutText}
              aboutHeader={data.aboutHeader}
              aboutPillars={data.aboutPillars}
              visionMission={data.visionMission}
              charterTitle={data.charterTitle}
              onShowToast={showToast}
            />

            {/* Program & Layanan Unggulan Warga */}
            <ProgramsShowcase
              onOpenTransparency={handleOpenTransparency}
              onOpenServicePortal={handleOpenServicePortal}
              onOpenBansos={handleOpenBansosModal}
            />

            {/* Section Pemisah: Direktori Pengurus & Dokumentasi Kegiatan */}
            <section id="portal-arsip" className="pt-12 sm:pt-16 mt-10 sm:mt-14 border-t border-black/20 dark:border-white/10 w-full scroll-mt-24 overflow-hidden">
              {/* Title Bar Pemisah */}
              <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 flex-wrap relative">
                <div>
                  <div data-reveal="text" className="card-label mb-1">
                    PORTAL INFORMASI &amp; ARSIP LEMBAGA
                  </div>
                  <h2
                    data-reveal="text"
                    style={{ "--reveal-delay": "90ms" }}
                    className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white uppercase tracking-tight"
                  >
                    Struktur &amp; Dokumentasi Kegiatan
                  </h2>
                </div>
                <div
                  data-reveal="pop"
                  style={{ "--reveal-delay": "180ms" }}
                  className="badge-brutal badge-yellow font-black"
                >
                  DIREKTORI RESMI
                </div>
                <div
                  data-reveal="line"
                  style={{ "--reveal-delay": "140ms" }}
                  className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-[#DC2626] via-[#FACC15] to-black/15 dark:to-white/10"
                />
              </div>

              {/* Dual Quick-Access Teasers: Susunan Pengurus & Dokumentasi Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {/* Card 1: Bagan Kepengurusan */}
                <div
                  data-reveal="left"
                  style={{ "--reveal-delay": "80ms" }}
                  onClick={handleNavigateToStructure}
                  className="card-brutal reveal-sheen bg-white dark:bg-[#121622] p-6 sm:p-8 border border-black/20 dark:border-white/20 shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.75)] flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
                  title="Buka Halaman Struktur & Susunan Pengurus LSM PPS"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-amber-500/5 dark:from-red-600/10 dark:to-transparent opacity-80 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="card-label">
                        BAGAN KEPENGURUSAN
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/70 text-[#DC2626] dark:text-[#EF4444] border border-red-200 dark:border-red-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <Users size={20} />
                      </div>
                    </div>
                    <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white uppercase leading-snug group-hover:text-[#DC2626] dark:group-hover:text-[#FACC15] transition-colors mb-2.5">
                      Susunan Pengurus, BPH &amp; Koordinator Wilayah
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                      Mengenal jajaran pimpinan, dewan penasihat, badan pengurus harian, kepala seksi divisi, serta koordinator satgas lapangan LSM PPS.
                    </p>

                    {/* Preview Ringkas Jajaran Pengurus Aktif */}
                    {topOrgPreviews.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center -space-x-2.5">
                          {topOrgPreviews.map((person, idx) => (
                            <div
                              key={person.id || `${person.name}-${idx}`}
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-[#121622] bg-slate-100 dark:bg-[#1A1F2E] overflow-hidden shadow-sm shrink-0"
                              title={`${person.name || "Pengurus"} - ${person.role || ""}`}
                            >
                              {person.photo ? (
                                <img
                                  src={person.photo}
                                  alt={person.name || "Pengurus PPS"}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-heading font-black text-[#DC2626] dark:text-[#FACC15]">
                                  {(person.name || "P").slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                          {Array.isArray(data?.org) && data.org.length > topOrgPreviews.length && (
                            <div className="w-10 h-10 rounded-full border-2 border-white dark:border-[#121622] bg-[#FACC15] text-slate-950 flex items-center justify-center text-[11px] font-mono font-black shadow-sm shrink-0">
                              +{data.org.length - topOrgPreviews.length}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                          {Array.isArray(data?.org) ? data.org.length : 0} Pengurus Aktif
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 mt-5 border-t border-black/15 dark:border-white/15 flex items-center justify-between relative z-10">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      // STRUKTUR ORGANISASI //
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToStructure();
                      }}
                      className="btn btn-red py-2.5 px-5 text-xs font-bold shrink-0 cursor-pointer flex items-center gap-2 group-hover:brightness-105"
                    >
                      <span>Buka Susunan Pengurus</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Card 2: Dokumentasi Kegiatan */}
                <div
                  data-reveal="right"
                  style={{ "--reveal-delay": "160ms" }}
                  onClick={handleNavigateToGallery}
                  className="card-brutal reveal-sheen bg-white dark:bg-[#121622] p-6 sm:p-8 border border-black/20 dark:border-white/20 shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.75)] flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
                  title="Buka Halaman Dokumentasi Kegiatan LSM PPS"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-red-600/5 dark:from-amber-500/10 dark:to-transparent opacity-80 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="card-label !text-amber-700 dark:!text-[#FACC15]">
                        DOKUMENTASI KEGIATAN
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-[#FACC15] border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        <Camera size={20} />
                      </div>
                    </div>
                    <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white uppercase leading-snug group-hover:text-[#DC2626] dark:group-hover:text-[#FACC15] transition-colors mb-2.5">
                      Arsip Dokumentasi &amp; Warta Aksi Lapangan
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                      Rekam jejak visual aksi sosial, pembagian bansos, advokasi warga, penertiban lapak UMKM, dan kegiatan resmi Paguyuban Pizza Sandy Shores.
                    </p>

                    {/* Preview 3 Foto Dokumentasi Kegiatan Terbaru */}
                    {latestGalleryPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
                        {latestGalleryPreviews.map(({ item, photos, cover, idx }) => (
                          <button
                            key={item.id || `${item.title}-${idx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLightbox(
                                photos,
                                item.title || "Dokumentasi Kegiatan",
                                item.desc || "",
                                item.location || "Sandy Shores Area",
                                item.date || "",
                                0
                              );
                            }}
                            className="group/thumb relative aspect-[4/3] rounded-xl overflow-hidden border border-black/15 dark:border-white/15 bg-slate-100 dark:bg-[#1A1F2E] text-left cursor-pointer"
                            title={item.title || "Lihat foto kegiatan"}
                          >
                            <img
                              src={cover}
                              alt={item.title || "Dokumentasi PPS"}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 py-1.5">
                              <span className="block text-[10px] font-heading font-bold text-white truncate">
                                {item.title || "Aksi Lapangan"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 mt-5 border-t border-black/15 dark:border-white/15 flex items-center justify-between relative z-10">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      // GALERI &amp; WARTA KEGIATAN //
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToGallery();
                      }}
                      className="btn py-2.5 px-5 text-xs font-bold shrink-0 cursor-pointer flex items-center gap-2 group-hover:brightness-105"
                    >
                      <span>Buka Dokumentasi Lengkap</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Deferred Floating Action Widgets (loaded after initial paint) */}
      {deferredReady && (
        <Suspense fallback={null}>
          <FloatingActions
            memberCount={memberCount}
            onOpenRegister={handleOpenRegister}
            onOpenServicePortal={handleOpenServicePortal}
            onOpenMembersDirectory={handleOpenMembersDirectory}
            onOpenDonation={handleOpenDonation}
          />
          <ScrollToTopMascot />
        </Suspense>
      )}

      {/* Footer */}
      <Footer
        brand={data.brand}
        memberCount={memberCount}
        discordUrl={discordUrl}
        discordVisitorUrl={discordVisitorUrl}
        onOpenRegister={handleOpenRegister}
        onOpenServicePortal={handleOpenServicePortal}
        onOpenMembersDirectory={handleOpenMembersDirectory}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onOpenTransparency={handleOpenTransparency}
        onNavigateToStructure={handleNavigateToStructure}
        onNavigateToGallery={handleNavigateToGallery}
        onNavigateToHome={handleNavigateToHome}
      />

      {/* Floating Messenger Community Dock (Event & Bansos Anti-Collision System) */}
      {deferredReady && !adminModalOpen && (
        <Suspense fallback={null}>
          <CommunityMessengerDock
            activeEvent={activeEvent}
            activeBansosProgram={activeBansosProgram}
            onOpenRegisterEvent={handleOpenEventModal}
            onOpenBansos={handleOpenBansosModal}
          />
        </Suspense>
      )}

      {/* Lightbox Modal (lazy-loaded only when opened) */}
      {lightbox.isOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      <Suspense fallback={null}>
        {/* Direktori Publik Anggota Terdaftar (/anggota) */}
        {membersDirectoryOpen && (
          <MembersDirectoryModal
            isOpen={membersDirectoryOpen}
            onClose={handleCloseMembersDirectory}
            onOpenRegister={handleOpenRegister}
          />
        )}

        {/* Modal Pendaftaran Event Akbar LSM PPS (/event) */}
        {eventModalOpen && (
          <EventRegistrationModal
            isOpen={eventModalOpen}
            onClose={handleCloseEventModal}
            event={selectedEventForModal || activeEvent}
          />
        )}

        {/* Modal Khusus Bantuan Sosial Warga (/bansos) - Dynamic Programs */}
        {bansosModalOpen && (
          <BansosModal
            isOpen={bansosModalOpen}
            onClose={handleCloseBansosModal}
            onShowToast={showToast}
            activeProgram={selectedBansosProgramForModal || activeBansosProgram}
            bansosPrograms={bansosPrograms}
          />
        )}

        {/* Modal Khusus Pendaftaran Anggota LSM PPS (Dengan OCR KTP Otomatis) */}
        {memberModalOpen && (
          <MemberRegistrationModal
            isOpen={memberModalOpen}
            onClose={handleCloseRegister}
            onShowToast={showToast}
            discordUrl={discordUrl}
          />
        )}

        {/* Portal Layanan Warga: Lapak UMKM, Request Meeting & Lacak Tiket (GTA V IME Roleplay) */}
        {servicePortalOpen && (
          <ServicePortalModal
            isOpen={servicePortalOpen}
            onClose={handleCloseServicePortal}
            onShowToast={showToast}
            initialTab={servicePortalTab}
            discordUrl={discordUrl}
            discordVisitorUrl={discordVisitorUrl}
          />
        )}

        {/* Admin CMS Modal */}
        {adminModalOpen && (
          <AdminModal
            isOpen={adminModalOpen}
            onClose={handleCloseAdminModal}
            initialData={data}
            isCloudLoading={isCloudSyncing}
            eventsList={eventsList}
            bansosPrograms={bansosPrograms}
            doorprizeTickets={doorprizeTickets}
            onDataSaved={(newData) => setData(newData)}
            onShowToast={showToast}
            onOpenTransparency={handleOpenTransparency}
          />
        )}

        {/* Modal Surat Izin Komunitas Pemerintah San Andreas */}
        {isPermitModalOpen && (
          <PermitModal
            isOpen={isPermitModalOpen}
            onClose={() => setIsPermitModalOpen(false)}
            onShowToast={showToast}
          />
        )}

        {/* Modal Portal Transparansi & Laporan Resmi Pemerintah (/transparansi) */}
        {transparencyModalOpen && (
          <TransparencyModal
            isOpen={transparencyModalOpen}
            onClose={handleCloseTransparency}
            onShowToast={showToast}
            initialTab={transparencyInitialTab}
          />
        )}

        {/* Modal Undian Doorprize Senam Sehat Bersama LSM PPS */}
        {doorprizeModalOpen && (
          <DoorprizeModal
            isOpen={doorprizeModalOpen}
            onClose={handleCloseDoorprizeModal}
            config={doorprizeConfig}
            tickets={doorprizeTickets}
            onShowToast={showToast}
          />
        )}
      </Suspense>

      {/* Floating Tombol Cepat Ambil / Cek Nomor Doorprize Senam Sehat */}
      {!adminModalOpen &&
        (doorprizeConfig?.status === "OPEN" ||
          (Array.isArray(doorprizeConfig?.winners) &&
            doorprizeConfig.winners.length > 0)) &&
        !doorprizeModalOpen && (
          <div className="fixed bottom-4 left-4 z-[85] pointer-events-auto">
            {(() => {
              const savedMyTicket = getSavedMyTicket(doorprizeConfig?.roundId);
              const myLiveTicket = savedMyTicket
                ? doorprizeTickets.find((t) => t.id === savedMyTicket.id) ||
                  savedMyTicket
                : null;
              return (
                <button
                  type="button"
                  onClick={handleOpenDoorprizeModal}
                  className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-red-500/70 bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shadow-[0_12px_28px_-6px_rgba(220,38,38,0.45)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FACC15] text-black border border-amber-500/70 flex items-center justify-center shrink-0 shadow-sm">
                    <Ticket size={16} className="text-[#DC2626]" />
                  </div>
                  <div className="text-left">
                    <span className="flex items-center gap-1 font-mono font-black text-[9px] uppercase tracking-wider text-[#FACC15]">
                      <Dices size={10} />
                      <span>
                        {myLiveTicket
                          ? `NOMOR ANDA: #${
                              myLiveTicket.numberFormatted ||
                              formatTicketNumber(myLiveTicket.ticketNumber)
                            }`
                          : `DOORPRIZE ${
                              doorprizeConfig?.maxWinners || 10
                            } PEMENANG @ ${
                              doorprizeConfig?.prizePerWinner || "$10.000"
                            }`}
                      </span>
                    </span>
                    <strong className="font-heading font-black text-xs uppercase block leading-tight">
                      {myLiveTicket
                        ? "Cek Undian Senam Sehat"
                        : "Ambil Nomor Doorprize Senam"}
                    </strong>
                  </div>
                </button>
              );
            })()}
          </div>
        )}

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
