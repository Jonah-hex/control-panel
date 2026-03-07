'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Unit } from '@/types/database'

interface UseUnitsOptions {
  buildingIds: string[]
  enabled?: boolean
}

interface UseUnitsResult {
  units: Unit[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useUnits({ buildingIds, enabled = true }: UseUnitsOptions): UseUnitsResult {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUnits = useCallback(async () => {
    if (buildingIds.length === 0 || !enabled) {
      setUnits([])
      setLoading(false)
      return
    }
    const client = createClient()
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await client
        .from('units')
        .select('*')
        .in('building_id', buildingIds)
        .order('floor', { ascending: true })
        .order('unit_number', { ascending: true })

      if (err) throw err
      setUnits((data as Unit[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      console.error('useUnits:', e)
    } finally {
      setLoading(false)
    }
  }, [buildingIds.join(','), enabled])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  return {
    units,
    loading,
    error,
    refetch: fetchUnits,
  }
}
