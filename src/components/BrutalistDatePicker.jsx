import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";

const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Helper to format date value into readable Indonesian string for button display
function formatDisplayDate(val) {
  if (!val) return "";
  if (typeof val === "string") {
    // If already in "Senin, 5 November 2026" format
    if (val.includes(",")) return val;
    // If ISO "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const parts = val.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        const dayName = INDO_DAYS[dateObj.getDay()];
        const monthName = INDO_MONTHS[m];
        return `${dayName}, ${d} ${monthName} ${y}`;
      }
    }
    // If "05 Nov 2026" or similar
    const match = val.match(/(\d{1,2})\s+([A-Za-z'’]+)\s+(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const mStr = match[2].toLowerCase();
      const year = parseInt(match[3], 10);
      const mIdx = INDO_MONTHS.findIndex((m) => m.toLowerCase().startsWith(mStr.slice(0, 3)));
      if (mIdx !== -1) {
        const dateObj = new Date(year, mIdx, day);
        const dayName = INDO_DAYS[dateObj.getDay()];
        return `${dayName}, ${day} ${INDO_MONTHS[mIdx]} ${year}`;
      }
    }
  }
  return String(val);
}

export default function BrutalistDatePicker({
  value,
  onChange,
  placeholder = "Pilih / ketik tanggal...",
  readOnlyInput = false,
  dropUp = "auto",
  outputFormat = "id", // "id" | "iso"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [autoDropUp, setAutoDropUp] = useState(false);

  // Initialize calendar view year and month
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-indexed

  // Check dropUp placement
  useEffect(() => {
    if (dropUp === true || dropUp === false) return;
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Calendar height is ~300px; if space below is insufficient, open upward
      if (spaceBelow < 320 && rect.top > 280) {
        setAutoDropUp(true);
      } else {
        setAutoDropUp(false);
      }
    }
  }, [isOpen, dropUp]);

  const effectiveDropUp = typeof dropUp === "boolean" ? dropUp : autoDropUp;

  // Auto scroll slightly if needed when dropUp is active so top is not clipped
  useEffect(() => {
    if (isOpen && effectiveDropUp && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 280) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [isOpen, effectiveDropUp]);

  // Sync view to selected value on open
  useEffect(() => {
    if (isOpen && value && typeof value === "string") {
      // Check ISO format "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const parts = value.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m);
          return;
        }
      }

      // Check standard Indonesian format "Minggu, 1 November 2026"
      const match = value.match(/(\d{1,2})\s+([A-Za-z'’]+)\s+(\d{4})/);
      if (match) {
        const parsedMonthName = match[2];
        const parsedYear = parseInt(match[3], 10);
        const parsedMonthIdx = INDO_MONTHS.findIndex(
          (m) => m.toLowerCase().startsWith(parsedMonthName.toLowerCase().slice(0, 3))
        );
        if (parsedMonthIdx !== -1) {
          setViewMonth(parsedMonthIdx);
        }
        if (parsedYear) {
          setViewYear(parsedYear);
        }
      }
    }
  }, [isOpen, value]);

  // Close calendar popover on outside click
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

  // Navigate months
  function handlePrevMonth(e) {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }

  function handleNextMonth(e) {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }

  // Format selection into requested format (Indonesian string or ISO)
  function handleSelectDay(day) {
    const selectedDate = new Date(viewYear, viewMonth, day);
    if (outputFormat === "iso") {
      const y = viewYear;
      const m = String(viewMonth + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    } else {
      const dayName = INDO_DAYS[selectedDate.getDay()];
      const monthName = INDO_MONTHS[viewMonth];
      const formatted = `${dayName}, ${day} ${monthName} ${viewYear}`;
      onChange(formatted);
    }
    setIsOpen(false);
  }

  // Quick action: Select today
  function handleSelectToday(e) {
    e.preventDefault();
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());

    if (outputFormat === "iso") {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${day}`);
    } else {
      const dayName = INDO_DAYS[d.getDay()];
      const monthName = INDO_MONTHS[d.getMonth()];
      const formatted = `${dayName}, ${d.getDate()} ${monthName} ${d.getFullYear()}`;
      onChange(formatted);
    }
    setIsOpen(false);
  }

  // Parse currently selected value to highlight the date
  let selectedDayNumber = null;
  let isCurrentMonthAndYearSelected = false;

  if (value && typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const parts = value.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (y === viewYear && m === viewMonth) {
        selectedDayNumber = d;
        isCurrentMonthAndYearSelected = true;
      }
    } else {
      const match = value.match(/(\d{1,2})\s+([A-Za-z'’]+)\s+(\d{4})/);
      if (match) {
        const parsedDay = parseInt(match[1], 10);
        const parsedMonthName = match[2];
        const parsedYear = parseInt(match[3], 10);

        const parsedMonthIdx = INDO_MONTHS.findIndex(
          (m) => m.toLowerCase().startsWith(parsedMonthName.toLowerCase().slice(0, 3))
        );

        if (parsedMonthIdx === viewMonth && parsedYear === viewYear) {
          selectedDayNumber = parsedDay;
          isCurrentMonthAndYearSelected = true;
        }
      }
    }
  }

  // Calculate calendar grid for viewYear & viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 for Sunday
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const displayString = formatDisplayDate(value) || placeholder;

  return (
    <div className={`relative w-full ${isOpen ? "z-30" : ""}`} ref={containerRef}>
      {/* Unified Single Input Container with Integrated Calendar Icon */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-bold text-left rounded-xl bg-white dark:bg-[#141724] text-slate-900 dark:text-slate-100 border border-black/20 dark:border-white/15 hover:border-[#FACC15]/80 shadow-sm active:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] cursor-pointer ${
          isOpen ? "ring-2 ring-[#FACC15] border-[#FACC15]" : ""
        }`}
        title="Buka Kalender Pemilih Tanggal"
        aria-label="Pilih tanggal kegiatan"
      >
        <span className={`truncate pr-1 ${value ? "text-slate-900 dark:text-slate-100 font-extrabold" : "text-slate-400"}`}>
          {displayString}
        </span>
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 border ${
            isOpen
              ? "bg-[#DC2626] text-white border-red-500/70"
              : "bg-[#FACC15]/90 text-[#111827] border-amber-500/50"
          }`}
        >
          <CalendarIcon size={14} />
        </div>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 ${
            effectiveDropUp ? "bottom-full mb-2" : "top-full mt-2"
          } z-[90] w-72 bg-white dark:bg-[#0E111B] border border-black/15 dark:border-white/15 shadow-[0_16px_38px_-6px_rgba(15,23,42,0.22)] dark:shadow-[0_20px_44px_-6px_rgba(0,0,0,0.85)] p-3.5 rounded-2xl animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg border border-black/15 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-[#FACC15] text-[#111827] dark:text-slate-100 dark:hover:text-[#111827] flex items-center justify-center transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="font-heading font-black text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100">
              {INDO_MONTHS[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg border border-black/15 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-[#FACC15] text-[#111827] dark:text-slate-100 dark:hover:text-[#111827] flex items-center justify-center transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_HEADERS.map((day, idx) => (
              <span
                key={idx}
                className={`font-heading font-black text-[10px] uppercase ${
                  idx === 0 ? "text-[#DC2626]" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (cell === null) {
                return <div key={idx} className="w-8 h-8" />;
              }
              const isSunday = idx % 7 === 0;
              const isSelected = isCurrentMonthAndYearSelected && selectedDayNumber === cell;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell)}
                  className={`w-8 h-8 rounded-lg text-xs font-heading font-extrabold flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FACC15] text-[#111827] border-amber-500 shadow-sm font-black"
                      : isSunday
                      ? "border-black/10 dark:border-white/10 hover:border-[#FACC15] hover:bg-[#FACC15]/20 hover:text-[#111827] dark:hover:text-white text-[#DC2626] dark:text-[#EF4444]"
                      : "border-black/10 dark:border-white/10 hover:border-[#FACC15] hover:bg-[#FACC15]/20 hover:text-[#111827] dark:hover:text-white text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action */}
          <div className="mt-3 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[10px] font-heading font-black text-[#DC2626] dark:text-[#FACC15] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check size={12} />
              <span>Pilih Hari Ini</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-[10px] font-heading font-bold rounded-lg border border-black/15 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
