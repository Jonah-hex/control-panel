/**
 * آلية موحدة لرقم سند العربون: BL- + 4 خانات (مثال BL-M53D)
 * — التوليد، التخزين، والعرض بنفس الطريقة في السكيمة والجداول.
 */

/** توليد رقم سند فريد: BL- + آخر 4 خانات (حروف/أرقام) */
export function generateReceiptNumber(): string {
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BL-${r}`;
}

/** توحيد البادئة إلى BL (السجلات القديمة قد تكون AR-) */
function normalizeReceiptPrefix(num: string): string {
  if (!num) return "";
  return num.startsWith("AR-") ? "BL-" + num.slice(3) : num;
}

/**
 * عرض رقم السند بالصيغة الموحدة: BL- + آخر 4 خانات.
 * — للجدول، البطاقات، والطباعة (نفس الطريقة في كل المواضع).
 */
export function formatReceiptNumberDisplay(num: string | null): string {
  if (!num || !num.trim()) return "—";
  const normalized = normalizeReceiptPrefix(num.trim());
  if (normalized.length <= 7) return normalized; // بالفعل قصير مثل BL-M53D
  return "BL-" + normalized.slice(-4);
}
