"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import {
  UserPlus,
  LayoutDashboard,
  ArrowRight,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building2,
  X,
  Users,
  ChevronLeft,
  Check,
  Search,
} from "lucide-react";
import { phoneDigitsOnly, isValidPhone10Digits } from "@/lib/validation-utils";

interface Marketer {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const cardBase =
  "rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-lg overflow-hidden transition-all duration-300";
const iconBox =
  "w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20";

export default function MarketersPage() {
  const router = useRouter();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});
  const [completedSalesCounts, setCompletedSalesCounts] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();

  const filteredMarketers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return marketers;
    const digitsOnly = q.replace(/\D/g, "");
    return marketers.filter((m) => {
      const name = (m.name ?? "").toLowerCase();
      const phone = (m.phone ?? "").replace(/\D/g, "");
      const email = (m.email ?? "").toLowerCase();
      const company = (m.company ?? "").toLowerCase();
      const notes = (m.notes ?? "").toLowerCase();
      return (
        name.includes(q) ||
        (digitsOnly.length >= 3 && phone.includes(digitsOnly)) ||
        email.includes(q) ||
        company.includes(q) ||
        notes.includes(q)
      );
    });
  }, [marketers, searchQuery]);

  const fetchMarketers = useCallback(async () => {
    if (!effectiveOwnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("reservation_marketers")
      .select("id, owner_id, name, phone, email, company, notes, created_at, updated_at")
      .eq("owner_id", effectiveOwnerId)
      .order("name", { ascending: true });
    if (error) {
      showToast(error.message || "فشل تحميل المسوقين.", "error");
      setMarketers([]);
    } else {
      setMarketers((data as Marketer[]) || []);
    }
    setLoading(false);
  }, [effectiveOwnerId, supabase]);

  const fetchReservationCounts = useCallback(async () => {
    if (!effectiveOwnerId || marketers.length === 0) return;
    const ids = marketers.map((m) => m.id);
    const { data } = await supabase
      .from("reservations")
      .select("marketer_id, status")
      .in("marketer_id", ids);
    const counts: Record<string, number> = {};
    const completed: Record<string, number> = {};
    ids.forEach((id) => {
      counts[id] = 0;
      completed[id] = 0;
    });
    data?.forEach((r: { marketer_id?: string | null; status?: string }) => {
      if (r.marketer_id) {
        counts[r.marketer_id] = (counts[r.marketer_id] || 0) + 1;
        if (r.status === "completed") completed[r.marketer_id] = (completed[r.marketer_id] || 0) + 1;
      }
    });
    setReservationCounts(counts);
    setCompletedSalesCounts(completed);
  }, [effectiveOwnerId, marketers.length, supabase]);

  useEffect(() => {
    if (!ready) return;
    if (!can("reservations")) {
      router.replace("/dashboard");
      return;
    }
    fetchMarketers();
  }, [ready, can, router, fetchMarketers]);

  useEffect(() => {
    if (marketers.length > 0) fetchReservationCounts();
  }, [marketers, fetchReservationCounts]);

  const openAdd = () => {
    setForm({ name: "", phone: "", email: "", company: "", notes: "" });
    setEditingId(null);
    setModalOpen("add");
  };

  const openEdit = (m: Marketer) => {
    setForm({
      name: m.name || "",
      phone: m.phone || "",
      email: m.email || "",
      company: m.company || "",
      notes: m.notes || "",
    });
    setEditingId(m.id);
    setModalOpen("edit");
  };

  const closeModal = () => {
    setModalOpen(null);
    setEditingId(null);
  };

  const handleSave = async () => {
    const nameTrim = form.name.trim();
    if (!nameTrim) {
      showToast("الرجاء إدخال اسم المسوق.", "error");
      return;
    }
    const phoneTrim = form.phone.trim();
    if (phoneTrim && !isValidPhone10Digits(phoneTrim)) {
      showToast("جوال المسوق يجب أن يكون 10 أرقام.", "error");
      return;
    }
    if (!effectiveOwnerId) return;
    setSaving(true);
    const payload = {
      name: nameTrim,
      phone: phoneTrim || null,
      email: form.email?.trim() || null,
      company: form.company?.trim() || null,
      notes: form.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (modalOpen === "add") {
      const { error } = await supabase.from("reservation_marketers").insert({ ...payload, owner_id: effectiveOwnerId });
      if (error) showToast(error.message || "فشل إضافة المسوق.", "error");
      else {
        showToast("تمت إضافة المسوق بنجاح.", "success");
        closeModal();
        fetchMarketers();
      }
    } else if (editingId) {
      const { error } = await supabase.from("reservation_marketers").update(payload).eq("id", editingId).eq("owner_id", effectiveOwnerId);
      if (error) showToast(error.message || "فشل تحديث المسوق.", "error");
      else {
        showToast("تم تحديث المسوق بنجاح.", "success");
        closeModal();
        fetchMarketers();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!effectiveOwnerId) return;
    const { error } = await supabase.from("reservation_marketers").delete().eq("id", id).eq("owner_id", effectiveOwnerId);
    if (error) showToast(error.message || "فشل حذف المسوق.", "error");
    else {
      showToast("تم حذف المسوق.", "success");
      setDeleteConfirm(null);
      fetchMarketers();
    }
  };

  if (ready && !can("reservations")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-amber-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(245,158,11,0.06),transparent)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_50%_60%_at_80%_100%,rgba(234,88,12,0.05),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto relative">
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/marketing"
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className={iconBox}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">قسم المسوقين</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">إدارة قائمة المسوقين وربطهم بالحجوزات والمبيعات</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/marketing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                إدارة التسويق والمبيعات
              </Link>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium text-sm shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 transition"
              >
                <UserPlus className="w-4 h-4" />
                إضافة مسوق
              </button>
            </div>
          </div>
        </header>

        <section className={cardBase}>
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              قائمة المسوقين
              {marketers.length > 0 && (
                <span className="text-sm font-normal text-slate-500">— {marketers.length.toLocaleString("en")} مسوق</span>
              )}
            </h2>
          </div>

          {marketers.length > 0 && !loading && (
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، الجوال، الإيميل، المؤسسة..."
                  className="w-full pr-10 pl-4 py-2 text-sm border border-slate-200 rounded-full bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                />
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <p className="text-xs text-slate-500 mt-1.5">
                  نتيجة البحث: {filteredMarketers.length.toLocaleString("en")} من {marketers.length.toLocaleString("en")} مسوق
                </p>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : marketers.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-slate-600 font-medium">لا يوجد مسوقون مسجلون بعد</p>
              <p className="text-sm text-slate-500 mt-1">أضف مسوقين هنا، أو أدخل اسم وجوال المسوق عند إنشاء الحجز — سيُضاف تلقائياً إلى القائمة ويرتبط بالحجز والعمولة</p>
              <button
                type="button"
                onClick={openAdd}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition"
              >
                <UserPlus className="w-4 h-4" />
                إضافة أول مسوق
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">الاسم</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">بيانات المسوق</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-slate-600 w-16">حجز</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-slate-600 w-16">بيع</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-slate-600 w-28">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarketers.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-amber-50/40 transition">
                      <td className="py-2 px-3 align-top">
                        <p className="font-semibold text-gray-800 truncate max-w-[10rem]" title={m.name}>{m.name}</p>
                        {m.notes && <p className="text-xs text-slate-400 truncate max-w-[10rem] mt-0.5" title={m.notes}>{m.notes}</p>}
                      </td>
                      <td className="py-2 px-3 text-slate-600 align-top">
                        <div className="flex flex-col gap-0.5">
                          {m.phone && <span className="inline-flex items-center gap-1 dir-ltr text-xs"><Phone className="w-3 h-3 shrink-0" />{m.phone}</span>}
                          {m.email && <span className="inline-flex items-center gap-1 truncate text-xs max-w-[12rem]"><Mail className="w-3 h-3 shrink-0" />{m.email}</span>}
                          {m.company && <span className="inline-flex items-center gap-1 truncate text-xs max-w-[12rem]"><Building2 className="w-3 h-3 shrink-0" />{m.company}</span>}
                          {!m.phone && !m.email && !m.company && <span className="text-slate-400 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center align-top">
                        {(reservationCounts[m.id] ?? 0) > 0 ? (
                          <span className="text-xs text-amber-700 font-medium">{(reservationCounts[m.id] ?? 0).toLocaleString("en")}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center align-top">
                        {(completedSalesCounts[m.id] ?? 0) > 0 ? (
                          <span className="text-xs text-amber-700 font-medium">{(completedSalesCounts[m.id] ?? 0).toLocaleString("en")}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/dashboard/reservations?marketerId=${m.id}`}
                            className="p-1.5 rounded-md border border-amber-200 text-amber-600 hover:bg-amber-50 transition"
                            title="الحجوزات"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === m.id ? (
                            <>
                              <button type="button" onClick={() => handleDelete(m.id)} className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700" title="تأكيد الحذف">
                                <Check className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="إلغاء">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(m.id)}
                              className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* modal add / edit */}
      {(modalOpen === "add" || modalOpen === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">{modalOpen === "add" ? "إضافة مسوق" : "تعديل المسوق"}</h3>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المسوق *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  placeholder="الاسم الكامل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجوال</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: phoneDigitsOnly(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 dir-ltr"
                  placeholder="05xxxxxxxx"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المؤسسة / الشركة</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  placeholder="اختياري"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 resize-none"
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 transition"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" onClick={closeModal} className="px-5 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
