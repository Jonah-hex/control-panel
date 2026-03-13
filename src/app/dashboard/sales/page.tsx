"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import { formatReceiptNumberDisplay } from "@/lib/receipt-utils";
import TransferOwnershipForm, { type TransferUnit } from "@/components/TransferOwnershipForm";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Building2,
  X,
  FileText,
  Hash,
  Printer,
  User,
  MapPin,
  ClipboardCheck,
  CalendarClock,
  Search,
} from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import { UnitStatusBadge } from "@/components/UnitStatusBadge";

type SaleRow = {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_id_number?: string | null;
  sale_date: string;
  sale_price: number;
  commission_amount?: number | null;
  payment_method: string | null;
  payment_status: string | null;
  bank_name?: string | null;
  down_payment?: number | null;
  remaining_payment?: number | null;
  remaining_payment_due_date?: string | null;
  remaining_payment_collected_at?: string | null;
  commission_received_at?: string | null;
  contract_url?: string | null;
  notes: string | null;
  created_at: string;
  unit_id: string;
  building_id: string;
  units?: { unit_number: string; floor: number } | null;
  buildings?: { name: string } | null;
};

/** حجز مرتبط بعملية البيع (لعرض بيانات المسوق وغيرها) */
type SaleLinkedReservation = {
  marketer_name: string | null;
  marketer_phone: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  reservation_date: string | null;
  deposit_amount: number | null;
  receipt_number: string | null;
  deposit_settlement_type: string | null;
  customer_iban_or_account: string | null;
  customer_bank_name: string | null;
  completed_at: string | null;
};

type BuildingOption = { id: string; name: string };

type DateRangePreset = "all" | "today" | "yesterday" | "last_7" | "last_14" | "this_month" | "last_30" | "last_month" | "custom";

function getDateRangeForPreset(preset: string): { dateFrom: string; dateTo: string } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  switch (preset) {
    case "today":
      return { dateFrom: toStr(today), dateTo: toStr(today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { dateFrom: toStr(y), dateTo: toStr(y) };
    }
    case "last_7":
      return { dateFrom: toStr(addDays(today, -6)), dateTo: toStr(today) };
    case "last_14":
      return { dateFrom: toStr(addDays(today, -13)), dateTo: toStr(today) };
    case "this_month":
      return { dateFrom: toStr(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: toStr(today) };
    case "last_30":
      return { dateFrom: toStr(addDays(today, -29)), dateTo: toStr(today) };
    case "last_month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dateFrom: toStr(first), dateTo: toStr(last) };
    }
    default:
      return null;
  }
}

