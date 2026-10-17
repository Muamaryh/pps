import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";

const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function BrutalistDatePicker({
  value,
  onChange,
  placeholder = "Pilih / ketik tanggal...",
  readOnlyInput = false,
  dropUp = "auto",
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
      const match = value.match(/(\d{1,2})\s+([A-Za-z'’]+)\s+(\d{4})/);
      if (match) {
        const parsedMonthName = match[2];
        const parsedYear = parseInt(match[3], 10);
        const parsedMonthIdx = INDO_MONTHS.findIndex(
          (m) => m.toLowerCase() === parsedMonthName.toLowerCase()
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

  // Format selection into Indonesian standard string
  function handleSelectDay(day) {
    const selectedDate = new Date(viewYear, viewMonth, day);
    const dayName = INDO_DAYS[selectedDate.getDay()];
    const monthName = INDO_MONTHS[viewMonth];
    const formatted = `${dayName}, ${day} ${monthName} ${viewYear}`;
    onChange(formatted);
    setIsOpen(false);
  }

  // Quick action: Select today
  function handleSelectToday(e) {
    e.preventDefault();
    const d = new Date();
    const dayName = INDO_DAYS[d.getDay()];
    const monthName = INDO_MONTHS[d.getMonth()];
    const formatted = `${dayName}, ${d.getDate()} ${monthName} ${d.getFullYear()}`;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    onChange(formatted);
    setIsOpen(false);
  }

  // Parse currently selected value to highlight the date
  let selectedDayNumber = null;
  let isCurrentMonthAndYearSelected = false;

  if (value && typeof value === "string") {
    const match = value.match(/(\d{1,2})\s+([A-Za-z'’]+)\s+(\d{4})/);
    if (match) {
      const parsedDay = parseInt(match[1], 10);
      const parsedMonthName = match[2];
      const parsedYear = parseInt(match[3], 10);

      const parsedMonthIdx = INDO_MONTHS.findIndex(
        (m) => m.toLowerCase() === parsedMonthName.toLowerCase()
      );

      if (parsedMonthIdx === viewMonth && parsedYear === viewYear) {
        selectedDayNumber = parsedDay;
        isCurrentMonthAndYearSelected = true;
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

  return (
    <div className={`relative w-full ${isOpen ? "z-30" : ""}`} ref={containerRef}>
      {/* Unified Single Input Container with Integrated Calendar Icon */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-left rounded bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[2px] active:translate-y-[2px] transition-all focus:outline-none focus:ring-2 focus:ring-[#FACC15] cursor-pointer ${
          isOpen ? "ring-2 ring-[#DC2626] dark:ring-[#FACC15]" : ""
        }`}
        title="Buka Kalender Pemilih Tanggal"
        aria-label="Pilih tanggal kegiatan"
      >
        <span className={`truncate pr-1 ${value ? "text-slate-900 dark:text-slate-100 font-extrabold" : "text-slate-400"}`}>
          {value || placeholder}
        </span>
        <div
          className={`w-6 h-6 rounded bg-[#FACC15] text-[#111827] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000] transition-colors duration-200 ${
            isOpen ? "bg-[#DC2626] text-white" : ""
          }`}
        >
          <CalendarIcon size={14} />
        </div>
      </button>

      {/* Brutalist Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 ${
            effectiveDropUp ? "bottom-full mb-2" : "top-full mt-2"
          } z-[90] w-72 bg-[#FFF9F2] dark:bg-[#161820] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] p-3 rounded-md animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b-2 border-black/15 dark:border-slate-700/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded border-2 border-black bg-white dark:bg-[#20232E] hover:bg-[#FACC15] text-[#111827] dark:text-slate-100 dark:hover:text-[#111827] flex items-center justify-center shadow-[1px_1px_0px_#000] cursor-pointer"
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
              className="w-7 h-7 rounded border-2 border-black bg-white dark:bg-[#20232E] hover:bg-[#FACC15] text-[#111827] dark:text-slate-100 dark:hover:text-[#111827] flex items-center justify-center shadow-[1px_1px_0px_#000] cursor-pointer"
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
                  className={`w-8 h-8 rounded text-xs font-heading font-extrabold flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FACC15] text-[#111827] border-2 border-black shadow-[2px_2px_0px_#000] font-black scale-105"
                      : isSunday
                      ? "border-black/30 dark:border-slate-700/60 hover:border-black hover:bg-[#FACC15] hover:text-[#111827] hover:shadow-[1px_1px_0px_#000] text-[#DC2626] dark:text-[#EF4444]"
                      : "border-black/30 dark:border-slate-700/60 hover:border-black hover:bg-[#FACC15] hover:text-[#111827] hover:shadow-[1px_1px_0px_#000] text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action */}
          <div className="mt-3 pt-2 border-t-2 border-dashed border-black/15 dark:border-slate-700/60 flex items-center justify-between">
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
              className="text-[10px] font-heading font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
