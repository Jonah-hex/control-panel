"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { phoneDigitsOnly, isValidPhone10Digits } from "@/lib/validation-utils";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import { formatReceiptNumberDisplay } from "@/lib/receipt-utils";
import { ArrowRightLeft, Phone, FileText, X, Receipt } from "lucide-react";

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
  transfer_check_bank_name?: string | null;
  transfer_check_number?: string | null;
  transfer_payment_method?: TransferPaymentMethod | null;
  transfer_cash_amount?: number | null;
  transfer_bank_name?: string | null;
  transfer_amount?: number | null;
  transfer_reference_number?: string | null;
  transfer_real_estate_request_no?: string | null;
  transfer_id_image_url?: string | null;
  electricity_meter_transferred_with_sale?: boolean | null;
  driver_room_transferred_with_sale?: boolean | null;
  driver_room_number?: string | null;
  price?: number | null;
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
  marketer_name?: string | null;
  marketer_phone?: string | null;
  customer_iban_or_account?: string | null;
  customer_bank_name?: string | null;
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
    transfer_reference: "",
    check_amount: "" as string,
    check_bank_name: "",
    check_number: "",
    commission_amount: "" as string,
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
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchReservation = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("reservations")
      .select("id, unit_id, building_id, deposit_amount, receipt_number, customer_name, customer_phone, marketer_name, marketer_phone, customer_iban_or_account, customer_bank_name, status")
      .eq("unit_id", unit.id)
      .in("status", ["active", "pending", "confirmed", "reserved"])
      .gt("deposit_amount", 0)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setReservation(data as UnitReservation);
      const r = data as UnitReservation;
      if (r.customer_iban_or_account?.trim()) setDepositRefundAccount(r.customer_iban_or_account.trim());
    } else {
      setReservation(null);
    }
  }, [unit.id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  useEffect(() => {
    const u = unit as TransferUnit & {
      transfer_check_amount?: number;
      transfer_check_bank_name?: string;
      transfer_real_estate_request_no?: string;
      transfer_payment_method?: string | null;
      transfer_cash_amount?: number;
      transfer_bank_name?: string;
      transfer_amount?: number;
      transfer_reference_number?: string;
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
      transfer_reference: u?.transfer_reference_number ?? "",
      check_amount: u?.transfer_check_amount != null ? Number(u.transfer_check_amount).toLocaleString("en") : "",
      check_bank_name: u?.transfer_check_bank_name ?? "",
      check_number: u?.transfer_check_number ?? "",
      commission_amount: "",
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
      const commissionNum = toNum(form.commission_amount);
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
        transfer_reference_number: form.payment_methods.includes("transfer") ? (form.transfer_reference.trim() || null) : null,
        transfer_check_image_url: form.payment_methods.includes("certified_check") ? checkImageUrl : null,
        transfer_check_amount: form.payment_methods.includes("certified_check") && checkNum != null ? checkNum : null,
        transfer_check_bank_name: form.payment_methods.includes("certified_check") ? (form.check_bank_name.trim() || null) : null,
        transfer_check_number: form.payment_methods.includes("certified_check") ? (form.check_number.trim() || null) : null,
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
          commission_amount: commissionNum,
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
    <div className={compact ? "space-y-5" : "space-y-6"}>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-l from-amber-50/80 to-slate-50/80 border border-amber-100/80">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <ArrowRightLeft className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">الوحدة {unit.unit_number} · {buildingName}</p>
          {(unit.price != null && Number(unit.price) > 0) && (
            <p className="text-sm font-medium text-amber-800/90 mt-0.5 dir-ltr">سعر الوحدة: {Number(unit.price).toLocaleString("en")} ر.س</p>
          )}
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{saveError}</div>
      )}

      <section>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">بيانات المشتري</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">رقم طلب التصرفات العقارية</label>
        <input
          type="text"
          value={form.real_estate_request_no}
          onChange={(e) => setForm((p) => ({ ...p, real_estate_request_no: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="رقم الطلب"
        />
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">طريقة الدفع</h4>
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
        <label className="block text-sm font-semibold text-slate-800">طريقة الشراء</label>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم البنك</label>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم الحوالة</label>
              <input
                type="text"
                value={form.transfer_reference}
                onChange={(e) => setForm((p) => ({ ...p, transfer_reference: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="رقم الحوالة"
              />
            </div>
          </div>
        )}

        {form.payment_methods.includes("certified_check") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">إرفاق صورة الشيك</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(e) => setCheckImageFile(e.target.files?.[0] || null)} className={fileInputClass} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم البنك</label>
                <input
                  type="text"
                  value={form.check_bank_name}
                  onChange={(e) => setForm((p) => ({ ...p, check_bank_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="اسم البنك"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">رقم الشيك</label>
                <input
                  type="text"
                  value={form.check_number}
                  onChange={(e) => setForm((p) => ({ ...p, check_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="رقم الشيك"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      </section>

      {reservation != null && (reservation.deposit_amount == null || Number(reservation.deposit_amount) > 0) && (
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">الحجز والعربون</h4>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">سند العربون</label>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="inline-flex items-center gap-2 text-slate-700 hover:text-amber-600 font-medium text-sm transition"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  معاينة سند العربون
                  {reservation.receipt_number ? ` (${formatReceiptNumberDisplay(reservation.receipt_number)})` : ""}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">مبلغ العربون</label>
                <p className="text-sm font-semibold text-slate-800 dir-ltr">{reservation.deposit_amount != null ? Number(reservation.deposit_amount).toLocaleString("en") : "—"} ر.س</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/80">
              <label className="block text-sm font-medium text-slate-700 mb-3">هل يشمل العربون مبلغ الشراء؟</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deposit_included"
                    checked={depositIncluded === true}
                    onChange={() => setDepositIncluded(true)}
                    className="rounded-full border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">نعم — مشمول في المبلغ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deposit_included"
                    checked={depositIncluded === false}
                    onChange={() => setDepositIncluded(false)}
                    className="rounded-full border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">لا — استرداد</span>
                </label>
              </div>
            </div>
            {depositIncluded === false && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">رقم حساب المشتري لتحويل العربون (استرداد)</label>
                <input
                  type="text"
                  value={depositRefundAccount}
                  onChange={(e) => setDepositRefundAccount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="IBAN أو رقم الحساب"
                />
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">المسوق والعمولة</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">اسم المسوق</label>
          <div className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-700 text-sm min-h-[42px] flex items-center">
            {reservation?.marketer_name?.trim() || "—"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">رقم المسوق</label>
          <div className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-700 text-sm min-h-[42px] flex items-center dir-ltr">
            {reservation?.marketer_phone?.trim() || "—"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">عمولة البيع</label>
          <input
            type="text"
            inputMode="decimal"
            value={form.commission_amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setForm((p) => ({ ...p, commission_amount: raw === "" ? "" : Number(raw).toLocaleString("en") }));
            }}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="العمولة"
          />
        </div>
      </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">المرفقات</h4>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">صورة هوية العميل</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                onChange={(e) => setIdImageFile(e.target.files?.[0] || null)}
                className={`${fileInputClass} w-full max-w-full`}
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="tax-exemption-cb" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input
                  id="tax-exemption-cb"
                  type="checkbox"
                  checked={!!form.tax_exemption}
                  onChange={(e) => setForm((p) => ({ ...p, tax_exemption: e.target.checked }))}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                يوجد إعفاء ضريبي
              </label>
              {form.tax_exemption ? (
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                  onChange={(e) => setTaxExemptionFile(e.target.files?.[0] || null)}
                  className={`${fileInputClass} w-full max-w-full`}
                />
              ) : (
                <div className="w-full rounded-xl border border-slate-200 px-4 py-2.5 flex items-center justify-center text-sm text-slate-500 bg-slate-50/50">لا يوجد إعفاء ضريبي</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">تفاصيل إضافية</h4>
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.electricity_meter_transferred} onChange={(e) => setForm((p) => ({ ...p, electricity_meter_transferred: e.target.checked }))} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
          <span className="text-sm font-medium text-slate-700">نقل عداد الكهرباء مع الوحدة</span>
        </label>
        {unit.driver_room_number && String(unit.driver_room_number).trim() ? (
          <>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.driver_room_transferred} onChange={(e) => setForm((p) => ({ ...p, driver_room_transferred: e.target.checked }))} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
              <span className="text-sm font-medium text-slate-700">نقل غرفة السائق مع الوحدة</span>
            </label>
            <p className="text-sm text-slate-500">الوحدة مسجلة بغرفة سائق في النظام.</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">الوحدة غير مسجلة بغرفة سائق.</p>
        )}
      </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
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

      {showReceiptModal && reservation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowReceiptModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-[420px] p-6" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                سند عربون حجز
              </h3>
              <button type="button" onClick={() => setShowReceiptModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border-b-2 border-slate-700 pb-3 mb-4">
              <h1 className="text-xl font-bold text-slate-800">سند عربون حجز</h1>
            </div>
            <table className="w-full text-sm border-collapse">
              <tbody className="[&>tr]:border-b [&>tr]:border-slate-100">
                <tr><td className="py-2 text-slate-500 w-32">رقم السند</td><td className="py-2 font-mono font-semibold">{formatReceiptNumberDisplay(reservation.receipt_number)}</td></tr>
                <tr><td className="py-2 text-slate-500">الوحدة</td><td className="py-2">وحدة {unit.unit_number} — الطابق {unit.floor}</td></tr>
                <tr><td className="py-2 text-slate-500">العمارة</td><td className="py-2">{buildingName}</td></tr>
                <tr><td className="py-2 text-slate-500">العميل</td><td className="py-2">{reservation.customer_name} — <span className="dir-ltr">{reservation.customer_phone}</span></td></tr>
                <tr><td className="py-2 text-slate-500">مبلغ العربون</td><td className="py-2">{reservation.deposit_amount != null ? `${Number(reservation.deposit_amount).toLocaleString("en")} ر.س` : "—"}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
