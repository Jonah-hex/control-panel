"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";

const RIYAL = "ر.س";

interface CommissionRow {
  customerName: string;
  buildingName: string;
  commission: number;
  receivedAt: string;
}

export default function MarketerCommissionsPage() {
  const params = useParams();
  const router = useRouter();
  const marketerId = params?.id as string | undefined;
  const { can, ready, effectiveOwnerId } = useDashboardAuth();
  const [marketerName, setMarketerName] = useState<string>("");
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!marketerId || !effectiveOwnerId) return;
    setLoading(true);
    try {
      const { data: marketerData } = await supabase
        .from("reservation_marketers")
        .select("name")
        .eq("id", marketerId)
        .eq("owner_id", effectiveOwnerId)
        .maybeSingle();
      setMarketerName((marketerData as { name?: string } | null)?.name ?? "—");

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
        .select("id, sale_date, commission_amount, building_id, buyer_name")
        .in("id", saleIds);

      const sales = (salesData || []) as {
        id: string;
        sale_date: string | null;
        commission_amount: number | null;
        building_id: string | null;
        buyer_name: string | null;
      }[];
      const buildingIds = [...new Set(sales.map((s) => s.building_id).filter(Boolean))] as string[];

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

      const resBySaleId = new Map<string, { customer_name?: string | null }>();
      reservations.forEach((r) => resBySaleId.set(r.sale_id, { customer_name: r.customer_name }));

      const list: CommissionRow[] = sales.map((s) => {
        const res = resBySaleId.get(s.id);
        const customerName =
          (s.buyer_name && String(s.buyer_name).trim()) ||
          (res?.customer_name && String(res.customer_name).trim()) ||
          "—";
        return {
          customerName,
          buildingName: s.building_id ? buildingMap[s.building_id] ?? "—" : "—",
          commission: s.commission_amount ?? 0,
          receivedAt: s.sale_date?.slice(0, 10) ?? "—",
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
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/marketing/marketers"
              className="p-2 rounded-xl border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <RiyalIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">سجل عمولات المسوق</h1>
                <p className="text-sm text-slate-500 mt-0.5">{marketerName}</p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            لوحة التحكم
          </Link>
        </header>

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
            <div className="px-5 py-12 text-center text-slate-500">جاري تحميل سجل العمولات...</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-500">لا توجد عمولات مسجّلة لهذا المسوق.</div>
          ) : (
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">اسم العميل</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">اسم المشروع</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">العمولة</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">تاريخ استلام العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-3 text-slate-800 font-medium">{r.customerName}</td>
                      <td className="py-3 px-3 text-slate-600">{r.buildingName}</td>
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
