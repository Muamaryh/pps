import React, { useState, useEffect } from "react";
import EventMessengerPopup from "./EventMessengerPopup";
import BansosMessengerPopup from "./BansosMessengerPopup";

export default function CommunityMessengerDock({
  activeEvent,
  activeBansosProgram,
  onOpenRegisterEvent,
  onOpenBansos,
}) {
  const isEventActive = Boolean(
    activeEvent && activeEvent.showMessengerNotification !== false
  );
  const isBansosActive = Boolean(
    activeBansosProgram &&
      activeBansosProgram.status === "ACTIVE" &&
      activeBansosProgram.showMessengerNotification !== false
  );

  // Which popup is currently expanded as a full card? 'event' | 'bansos' | null
  const [activePopup, setActivePopup] = useState(null);

  // Auto pop-up initial impression after 1.5s
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("pps_messenger_dock_auto_opened")) {
      return;
    }
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pps_messenger_dock_auto_opened", "true");
      }
      if (isEventActive && activeEvent?.status === "OPEN") {
        setActivePopup("event");
      } else if (isBansosActive) {
        setActivePopup("bansos");
      } else if (isEventActive) {
        setActivePopup("event");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    isEventActive,
    isBansosActive,
    activeEvent?.id,
    activeEvent?.status,
    activeBansosProgram?.id,
  ]);

  if (!isEventActive && !isBansosActive) {
    return null;
  }

  function handleDismiss() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pps_messenger_dock_auto_opened", "true");
    }
    setActivePopup(null);
  }

  // Handle CTA actions: open respective modal & collapse card to pill
  function handleOpenEventModal(evt) {
    if (typeof onOpenRegisterEvent === "function") {
      onOpenRegisterEvent(evt);
    }
    handleDismiss();
  }

  function handleOpenBansosModal(prog) {
    if (typeof onOpenBansos === "function") {
      onOpenBansos(prog || activeBansosProgram);
    }
    handleDismiss();
  }

  return (
    <aside
      aria-label="Notifikasi Komunitas Paguyuban Pizza Sandy Shores"
      className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-[60] flex flex-col items-end gap-2.5 select-none pointer-events-none font-sans"
    >
      {/* CASE 1: BOTH Event & Bansos are Active (Smart Mutual Exclusion & Anti-Collision) */}
      {isEventActive && isBansosActive && (
        <>
          {/* Sub-case 1A: Event is expanded as a Card -> Bansos is displayed as top pill */}
          {activePopup === "event" && (
            <>
              <BansosMessengerPopup
                program={activeBansosProgram}
                isStacked={true}
                isOpen={false}
                onToggle={() => setActivePopup("bansos")}
                onOpenBansos={handleOpenBansosModal}
              />
              <EventMessengerPopup
                isStacked={true}
                isOpen={true}
                event={activeEvent}
                onClose={handleDismiss}
                onOpenRegisterEvent={handleOpenEventModal}
              />
            </>
          )}

          {/* Sub-case 1B: Bansos is expanded as a Card -> Event is displayed as top pill */}
          {activePopup === "bansos" && (
            <>
              <EventMessengerPopup
                isStacked={true}
                isOpen={false}
                event={activeEvent}
                onToggle={() => setActivePopup("event")}
                onOpenRegisterEvent={handleOpenEventModal}
              />
              <BansosMessengerPopup
                program={activeBansosProgram}
                isStacked={true}
                isOpen={true}
                onClose={handleDismiss}
                onOpenBansos={handleOpenBansosModal}
              />
            </>
          )}

          {/* Sub-case 1C: Both are minimized as pills (zero card open) */}
          {activePopup === null && (
            <>
              <EventMessengerPopup
                isStacked={true}
                isOpen={false}
                event={activeEvent}
                onToggle={() => setActivePopup("event")}
                onOpenRegisterEvent={handleOpenEventModal}
              />
              <BansosMessengerPopup
                program={activeBansosProgram}
                isStacked={true}
                isOpen={false}
                onToggle={() => setActivePopup("bansos")}
                onOpenBansos={handleOpenBansosModal}
              />
            </>
          )}
        </>
      )}

      {/* CASE 2: Only Event is active */}
      {isEventActive && !isBansosActive && (
        <EventMessengerPopup
          isStacked={true}
          isOpen={activePopup === "event"}
          event={activeEvent}
          onToggle={() =>
            setActivePopup((prev) => (prev === "event" ? null : "event"))
          }
          onClose={handleDismiss}
          onOpenRegisterEvent={handleOpenEventModal}
        />
      )}

      {/* CASE 3: Only Bansos is active */}
      {!isEventActive && isBansosActive && (
        <BansosMessengerPopup
          program={activeBansosProgram}
          isStacked={true}
          isOpen={activePopup === "bansos"}
          onToggle={() =>
            setActivePopup((prev) => (prev === "bansos" ? null : "bansos"))
          }
          onClose={handleDismiss}
          onOpenBansos={handleOpenBansosModal}
        />
      )}
    </aside>
  );
}
