'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StatisticsStats } from '@/types/database'

interface UseStatisticsOptions {
  ownerId: string | null
  enabled?: boolean
}

interface UseStatisticsResult {
  stats: StatisticsStats | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useStatistics({
  ownerId,
  enabled = true,
}: UseStatisticsOptions): UseStatisticsResult {
  const [stats, setStats] = useState<StatisticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatistics = useCallback(async () => {
    if (!ownerId || !enabled) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    try {
      setLoading(true)
      setError(null)

      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', ownerId)

      if (buildingsError) throw buildingsError

      const buildingIds = (buildings || []).map((b: { id: string }) => b.id)

      const [unitsRes, salesRes, reservationsRes, biRes, uiRes] = await Promise.all([
        supabase.from('units').select('*').in('building_id', buildingIds.length ? buildingIds : ['']),
        buildingIds.length
          ? supabase.from('sales').select('id, building_id, sale_price, sale_date, buyer_name').in('building_id', buildingIds)
          : { data: [] as { building_id?: string; sale_price?: number; sale_date?: string; buyer_name?: string | null }[], error: null },
        buildingIds.length
          ? supabase.from('reservations').select('id, status, sale_id').in('building_id', buildingIds)
          : { data: [] as { sale_id?: string | null }[], error: null },
        supabase.from('building_investors').select('id, building_id, total_invested_amount').eq('owner_id', ownerId),
        supabase.from('unit_investments').select('id, building_id, purchase_price, resale_sale_id').eq('owner_id', ownerId),
      ])

      const units = unitsRes.data || []
      if (unitsRes.error) throw unitsRes.error

      const sales = (salesRes.data || []) as { id?: string; building_id?: string; sale_price?: number; sale_date?: string; buyer_name?: string | null }[]
      const reservations = (reservationsRes.data || []) as { sale_id?: string | null }[]
      const buildingInvestors = (biRes.data || []) as { id: string; building_id: string; total_invested_amount?: number | null }[]
      const unitInvestments = (uiRes.data || []) as { id: string; building_id: string; purchase_price?: number | null; resale_sale_id?: string | null }[]

      const totalBuildings = buildings?.length || 0
      const totalUnits = units.length || 0
      const availableUnits = units.filter((u: { status: string }) => u.status === 'available').length || 0
      const reservedUnits = units.filter((u: { status: string }) => u.status === 'reserved').length || 0
      const soldUnits = units.filter((u: { status: string }) => u.status === 'sold').length || 0
      const unitsWithPrice = units.filter((u: { price: number | null }) => u.price && u.price > 0) || []
      const totalRevenue =
        units
          .filter((u: { status: string; price: number | null }) => u.status === 'sold' && u.price)
          .reduce((sum: number, u: { price: number }) => sum + u.price, 0) || 0
      const averagePrice =
        unitsWithPrice.length > 0
          ? unitsWithPrice.reduce((s: number, u: { price: number }) => s + (u.price || 0), 0) / unitsWithPrice.length
          : 0
      const averageArea =
        totalUnits > 0
          ? (units.reduce((s: number, u: { area?: number }) => s + (u.area || 0), 0) || 0) / totalUnits
          : 0
      const occupancyRate = totalUnits > 0 ? ((reservedUnits + soldUnits) / totalUnits) * 100 : 0

      const buildingIdsSet = new Set(buildingIds)
      const salesCount = sales.length
      const totalRevenueFromSales = sales.reduce((s, x) => s + (Number(x.sale_price) || 0), 0)
      const resaleSaleIds = new Set(unitInvestments.map((ui) => ui.resale_sale_id).filter(Boolean) as string[])
      const resaleAmount = sales
        .filter((s) => s.id && resaleSaleIds.has(s.id))
        .reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0)
      const investorCapitalAmount = unitInvestments
        .filter((ui) => buildingIdsSet.has(ui.building_id))
        .reduce((sum, ui) => sum + (Number(ui.purchase_price) || 0), 0)
      const realizedRevenue = Math.max(0, totalRevenueFromSales - resaleAmount - investorCapitalAmount)
      const reservationsWithSale = reservations.filter((r) => r.sale_id).length
      const conversionRate = reservations.length > 0 ? (reservationsWithSale / reservations.length) * 100 : 0
      const portfolioValueAvailable = units
        .filter((u: { status: string; price?: number | null }) => u.status === 'available' && u.price)
        .reduce((s: number, u: { price?: number }) => s + (Number(u.price) || 0), 0)
      const prices = unitsWithPrice.map((u: { price?: number }) => Number(u.price) || 0)
      const minUnitPrice = prices.length ? Math.min(...prices) : 0
      const maxUnitPrice = prices.length ? Math.max(...prices) : 0
      const averageDealValue = salesCount > 0 ? totalRevenueFromSales / salesCount : 0
      const investorsCount = buildingInvestors.length + unitInvestments.length
      const distinctOwners = new Set(sales.map((s) => (s.buyer_name || '').trim()).filter(Boolean))
      const ownersCount = distinctOwners.size

      const buildingsWithInvestorsSet = new Set<string>()
      buildingInvestors.forEach((bi) => {
        if (buildingIdsSet.has(bi.building_id)) buildingsWithInvestorsSet.add(bi.building_id)
      })
      unitInvestments.forEach((ui) => {
        if (buildingIdsSet.has(ui.building_id)) buildingsWithInvestorsSet.add(ui.building_id)
      })
      const buildingsWithInvestorsCount = buildingsWithInvestorsSet.size
      const buildingsWithInvestorsPct = totalBuildings > 0 ? (buildingsWithInvestorsCount / totalBuildings) * 100 : 0

      const buildingsWithOwnersSet = new Set<string>()
      units.forEach((u: { building_id: string; status: string }) => {
        if (u.status === 'sold' && buildingIdsSet.has(u.building_id)) buildingsWithOwnersSet.add(u.building_id)
      })
      const buildingsWithOwnersCount = buildingsWithOwnersSet.size
      const buildingsWithOwnersPct = totalBuildings > 0 ? (buildingsWithOwnersCount / totalBuildings) * 100 : 0

      const buildStatusLabels: Record<string, string> = {
        ready: 'جاهز',
        under_construction: 'تحت الإنشاء',
        finishing: 'تشطيب',
        new_project: 'أرض مشروع',
        old: 'قديم',
      }
      const buildStatusMap = new Map<string, number>()
      buildings?.forEach((b: { build_status?: string | null }) => {
        const s = b.build_status || 'غير محدد'
        buildStatusMap.set(s, (buildStatusMap.get(s) || 0) + 1)
      })
      const buildStatusStats = Array.from(buildStatusMap.entries())
        .map(([status, count]) => ({ status, label: buildStatusLabels[status] || status, count }))
        .sort((a, b) => b.count - a.count)

      const neighborhoodMap = new Map<string, { buildingsCount: number; unitsCount: number }>()
      buildings?.forEach((b: { id: string; neighborhood?: string | null }) => {
        const n = b.neighborhood || 'غير محدد'
        const uCount = units.filter((u: { building_id: string }) => u.building_id === b.id).length || 0
        if (neighborhoodMap.has(n)) {
          const cur = neighborhoodMap.get(n)!
          neighborhoodMap.set(n, { buildingsCount: cur.buildingsCount + 1, unitsCount: cur.unitsCount + uCount })
        } else {
          neighborhoodMap.set(n, { buildingsCount: 1, unitsCount: uCount })
        }
      })
      const neighborhoodStats = Array.from(neighborhoodMap.entries())
        .map(([neighborhood, s]) => ({ neighborhood, ...s }))
        .sort((a, b) => b.buildingsCount - a.buildingsCount)

      const typeMap = new Map<string, number>()
      units.forEach((u: { type?: string }) => {
        const t = u.type || 'غير محدد'
        typeMap.set(t, (typeMap.get(t) || 0) + 1)
      })
      const unitTypeStats = Array.from(typeMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalUnits > 0 ? (count / totalUnits) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      const roomsMap = new Map<number, number>()
      units.forEach((u: { rooms?: number }) => {
        const r = u.rooms ?? 0
        roomsMap.set(r, (roomsMap.get(r) || 0) + 1)
      })
      const roomsDistribution = Array.from(roomsMap.entries())
        .map(([rooms, count]) => ({ rooms, count }))
        .sort((a, b) => a.rooms - b.rooms)

      const revenueScore =
        totalRevenueFromSales >= 2_000_000 ? 15 : totalRevenueFromSales >= 500_000 ? 10 : totalRevenueFromSales >= 100_000 ? 5 : 0
      const occupancyScore = Math.min(25, (occupancyRate / 100) * 25)
      const conversionScore = Math.min(20, (conversionRate / 100) * 20)
      const portfolioSizeScore = Math.min(15, Math.floor(totalBuildings * 3 + totalUnits / 5))
      const diversityScoreFinal = Math.min(15, neighborhoodStats.length * 4 + unitTypeStats.length * 2)
      const operationsScore = totalBuildings + totalUnits > 0 ? 10 : 0
      const performanceScore = Math.min(
        100,
        Math.round(occupancyScore + conversionScore + portfolioSizeScore + diversityScoreFinal + revenueScore + operationsScore)
      )
      const scoreBreakdown = [
        { label: 'نسبة الإشغال', value: Math.round(occupancyScore), max: 25 },
        { label: 'معدل التحويل (حجز ← بيع)', value: Math.round(conversionScore), max: 20 },
        { label: 'حجم المحفظة', value: Math.min(15, portfolioSizeScore), max: 15 },
        { label: 'تنوّع العرض', value: Math.round(diversityScoreFinal), max: 15 },
        { label: 'حجم المبيعات المسجلة', value: revenueScore, max: 15 },
        { label: 'التشغيل والبيانات', value: operationsScore, max: 10 },
      ]

      setStats({
        totalBuildings,
        totalUnits,
        availableUnits,
        reservedUnits,
        soldUnits,
        totalRevenue,
        totalRevenueFromSales,
        resaleAmount,
        investorCapitalAmount,
        realizedRevenue,
        averagePrice,
        averageDealValue,
        averageArea,
        investorsCount,
        ownersCount,
        buildingsWithInvestorsCount,
        buildingsWithInvestorsPct,
        buildingsWithOwnersCount,
        buildingsWithOwnersPct,
        occupancyRate,
        neighborhoodStats,
        unitTypeStats,
        roomsDistribution,
        salesCount,
        conversionRate,
        portfolioValueAvailable,
        minUnitPrice,
        maxUnitPrice,
        buildStatusStats,
        performanceScore,
        scoreBreakdown,
      })
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      console.error('useStatistics:', e)
    } finally {
      setLoading(false)
    }
  }, [ownerId, enabled])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  return {
    stats,
    loading,
    error,
    refetch: fetchStatistics,
  }
}
