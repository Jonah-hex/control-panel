"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Sale {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_id_number: string;
  sale_date: string;
  sale_price: number;
  payment_method: string;
  down_payment: number;
  remaining_payment: number;
  payment_status: string;
  contract_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
  unit_id: string;
  building_id: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSales() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select(`id, buyer_name, buyer_email, buyer_phone, buyer_id_number, sale_date, sale_price, payment_method, down_payment, remaining_payment, payment_status, contract_url, notes, created_at, updated_at, unit_id, building_id`)
        .order("created_at", { ascending: false });
      if (!error) setSales(data || []);
      setLoading(false);
    }
    fetchSales();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">سجل المبيعات</h1>
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm bg-white rounded-xl">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">#</th>
                <th className="p-2 border">اسم المشتري</th>
                <th className="p-2 border">الهاتف</th>
                <th className="p-2 border">البريد</th>
                <th className="p-2 border">رقم الهوية</th>
                <th className="p-2 border">تاريخ البيع</th>
                <th className="p-2 border">السعر</th>
                <th className="p-2 border">طريقة الدفع</th>
                <th className="p-2 border">الدفعة الأولى</th>
                <th className="p-2 border">المتبقي</th>
                <th className="p-2 border">حالة الدفع</th>
                <th className="p-2 border">رابط العقد</th>
                <th className="p-2 border">ملاحظات</th>
                <th className="p-2 border">تاريخ الإنشاء</th>
                <th className="p-2 border">تاريخ التحديث</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{i + 1}</td>
                  <td className="p-2 border">{s.buyer_name}</td>
                  <td className="p-2 border">{s.buyer_phone}</td>
                  <td className="p-2 border">{s.buyer_email}</td>
                  <td className="p-2 border">{s.buyer_id_number}</td>
                  <td className="p-2 border">{s.sale_date?.slice(0, 10)}</td>
                  <td className="p-2 border">{s.sale_price}</td>
                  <td className="p-2 border">{s.payment_method}</td>
                  <td className="p-2 border">{s.down_payment}</td>
                  <td className="p-2 border">{s.remaining_payment}</td>
                  <td className="p-2 border">{s.payment_status}</td>
                  <td className="p-2 border">
                    {s.contract_url ? (
                      <a href={s.contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">رابط</a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2 border">{s.notes}</td>
                  <td className="p-2 border">{s.created_at?.slice(0, 10)}</td>
                  <td className="p-2 border">{s.updated_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="text-center text-gray-500 py-8">لا توجد مبيعات حالياً</div>
          )}
        </div>
      )}
    </main>
  );
}
