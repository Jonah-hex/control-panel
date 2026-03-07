'use client'

import { StatusBadge, type StatusVariant } from './StatusBadge'

/**
 * بادج موحّد لحالة الوحدة (متاحة / محجوزة / مباعة) — يعتمد تصميم StatusBadge المشترك
 */
export type UnitStatus = 'available' | 'reserved' | 'sold'

const UNIT_VARIANT: Record<UnitStatus, StatusVariant> = {
  available: 'emerald',
  reserved: 'amber',
  sold: 'rose',
}

const UNIT_LABEL: Record<UnitStatus, string> = {
  available: 'متاحة',
  reserved: 'محجوزة',
  sold: 'مباعة',
}

const UNIT_LABEL_SHORT: Record<UnitStatus, string> = {
  available: 'متاح',
  reserved: 'محجوز',
  sold: 'مباع',
}

interface UnitStatusBadgeProps {
  status: UnitStatus | string | null | undefined
  /** عرض مختصر: متاح / محجوز / مباع (بدون تاء التأنيث) */
  short?: boolean
  className?: string
}

export function UnitStatusBadge({ status, short = false, className = '' }: UnitStatusBadgeProps) {
  const key = (status === 'available' || status === 'reserved' || status === 'sold' ? status : 'available') as UnitStatus
  const label = short ? UNIT_LABEL_SHORT[key] : UNIT_LABEL[key]
  return <StatusBadge label={label} variant={UNIT_VARIANT[key]} className={className} />
}

/** ألوان البادج فقط (للدمج مع نصوص مخصصة) — نفس تصميم StatusBadge */
export function getUnitStatusStyles(status: UnitStatus | string | null | undefined) {
  const key = (status === 'available' || status === 'reserved' || status === 'sold' ? status : 'available') as UnitStatus
  const v = UNIT_VARIANT[key]
  const classes = v === 'emerald' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' : v === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200/80' : v === 'rose' ? 'bg-rose-50 text-rose-800 border-rose-200/80' : 'bg-slate-50 text-slate-700 border-slate-200/80'
  return `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${classes}`
}

/** نص الحالة فقط */
export function getUnitStatusLabel(status: UnitStatus | string | null | undefined, short = false): string {
  if (!status) return '—'
  const key = (status === 'available' || status === 'reserved' || status === 'sold' ? status : 'available') as UnitStatus
  return short ? UNIT_LABEL_SHORT[key] : UNIT_LABEL[key]
}
