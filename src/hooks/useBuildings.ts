'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Building, UnitStatusRow, UnitStatsByBuilding } from '@/types/database'

interface UseBuildingsOptions {
  ownerId: string | null
  enabled?: boolean
}

interface UseBuildingsResult {
  buildings: Building[]
  unitStatsByBuilding: Record<string, UnitStatsByBuilding>
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useBuildings({ ownerId, enabled = true }: UseBuildingsOptions): UseBuildingsResult {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [unitStatsByBuilding, setUnitStatsByBuilding] = useState<Record<string, UnitStatsByBuilding>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBuildings = useCallback(async () => {
    if (!ownerId || !enabled) {
      setLoading(false)
      return
    }
    const client = createClient()
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await client
        .from('buildings')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setBuildings((data as Building[]) || [])

      const buildingIds = (data || []).map((b: Building) => b.id)
      if (buildingIds.length > 0) {
        const { data: unitRows, error: unitsErr } = await client
          .from('units')
          .select('building_id,status')
          .in('building_id', buildingIds)

        if (unitsErr) throw unitsErr

        const stats = (unitRows || []).reduce(
          (acc: Record<string, UnitStatsByBuilding>, row: UnitStatusRow) => {
            if (!acc[row.building_id]) {
              acc[row.building_id] = { available: 0, reserved: 0, sold: 0 }
            }
            if (row.status === 'available') acc[row.building_id].available += 1
            else if (row.status === 'reserved') acc[row.building_id].reserved += 1
            else if (row.status === 'sold') acc[row.building_id].sold += 1
            return acc
          },
          {}
        )
        setUnitStatsByBuilding(stats)
      } else {
        setUnitStatsByBuilding({})
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      console.error('useBuildings:', e)
    } finally {
      setLoading(false)
    }
  }, [ownerId, enabled])

  useEffect(() => {
    fetchBuildings()
  }, [fetchBuildings])

  return {
    buildings,
    unitStatsByBuilding,
    loading,
    error,
    refetch: fetchBuildings,
  }
}
