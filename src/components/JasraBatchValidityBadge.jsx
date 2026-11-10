import React from "react";
import { Clock } from "lucide-react";
import { formatJasraShortDate } from "../services/jasraService";

/**
 * Shared batch validity countdown badge for JasraPanel and TransparencyModal.
 */
export default function JasraBatchValidityBadge({ batchRemaining }) {
  if (!batchRemaining) return null;

  const isExpired = Boolean(batchRemaining.isExpired);

  return (
    <div
      className={`p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-3 shrink-0 ${
        isExpired
          ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          : "bg-[#FACC15] text-slate-950"
      }`}
    >
      <Clock size={22} className={isExpired ? "text-slate-500" : "text-[#DC2626]"} />
      <div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider block leading-tight ${
            isExpired ? "text-slate-600 dark:text-slate-400" : "text-slate-800"
          }`}
        >
          {isExpired ? "Status Batch" : "Masa Berlaku"}
        </span>
        <strong className="font-heading font-black text-base block leading-tight">
          {isExpired ? "Kedaluwarsa" : `Sisa ${batchRemaining.daysRemaining} Hari`}
        </strong>
        <span className="text-[10px] font-mono block opacity-85 leading-tight">
          s/d {formatJasraShortDate(batchRemaining.expiresAt)}
        </span>
      </div>
    </div>
  );
}
