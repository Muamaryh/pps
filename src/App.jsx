import React, { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { loadCloudData, defaultData, mergeWithDefaults, sanitizeSandyShores } from "./services/firebase";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import ProgramsShowcase from "./components/ProgramsShowcase";
import DonorsSection from "./components/DonorsSection";
import OrgStructure from "./components/OrgStructure";
import StructurePage from "./components/StructurePage";
import GalleryPage from "./components/GalleryPage";
import Footer from "./components/Footer";
import LightboxModal from "./components/LightboxModal";
import AdminModal from "./components/AdminModal";
import ServicePortalModal from "./components/ServicePortalModal";
import MemberRegistrationModal from "./components/MemberRegistrationModal";
import MembersDirectoryModal from "./components/MembersDirectoryModal";
import EventRegistrationModal from "./components/EventRegistrationModal";
import BansosModal from "./components/BansosModal";
import PermitModal from "./components/PermitModal";
import TransparencyModal from "./components/TransparencyModal";
import CommunityMessengerDock from "./components/CommunityMessengerDock";
import Toast from "./components/Toast";
import FloatingActions from "./components/FloatingActions";
import PizzaLoader from "./components/PizzaLoader";
import { Users, Camera, ArrowRight, Ticket, Dices } from "lucide-react";
import { subscribeMembersCloud } from "./services/memberService";
import { subscribeEventsCloud, DEFAULT_EVENT } from "./services/eventService";
import { subscribeBansosProgramsCloud, DEFAULT_BANSOS_PROGRAM } from "./services/bansosService";
import DoorprizeModal from "./components/DoorprizeModal";
import {
  subscribeDoorprizeConfigCloud,
  subscribeDoorprizeTicketsCloud,
  DEFAULT_DOORPRIZE_CONFIG,
  getSavedMyTicket,
  formatTicketNumber,
} from "./services/doorprizeService";

export default function App() {
  const [memberCount, setMemberCount] = useState(0);
  const [eventsList, setEventsList] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_events_list_cache");
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    const isInit = typeof window !== "undefined" && localStorage.getItem("pps_events_initialized") === "true";
    return isInit ? [] : [DEFAULT_EVENT];
  });
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

  const [bansosPrograms, setBansosPrograms] = useState(() => {
    try {
      const cached = localStorage.getItem("pps_bansos_programs_cache");
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    const isInit =
      typeof window !== "undefined" &&
      localStorage.getItem("pps_bansos_programs_initialized") === "true";
    return isInit ? [] : [DEFAULT_BANSOS_PROGRAM];
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

  // Real-time Member Count Subscription
  useEffect(() => {
    const unsub = subscribeMembersCloud(
      (members) => {
        if (Array.isArray(members)) {
          setMemberCount(members.length);
        }
      },
      () => {}
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Real-time Dynamic Events Subscription
  useEffect(() => {
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
  }, []);

  // Real-time Dynamic Bansos Programs Subscription
  useEffect(() => {
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
  }, []);

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
  const [doorprizeConfig, setDoorprizeConfig] = useState(DEFAULT_DOORPRIZE_CONFIG);
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
    const unsubCfg = subscribeDoorprizeConfigCloud((cfg) => {
      setDoorprizeConfig(cfg);
      if (
        cfg.status === "OPEN" &&
        cfg.autoPopupOnVisit !== false &&
        !hasAutoOpenedDoorprize
      ) {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const isOtherDirectModal =
          path.includes("/admin") ||
          hash.includes("admin") ||
          path.includes("/transparansi") ||
          hash.includes("transparansi") ||
          path.includes("/anggota") ||
          hash.includes("anggota");
        if (!isOtherDirectModal) {
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
  }, [hasAutoOpenedDoorprize]);

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

  function showToast(message, type = "info") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

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
      {/* Sticky Header Area: Signature Yellow & Red Dual Top Strip + Notice Bar Orang Baik */}
      <div className="sticky top-0 z-40 w-full bg-[#FAF7EE] dark:bg-[#07090E] shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors">
        {/* Signature Yellow & Red Dual Top Strip */}
        <div className="w-full flex h-1 sm:h-1.5 shrink-0 border-b border-black/10 dark:border-black/40">
          <div className="flex-1 bg-[#FACC15]" />
          <div className="w-24 sm:w-36 bg-[#DC2626]" />
        </div>

        {/* Notice Bar Orang Baik (Lebar Mentok Kiri-Kanan Di Atas Headbar) */}
        <DonorsSection onOpenTransparency={handleOpenTransparency} />
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
          <GalleryPage
            gallery={data.gallery}
            onOpenLightbox={handleOpenLightbox}
            onNavigateHome={handleNavigateToHome}
            onOpenServicePortal={handleOpenServicePortal}
          />
        ) : currentPage === "structure" ? (
          <StructurePage
            org={data.org}
            tierTitles={data?.orgTierTitles}
            onOpenLightbox={handleOpenLightbox}
            onNavigateHome={handleNavigateToHome}
          />
        ) : (
          <>
            {/* Hero Section */}
            <Hero
              heading={data.heading}
              subtext={data.subtext}
              onOpenPermit={() => setIsPermitModalOpen(true)}
              onNavigateToStructure={handleNavigateToStructure}
              onNavigateToGallery={handleNavigateToGallery}
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
            <section id="portal-arsip" className="pt-12 sm:pt-16 mt-10 sm:mt-14 border-t border-black/20 dark:border-white/10 w-full scroll-mt-24">
              {/* Title Bar Pemisah */}
              <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-black/20 dark:border-white/10 flex-wrap">
                <div>
                  <div className="card-label mb-1">
                    PORTAL INFORMASI &amp; ARSIP LEMBAGA
                  </div>
                  <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
                    Struktur &amp; Dokumentasi Kegiatan
                  </h2>
                </div>
                <div className="badge-brutal badge-yellow font-black">
                  DIREKTORI RESMI
                </div>
              </div>

              {/* Dual Quick-Access Teasers: Susunan Pengurus & Dokumentasi Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {/* Card 1: Bagan Kepengurusan */}
                <div
                  onClick={handleNavigateToStructure}
                  className="card-brutal bg-white dark:bg-[#121622] p-6 sm:p-8 border border-black/20 dark:border-white/20 shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.75)] flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
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
                  onClick={handleNavigateToGallery}
                  className="card-brutal bg-white dark:bg-[#121622] p-6 sm:p-8 border border-black/20 dark:border-white/20 shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.75)] flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
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

      {/* Floating Action Buttons: Anggota LSM PPS & Daftar Layanan */}
      <FloatingActions
        memberCount={memberCount}
        onOpenRegister={handleOpenRegister}
        onOpenServicePortal={handleOpenServicePortal}
        onOpenMembersDirectory={handleOpenMembersDirectory}
      />

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
      <CommunityMessengerDock
        activeEvent={activeEvent}
        activeBansosProgram={activeBansosProgram}
        onOpenRegisterEvent={handleOpenEventModal}
        onOpenBansos={handleOpenBansosModal}
      />

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

      {/* Modal Pendaftaran Event Akbar LSM PPS (/event) */}
      <EventRegistrationModal
        isOpen={eventModalOpen}
        onClose={handleCloseEventModal}
        event={selectedEventForModal || activeEvent}
      />

      {/* Modal Khusus Bantuan Sosial Warga (/bansos) - Dynamic Programs */}
      <BansosModal
        isOpen={bansosModalOpen}
        onClose={handleCloseBansosModal}
        onShowToast={showToast}
        activeProgram={selectedBansosProgramForModal || activeBansosProgram}
        bansosPrograms={bansosPrograms}
      />

      {/* Modal Khusus Pendaftaran Anggota LSM PPS (Dengan OCR KTP Otomatis) */}
      <MemberRegistrationModal
        isOpen={memberModalOpen}
        onClose={handleCloseRegister}
        onShowToast={showToast}
        discordUrl={discordUrl}
      />

      {/* Portal Layanan Warga: Lapak UMKM, Request Meeting & Lacak Tiket (GTA V IME Roleplay) */}
      <ServicePortalModal
        isOpen={servicePortalOpen}
        onClose={handleCloseServicePortal}
        onShowToast={showToast}
        initialTab={servicePortalTab}
        discordUrl={discordUrl}
        discordVisitorUrl={discordVisitorUrl}
      />

      {/* Admin CMS Modal */}
      <AdminModal
        isOpen={adminModalOpen}
        onClose={handleCloseAdminModal}
        initialData={data}
        isCloudLoading={loading}
        eventsList={eventsList}
        bansosPrograms={bansosPrograms}
        doorprizeTickets={doorprizeTickets}
        onDataSaved={(newData) => setData(newData)}
        onShowToast={showToast}
        onOpenTransparency={handleOpenTransparency}
      />

      {/* Modal Surat Izin Komunitas Pemerintah San Andreas */}
      <PermitModal
        isOpen={isPermitModalOpen}
        onClose={() => setIsPermitModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Modal Portal Transparansi & Laporan Resmi Pemerintah (/transparansi) */}
      <TransparencyModal
        isOpen={transparencyModalOpen}
        onClose={handleCloseTransparency}
        onShowToast={showToast}
        initialTab={transparencyInitialTab}
      />

      {/* Modal Undian Doorprize Senam Sehat Bersama LSM PPS */}
      <DoorprizeModal
        isOpen={doorprizeModalOpen}
        onClose={handleCloseDoorprizeModal}
        config={doorprizeConfig}
        tickets={doorprizeTickets}
        onShowToast={showToast}
      />

      {/* Floating Tombol Cepat Ambil / Cek Nomor Doorprize Senam Sehat */}
      {(doorprizeConfig?.status === "OPEN" ||
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
                  className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border-[2.5px] border-black bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FACC15] text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
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
                              !doorprizeConfig?.maxWinners || Number(doorprizeConfig.maxWinners) === 5
                                ? 10
                                : doorprizeConfig.maxWinners
                            } PEMENANG @ ${
                              !doorprizeConfig?.prizePerWinner || doorprizeConfig.prizePerWinner === "$15.000"
                                ? "$10.000"
                                : doorprizeConfig.prizePerWinner
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
