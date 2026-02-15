'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, ArrowLeft, Building2, MapPin, Users, DollarSign, Search, Edit, Trash2, Eye } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  total_units: number
  total_floors: number
  owner_id: string
  created_at: string
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setBuildings(data || [])
    } catch (error) {
      console.error('Error fetching buildings:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBuilding = async (buildingId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه العمارة؟')) return

    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', buildingId)

      if (error) throw error
      
      setBuildings(buildings.filter(b => b.id !== buildingId))
    } catch (error) {
      console.error('Error deleting building:', error)
    }
  }

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort by newest first (last added)
  const displayedBuildings = [...filteredBuildings].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Header - refined elegant style */}
      <div className="sticky top-0 z-20">
        <div className="backdrop-blur bg-gradient-to-r from-white/70 to-white/60 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center shadow-xl text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">العماير</h1>
                  <p className="text-sm text-slate-500">قائمة العماير المسجلة في النظام</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 hover:shadow-md transition transform hover:-translate-y-0.5"
                >
                  <span className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 text-slate-800" />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">لوحة التحكم</span>
                </Link>

                <Link
                  href="/dashboard/buildings/new"
                  className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-full shadow-2xl hover:shadow-xl transform transition hover:-translate-y-0.5"
                >
                  <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-sm font-semibold">إضافة عمارة جديدة</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن العمارة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>

        {/* Buildings Grid (Table view matching dashboard style) */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 mt-4">جاري التحميل...</p>
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {buildings.length === 0 ? 'لا توجد عمارات' : 'لم يتم العثور على عمارات'}
            </h3>
            <p className="text-gray-500 mb-6">
              {buildings.length === 0 ? 'ابدأ بإضافة عمارتك الأولى' : 'حاول البحث عن عمارة أخرى'}
            </p>
            {buildings.length === 0 && (
              <Link
                href="/dashboard/buildings/new"
                className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                إضافة عمارة جديدة
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-4 border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white text-slate-600">
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">الاسم</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">العنوان</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">الأدوار</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">الوحدات</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedBuildings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3 justify-end">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-800">{b.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.address}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-800">{b.total_floors}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-800">{b.total_units}</td>
                      
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/dashboard/buildings/${b.id}`}
                            className="p-2 bg-gradient-to-r from-white to-white/70 text-blue-600 rounded-full hover:scale-110 transform transition shadow-md border border-gray-100"
                            aria-label="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/dashboard/buildings/edit/${b.id}`}
                            className="p-2 bg-gradient-to-r from-white to-white/70 text-indigo-600 rounded-full hover:scale-110 transform transition shadow-md border border-gray-100"
                            aria-label="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => deleteBuilding(b.id)}
                            className="p-2 bg-gradient-to-r from-white to-white/70 text-red-600 rounded-full hover:scale-110 transform transition shadow-md border border-gray-100"
                            aria-label="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