type ReservationRow = {
  id: string;
  unit_id: string;
  building_id: string;
  customer_name: string;
  customer_phone: string | null;
  deposit_amount: number | null;
  receipt_number: string | null;
  reservation_date: string;
  unit?: TransferUnit | null;
  building?: { name: string } | null;
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "transfer">("list");
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [transferUnits, setTransferUnits] = useState<TransferUnit[]>([]);
  const [transferUnitsLoading, setTransferUnitsLoading] = useState(false);
  const [transferUnit, setTransferUnit] = useState<TransferUnit | null>(null);
  const [transferBuildingName, setTransferBuildingName] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(25);
  const [reservationsPage, setReservationsPage] = useState(1);
  const [reservationsPageSize, setReservationsPageSize] = useState(10);
  const SALES_PAGE_SIZES = [10, 25, 50, 100] as const;
  const RESERVATIONS_PAGE_SIZES = [6, 10, 25, 50, 100] as const;

  const [resFilterBuilding, setResFilterBuilding] = useState("");
  const [resSearch, setResSearch] = useState("");
  const [resDatePreset, setResDatePreset] = useState<DateRangePreset>("all");
  const [resDateFrom, setResDateFrom] = useState("");
  const [resDateTo, setResDateTo] = useState("");

  const [salesFilterBuilding, setSalesFilterBuilding] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesDatePreset, setSalesDatePreset] = useState<DateRangePreset>("all");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");
  const [salesPaymentFilter, setSalesPaymentFilter] = useState<"all" | "paid" | "remaining">("all");

  const applyResDatePreset = (preset: DateRangePreset) => {
    setResDatePreset(preset);
    if (preset === "all") {
      setResDateFrom("");
      setResDateTo("");
      return;
    }
    if (preset === "custom") return;
    const r = getDateRangeForPreset(preset);
    if (r) {
      setResDateFrom(r.dateFrom);
      setResDateTo(r.dateTo);
    }
  };
  const applySalesDatePreset = (preset: DateRangePreset) => {
    setSalesDatePreset(preset);
    if (preset === "all") {
      setSalesDateFrom("");
      setSalesDateTo("");
      return;
    }
    if (preset === "custom") return;
    const r = getDateRangeForPreset(preset);
    if (r) {
      setSalesDateFrom(r.dateFrom);
      setSalesDateTo(r.dateTo);
    }
  };

  const reservationsFiltered = useMemo(() => {
    let list = reservations;
    if (resFilterBuilding) list = list.filter((r) => r.building_id === resFilterBuilding);
    if (resSearch.trim()) {
      const q = resSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.customer_name || "").toLowerCase().includes(q) ||
          (r.customer_phone || "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          String(r.receipt_number || "").toLowerCase().includes(q) ||
          (r.building && typeof r.building === "object" && "name" in r.building && String(r.building.name).toLowerCase().includes(q))
      );
    }
    if (resDateFrom || resDateTo) {
      list = list.filter((r) => {
        const d = (r.reservation_date || "").slice(0, 10);
        if (!d) return false;
        if (resDateFrom && d < resDateFrom) return false;
        if (resDateTo && d > resDateTo) return false;
        return true;
      });
    }
    return list;
  }, [reservations, resFilterBuilding, resSearch, resDateFrom, resDateTo]);

  const salesFiltered = useMemo(() => {
    let list = sales;
    if (salesFilterBuilding) list = list.filter((s) => s.building_id === salesFilterBuilding);
    if (salesSearch.trim()) {
      const q = salesSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.buyer_name || "").toLowerCase().includes(q) ||
          (s.buyer_phone || "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          (s.buildings && typeof s.buildings === "object" && "name" in s.buildings && String(s.buildings.name).toLowerCase().includes(q))
      );
    }
    if (salesDateFrom || salesDateTo) {
      list = list.filter((s) => {
        const d = (s.sale_date || "").slice(0, 10);
        if (!d) return false;
        if (salesDateFrom && d < salesDateFrom) return false;
        if (salesDateTo && d > salesDateTo) return false;
        return true;
      });
    }
    if (salesPaymentFilter === "paid") {
      list = list.filter((s) => {
        const st = (s.payment_status || "").toLowerCase();
        return st.includes("paid") || st.includes("مكتمل") || st.includes("complete") || (!s.remaining_payment || Number(s.remaining_payment) <= 0);
      });
    } else if (salesPaymentFilter === "remaining") {
      list = list.filter((s) => s.remaining_payment != null && Number(s.remaining_payment) > 0);
    }
    return list;
  }, [sales, salesFilterBuilding, salesSearch, salesDateFrom, salesDateTo, salesPaymentFilter]);

  const salesTotalPages = Math.max(1, Math.ceil(salesFiltered.length / salesPageSize));
  const reservationsTotalPages = Math.max(1, Math.ceil(reservationsFiltered.length / reservationsPageSize));
  const salesPaginated = useMemo(
    () => salesFiltered.slice((salesPage - 1) * salesPageSize, salesPage * salesPageSize),
    [salesFiltered, salesPage, salesPageSize]
  );
  const reservationsPaginated = useMemo(
    () => reservationsFiltered.slice((reservationsPage - 1) * reservationsPageSize, reservationsPage * reservationsPageSize),
    [reservationsFiltered, reservationsPage, reservationsPageSize]
  );

  useEffect(() => {
    setReservationsPage(1);
  }, [resFilterBuilding, resSearch, resDateFrom, resDateTo]);
  useEffect(() => {
    setSalesPage(1);
  }, [salesFilterBuilding, salesSearch, salesDateFrom, salesDateTo, salesPaymentFilter]);

  useEffect(() => {
    if (salesPage > salesTotalPages && salesTotalPages >= 1) setSalesPage(1);
  }, [salesPage, salesTotalPages]);
  useEffect(() => {
    if (reservationsPage > reservationsTotalPages && reservationsTotalPages >= 1) setReservationsPage(1);
  }, [reservationsPage, reservationsTotalPages]);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, ready } = useDashboardAuth();

  const action = searchParams.get("action");
  const paramBuildingId = searchParams.get("buildingId");
  const paramUnitId = searchParams.get("unitId");

  useEffect(() => {
    if (!ready) return;
    if (!can("sales")) {
      showToast("ليس لديك صلاحية الوصول لسجل المبيعات.", "error");
      router.replace("/dashboard");
    }
  }, [ready, can, router]);

  const [salesError, setSalesError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [saleLinkedReservation, setSaleLinkedReservation] = useState<SaleLinkedReservation | null>(null);
  const [selectedSaleUnit, setSelectedSaleUnit] = useState<Record<string, unknown> | null>(null);
  const [selectedSaleHandover, setSelectedSaleHandover] = useState<{ handover_date: string; status: string } | null>(null);
  const [confirmingRemaining, setConfirmingRemaining] = useState(false);
  const [confirmRemainingCollectOpen, setConfirmRemainingCollectOpen] = useState(false);
  const [postponeDueDateOpen, setPostponeDueDateOpen] = useState(false);
  const [postponeNewDueDate, setPostponeNewDueDate] = useState("");
  const [postponingRemaining, setPostponingRemaining] = useState(false);
  const [commissionReceivedDateLocal, setCommissionReceivedDateLocal] = useState("");
  const [savingCommissionReceived, setSavingCommissionReceived] = useState(false);
  const [showCommissionReceivedDateField, setShowCommissionReceivedDateField] = useState(false);

  useEffect(() => {
    setPostponeDueDateOpen(false);
    setPostponeNewDueDate("");
    setConfirmRemainingCollectOpen(false);
  }, [selectedSale?.id]);

  useEffect(() => {
    if (selectedSale?.commission_received_at) {
      setCommissionReceivedDateLocal(selectedSale.commission_received_at.slice(0, 10));
      setShowCommissionReceivedDateField(true);
    } else {
      setCommissionReceivedDateLocal(new Date().toISOString().slice(0, 10));
      setShowCommissionReceivedDateField(false);
    }
  }, [selectedSale?.id, selectedSale?.commission_received_at]);

  useEffect(() => {
    if (!selectedSale?.id) {
      setSaleLinkedReservation(null);
      setSelectedSaleUnit(null);
      setSelectedSaleHandover(null);
      return;
    }
    const supabase = createClient();
    (async () => {
      const [res, unitRes, handoverRes] = await Promise.all([
        supabase.from("reservations").select("marketer_name, marketer_phone, customer_name, customer_phone, customer_email, reservation_date, deposit_amount, receipt_number, deposit_settlement_type, customer_iban_or_account, customer_bank_name, completed_at").eq("sale_id", selectedSale.id).maybeSingle(),
        selectedSale.unit_id ? supabase.from("units").select("price, owner_name, owner_phone, previous_owner_name, tax_exemption_status, tax_exemption_file_url, transfer_payment_method, transfer_cash_amount, transfer_bank_name, transfer_amount, transfer_reference_number, transfer_check_amount, transfer_check_bank_name, transfer_check_number, transfer_check_image_url, transfer_real_estate_request_no, electricity_meter_transferred_with_sale, driver_room_transferred_with_sale, driver_room_number").eq("id", selectedSale.unit_id).maybeSingle() : { data: null },
        selectedSale.unit_id ? supabase.from("unit_handovers").select("handover_date, status").eq("unit_id", selectedSale.unit_id).maybeSingle() : { data: null },
      ]);
      setSaleLinkedReservation(res.data as SaleLinkedReservation | null);
      setSelectedSaleUnit((unitRes.data as Record<string, unknown>) || null);
      setSelectedSaleHandover(handoverRes.data ? { handover_date: (handoverRes.data as { handover_date: string }).handover_date, status: (handoverRes.data as { status: string }).status } : null);
    })();
  }, [selectedSale?.id, selectedSale?.unit_id]);

  async function fetchSalesWithRelations() {
    const { data: salesData, error } = await supabase
      .from("sales")
      .select("id, buyer_name, buyer_email, buyer_phone, buyer_id_number, sale_date, sale_price, commission_amount, payment_method, payment_status, bank_name, down_payment, remaining_payment, remaining_payment_due_date, remaining_payment_collected_at, commission_received_at, contract_url, notes, created_at, unit_id, building_id")
      .order("created_at", { ascending: false });
    if (error) return { error, rows: [] as SaleRow[] };
    const rows = (salesData || []) as (SaleRow & { unit_id: string; building_id: string })[];
    const unitIds = [...new Set(rows.map((r) => r.unit_id).filter(Boolean))];
    const buildingIds = [...new Set(rows.map((r) => r.building_id).filter(Boolean))];
    const [unitsRes, buildingsRes] = await Promise.all([
      unitIds.length ? supabase.from("units").select("id, unit_number, floor").in("id", unitIds) : { data: [] },
      buildingIds.length ? supabase.from("buildings").select("id, name").in("id", buildingIds) : { data: [] },
    ]);
    const unitMap = new Map<string, { unit_number: string; floor: number }>();
    (unitsRes.data || []).forEach((u: { id: string; unit_number: string; floor: number }) => unitMap.set(u.id, { unit_number: u.unit_number, floor: u.floor }));
    const buildingMap = new Map<string, { name: string }>();
    (buildingsRes.data || []).forEach((b: { id: string; name: string }) => buildingMap.set(b.id, { name: b.name }));
    const result: SaleRow[] = rows.map((r) => ({
      ...r,
      units: r.unit_id ? unitMap.get(r.unit_id) ?? null : null,
      buildings: r.building_id ? buildingMap.get(r.building_id) ?? null : null,
    })) as SaleRow[];
    return { error: null, rows: result };
  }

  useEffect(() => {
    if (!ready || !can("sales")) return;
    async function fetchSales() {
      setLoading(true);
      setSalesError(null);
      const { error, rows } = await fetchSalesWithRelations();
      if (error) {
        const msg = error.message || "فشل تحميل سجل المبيعات";
        setSalesError(msg);
        setSales([]);
        showToast(msg, "error");
      } else {
        setSales(rows);
      }
      setLoading(false);
    }
    fetchSales();
  }, [ready, can]);

  useEffect(() => {
    async function fetchReservations() {
      setReservationsLoading(true);
      const { data, error } = await supabase
        .from("reservations")
        .select("id, unit_id, building_id, customer_name, customer_phone, deposit_amount, receipt_number, reservation_date")
        .in("status", ["active", "pending", "confirmed", "reserved"])
        .order("reservation_date", { ascending: false });
      if (error || !data?.length) {
        setReservations([]);
        setReservationsLoading(false);
        return;
      }
      const unitIds = [...new Set((data as { unit_id: string }[]).map((r) => r.unit_id).filter(Boolean))];
      const buildingIds = [...new Set((data as { building_id: string }[]).map((r) => r.building_id).filter(Boolean))];
      const [unitsRes, buildingsRes] = await Promise.all([
        unitIds.length ? supabase.from("units").select("*").in("id", unitIds) : { data: [] },
        buildingIds.length ? supabase.from("buildings").select("id, name").in("id", buildingIds) : { data: [] },
      ]);
      const unitMap = new Map<string, TransferUnit>();
      (unitsRes.data || []).forEach((u: Record<string, unknown>) => unitMap.set(String(u.id), u as TransferUnit));
      const buildingMap = new Map<string, { name: string }>();
      (buildingsRes.data || []).forEach((b: Record<string, unknown>) => buildingMap.set(String(b.id), { name: String(b.name ?? "") }));
      const rows: ReservationRow[] = data.map((r: Record<string, unknown>) => ({
        ...r,
        unit: unitMap.get(String(r.unit_id)) ?? null,
        building: buildingMap.get(String(r.building_id)) ?? null,
      })) as ReservationRow[];
      setReservations(rows.filter((row) => row.unit != null));
      setReservationsLoading(false);
    }
    fetchReservations();
  }, []);

  useEffect(() => {
    async function fetchBuildings() {
      const { data, error } = await supabase.from("buildings").select("id, name").order("name");
      if (!error) setBuildings((data as BuildingOption[]) || []);
    }
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) {
      setTransferUnits([]);
      return;
    }
    setTransferUnitsLoading(true);
    supabase
      .from("units")
      .select("*")
      .eq("building_id", selectedBuildingId)
      .neq("status", "sold")
      .order("floor")
      .order("unit_number")
      .then(({ data, error }) => {
        if (!error) setTransferUnits((data as TransferUnit[]) || []);
        else setTransferUnits([]);
        setTransferUnitsLoading(false);
      });
  }, [selectedBuildingId]);

  useEffect(() => {
    if (action !== "transfer" || !paramBuildingId || !paramUnitId) return;
    setTab("transfer");
    setSelectedBuildingId(paramBuildingId);
    const b = buildings.find((x) => x.id === paramBuildingId);
    if (b) setTransferBuildingName(b.name);
    supabase
      .from("units")
      .select("*")
      .eq("id", paramUnitId)
      .single()
      .then(({ data }) => {
        if (data) setTransferUnit(data as TransferUnit);
      });
  }, [action, paramBuildingId, paramUnitId, buildings]);

  const openTransferForUnit = (unit: TransferUnit, buildingName: string) => {
    setTransferUnit(unit);
    setTransferBuildingName(buildingName);
  };

  const closeTransferModal = () => {
    setTransferUnit(null);
    if (paramUnitId && paramBuildingId) {
      router.replace("/dashboard/sales", { scroll: false });
    }
  };

  /** تأكيد تحصيل المبلغ المتبقي — تغيير حالة الدفع من جزئي إلى مكتمل (الوحدة تبقى sold، مبلغ البيع والعمولة دون تغيير) */
  const handleConfirmRemainingCollected = async () => {
    if (!selectedSale?.id || selectedSale.payment_status !== "partial" || (selectedSale.remaining_payment ?? 0) <= 0) return;
    setConfirmingRemaining(true);
    const collectedAt = new Date().toISOString();
    const dueDate = selectedSale.remaining_payment_due_date ? new Date(selectedSale.remaining_payment_due_date).getTime() : null;
    const isLate = dueDate != null && new Date(collectedAt).getTime() > dueDate;
    try {
      const { error } = await supabase
        .from("sales")
        .update({
          payment_status: "completed",
          remaining_payment: 0,
          remaining_payment_collected_at: collectedAt,
          updated_at: collectedAt,
        })
        .eq("id", selectedSale.id);
      if (error) {
        showToast(error.message || "تعذر تحديث حالة الدفع", "error");
        setConfirmingRemaining(false);
        return;
      }
      const { data: user } = await supabase.auth.getUser();
      const buildingName = (selectedSale as SaleRow & { buildings?: { name: string } | null }).buildings?.name ?? "—";
      await supabase.from("activity_logs").insert({
        user_id: user?.user?.id ?? null,
        action_type: "remaining_payment_collected",
        action_description: `تأكيد تحصيل المتبقي — بيع ${selectedSale.id} — ${Number(selectedSale.remaining_payment).toLocaleString("en")} ر.س — تحوّل إلى دفع مكتمل`,
        metadata: {
          sale_id: selectedSale.id,
          collected_amount: selectedSale.remaining_payment,
          due_date: selectedSale.remaining_payment_due_date ?? null,
          collected_at: collectedAt,
          building_id: selectedSale.building_id,
          building_name: buildingName,
          buyer_name: selectedSale.buyer_name ?? null,
        },
      });
      if (isLate && selectedSale.remaining_payment_due_date) {
        await supabase.from("activity_logs").insert({
          user_id: user?.user?.id ?? null,
          action_type: "remaining_payment_collected_late",
          action_description: `تأخير في تحصيل المتبقي — كان الاستحقاق ${new Date(selectedSale.remaining_payment_due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })} — تم الدفع في ${new Date(collectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })} — ${buildingName} — ${Number(selectedSale.remaining_payment).toLocaleString("en")} ر.س`,
          metadata: {
            sale_id: selectedSale.id,
            due_date: selectedSale.remaining_payment_due_date,
            collected_at: collectedAt,
            building_id: selectedSale.building_id,
            building_name: buildingName,
            buyer_name: selectedSale.buyer_name ?? null,
            collected_amount: selectedSale.remaining_payment,
          },
        });
      }
      setSelectedSale({
        ...selectedSale,
        payment_status: "completed",
        remaining_payment: 0,
        remaining_payment_collected_at: collectedAt,
      });
      const { rows } = await fetchSalesWithRelations();
      setSales(rows);
      showToast("تم تأكيد التحصيل من النظام. تم تحديث حالة الدفع إلى مكتمل.");
    } catch {
      showToast("حدث خطأ أثناء التأكيد", "error");
    } finally {
      setConfirmingRemaining(false);
    }
  };

  /** حفظ تاريخ استلام العمولة للمسوق */
  const handleSaveCommissionReceived = async () => {
    if (!selectedSale?.id) return;
    const dateStr = commissionReceivedDateLocal.trim();
    if (!dateStr) {
      showToast("اختر تاريخ استلام العمولة", "error");
      return;
    }
    const parsed = new Date(dateStr + "T12:00:00");
    if (Number.isNaN(parsed.getTime())) {
      showToast("تاريخ غير صالح", "error");
      return;
    }
    setSavingCommissionReceived(true);
    try {
      const iso = parsed.toISOString();
      const { error } = await supabase
        .from("sales")
        .update({ commission_received_at: iso, updated_at: new Date().toISOString() })
        .eq("id", selectedSale.id);
      if (error) {
        showToast(error.message || "تعذر حفظ تاريخ الاستلام", "error");
        setSavingCommissionReceived(false);
        return;
      }
      setSelectedSale({ ...selectedSale, commission_received_at: iso });
      const { rows } = await fetchSalesWithRelations();
      setSales(rows);
      showToast("تم تسجيل تاريخ استلام العمولة.");
    } catch {
      showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSavingCommissionReceived(false);
    }
  };

  /** تأجيل استحقاق المبلغ المتبقي — تحديث تاريخ الاستحقاق فقط */
  const handlePostponeRemainingDueDate = async () => {
    if (!selectedSale?.id || selectedSale.payment_status !== "partial" || (selectedSale.remaining_payment ?? 0) <= 0) return;
    const newDate = postponeNewDueDate.trim();
    if (!newDate) {
      showToast("اختر تاريخ استحقاق جديد", "error");
      return;
    }
    const parsed = new Date(newDate + "T12:00:00");
    if (Number.isNaN(parsed.getTime())) {
      showToast("تاريخ غير صالح", "error");
      return;
    }
    setPostponingRemaining(true);
    try {
      const dueDateIso = parsed.toISOString().slice(0, 10);
      const { error } = await supabase
        .from("sales")
        .update({
          remaining_payment_due_date: dueDateIso,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSale.id);
      if (error) {
        showToast(error.message || "تعذر تحديث تاريخ الاستحقاق", "error");
        setPostponingRemaining(false);
        return;
      }
      setSelectedSale({ ...selectedSale, remaining_payment_due_date: dueDateIso });
      const { rows } = await fetchSalesWithRelations();
      setSales(rows);
      setPostponeDueDateOpen(false);
      setPostponeNewDueDate("");
      showToast("تم تأجيل استحقاق المبلغ المتبقي إلى " + new Date(dueDateIso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }));
    } catch {
      showToast("حدث خطأ أثناء التأجيل", "error");
    } finally {
      setPostponingRemaining(false);
    }
  };

  const handleTransferSuccess = async () => {
    const unitIdToRemove = transferUnit?.id;
    setTransferUnit(null);
    setTransferUnits((prev) => (unitIdToRemove ? prev.filter((u) => u.id !== unitIdToRemove) : prev));
    if (selectedBuildingId) {
      supabase
        .from("units")
        .select("*")
        .eq("building_id", selectedBuildingId)
        .neq("status", "sold")
        .order("floor")
        .order("unit_number")
        .then(({ data }) => setTransferUnits((data as TransferUnit[]) || []));
    }
    const { error: salesErr, rows: salesRows } = await fetchSalesWithRelations();
    if (!salesErr && salesRows.length >= 0) setSales(salesRows);
    supabase
      .from("reservations")
      .select("id, unit_id, building_id, customer_name, customer_phone, deposit_amount, receipt_number, reservation_date")
      .in("status", ["active", "pending", "confirmed", "reserved"])
      .order("reservation_date", { ascending: false })
      .then(async ({ data, error }) => {
        if (error || !data?.length) {
          setReservations([]);
          return;
        }
        const unitIds = [...new Set((data as { unit_id: string }[]).map((r) => r.unit_id).filter(Boolean))];
        const buildingIds = [...new Set((data as { building_id: string }[]).map((r) => r.building_id).filter(Boolean))];
        const [unitsRes, buildingsRes] = await Promise.all([
          unitIds.length ? supabase.from("units").select("*").in("id", unitIds) : { data: [] },
          buildingIds.length ? supabase.from("buildings").select("id, name").in("id", buildingIds) : { data: [] },
        ]);
        const unitMap = new Map<string, TransferUnit>();
        (unitsRes.data || []).forEach((u: Record<string, unknown>) => unitMap.set(String(u.id), u as TransferUnit));
        const buildingMap = new Map<string, { name: string }>();
        (buildingsRes.data || []).forEach((b: Record<string, unknown>) => buildingMap.set(String(b.id), { name: String(b.name ?? "") }));
        const rows: ReservationRow[] = data.map((r: Record<string, unknown>) => ({
          ...r,
          unit: unitMap.get(String(r.unit_id)) ?? null,
          building: buildingMap.get(String(r.building_id)) ?? null,
        })) as ReservationRow[];
        setReservations(rows.filter((row) => row.unit != null));
      });
  };

  if (ready && !can("sales")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-amber-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto relative">
        {/* هيدر احترافي */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(245,158,11,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-white/70">
                <RiyalIcon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">إدارة التسويق والمبيعات</h1>
                <p className="text-xs text-gray-500 mt-0.5">سجل المبيعات وإتمام نقل الملكية — تتبع عمليات البيع والمدفوعات</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <Link
                href="/dashboard/marketing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
              >
                إدارة التسويق والمبيعات
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </Link>
            </div>
          </div>
        </header>

        {/* زر واحد للتبديل: إتمام نقل ملكية أو العودة لسجل المبيعات */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tab === "list" ? (
            <button
              type="button"
              onClick={() => setTab("transfer")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600"
            >
              <ArrowRightLeft className="w-4 h-4" />
              إتمام نقل ملكية
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTab("list")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition bg-amber-500 text-white shadow-lg shadow-amber-500/25"
            >
              <FileText className="w-4 h-4" />
              سجل المبيعات
            </button>
          )}
        </div>

        {tab === "list" && (
          <div className="space-y-6">
            {/* ١ — جدول الحجوزات (أولاً لسهولة إتمام البيع من الحجز) */}
            <section className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600">
                    <ArrowRightLeft className="w-5 h-5" />
                  </span>
                  وحدات محجوزة
                  {reservations.length > 0 && (
                    <span className="text-sm font-normal text-slate-500 font-mono">
                      — {reservationsFiltered.length.toLocaleString("en")}
                      {reservationsFiltered.length !== reservations.length ? ` من ${reservations.length.toLocaleString("en")}` : ""} حجز
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">إتمام البيع أو استلام الوحدة من هنا</p>
              </div>
              {!reservationsLoading && reservations.length > 0 && (
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/95">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="relative sm:col-span-2">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="عميل، جوال، سند، عمارة…"
                        value={resSearch}
                        onChange={(e) => setResSearch(e.target.value)}
                        className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80"
                      />
                    </div>
                    <select
                      value={resFilterBuilding}
                      onChange={(e) => setResFilterBuilding(e.target.value)}
                      className="h-10 min-h-10 px-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                    >
                      <option value="">كل العماير</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <select
                      value={resDatePreset}
                      onChange={(e) => applyResDatePreset(e.target.value as DateRangePreset)}
                      className="w-full h-10 min-h-10 min-w-0 px-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="all">كل المدة · تاريخ الحجز</option>
                      <option value="today">اليوم</option>
                      <option value="yesterday">أمس</option>
                      <option value="last_7">آخر 7 أيام</option>
                      <option value="last_14">آخر 14 يوماً</option>
                      <option value="this_month">هذا الشهر</option>
                      <option value="last_30">آخر 30 يوماً</option>
                      <option value="last_month">الشهر الماضي</option>
                      <option value="custom">مخصص</option>
                    </select>
                  </div>
                  {resDatePreset === "custom" && (
                    <div className="mt-2 flex flex-nowrap items-center gap-3 overflow-x-auto pb-0.5">
                      <span className="text-xs font-medium text-slate-500 shrink-0">من</span>
                      <input
                        type="date"
                        value={resDateFrom}
                        onChange={(e) => { setResDateFrom(e.target.value); setResDatePreset("custom"); }}
                        className="h-9 min-w-[9.5rem] flex-1 sm:flex-none sm:w-40 px-3 rounded-full border border-slate-200/90 bg-white text-xs shadow-sm"
                      />
                      <span className="text-xs font-medium text-slate-500 shrink-0">إلى</span>
                      <input
                        type="date"
                        value={resDateTo}
                        onChange={(e) => { setResDateTo(e.target.value); setResDatePreset("custom"); }}
                        className="h-9 min-w-[9.5rem] flex-1 sm:flex-none sm:w-40 px-3 rounded-full border border-slate-200/90 bg-white text-xs shadow-sm"
                      />
                    </div>
                  )}
                </div>
              )}
              {reservationsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">لا توجد وحدات محجوزة حالياً — يمكن إنشاء حجوزات من إدارة التسويق والمبيعات / الحجوزات</div>
              ) : reservationsFiltered.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">لا نتائج تطابق البحث أو الفلتر — جرّب تغيير المعايير</div>
              ) : (
                <>
                  <div className="overflow-auto max-h-[22rem] border-b border-slate-100" style={{ minHeight: "8rem" }}>
                    <table className="w-full text-center border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                        <tr className="border-b border-slate-200">
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">العمارة</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">الوحدة</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">العميل</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">جوال</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">العربون</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">رقم السند</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationsPaginated.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition">
                            <td className="p-3 text-slate-800 font-medium">
                              {r.building && typeof r.building === "object" && "name" in r.building ? String(r.building.name) : "—"}
                            </td>
                            <td className="p-3 text-slate-700">
                              {r.unit && "unit_number" in r.unit && "floor" in r.unit
                                ? `د ${(r.unit as TransferUnit).floor} — وحدة ${(r.unit as TransferUnit).unit_number}`
                                : "—"}
                            </td>
                            <td className="p-3 text-slate-800 font-medium">{r.customer_name}</td>
                            <td className="p-3 text-slate-600 dir-ltr">{r.customer_phone || "—"}</td>
                            <td className="p-3 text-slate-700 dir-ltr">
                              {r.deposit_amount != null ? Number(r.deposit_amount).toLocaleString("en") : "—"}
                            </td>
                            <td className="p-3 text-slate-600 text-sm font-mono">{formatReceiptNumberDisplay(r.receipt_number)}</td>
                            <td className="p-3 align-middle">
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                <Link
                                  href={r.unit && typeof r.unit === "object" && "id" in r.unit ? `/dashboard/sales/handover/${(r.unit as TransferUnit).id}` : "#"}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition whitespace-nowrap"
                                  title="استلام ومعاينة الوحدة (قبل إتمام البيع)"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden />
                                  استلام الوحدة
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (r.unit && typeof r.unit === "object" && "id" in r.unit) {
                                      openTransferForUnit(r.unit as TransferUnit, (r.building && typeof r.building === "object" && "name" in r.building ? String(r.building.name) : "") || "");
                                    }
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition whitespace-nowrap"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-amber-700" aria-hidden />
                                  إتمام البيع
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reservationsFiltered.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-amber-50/30">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>عرض</span>
                        <select
                          value={reservationsPageSize}
                          onChange={(e) => { setReservationsPageSize(Number(e.target.value)); setReservationsPage(1); }}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                        >
                          {RESERVATIONS_PAGE_SIZES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span className="font-mono">
                          {((reservationsPage - 1) * reservationsPageSize + 1).toLocaleString("en")} - {Math.min(reservationsPage * reservationsPageSize, reservationsFiltered.length).toLocaleString("en")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setReservationsPage((p) => Math.max(1, p - 1))}
                          disabled={reservationsPage <= 1}
                          className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                        >
                          السابق
                        </button>
                        <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                          {reservationsPage.toLocaleString("en")} / {reservationsTotalPages.toLocaleString("en")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReservationsPage((p) => Math.min(reservationsTotalPages, p + 1))}
                          disabled={reservationsPage >= reservationsTotalPages}
                          className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ٢ — سجل المبيعات */}
            <section className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600">
                    <FileText className="w-5 h-5" />
                  </span>
                  سجل المبيعات
                  {sales.length > 0 && (
                    <span className="text-sm font-normal text-slate-500 font-mono">
                      — {salesFiltered.length.toLocaleString("en")}
                      {salesFiltered.length !== sales.length ? ` من ${sales.length.toLocaleString("en")}` : ""} عملية
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">عرض وتفاصيل عمليات البيع المكتملة</p>
              </div>
              {!loading && sales.length > 0 && (
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/95">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    <div className="relative sm:col-span-2">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="مشتري، جوال، عمارة…"
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80"
                      />
                    </div>
                    <select
                      value={salesFilterBuilding}
                      onChange={(e) => setSalesFilterBuilding(e.target.value)}
                      className="h-10 min-h-10 px-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="">كل العماير</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <select
                      value={salesPaymentFilter}
                      onChange={(e) => setSalesPaymentFilter(e.target.value as "all" | "paid" | "remaining")}
                      className="h-10 min-h-10 px-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="all">كل حالات الدفع</option>
                      <option value="paid">مكتمل / مدفوع</option>
                      <option value="remaining">متبقي (جزئي)</option>
                    </select>
                    <select
                      value={salesDatePreset}
                      onChange={(e) => applySalesDatePreset(e.target.value as DateRangePreset)}
                      className="w-full h-10 min-h-10 min-w-0 px-4 rounded-full border border-slate-200/90 bg-white text-sm shadow-sm focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="all">كل المدة · تاريخ البيع</option>
                      <option value="today">اليوم</option>
                      <option value="yesterday">أمس</option>
                      <option value="last_7">آخر 7 أيام</option>
                      <option value="last_14">آخر 14 يوماً</option>
                      <option value="this_month">هذا الشهر</option>
                      <option value="last_30">آخر 30 يوماً</option>
                      <option value="last_month">الشهر الماضي</option>
                      <option value="custom">مخصص</option>
                    </select>
                  </div>
                  {salesDatePreset === "custom" && (
                    <div className="mt-2 flex flex-nowrap items-center gap-3 overflow-x-auto pb-0.5">
                      <span className="text-xs font-medium text-slate-500 shrink-0">من</span>
                      <input
                        type="date"
                        value={salesDateFrom}
                        onChange={(e) => { setSalesDateFrom(e.target.value); setSalesDatePreset("custom"); }}
                        className="h-9 min-w-[9.5rem] flex-1 sm:flex-none sm:w-40 px-3 rounded-full border border-slate-200/90 bg-white text-xs shadow-sm"
                      />
                      <span className="text-xs font-medium text-slate-500 shrink-0">إلى</span>
                      <input
                        type="date"
                        value={salesDateTo}
                        onChange={(e) => { setSalesDateTo(e.target.value); setSalesDatePreset("custom"); }}
                        className="h-9 min-w-[9.5rem] flex-1 sm:flex-none sm:w-40 px-3 rounded-full border border-slate-200/90 bg-white text-xs shadow-sm"
                      />
                    </div>
                  )}
                </div>
              )}
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : sales.length === 0 && !loading ? (
                <div className="text-center py-16 text-slate-500">
                  <RiyalIcon className="w-14 h-14 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">
                    {salesError ? "تعذر تحميل سجل المبيعات" : "لا توجد مبيعات مسجلة"}
                  </p>
                  <p className="text-sm mt-1">
                    {salesError ? salesError : "استخدم «إتمام نقل ملكية» أو الوحدات المحجوزة أعلاه لتسجيل أول عملية بيع"}
                  </p>
                </div>
              ) : salesFiltered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">لا نتائج تطابق البحث أو الفلتر — جرّب تغيير المعايير</div>
              ) : (
                <>
                  <div className="overflow-auto max-h-[30rem] border-b border-slate-100" style={{ minHeight: "12rem" }}>
                    <table className="w-full text-center border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                        <tr className="border-b border-slate-200">
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">#</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">العمارة</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">الوحدة</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">المشتري</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">جوال</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">تاريخ البيع</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">السعر</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">حالة الدفع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesPaginated.map((s, i) => (
                          <tr
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedSale(s)}
                            onKeyDown={(e) => e.key === "Enter" && setSelectedSale(s)}
                            className="border-b border-slate-100 hover:bg-amber-50/30 transition cursor-pointer"
                          >
                            <td className="p-3 text-slate-500 text-sm">{(salesPage - 1) * salesPageSize + i + 1}</td>
                            <td className="p-3 text-slate-800 font-medium">
                              {s.buildings && typeof s.buildings === "object" && "name" in s.buildings ? String((s.buildings as { name: string }).name) : "—"}
                            </td>
                            <td className="p-3 text-slate-700">
                              {s.units && typeof s.units === "object" && "unit_number" in s.units && "floor" in s.units
                                ? `د ${(s.units as { floor: number }).floor} — وحدة ${(s.units as { unit_number: string }).unit_number}`
                                : "—"}
                            </td>
                            <td className="p-3 text-slate-800 font-medium">{s.buyer_name}</td>
                            <td className="p-3 text-slate-600 dir-ltr">{s.buyer_phone || "—"}</td>
                            <td className="p-3 text-slate-600">{s.sale_date?.slice(0, 10) || "—"}</td>
                            <td className="p-3 text-slate-800 font-medium dir-ltr">{Number(s.sale_price).toLocaleString("en")}</td>
                            <td className="p-3">
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
                                    s.payment_status === "completed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : s.payment_status === "partial"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      s.payment_status === "completed" ? "bg-emerald-500" : s.payment_status === "partial" ? "bg-amber-500" : "bg-slate-400"
                                    }`}
                                    aria-hidden
                                  />
                                  {s.payment_status === "completed" ? "مكتمل" : s.payment_status === "partial" ? "جزئي" : "قيد الانتظار"}
                                </span>
                                {s.payment_status === "partial" && s.remaining_payment != null && s.remaining_payment > 0 && (
                                  <span className="text-[10px] text-amber-700 dir-ltr">
                                    متبقي {Number(s.remaining_payment).toLocaleString("en")} ر.س
                                    {s.remaining_payment_due_date ? ` · ${new Date(s.remaining_payment_due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}` : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {salesFiltered.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>عرض</span>
                        <select
                          value={salesPageSize}
                          onChange={(e) => { setSalesPageSize(Number(e.target.value)); setSalesPage(1); }}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                        >
                          {SALES_PAGE_SIZES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span className="font-mono">
                          {((salesPage - 1) * salesPageSize + 1).toLocaleString("en")} - {Math.min(salesPage * salesPageSize, salesFiltered.length).toLocaleString("en")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                          disabled={salesPage <= 1}
                          className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                        >
                          السابق
                        </button>
                        <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                          {salesPage.toLocaleString("en")} / {salesTotalPages.toLocaleString("en")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSalesPage((p) => Math.min(salesTotalPages, p + 1))}
                          disabled={salesPage >= salesTotalPages}
                          className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {tab === "transfer" && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                إتمام نقل ملكية
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">اختر العمارة ثم الوحدة المراد تسجيل نقل ملكيتها (مباعة)</p>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">اختر العمارة</label>
                <select
                  value={selectedBuildingId ?? ""}
                  onChange={(e) => setSelectedBuildingId(e.target.value || null)}
                  className="w-full max-w-md border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">— اختر العمارة —</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              {transferUnitsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : !selectedBuildingId ? (
                <div className="text-center py-12 text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>اختر عمارة لعرض الوحدات المتاحة لنقل الملكية</p>
                </div>
              ) : transferUnits.length === 0 ? (
                <div className="text-center py-12 text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Hash className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>لا توجد وحدات غير مباعة في هذه العمارة</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-600 mb-2">الوحدات المتاحة</p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-xs font-semibold text-slate-600">رقم الوحدة</th>
                        <th className="p-3 text-xs font-semibold text-slate-600">الدور</th>
                        <th className="p-3 text-xs font-semibold text-slate-600">الحالة</th>
                        <th className="p-3 text-xs font-semibold text-slate-600">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferUnits.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition">
                          <td className="p-3 font-medium text-slate-800">{u.unit_number}</td>
                          <td className="p-3 text-slate-600">{u.floor}</td>
                          <td className="p-3">
                            <UnitStatusBadge status={u.status as "available" | "reserved" | "sold"} />
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => openTransferForUnit(u, buildings.find((b) => b.id === selectedBuildingId)?.name ?? "")}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                              نقل ملكية
                            </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
                </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {/* مودال تفاصيل عملية البيع — الطباعة عبر نافذة A4 */}
      {selectedSale && (
        <>
          <div className="dashboard-modal-overlay bg-slate-900/30" onClick={() => setSelectedSale(null)}>
            <div className="dashboard-modal-shell max-w-lg w-full max-h-[90vh] overflow-y-auto overflow-x-hidden dashboard-modal-scroll p-6 relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("sale-detail-print");
                      if (!el) return;
                      const content = el.innerHTML;
                      const cssLink = document.querySelector('link[rel="stylesheet"][href*="_next"]') as HTMLLinkElement | null;
                      const cssHref = cssLink?.href ?? "";
                      const html = "<!DOCTYPE html><html dir=\"rtl\" lang=\"ar\"><head><meta charset=\"utf-8\"><title>بطاقة تفاصيل البيع</title>"
                        + (cssHref ? "<link rel=\"stylesheet\" href=\"" + cssHref + "\">" : "")
                        + "<style>@page{size:A4;margin:15mm}body{width:210mm;margin:0 auto;padding:15mm 15mm 15mm 34mm;min-height:297mm;box-sizing:border-box;background:#fff}</style></head><body>"
                        + content + "</body></html>";
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(html);
                      w.document.close();
                      w.onload = () => {
                        setTimeout(() => { w.focus(); w.print(); w.close(); }, 300);
                      };
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    طباعة
                  </button>
                  <button type="button" onClick={() => setSelectedSale(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="إغلاق">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="sale-print-wrapper" style={{ position: "relative" }}>
              <div id="sale-detail-print" className="bg-white text-slate-800">
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <h1 className="text-xl font-bold text-slate-900 text-center">بطاقة تفاصيل عملية البيع</h1>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <section>
                    <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      الوحدة والعمارة
                    </h2>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <p className="flex justify-between text-sm"><span className="text-slate-500">العمارة</span><span className="font-medium">{selectedSale.buildings && typeof selectedSale.buildings === "object" && "name" in selectedSale.buildings ? String((selectedSale.buildings as { name: string }).name) : "—"}</span></p>
                      <p className="flex justify-between text-sm"><span className="text-slate-500">الوحدة</span><span className="font-medium dir-ltr">{selectedSale.units && typeof selectedSale.units === "object" && "unit_number" in selectedSale.units && "floor" in selectedSale.units ? `د ${(selectedSale.units as { floor: number }).floor} — وحدة ${(selectedSale.units as { unit_number: string }).unit_number}` : "—"}</span></p>
                    </div>
                  </section>
                  <section>
                    <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      بيانات المشتري
                    </h2>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <p className="flex justify-between text-sm"><span className="text-slate-500">اسم المشتري</span><span className="font-medium">{selectedSale.buyer_name || "—"}</span></p>
                      <p className="flex justify-between text-sm"><span className="text-slate-500">جوال المشتري</span><span className="font-medium dir-ltr">{selectedSale.buyer_phone || "—"}</span></p>
                      {(selectedSale.buyer_email ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">البريد الإلكتروني</span><span className="font-medium dir-ltr">{selectedSale.buyer_email}</span></p>}
                      {(selectedSale.buyer_id_number ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">رقم هوية المشتري</span><span className="font-medium dir-ltr">{selectedSale.buyer_id_number}</span></p>}
                      {selectedSaleUnit && (
                        <>
                          <p className="flex justify-between text-sm"><span className="text-slate-500">الإعفاء الضريبي</span><span className="font-medium">{selectedSaleUnit.tax_exemption_status === true ? "نعم" : selectedSaleUnit.tax_exemption_status === false ? "لا" : "—"}</span></p>
                          {(selectedSaleUnit.tax_exemption_file_url ?? "").toString().trim() && (
                            <p className="flex justify-between text-sm items-center gap-2"><span className="text-slate-500">مرفق الإعفاء الضريبي</span><a href={String(selectedSaleUnit.tax_exemption_file_url)} target="_blank" rel="noopener noreferrer" className="font-medium dir-ltr text-amber-600 hover:underline text-xs break-all">رابط الملف</a></p>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                  {((saleLinkedReservation?.marketer_name ?? saleLinkedReservation?.marketer_phone) || selectedSale.commission_amount != null) && (
                    <section>
                      <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        بيانات المسوق
                      </h2>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        {(saleLinkedReservation?.marketer_name ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">اسم المسوق</span><span className="font-medium">{saleLinkedReservation?.marketer_name}</span></p>}
                        {(saleLinkedReservation?.marketer_phone ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">جوال المسوق</span><span className="font-medium dir-ltr">{saleLinkedReservation?.marketer_phone}</span></p>}
                        <p className="flex justify-between text-sm"><span className="text-slate-500">عمولة البيع</span><span className="font-medium">{selectedSale.commission_amount != null ? `${Number(selectedSale.commission_amount).toLocaleString("en")} ر.س` : "لا يوجد عمولة بيع"}</span></p>
                        {selectedSale.commission_amount != null && selectedSale.commission_amount > 0 && (
                          <div className="pt-2 border-t border-slate-200/80 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!selectedSale.commission_received_at || showCommissionReceivedDateField}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setShowCommissionReceivedDateField(true);
                                    setCommissionReceivedDateLocal(new Date().toISOString().slice(0, 10));
                                  } else {
                                    setShowCommissionReceivedDateField(false);
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-sm font-medium text-slate-700">تأكيد استلام العمولة</span>
                            </label>
                            {showCommissionReceivedDateField && (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="date"
                                  value={commissionReceivedDateLocal}
                                  onChange={(e) => setCommissionReceivedDateLocal(e.target.value)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm dir-ltr"
                                />
                                {!selectedSale.commission_received_at ? (
                                  <button
                                    type="button"
                                    onClick={handleSaveCommissionReceived}
                                    disabled={savingCommissionReceived}
                                    className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
                                  >
                                    {savingCommissionReceived ? "جاري..." : "حفظ"}
                                  </button>
                                ) : (
                                  <span className="text-sm text-slate-600 dir-ltr">
                                    تم الاستلام في {new Date(selectedSale.commission_received_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  <section>
                    <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <RiyalIcon className="w-4 h-4" />
                      تفاصيل البيع والدفع
                    </h2>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <p className="flex justify-between text-sm"><span className="text-slate-500">سعر البيع</span><span className="font-bold dir-ltr">{Number(selectedSale.sale_price).toLocaleString("en")} ر.س</span></p>
                      <p className="flex justify-between text-sm"><span className="text-slate-500">طريقة الدفع</span><span className="font-medium">{(selectedSale.payment_method ?? "").split(",").map((m) => m.trim()).filter(Boolean).map((m) => (m === "cash" ? "كاش" : m === "transfer" ? "تحويل" : m === "certified_check" ? "شيك مصدق" : m)).join(" + ") || "—"}</span></p>
                      {selectedSaleUnit?.transfer_cash_amount != null && Number(selectedSaleUnit.transfer_cash_amount) > 0 && (
                        <>
                          <p className="flex justify-between text-sm"><span className="text-slate-500">مبلغ الكاش</span><span className="font-medium dir-ltr">{Number(selectedSaleUnit.transfer_cash_amount).toLocaleString("en")} ر.س</span></p>
                          <div className="border-t border-slate-200/80 my-2" />
                        </>
                      )}
                      {selectedSaleUnit?.transfer_amount != null && Number(selectedSaleUnit.transfer_amount) > 0 && <p className="flex justify-between text-sm"><span className="text-slate-500">مبلغ الحوالة</span><span className="font-medium dir-ltr">{Number(selectedSaleUnit.transfer_amount).toLocaleString("en")} ر.س</span></p>}
                      {(selectedSaleUnit?.transfer_bank_name ?? "").toString().trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">اسم البنك (تحويل)</span><span className="font-medium">{String(selectedSaleUnit?.transfer_bank_name ?? "")}</span></p>}
                      {(selectedSaleUnit?.transfer_reference_number ?? "").toString().trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">رقم الحوالة</span><span className="font-medium dir-ltr">{String(selectedSaleUnit?.transfer_reference_number ?? "")}</span></p>}
                      {((selectedSaleUnit?.transfer_bank_name ?? "").toString().trim() || (selectedSaleUnit?.transfer_amount != null && Number(selectedSaleUnit.transfer_amount) > 0) || (selectedSaleUnit?.transfer_reference_number ?? "").toString().trim()) && <div className="border-t border-slate-200/80 my-2" />}
                      {selectedSaleUnit?.transfer_check_amount != null && Number(selectedSaleUnit.transfer_check_amount) > 0 && (
                        <>
                          <p className="flex justify-between text-sm"><span className="text-slate-500">مبلغ الشيك المصدق</span><span className="font-medium dir-ltr">{Number(selectedSaleUnit.transfer_check_amount).toLocaleString("en")} ر.س</span></p>
                          {(selectedSaleUnit?.transfer_check_number ?? "").toString().trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">رقم الشيك</span><span className="font-medium dir-ltr">{String(selectedSaleUnit.transfer_check_number)}</span></p>}
                          <div className="border-t border-slate-200/80 my-2" />
                        </>
                      )}
                      <p className="flex justify-between text-sm"><span className="text-slate-500">المدفوع</span><span className="font-medium dir-ltr">{Number((selectedSale.sale_price ?? 0) - (selectedSale.remaining_payment ?? 0)).toLocaleString("en")} ر.س</span></p>
                      {(selectedSale.remaining_payment != null && selectedSale.remaining_payment > 0) && (
                        <>
                          <p className="flex justify-between text-sm"><span className="text-slate-500">المبلغ المتبقي</span><span className="font-medium dir-ltr text-amber-700">{Number(selectedSale.remaining_payment).toLocaleString("en")} ر.س</span></p>
                          {selectedSale.remaining_payment_due_date && <p className="flex justify-between text-sm"><span className="text-slate-500">تاريخ استحقاق المتبقي</span><span className="font-medium dir-ltr">{new Date(selectedSale.remaining_payment_due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></p>}
                        </>
                      )}
                      {selectedSale.payment_status === "completed" && selectedSale.remaining_payment_collected_at && (
                        <p className="flex justify-between text-sm"><span className="text-slate-500">تم تحصيل المبلغ المتبقي</span><span className="font-medium dir-ltr text-emerald-700">تم الدفع في {new Date(selectedSale.remaining_payment_collected_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></p>
                      )}
                      <p className="flex justify-between items-center gap-2 text-sm"><span className="text-slate-500">حالة الدفع</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${selectedSale.payment_status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : selectedSale.payment_status === "partial" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedSale.payment_status === "completed" ? "bg-emerald-500" : selectedSale.payment_status === "partial" ? "bg-amber-500" : "bg-slate-400"}`} aria-hidden />
                          {selectedSale.payment_status === "completed" ? "مكتمل" : selectedSale.payment_status === "partial" ? "جزئي" : "قيد الانتظار"}
                        </span></p>
                      {selectedSale.payment_status === "partial" && (selectedSale.remaining_payment ?? 0) > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                          <button
                            type="button"
                            onClick={() => setConfirmRemainingCollectOpen(true)}
                            disabled={confirmingRemaining}
                            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                            {confirmingRemaining ? "جاري التأكيد..." : "تأكيد تحصيل المتبقي"}
                          </button>
                          {confirmRemainingCollectOpen && (
                            <div className="dashboard-modal-overlay-z60 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmRemainingCollectOpen(false)}>
                              <div className="dashboard-modal-shell max-w-md w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
                                <div className="shrink-0 px-6 pt-5 pb-3 border-b border-emerald-100 bg-gradient-to-b from-emerald-50/95 to-white rounded-t-2xl">
                                  <p className="text-slate-800 font-medium text-center text-sm">تأكيد تحصيل المتبقي</p>
                                </div>
                                <div className="px-6 py-4 space-y-3 overflow-y-auto dashboard-modal-scroll dashboard-modal-scroll-gutter-auto max-h-[40vh]">
                                  <p className="text-slate-800 font-medium text-center">
                                    المبلغ: <span className="dir-ltr font-bold text-emerald-700">{Number(selectedSale.remaining_payment).toLocaleString("en")} ر.س</span>
                                  </p>
                                  <p className="text-sm text-slate-500 text-center">هل أنت متأكد؟ سيتم تحديث حالة الدفع إلى مكتمل.</p>
                                </div>
                                <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-emerald-100/80 bg-emerald-50/30 rounded-b-2xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmRemainingCollectOpen(false);
                                      handleConfirmRemainingCollected();
                                    }}
                                    disabled={confirmingRemaining}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
                                  >
                                    {confirmingRemaining ? "جاري..." : "تأكيد"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemainingCollectOpen(false)}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {!postponeDueDateOpen ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPostponeDueDateOpen(true);
                                setPostponeNewDueDate(selectedSale.remaining_payment_due_date?.slice(0, 10) ?? "");
                              }}
                              className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100 transition"
                            >
                              <CalendarClock className="w-4 h-4" />
                              تأجيل الدفعة المتبقية
                            </button>
                          ) : (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                              <label className="block text-sm font-medium text-slate-700">تاريخ استحقاق جديد</label>
                              <input
                                type="date"
                                value={postponeNewDueDate}
                                onChange={(e) => setPostponeNewDueDate(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handlePostponeRemainingDueDate}
                                  disabled={postponingRemaining || !postponeNewDueDate.trim()}
                                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {postponingRemaining ? "جاري الحفظ..." : "تأكيد التأجيل"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setPostponeDueDateOpen(false); setPostponeNewDueDate(""); }}
                                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {(selectedSale.notes ?? "").trim() && <p className="text-sm mt-2"><span className="text-slate-500 block mb-1">ملاحظات</span><span className="font-medium">{(selectedSale.notes ?? "").replace(/نقل ملكية/g, "نقل الملكية")}</span></p>}
                      {(selectedSale.contract_url ?? "").trim() && <p className="text-sm mt-2"><span className="text-slate-500 block mb-1">رابط العقد</span><span className="font-medium break-all dir-ltr text-xs">{selectedSale.contract_url}</span></p>}
                    </div>
                  </section>
                  {(selectedSaleUnit && Object.keys(selectedSaleUnit).length > 0) || selectedSaleHandover ? (
                    <section>
                      <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        تفاصيل نقل الملكية والوحدة
                      </h2>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        {(selectedSaleUnit?.previous_owner_name ?? "").toString().trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">المالك السابق</span><span className="font-medium">{String(selectedSaleUnit?.previous_owner_name ?? "")}</span></p>}
                        {selectedSaleUnit && <p className="flex justify-between text-sm"><span className="text-slate-500">نقل عداد الكهرباء مع الوحدة</span><span className="font-medium">{selectedSaleUnit.electricity_meter_transferred_with_sale === true ? "نعم" : "لا"}</span></p>}
                        {selectedSaleUnit && <p className="flex justify-between text-sm"><span className="text-slate-500">حالة غرفة السائق</span><span className="font-medium">{selectedSaleUnit.driver_room_number != null && String(selectedSaleUnit.driver_room_number).trim() ? `رقم ${String(selectedSaleUnit.driver_room_number)} — ${selectedSaleUnit.driver_room_transferred_with_sale === true ? "تم النقل مع الوحدة" : "لم يُنقل مع الوحدة"}` : "غير مسجّلة"}</span></p>}
                        <p className="flex justify-between text-sm"><span className="text-slate-500">الاستلام</span><span className="font-medium dir-ltr">{selectedSaleHandover ? `تم — ${selectedSaleHandover.handover_date ? new Date(selectedSaleHandover.handover_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}` : "لم يُسجّل استلام بعد"}</span></p>
                      </div>
                    </section>
                  ) : null}
                  {saleLinkedReservation && (saleLinkedReservation.deposit_amount != null || saleLinkedReservation.receipt_number || saleLinkedReservation.deposit_settlement_type || saleLinkedReservation.customer_iban_or_account || saleLinkedReservation.customer_bank_name) && (
                    <section>
                      <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        الحجز المرتبط (عربون / مخالصة)
                      </h2>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        {saleLinkedReservation.reservation_date && <p className="flex justify-between text-sm"><span className="text-slate-500">تاريخ الحجز</span><span className="font-medium dir-ltr">{new Date(saleLinkedReservation.reservation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></p>}
                        {saleLinkedReservation.completed_at && <p className="flex justify-between text-sm"><span className="text-slate-500">تاريخ إتمام البيع</span><span className="font-medium dir-ltr">{new Date(saleLinkedReservation.completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></p>}
                        {saleLinkedReservation.deposit_amount != null && <p className="flex justify-between text-sm"><span className="text-slate-500">مبلغ العربون</span><span className="font-medium dir-ltr">{Number(saleLinkedReservation.deposit_amount).toLocaleString("en")} ر.س</span></p>}
                        {(saleLinkedReservation.receipt_number ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">رقم سند العربون</span><span className="font-medium dir-ltr">{formatReceiptNumberDisplay(saleLinkedReservation.receipt_number)}</span></p>}
                        {(saleLinkedReservation.deposit_settlement_type ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">نوع مخالصة العربون</span><span className="font-medium">تم المخالصة</span></p>}
                        {(saleLinkedReservation.customer_iban_or_account ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">آيبان / رقم الحساب للاسترداد</span><span className="font-medium dir-ltr text-xs">{saleLinkedReservation.customer_iban_or_account}</span></p>}
                        {(saleLinkedReservation.customer_bank_name ?? "").trim() && <p className="flex justify-between text-sm"><span className="text-slate-500">بنك الاسترداد</span><span className="font-medium">{saleLinkedReservation.customer_bank_name}</span></p>}
                      </div>
                    </section>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-6 text-center">تم الإنشاء من لوحة إدارة التسويق والمبيعات — <span className="dir-ltr">{selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</span></p>
              </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* مودال إتمام نقل الملكية — نفس غلاف النوافذ الموحّد */}
      {transferUnit && (
        <div className="app-modal-root dashboard-modal-overlay" onClick={closeTransferModal}>
          <div
            className="dashboard-modal-shell max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 bg-gradient-to-b from-amber-50/90 to-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">نقل الملكية</h2>
              <button
                type="button"
                onClick={closeTransferModal}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto dashboard-modal-scroll dashboard-modal-scroll-gutter-auto px-6 py-4">
              <div className="space-y-1 pe-0.5">
                <TransferOwnershipForm
                  unit={transferUnit}
                  buildingId={transferUnit.building_id}
                  buildingName={transferBuildingName}
                  onSuccess={handleTransferSuccess}
                  onCancel={closeTransferModal}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
