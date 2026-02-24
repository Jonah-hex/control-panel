'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PermissionKey =
  | 'dashboard'
  | 'buildings'
  | 'buildings_create'
  | 'buildings_edit'
  | 'building_details'
  | 'buildings_delete'
  | 'details_basic'
  | 'details_building'
  | 'details_facilities'
  | 'details_guard'
  | 'details_location'
  | 'details_association'
  | 'details_engineering'
  | 'details_electricity'
  | 'units'
  | 'units_edit'
  | 'deeds'
  | 'statistics'
  | 'activities'
  | 'reports'
  | 'reservations'
  | 'sales'
  | 'security'
  | 'settings'

export interface UseDashboardAuthResult {
  user: { id: string; [k: string]: unknown } | null
  effectiveOwnerId: string | null
  employeePermissions: Record<PermissionKey, boolean> | null
  /** اسم المستخدم الحالي للعرض في النشاط (مالك أو موظف) */
  currentUserDisplayName: string
  /** true = مالك (كامل الصلاحيات)، false = موظف */
  isOwner: boolean
  /** هل تم تحميل الجلسة والصلاحيات (لتفادي التوهج) */
  ready: boolean
  /** صلاحية معينة: المالك دائماً true، الموظف حسب السويتشات */
  can: (key: PermissionKey) => boolean
}

export function useDashboardAuth(): UseDashboardAuthResult {
  const [user, setUser] = useState<{ id: string; [k: string]: unknown } | null>(null)
  const [effectiveOwnerId, setEffectiveOwnerId] = useState<string | null>(null)
  const [employeePermissions, setEmployeePermissions] = useState<Record<PermissionKey, boolean> | null>(null)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>('')
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        setUser(null)
        setEffectiveOwnerId(null)
        setEmployeePermissions(null)
        setCurrentUserDisplayName('')
        setReady(true)
        return
      }
      setUser(u as unknown as { id: string; [k: string]: unknown })
      const { data: empRows } = await supabase
        .from('dashboard_employees')
        .select('owner_id, permissions, full_name')
        .eq('auth_user_id', u.id)
        .eq('is_active', true)
        .limit(1)
      if (empRows?.[0]) {
        setEffectiveOwnerId(empRows[0].owner_id)
        setEmployeePermissions((empRows[0].permissions as Record<PermissionKey, boolean>) || null)
        setCurrentUserDisplayName((empRows[0].full_name as string)?.trim() || u.email || 'موظف')
      } else {
        setEffectiveOwnerId(u.id)
        setEmployeePermissions(null)
        const meta = u.user_metadata as { full_name?: string } | undefined
        setCurrentUserDisplayName(meta?.full_name?.trim() || u.email || 'مالك')
      }
      setReady(true)
    }
    load()
  }, [])

  const can = useCallback(
    (key: PermissionKey) => {
      if (employeePermissions === null) return true
      return Boolean(employeePermissions[key])
    },
    [employeePermissions]
  )

  return {
    user,
    effectiveOwnerId,
    employeePermissions,
    currentUserDisplayName,
    isOwner: employeePermissions === null,
    ready,
    can,
  }
}
