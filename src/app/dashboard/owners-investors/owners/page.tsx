"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  LayoutDashboard,
  Users,
  Search,
  FileText,
  Eye,
  ExternalLink,
  User,
  X,
  Filter,
  ChevronDown,
  ClipboardCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  UserPlus,
  Shield,
  Wrench,
} from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";

/** عرض سعر البيع للمالك النهائي من sales عند التوفر (سياسة المسارين: docs/sales-and-investment-policy.md) */
/** بيانات اتحاد الملاك في العمارة (مطابق لكارد تفاصيل العمارة) */
interface OwnerAssociationData {
  hasAssociation?: boolean;
  managerName?: string;
  registrationNumber?: string;
  registeredUnitsCount?: number;
  [key: string]: unknown;
}

interface Building {
  id: string;
  name: string;
  owner_name?: string | null;
  owner_association?: string | OwnerAssociationData | null;
  warranty_months?: number | null;
  maintenance_contract_date?: string | null;
  maintenance_company?: string | null;
}

/** استلام الوحدة من جدول unit_handovers */
interface HandoverInfo {
  id: string;
  handover_date: string;
  status: "draft" | "completed";
  received_by?: string | null;
  received_by_phone?: string | null;
}

/** بيانات البيع من جدول sales */
interface SaleInfo {
  id: string;
  sale_date?: string | null;
  payment_status: "completed" | "partial";
  sale_price?: number | null;
  remaining_payment?: number | null;
  remaining_payment_due_date?: string | null;
  remaining_payment_collected_at?: string | null;
}

interface OwnerUnit {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number;
  status: string;
  owner_name?: string | null;
  previous_owner_name?: string | null;
  owner_phone?: string | null;
  deed_number?: string | null;
  deed_pdf_url?: string | null;
  sorting_minutes_pdf_url?: string | null;
  tax_exemption_status?: boolean | null;
  tax_exemption_file_url?: string | null;
  transfer_real_estate_request_no?: string | null;
  electricity_meter_transferred_with_sale?: boolean | null;
  water_meter_transferred_with_sale?: boolean | null;
  driver_room_transferred_with_sale?: boolean | null;
  transfer_id_image_url?: string | null;
  transfer_check_image_url?: string | null;
  transfer_check_amount?: number | null;
  transfer_payment_method?: string | null;
  owner_association_registered?: boolean | null;
  building?: Building;
  handover?: HandoverInfo | null;
  sale?: SaleInfo | null;
}

