"use client";

/**
 * بادج حالة موحّد للمنصة — نقطة + نص + أطراف بيضاوية + حد + ظل.
 * يُستخدم لحالات الوحدات (متاحة/محجوزة/مباعة) وحالات الاستثمار (تحت الإنشاء/تم إعادة البيع/ملغي) وأي حالة أخرى.
 */
export type StatusVariant = "emerald" | "amber" | "slate" | "rose";

const VARIANT_CLASSES: Record<
  StatusVariant,
  { dot: string; bg: string; text: string; border: string }
> = {
  emerald: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200/80",
  },
  amber: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200/80",
  },
  slate: {
    dot: "bg-slate-500",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200/80",
  },
  rose: {
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200/80",
  },
};

export interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
  className?: string;
}

export function StatusBadge({ label, variant, className = "" }: StatusBadgeProps) {
  const c = VARIANT_CLASSES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${c.bg} ${c.text} ${c.border} ${className}`.trim()}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} aria-hidden />
      {label}
    </span>
  );
}
