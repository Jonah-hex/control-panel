"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { phoneDigitsOnly, isValidPhone10Digits } from "@/lib/validation-utils";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import { formatReceiptNumberDisplay } from "@/lib/receipt-utils";
import { ArrowRightLeft, Phone, FileText } from "lucide-react";

const DEEDS_BUCKET = "building-images";
const TAX_EXEMPTION_PATH_PREFIX = "tax-exemption";
const TRANSFER_CHECK_PATH_PREFIX = "transfer-checks";
const TRANSFER_ID_IMAGE_PATH_PREFIX = "transfer-id-images";

export type TransferPaymentMethod = "cash" | "transfer" | "certified_check";

export interface TransferUnit {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number;
  status?: string;
  owner_name?: string | null;
  owner_phone?: string | null;
  tax_exemption_status?: boolean | null;
  tax_exemption_file_url?: string | null;
  transfer_check_image_url?: string | null;
  transfer_check_amount?: number | null;
  transfer_payment_method?: TransferPaymentMethod | null;
  transfer_cash_amount?: number | null;
  transfer_bank_name?: string | null;
  transfer_amount?: number | null;
  transfer_real_estate_request_no?: string | null;
  transfer_id_image_url?: string | null;
  electricity_meter_transferred_with_sale?: boolean | null;
  driver_room_transferred_with_sale?: boolean | null;
  driver_room_number?: string | null;
  [key: string]: unknown;
}

export interface TransferOwnershipFormProps {
  unit: TransferUnit;
  buildingId: string;
  buildingName: string;
  onSuccess?: () => void;
  onCancel: () => void;
  /** عرض كـ full-width (صفحة أو لوحة كبيرة) بدل مضغوط */
  compact?: boolean;
}

/** حجز نشط بعربون للوحدة (من إدارة الحجوزات) */
export interface UnitReservation {
  id: string;
  unit_id: string;
  building_id: string;
  deposit_amount: number | null;
  receipt_number: string | null;
  customer_name: string;
  customer_phone: string;
  status: string;
}

