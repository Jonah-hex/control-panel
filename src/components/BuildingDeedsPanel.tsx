"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileText, Building2, Pencil, X, FileUp, ExternalLink, User, Eye } from "lucide-react";

interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number;
  status?: string;
  electricity_meter_number?: string | null;
  owner_name?: string | null;
  previous_owner_name?: string | null;
  owner_phone?: string | null;
  tax_exemption_status?: boolean | null;
  tax_exemption_file_url?: string | null;
  transfer_check_image_url?: string | null;
  transfer_check_amount?: number | null;
  transfer_payment_method?: string | null;
  transfer_cash_amount?: number | null;
  transfer_bank_name?: string | null;
  transfer_amount?: number | null;
  transfer_real_estate_request_no?: string | null;
  transfer_id_image_url?: string | null;
  electricity_meter_transferred_with_sale?: boolean | null;
  driver_room_transferred_with_sale?: boolean | null;
  driver_room?: boolean | null;
  driver_room_number?: string | null;
  owner_association_registered?: boolean | null;
  deed_number?: string | null;
  sorting_minutes_ref?: string | null;
  sorting_minutes_pdf_url?: string | null;
  deed_pdf_url?: string | null;
  [key: string]: unknown;
}

interface Building {
  id: string;
  name?: string;
  owner_name?: string | null;
  [key: string]: unknown;
}

interface BuildingDeedsPanelProps {
  buildingId?: string;
  /** عند التوجّه من صفحة تعديل الوحدة لاستكمال نقل الملكية */
  openTransferUnitId?: string;
}

const DEEDS_BUCKET = "building-images";
const DEEDS_PATH_PREFIX = "deeds";
const SORTING_MINUTES_PATH_PREFIX = "sorting-minutes";

