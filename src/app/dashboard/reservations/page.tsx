"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import { phoneDigitsOnly, isValidPhone10Digits } from "@/lib/validation-utils";
import { generateReceiptNumber, formatReceiptNumberDisplay } from "@/lib/receipt-utils";
import {
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  FileText,
  X,
  Plus,
  Sparkles,
  AlertTriangle,
  Receipt,
  Printer,
  Search,
  RotateCcw,
} from "lucide-react";

type ReservationStatus = "active" | "cancelled" | "completed" | "pending" | "confirmed" | "reserved";

interface UnitRow {
  unit_number: string;
  floor: number | string;
}

interface BuildingRow {
  name: string;
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  reservation_date: string;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_date: string | null;
  created_at: string;
  updated_at: string;
  unit_id: string;
  building_id: string;
  marketer_id?: string | null;
  marketer_name: string | null;
  marketer_phone: string | null;
  receipt_number: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  sale_id: string | null;
  deposit_settlement_type?: string | null;
  customer_iban_or_account?: string | null;
  customer_bank_name?: string | null;
  deposit_refunded?: boolean | null;
  deposit_refunded_at?: string | null;
  deposit_refund_method?: string | null;
  units?: UnitRow | null;
  buildings?: BuildingRow | null;
  /** علاقة PostgREST قد تُرجع باسم unit / building (مفرد) */
  unit?: UnitRow | null;
  building?: BuildingRow | null;
}

interface Building {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number | string;
  status: string;
}

/** لوجو البلادي — للطباعة على سند العربون (أيقونة عمارات + الاسم + الشعار) */
function ReceiptLogo() {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="36" viewBox="0 0 100 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="8" y="20" width="14" height="16" fill="#b8860b" />
        <rect x="28" y="12" width="14" height="24" fill="#c9a227" />
        <rect x="48" y="6" width="14" height="30" fill="#b8860b" />
      </svg>
      <span className="text-lg font-bold text-[#1e3a5f]">البلادي</span>
      <span className="text-xs text-slate-500">للتمليك والإستثمار العقاري</span>
    </div>
  );
}

/** استخراج بيانات الوحدة من الحجز (يدعم units أو unit حسب schema) */
function getUnit(r: Reservation): UnitRow | null {
  return (r.units ?? r.unit) ?? null;
}
/** استخراج بيانات العمارة من الحجز (يدعم buildings أو building) */
function getBuilding(r: Reservation): BuildingRow | null {
  return (r.buildings ?? r.building) ?? null;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\p{L}\p{N}\s\-/:]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateSearchTokens(value: string | null): string[] {
  if (!value) return [];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return [value];
  const iso = date.toISOString().slice(0, 10);
  const gb = date.toLocaleDateString("en-GB");
  const ar = date.toLocaleDateString("ar-SA");
  const readable = date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  return [iso, gb, ar, readable];
}

/** رمز الريال السعودي الجديد */
const RIYAL_SYMBOL = "\uFDFC";

