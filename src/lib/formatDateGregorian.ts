/**
 * تنسيق موحّد للمنصة: تاريخ ميلادي فقط (DD/MM/YYYY، أرقام إنجليزية).
 * لا تستخدم ar-SA لعرض التواريخ — قد يعرض هجريًا حسب المتصفح.
 */
const GREGORIAN: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function formatDateGregorian(
  dateStr: string | null | undefined,
  opts?: { withTime?: boolean }
): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  if (opts?.withTime) {
    return `${d.toLocaleDateString("en-GB", GREGORIAN)} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  }
  return d.toLocaleDateString("en-GB", GREGORIAN);
}