export default function TransferOwnershipForm({
  unit,
  buildingId,
  buildingName,
  onSuccess,
  onCancel,
  compact = false,
}: TransferOwnershipFormProps) {
  const [form, setForm] = useState({
    buyer_name: "",
    buyer_phone: "",
    tax_exemption: false,
    payment_methods: ["cash"] as TransferPaymentMethod[],
    cash_amount: "" as string,
    bank_name: "",
    transfer_amount: "" as string,
    check_amount: "" as string,
    real_estate_request_no: "",
    electricity_meter_transferred: false,
    driver_room_transferred: false,
  });
  const [taxExemptionFile, setTaxExemptionFile] = useState<File | null>(null);
  const [checkImageFile, setCheckImageFile] = useState<File | null>(null);
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reservation, setReservation] = useState<UnitReservation | null>(null);
  const [depositIncluded, setDepositIncluded] = useState<boolean | null>(null);
  const [depositRefundAccount, setDepositRefundAccount] = useState("");

  const fetchReservation = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("reservations")
      .select("id, unit_id, building_id, deposit_amount, receipt_number, customer_name, customer_phone, status")
      .eq("unit_id", unit.id)
      .in("status", ["active", "pending", "confirmed", "reserved"])
      .gt("deposit_amount", 0)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setReservation(data as UnitReservation);
    else setReservation(null);
  }, [unit.id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  useEffect(() => {
    const u = unit as TransferUnit & {
      transfer_check_amount?: number;
      transfer_real_estate_request_no?: string;
      transfer_payment_method?: string | null;
      transfer_cash_amount?: number;
      transfer_bank_name?: string;
      transfer_amount?: number;
    };
    const validMethods: TransferPaymentMethod[] = ["cash", "transfer", "certified_check"];
    const rawPm = (u?.transfer_payment_method ?? "").toString().trim();
    const pms: TransferPaymentMethod[] = rawPm
      ? rawPm.split(",").map((m) => m.trim().toLowerCase()).filter((m): m is TransferPaymentMethod => validMethods.includes(m as TransferPaymentMethod))
      : ["cash"];
    const hasAny = pms.length > 0 ? pms : (["cash"] as TransferPaymentMethod[]);
    setForm({
      buyer_name: unit.owner_name || "",
      buyer_phone: unit.owner_phone || "",
      tax_exemption: !!unit.tax_exemption_status,
      payment_methods: hasAny,
      cash_amount: u?.transfer_cash_amount != null ? Number(u.transfer_cash_amount).toLocaleString("en") : "",
      bank_name: u?.transfer_bank_name ?? "",
      transfer_amount: u?.transfer_amount != null ? Number(u.transfer_amount).toLocaleString("en") : "",
      check_amount: u?.transfer_check_amount != null ? Number(u.transfer_check_amount).toLocaleString("en") : "",
      real_estate_request_no: u?.transfer_real_estate_request_no ?? "",
      electricity_meter_transferred: !!(unit as TransferUnit & { electricity_meter_transferred_with_sale?: boolean }).electricity_meter_transferred_with_sale,
      driver_room_transferred:
        (unit as TransferUnit & { driver_room_transferred_with_sale?: boolean }).driver_room_transferred_with_sale != null
          ? !!(unit as TransferUnit & { driver_room_transferred_with_sale?: boolean }).driver_room_transferred_with_sale
          : !!((unit as TransferUnit).driver_room_number && String((unit as TransferUnit).driver_room_number).trim()),
    });
  }, [unit]);

  const handleSave = async () => {
    if (!form.buyer_name.trim()) return;
    const phoneVal = (form.buyer_phone ?? "").trim();
    setPhoneError(null);
    if (phoneVal && !isValidPhone10Digits(phoneVal)) {
      setPhoneError("رقم الجوال يجب أن يكون 10 أرقاماً.");
      return;
    }
    const toNum = (s: string) => (s || "").replace(/\D/g, "").length > 0 ? Number((s || "").replace(/\D/g, "")) : null;
    if (form.payment_methods.length === 0) {
      setSaveError("يرجى اختيار طريقة شراء واحدة على الأقل.");
      return;
    }
    if (form.payment_methods.includes("cash") && (toNum(form.cash_amount) == null || toNum(form.cash_amount)! <= 0)) {
      setSaveError("يرجى إدخال المبلغ (كاش).");
      return;
    }
    if (form.payment_methods.includes("transfer")) {
      if (!form.bank_name.trim()) { setSaveError("يرجى إدخال اسم البنك المحول عليه."); return; }
      if (toNum(form.transfer_amount) == null || toNum(form.transfer_amount)! <= 0) { setSaveError("يرجى إدخال مبلغ الحوالة."); return; }
    }
    if (form.payment_methods.includes("certified_check") && (toNum(form.check_amount) == null || toNum(form.check_amount)! <= 0)) {
      setSaveError("يرجى إدخال مبلغ الشيك.");
      return;
    }
    if (reservation != null && depositIncluded === null) {
      setSaveError("حدد هل العربون مشمول في مبلغ الشراء أم سيتم استرداده.");
      return;
    }
    if (reservation != null && depositIncluded === false && !depositRefundAccount.trim()) {
      setSaveError("أدخل رقم حساب المشتري لتحويل استرداد العربون.");
      return;
    }
    setSaveError(null);
    const supabase = createClient();
    setSaving(true);
    setSaveError(null);

    try {
      let taxExemptionFileUrl: string | null = unit.tax_exemption_file_url || null;
      if (taxExemptionFile) {
        const fileExt = taxExemptionFile.name.split(".").pop()?.toLowerCase() || "pdf";
        const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
        if (!allowed.includes(fileExt)) {
          setSaveError("نوع الملف غير مدعوم. استخدم PDF أو صورة.");
          setSaving(false);
          return;
        }
        const fileName = `${TAX_EXEMPTION_PATH_PREFIX}/${buildingId}/${unit.id}/${Date.now()}.${fileExt}`;
        const contentType = fileExt === "pdf" ? "application/pdf" : `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
        const { error: uploadError } = await supabase.storage.from(DEEDS_BUCKET).upload(fileName, taxExemptionFile, { contentType, upsert: true });
        if (uploadError) {
          setSaveError("تعذر رفع ملف الإعفاء.");
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(DEEDS_BUCKET).getPublicUrl(fileName);
        taxExemptionFileUrl = urlData.publicUrl;
      }

      let checkImageUrl: string | null = form.payment_methods.includes("certified_check") ? ((unit as TransferUnit & { transfer_check_image_url?: string })?.transfer_check_image_url || null) : null;
      if (form.payment_methods.includes("certified_check") && checkImageFile) {
        const ext = checkImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
        if (!allowed.includes(ext)) {
          setSaveError("نوع ملف صورة الشيك غير مدعوم.");
          setSaving(false);
          return;
        }
        const fileName = `${TRANSFER_CHECK_PATH_PREFIX}/${buildingId}/${unit.id}/${Date.now()}.${ext}`;
        const contentType = ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
        const { error: uploadErr } = await supabase.storage.from(DEEDS_BUCKET).upload(fileName, checkImageFile, { contentType, upsert: true });
        if (uploadErr) {
          setSaveError("تعذر رفع صورة الشيك.");
          setSaving(false);
          return;
        }
        const { data: checkUrlData } = supabase.storage.from(DEEDS_BUCKET).getPublicUrl(fileName);
        checkImageUrl = checkUrlData.publicUrl;
      }

      let idImageUrl: string | null = (unit as TransferUnit & { transfer_id_image_url?: string })?.transfer_id_image_url || null;
      if (idImageFile) {
        const ext = idImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
        if (!allowed.includes(ext)) {
          setSaveError("نوع ملف صورة الهوية غير مدعوم.");
          setSaving(false);
          return;
        }
        const fileName = `${TRANSFER_ID_IMAGE_PATH_PREFIX}/${buildingId}/${unit.id}/${Date.now()}.${ext}`;
        const contentType = ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
        const { error: uploadErr } = await supabase.storage.from(DEEDS_BUCKET).upload(fileName, idImageFile, { contentType, upsert: true });
        if (uploadErr) {
          setSaveError("تعذر رفع صورة الهوية.");
          setSaving(false);
          return;
        }
        const { data: idUrlData } = supabase.storage.from(DEEDS_BUCKET).getPublicUrl(fileName);
        idImageUrl = idUrlData.publicUrl;
      }

      const toNum = (s: string) => {
        const d = (s || "").replace(/\D/g, "");
        return d.length > 0 ? Number(d) : null;
      };
      const cashNum = form.payment_methods.includes("cash") ? toNum(form.cash_amount) : null;
      const transferNum = form.payment_methods.includes("transfer") ? toNum(form.transfer_amount) : null;
      const checkNum = form.payment_methods.includes("certified_check") ? toNum(form.check_amount) : null;
      const salePrice = (cashNum ?? 0) + (transferNum ?? 0) + (checkNum ?? 0);
      const paymentMethodStorage = form.payment_methods.join(",");

      const updateData: Record<string, unknown> = {
        status: "sold",
        previous_owner_name: unit.owner_name || null,
        owner_name: form.buyer_name.trim(),
        owner_phone: phoneVal ? phoneDigitsOnly(phoneVal) : null,
        tax_exemption_status: form.tax_exemption,
        tax_exemption_file_url: form.tax_exemption ? taxExemptionFileUrl : null,
        transfer_payment_method: paymentMethodStorage,
        transfer_cash_amount: form.payment_methods.includes("cash") && cashNum != null ? cashNum : null,
        transfer_bank_name: form.payment_methods.includes("transfer") ? (form.bank_name.trim() || null) : null,
        transfer_amount: form.payment_methods.includes("transfer") && transferNum != null ? transferNum : null,
        transfer_check_image_url: form.payment_methods.includes("certified_check") ? checkImageUrl : null,
        transfer_check_amount: form.payment_methods.includes("certified_check") && checkNum != null ? checkNum : null,
        transfer_real_estate_request_no: form.real_estate_request_no.trim() || null,
        transfer_id_image_url: idImageUrl,
        electricity_meter_transferred_with_sale: form.electricity_meter_transferred,
        driver_room_transferred_with_sale: form.driver_room_transferred,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase.from("units").update(updateData).eq("id", unit.id);
      if (updateError) {
        setSaveError("تعذر حفظ نقل الملكية: " + (updateError.message || "خطأ غير معروف"));
        setSaving(false);
        return;
      }

      const { data: saleRow, error: saleError } = await supabase
        .from("sales")
        .insert({
          unit_id: unit.id,
          building_id: buildingId,
          buyer_name: form.buyer_name.trim(),
          buyer_email: null,
          buyer_phone: phoneVal || null,
          sale_date: new Date().toISOString(),
          sale_price: salePrice,
          payment_method: paymentMethodStorage,
          bank_name: form.payment_methods.includes("transfer") ? (form.bank_name.trim() || null) : null,
          down_payment: null,
          remaining_payment: null,
          payment_status: "completed",
          notes: "نقل الملكية — إدارة المبيعات",
        })
        .select("id")
        .single();
      if (saleError || !saleRow?.id) {
        setSaveError("تعذر تسجيل عملية البيع.");
        setSaving(false);
        return;
      }

      if (reservation != null && depositIncluded !== null) {
        await supabase
          .from("reservations")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            sale_id: saleRow.id,
            deposit_settlement_type: depositIncluded ? "included" : "refund",
            customer_iban_or_account: depositIncluded ? undefined : (depositRefundAccount.trim() || null),
            updated_at: new Date().toISOString(),
          })
          .eq("id", reservation.id);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const createdByName = (user?.user_metadata?.full_name as string)?.trim() || user?.email || "النظام";
      await supabase.from("activity_logs").insert({
        user_id: user?.id ?? null,
        action_type: "ownership_transferred",
        action_description: `نقل ملكية الوحدة ${unit.unit_number} (دور ${unit.floor}) إلى ${form.buyer_name.trim()} — عمارة ${buildingName}`,
        metadata: {
          building_id: buildingId,
          building_name: buildingName,
          unit_id: unit.id,
          unit_number: unit.unit_number,
          floor: unit.floor,
          buyer_name: form.buyer_name.trim(),
          created_by_name: createdByName,
        },
      });

      showToast("تم إتمام نقل الملكية بنجاح");
      setConfirmOpen(false);
      onSuccess?.();
    } catch (err) {
      setSaveError("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const fileInputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:text-xs file:rounded-lg file:border file:border-slate-300/60 file:bg-white/40 file:backdrop-blur-sm file:text-slate-700 file:cursor-pointer hover:file:bg-white/60";

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-600" />
            إتمام نقل الملكية — الوحدة {unit.unit_number} · عمارة {buildingName}
          </h3>
          {unit.status !== "sold" && (
            <p className="text-sm text-slate-500 mt-1">أضف بيانات المشتري واضغط حفظ لتسجيل الوحدة مباعة.</p>
          )}
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{saveError}</div>
      )}

      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">اسم المشتري الجديد</label>
          <input
            type="text"
            value={form.buyer_name}
            onChange={(e) => setForm((p) => ({ ...p, buyer_name: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="اسم المشتري"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            رقم الجوال
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={form.buyer_phone}
            onChange={(e) => {
              setForm((p) => ({ ...p, buyer_phone: phoneDigitsOnly(e.target.value) }));
              setPhoneError(null);
            }}
            className={`w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 ${phoneError ? "border-red-400 bg-red-50/50" : "border-slate-200"}`}
            placeholder="05xxxxxxxx"
          />
          {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">رقم طلب التصرفات العقارية</label>
        <input
          type="text"
          value={form.real_estate_request_no}
          onChange={(e) => setForm((p) => ({ ...p, real_estate_request_no: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="رقم الطلب"
        />
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
        <label className="block text-sm font-semibold text-slate-800">طريقة الشراء</label>
        <p className="text-xs text-slate-500 mb-2">يمكن اختيار طريقة واحدة أو أكثر (مثلاً: كاش + تحويل)</p>
        <div className="flex flex-wrap gap-3">
          {(["cash", "transfer", "certified_check"] as const).map((method) => {
            const isChecked = form.payment_methods.includes(method);
            return (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    setForm((p) => {
                      const next = isChecked ? p.payment_methods.filter((m) => m !== method) : [...p.payment_methods, method];
                      return { ...p, payment_methods: next };
                    });
                  }}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  {method === "cash" ? "كاش" : method === "transfer" ? "تحويل" : "شيك مصدق"}
                </span>
              </label>
            );
          })}
        </div>

        {form.payment_methods.includes("cash") && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ (كاش)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.cash_amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setForm((p) => ({ ...p, cash_amount: raw === "" ? "" : Number(raw).toLocaleString("en") }));
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="المبلغ"
            />
          </div>
        )}

        {form.payment_methods.includes("transfer") && (
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم البنك المحول عليه</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="اسم البنك"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ الحوالة</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.transfer_amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm((p) => ({ ...p, transfer_amount: raw === "" ? "" : Number(raw).toLocaleString("en") }));
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="مبلغ الحوالة"
              />
            </div>
          </div>
        )}

        {form.payment_methods.includes("certified_check") && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ الشيك</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.check_amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setForm((p) => ({ ...p, check_amount: raw === "" ? "" : Number(raw).toLocaleString("en") }));
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="مبلغ الشيك"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">إرفاق صورة الشيك</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(e) => setCheckImageFile(e.target.files?.[0] || null)} className={fileInputClass} />
            </div>
          </>
        )}
      </div>

      {reservation != null && (reservation.deposit_amount == null || Number(reservation.deposit_amount) > 0) && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-800">الوحدة محجوزة بعربون (إدارة الحجوزات)</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 text-sm">سند العربون:</span>
            <Link
              href={`/dashboard/reservations?previewReceipt=${reservation.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-800 font-medium text-sm"
            >
              <FileText className="w-4 h-4" />
              معاينة سند العربون
              {reservation.receipt_number ? ` — ${formatReceiptNumberDisplay(reservation.receipt_number)}` : ""}
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            مبلغ العربون: {reservation.deposit_amount != null ? Number(reservation.deposit_amount).toLocaleString("ar-SA") : "—"} ريال
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">هل يشمل العربون مبلغ الشراء؟</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deposit_included"
                  checked={depositIncluded === true}
                  onChange={() => setDepositIncluded(true)}
                  className="rounded-full border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">نعم — مشمول في المبلغ (يظهر في إدارة الحجوزات: تم المخالصة)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deposit_included"
                  checked={depositIncluded === false}
                  onChange={() => setDepositIncluded(false)}
                  className="rounded-full border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">لا — استرداد (يظهر: تم مخالصة الاسترداد)</span>
              </label>
            </div>
          </div>
          {depositIncluded === false && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم حساب المشتري لتحويل العربون (استرداد)</label>
              <input
                type="text"
                value={depositRefundAccount}
                onChange={(e) => setDepositRefundAccount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="IBAN أو رقم الحساب"
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">إرفاق صورة الهوية</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(e) => setIdImageFile(e.target.files?.[0] || null)} className={fileInputClass} />
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.tax_exemption} onChange={(e) => setForm((p) => ({ ...p, tax_exemption: e.target.checked }))} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
          <span className="text-sm font-medium text-slate-700">يوجد إعفاء ضريبي</span>
        </label>
        {form.tax_exemption && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">إرفاق صورة أو PDF للإعفاء</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(e) => setTaxExemptionFile(e.target.files?.[0] || null)} className={fileInputClass} />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.electricity_meter_transferred} onChange={(e) => setForm((p) => ({ ...p, electricity_meter_transferred: e.target.checked }))} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
          <span className="text-sm font-medium text-slate-700">تم نقل عداد الكهرباء مع الوحدة</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.driver_room_transferred} onChange={(e) => setForm((p) => ({ ...p, driver_room_transferred: e.target.checked }))} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
          <span className="text-sm font-medium text-slate-700">تم نقل غرفة السائق مع الوحدة</span>
        </label>
        {unit.driver_room_number && String(unit.driver_room_number).trim() ? (
          <p className="text-sm text-teal-700">الوحدة مسجلة بغرفة سائق في النظام.</p>
        ) : (
          <p className="text-sm text-amber-800 font-medium">الوحدة غير مسجلة بغرفة سائق — يمكن التحديد يدوياً أو إضافتها من تعديل الوحدة.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => form.buyer_name.trim() && !saving && setConfirmOpen(true)}
          disabled={saving || !form.buyer_name.trim()}
          className="px-5 py-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition"
        >
          {saving ? "جاري الحفظ..." : "حفظ — وتسجيل الوحدة مباعة"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 disabled:opacity-60 transition">
          إلغاء
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-700 text-center mb-6">
              عملية نقل الملكية تعتبر نقل تام لمالك الوحدة، وتسجل حالة الوحدة <strong>مباعة بالنظام</strong>. هل تريد المتابعة؟
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setConfirmOpen(false); handleSave(); }} disabled={saving} className="px-5 py-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition">
                تأكيد وإتمام النقل
              </button>
              <button onClick={() => setConfirmOpen(false)} disabled={saving} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 disabled:opacity-60 transition">
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
