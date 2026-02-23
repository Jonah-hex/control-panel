"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Zap, Building2, Pencil, X, FileUp, ExternalLink, User, ArrowRightLeft, Eye, Phone } from "lucide-react";

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
  deed_number?: string | null;
  sorting_minutes_ref?: string | null;
  sorting_minutes_pdf_url?: string | null;
  deed_pdf_url?: string | null;
  [key: string]: unknown;
}

interface Building {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface BuildingDeedsPanelProps {
  buildingId?: string;
}

const DEEDS_BUCKET = "building-images";
const DEEDS_PATH_PREFIX = "deeds";
const SORTING_MINUTES_PATH_PREFIX = "sorting-minutes";
const TAX_EXEMPTION_PATH_PREFIX = "tax-exemption";

export default function BuildingDeedsPanel({ buildingId }: BuildingDeedsPanelProps) {
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
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sortingMinutesPdfFile, setSortingMinutesPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [transferUnit, setTransferUnit] = useState<Unit | null>(null);
  const [transferForm, setTransferForm] = useState({
    buyer_name: "",
    buyer_phone: "",
    tax_exemption: false,
  });
  const [taxExemptionFile, setTaxExemptionFile] = useState<File | null>(null);
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
          supabase.from("buildings").select("id, name").eq("id", buildingId).single(),
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
      owner_name: unit.owner_name || "",
      deed_number: unit.deed_number || "",
      sorting_minutes_ref: unit.sorting_minutes_ref || "",
      electricity_meter_number: unit.electricity_meter_number || "",
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

  const openTransferModal = (unit: Unit) => {
    setTransferUnit(unit);
    setTransferForm({
      buyer_name: unit.owner_name || "",
      buyer_phone: unit.owner_phone || "",
      tax_exemption: !!unit.tax_exemption_status,
    });
    setTaxExemptionFile(null);
    setSaveError(null);
  };

  const closeTransferModal = () => {
    setTransferUnit(null);
    setTransferForm({ buyer_name: "", buyer_phone: "", tax_exemption: false });
    setTaxExemptionFile(null);
    setSaveError(null);
  };

  const handleSaveTransfer = async () => {
    if (!transferUnit || !buildingId || !transferForm.buyer_name.trim()) return;
    const supabase = createClient();
    setSaving(true);
    setSaveError(null);

    try {
      let taxExemptionFileUrl: string | null = transferUnit.tax_exemption_file_url || null;
      if (taxExemptionFile) {
        const fileExt = taxExemptionFile.name.split(".").pop()?.toLowerCase() || "pdf";
        const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
        if (!allowed.includes(fileExt)) {
          setSaveError("نوع الملف غير مدعوم. استخدم PDF أو صورة (jpg, png, webp).");
          setSaving(false);
          return;
        }
        const fileName = `${TAX_EXEMPTION_PATH_PREFIX}/${buildingId}/${transferUnit.id}/${Date.now()}.${fileExt}`;
        const contentType = fileExt === "pdf" ? "application/pdf" : `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

        const { error: uploadError } = await supabase.storage.from(DEEDS_BUCKET).upload(fileName, taxExemptionFile, {
          contentType,
          upsert: true,
        });

        if (uploadError) {
          setSaveError("تعذر رفع ملف الإعفاء: " + (uploadError.message || "تأكد من صلاحيات الرفع."));
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(DEEDS_BUCKET).getPublicUrl(fileName);
        taxExemptionFileUrl = urlData.publicUrl;
      }

      const updateData: Record<string, unknown> = {
        status: "sold",
        previous_owner_name: transferUnit.owner_name || null,
        owner_name: transferForm.buyer_name.trim(),
        owner_phone: transferForm.buyer_phone.trim() || null,
        tax_exemption_status: transferForm.tax_exemption,
        tax_exemption_file_url: transferForm.tax_exemption ? taxExemptionFileUrl : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase.from("units").update(updateData).eq("id", transferUnit.id);

      if (updateError) {
        setSaveError("تعذر حفظ نقل الملكية: " + (updateError.message || "خطأ غير معروف"));
        setSaving(false);
        return;
      }

      setUnits((prev) =>
        prev.map((u) =>
          u.id === transferUnit.id
            ? {
                ...u,
                status: "sold",
                previous_owner_name: transferUnit.owner_name || null,
                owner_name: transferForm.buyer_name.trim(),
                owner_phone: transferForm.buyer_phone.trim() || null,
                tax_exemption_status: transferForm.tax_exemption,
                tax_exemption_file_url: transferForm.tax_exemption ? taxExemptionFileUrl : null,
              }
            : u
        )
      );

      closeTransferModal();
    } catch (err) {
      setSaveError("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setSaving(false);
    }
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
        owner_name: editForm.owner_name || null,
        deed_number: editForm.deed_number || null,
        sorting_minutes_ref: editForm.sorting_minutes_ref || null,
        electricity_meter_number: editForm.electricity_meter_number || null,
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
                owner_name: editForm.owner_name || null,
                deed_number: editForm.deed_number || null,
                sorting_minutes_ref: editForm.sorting_minutes_ref || null,
                electricity_meter_number: editForm.electricity_meter_number || null,
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
          <p className="text-sm text-slate-500">وحدات المبنى — الصكوك ومحاضر الفرز وعدادات الكهرباء</p>
        </div>
      </div>

      {/* جدول الوحدات */}
      <div className="w-full min-w-0 rounded-xl border border-teal-100">
        <table className="w-full text-center border-collapse table-fixed">
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[5%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" style={{ minWidth: "10ch" }} />
            <col className="w-[17%]" style={{ minWidth: "12ch" }} />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" />
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
              <th className="p-3 pl-4 pr-2 text-teal-800 font-bold border-b border-teal-200 align-middle">
                <span className="inline-flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  عداد الكهرباء
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
                <td colSpan={9} className="text-center py-12 text-slate-500">
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
                  <td className="p-3 text-slate-600 align-middle">{unit.owner_name || "-"}</td>
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
                  <td className="p-3 pl-4 pr-2 text-slate-600 font-mono align-middle break-all min-w-0">{unit.electricity_meter_number || "-"}</td>
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
                      {unit.status === "sold" && (
                        <button
                          onClick={() => setViewOwnerUnit(unit)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-teal-600 hover:underline text-sm transition whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          عرض المالك
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(unit)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-teal-600 hover:underline text-sm font-medium transition whitespace-nowrap"
                      >
                        <Pencil className="w-4 h-4" />
                        تعديل
                      </button>
                      {unit.status !== "sold" && (
                        <button
                          onClick={() => openTransferModal(unit)}
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-teal-600 hover:underline text-sm font-medium transition whitespace-nowrap"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          نقل ملكية
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
                تعديل بيانات الصك — الوحدة {editUnit.unit_number}
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
                    اسم المالك
                  </span>
                </label>
                <input
                  type="text"
                  value={editForm.owner_name ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, owner_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="اسم مالك الوحدة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">رقم الصك</label>
                <input
                  type="text"
                  value={editForm.deed_number ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, deed_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="رقم الصك الرسمي"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عداد الكهرباء</label>
                <input
                  type="text"
                  value={editForm.electricity_meter_number ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, electricity_meter_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="رقم العداد"
                />
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-100 file:text-teal-700 file:cursor-pointer"
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-700 file:cursor-pointer"
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

      {/* مودال نقل الملكية */}
      {transferUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-teal-800">
                <span className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  نقل ملكية — الوحدة {transferUnit.unit_number}
                </span>
              </h3>
              <button onClick={closeTransferModal} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" disabled={saving}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{saveError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم المشتري الجديد</label>
                <input
                  type="text"
                  value={transferForm.buyer_name ?? ""}
                  onChange={(e) => setTransferForm((p) => ({ ...p, buyer_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500"
                  placeholder="اسم المشتري"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الجوال
                  </span>
                </label>
                <input
                  type="tel"
                  value={transferForm.buyer_phone ?? ""}
                  onChange={(e) => setTransferForm((p) => ({ ...p, buyer_phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500"
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!transferForm.tax_exemption}
                    onChange={(e) => setTransferForm((p) => ({ ...p, tax_exemption: e.target.checked }))}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-700">يوجد إعفاء ضريبي</span>
                </label>
              </div>
              {transferForm.tax_exemption && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">إرفاق صورة أو PDF للإعفاء</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    onChange={(e) => setTaxExemptionFile(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-700 file:cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveTransfer}
                disabled={saving || !transferForm.buyer_name.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition"
              >
                {saving ? "جاري الحفظ..." : "حفظ — وتغيير الحالة إلى مباعة"}
              </button>
              <button
                onClick={closeTransferModal}
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
                <span className="font-medium text-left">{viewOwnerUnit.tax_exemption_status ? "نعم" : "لا"}</span>
              </div>
              {viewOwnerUnit.tax_exemption_file_url && (
                <div className="pt-2">
                  <a
                    href={viewOwnerUnit.tax_exemption_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 hover:underline text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    عرض ملف الإعفاء
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400 text-center" style={{ boxShadow: "0px 4px 12px 0px rgba(0, 0, 0, 0.15)" }}>
        «تعديل»: إضافة أو تعديل رقم الصك ومحضر الفرز ورفع ملفات PDF. «نقل ملكية»: تسجيل المشتري الجديد وتغيير حالة الوحدة إلى مباعة.
      </p>
    </section>
  );
}