export default function BuildingDeedsPanel({ buildingId, openTransferUnitId }: BuildingDeedsPanelProps) {
  const router = useRouter();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(!!buildingId);
  const [error, setError] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [editForm, setEditForm] = useState({
    owner_name: "",
    deed_number: "",
    sorting_minutes_ref: "",
    electricity_meter_number: "",
    driver_room_number: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sortingMinutesPdfFile, setSortingMinutesPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewOwnerUnit, setViewOwnerUnit] = useState<Unit | null>(null);

  useEffect(() => {
    if (!buildingId) {
      setLoading(false);
      setBuilding(null);
      setUnits([]);
      return;
    }

    const fetchData = async () => {
      const supabase = createClient();
      setLoading(true);
      setError(null);
      try {
        const [buildingRes, unitsRes] = await Promise.all([
          supabase.from("buildings").select("id, name, owner_name").eq("id", buildingId).single(),
          supabase.from("units").select("*").eq("building_id", buildingId).order("floor", { ascending: true }).order("unit_number", { ascending: true }),
        ]);

        const errors: string[] = [];
        if (buildingRes.error) {
          errors.push("تعذر تحميل بيانات المبنى");
          setBuilding(null);
        } else {
          setBuilding(buildingRes.data);
        }
        if (unitsRes.error) {
          errors.push("تعذر تحميل الوحدات");
          setUnits([]);
        } else {
          const raw = unitsRes.data || [];
          const sorted = [...raw].sort((a, b) => {
            const fA = Number(a.floor) ?? 0;
            const fB = Number(b.floor) ?? 0;
            if (fA !== fB) return fA - fB;
            const uA = Number(a.unit_number) || 0;
            const uB = Number(b.unit_number) || 0;
            return uA - uB;
          });
          setUnits(sorted);
        }
        if (errors.length > 0) {
          setError(errors.join(" | "));
        }
      } catch (err) {
        setError("حدث خطأ أثناء التحميل");
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [buildingId]);

  useEffect(() => {
    if (!openTransferUnitId || !buildingId) return;
    router.replace(`/dashboard/sales?action=transfer&buildingId=${buildingId}&unitId=${openTransferUnitId}`);
  }, [openTransferUnitId, buildingId, router]);

  const statusLabel = (s?: string) => {
    if (!s) return "-";
    if (s === "available") return "متاحة";
    if (s === "reserved") return "محجوزة";
    if (s === "sold") return "مباعة";
    return s;
  };

  const openEditModal = (unit: Unit) => {
    setEditUnit(unit);
    setEditForm({
      owner_name: unit.owner_name || building?.owner_name || "",
      deed_number: unit.deed_number || "",
      sorting_minutes_ref: unit.sorting_minutes_ref || "",
      electricity_meter_number: unit.electricity_meter_number || "",
      driver_room_number: unit.driver_room_number ?? "",
    });
    setPdfFile(null);
    setSortingMinutesPdfFile(null);
    setSaveError(null);
  };

  const closeEditModal = () => {
    setEditUnit(null);
    setPdfFile(null);
    setSortingMinutesPdfFile(null);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!editUnit || !buildingId) return;

    const supabase = createClient();
    setSaving(true);
    setSaveError(null);

    try {
      let deedPdfUrl = editUnit.deed_pdf_url || null;
      let sortingMinutesPdfUrl = editUnit.sorting_minutes_pdf_url || null;

      // رفع ملف الصك PDF إذا تم اختياره
      if (pdfFile) {
        const fileExt = pdfFile.name.split(".").pop() || "pdf";
        const fileName = `${DEEDS_PATH_PREFIX}/${buildingId}/${editUnit.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from(DEEDS_BUCKET).upload(fileName, pdfFile, {
          contentType: "application/pdf",
          upsert: true,
        });

        if (uploadError) {
          setSaveError("تعذر رفع ملف الصك: " + (uploadError.message || "تأكد من صلاحيات الرفع في Supabase Storage."));
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage.from(DEEDS_BUCKET).getPublicUrl(fileName);
        deedPdfUrl = urlData.publicUrl;
      }

      // رفع ملف محضر الفرز PDF إذا تم اختياره
      if (sortingMinutesPdfFile) {
        const fileExt = sortingMinutesPdfFile.name.split(".").pop() || "pdf";
        const fileName = `${SORTING_MINUTES_PATH_PREFIX}/${buildingId}/${editUnit.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from(DEEDS_BUCKET).upload(fileName, sortingMinutesPdfFile, {
          contentType: "application/pdf",
          upsert: true,
        });

        if (uploadError) {
          setSaveError("تعذر رفع ملف محضر الفرز: " + (uploadError.message || "تأكد من صلاحيات الرفع في Supabase Storage."));
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage.from(DEEDS_BUCKET).getPublicUrl(fileName);
        sortingMinutesPdfUrl = urlData.publicUrl;
      }

      const updateData: Record<string, unknown> = {
        deed_number: editForm.deed_number || null,
        sorting_minutes_ref: editForm.sorting_minutes_ref || null,
        deed_pdf_url: deedPdfUrl,
        sorting_minutes_pdf_url: sortingMinutesPdfUrl,
      };

      const { error: updateError } = await supabase
        .from("units")
        .update(updateData)
        .eq("id", editUnit.id);

      if (updateError) {
        setSaveError("تعذر حفظ التعديلات: " + (updateError.message || "خطأ غير معروف"));
        setSaving(false);
        return;
      }

      // تحديث القائمة المحلية
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editUnit.id
            ? {
                ...u,
                deed_number: editForm.deed_number || null,
                sorting_minutes_ref: editForm.sorting_minutes_ref || null,
                deed_pdf_url: deedPdfUrl,
                sorting_minutes_pdf_url: sortingMinutesPdfUrl,
              }
            : u
        )
      );
      closeEditModal();
    } catch (err) {
      setSaveError("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (!buildingId) {
    return (
      <section className="bg-white rounded-2xl shadow-xl p-8 border border-teal-100">
        <div className="text-center py-12 text-slate-500">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-teal-300" />
          <p className="text-lg font-medium">اختر مبنى لعرض الصكوك ومحاضر الفرز</p>
          <p className="text-sm mt-2">انتقل من صفحة تفاصيل المبنى واضغط على «الصكوك ومحاضر الفرز»</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="bg-white rounded-2xl shadow-xl p-8 border border-teal-100">
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-xl p-8 border border-teal-100">
      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* عنوان المبنى */}
      <div className="mb-8 flex items-center gap-3 pb-4 border-b border-teal-100">
        <div className="flex items-center justify-center rounded-full h-14 w-14 bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
          <Building2 className="text-white text-2xl" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-teal-800">{building?.name || "المبنى"}</h2>
          <p className="text-sm text-slate-500">وحدات المبنى</p>
        </div>
      </div>

      {/* جدول الوحدات */}
      <div className="w-full min-w-0 rounded-xl border border-teal-100">
        <table className="w-full text-center border-collapse table-fixed">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[16%]" style={{ minWidth: "10ch" }} />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr className="bg-gradient-to-br from-teal-50 to-teal-100/50">
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">رقم الوحدة</th>
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">الدور</th>
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">
                <span className="inline-flex items-center justify-center gap-2">
                  <User className="w-4 h-4" />
                  اسم المالك
                </span>
              </th>
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">الحالة</th>
              <th className="p-3 pr-4 pl-2 text-teal-800 font-bold border-b border-teal-200 align-middle">
                <span className="inline-flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  رقم الصك
                </span>
              </th>
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">الصك</th>
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">محضر الفرز</th>
              <th className="p-3 text-teal-800 font-bold border-b border-teal-200 align-middle">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-teal-200" />
                  <p className="font-medium">لا توجد وحدات مسجلة لهذا المبنى</p>
                  <p className="text-sm mt-1">أضف الوحدات من صفحة إنشاء/تعديل المبنى</p>
                </td>
              </tr>
            ) : (
              units.map((unit, index) => (
                <tr key={unit.id} className="border-b border-slate-100 hover:bg-teal-50/50 transition" data-seq={index + 1}>
                  <td className="p-3 font-bold text-teal-700 align-middle">{unit.unit_number}</td>
                  <td className="p-3 text-slate-600 align-middle">{unit.floor}</td>
                  <td className="p-3 text-slate-600 align-middle">{unit.owner_name || building?.owner_name || "-"}</td>
                  <td className="p-3 align-middle">
                    <span
                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${
                        unit.status === "available"
                          ? "bg-emerald-100 text-emerald-700"
                          : unit.status === "reserved"
                          ? "bg-amber-100 text-amber-700"
                          : unit.status === "sold"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {statusLabel(unit.status)}
                    </span>
                  </td>
                  <td className="p-3 pr-4 pl-2 text-slate-600 font-mono align-middle break-all min-w-0">{unit.deed_number || "-"}</td>
                  <td className="p-3 align-middle">
                    {unit.deed_pdf_url ? (
                      <a
                        href={unit.deed_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-2 py-1 text-slate-600 hover:text-teal-600 hover:underline text-sm transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        عرض
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-3 align-middle">
                    {unit.sorting_minutes_pdf_url ? (
                      <a
                        href={unit.sorting_minutes_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-2 py-1 text-slate-600 hover:text-teal-600 hover:underline text-sm transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        عرض
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-3 align-middle">
                    <div className="flex flex-nowrap items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(unit)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-teal-600 hover:underline text-sm font-medium transition whitespace-nowrap"
                      >
                        <Pencil className="w-4 h-4" />
                        تعديل
                      </button>
                      {unit.status === "sold" && (
                        <button
                          onClick={() => setViewOwnerUnit(unit)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-teal-600 hover:underline text-sm transition whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          عرض المالك
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* مودال التعديل */}
      {editUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-teal-800">
                بيانات الصك — الوحدة {editUnit.unit_number}
              </h3>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                disabled={saving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    اسم المالك (المالك الأول للعمارة)
                  </span>
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                  {building?.owner_name || "—"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">رقم الصك</label>
                <input
                  type="text"
                  value={editForm.deed_number ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, deed_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="رقم صك الوحدة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عداد الكهرباء</label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 font-mono uppercase">
                  {(editUnit.electricity_meter_number || "").trim() || "—"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-2">
                    <FileUp className="w-4 h-4" />
                    رفع الصك بصيغة PDF
                  </span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:text-xs file:rounded-lg file:border file:border-slate-300/60 file:bg-white/40 file:backdrop-blur-sm file:text-slate-700 file:cursor-pointer hover:file:bg-white/60"
                />
                {editUnit.deed_pdf_url && !pdfFile && (
                  <p className="mt-1 text-xs text-slate-500">الملف الحالي محفوظ. اختر ملفاً جديداً لاستبداله.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-2">
                    <FileUp className="w-4 h-4" />
                    رفع محضر الفرز بصيغة PDF
                  </span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setSortingMinutesPdfFile(e.target.files?.[0] || null)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:text-xs file:rounded-lg file:border file:border-slate-300/60 file:bg-white/40 file:backdrop-blur-sm file:text-slate-700 file:cursor-pointer hover:file:bg-white/60"
                />
                {editUnit.sorting_minutes_pdf_url && !sortingMinutesPdfFile && (
                  <p className="mt-1 text-xs text-slate-500">الملف الحالي محفوظ. اختر ملفاً جديداً لاستبداله.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl font-medium hover:from-teal-600 hover:to-teal-700 disabled:opacity-60 transition"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                onClick={closeEditModal}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 disabled:opacity-60 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة بيانات المالك */}
      {viewOwnerUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 cursor-pointer" onClick={() => setViewOwnerUnit(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-teal-800">
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  بيانات المالك — الوحدة {viewOwnerUnit.unit_number}
                </span>
              </h3>
              <button onClick={() => setViewOwnerUnit(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">اسم المالك الأول</span>
                <span className="font-medium text-slate-800 text-left">{viewOwnerUnit.previous_owner_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">اسم المالك الجديد</span>
                <span className="font-medium text-slate-800 text-left">{viewOwnerUnit.owner_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">رقم جوال المالك الجديد</span>
                <span className="font-medium text-slate-800 dir-ltr text-left">{viewOwnerUnit.owner_phone || "—"}</span>
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
                <span className="text-slate-600 shrink-0">تم نقل عداد الكهرباء مع الوحدة</span>
                <span className="font-medium text-left">{viewOwnerUnit.electricity_meter_transferred_with_sale ? "نعم" : "لا"}</span>
              </div>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                <span className="text-slate-600 shrink-0">تم نقل غرفة السائق مع الوحدة</span>
                <span className="font-medium text-left">{viewOwnerUnit.driver_room_transferred_with_sale ? "نعم" : "لا"}</span>
              </div>
              {viewOwnerUnit.transfer_id_image_url && (
                <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                  <span className="text-slate-600 shrink-0">صورة الهوية</span>
                  <a
                    href={viewOwnerUnit.transfer_id_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    title="معاينة صورة الهوية"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              )}
              {viewOwnerUnit.transfer_check_image_url && (
                <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                  <span className="text-slate-600 shrink-0">
                    {viewOwnerUnit.transfer_check_amount != null ? `الشيك المصدق (${Number(viewOwnerUnit.transfer_check_amount).toLocaleString("en")} ر.س)` : "صورة الشيك المصدق"}
                  </span>
                  <a
                    href={viewOwnerUnit.transfer_check_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    title="معاينة صورة الشيك"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              )}
              <div className="pt-3 border-t border-slate-100">
                <button type="button" disabled className="w-full py-2 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium cursor-not-allowed">
                  معاينة استلام الوحدة (قريباً)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
