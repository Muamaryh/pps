import React, { useState, useRef, useEffect } from "react";
import { Clock as ClockIcon, Check, ChevronUp, ChevronDown } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const PRESETS = [
  { label: "Pagi", time: "08:00" },
  { label: "Siang", time: "12:00" },
  { label: "Sore", time: "16:00" },
  { label: "Malam", time: "20:00" },
];

export default function BrutalistTimePicker({
  value = "12:00",
  onChange,
  placeholder = "Pilih jam...",
  dropUp = "auto",
  align = "auto", // "auto" | "left" | "right"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [autoDropUp, setAutoDropUp] = useState(false);
  const [autoAlignRight, setAutoAlignRight] = useState(false);

  // Parse current hour and minute safely
  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return { hour: "12", minute: "00" };
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{1,2})/);
    if (match) {
      const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      return {
        hour: String(h).padStart(2, "0"),
        minute: String(m).padStart(2, "0"),
      };
    }
    return { hour: "12", minute: "00" };
  };

  const { hour: currentHour, minute: currentMinute } = parseTime(value);
  const [tempHour, setTempHour] = useState(currentHour);
  const [tempMinute, setTempMinute] = useState(currentMinute);

  // Sync temp state with incoming value
  useEffect(() => {
    const { hour, minute } = parseTime(value);
    setTempHour(hour);
    setTempMinute(minute);
  }, [value, isOpen]);

  // Check dropUp and horizontal alignment dynamically
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Vertical placement
      if (dropUp === "auto") {
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 300 && rect.top > 260) {
          setAutoDropUp(true);
        } else {
          setAutoDropUp(false);
        }
      }

      // Horizontal placement
      if (align === "auto") {
        const spaceRight = window.innerWidth - rect.right;
        if (spaceRight < 160) {
          setAutoAlignRight(true);
        } else {
          setAutoAlignRight(false);
        }
      }
    }
  }, [isOpen, dropUp, align]);

  const effectiveDropUp = typeof dropUp === "boolean" ? dropUp : autoDropUp;
  const effectiveAlignRight = align === "right" ? true : align === "left" ? false : autoAlignRight;

  // Auto scroll into view if top is clipped
  useEffect(() => {
    if (isOpen && effectiveDropUp && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 260) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [isOpen, effectiveDropUp]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const commitTime = (h, m) => {
    const finalH = String(h).padStart(2, "0");
    const finalM = String(m).padStart(2, "0");
    setTempHour(finalH);
    setTempMinute(finalM);
    if (onChange) {
      onChange(`${finalH}:${finalM}`);
    }
  };

  const handleSelectHour = (h) => {
    commitTime(h, tempMinute);
  };

  const handleSelectMinute = (m) => {
    commitTime(tempHour, m);
  };

  const handleSelectPreset = (timeStr) => {
    const { hour, minute } = parseTime(timeStr);
    commitTime(hour, minute);
  };

  const handleSelectNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    commitTime(h, m);
    setIsOpen(false);
  };

  const adjustMinute = (delta) => {
    let m = parseInt(tempMinute, 10) + delta;
    let h = parseInt(tempHour, 10);
    if (m >= 60) {
      m = 0;
      h = (h + 1) % 24;
    } else if (m < 0) {
      m = 59;
      h = (h - 1 + 24) % 24;
    }
    commitTime(String(h).padStart(2, "0"), String(m).padStart(2, "0"));
  };

  return (
    <div className={`relative w-full ${isOpen ? "z-30" : ""}`} ref={containerRef}>
      {/* Unified Neo-Brutalist Time Button Container */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-left rounded-xl bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[2px] active:translate-y-[2px] transition-all focus:outline-none focus:ring-2 focus:ring-[#FACC15] cursor-pointer ${
          isOpen ? "ring-2 ring-[#DC2626] dark:ring-[#FACC15]" : ""
        }`}
        title="Buka Pemilih Jam & Menit"
        aria-label="Pilih jam"
      >
        <div className="flex items-center gap-1.5 truncate pr-1">
          <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 tracking-wider">
            {value ? `${tempHour}:${tempMinute} WIB` : placeholder}
          </span>
        </div>
        <div
          className={`w-6 h-6 rounded-lg bg-[#FACC15] text-[#111827] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000] transition-colors duration-200 ${
            isOpen ? "bg-[#DC2626] text-white" : ""
          }`}
        >
          <ClockIcon size={14} />
        </div>
      </button>

      {/* Brutalist Time Popover */}
      {isOpen && (
        <div
          className={`absolute ${effectiveAlignRight ? "right-0" : "left-0"} ${
            effectiveDropUp ? "bottom-full mb-2" : "top-full mt-2"
          } z-[90] w-72 bg-[#FFF9F2] dark:bg-[#161820] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] p-3.5 rounded-2xl animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          {/* Header Popover with Live Big Display */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-black/15 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-[#FACC15] border border-black flex items-center justify-center text-slate-950 font-black">
                <ClockIcon size={12} />
              </div>
              <span className="font-heading font-black text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100">
                Pilih Jam &amp; Menit
              </span>
            </div>

            {/* Big Active Time Tag */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-white dark:bg-[#20232E] border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
              <span className="font-mono font-black text-sm text-[#DC2626] dark:text-[#FACC15]">
                {tempHour}:{tempMinute}
              </span>
              <span className="font-mono text-[9px] font-black text-slate-500">WIB</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-2">
            <div className="text-[9px] font-heading font-bold uppercase text-slate-500 mb-1">
              Jadwal Cepat:
            </div>
            <div className="grid grid-cols-4 gap-1">
              {PRESETS.map((p) => {
                const isActive = tempHour === p.time.split(":")[0] && tempMinute === p.time.split(":")[1];
                return (
                  <button
                    key={p.time}
                    type="button"
                    onClick={() => handleSelectPreset(p.time)}
                    className={`py-1 px-0.5 rounded-lg border transition-all cursor-pointer text-center ${
                      isActive
                        ? "bg-[#FACC15] text-[#111827] border-black shadow-[1.5px_1.5px_0px_#000] font-black scale-102"
                        : "bg-white dark:bg-[#20232E] border-black/20 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-black hover:bg-amber-100 font-bold"
                    }`}
                  >
                    <div className="font-mono text-[10px] leading-tight font-black">{p.time}</div>
                    <div className="text-[8px] text-slate-500">{p.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Columns: Hour & Minute Selectors */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {/* Hours Column */}
            <div>
              <div className="text-[9px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Jam (00–23)</span>
                <span className="font-mono font-black text-[#DC2626] dark:text-[#FACC15]">{tempHour}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 max-h-28 overflow-y-auto p-1 border-2 border-black/20 dark:border-white/10 rounded-xl bg-white dark:bg-[#1A1D27] scrollbar-thin">
                {HOURS.map((h) => {
                  const isSelected = h === tempHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`py-1 text-center font-mono font-black text-xs rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FACC15] text-[#111827] border-2 border-black shadow-[1.5px_1.5px_0px_#000] scale-105"
                          : "border-transparent hover:border-black hover:bg-amber-100 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <div className="text-[9px] font-heading font-black uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Menit</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustMinute(-1)}
                    className="w-4 h-4 rounded-md border border-black bg-white dark:bg-[#20232E] hover:bg-amber-200 text-slate-900 dark:text-slate-100 flex items-center justify-center cursor-pointer"
                    title="-1 Menit"
                  >
                    <ChevronDown size={11} />
                  </button>
                  <span className="font-mono font-black text-[#DC2626] dark:text-[#FACC15]">:{tempMinute}</span>
                  <button
                    type="button"
                    onClick={() => adjustMinute(1)}
                    className="w-4 h-4 rounded-md border border-black bg-white dark:bg-[#20232E] hover:bg-amber-200 text-slate-900 dark:text-slate-100 flex items-center justify-center cursor-pointer"
                    title="+1 Menit"
                  >
                    <ChevronUp size={11} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto p-1 border-2 border-black/20 dark:border-white/10 rounded-xl bg-white dark:bg-[#1A1D27] scrollbar-thin">
                {MINUTES.map((m) => {
                  const isSelected = m === tempMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`py-1 text-center font-mono font-black text-xs rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FACC15] text-[#111827] border-2 border-black shadow-[1.5px_1.5px_0px_#000] scale-105"
                          : "border-transparent hover:border-black hover:bg-amber-100 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Footer Action */}
          <div className="pt-2 border-t-2 border-dashed border-black/15 dark:border-slate-700/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectNow}
              className="text-[10px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check size={12} />
              <span>Jam Sekarang</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1 text-[11px] font-heading font-black rounded-lg bg-[#FACC15] text-slate-950 border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-yellow-400 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
