import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function BrutalistSelect({
  value,
  onChange,
  options = [],
  placeholder = "Pilih salah satu...",
  className = "",
  ariaLabel = "Pilihan Dropdown",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to { value, label } format
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value: value || "",
    label: value || placeholder,
  };

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(val) {
    onChange(val);
    setIsOpen(false);
  }

  return (
    <div className={`relative w-full select-none ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-left rounded bg-white dark:bg-[#20232E] text-slate-900 dark:text-slate-100 border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[2px] active:translate-y-[2px] transition-all focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
      >
        <span className="truncate pr-1 text-slate-900 dark:text-slate-100">
          {selectedOption.label || placeholder}
        </span>
        <div
          className={`w-6 h-6 rounded bg-[#FACC15] text-[#111827] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000] transition-transform duration-200 ${
            isOpen ? "rotate-180 bg-[#DC2626] text-white" : ""
          }`}
        >
          <ChevronDown size={14} strokeWidth={2.5} />
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 w-full z-50 rounded bg-[#FFFDF9] dark:bg-[#1A1D26] border-[2.5px] border-[#1A1A1A] dark:border-[#475569] shadow-[6px_6px_0px_#000000] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          {normalizedOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value || idx}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs text-left border-b border-black/10 dark:border-white/10 last:border-b-0 transition-colors ${
                  isSelected
                    ? "bg-[#FACC15] text-[#111827] font-black"
                    : "text-slate-900 dark:text-slate-100 font-bold hover:bg-[#FACC15]/20 dark:hover:bg-[#FACC15]/20 hover:text-black dark:hover:text-white"
                }`}
              >
                <div className="flex flex-col">
                  <span className="leading-snug">{opt.label}</span>
                  {opt.subtext && (
                    <span className="text-[10px] opacity-75 font-normal">{opt.subtext}</span>
                  )}
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-[#111827] text-[#FACC15] flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