export default function OwnersPage() {
  const router = useRouter();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [ownerUnits, setOwnerUnits] = useState<OwnerUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [handoverFilter, setHandoverFilter] = useState<"all" | "completed" | "draft" | "none">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "completed" | "partial">("all");
  const [viewOwnerUnit, setViewOwnerUnit] = useState<OwnerUnit | null>(null);
  const [associationModalUnit, setAssociationModalUnit] = useState<OwnerUnit | null>(null);
  const [associationSaving, setAssociationSaving] = useState(false);
  const [ownersPage, setOwnersPage] = useState(1);
  const [ownersPageSize, setOwnersPageSize] = useState(10);

  const OWNERS_PAGE_SIZES = [10, 15, 25, 50, 100] as const;

  useEffect(() => {
    if (!ready) return;
    if (!can("owners_view")) {
      router.replace("/dashboard");
    }
  }, [ready, can, router]);

  useEffect(() => {
    if (!ready || !effectiveOwnerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: buildingsData, error: buildingsError } = await supabase
          .from("buildings")
          .select("id, name, owner_name, owner_association, warranty_months, maintenance_contract_date, maintenance_company")
          .eq("owner_id", effectiveOwnerId)
          .order("name");

        if (buildingsError) throw buildingsError;
        const bList = buildingsData || [];
        setBuildings(bList);

        if (bList.length === 0) {
          setOwnerUnits([]);
          return;
        }

        const buildingIds = bList.map((b) => b.id);
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select(
            "id, building_id, unit_number, floor, status, owner_name, previous_owner_name, owner_phone, deed_number, deed_pdf_url, sorting_minutes_pdf_url, tax_exemption_status, tax_exemption_file_url, transfer_real_estate_request_no, electricity_meter_transferred_with_sale, water_meter_transferred_with_sale, driver_room_transferred_with_sale, transfer_id_image_url, transfer_check_image_url, transfer_check_amount, transfer_payment_method, owner_association_registered"
          )
          .in("building_id", buildingIds)
          .eq("status", "sold")
          .order("floor", { ascending: true })
          .order("unit_number", { ascending: true });

        if (unitsError) throw unitsError;

        const unitIds = (unitsData || []).map((u) => u.id);
        const buildingMap = new Map(bList.map((b) => [b.id, b]));

        // جلب استلام الوحدات وبيانات المبيعات (ما بعد البيع)
        const [handoversRes, salesRes] = await Promise.all([
          unitIds.length > 0
            ? supabase
                .from("unit_handovers")
                .select("id, unit_id, handover_date, status, received_by, received_by_phone")
                .in("unit_id", unitIds)
            : { data: [] as { id: string; unit_id: string; handover_date: string; status: string; received_by?: string | null; received_by_phone?: string | null }[] },
          unitIds.length > 0
            ? supabase
                .from("sales")
                .select("id, unit_id, sale_date, payment_status, sale_price, remaining_payment, remaining_payment_due_date, remaining_payment_collected_at")
                .in("unit_id", unitIds)
            : { data: [] as { id: string; unit_id: string; sale_date?: string | null; payment_status: string; sale_price?: number | null; remaining_payment?: number | null; remaining_payment_due_date?: string | null; remaining_payment_collected_at?: string | null }[] },
        ]);

        const handoverByUnit = new Map((handoversRes.data || []).map((h) => [h.unit_id, h as HandoverInfo]));
        const saleByUnit = new Map((salesRes.data || []).map((s) => [s.unit_id, s as SaleInfo]));

        const merged = (unitsData || []).map((u) => ({
          ...u,
          building: buildingMap.get(u.building_id),
          handover: handoverByUnit.get(u.id) ?? null,
          sale: saleByUnit.get(u.id) ?? null,
        })) as OwnerUnit[];
        setOwnerUnits(merged);
      } catch (err) {
        console.error(err);
        setOwnerUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ready, effectiveOwnerId]);

  const filteredUnits = useMemo(() => {
    let list = ownerUnits;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (u) =>
          (u.owner_name || "").toLowerCase().includes(term) ||
          (u.previous_owner_name || "").toLowerCase().includes(term) ||
          (u.owner_phone || "").replace(/\s/g, "").includes(term.replace(/\s/g, "")) ||
          (u.building?.name || "").toLowerCase().includes(term) ||
          String(u.unit_number).toLowerCase().includes(term) ||
          (u.deed_number || "").toLowerCase().includes(term)
      );
    }
    if (buildingFilter && buildingFilter !== "all") {
      list = list.filter((u) => u.building_id === buildingFilter);
    }
    if (handoverFilter === "completed") {
      list = list.filter((u) => u.handover?.status === "completed");
    } else if (handoverFilter === "draft") {
      list = list.filter((u) => u.handover?.status === "draft");
    } else if (handoverFilter === "none") {
      list = list.filter((u) => !u.handover);
    }
    if (paymentFilter === "completed") {
      list = list.filter((u) => u.sale?.payment_status === "completed" || !u.sale);
    } else if (paymentFilter === "partial") {
      list = list.filter((u) => u.sale?.payment_status === "partial" && (u.sale?.remaining_payment ?? 0) > 0);
    }
    return list;
  }, [ownerUnits, searchTerm, buildingFilter, handoverFilter, paymentFilter]);

  const ownersTotalPages = Math.max(1, Math.ceil(filteredUnits.length / ownersPageSize));
  const ownersPaginated = useMemo(
    () => filteredUnits.slice((ownersPage - 1) * ownersPageSize, ownersPage * ownersPageSize),
    [filteredUnits, ownersPage, ownersPageSize]
  );

  useEffect(() => {
    if (ownersPage > ownersTotalPages && ownersTotalPages >= 1) setOwnersPage(1);
  }, [ownersPage, ownersTotalPages]);

  const handleRegisterInAssociation = async () => {
    const unit = associationModalUnit;
    if (!unit?.building_id) return;
    setAssociationSaving(true);
    try {
      const { data: buildingData, error: buildingError } = await supabase
        .from("buildings")
        .select("owner_association")
        .eq("id", unit.building_id)
        .single();
      if (buildingError || !buildingData) {
        showToast("تعذر تحميل بيانات العمارة.", "error");
        return;
      }
      let assoc: OwnerAssociationData = {};
      try {
        const raw = buildingData.owner_association;
        assoc = typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {};
      } catch {
        showToast("بيانات اتحاد الملاك غير صالحة. فعّل الاتحاد من تفاصيل العمارة أولاً.", "error");
        return;
      }
      if (!assoc.hasAssociation) {
        showToast("يجب تفعيل اتحاد الملاك من تفاصيل العمارة أولاً.", "error");
        return;
      }
      const newCount = (assoc.registeredUnitsCount ?? 0) + 1;
      const updatedAssoc = { ...assoc, registeredUnitsCount: newCount };

      const [unitRes, buildingRes] = await Promise.all([
        supabase.from("units").update({ owner_association_registered: true }).eq("id", unit.id),
        supabase.from("buildings").update({ owner_association: JSON.stringify(updatedAssoc) }).eq("id", unit.building_id),
      ]);
      const err = unitRes.error || buildingRes.error;
      if (err) {
        showToast(err.message || "حدث خطأ أثناء التسجيل.", "error");
        return;
      }
      setOwnerUnits((prev) =>
        prev.map((u) =>
          u.id === unit.id
            ? { ...u, owner_association_registered: true, building: u.building ? { ...u.building, owner_association: JSON.stringify(updatedAssoc) } : u.building }
            : u
        )
      );
      if (viewOwnerUnit?.id === unit.id) {
        setViewOwnerUnit((v) => (v ? { ...v, owner_association_registered: true } : null));
      }
      setAssociationModalUnit(null);
      showToast("تم تسجيل الوحدة في اتحاد الملاك بنجاح.", "success");
    } finally {
      setAssociationSaving(false);
    }
  };

  if (ready && !can("owners_view")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* هيدر */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Home className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">الملاك</h1>
              <p className="text-sm text-gray-500">ما بعد البيع — استلام الوحدة، حالة الدفع، وبيانات المالك</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/owners-investors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              <Users className="w-4 h-4" />
              إدارة الملاك والمستثمرين
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </header>

        {/* فلتر وبحث */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم، الجوال، العمارة، رقم الوحدة أو الصك..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
            <div className="relative min-w-[160px]">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="w-full appearance-none pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                <option value="all">جميع العماير</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[140px]">
              <select
                value={handoverFilter}
                onChange={(e) => setHandoverFilter(e.target.value as typeof handoverFilter)}
                className="w-full appearance-none pr-4 pl-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                <option value="all">الاستلام: الكل</option>
                <option value="completed">تم الاستلام</option>
                <option value="draft">مسودة</option>
                <option value="none">لم يُستلم</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[120px]">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
                className="w-full appearance-none pr-4 pl-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                <option value="all">الدفع: الكل</option>
                <option value="completed">دفعة مكتملة</option>
                <option value="partial">مبلغ متبقٍ</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* جدول الملاك */}
        <section className="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              قائمة الملاك ({filteredUnits.length})
            </h2>
            <p className="text-sm text-slate-500 mt-1">عرض تفاصيل الملاك</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">لا توجد وحدات مباعة مسجّلة</p>
              <p className="text-sm mt-1">ستظهر هنا عند وجود وحدات بحالة «مباعة» مع بيانات المالك</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-teal-50/80 border-b border-teal-100">
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">اسم المالك</th>
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">جوال</th>
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">العمارة</th>
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">الوحدة</th>
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">استلام</th>
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">رقم الصك السابق</th>
                    <th className="p-2 text-teal-800 font-bold border-b border-teal-200 align-middle text-sm">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {ownersPaginated.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100 hover:bg-teal-50/50 transition">
                      <td className="p-2 text-slate-800 font-medium align-middle text-sm">{unit.owner_name || unit.previous_owner_name || "—"}</td>
                      <td className="p-2 text-slate-700 align-middle dir-ltr font-mono text-sm font-medium">{unit.owner_phone || "—"}</td>
                      <td className="p-2 text-slate-600 align-middle text-sm">{unit.building?.name || "—"}</td>
                      <td className="p-2 text-slate-700 font-medium align-middle text-sm">
                        {unit.unit_number} <span className="text-slate-500">(د{unit.floor})</span>
                      </td>
                      <td className="p-2 align-middle">
                        {unit.handover?.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> تم
                          </span>
                        ) : unit.handover?.status === "draft" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5" /> مسودة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
                            <AlertCircle className="w-3.5 h-3.5" /> —
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-slate-700 font-mono align-middle text-sm font-medium break-all">{unit.deed_number || "—"}</td>
                      <td className="p-2 align-middle">
                        <button
                          type="button"
                          onClick={() => setViewOwnerUnit(unit)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg text-sm font-medium transition"
                        >
                          <Eye className="w-4 h-4" />
                          عرض المالك
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUnits.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>عرض</span>
                  <select
                    value={ownersPageSize}
                    onChange={(e) => {
                      setOwnersPageSize(Number(e.target.value));
                      setOwnersPage(1);
                    }}
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                  >
                    {OWNERS_PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className="font-mono">
                    {((ownersPage - 1) * ownersPageSize + 1).toLocaleString("en")} - {Math.min(ownersPage * ownersPageSize, filteredUnits.length).toLocaleString("en")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOwnersPage((p) => Math.max(1, p - 1))}
                    disabled={ownersPage <= 1}
                    className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                  >
                    السابق
                  </button>
                  <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                    {ownersPage.toLocaleString("en")} / {ownersTotalPages.toLocaleString("en")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOwnersPage((p) => Math.min(ownersTotalPages, p + 1))}
                    disabled={ownersPage >= ownersTotalPages}
                    className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </section>
      </div>

      {/* نافذة تفاصيل المالك */}
      {viewOwnerUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 cursor-pointer"
          onClick={() => setViewOwnerUnit(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-modal-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 id="owner-modal-title" className="text-lg font-bold text-teal-800 flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات المالك — الوحدة {viewOwnerUnit.unit_number} ({viewOwnerUnit.building?.name})
              </h2>
              <button
                type="button"
                onClick={() => setViewOwnerUnit(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {/* ما بعد البيع */}
              <div className="rounded-xl bg-teal-50/80 border border-teal-100 p-4 space-y-3 mb-4">
                <h3 className="font-bold text-teal-800 flex items-center gap-2 text-sm">
                  <ClipboardCheck className="w-4 h-4" />
                  الاستلام واتحاد الملاك والضمانات
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center gap-3 py-1.5">
                    <span className="text-slate-600 shrink-0">استلام الوحدة</span>
                    <span className="font-medium text-slate-800 text-left">
                      {viewOwnerUnit.handover?.status === "completed" ? (
                        <span className="text-emerald-700 dir-ltr">تم — {viewOwnerUnit.handover.handover_date ? (() => { const d = new Date(viewOwnerUnit.handover.handover_date); const day = String(d.getDate()).padStart(2, "0"); const month = String(d.getMonth() + 1).padStart(2, "0"); const year = d.getFullYear(); return `${day}/${month}/${year}`; })() : ""}</span>
                      ) : viewOwnerUnit.handover?.status === "draft" ? (
                        <span className="text-amber-700">مسودة</span>
                      ) : (
                        <span className="text-slate-500">لم يتم</span>
                      )}
                    </span>
                  </div>
                  {viewOwnerUnit.handover?.received_by && (
                    <div className="flex justify-between items-center gap-3 py-1.5">
                      <span className="text-slate-600 shrink-0">المستلم</span>
                      <span className="font-medium text-slate-800 text-left">{viewOwnerUnit.handover.received_by}{viewOwnerUnit.handover.received_by_phone ? ` · ${viewOwnerUnit.handover.received_by_phone}` : ""}</span>
                    </div>
                  )}
                  {viewOwnerUnit.sale?.remaining_payment_collected_at && (
                    <div className="flex justify-between items-center gap-3 py-1.5">
                      <span className="text-slate-600 shrink-0">تاريخ تحصيل المتبقي</span>
                      <span className="font-medium text-slate-800 text-left">{new Date(viewOwnerUnit.sale.remaining_payment_collected_at).toLocaleDateString("ar-SA", { dateStyle: "medium" })}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Link
                    href={`/dashboard/sales/handover/${viewOwnerUnit.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition whitespace-nowrap"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    {viewOwnerUnit.handover ? "عرض/تعديل نموذج الاستلام" : "تسجيل استلام الوحدة"}
                  </Link>
                  {viewOwnerUnit.handover?.status === "completed" ? (
                    viewOwnerUnit.owner_association_registered ? (
                      <span className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-sky-100 text-sky-700 text-xs font-medium whitespace-nowrap">
                        <CheckCircle className="w-3.5 h-3.5" /> مسجّل في اتحاد الملاك
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAssociationModalUnit(viewOwnerUnit)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        تسجيل في اتحاد الملاك
                      </button>
                    )
                  ) : (
                    <div />
                  )}
                  <Link
                    href={`/dashboard/buildings/details?buildingId=${viewOwnerUnit.building_id}#card-warranties`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-amber-500/90 text-white text-xs font-medium hover:bg-amber-600 transition whitespace-nowrap"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    الضمانات
                  </Link>
                  <Link
                    href={`/dashboard/owners-investors/owners/maintenance?unitId=${viewOwnerUnit.id}&buildingId=${viewOwnerUnit.building_id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition whitespace-nowrap"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    الصيانة
                  </Link>
                </div>
              </div>

              {/* الضمانات — ضمان عقد المصاعد للعمارة */}
              {viewOwnerUnit.building && (() => {
                const b = viewOwnerUnit.building;
                const months = b.warranty_months ?? null;
                const contractDate = b.maintenance_contract_date ?? "";
                let warrantyEndDate: string | null = null;
                if (contractDate && months != null && !Number.isNaN(months) && months > 0) {
                  const d = new Date(contractDate);
                  if (!Number.isNaN(d.getTime())) {
                    d.setMonth(d.getMonth() + months);
                    warrantyEndDate = d.toISOString().slice(0, 10);
                  }
                }
                const today = new Date().toISOString().slice(0, 10);
                const warrantyExpired = warrantyEndDate && warrantyEndDate < today;
                const warrantyExpiringSoon = warrantyEndDate && warrantyEndDate >= today && warrantyEndDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                if (!months && !contractDate && !b.maintenance_company) return null;
                return (
                  <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-4 space-y-2 mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" />
                      الضمانات
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      {b.maintenance_company && (
                        <div className="flex justify-between items-center gap-3 py-1">
                          <span className="text-slate-600 shrink-0">شركة المصاعد/الصيانة</span>
                          <span className="font-medium text-slate-800 text-left">{b.maintenance_company}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-3 py-1">
                        <span className="text-slate-600 shrink-0">ضمان عقد المصاعد</span>
                        <span className="font-medium text-slate-800 text-left">
                          {months != null ? `${months} شهر` : "—"}
                          {warrantyEndDate && ` · ينتهي ${new Date(warrantyEndDate).toLocaleDateString("ar-SA", { dateStyle: "short" })}`}
                        </span>
                      </div>
                      {(warrantyExpired || warrantyExpiringSoon) && (
                        <p className={`text-xs font-medium py-1.5 px-2 rounded-lg ${warrantyExpired ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                          {warrantyExpired ? "انتهى ضمان عقد المصاعد" : "ضمان عقد المصاعد ينتهي قريباً"}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/buildings/details?buildingId=${viewOwnerUnit.building_id}#card-elevators-maintenance`}
                      className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      تفاصيل المصاعد والصيانة
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })()}

              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">اسم المالك الحالي</span>
                <span className="font-medium text-slate-800 text-left">{viewOwnerUnit.owner_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">جوال المالك</span>
                <span className="font-medium text-slate-800 dir-ltr text-left">{viewOwnerUnit.owner_phone || "—"}</span>
              </div>
              {viewOwnerUnit.transfer_check_image_url && (
                <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                  <span className="text-slate-600 shrink-0">
                    {(viewOwnerUnit.sale?.sale_price != null || viewOwnerUnit.transfer_check_amount != null)
                      ? `مبلغ الشيك (${Number(viewOwnerUnit.sale?.sale_price ?? viewOwnerUnit.transfer_check_amount).toLocaleString("en")} ر.س)`
                      : "مبلغ الشيك"}
                  </span>
                  <a
                    href={viewOwnerUnit.transfer_check_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 inline-flex items-center gap-1"
                    title="معاينة صورة الشيك"
                  >
                    <Eye className="w-4 h-4" /> معاينة
                  </a>
                </div>
              )}
              {(() => {
                const pm = (viewOwnerUnit.transfer_payment_method ?? "").toString().trim();
                const methods = pm ? pm.split(",").map((m) => m.trim()).filter(Boolean) : [];
                const cashOrTransfer = methods.filter((m) => m === "cash" || m === "transfer");
                const label = cashOrTransfer.map((m) => (m === "cash" ? "كاش" : "تحويل")).join(" + ");
                return cashOrTransfer.length > 0 ? (
                  <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                    <span className="text-slate-600 shrink-0">طريقة الشراء</span>
                    <span className="font-medium text-slate-800 text-left">{label}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">حالة الدفع</span>
                <span className="font-medium text-slate-800 text-left">
                  {viewOwnerUnit.sale?.payment_status === "completed" ? (
                    <span className="text-emerald-700">دفعة مكتملة</span>
                  ) : viewOwnerUnit.sale?.payment_status === "partial" && (viewOwnerUnit.sale?.remaining_payment ?? 0) > 0 ? (
                    <span className="text-amber-700">
                      مبلغ متبقٍ: {(viewOwnerUnit.sale.remaining_payment ?? 0).toLocaleString("en")} ر.س
                      {viewOwnerUnit.sale?.remaining_payment_due_date && (
                        <span className="block text-xs text-slate-500 mt-0.5">استحقاق: {new Date(viewOwnerUnit.sale.remaining_payment_due_date).toLocaleDateString("ar-SA")}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">تاريخ الإفراغ</span>
                <span className="font-medium text-slate-800 text-left dir-ltr">
                  {(() => {
                    const transferDate = viewOwnerUnit.sale?.sale_date;
                    const fallbackHandover = viewOwnerUnit.handover?.handover_date;
                    const fallbackCollected = viewOwnerUnit.sale?.remaining_payment_collected_at;
                    const dateToShow = transferDate || fallbackHandover || fallbackCollected;
                    if (!dateToShow) return "—";
                    const d = new Date(dateToShow);
                    const day = String(d.getDate()).padStart(2, "0");
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const year = d.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">الإعفاء الضريبي</span>
                <span className="font-medium text-left inline-flex items-center gap-1.5 flex-row-reverse">
                  {viewOwnerUnit.tax_exemption_status ? "نعم" : "لا"}
                  {viewOwnerUnit.tax_exemption_file_url && (
                    <a
                      href={viewOwnerUnit.tax_exemption_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                      title="معاينة ملف الإعفاء"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                </span>
              </div>
              {viewOwnerUnit.transfer_real_estate_request_no && (
                <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                  <span className="text-slate-600 shrink-0">رقم طلب التصرفات العقارية</span>
                  <span className="font-medium text-slate-800 text-left">{viewOwnerUnit.transfer_real_estate_request_no}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">نقل عداد الكهرباء مع الوحدة</span>
                <span className="font-medium text-left">{viewOwnerUnit.electricity_meter_transferred_with_sale ? "نعم" : "لا"}</span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">نقل عداد مياه مع الوحدة</span>
                <span className="font-medium text-left">{viewOwnerUnit.water_meter_transferred_with_sale ? "نعم" : "لا"}</span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">نقل غرفة السائق مع الوحدة</span>
                <span className="font-medium text-left">{viewOwnerUnit.driver_room_transferred_with_sale ? "نعم" : "لا"}</span>
              </div>
              {viewOwnerUnit.transfer_id_image_url && (
                <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                  <span className="text-slate-600 shrink-0">صورة الهوية</span>
                  <a
                    href={viewOwnerUnit.transfer_id_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 inline-flex items-center gap-1"
                    title="معاينة صورة الهوية"
                  >
                    <Eye className="w-4 h-4" /> معاينة
                  </a>
                </div>
              )}
              <div className="pt-4 flex gap-2">
                {viewOwnerUnit.deed_pdf_url ? (
                  <a
                    href={viewOwnerUnit.deed_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition"
                  >
                    <FileText className="w-4 h-4" />
                    صك الوحدة السابق
                  </a>
                ) : (
                  <span className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    لا يوجد صك مُرفق
                  </span>
                )}
                <Link
                  href={`/dashboard/buildings/details?buildingId=${viewOwnerUnit.building_id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  تفاصيل العمارة
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تسجيل الوحدة في اتحاد الملاك */}
      {associationModalUnit && (() => {
        const b = associationModalUnit.building;
        let assoc: OwnerAssociationData = {};
        try {
          const raw = b?.owner_association;
          assoc = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw as OwnerAssociationData) || {};
        } catch {}
        const hasAssociation = !!assoc.hasAssociation;
        const currentCount = assoc.registeredUnitsCount ?? 0;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 cursor-pointer"
            onClick={() => !associationSaving && setAssociationModalUnit(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="association-modal-title"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="association-modal-title" className="text-lg font-bold text-sky-800 flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" />
                تسجيل في اتحاد الملاك
              </h3>
              {!hasAssociation ? (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    يجب تفعيل اتحاد الملاك للعمارة «{b?.name}» من تفاصيل العمارة أولاً، ثم تسجيل الوحدات.
                  </p>
                  <Link
                    href={`/dashboard/buildings/details?buildingId=${associationModalUnit.building_id}#card-association`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
                  >
                    تفاصيل العمارة — اتحاد الملاك
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-2">
                    تسجيل الوحدة <strong>{associationModalUnit.unit_number}</strong> (د{associationModalUnit.floor}) — {b?.name} في اتحاد الملاك.
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    عدد الوحدات المسجلة حالياً: <strong>{currentCount}</strong> — سيصبح {currentCount + 1} بعد التسجيل.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRegisterInAssociation}
                      disabled={associationSaving}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
                    >
                      {associationSaving ? "جاري التسجيل..." : "تسجيل"}
                    </button>
                    <button
                      type="button"
                      onClick={() => !associationSaving && setAssociationModalUnit(null)}
                      disabled={associationSaving}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}
