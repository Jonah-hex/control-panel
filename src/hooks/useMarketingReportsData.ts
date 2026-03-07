'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  ReservationReportRow,
  SaleReportRow,
  Marketer,
  MarketingReportsData,
} from '@/types/database'

interface UseMarketingReportsDataOptions {
  ownerId: string | null
  enabled?: boolean
}

interface UseMarketingReportsDataResult {
  data: MarketingReportsData
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const emptyData: MarketingReportsData = {
  reservations: [],
  sales: [],
  marketers: [],
  buildingsMap: {},
  unitsMap: {},
  unitsStatusCounts: { available: 0, reserved: 0, sold: 0 },
}

export function useMarketingReportsData({
  ownerId,
  enabled = true,
}: UseMarketingReportsDataOptions): UseMarketingReportsDataResult {
  const [data, setData] = useState<MarketingReportsData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!ownerId || !enabled) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    try {
      setLoading(true)
      setError(null)

      const [resRes, salesRes, marketersRes, buildingsRes] = await Promise.all([
        supabase
          .from('reservations')
          .select(
            'id, status, reservation_date, completed_at, cancelled_at, deposit_amount, deposit_refunded, marketer_id, building_id, unit_id, sale_id'
          )
          .order('reservation_date', { ascending: false }),
        supabase
          .from('sales')
          .select(
            'id, sale_date, sale_price, commission_amount, down_payment, remaining_payment, remaining_payment_due_date, payment_status, unit_id, building_id'
          )
          .order('sale_date', { ascending: false }),
        supabase
          .from('reservation_marketers')
          .select('id, name, phone')
          .eq('owner_id', ownerId)
          .order('name'),
        supabase.from('buildings').select('id, name').eq('owner_id', ownerId),
      ])

      if (resRes.error) throw new Error(resRes.error.message || 'فشل تحميل الحجوزات')
      if (salesRes.error) throw new Error(salesRes.error.message || 'فشل تحميل المبيعات')

      const resList = (resRes.data || []) as ReservationReportRow[]
      const salesList = (salesRes.data || []) as SaleReportRow[]
      const marketersList = (marketersRes.data || []) as Marketer[]
      const buildingsList = buildingsRes.data || []

      const bMap: Record<string, string> = {}
      buildingsList.forEach((b: { id: string; name: string }) => {
        bMap[b.id] = b.name
      })

      const buildingIdsForUnits = (buildingsList as { id: string }[]).map((b) => b.id)
      let unitsStatusCounts = { available: 0, reserved: 0, sold: 0 }
      if (buildingIdsForUnits.length) {
        const { data: unitsAll } = await supabase
          .from('units')
          .select('status')
          .in('building_id', buildingIdsForUnits)
        const list = (unitsAll || []) as { status: string }[]
        unitsStatusCounts = {
          available: list.filter((u) => u.status === 'available').length,
          reserved: list.filter((u) => u.status === 'reserved').length,
          sold: list.filter((u) => u.status === 'sold').length,
        }
      }

      const unitIds = [
        ...new Set([
          ...resList.map((r) => r.unit_id),
          ...salesList.map((s) => s.unit_id),
        ]),
      ].filter(Boolean) as string[]

      let uMap: Record<string, { unit_number: string; floor: number }> = {}
      if (unitIds.length) {
        const { data: unitsData } = await supabase
          .from('units')
          .select('id, unit_number, floor')
          .in('id', unitIds)
        ;(unitsData || []).forEach(
          (u: { id: string; unit_number: string; floor: number }) => {
            uMap[u.id] = { unit_number: u.unit_number, floor: u.floor }
          }
        )
      }

      setData({
        reservations: resList.map((r) => ({
          ...r,
          building: r.building_id ? { name: bMap[r.building_id] ?? '—' } : null,
          unit: r.unit_id && uMap[r.unit_id] ? { ...uMap[r.unit_id] } : null,
        })),
        sales: salesList.map((s) => ({
          ...s,
          building: s.building_id ? { name: bMap[s.building_id] ?? '—' } : null,
          unit: s.unit_id && uMap[s.unit_id] ? { ...uMap[s.unit_id] } : null,
        })),
        marketers: marketersList,
        buildingsMap: bMap,
        unitsMap: uMap,
        unitsStatusCounts,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل تحميل البيانات'
      setError(msg)
      setData(emptyData)
    } finally {
      setLoading(false)
    }
  }, [ownerId, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
