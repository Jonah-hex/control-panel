"use client";

import { SVGProps } from "react";

/**
 * رمز الريال السعودي الرسمي (Unicode U+20C1 — SAUDI RIYAL SIGN)
 * يُستخدم في كل أنحاء المنصة بدلاً من رمز الدولار للعملة.
 */
export function RiyalIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      {/* رمز الريال السعودي U+20C1 */}
      {/* رمز الريال السعودي الرسمي U+20C1 (قد لا تدعمه كل الخطوط — يُعرض ر.س كبديل) */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        fontFamily="'Arabic UI Display', 'Segoe UI', system-ui, sans-serif"
      >
        {"\u20C1"}
      </text>
    </svg>
  );
}
