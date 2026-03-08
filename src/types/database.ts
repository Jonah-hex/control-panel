/**
 * Shared TypeScript types for Supabase tables and API responses
 */

// ─── Buildings ─────────────────────────────────────────────────────────────
export interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string | null
  address?: string | null
  phone?: string | null
  build_status?: 'ready' | 'under_construction' | 'finishing' | 'new_project' | 'old' | null
  year_built?: number | null
  total_units: number
  total_floors: number
  owner_id: string
  owner_name?: string | null
  created_at: string
  created_by_name?: string | null
  image_urls?: string[] | null
}

export interface BuildingAssocRow {
  id: string
  name: string
  owner_association?: string | Record<string, unknown> | null
}

// ─── Units ─────────────────────────────────────────────────────────────────
export type UnitStatus = 'available' | 'reserved' | 'sold'

export interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  status: UnitStatus
  price?: number | null
  area?: number
  rooms?: number
  type?: string
  electricity_meter_number?: string | null
  electricity_meter_transferred_with_sale?: boolean | null
  owner_name?: string | null
  created_at: string
  updated_at?: string
}

export interface UnitStatusRow {
  building_id: string
  status: UnitStatus
}

export interface UnitStatsByBuilding {
  available: number
  reserved: number
  sold: number
}

// ─── Sales ─────────────────────────────────────────────────────────────────
export interface Sale {
  id: string
  building_id: string
  unit_id: string
  sale_price: number
  sale_date: string
  buyer_name?: string | null
  commission_amount?: number | null
  down_payment?: number | null
  remaining_payment?: number | null
  remaining_payment_due_date?: string | null
  payment_status?: string | null
}

// ─── Reservations ───────────────────────────────────────────────────────────
export interface Reservation {
  id: string
  building_id: string
  unit_id: string
  status: string
  reservation_date?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  sale_id?: string | null
  marketer_id?: string | null
  deposit_amount?: number | null
  deposit_refunded?: boolean | null
  created_at: string
  created_by?: string | null
  created_by_name?: string | null
  customer_name?: string | null
  expiry_date?: string | null
  marketer_name?: string | null
}

// ─── Marketing / Marketers ──────────────────────────────────────────────────
export interface Marketer {
  id: string
  name: string
  phone?: string | null
}

/** صف حجز مع تفاصيل العمارة والوحدة (للتقارير) */
export interface ReservationReportRow extends Reservation {
  building?: { name: string } | null
  unit?: { unit_number: string; floor: number } | null
}

/** صف مبيعات مع تفاصيل العمارة والوحدة (للتقارير) */
export interface SaleReportRow extends Sale {
  building?: { name: string } | null
  unit?: { unit_number: string; floor: number } | null
}

/** بيانات التقارير التسويقية */
export interface MarketingReportsData {
  reservations: ReservationReportRow[]
  sales: SaleReportRow[]
  marketers: Marketer[]
  buildingsMap: Record<string, string>
  unitsMap: Record<string, { unit_number: string; floor: number }>
  unitsStatusCounts: { available: number; reserved: number; sold: number }
}

// ─── Statistics (Dashboard / Reports) ────────────────────────────────────────
export interface StatisticsStats {
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  reservedUnits: number
  soldUnits: number
  totalRevenue: number
  totalRevenueFromSales: number
  resaleAmount: number
  investorCapitalAmount: number
  realizedRevenue: number
  averagePrice: number
  averageDealValue: number
  investorsCount: number
  ownersCount: number
  buildingsWithInvestorsCount: number
  buildingsWithInvestorsPct: number
  buildingsWithOwnersCount: number
  buildingsWithOwnersPct: number
  averageArea: number
  occupancyRate: number
  neighborhoodStats: Array<{ neighborhood: string; buildingsCount: number; unitsCount: number }>
  unitTypeStats: Array<{ type: string; count: number; percentage: number }>
  roomsDistribution: Array<{ rooms: number; count: number }>
  salesCount: number
  conversionRate: number
  portfolioValueAvailable: number
  minUnitPrice: number
  maxUnitPrice: number
  buildStatusStats: Array<{ status: string; label: string; count: number }>
  performanceScore: number
  scoreBreakdown: Array<{ label: string; value: number; max: number }>
}

// ─── Activity Logs ──────────────────────────────────────────────────────────
export type ActivityType =
  | 'add'
  | 'edit'
  | 'delete'
  | 'booking'
  | 'sold'
  | 'reserved'
  | 'association_end'
  | 'meter_added'
  | 'ownership_transferred'
  | 'remaining_payment_collected'
  | 'remaining_payment_collected_late'

export interface ActivityLog {
  id: string
  type: ActivityType
  building_name: string
  building_id?: string
  user_name: string
  user_role_label?: string
  timestamp: string
  details: string
  endDate?: string
}
