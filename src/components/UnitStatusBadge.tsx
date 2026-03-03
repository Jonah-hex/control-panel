'use client'

/**
 * بادج موحّد لحالة الوحدة (متاحة / محجوزة / مباعة) — هوية المنصة
 */
export type UnitStatus = 'available' | 'reserved' | 'sold'

const STATUS_CONFIG: Record<
  UnitStatus,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  available: {
    label: 'متاحة',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200/80',
  },
  reserved: {
    label: 'محجوزة',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/80',
  },
  sold: {
    label: 'مباعة',
    dot: 'bg-slate-500',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200/80',
  },
}

interface UnitStatusBadgeProps {
  status: UnitStatus | string | null | undefined
  /** عرض مختصر: متاح / محجوز / مباع (بدون تاء التأنيث) */
  short?: boolean
  className?: string
}

export function UnitStatusBadge({ status, short = false, className = '' }: UnitStatusBadgeProps) {
  const key = (status === 'available' || status === 'reserved' || status === 'sold' ? status : 'available') as UnitStatus
  const config = STATUS_CONFIG[key]
  const label = short
    ? key === 'available'
      ? 'متاح'
      : key === 'reserved'
        ? 'محجوز'
        : 'مباع'
    : config.label

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-sm ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} aria-hidden />
      {label}
    </span>
  )
}

/** ألوان البادج فقط (للدمج مع نصوص مخصصة) */
export function getUnitStatusStyles(status: UnitStatus | string | null | undefined) {
  const key = (status === 'available' || status === 'reserved' || status === 'sold' ? status : 'available') as UnitStatus
  const c = STATUS_CONFIG[key]
  return `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-sm ${c.bg} ${c.text} ${c.border}`
}

/** نص الحالة فقط */
export function getUnitStatusLabel(status: UnitStatus | string | null | undefined, short = false): string {
  if (!status) return '—'
  const key = (status === 'available' || status === 'reserved' || status === 'sold' ? status : 'available') as UnitStatus
  if (short)
    return key === 'available' ? 'متاح' : key === 'reserved' ? 'محجوز' : 'مباع'
  return STATUS_CONFIG[key].label
}
