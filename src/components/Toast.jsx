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
      role="status"
      className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0E111B] text-slate-900 dark:text-slate-100 font-heading font-bold text-xs border border-black/15 dark:border-white/15 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.2)] dark:shadow-[0_14px_34px_-6px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      {icons[type] || icons.info}
      <span>{message}</span>
    </div>
  );
}
