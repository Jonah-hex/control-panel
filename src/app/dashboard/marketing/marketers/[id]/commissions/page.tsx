"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { ChevronLeft, LayoutDashboard, User, Phone, Mail, Building2, FileText } from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";

interface MarketerInfo {
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
}

const RIYAL = "ر.س";

interface CommissionRow {
  customerName: string;
  buildingName: string;
  unitNumber: string;
  handoverDate: string;
  commission: number;
  receivedAt: string;
}

export default function MarketerCommissionsPage() {
  const params = useParams();
  const router = useRouter();
  const marketerId = params?.id as string | undefined;
  const { can, ready, effectiveOwnerId } = useDashboardAuth();
  const [marketer, setMarketer] = useState<MarketerInfo | null>(null);
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!marketerId || !effectiveOwnerId) return;
    setLoading(true);
    try {
      const { data: marketerData } = await supabase
        .from("reservation_marketers")
        .select("name, phone, email, company, notes")
        .eq("id", marketerId)
        .eq("owner_id", effectiveOwnerId)
        .maybeSingle();
      const m = marketerData as { name?: string; phone?: string | null; email?: string | null; company?: string | null; notes?: string | null } | null;
      setMarketer(m ? { name: m.name ?? "—", phone: m.phone ?? null, email: m.email ?? null, company: m.company ?? null, notes: m.notes ?? null } : null);

      const { data: resData } = await supabase
        .from("reservations")
        .select("id, sale_id, customer_name")
        .eq("marketer_id", marketerId)
        .not("sale_id", "is", null);

      const reservations = (resData || []) as { id: string; sale_id: string; customer_name?: string | null }[];
      const saleIds = [...new Set(reservations.map((r) => r.sale_id).filter(Boolean))] as string[];
      if (saleIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: salesData } = await supabase
        .from("sales")
        .select("id, sale_date, commission_amount, building_id, buyer_name, unit_id, commission_received_at")
        .in("id", saleIds);

      const sales = (salesData || []) as {
        id: string;
        sale_date: string | null;
        commission_amount: number | null;
        building_id: string | null;
        buyer_name: string | null;
        unit_id: string | null;
        commission_received_at: string | null;
      }[];
      const buildingIds = [...new Set(sales.map((s) => s.building_id).filter(Boolean))] as string[];
      const unitIds = [...new Set(sales.map((s) => s.unit_id).filter(Boolean))] as string[];

      let buildingMap: Record<string, string> = {};
      if (buildingIds.length > 0) {
        const { data: buildingsData } = await supabase
          .from("buildings")
          .select("id, name")
          .in("id", buildingIds);
        (buildingsData || []).forEach((b: { id: string; name: string }) => {
          buildingMap[b.id] = b.name ?? "—";
        });
      }

      let unitMap: Record<string, { unit_number: string; floor: number }> = {};
      let handoverMap: Record<string, string> = {};
      if (unitIds.length > 0) {
        const [unitsRes, handoversRes] = await Promise.all([
          supabase.from("units").select("id, unit_number, floor").in("id", unitIds),
          supabase.from("unit_handovers").select("unit_id, handover_date").in("unit_id", unitIds),
        ]);
        (unitsRes.data || []).forEach((u: { id: string; unit_number: string; floor: number }) => {
          unitMap[u.id] = { unit_number: u.unit_number ?? "—", floor: u.floor ?? 0 };
        });
        (handoversRes.data || []).forEach((h: { unit_id: string; handover_date: string | null }) => {
          if (h.handover_date) handoverMap[h.unit_id] = h.handover_date.slice(0, 10);
        });
      }

      const resBySaleId = new Map<string, { customer_name?: string | null }>();
      reservations.forEach((r) => resBySaleId.set(r.sale_id, { customer_name: r.customer_name }));

      const list: CommissionRow[] = sales.map((s) => {
        const res = resBySaleId.get(s.id);
        const customerName =
          (s.buyer_name && String(s.buyer_name).trim()) ||
          (res?.customer_name && String(res.customer_name).trim()) ||
          "—";
        const unit = s.unit_id ? unitMap[s.unit_id] : null;
        const unitNumber = unit ? `${unit.unit_number} (د${unit.floor})` : "—";
        const handoverDate = s.unit_id && handoverMap[s.unit_id] ? handoverMap[s.unit_id] : "—";
        const receivedAt = ((s.commission_received_at && s.commission_received_at.slice(0, 10)) || s.sale_date?.slice(0, 10)) ?? "—";
        return {
          customerName,
          buildingName: s.building_id ? buildingMap[s.building_id] ?? "—" : "—",
          unitNumber,
          handoverDate,
          commission: s.commission_amount ?? 0,
          receivedAt,
        };
      });

      list.sort((a, b) => (b.receivedAt > a.receivedAt ? 1 : b.receivedAt < a.receivedAt ? -1 : 0));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [marketerId, effectiveOwnerId, supabase]);

  useEffect(() => {
    if (!ready || !marketerId) return;
    if (!can("marketing_view")) {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [ready, can, marketerId, router, fetchData]);

  if (!ready || !marketerId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحميل...</p>
      </main>
    );
  }

  const totalCommission = rows.reduce((sum, r) => sum + r.commission, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-amber-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto relative">
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard/marketing/marketers"
                className="p-2 rounded-xl border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
                aria-label="رجوع"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </Link>
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <RiyalIcon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">سجل المسوق</h1>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Link
                href="/dashboard/marketing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-600" />
                إدارة التسويق والمبيعات
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-600" />
                لوحة التحكم
              </Link>
            </div>
          </div>
        </header>

        {/* بطاقة بيانات المسوق */}
        {marketer && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                بيانات المسوق
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">الاسم</p>
                  <p className="text-sm font-medium text-slate-800">{marketer.name}</p>
                </div>
              </div>
              {marketer.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">الجوال</p>
                    <p className="text-sm font-medium text-slate-800 dir-ltr">{marketer.phone}</p>
                  </div>
                </div>
              )}
              {marketer.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">الإيميل</p>
                    <p className="text-sm font-medium text-slate-800 truncate dir-ltr" title={marketer.email}>{marketer.email}</p>
                  </div>
                </div>
              )}
              {marketer.company && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">المؤسسة</p>
                    <p className="text-sm font-medium text-slate-800">{marketer.company}</p>
                  </div>
                </div>
              )}
              {marketer.notes && (
                <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">ملاحظات</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{marketer.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-lg overflow-hidden transition-all duration-300">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 to-white flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-slate-800">عمولات المبيعات المكتملة</p>
            {rows.length > 0 && (
              <p className="text-sm font-bold text-amber-700 dir-ltr">
                الإجمالي: {totalCommission.toLocaleString("ar-SA")} {RIYAL}
              </p>
            )}
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-slate-500">جاري التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-500">لا توجد عمولات مسجّلة لهذا المسوق.</div>
          ) : (
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">اسم العميل</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">اسم المشروع</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">رقم الوحدة</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">تاريخ الإفراغ</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">العمولة</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">تاريخ استلام العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-3 text-slate-800 font-medium">{r.customerName}</td>
                      <td className="py-3 px-3 text-slate-600">{r.buildingName}</td>
                      <td className="py-3 px-3 text-slate-600">{r.unitNumber}</td>
                      <td className="py-3 px-3 text-slate-600 dir-ltr">{r.handoverDate}</td>
                      <td className="py-3 px-3 dir-ltr text-amber-700 font-semibold">{r.commission.toLocaleString("ar-SA")} {RIYAL}</td>
                      <td className="py-3 px-3 text-slate-600 dir-ltr">{r.receivedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
