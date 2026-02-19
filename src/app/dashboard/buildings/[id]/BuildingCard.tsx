"use client";
import { ReactNode, useRef, useEffect } from "react";
import gsap from "gsap";

import { LucideIcon } from "lucide-react";

interface CardProps {
  title: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  effect?: "js" | "motion" | "gsap";
  icon?: LucideIcon;
  gradient?: string; // tailwind classes for bg-gradient-to-br ...
  iconColor?: string; // tailwind color class
}

export default function BuildingCard({ title, children, open, onToggle, effect, icon: Icon, gradient, iconColor }: CardProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Basic JS slide effect
  useEffect(() => {
    if (!contentRef.current) return;
    if (effect === "js") {
      if (open) {
        contentRef.current.style.maxHeight = contentRef.current.scrollHeight + "px";
      } else {
        contentRef.current.style.maxHeight = "0px";
      }
    } else if (effect === "gsap") {
      if (open) {
        gsap.to(contentRef.current, { height: "auto", duration: 0.5, ease: "power2.out", onStart: () => {
          contentRef.current!.style.overflow = "hidden";
        }, onComplete: () => {
          contentRef.current!.style.overflow = "visible";
        }});
      } else {
        gsap.to(contentRef.current, { height: 0, duration: 0.5, ease: "power2.in", onStart: () => {
          contentRef.current!.style.overflow = "hidden";
        }});
      }
    }
  }, [open, effect]);

  return (
    <div
      className="group relative rounded-2xl shadow-md hover:shadow-lg transition-all duration-400 border border-gray-100 bg-white/90 overflow-hidden mb-8"
      dir="rtl"
      style={{marginBottom: 32, padding: 0}}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex flex-col items-center justify-center gap-2 bg-white/70 px-0 pt-7 pb-3 border-b border-gray-100 outline-none focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer"
        style={{borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', background: 'rgba(255,255,255,0.85)'}}
      >
        {Icon && (
          <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full shadow-md mb-2 bg-gradient-to-br ${gradient || 'from-blue-500 to-purple-500'} ${iconColor || ''}`}>
            <Icon className={`w-8 h-8 ${iconColor || 'text-white'}`} />
          </span>
        )}
        <span className="font-bold text-lg text-gray-800 mb-1">{title}</span>
      </button>
      <div
        ref={contentRef}
        style={{
          maxHeight: effect === "js" ? (open ? undefined : 0) : undefined,
          height: effect === "gsap" ? (open ? "auto" : 0) : undefined,
          transition: effect === "js" ? "max-height 0.4s cubic-bezier(.4,0,.2,1)" : undefined,
          padding: open ? '2em 2em 1.5em 2em' : '0 2em',
          background: 'rgba(255,255,255,0.97)',
          overflow: 'hidden',
        }}
        className="transition-all duration-500"
      >
        {open && (
          <div className="text-gray-800 text-base animate-fadeIn">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