const STATUS_LABEL: Record<string, string> = {
  active: "قيد الحجز",
  pending: "قيد الحجز",
  confirmed: "قيد الحجز",
  reserved: "قيد الحجز",
  cancelled: "حجز ملغي",
  completed: "تم البيع",
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateSearchQuery, setDateSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState<Reservation | null>(null);
  const [refundOpen, setRefundOpen] = useState<Reservation | null>(null);
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("cash");
  const [refundBankName, setRefundBankName] = useState("");
  const [refundIban, setRefundIban] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<Reservation | null>(null);
  const [expiringSlideIndex, setExpiringSlideIndex] = useState(0);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    building_id: "",
    unit_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    marketer_name: "",
    marketer_phone: "",
    deposit_amount: "",
    deposit_paid: false,
    expiry_days: "7",
    customer_iban_or_account: "",
    customer_bank_name: "",
    notes: "",
  });

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildingIdFromUrl = searchParams.get("buildingId") || "";
  const { can, ready, effectiveOwnerId } = useDashboardAuth();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  };

  const isActive = (r: Reservation) =>
    r.status === "active" || r.status === "pending" || r.status === "confirmed" || r.status === "reserved";

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    // إلغاء تلقائي للحجوزات التي تجاوزت تاريخ الانتهاء (اقصى صلاحية 7 أيام أو حسب المُدخل)
    const nowIso = new Date().toISOString();
    const { data: expiredRows } = await supabase
      .from("reservations")
      .select("id, unit_id")
      .in("status", ["active", "pending", "confirmed", "reserved"])
      .lt("expiry_date", nowIso);
    if (expiredRows?.length) {
      for (const row of expiredRows) {
        await supabase.from("reservations").update({ status: "cancelled", cancelled_at: nowIso, updated_at: nowIso }).eq("id", row.id);
        if (row.unit_id) await supabase.from("units").update({ status: "available", updated_at: nowIso }).eq("id", row.unit_id);
      }
    }
    const baseCols = `id, customer_name, customer_email, customer_phone, reservation_date, expiry_date, status, notes,
         deposit_amount, deposit_paid, deposit_paid_date, created_at, updated_at, unit_id, building_id,
         marketer_id, marketer_name, marketer_phone, receipt_number, cancellation_reason, cancelled_at, completed_at, sale_id,
         customer_iban_or_account, customer_bank_name, deposit_settlement_type, deposit_refunded, deposit_refunded_at, deposit_refund_method`;
    const { data: dataWithRels, error: errRels } = await supabase
      .from("reservations")
      .select(`${baseCols}, unit(unit_number, floor), building(name)`)
      .order("created_at", { ascending: false });
    if (!errRels && dataWithRels != null) {
      const normalized = (Array.isArray(dataWithRels) ? dataWithRels : []).map((r: Record<string, unknown>) => {
        const unit = r.unit;
        const building = r.building;
        const unitRow = Array.isArray(unit) ? unit[0] : unit;
        const buildingRow = Array.isArray(building) ? building[0] : building;
        return { ...r, unit: unitRow ?? null, building: buildingRow ?? null } as Reservation;
      });
      setReservations(normalized);
      setLoading(false);
      return;
    }
    const { data: dataFlat, error: errFlat } = await supabase
      .from("reservations")
      .select(baseCols)
      .order("created_at", { ascending: false });
    if (errFlat || !dataFlat?.length) {
      if (errFlat) showToast(errFlat.message || "فشل تحميل الحجوزات", "error");
      setReservations(errFlat ? [] : (dataFlat as Reservation[]) || []);
      setLoading(false);
      return;
    }
    const flat = dataFlat as Reservation[];
    const unitIds = [...new Set(flat.map((r) => r.unit_id).filter(Boolean))];
    const buildingIds = [...new Set(flat.map((r) => r.building_id).filter(Boolean))];
    const [unitsRes, buildingsRes] = await Promise.all([
      unitIds.length ? supabase.from("units").select("id, unit_number, floor").in("id", unitIds) : { data: [] },
      buildingIds.length ? supabase.from("buildings").select("id, name").in("id", buildingIds) : { data: [] },
    ]);
    const unitMap = new Map<string, UnitRow>();
    (unitsRes.data || []).forEach((u: { id: string; unit_number: string; floor: number | string }) => {
      unitMap.set(u.id, { unit_number: u.unit_number, floor: u.floor });
    });
    const buildingMap = new Map<string, BuildingRow>();
    (buildingsRes.data || []).forEach((b: { id: string; name: string }) => {
      buildingMap.set(b.id, { name: b.name });
    });
    const enriched: Reservation[] = flat.map((r) => ({
      ...r,
      unit: unitMap.get(r.unit_id) ?? null,
      building: buildingMap.get(r.building_id) ?? null,
    }));
    setReservations(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!ready) return;
    if (!can("reservations")) {
      showToast("ليس لديك صلاحية الوصول لسجل الحجوزات.", "error");
      router.replace("/dashboard");
    }
  }, [ready, can, router]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const previewReceiptId = searchParams.get("previewReceipt");
  useEffect(() => {
    if (!previewReceiptId) return;
    const fromList = reservations.find((x) => x.id === previewReceiptId);
    if (fromList) {
      setReceiptPreview(fromList);
      return;
    }
    (async () => {
      const client = createClient();
      const { data } = await client
        .from("reservations")
        .select("id, customer_name, customer_email, customer_phone, reservation_date, expiry_date, status, notes, deposit_amount, deposit_paid, deposit_paid_date, unit_id, building_id, marketer_id, marketer_name, marketer_phone, receipt_number, cancellation_reason, cancelled_at, completed_at, sale_id, customer_iban_or_account, customer_bank_name, deposit_refunded, deposit_refunded_at, deposit_refund_method")
        .eq("id", previewReceiptId)
        .single();
      if (data) {
        const { data: unitData } = await client.from("units").select("unit_number, floor").eq("id", data.unit_id).single();
        const { data: buildingData } = await client.from("buildings").select("name").eq("id", data.building_id).single();
        setReceiptPreview({ ...data, unit: unitData ?? null, building: buildingData ?? null } as Reservation);
      }
    })();
  }, [previewReceiptId, reservations]);

  useEffect(() => {
    if (!effectiveOwnerId) return;
    (async () => {
      const { data: b } = await supabase
        .from("buildings")
        .select("id, name")
        .eq("owner_id", effectiveOwnerId)
        .order("name");
      setBuildings(b || []);
    })();
  }, [effectiveOwnerId, supabase]);

  useEffect(() => {
    if (!createForm.building_id) {
      setUnits([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("units")
        .select("id, building_id, unit_number, floor, status")
        .eq("building_id", createForm.building_id)
        .eq("status", "available");
      const sorted = [...(data || [])].sort((a, b) => {
        const floorA = Number(a.floor) || 0;
        const floorB = Number(b.floor) || 0;
        if (floorA !== floorB) return floorA - floorB;
        const unitA = Number(String(a.unit_number).replace(/\D/g, "")) || 0;
        const unitB = Number(String(b.unit_number).replace(/\D/g, "")) || 0;
        if (unitA !== unitB) return unitA - unitB;
        return String(a.unit_number).localeCompare(String(b.unit_number), "ar");
      });
      setUnits(sorted);
    })();
  }, [createForm.building_id, supabase]);

  const filteredReservations = useMemo(() => {
    const textQuery = normalizeSearchText(searchQuery);
    const dateQuery = normalizeSearchText(dateSearchQuery);
    return reservations
      .filter((r) => {
        if (buildingIdFromUrl && r.building_id !== buildingIdFromUrl) return false;
        return true;
      })
      .filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return isActive(r);
        return r.status === statusFilter;
      })
      .filter((r) => {
        if (!textQuery) return true;
        const searchPool = [
          getUnit(r)?.unit_number ?? "",
          String(getUnit(r)?.floor ?? ""),
          getBuilding(r)?.name ?? "",
          r.customer_name ?? "",
          r.customer_phone ?? "",
          r.customer_email ?? "",
          r.marketer_name ?? "",
          r.marketer_phone ?? "",
          r.receipt_number ?? "",
        ];
        const normalizedPool = normalizeSearchText(searchPool.join(" "));
        return normalizedPool.includes(textQuery);
      })
      .filter((r) => {
        if (!dateQuery) return true;
        const datePool = [
          ...dateSearchTokens(r.reservation_date),
          ...dateSearchTokens(r.expiry_date),
          ...dateSearchTokens(r.cancelled_at),
          ...dateSearchTokens(r.completed_at),
        ];
        const normalizedDatePool = normalizeSearchText(datePool.join(" "));
        return normalizedDatePool.includes(dateQuery);
      });
  }, [reservations, statusFilter, searchQuery, dateSearchQuery, buildingIdFromUrl]);

  const expiringSoon = useMemo(() => {
    const now = new Date();
    const in3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return reservations.filter((r) => {
      if (!isActive(r) || !r.expiry_date) return false;
      const ex = new Date(r.expiry_date);
      return ex >= now && ex <= in3;
    });
  }, [reservations]);

  const activeCount = useMemo(
    () => reservations.filter((r) => isActive(r)).length,
    [reservations]
  );

  useEffect(() => {
    if (expiringSoon.length <= 1) return;
    const t = setInterval(() => {
      setExpiringSlideIndex((i) => (i + 1) % expiringSoon.length);
    }, 3000);
    return () => clearInterval(t);
  }, [expiringSoon.length]);

  useEffect(() => {
    if (receiptPreview) {
      document.body.classList.add("receipt-print-active");
      return () => document.body.classList.remove("receipt-print-active");
    }
  }, [receiptPreview]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.unit_id || !createForm.customer_name?.trim() || !createForm.customer_phone?.trim()) {
      showToast("الرجاء إدخال الوحدة واسم العميل وجواله (10 أرقام).", "error");
      return;
    }
    const customerPhoneDigits = phoneDigitsOnly(createForm.customer_phone);
    if (!isValidPhone10Digits(customerPhoneDigits)) {
      showToast("جوال العميل يجب أن يكون 10 أرقام بالضبط.", "error");
      return;
    }
    const finalMarketerName = createForm.marketer_name?.trim();
    if (!finalMarketerName) {
      showToast("الرجاء إدخال اسم المسوق.", "error");
      return;
    }
    const finalMarketerPhoneRaw = createForm.marketer_phone?.trim() || "";
    if (!finalMarketerPhoneRaw) {
      showToast("الرجاء إدخال جوال المسوق.", "error");
      return;
    }
    if (!isValidPhone10Digits(finalMarketerPhoneRaw)) {
      showToast("جوال المسوق يجب أن يكون 10 أرقام بالضبط.", "error");
      return;
    }
    const finalMarketerPhone = phoneDigitsOnly(finalMarketerPhoneRaw);
    setSaving(true);

    const { data: unitRow } = await supabase
      .from("units")
      .select("id, building_id")
      .eq("id", createForm.unit_id)
      .single();
    const building_id = unitRow?.building_id;
    if (!building_id) {
      showToast("الوحدة غير موجودة.", "error");
      setSaving(false);
      return;
    }
    if (createForm.building_id && building_id !== createForm.building_id) {
      showToast("الوحدة المختارة لا تتبع العمارة المحددة.", "error");
      setSaving(false);
      return;
    }

    const receiptNumber = generateReceiptNumber();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(createForm.expiry_days || "7", 10));

    const { data: { user } } = await supabase.auth.getUser();
    const createdByName = (user?.user_metadata?.full_name as string)?.trim() || (user?.email as string) || "صاحب الحساب";
    const { error: insertErr } = await supabase.from("reservations").insert({
      unit_id: createForm.unit_id,
      building_id,
      customer_name: createForm.customer_name.trim(),
      customer_email: createForm.customer_email?.trim() || null,
      customer_phone: customerPhoneDigits,
      marketer_id: null,
      marketer_name: finalMarketerName,
      marketer_phone: finalMarketerPhone,
      deposit_amount: createForm.deposit_amount ? parseFloat(createForm.deposit_amount) : null,
      deposit_paid: createForm.deposit_paid,
      deposit_paid_date: createForm.deposit_paid ? new Date().toISOString() : null,
      expiry_date: expiryDate.toISOString(),
      status: "active",
      receipt_number: receiptNumber,
      customer_iban_or_account: createForm.customer_iban_or_account?.trim() || null,
      customer_bank_name: createForm.customer_bank_name?.trim() || null,
      notes: createForm.notes?.trim() || null,
      created_by: user?.id || null,
      created_by_name: createdByName,
    });

    if (insertErr) {
      showToast(insertErr.message || "فشل إنشاء الحجز.", "error");
      setSaving(false);
      return;
    }

    await supabase
      .from("units")
      .update({ status: "reserved", updated_at: new Date().toISOString() })
      .eq("id", createForm.unit_id);

    showToast("تم إنشاء الحجز وإصدار سند العربون بنجاح.", "success");
    setCreateOpen(false);
    setCreateForm({
      building_id: "",
      unit_id: "",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      marketer_name: "",
      marketer_phone: "",
      deposit_amount: "",
      deposit_paid: false,
      expiry_days: "7",
      customer_iban_or_account: "",
      customer_bank_name: "",
      notes: "",
    });
    fetchReservations();
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!cancelOpen) return;
    setSaving(true);
    const { error: updRes } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
        cancellation_reason: cancelReason.trim() || null,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cancelOpen.id);
    if (updRes) {
      showToast(updRes.message || "فشل إلغاء الحجز.", "error");
      setSaving(false);
      return;
    }
    await supabase
      .from("units")
      .update({ status: "available", updated_at: new Date().toISOString() })
      .eq("id", cancelOpen.unit_id);
    const unitLabel = getUnit(cancelOpen) ? `الوحدة ${getUnit(cancelOpen)?.unit_number} (د${getUnit(cancelOpen)?.floor})` : "وحدة محجوزة";
    const buildingName = getBuilding(cancelOpen)?.name ?? "—";
    const { data: { user } } = await supabase.auth.getUser();
    const createdByName = (user?.user_metadata?.full_name as string)?.trim() || user?.email || "النظام";
    await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      action_type: "reservation_cancelled",
      action_description: `إلغاء حجز ${unitLabel} — عميل: ${cancelOpen.customer_name} — عمارة ${buildingName}`,
      metadata: {
        reservation_id: cancelOpen.id,
        building_id: cancelOpen.building_id,
        building_name: buildingName,
        unit_id: cancelOpen.unit_id,
        customer_name: cancelOpen.customer_name,
        cancellation_reason: cancelReason.trim() || null,
        created_by_name: createdByName,
      },
    });
    showToast("تم إلغاء الحجز وتحرير الوحدة.", "success");
    setCancelOpen(null);
    setCancelReason("");
    fetchReservations();
    setSaving(false);
  };

  const handleRefundSubmit = async () => {
    if (!refundOpen) return;
    if (refundMethod === "transfer" && (!refundBankName.trim() || !refundIban.trim())) {
      showToast("الرجاء إدخال اسم البنك ورقم الحساب/آيبان عند اختيار التحويل.", "error");
      return;
    }
    setRefundSaving(true);
    const { error } = await supabase
      .from("reservations")
      .update({
        deposit_refunded: true,
        deposit_refunded_at: new Date().toISOString(),
        deposit_refund_method: refundMethod,
        customer_bank_name: refundMethod === "transfer" ? refundBankName.trim() || null : refundOpen.customer_bank_name,
        customer_iban_or_account: refundMethod === "transfer" ? refundIban.trim() || null : refundOpen.customer_iban_or_account,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refundOpen.id);
    if (error) {
      showToast(error.message || "فشل تسجيل استرداد العربون.", "error");
      setRefundSaving(false);
      return;
    }
    const unitLabel = getUnit(refundOpen) ? `الوحدة ${getUnit(refundOpen)?.unit_number} (د${getUnit(refundOpen)?.floor})` : "وحدة محجوزة";
    const buildingName = getBuilding(refundOpen)?.name ?? "—";
    const { data: { user } } = await supabase.auth.getUser();
    const createdByName = (user?.user_metadata?.full_name as string)?.trim() || user?.email || "النظام";
    await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      action_type: "deposit_refunded",
      action_description: `استرداد عربون حجز ${unitLabel} — عميل: ${refundOpen.customer_name} — ${Number(refundOpen.deposit_amount).toLocaleString("en")} ر.س — عمارة ${buildingName}`,
      metadata: {
        reservation_id: refundOpen.id,
        building_id: refundOpen.building_id,
        building_name: buildingName,
        unit_id: refundOpen.unit_id,
        customer_name: refundOpen.customer_name,
        deposit_amount: refundOpen.deposit_amount,
        deposit_refund_method: refundMethod,
        created_by_name: createdByName,
      },
    });
    showToast("تم تسجيل استرداد العربون بنجاح.", "success");
    setRefundOpen(null);
    setRefundBankName("");
    setRefundIban("");
    fetchReservations();
    setRefundSaving(false);
  };

  const formatDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("ar-SA", { dateStyle: "short" }) : "—");
  const formatDateEn = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
  const formatDateNumeric = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/") : "—");

  if (ready && !can("reservations")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الحجوزات</h1>
            <p className="text-sm text-gray-500 mt-1">سجل الحجوزات (مع عربون أو بدونه) — إلغاء الحجز — إتمام البيع من إدارة المبيعات</p>
          </div>
          {can("reservations") && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center w-10 h-10 bg-white border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition"
                title="رجوع"
                aria-label="رجوع للصفحة السابقة"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg"
              >
                <Plus className="w-5 h-5" />
                حجز وحدة جديدة
              </button>
            </div>
          )}
        </div>

        {/* سياسات الحجز */}
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            سياسات الحجز
          </h3>
          <ul className="text-xs text-amber-900/90 space-y-1 list-disc list-inside">
            <li>الحجز يُلزم الوحدة حتى تاريخ الانتهاء أو إلغاء الحجز أو إتمام البيع.</li>
            <li>سند العربون يُصدر تلقائياً عند إنشاء الحجز ويرتبط برقم فريد.</li>
            <li>إلغاء الحجز يحرّر الوحدة فوراً.</li>
          </ul>
        </div>

        {/* ملخص ذكي */}
        <div className="mb-6 rounded-2xl border border-indigo-200/80 bg-white/90 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-indigo-900">ملخص الحجوزات</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white border border-indigo-100 p-3">
              <p className="text-xs text-gray-500 mb-1">الحجوزات النشطة</p>
              <p className="text-2xl font-bold text-indigo-700">{activeCount}</p>
            </div>
            <div className="rounded-xl bg-white border border-amber-100 p-3">
              <p className="text-xs text-gray-500 mb-1">تنتهي خلال 3 أيام</p>
              <p className="text-2xl font-bold text-amber-700">{expiringSoon.length}</p>
            </div>
            {expiringSoon.length > 0 && (
              <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 sm:col-span-1">
                <p className="text-xs font-medium text-amber-800 mb-1">ينصح بمتابعة العميل:</p>
                <div className="min-h-[1.25rem] text-sm text-amber-900">
                  {expiringSoon.length === 1 ? (
                    expiringSoon[0].customer_name
                  ) : (
                    <span key={expiringSlideIndex} className="inline-block animate-fadeIn">
                      {expiringSoon[expiringSlideIndex % expiringSoon.length]?.customer_name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* فلاتر */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">الحالة:</span>
          {(["all", "active", "cancelled", "completed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "الكل" : f === "active" ? "قيد الحجز" : f === "cancelled" ? "ملغي" : "تم البيع"}
            </button>
          ))}
        </div>
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 pr-10 pl-24 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                placeholder="بحث عام: وحدة / عمارة / عميل / مسوق"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                  title="مسح البحث العام"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  مسح
                </button>
              )}
            </div>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateSearchQuery}
                onChange={(e) => setDateSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 pr-10 pl-24 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
              {dateSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDateSearchQuery("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                  title="مسح بحث التاريخ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  مسح
                </button>
              )}
            </div>
          </div>
        </div>

        {/* الجدول */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                لا توجد حجوزات
                {statusFilter !== "all" ? " بهذه الحالة" : ""}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right p-3 font-semibold text-gray-700">الوحدة / العمارة</th>
                    <th className="text-right p-3 font-semibold text-gray-700">العميل</th>
                    <th className="text-right p-3 font-semibold text-gray-700">المسوق</th>
                    <th className="text-right p-3 font-semibold text-gray-700">تاريخ الحجز</th>
                    <th className="text-right p-3 font-semibold text-gray-700">تاريخ الانتهاء</th>
                    <th className="text-right p-3 font-semibold text-gray-700">العربون</th>
                    <th className="text-center p-3 font-semibold text-gray-700">سند العربون</th>
                    <th className="text-right p-3 font-semibold text-gray-700">الحالة</th>
                    <th className="text-end p-3 font-semibold text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="p-3">
                        <span className="font-medium text-gray-800">
                          {getUnit(r)?.unit_number ?? "—"} / د{getUnit(r)?.floor ?? "—"}
                        </span>
                        <span className="text-gray-500 block text-xs">{getBuilding(r)?.name ?? "—"}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium">{r.customer_name}</span>
                        <span className="text-gray-500 block text-xs">{r.customer_phone}</span>
                      </td>
                      <td className="p-3 text-gray-600">
                        <span className="font-medium text-gray-700">{r.marketer_name || "—"}</span>
                        {r.marketer_phone && <span className="block text-xs text-gray-500">{r.marketer_phone}</span>}
                      </td>
                      <td className="p-3 text-gray-600 font-mono text-xs">{formatDateNumeric(r.reservation_date)}</td>
                      <td className="p-3 text-gray-600 font-mono text-xs">{formatDateNumeric(r.expiry_date)}</td>
                      <td className="p-3">
                        {r.deposit_amount != null ? `${r.deposit_amount} ${RIYAL_SYMBOL}` : "—"}
                        {r.status !== "completed" && (
                          <span className={`text-xs block ${r.deposit_refunded ? "text-slate-600" : r.deposit_paid ? "text-emerald-600" : "text-gray-500"}`}>
                            {r.deposit_refunded ? "مسترد" : r.deposit_paid ? "مدفوع" : "غير مدفوع"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {r.receipt_number ? (
                          <button
                            type="button"
                            onClick={() => setReceiptPreview(r)}
                            className="text-indigo-600 hover:underline font-mono text-xs"
                          >
                            {formatReceiptNumberDisplay(r.receipt_number)}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm border ${
                            isActive(r)
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : r.status === "cancelled"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {r.status === "cancelled"
                            ? (r.deposit_refunded ? "حجز ملغي — مسترد" : "ملغي بدون استرداد العربون")
                            : (STATUS_LABEL[r.status] ?? r.status)}
                          {r.status === "completed" && r.deposit_settlement_type === "included" && " — تم المخالصة"}
                          {r.status === "completed" && r.deposit_settlement_type === "refund" && " — تم مخالصة الاسترداد"}
                        </span>
                      </td>
                      <td className="p-3 text-end">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {isActive(r) && can("marketing_cancel_reservation") && (
                            <button
                              type="button"
                              onClick={() => setCancelOpen(r)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="إلغاء الحجز"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {r.status === "cancelled" && r.deposit_paid && r.deposit_amount != null && r.deposit_amount > 0 && !r.deposit_refunded && (
                            <button
                              type="button"
                              onClick={() => { setRefundOpen(r); setRefundMethod("cash"); setRefundBankName(r.customer_bank_name ?? ""); setRefundIban(r.customer_iban_or_account ?? ""); }}
                              className="p-1.5 text-amber-700 rounded-lg"
                              title="استرداد العربون"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptPreview(r);
                              setTimeout(() => window.print(), 350);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="طباعة سند العربون"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {can("building_details") && can("marketing_building_details") && (
                            <Link
                              href={`/dashboard/buildings/details?buildingId=${r.building_id}`}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="تفاصيل المبنى"
                            >
                              <Building2 className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* مودال إنشاء حجز */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">حجز وحدة جديدة</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمارة</label>
                <select
                  required
                  value={createForm.building_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, building_id: e.target.value, unit_id: "" }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="">اختر العمارة</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة (المتاحة فقط)</label>
                <select
                  required
                  value={createForm.unit_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, unit_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  disabled={!createForm.building_id}
                >
                  <option value="">اختر الوحدة</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number} — الطابق {u.floor}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, customer_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                    placeholder="اسم العميل"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">جوال العميل *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={createForm.customer_phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, customer_phone: phoneDigitsOnly(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                    placeholder="05xxxxxxxx"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المسوق *</label>
                  <input
                    type="text"
                    required
                    value={createForm.marketer_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, marketer_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    placeholder="أدخل اسم المسوق"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">جوال المسوق *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={createForm.marketer_phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, marketer_phone: phoneDigitsOnly(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    placeholder="05xxxxxxxx"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ العربون ({RIYAL_SYMBOL})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.deposit_amount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, deposit_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">صلاحية الحجز</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={createForm.expiry_days}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = parseInt(v, 10);
                      const clamped = Number.isNaN(n) ? "7" : String(Math.min(7, Math.max(1, n)));
                      setCreateForm((f) => ({ ...f, expiry_days: v === "" ? "7" : clamped }));
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.deposit_paid}
                      onChange={(e) => setCreateForm((f) => ({ ...f, deposit_paid: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">العربون مدفوع</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم حساب أو آيبان العميل</label>
                  <input
                    type="text"
                    value={createForm.customer_iban_or_account}
                    onChange={(e) => setCreateForm((f) => ({ ...f, customer_iban_or_account: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                    placeholder="IBAN أو رقم الحساب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم البنك</label>
                  <input
                    type="text"
                    value={createForm.customer_bank_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, customer_bank_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                    placeholder="اسم البنك"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  placeholder="ملاحظات اختيارية"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "إنشاء الحجز وإصدار سند العربون"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إلغاء الحجز */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">إلغاء الحجز</h3>
            <p className="text-sm text-gray-600 mb-4">
              الوحدة {getUnit(cancelOpen)?.unit_number} — العميل {cancelOpen.customer_name}. سيتم تحرير الوحدة وإرجاعها إلى «متاحة».
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">سبب الإلغاء (اختياري)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 mb-4"
              placeholder="سبب إلغاء الحجز"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "جاري..." : "تأكيد الإلغاء"}
              </button>
              <button
                type="button"
                onClick={() => { setCancelOpen(null); setCancelReason(""); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال استرداد العربون (حجز ملغي + كان مدفوع بعربون) */}
      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-700">
                <ArrowRightLeft className="w-5 h-5" strokeWidth={2.5} />
              </span>
              استرداد العربون
            </h3>
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">العميل</p>
                <p className="font-medium">{refundOpen.customer_name}</p>
                <p className="text-sm text-slate-600 dir-ltr">{refundOpen.customer_phone}</p>
                {refundOpen.customer_email && <p className="text-sm text-slate-600 dir-ltr">{refundOpen.customer_email}</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">المسوق</p>
                <p className="font-medium">{refundOpen.marketer_name || "—"}</p>
                {refundOpen.marketer_phone && <p className="text-sm text-slate-600 dir-ltr">{refundOpen.marketer_phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">تاريخ الحجز</span><p className="font-medium">{refundOpen.reservation_date ? formatDateNumeric(refundOpen.reservation_date) : "—"}</p></div>
                <div><span className="text-slate-500">تاريخ الانتهاء</span><p className="font-medium">{refundOpen.expiry_date ? formatDateNumeric(refundOpen.expiry_date) : "—"}</p></div>
                <div><span className="text-slate-500">مدة الحجز</span><p className="font-medium">{refundOpen.reservation_date && refundOpen.expiry_date ? Math.max(0, Math.ceil((new Date(refundOpen.expiry_date).getTime() - new Date(refundOpen.reservation_date).getTime()) / (24 * 60 * 60 * 1000))) + " يوم" : "—"}</p></div>
                <div><span className="text-slate-500">مبلغ العربون</span><p className="font-medium dir-ltr">{refundOpen.deposit_amount != null ? `${Number(refundOpen.deposit_amount).toLocaleString("en")} ${RIYAL_SYMBOL}` : "—"}</p></div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">طريقة الاسترداد</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="refundMethod" checked={refundMethod === "cash"} onChange={() => setRefundMethod("cash")} className="rounded-full border-gray-300 text-amber-600" />
                  <span>كاش</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="refundMethod" checked={refundMethod === "transfer"} onChange={() => setRefundMethod("transfer")} className="rounded-full border-gray-300 text-amber-600" />
                  <span>تحويل</span>
                </label>
              </div>
              {refundMethod === "transfer" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم البنك</label>
                    <input type="text" value={refundBankName} onChange={(e) => setRefundBankName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2" placeholder="اسم البنك" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الحساب / آيبان</label>
                    <input type="text" value={refundIban} onChange={(e) => setRefundIban(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 dir-ltr" placeholder="IBAN أو رقم الحساب" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={handleRefundSubmit} disabled={refundSaving} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50">
                {refundSaving ? "جاري..." : "تأكيد استرداد العربون"}
              </button>
              <button type="button" onClick={() => { setRefundOpen(null); setRefundBankName(""); setRefundIban(""); }} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* معاينة سند العربون — تصميم واحد للمعاينة والطباعة */}
      {receiptPreview && (
        <div className="receipt-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:bg-transparent print:p-0" onClick={() => setReceiptPreview(null)}>
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-[420px] print:max-w-[210mm] p-6 border border-gray-200 print:shadow-none print:border-0 print:rounded-none receipt-unified"
            onClick={(e) => e.stopPropagation()}
          >
            {receiptPreview.status === "cancelled" && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl print:rounded-none">
                <span className={`text-5xl font-black uppercase tracking-widest -rotate-[-20deg] select-none print:text-6xl ${
                  receiptPreview.deposit_refunded ? "text-emerald-500/40 print:text-emerald-500/30" : "text-red-400/40 print:text-red-500/30"
                }`}>
                  {receiptPreview.deposit_refunded ? "مُسْتَرَد" : "مُلْغَى"}
                </span>
              </div>
            )}
            <div className="print:hidden flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                سند عربون حجز
              </h3>
              <button type="button" onClick={() => setReceiptPreview(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full text-right receipt-body border-b-2 border-slate-700 pb-3 mb-4" dir="rtl">
              <h1 className="text-xl font-bold text-slate-800">سند عربون حجز</h1>
            </div>
            <table className="w-full text-sm border-collapse relative">
              <tbody className="[&>tr]:border-b [&>tr]:border-slate-100">
                <tr><td className="py-2 text-slate-500 w-32">رقم السند</td><td className="py-2 font-mono font-semibold">{formatReceiptNumberDisplay(receiptPreview.receipt_number)}</td></tr>
                <tr><td className="py-2 text-slate-500">الوحدة</td><td className="py-2">{(getUnit(receiptPreview)?.unit_number ?? "—")} — الطابق {getUnit(receiptPreview)?.floor ?? "—"}</td></tr>
                <tr><td className="py-2 text-slate-500">العمارة</td><td className="py-2">{getBuilding(receiptPreview)?.name ?? "—"}</td></tr>
                <tr><td className="py-2 text-slate-500">العميل</td><td className="py-2">{receiptPreview.customer_name} — {receiptPreview.customer_phone}</td></tr>
                <tr><td className="py-2 text-slate-500">مبلغ العربون</td><td className="py-2">{receiptPreview.deposit_amount != null ? `${receiptPreview.deposit_amount} ${RIYAL_SYMBOL}` : "—"} {receiptPreview.deposit_refunded ? "(مسترد)" : receiptPreview.deposit_paid ? "(مدفوع)" : "(غير مدفوع)"}</td></tr>
                <tr><td className="py-2 text-slate-500">تاريخ الحجز</td><td className="py-2">{formatDateEn(receiptPreview.reservation_date)}</td></tr>
                {receiptPreview.status === "cancelled" ? (
                  <>
                    <tr><td className="py-2 text-slate-500">تاريخ الإلغاء</td><td className="py-2">{formatDateEn(receiptPreview.cancelled_at)}</td></tr>
                    <tr><td className="py-2 text-slate-500">حالة العربون</td><td className="py-2 font-medium">{receiptPreview.deposit_refunded ? "مسترد" : "ملغي بدون استرداد العربون"}</td></tr>
                  </>
                ) : (
                  <tr><td className="py-2 text-slate-500">صلاحية حتى</td><td className="py-2">{formatDateEn(receiptPreview.expiry_date)}</td></tr>
                )}
                {(receiptPreview.customer_iban_or_account ?? receiptPreview.customer_bank_name) && (
                  <>
                    {receiptPreview.customer_iban_or_account?.trim() && (
                      <tr><td className="py-2 text-slate-500">رقم الحساب / آيبان</td><td className="py-2 font-mono text-gray-700">{receiptPreview.customer_iban_or_account.trim()}</td></tr>
                    )}
                    {receiptPreview.customer_bank_name?.trim() && (
                      <tr><td className="py-2 text-slate-500">اسم البنك</td><td className="py-2 text-gray-700">{receiptPreview.customer_bank_name.trim()}</td></tr>
                    )}
                  </>
                )}
                {receiptPreview.notes?.trim() && (
                  <tr><td className="py-2 text-slate-500">الملاحظات</td><td className="py-2 text-gray-700">{receiptPreview.notes.trim()}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
