'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import {
  ArrowLeft,
  Activity,
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  Building2,
  Calendar,
  Users,
  Clock,
  Filter
} from 'lucide-react'

interface Building {
  id: string
  name: string
  created_at: string
  owner_name?: string | null
  created_by_name?: string | null
  owner_association?: string | Record<string, unknown> | null
}

interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  status: 'available' | 'reserved' | 'sold'
  owner_name?: string | null
  created_at: string
  updated_at?: string
}

interface ActivityItem {
  id: string
  type: 'add' | 'edit' | 'delete' | 'booking' | 'sold' | 'reserved' | 'association_end'
  building_name: string
  building_id?: string
  user_name: string
  timestamp: string
  details: string
  endDate?: string
}

type FilterType = 'all' | 'add' | 'sold' | 'reserved' | 'association_end'

type ReservationRow = { id: string; unit_id: string; building_id: string; created_at: string; created_by_name?: string | null; customer_name: string; status: string; expiry_date?: string | null }

export default function ActivitiesPage() {
  const [loading, setLoading] = useState(true)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [reservations, setReservations] = useState<ReservationRow[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const router = useRouter()
  const supabase = createClient()
  const { effectiveOwnerId, can, ready, employeePermissions } = useDashboardAuth()

  useEffect(() => {
    if (!ready) return
    if (!can('activities')) {
      showToast('ليس لديك صلاحية الوصول لسجل النشاطات.', 'error')
      router.replace('/dashboard')
      return
    }
  }, [ready, can, router])

  useEffect(() => {
    const fetchData = async () => {
      const ownerId = effectiveOwnerId
      if (!ownerId) {
        setLoading(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name, created_at, owner_name, created_by_name, owner_association')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false })

        if (buildingsError) throw buildingsError
        setBuildings(buildingsData || [])

        const buildingIds = (buildingsData || []).map(b => b.id)
        if (buildingIds.length > 0) {
          const [unitsRes, resRes] = await Promise.all([
            supabase.from('units').select('*').in('building_id', buildingIds),
            supabase.from('reservations').select('id, unit_id, building_id, created_at, created_by_name, customer_name, status, expiry_date').in('building_id', buildingIds).order('created_at', { ascending: false })
          ])
          if (unitsRes.error) throw unitsRes.error
          setUnits(unitsRes.data || [])
          setReservations(Array.isArray(resRes.data) ? resRes.data : [])
        } else {
          setUnits([])
          setReservations([])
        }
      } catch (err) {
        console.error('Error fetching activities:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, effectiveOwnerId, supabase])

  // تنبيهات انتهاء اتحاد الملاك
  const associationEndReminders = useMemo(() => {
    const reminders: Array<{ buildingId: string; buildingName: string; daysLeft: number; endDate: string }> = []
    buildings.forEach(b => {
      const assoc = b.owner_association
      if (!assoc || typeof assoc !== 'object') return
      const end = (assoc as { end_date?: string }).end_date
      if (!end) return
      const endDate = new Date(end)
      const now = new Date()
      const diff = endDate.getTime() - now.getTime()
      const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000))
      if (daysLeft <= 10) {
        reminders.push({
          buildingId: b.id,
          buildingName: b.name || '—',
          daysLeft,
          endDate: endDate.toLocaleDateString('ar-SA')
        })
      }
    })
    return reminders.sort((a, b) => a.daysLeft - b.daysLeft)
  }, [buildings])

  const activities = useMemo(() => {
    const fromUnits: ActivityItem[] = []
    for (const u of units) {
      const bName = buildings.find(b => b.id === u.building_id)?.name || '—'
      if (u.status === 'sold') {
        fromUnits.push({
          id: u.id + '-sold',
          type: 'sold',
          building_name: bName,
          building_id: u.building_id,
          user_name: u.owner_name || 'مشتري',
          timestamp: u.updated_at || u.created_at,
          details: `تم بيع الوحدة ${u.unit_number} (الدور ${u.floor})`
        })
      }
    }
    const fromReservations: ActivityItem[] = reservations.map(r => {
      const bName = buildings.find(b => b.id === r.building_id)?.name || '—'
      const u = units.find(ux => ux.id === r.unit_id)
      const unitLabel = u ? `الوحدة ${u.unit_number} (الدور ${u.floor})` : 'وحدة محجوزة'
      return {
        id: r.id + '-reserved',
        type: 'reserved',
        building_name: bName,
        building_id: r.building_id,
        user_name: (r.created_by_name && String(r.created_by_name).trim()) || 'صاحب الحساب',
        timestamp: r.created_at,
        details: `تم حجز ${unitLabel} — عميل: ${r.customer_name || '—'}`
      }
    })
    const fromExpiredReservations: ActivityItem[] = reservations
      .filter((r) => ['active', 'pending', 'confirmed', 'reserved'].includes(r.status))
      .filter((r) => r.expiry_date && new Date(r.expiry_date).getTime() < Date.now())
      .map((r) => {
        const bName = buildings.find(b => b.id === r.building_id)?.name || '—'
        const u = units.find(ux => ux.id === r.unit_id)
        const unitLabel = u ? `الوحدة ${u.unit_number} (الدور ${u.floor})` : 'وحدة محجوزة'
        return {
          id: r.id + '-expired-review',
          type: 'reserved',
          building_name: bName,
          building_id: r.building_id,
          user_name: 'النظام',
          timestamp: r.expiry_date || r.created_at,
          details: `انتهت مدة الحجز — يرجى مراجعة وإلغاء حجز ${unitLabel}`
        }
      })
    const fromBuildings: ActivityItem[] = buildings.map(b => ({
      id: b.id + '-add',
      type: 'add',
      building_name: b.name || 'عمارة جديدة',
      building_id: b.id,
      user_name: b.created_by_name?.trim() || b.owner_name?.trim() || 'النظام',
      timestamp: b.created_at,
      details: 'تم إضافة عمارة جديدة'
    }))
    const fromAssoc: ActivityItem[] = associationEndReminders.map(r => {
      const ownerName = buildings.find(b => b.id === r.buildingId)?.owner_name?.trim() || 'النظام'
      const sortTime = new Date(Date.now() - r.daysLeft * 24 * 60 * 60 * 1000).toISOString()
      return {
        id: `assoc-${r.buildingId}-${r.daysLeft}`,
        type: 'association_end' as const,
        building_name: r.buildingName,
        building_id: r.buildingId,
        user_name: ownerName,
        timestamp: sortTime,
        details: r.daysLeft === 0
          ? 'انتهت مدة اتحاد الملاك اليوم'
          : r.daysLeft === 3
            ? 'تنتهي مدة اتحاد الملاك بعد 3 أيام'
            : r.daysLeft === 5
              ? 'تنتهي مدة اتحاد الملاك بعد 5 أيام'
              : 'تنتهي مدة اتحاد الملاك بعد 10 أيام',
        endDate: r.endDate
      }
    })
    let all = [...fromUnits, ...fromReservations, ...fromExpiredReservations, ...fromBuildings, ...fromAssoc]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (filter !== 'all') {
      all = all.filter(a => a.type === filter)
    }
    return all
  }, [units, buildings, reservations, associationEndReminders, filter])

  // عرض النشاطات حسب الصلاحيات (خاص بلوحة الموظف)
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (a.type === 'sold') return can('sales')
      if (a.type === 'reserved') return can('reservations')
      if (a.type === 'add') return can('building_details') || can('buildings')
      if (a.type === 'association_end') return can('details_association')
      return true
    })
  }, [activities, can])

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `منذ ${minutes} دقيقة`
    if (hours < 24) return `منذ ${hours} ساعة`
    if (days === 1) return 'أمس'
    return d.toLocaleDateString('ar-SA')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus className="w-4 h-4 text-green-600" />
      case 'edit': return <Edit className="w-4 h-4 text-blue-600" />
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />
      case 'booking':
      case 'sold': return <ShoppingCart className="w-4 h-4 text-purple-600" />
      case 'reserved': return <Calendar className="w-4 h-4 text-amber-600" />
      case 'association_end': return <Users className="w-4 h-4 text-emerald-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const filterLabels: Record<FilterType, string> = {
    all: 'الكل',
    add: 'إضافة عمارة',
    sold: 'بيع',
    reserved: 'حجز',
    association_end: 'اتحاد ملاك'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل النشاطات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">سجل النشاطات</h1>
                  <p className="text-sm text-gray-500">{filteredActivities.length} نشاط</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* فلتر حسب النوع */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Filter className="w-4 h-4 text-gray-500 mt-1" />
          {(Object.keys(filterLabels) as FilterType[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>

        {/* قائمة النشاطات */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">لا توجد نشاطات</p>
              <p className="text-sm text-gray-500 mt-1">
                {filter !== 'all' ? 'جرب تغيير الفلتر أو عد لاحقاً' : 'ستظهر هنا النشاطات عند إضافة عمارة أو بيع/حجز وحدة'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.building_id
                    ? `/dashboard/buildings/details?buildingId=${activity.building_id}${activity.type === 'association_end' ? '#card-association' : ''}`
                    : '#'}
                  className="flex items-start gap-4 p-5 hover:bg-gray-50/80 transition-colors group cursor-pointer block"
                >
                  <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
                    activity.type === 'add' ? 'bg-green-100' :
                    activity.type === 'edit' ? 'bg-blue-100' :
                    activity.type === 'delete' ? 'bg-red-100' :
                    activity.type === 'sold' ? 'bg-purple-100' :
                    activity.type === 'reserved' ? 'bg-amber-100' :
                    activity.type === 'association_end' ? 'bg-emerald-100' :
                    'bg-gray-100'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <h4 className="font-bold text-gray-800 truncate">{activity.building_name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {activity.type === 'association_end' && activity.endDate
                            ? `تاريخ النهاية: ${activity.endDate}`
                            : formatDate(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 leading-relaxed">{activity.details}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {activity.user_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-500">بواسطة <span className="font-semibold text-gray-700">{activity.user_name}</span></p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
