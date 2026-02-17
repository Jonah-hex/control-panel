"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchReservations() {
      setLoading(true);
      const { data, error } = await supabase
        .from("reservations")
        .select(`id, customer_name, customer_email, customer_phone, reservation_date, expiry_date, status, notes, deposit_amount, deposit_paid, deposit_paid_date, created_at, updated_at, unit_id, building_id`)
        .order("created_at", { ascending: false });
      if (!error) setReservations(data || []);
      setLoading(false);
    }
    fetchReservations();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">سجل الحجوزات</h1>
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm bg-white rounded-xl">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">#</th>
                <th className="p-2 border">اسم العميل</th>
                <th className="p-2 border">الهاتف</th>
                <th className="p-2 border">البريد</th>
                <th className="p-2 border">تاريخ الحجز</th>
                <th className="p-2 border">تاريخ الانتهاء</th>
                <th className="p-2 border">الحالة</th>
                <th className="p-2 border">المبلغ المحجوز</th>
                <th className="p-2 border">مدفوع؟</th>
                <th className="p-2 border">تاريخ الدفع</th>
                <th className="p-2 border">ملاحظات</th>
                <th className="p-2 border">تاريخ الإنشاء</th>
                <th className="p-2 border">تاريخ التحديث</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{i + 1}</td>
                  <td className="p-2 border">{r.customer_name}</td>
                  <td className="p-2 border">{r.customer_phone}</td>
                  <td className="p-2 border">{r.customer_email}</td>
                  <td className="p-2 border">{r.reservation_date?.slice(0, 10)}</td>
                  <td className="p-2 border">{r.expiry_date?.slice(0, 10)}</td>
                  <td className="p-2 border">{r.status}</td>
                  <td className="p-2 border">{r.deposit_amount}</td>
                  <td className="p-2 border">{r.deposit_paid ? "نعم" : "لا"}</td>
                  <td className="p-2 border">{r.deposit_paid_date?.slice(0, 10)}</td>
                  <td className="p-2 border">{r.notes}</td>
                  <td className="p-2 border">{r.created_at?.slice(0, 10)}</td>
                  <td className="p-2 border">{r.updated_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reservations.length === 0 && (
            <div className="text-center text-gray-500 py-8">لا توجد حجوزات حالياً</div>
          )}
        </div>
      )}
    </main>
  );
}
