import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 size={16} className="text-[#2EC4B6]" />,
    error: <AlertCircle size={16} className="text-[#FF6E4A]" />,
    info: <Info size={16} className="text-[#FAAE2B]" />,
  };

  return (
    <div
      onClick={onClose}
      className="cursor-pointer card-brutal flex items-center gap-2.5 px-4 py-2.5 bg-[var(--card-bg)] text-[#1A1A1A] dark:text-[#E3E5E8] font-heading font-black text-xs border-2 shadow-[3px_3px_0px_#1A1A1A] dark:shadow-[3px_3px_0px_#000] animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      {icons[type] || icons.info}
      <span>{message}</span>
    </div>
  );
}
