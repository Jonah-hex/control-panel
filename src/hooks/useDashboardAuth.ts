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
  | 'details_basic_edit'
  | 'details_building'
  | 'details_building_edit'
  | 'details_facilities'
  | 'details_facilities_edit'
  | 'details_guard'
  | 'details_guard_edit'
  | 'details_location'
  | 'details_location_edit'
  | 'details_association'
  | 'details_association_edit'
  | 'details_engineering'
  | 'details_engineering_edit'
  | 'details_electricity'
  | 'details_electricity_edit'
  | 'details_driver_rooms'
  | 'details_driver_rooms_edit'
  | 'details_elevators_maintenance'
  | 'details_elevators_maintenance_edit'
  | 'documents_upload'
  | 'documents_create_folder'
  | 'documents_delete'
  | 'documents_edit_folders'
  | 'units'
  | 'units_edit'
  | 'deeds'
  | 'statistics'
  | 'activities'
  | 'reports'
  | 'reservations'
  | 'sales'
  | 'marketing_cancel_reservation'
  | 'marketing_complete_sale'
  | 'marketing_building_details'
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
      // جلب سجل الموظف إن وُجد (نشط أو معطّل) لتمييز المالك عن الموظف المعطّل
      const { data: empRows } = await supabase
        .from('dashboard_employees')
        .select('owner_id, permissions, full_name, is_active')
        .eq('auth_user_id', u.id)
        .limit(1)
      const emp = empRows?.[0] as { owner_id: string; permissions: unknown; full_name: string; is_active: boolean } | undefined
      if (emp?.is_active) {
        setEffectiveOwnerId(emp.owner_id)
        setEmployeePermissions((emp.permissions as Record<PermissionKey, boolean>) || null)
        setCurrentUserDisplayName((emp.full_name as string)?.trim() || u.email || 'موظف')
      } else if (emp && !emp.is_active) {
        // موظف معطّل: لا صلاحيات (يُمنع من استخدام لوحة التحكم)
        setEffectiveOwnerId(emp.owner_id)
        setEmployeePermissions({} as Record<PermissionKey, boolean>)
        setCurrentUserDisplayName((emp.full_name as string)?.trim() || u.email || 'موظف')
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
      if (Object.keys(employeePermissions).length === 0) return false
      const value = (employeePermissions as Partial<Record<PermissionKey, boolean>>)[key]
      if (typeof value === 'boolean') return value
      // الصلاحيات الجديدة تُعامل كـ true افتراضياً للسجلات القديمة التي لا تحتوي المفتاح بعد.
      if (key === 'marketing_cancel_reservation' || key === 'marketing_complete_sale' || key === 'marketing_building_details') return true
      if (key === 'documents_upload' || key === 'documents_create_folder' || key === 'documents_delete' || key === 'documents_edit_folders') return true
      return false
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
