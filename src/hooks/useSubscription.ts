'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'

export interface SubscriptionPlanLimits {
  max_buildings: number | null
  max_units_per_building: number | null
}

export interface SubscriptionUsage {
  buildingsCount: number
  unitsByBuildingId: Record<string, number>
}

export interface UseSubscriptionResult {
  /** اسم الخطة بالعربية */
  planName: string | null
  /** حدود الخطة (null = غير محدود) */
  limits: SubscriptionPlanLimits
  /** الاستخدام الحالي */
  usage: SubscriptionUsage
  /** هل يمكن إضافة عمارة جديدة */
  canAddBuilding: boolean
  /** هل يمكن إضافة عدد معين من الوحدات لعمارة (للعمارة الجديدة أو لعمارة موجودة) */
  canAddUnits: (buildingId: string | null, unitsCount: number) => boolean
  /** جملة للعرض مثل "2 / 3 عماير" */
  buildingsLimitLabel: string
  /** جملة حد الوحدات للعمارة مثل "حتى 20 وحدة لكل عمارة" */
  unitsPerBuildingLabel: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_LIMITS: SubscriptionPlanLimits = {
  max_buildings: 1,
  max_units_per_building: 18,
}

export function useSubscription(): UseSubscriptionResult {
  const { user, effectiveOwnerId, isOwner } = useDashboardAuth()
  const [planName, setPlanName] = useState<string | null>(null)
  const [limits, setLimits] = useState<SubscriptionPlanLimits>(DEFAULT_LIMITS)
  const [usage, setUsage] = useState<SubscriptionUsage>({ buildingsCount: 0, unitsByBuildingId: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSubscriptionAndUsage = useCallback(async () => {
    if (!effectiveOwnerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1) جلب اشتراك المستخدم مع تفاصيل الخطة
      const { data: subRows, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, plan_id, status, ends_at')
        .eq('user_id', effectiveOwnerId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (subError) {
        setError(subError.message)
        setPlanName('مجاني')
        setLimits(DEFAULT_LIMITS)
        setUsage({ buildingsCount: 0, unitsByBuildingId: {} })
        setLoading(false)
        return
      }

      const sub = subRows as { id: string; plan_id: string } | null

      // إذا لم يكن هناك اشتراك والمالك هو المستخدم الحالي، إنشاء اشتراك مجاني افتراضي
      if (!sub && isOwner && user?.id === effectiveOwnerId) {
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('slug', 'free')
          .eq('is_active', true)
          .limit(1)
          .single()

        if (freePlan?.id) {
          await supabase.from('user_subscriptions').insert({
            user_id: effectiveOwnerId,
            plan_id: freePlan.id,
            status: 'active',
          })
          return fetchSubscriptionAndUsage()
        }
      }

      const planId = sub?.plan_id
      if (planId) {
        const { data: planRow } = await supabase
          .from('subscription_plans')
          .select('name_ar, max_buildings, max_units_per_building')
          .eq('id', planId)
          .single()
        if (planRow) {
          setPlanName(planRow.name_ar ?? 'مجاني')
          setLimits({
            max_buildings: planRow.max_buildings ?? null,
            max_units_per_building: planRow.max_units_per_building ?? null,
          })
        } else {
          setPlanName('مجاني')
          setLimits(DEFAULT_LIMITS)
        }
      } else {
        setPlanName('مجاني')
        setLimits(DEFAULT_LIMITS)
      }

      // 2) جلب عدد العماير والوحدات لكل عمارة للمالك الفعلي
      const { data: buildingsData, error: bError } = await supabase
        .from('buildings')
        .select('id')
        .eq('owner_id', effectiveOwnerId)

      if (bError) {
        setUsage({ buildingsCount: 0, unitsByBuildingId: {} })
        setLoading(false)
        return
      }

      const buildingIds = (buildingsData || []).map((b) => b.id)
      const buildingsCount = buildingIds.length

      let unitsByBuildingId: Record<string, number> = {}
      if (buildingIds.length > 0) {
        const { data: unitsData } = await supabase
          .from('units')
          .select('building_id')
          .in('building_id', buildingIds)
        const rows = unitsData || []
        rows.forEach((r: { building_id: string }) => {
          unitsByBuildingId[r.building_id] = (unitsByBuildingId[r.building_id] || 0) + 1
        })
      }

      setUsage({ buildingsCount, unitsByBuildingId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير متوقع')
      setPlanName('مجاني')
      setLimits(DEFAULT_LIMITS)
      setUsage({ buildingsCount: 0, unitsByBuildingId: {} })
    } finally {
      setLoading(false)
    }
  }, [effectiveOwnerId, isOwner, user?.id])

  useEffect(() => {
    fetchSubscriptionAndUsage()
  }, [fetchSubscriptionAndUsage])

  const canAddBuilding = limits.max_buildings === null || usage.buildingsCount < limits.max_buildings

  const canAddUnits = useCallback(
    (buildingId: string | null, unitsCount: number): boolean => {
      if (limits.max_units_per_building === null) return true
      if (buildingId === null) {
        // عمارة جديدة: عدد الوحدات المطلوب يجب ألا يتجاوز الحد
        return unitsCount <= limits.max_units_per_building
      }
      const current = usage.unitsByBuildingId[buildingId] || 0
      return current + unitsCount <= limits.max_units_per_building
    },
    [limits.max_units_per_building, usage.unitsByBuildingId]
  )

  const buildingsLimitLabel =
    limits.max_buildings === null
      ? `${usage.buildingsCount} عمارة`
      : `${usage.buildingsCount} / ${limits.max_buildings} عمارة`

  const unitsPerBuildingLabel =
    limits.max_units_per_building === null
      ? 'وحدات غير محدودة لكل عمارة'
      : `حتى ${limits.max_units_per_building} وحدة لكل عمارة`

  return {
    planName,
    limits,
    usage,
    canAddBuilding,
    canAddUnits,
    buildingsLimitLabel,
    unitsPerBuildingLabel,
    loading,
    error,
    refetch: fetchSubscriptionAndUsage,
  }
}
