"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  FileUp,
  CreditCard,
  CheckCircle2,
  CheckCheck,
  ArrowRightLeft,
} from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import { phoneDigitsOnly, isValidPhone10Digits } from "@/lib/validation-utils";

const INVESTOR_DOCS_BUCKET = "building-documents";
const INVESTOR_DOCS_PREFIX = "investors";
const UNIT_INVESTMENT_DOCS_PREFIX = "unit-investments";

/** سياسة المسارين: docs/sales-and-investment-policy.md. إغلاق صفقة الاستثمار (رأس المال، الربح، نسبة الإغلاق): docs/investment-deal-closing-policy.md */

const NUM_LOCALE = "en";
function formatNum(n: number): string {
  return n.toLocaleString(NUM_LOCALE);
}
function formatDateEn(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d + "T12:00:00");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** مدة بين تاريخين: سنوات، أشهر، أيام */
function getDuration(start: string, end: string): { years: number; months: number; days: number } {
  const a = new Date(start + "T12:00:00");
  const b = new Date(end + "T12:00:00");
  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();
  if (days < 0) {
    months -= 1;
    const lastMonth = new Date(b.getFullYear(), b.getMonth(), 0);
    days += lastMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** الأيام الفعلية بين تاريخين (للاتساق بين مدة العقد والمتبقي) */
function getCalendarDaysBetween(start: string, end: string): number {
  const a = new Date(start + "T12:00:00");
  const b = new Date(end + "T12:00:00");
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/** مدة العقد والمنقضي والمتبقي بالأيام الفعلية؛ للعرض: شهر = ٣٠ يوم (المنقضي + المتبقي = مدة العقد) */
function getDurationAndRemaining(start: string, due: string): { totalDays: number; elapsedDays: number; remainingDays: number; durationYMD: { y: number; m: number; d: number }; elapsedYMD: { y: number; m: number; d: number }; remainingYMD: { y: number; m: number; d: number } } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(due + "T12:00:00");
  end.setHours(0, 0, 0, 0);
  if (end.getTime() < today.getTime()) return null;
  const startStr = start.slice(0, 10);
  const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const totalDays = getCalendarDaysBetween(startStr, due);
  const elapsedDays = getCalendarDaysBetween(startStr, todayStr);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const toYMD = (days: number) => ({ y: 0, m: Math.floor(days / 30), d: days % 30 });
  return {
    totalDays,
    elapsedDays,
    remainingDays,
    durationYMD: toYMD(totalDays),
    elapsedYMD: toYMD(elapsedDays),
    remainingYMD: toYMD(remainingDays),
  };
}

/** المتبقي من اليوم حتى تاريخ الاستحقاق (عند عدم وجود تاريخ بدء نستخدم getDuration من اليوم) */
function getRemaining(due: string, start?: string | null): { years: number; months: number; days: number } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(due + "T12:00:00");
  end.setHours(0, 0, 0, 0);
  if (end.getTime() < today.getTime()) return null;
  if (start) {
    const data = getDurationAndRemaining(start, due);
    if (!data) return null;
    const { m, d } = data.remainingYMD;
    return { years: 0, months: m, days: d };
  }
  const startStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  return getDuration(startStr, due);
}

function settlementMethodLabel(m: string | null | undefined): string {
  if (!m) return "—";
  if (m === "transfer") return "حوالة";
  if (m === "check") return "شيك مصدق";
  if (m === "cash") return "كاش";
  return m;
}

function settlementTypeLabel(t: string | null | undefined): string {
  if (!t) return "—";
  if (t === "with_capital") return "مع رأس المال";
  if (t === "profit_only") return "الأرباح فقط";
  return t;
}

function formatDuration(y: number, m: number, d: number): string {
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} سنة`);
  if (m > 0) parts.push(`${m} شهر`);
  if (d > 0 || (y > 0 || m > 0)) parts.push(`${d} يوم`);
  return parts.length ? parts.join(" و ") : "0 يوم";
}

/** بناءً على تاريخ الإغلاق واستحقاق العقد: إغلاق مبكر أو تأخير (بالأيام/الأشهر) */
function getClosingTimingLabel(closedAt: string | null | undefined, dueDate: string | null | undefined): { label: string; variant: "early" | "late" | null } | null {
  if (!closedAt || !dueDate) return null;
  const closed = new Date(closedAt + "T12:00:00").getTime();
  const due = new Date(dueDate + "T12:00:00").getTime();
  const diffDays = Math.round((closed - due) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: "تم الإغلاق في موعد استحقاق العقد", variant: null };
  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    const months = Math.floor(abs / 30);
    const days = abs % 30;
    const part = months >= 1 ? (days > 0 ? `${months} شهر و ${days} يوم` : `${months} شهر`) : `${abs} يوم`;
    return { label: `تم الإغلاق قبل انتهاء مدة العقد بـ ${part}`, variant: "early" };
  }
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  const part = months >= 1 ? (days > 0 ? `${months} شهر و ${days} يوم` : `${months} شهر`) : `${diffDays} يوم`;
  return { label: `تأخير إغلاق مدة العقد: ${part}`, variant: "late" };
}

function Row({ label, value, dirLtr, muted }: { label: string; value: string; dirLtr?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between items-start gap-3 py-2 border-b border-slate-100 last:border-0 ${muted ? "rounded-lg bg-slate-100/70 px-3 -mx-3 border-slate-100" : ""}`}>
      <span className={`shrink-0 ${muted ? "text-slate-400 font-medium" : "text-slate-500 font-medium"}`}>{label}</span>
      <span className={`text-left ${dirLtr ? "dir-ltr" : ""} ${muted ? "text-slate-500" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}

type TabType = "building" | "unit";

interface Building {
  id: string;
  name: string;
}

interface BuildingInvestorRow {
  id: string;
  building_id: string;
  owner_id: string;
  investor_name: string;
  investor_phone: string | null;
  investor_email: string | null;
  investor_id_number: string | null;
  profit_percentage: number;
  profit_percentage_to: number | null;
  agreement_type: string;
  total_invested_amount: number | null;
  investment_start_date: string | null;
  investment_due_date: string | null;
  contract_image_path: string | null;
  id_image_path: string | null;
  notes: string | null;
  created_at: string;
  building?: Building | null;
  closed_at?: string | null;
  realized_profit?: number | null;
  closing_percentage?: number | null;
  settlement_method?: string | null;
  settlement_account_iban?: string | null;
  settlement_bank_name?: string | null;
  settlement_type?: string | null;
  transferred_amount?: number | null;
  transferred_from_building_investor_id?: string | null;
  transferred_from_unit_investment_id?: string | null;
  payment_method?: string | null;
  payment_bank_name?: string | null;
  payment_check_number?: string | null;
  payment_check_image_path?: string | null;
}

interface UnitInvestmentRow {
  id: string;
  unit_id: string;
  building_id: string;
  owner_id: string;
  investor_name: string;
  investor_phone: string | null;
  investor_email: string | null;
  investor_id_number: string | null;
  purchase_price: number;
  purchase_date: string | null;
  resale_sale_id: string | null;
  status: string;
  settlement_type?: string | null;
  settlement_method?: string | null;
  settlement_account_iban?: string | null;
  settlement_bank_name?: string | null;
  resale_commission?: number | null;
  admin_fees?: number | null;
  purchase_commission?: number | null;
  notes: string | null;
  created_at: string;
  unit?: { unit_number: string; floor: number } | null;
  building?: Building | null;
  transferred_amount?: number | null;
  transferred_from_building_investor_id?: string | null;
  transferred_from_unit_investment_id?: string | null;
  payment_method?: string | null;
  payment_bank_name?: string | null;
  payment_check_number?: string | null;
  payment_check_image_path?: string | null;
  contract_image_path?: string | null;
  id_image_path?: string | null;
}

/** رأس المال القائم القابل للنقل — عمارة (لمخالصة «أرباح فقط» فقط) */
function capitalStillAvailable(row: BuildingInvestorRow): number {
  if (row.settlement_type !== "profit_only" || !row.closed_at) return 0;
  const total = Number(row.total_invested_amount) || 0;
  const transferred = Number(row.transferred_amount) || 0;
  return Math.max(0, total - transferred);
}

/** السعر الفعلي للشراء = سعر الشراء − عمولة البيع — للعرض وتحليلات المالك فقط (مخالصة المستثمر تُحسب من سعر الشراء الكامل) */
function getEffectivePurchasePrice(row: { purchase_price: number; purchase_commission?: number | null }): number {
  const price = Number(row.purchase_price) || 0;
  const commission = Number(row.purchase_commission) || 0;
  return Math.max(0, price - commission);
}

/** رأس المال القائم القابل للنقل — وحدة (مُعادة بيع + مخالصة «أرباح فقط» فقط) — يُحسب من سعر الشراء الكامل */
function capitalStillAvailableUnit(row: UnitInvestmentRow): number {
  if (row.status !== "resold" || row.settlement_type !== "profit_only") return 0;
  const total = Number(row.purchase_price) || 0;
  const transferred = Number(row.transferred_amount) || 0;
  return Math.max(0, total - transferred);
}

export default function InvestorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();

  const [tab, setTab] = useState<TabType>("building");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingInvestors, setBuildingInvestors] = useState<BuildingInvestorRow[]>([]);
  const [unitInvestments, setUnitInvestments] = useState<UnitInvestmentRow[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string; floor: number; building_id: string; status?: string }[]>([]);
  const [sales, setSales] = useState<{ id: string; unit_id: string; sale_price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<"building" | "unit" | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<BuildingInvestorRow | null>(null);
  const [editingUnit, setEditingUnit] = useState<UnitInvestmentRow | null>(null);
  const [viewingBuildingInvestor, setViewingBuildingInvestor] = useState<BuildingInvestorRow | null>(null);
  const [viewingUnitInvestment, setViewingUnitInvestment] = useState<(UnitInvestmentRow & { resalePrice?: number | null; profit?: number | null }) | null>(null);
  const [cardResaleId, setCardResaleId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingCheck, setUploadingCheck] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [checkImageFile, setCheckImageFile] = useState<File | null>(null);
  const [viewingContractUrl, setViewingContractUrl] = useState<string | null>(null);
  const [viewingIdUrl, setViewingIdUrl] = useState<string | null>(null);
  const [viewingCheckImageUrl, setViewingCheckImageUrl] = useState<string | null>(null);
  const [closingUnitInvestment, setClosingUnitInvestment] = useState<(UnitInvestmentRow & { resalePrice?: number | null; profit?: number | null; buildingName?: string }) | null>(null);
  const [closingUnitSaleId, setClosingUnitSaleId] = useState("");
  const [closingUnitSettlementType, setClosingUnitSettlementType] = useState<"" | "with_capital" | "profit_only">("");
  const [closingUnitCommission, setClosingUnitCommission] = useState("");
  const [closingUnitAdminFees, setClosingUnitAdminFees] = useState("");
  const [closingUnitStep, setClosingUnitStep] = useState<1 | 2 | 3>(1);
  const [closingUnitSettlementMethod, setClosingUnitSettlementMethod] = useState("");
  const [closingUnitSettlementAccountIban, setClosingUnitSettlementAccountIban] = useState("");
  const [closingUnitSettlementBankName, setClosingUnitSettlementBankName] = useState("");
  const [closingBuildingInvestor, setClosingBuildingInvestor] = useState<BuildingInvestorRow | null>(null);
  const [closingBuildingPercentage, setClosingBuildingPercentage] = useState("");
  const [closingSettlementMethod, setClosingSettlementMethod] = useState<string>("");
  const [closingSettlementAccountIban, setClosingSettlementAccountIban] = useState("");
  const [closingSettlementBankName, setClosingSettlementBankName] = useState("");
  const [closingSettlementType, setClosingSettlementType] = useState<"" | "profit_only" | "with_capital">("");
  const [closingStep, setClosingStep] = useState(1);
  const [closingSettlementCashAmount, setClosingSettlementCashAmount] = useState("");
  const [closingSettlementCheckAmount, setClosingSettlementCheckAmount] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "building" | "unit"; id: string; label: string } | null>(null);
  const [buildingPage, setBuildingPage] = useState(1);
  const [buildingPageSize, setBuildingPageSize] = useState(5);
  const BUILDING_PAGE_SIZES = [5, 10, 25, 50, 100] as const;
  const buildingTotalPages = Math.max(1, Math.ceil(buildingInvestors.length / buildingPageSize));
  const buildingInvestorsPaginated = useMemo(
    () => buildingInvestors.slice((buildingPage - 1) * buildingPageSize, buildingPage * buildingPageSize),
    [buildingInvestors, buildingPage, buildingPageSize]
  );
  useEffect(() => {
    if (buildingPage > buildingTotalPages && buildingTotalPages >= 1) setBuildingPage(1);
  }, [buildingPage, buildingTotalPages]);
  const [triggerFileInput, setTriggerFileInput] = useState<"contract" | "id" | null>(null);
  const contractFileInputRef = useRef<HTMLInputElement>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const checkFileInputRef = useRef<HTMLInputElement>(null);
  const contractImageSectionRef = useRef<HTMLDivElement>(null);
  const idImageSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modalOpen !== "building" || !triggerFileInput) return;
    const t = setTimeout(() => {
      if (triggerFileInput === "contract") {
        contractImageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (triggerFileInput === "id") {
        idImageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTriggerFileInput(null);
    }, 100);
    return () => clearTimeout(t);
  }, [modalOpen, triggerFileInput]);
  type TransferSourceRow = BuildingInvestorRow | UnitInvestmentRow;
  const [transferSource, setTransferSource] = useState<TransferSourceRow | null>(null);
  const isTransferSourceBuilding = (r: TransferSourceRow): r is BuildingInvestorRow => "total_invested_amount" in r;
  const getTransferSourceAvailable = (r: TransferSourceRow | null): number =>
    r == null ? 0 : isTransferSourceBuilding(r) ? capitalStillAvailable(r) : capitalStillAvailableUnit(r);
  const getTransferSourceInvestorName = (r: TransferSourceRow | null): string => (r ? (r as { investor_name?: string }).investor_name ?? "—" : "—");
  const [transferTargetType, setTransferTargetType] = useState<"building" | "unit">("building");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferBuildingId, setTransferBuildingId] = useState("");
  const [transferUnitId, setTransferUnitId] = useState("");
  const [transferProfitPct, setTransferProfitPct] = useState("15");
  const [transferProfitPctTo, setTransferProfitPctTo] = useState("");
  const [transferStartDate, setTransferStartDate] = useState("");
  const [transferDueDate, setTransferDueDate] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const [formBuilding, setFormBuilding] = useState({
    building_id: "",
    investor_name: "",
    investor_phone: "",
    investor_id_number: "",
    profit_percentage: "15",
    profit_percentage_to: "",
    agreement_type: "agreed_percentage" as "agreed_percentage" | "from_building_sales",
    total_invested_amount: "",
    investment_start_date: "",
    investment_due_date: "",
    payment_method: "",
    payment_bank_name: "",
    payment_check_number: "",
    payment_check_image_path: "",
    contract_image_path: "",
    id_image_path: "",
    notes: "",
  });

  const [formUnit, setFormUnit] = useState({
    building_id: "",
    unit_id: "",
    investor_name: "",
    investor_phone: "",
    investor_id_number: "",
    purchase_price: "",
    purchase_commission: "",
    purchase_date: "",
    payment_method: "",
    payment_bank_name: "",
    payment_check_number: "",
    payment_check_image_path: "",
    contract_image_path: "",
    id_image_path: "",
    notes: "",
  });
  const [unitCheckImageFile, setUnitCheckImageFile] = useState<File | null>(null);
  const unitCheckFileInputRef = useRef<HTMLInputElement>(null);
  const [unitContractFile, setUnitContractFile] = useState<File | null>(null);
  const [unitIdFile, setUnitIdFile] = useState<File | null>(null);
  const unitContractFileInputRef = useRef<HTMLInputElement>(null);
  const unitIdFileInputRef = useRef<HTMLInputElement>(null);

  const [formUnitResale, setFormUnitResale] = useState<{ resale_sale_id: string; settlement_type: "" | "with_capital" | "profit_only" }>({ resale_sale_id: "", settlement_type: "" });

  useEffect(() => {
    if (!ready) return;
    if (!can("investors_view")) router.replace("/dashboard");
  }, [ready, can, router]);

  useEffect(() => {
    if (!viewingBuildingInvestor) {
      setViewingContractUrl(null);
      setViewingIdUrl(null);
      return;
    }
    const load = async () => {
      if (viewingBuildingInvestor.contract_image_path) {
        const { data } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).createSignedUrl(viewingBuildingInvestor.contract_image_path, 3600);
        setViewingContractUrl(data?.signedUrl ?? null);
      } else setViewingContractUrl(null);
      if (viewingBuildingInvestor.id_image_path) {
        const { data } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).createSignedUrl(viewingBuildingInvestor.id_image_path, 3600);
        setViewingIdUrl(data?.signedUrl ?? null);
      } else setViewingIdUrl(null);
      if (viewingBuildingInvestor.payment_check_image_path) {
        const { data } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).createSignedUrl(viewingBuildingInvestor.payment_check_image_path, 3600);
        setViewingCheckImageUrl(data?.signedUrl ?? null);
      } else setViewingCheckImageUrl(null);
    };
    load();
  }, [viewingBuildingInvestor?.id, viewingBuildingInvestor?.contract_image_path, viewingBuildingInvestor?.id_image_path, viewingBuildingInvestor?.payment_check_image_path, supabase]);

  useEffect(() => {
    if (!effectiveOwnerId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: bData } = await supabase.from("buildings").select("id, name").eq("owner_id", effectiveOwnerId).order("name");
        const buildingList = (bData || []) as Building[];
        setBuildings(buildingList);
        const buildingIds = buildingList.map((b) => b.id);

        const { data: biData } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
        if (biData) {
          const withBuildings = await Promise.all(
            (biData as BuildingInvestorRow[]).map(async (row) => {
              const b = buildingList.find((x) => x.id === row.building_id) ?? null;
              return { ...row, building: b };
            })
          );
          setBuildingInvestors(withBuildings);
        }

        let unitsList: { id: string; unit_number: number; floor: number; building_id: string; status?: string }[] = [];
        if (buildingIds.length) {
          const { data: uData } = await supabase.from("units").select("id, unit_number, floor, building_id, status").in("building_id", buildingIds);
          if (uData) {
            unitsList = uData as typeof unitsList;
            setUnits(uData as typeof units);
          }
          const { data: sData } = await supabase.from("sales").select("id, unit_id, sale_price").in("building_id", buildingIds);
          if (sData) setSales(sData as typeof sales);
        }

        const { data: uiData, error: uiError } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
        if (uiError) {
          showToast("تحميل استثمارات الوحدات: " + (uiError.message || "خطأ"), "error");
        }
        if (uiData && Array.isArray(uiData)) {
          const enriched = (uiData as UnitInvestmentRow[]).map((r) => {
            const b = buildingList.find((x) => x.id === r.building_id) ?? null;
            const u = unitsList.find((x) => x.id === r.unit_id) ?? null;
            return { ...r, building: b, unit: u ? { unit_number: String(u.unit_number), floor: u.floor } : null };
          });
          setUnitInvestments(enriched);
        } else {
          setUnitInvestments([]);
        }
      } catch (e) {
        showToast("فشل تحميل بيانات المستثمرين", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [effectiveOwnerId, supabase]);

  useEffect(() => {
    if (viewingUnitInvestment) setCardResaleId(viewingUnitInvestment.resale_sale_id || "");
  }, [viewingUnitInvestment?.id, viewingUnitInvestment?.resale_sale_id]);

  const canEdit = can("investors_edit");

  const saveUnitResaleLink = async () => {
    if (!viewingUnitInvestment || !effectiveOwnerId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("unit_investments")
        .update({ resale_sale_id: cardResaleId || null, status: cardResaleId ? "resold" : "under_construction" })
        .eq("id", viewingUnitInvestment.id);
      if (error) throw error;
      showToast("تم تحديث ربط إعادة البيع");
      const { data } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
      if (data && Array.isArray(data)) {
        const enriched = (data as UnitInvestmentRow[]).map((r) => {
          const b = buildings.find((x) => x.id === r.building_id) ?? null;
          const u = units.find((x) => x.id === r.unit_id) ?? null;
          const resalePrice = r.resale_sale_id ? sales.find((s) => s.id === r.resale_sale_id)?.sale_price ?? null : null;
          const profit = resalePrice != null ? resalePrice - Number(r.purchase_price) : null;
          return { ...r, building: b, unit: u ? { unit_number: String(u.unit_number), floor: u.floor } : null, resalePrice, profit };
        });
        setUnitInvestments(enriched);
        const updated = enriched.find((x) => x.id === viewingUnitInvestment.id);
        if (updated) setViewingUnitInvestment(updated);
      }
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message || "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmCloseUnitDeal = async () => {
    if (!closingUnitInvestment || !closingUnitSaleId || !effectiveOwnerId) {
      showToast("اختر عملية البيع لإغلاق الصفقة.", "error");
      return;
    }
    if (!closingUnitSettlementType) {
      showToast("اختر نوع المخالصة: مع رأس المال أو أرباح فقط.", "error");
      return;
    }
    if (!closingUnitSettlementMethod) {
      showToast("اختر طريقة المخالصة: كاش أو تحويل أو شيك مصدق.", "error");
      return;
    }
    const toNum = (s: string) => { const d = (s || "").replace(/\D/g, ""); return d.length > 0 ? Number(d) : 0; };
    const commission = toNum(closingUnitCommission);
    const adminFees = toNum(closingUnitAdminFees);
    const methodValue = closingUnitSettlementMethod === "حوالة" ? "transfer" : closingUnitSettlementMethod === "شيك" ? "check" : closingUnitSettlementMethod === "كاش" ? "cash" : null;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("unit_investments")
        .update({
          resale_sale_id: closingUnitSaleId,
          status: "resold",
          settlement_type: closingUnitSettlementType,
          resale_commission: commission,
          admin_fees: adminFees,
          settlement_method: methodValue,
          settlement_account_iban: closingUnitSettlementAccountIban.trim() || null,
          settlement_bank_name: closingUnitSettlementBankName.trim() || null,
        })
        .eq("id", closingUnitInvestment.id);
      if (error) throw error;
      showToast("تم إغلاق الصفقة وتوثيق الربط.");
      const { data } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
      if (data && Array.isArray(data)) {
        const enriched = (data as UnitInvestmentRow[]).map((r) => {
          const b = buildings.find((x) => x.id === r.building_id) ?? null;
          const u = units.find((x) => x.id === r.unit_id) ?? null;
          const resalePrice = r.resale_sale_id ? sales.find((s) => s.id === r.resale_sale_id)?.sale_price ?? null : null;
          const profit = resalePrice != null ? resalePrice - Number(r.purchase_price) : null;
          return { ...r, building: b, unit: u ? { unit_number: String(u.unit_number), floor: u.floor } : null, resalePrice, profit };
        });
        setUnitInvestments(enriched);
      }
      setClosingUnitInvestment(null);
      setClosingUnitSaleId("");
      setClosingUnitSettlementType("");
      setClosingUnitCommission("");
      setClosingUnitAdminFees("");
      setClosingUnitStep(1);
      setClosingUnitSettlementMethod("");
      setClosingUnitSettlementAccountIban("");
      setClosingUnitSettlementBankName("");
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message || "فشل إغلاق الصفقة", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmCloseBuildingDeal = async () => {
    if (!closingBuildingInvestor || !effectiveOwnerId) return;
    const capital = closingBuildingInvestor.total_invested_amount != null ? Number(closingBuildingInvestor.total_invested_amount) : 0;
    const pctMin = Number(closingBuildingInvestor.profit_percentage);
    const pctMax = closingBuildingInvestor.profit_percentage_to != null ? Number(closingBuildingInvestor.profit_percentage_to) : pctMin;
    const pctStr = closingBuildingPercentage.replace(/,/g, ".").trim();
    const pct = pctStr ? parseFloat(pctStr) : NaN;
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showToast("أدخل نسبة الإغلاق النهائية (رقم بين " + pctMin + "% و " + pctMax + "%).", "error");
      return;
    }
    if (pct < Math.min(pctMin, pctMax) || pct > Math.max(pctMin, pctMax)) {
      showToast("نسبة الإغلاق يجب أن تكون ضمن النطاق المتفق عليه في العقد (" + pctMin + "% – " + pctMax + "%).", "error");
      return;
    }
    const realized = Math.round((capital * pct) / 100);
    setSaving(true);
    try {
      const methodValue = closingSettlementMethod === "حوالة" ? "transfer" : closingSettlementMethod === "شيك" ? "check" : closingSettlementMethod === "كاش" ? "cash" : null;
      const settlementTypeValue = closingSettlementType === "with_capital" ? "with_capital" : "profit_only";
      const { error } = await supabase
        .from("building_investors")
        .update({
          closed_at: new Date().toISOString().slice(0, 10),
          realized_profit: realized,
          closing_percentage: pct,
          settlement_method: methodValue,
          settlement_account_iban: closingSettlementAccountIban.trim() || null,
          settlement_bank_name: closingSettlementBankName.trim() || null,
          settlement_type: settlementTypeValue,
        } as Record<string, unknown>)
        .eq("id", closingBuildingInvestor.id);
      if (error) throw error;
      showToast("تم إغلاق صفقة الاستثمار. الربح المحقق: " + formatNum(realized) + " ر.س (" + pct + "%).");
      const { data } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
      if (data && Array.isArray(data)) {
        const withBuildings = (data as BuildingInvestorRow[]).map((row) => ({
          ...row,
          building: buildings.find((b) => b.id === row.building_id) ?? null,
        }));
        setBuildingInvestors(withBuildings);
      }
      setClosingBuildingInvestor(null);
      setClosingBuildingPercentage("");
      setClosingSettlementMethod("");
      setClosingSettlementAccountIban("");
      setClosingSettlementBankName("");
      setClosingStep(1);
      setClosingSettlementCashAmount("");
      setClosingSettlementCheckAmount("");
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message || "فشل إغلاق الصفقة (تحقق من وجود الحقول closed_at و realized_profit و closing_percentage في الجدول)", "error");
    } finally {
      setSaving(false);
    }
  };

  const openAddBuilding = () => {
    setEditingBuilding(null);
    const today = new Date().toISOString().slice(0, 10);
    setFormBuilding({
      building_id: buildings[0]?.id || "",
      investor_name: "",
      investor_phone: "",
      investor_id_number: "",
      profit_percentage: "15",
      profit_percentage_to: "",
      agreement_type: "agreed_percentage",
      total_invested_amount: "",
      investment_start_date: today,
      investment_due_date: "",
      payment_method: "",
      payment_bank_name: "",
      payment_check_number: "",
      payment_check_image_path: "",
      contract_image_path: "",
      id_image_path: "",
      notes: "",
    });
    setContractFile(null);
    setIdFile(null);
    setCheckImageFile(null);
    setModalOpen("building");
  };

  const openEditBuilding = (row: BuildingInvestorRow) => {
    setEditingBuilding(row);
    setFormBuilding({
      building_id: row.building_id,
      investor_name: row.investor_name,
      investor_phone: row.investor_phone || "",
      investor_id_number: row.investor_id_number || "",
      profit_percentage: String(row.profit_percentage),
      profit_percentage_to: row.profit_percentage_to != null ? String(row.profit_percentage_to) : "",
      agreement_type: row.agreement_type as "agreed_percentage" | "from_building_sales",
      total_invested_amount: row.total_invested_amount != null ? String(row.total_invested_amount) : "",
      investment_start_date: row.investment_start_date || "",
      investment_due_date: row.investment_due_date || "",
      payment_method: row.payment_method || "",
      payment_bank_name: row.payment_bank_name || "",
      payment_check_number: row.payment_check_number || "",
      payment_check_image_path: row.payment_check_image_path || "",
      contract_image_path: row.contract_image_path || "",
      id_image_path: row.id_image_path || "",
      notes: row.notes || "",
    });
    setContractFile(null);
    setIdFile(null);
    setCheckImageFile(null);
    setModalOpen("building");
  };

  const openTransferModal = (row: BuildingInvestorRow) => {
    const available = capitalStillAvailable(row);
    setTransferSource(row);
    setTransferTargetType("building");
    setTransferAmount(available > 0 ? String(available) : "");
    setTransferBuildingId(buildings[0]?.id ?? "");
    setTransferUnitId("");
    setTransferProfitPct("15");
    setTransferProfitPctTo("");
    setTransferStartDate(new Date().toISOString().slice(0, 10));
    setTransferDueDate("");
    setTransferNotes("");
    setViewingBuildingInvestor(null);
  };

  const openTransferModalFromUnit = (row: UnitInvestmentRow) => {
    const available = capitalStillAvailableUnit(row);
    setTransferSource(row);
    setTransferTargetType("building");
    setTransferAmount(available > 0 ? String(available) : "");
    setTransferBuildingId(buildings[0]?.id ?? "");
    setTransferUnitId("");
    setTransferProfitPct("15");
    setTransferProfitPctTo("");
    setTransferStartDate(new Date().toISOString().slice(0, 10));
    setTransferDueDate("");
    setTransferNotes("");
    setViewingUnitInvestment(null);
  };

  const submitTransferCapital = async () => {
    if (!transferSource || !effectiveOwnerId) return;
    const amountRaw = transferAmount.replace(/\D/g, "");
    const amount = amountRaw ? parseFloat(amountRaw) : 0;
    const available = getTransferSourceAvailable(transferSource);
    if (amount <= 0 || amount > available) {
      showToast(`المبلغ يجب أن يكون بين 1 و ${formatNum(available)} ر.س (رأس المال القائم المتاح)`, "error");
      return;
    }
    const fromBuilding = isTransferSourceBuilding(transferSource);
    const investorPayload = {
      investor_name: transferSource.investor_name,
      investor_phone: transferSource.investor_phone ?? null,
      investor_email: transferSource.investor_email ?? null,
      investor_id_number: transferSource.investor_id_number ?? null,
    };
    if (transferTargetType === "building") {
      if (!transferBuildingId) {
        showToast("اختر العمارة المستهدفة", "error");
        return;
      }
      const pctFrom = parseFloat(transferProfitPct.replace(/,/g, ".")) || 0;
      const pctTo = transferProfitPctTo.trim() ? parseFloat(transferProfitPctTo.replace(/,/g, ".")) : null;
      if (isNaN(pctFrom) || pctFrom < 0 || pctFrom > 100) {
        showToast("نسبة الربح بين 0 و 100", "error");
        return;
      }
      setSaving(true);
      try {
        const payload = {
          building_id: transferBuildingId,
          owner_id: effectiveOwnerId,
          ...investorPayload,
          profit_percentage: pctFrom,
          profit_percentage_to: pctTo != null && pctTo !== pctFrom ? pctTo : null,
          agreement_type: "agreed_percentage",
          total_invested_amount: amount,
          investment_start_date: transferStartDate || null,
          investment_due_date: transferDueDate || null,
          notes: transferNotes.trim() || null,
          ...(fromBuilding
            ? { transferred_from_building_investor_id: transferSource.id }
            : { transferred_from_unit_investment_id: transferSource.id }),
        };
        const { error: insertErr } = await supabase.from("building_investors").insert(payload);
        if (insertErr) throw insertErr;
        const newTransferred = (Number(transferSource.transferred_amount) || 0) + amount;
        if (fromBuilding) {
          const { error: updateErr } = await supabase.from("building_investors").update({ transferred_amount: newTransferred }).eq("id", transferSource.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: updateErr } = await supabase.from("unit_investments").update({ transferred_amount: newTransferred }).eq("id", transferSource.id);
          if (updateErr) throw updateErr;
        }
        showToast("تم نقل رأس المال إلى العمارة الجديدة");
        setTransferSource(null);
        const { data } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
        if (data) {
          const withBuildings = (data as BuildingInvestorRow[]).map((row) => ({ ...row, building: buildings.find((b) => b.id === row.building_id) ?? null }));
          setBuildingInvestors(withBuildings);
        }
        if (!fromBuilding) {
          const { data: uiData } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
          if (uiData && Array.isArray(uiData)) {
            const enriched = (uiData as UnitInvestmentRow[]).map((r) => {
              const b = buildings.find((x) => x.id === r.building_id) ?? null;
              const u = units.find((x) => x.id === r.unit_id) ?? null;
              return { ...r, building: b, unit: u ? { unit_number: String(u.unit_number), floor: u.floor } : null };
            });
            setUnitInvestments(enriched);
          }
        }
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message || "فشل نقل رأس المال", "error");
      } finally {
        setSaving(false);
      }
    } else {
      if (!transferBuildingId || !transferUnitId) {
        showToast("اختر العمارة والوحدة المستهدفة", "error");
        return;
      }
      setSaving(true);
      try {
        const payload = {
          unit_id: transferUnitId,
          building_id: transferBuildingId,
          owner_id: effectiveOwnerId,
          ...investorPayload,
          purchase_price: amount,
          purchase_date: transferStartDate || new Date().toISOString().slice(0, 10),
          status: "under_construction",
          notes: transferNotes.trim() || null,
          ...(fromBuilding
            ? { transferred_from_building_investor_id: transferSource.id }
            : { transferred_from_unit_investment_id: transferSource.id }),
        };
        const { error: insertErr } = await supabase.from("unit_investments").insert(payload);
        if (insertErr) throw insertErr;
        const newTransferred = (Number(transferSource.transferred_amount) || 0) + amount;
        if (fromBuilding) {
          const { error: updateErr } = await supabase.from("building_investors").update({ transferred_amount: newTransferred }).eq("id", transferSource.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: updateErr } = await supabase.from("unit_investments").update({ transferred_amount: newTransferred }).eq("id", transferSource.id);
          if (updateErr) throw updateErr;
        }
        showToast("تم نقل رأس المال إلى الوحدة الجديدة");
        setTransferSource(null);
        const { data: biData } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
        if (biData) {
          const withBuildings = (biData as BuildingInvestorRow[]).map((row) => ({ ...row, building: buildings.find((b) => b.id === row.building_id) ?? null }));
          setBuildingInvestors(withBuildings);
        }
        const { data: uiData } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
        if (uiData && Array.isArray(uiData)) {
          const enriched = (uiData as UnitInvestmentRow[]).map((r) => {
            const b = buildings.find((x) => x.id === r.building_id) ?? null;
            const u = units.find((x) => x.id === r.unit_id) ?? null;
            return { ...r, building: b, unit: u ? { unit_number: String(u.unit_number), floor: u.floor } : null };
          });
          setUnitInvestments(enriched);
        }
      } catch (e: unknown) {
        showToast((e as { message?: string })?.message || "فشل نقل رأس المال", "error");
      } finally {
        setSaving(false);
      }
    }
  };

  const uploadInvestorFile = async (investorId: string, file: File, type: "contract" | "id" | "check"): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${INVESTOR_DOCS_PREFIX}/${investorId}/${type}.${ext}`;
    const { error } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      showToast("تعذر رفع الملف: " + (error.message || ""), "error");
      return null;
    }
    return path;
  };

  const uploadUnitInvestmentCheckFile = async (unitInvestmentId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${UNIT_INVESTMENT_DOCS_PREFIX}/${unitInvestmentId}/check.${ext}`;
    const { error } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      showToast("تعذر رفع صورة الشيك: " + (error.message || ""), "error");
      return null;
    }
    return path;
  };

  const uploadUnitInvestmentFile = async (unitInvestmentId: string, file: File, type: "contract" | "id"): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${UNIT_INVESTMENT_DOCS_PREFIX}/${unitInvestmentId}/${type}.${ext}`;
    const { error } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      showToast("تعذر رفع الملف: " + (error.message || ""), "error");
      return null;
    }
    return path;
  };

  const saveBuildingInvestor = async () => {
    if (!effectiveOwnerId) return;
    const phoneVal = formBuilding.investor_phone.trim();
    if (phoneVal && !isValidPhone10Digits(phoneVal)) {
      showToast("رقم الجوال يجب أن يكون 10 أرقاماً", "error");
      return;
    }
    const pctFrom = parseFloat(formBuilding.profit_percentage);
    const pctToRaw = formBuilding.profit_percentage_to.trim();
    const pctTo = pctToRaw ? parseFloat(pctToRaw) : null;
    if (isNaN(pctFrom) || pctFrom < 0 || pctFrom > 100) {
      showToast("نسبة الربح (من) بين 0 و 100", "error");
      return;
    }
    if (pctTo != null && (isNaN(pctTo) || pctTo < 0 || pctTo > 100)) {
      showToast("نسبة الربح (إلى) بين 0 و 100", "error");
      return;
    }
    if (pctTo != null && pctTo < pctFrom) {
      showToast("نسبة (إلى) يجب أن تكون أكبر من أو تساوي (من)", "error");
      return;
    }
    setSaving(true);
    try {
      const amountRaw = formBuilding.total_invested_amount.replace(/\D/g, "");
      let contractPath = formBuilding.contract_image_path.trim() || null;
      let idPath = formBuilding.id_image_path.trim() || null;
      let checkImagePath = formBuilding.payment_check_image_path?.trim() || null;
      let savedId = editingBuilding?.id;

      if (editingBuilding) {
        if (contractFile) {
          setUploadingContract(true);
          const up = await uploadInvestorFile(editingBuilding.id, contractFile, "contract");
          setUploadingContract(false);
          if (up) contractPath = up;
        }
        if (idFile) {
          setUploadingId(true);
          const up = await uploadInvestorFile(editingBuilding.id, idFile, "id");
          setUploadingId(false);
          if (up) idPath = up;
        }
        if (checkImageFile && formBuilding.payment_method === "check") {
          setUploadingCheck(true);
          const up = await uploadInvestorFile(editingBuilding.id, checkImageFile, "check");
          setUploadingCheck(false);
          if (up) checkImagePath = up;
        }
        const payload = {
          building_id: formBuilding.building_id,
          owner_id: effectiveOwnerId,
          investor_name: formBuilding.investor_name.trim(),
          investor_phone: phoneVal || null,
          investor_id_number: formBuilding.investor_id_number.trim() || null,
          profit_percentage: pctFrom,
          profit_percentage_to: pctTo != null && pctTo !== pctFrom ? pctTo : null,
          agreement_type: formBuilding.agreement_type,
          total_invested_amount: amountRaw ? parseFloat(amountRaw) : null,
          investment_start_date: formBuilding.investment_start_date || null,
          investment_due_date: formBuilding.investment_due_date || null,
          payment_method: formBuilding.payment_method?.trim() || null,
          payment_bank_name: formBuilding.payment_method === "transfer" ? (formBuilding.payment_bank_name?.trim() || null) : null,
          payment_check_number: formBuilding.payment_method === "check" ? (formBuilding.payment_check_number?.trim() || null) : null,
          payment_check_image_path: formBuilding.payment_method === "check" ? checkImagePath : null,
          contract_image_path: contractPath,
          id_image_path: idPath,
          notes: formBuilding.notes.trim() || null,
        };
        const { error } = await supabase.from("building_investors").update(payload).eq("id", editingBuilding.id);
        if (error) throw error;
        showToast("تم تحديث المستثمر");
      } else {
        const payload = {
          building_id: formBuilding.building_id,
          owner_id: effectiveOwnerId,
          investor_name: formBuilding.investor_name.trim(),
          investor_phone: phoneVal || null,
          investor_id_number: formBuilding.investor_id_number.trim() || null,
          profit_percentage: pctFrom,
          profit_percentage_to: pctTo != null && pctTo !== pctFrom ? pctTo : null,
          agreement_type: formBuilding.agreement_type,
          total_invested_amount: amountRaw ? parseFloat(amountRaw) : null,
          investment_start_date: formBuilding.investment_start_date || null,
          investment_due_date: formBuilding.investment_due_date || null,
          payment_method: formBuilding.payment_method?.trim() || null,
          payment_bank_name: formBuilding.payment_method === "transfer" ? (formBuilding.payment_bank_name?.trim() || null) : null,
          payment_check_number: formBuilding.payment_method === "check" ? (formBuilding.payment_check_number?.trim() || null) : null,
          contract_image_path: null,
          id_image_path: null,
          notes: formBuilding.notes.trim() || null,
        };
        const { data: inserted, error } = await supabase.from("building_investors").insert(payload).select("id").single();
        if (error) throw error;
        savedId = inserted?.id;
        if (savedId && (contractFile || idFile || (checkImageFile && formBuilding.payment_method === "check"))) {
          if (contractFile) {
            setUploadingContract(true);
            const up = await uploadInvestorFile(savedId, contractFile, "contract");
            setUploadingContract(false);
            if (up) contractPath = up;
          }
          if (idFile) {
            setUploadingId(true);
            const up = await uploadInvestorFile(savedId, idFile, "id");
            setUploadingId(false);
            if (up) idPath = up;
          }
          if (checkImageFile && formBuilding.payment_method === "check") {
            setUploadingCheck(true);
            const up = await uploadInvestorFile(savedId, checkImageFile, "check");
            setUploadingCheck(false);
            if (up) checkImagePath = up;
          }
          await supabase.from("building_investors").update({
            contract_image_path: contractPath,
            id_image_path: idPath,
            ...(formBuilding.payment_method === "check" ? { payment_check_image_path: checkImagePath } : {}),
          }).eq("id", savedId);
        }
        showToast("تم إضافة المستثمر");
      }
      setModalOpen(null);
      setEditingBuilding(null);
      setContractFile(null);
      setIdFile(null);
      setCheckImageFile(null);
      const { data } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
      if (data) {
        const withBuildings = (data as BuildingInvestorRow[]).map((row) => ({
          ...row,
          building: buildings.find((b) => b.id === row.building_id) ?? null,
        }));
        setBuildingInvestors(withBuildings);
      }
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message || "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const openAddUnit = () => {
    setEditingUnit(null);
    setFormUnit({
      building_id: buildings[0]?.id ?? "",
      unit_id: "",
      investor_name: "",
      investor_phone: "",
      investor_id_number: "",
      purchase_price: "",
      purchase_commission: "",
      purchase_date: new Date().toISOString().slice(0, 10),
      payment_method: "",
      payment_bank_name: "",
      payment_check_number: "",
      payment_check_image_path: "",
      contract_image_path: "",
      id_image_path: "",
      notes: "",
    });
    setUnitCheckImageFile(null);
    setUnitContractFile(null);
    setUnitIdFile(null);
    setFormUnitResale({ resale_sale_id: "", settlement_type: "" });
    setModalOpen("unit");
  };

  const openEditUnit = (row: UnitInvestmentRow) => {
    setEditingUnit(row);
    const buildingId = row.building_id;
    setFormUnit({
      building_id: buildingId,
      unit_id: row.unit_id,
      investor_name: row.investor_name,
      investor_phone: row.investor_phone || "",
      investor_id_number: row.investor_id_number || "",
      purchase_price: String(row.purchase_price),
      purchase_commission: row.purchase_commission != null ? String(row.purchase_commission) : "",
      purchase_date: row.purchase_date || "",
      payment_method: row.payment_method || "",
      payment_bank_name: row.payment_bank_name || "",
      payment_check_number: row.payment_check_number || "",
      payment_check_image_path: row.payment_check_image_path || "",
      contract_image_path: row.contract_image_path || "",
      id_image_path: row.id_image_path || "",
      notes: row.notes || "",
    });
    setUnitCheckImageFile(null);
    setUnitContractFile(null);
    setUnitIdFile(null);
    setFormUnitResale({
      resale_sale_id: row.resale_sale_id || "",
      settlement_type: row.settlement_type === "profit_only" ? "profit_only" : row.settlement_type === "with_capital" ? "with_capital" : "",
    });
    setModalOpen("unit");
  };

  const saveUnitInvestment = async () => {
    if (!effectiveOwnerId) return;
    const phoneVal = formUnit.investor_phone.trim();
    if (phoneVal && !isValidPhone10Digits(phoneVal)) {
      showToast("رقم الجوال يجب أن يكون 10 أرقاماً", "error");
      return;
    }
    const priceRaw = formUnit.purchase_price.replace(/\D/g, "");
    const price = priceRaw ? parseFloat(priceRaw) : NaN;
    if (isNaN(price) || price < 0) {
      showToast("أدخل سعر شراء صحيحاً", "error");
      return;
    }
    const commissionRaw = formUnit.purchase_commission.replace(/\D/g, "");
    const purchaseCommission = commissionRaw ? parseFloat(commissionRaw) : 0;
    if (purchaseCommission > price) {
      showToast("عمولة البيع لا يمكن أن تتجاوز سعر الشراء", "error");
      return;
    }
    const buildingId = units.find((u) => u.id === formUnit.unit_id)?.building_id;
    if (!buildingId) {
      showToast("اختر الوحدة", "error");
      return;
    }
    setSaving(true);
    try {
      let checkImagePath: string | null = formUnit.payment_check_image_path?.trim() || null;
      if (unitCheckImageFile && formUnit.payment_method === "check") {
        setUploadingCheck(true);
        const uploaded = editingUnit
          ? await uploadUnitInvestmentCheckFile(editingUnit.id, unitCheckImageFile)
          : null;
        setUploadingCheck(false);
        if (uploaded) checkImagePath = uploaded;
      }
      let contractPath: string | null = formUnit.contract_image_path?.trim() || null;
      let idPath: string | null = formUnit.id_image_path?.trim() || null;
      if (editingUnit) {
        if (unitContractFile) {
          const uploaded = await uploadUnitInvestmentFile(editingUnit.id, unitContractFile, "contract");
          if (uploaded) contractPath = uploaded;
        }
        if (unitIdFile) {
          const uploaded = await uploadUnitInvestmentFile(editingUnit.id, unitIdFile, "id");
          if (uploaded) idPath = uploaded;
        }
      }
      const payload = {
        unit_id: formUnit.unit_id,
        building_id: buildingId,
        owner_id: effectiveOwnerId,
        investor_name: formUnit.investor_name.trim(),
        investor_phone: phoneVal || null,
        investor_id_number: formUnit.investor_id_number.trim() || null,
        purchase_price: price,
        purchase_commission: purchaseCommission,
        purchase_date: formUnit.purchase_date || null,
        payment_method: formUnit.payment_method?.trim() || null,
        payment_bank_name: formUnit.payment_method === "transfer" ? (formUnit.payment_bank_name?.trim() || null) : null,
        payment_check_number: formUnit.payment_method === "check" ? (formUnit.payment_check_number?.trim() || null) : null,
        payment_check_image_path: formUnit.payment_method === "check" ? checkImagePath : null,
        contract_image_path: contractPath,
        id_image_path: idPath,
        notes: formUnit.notes.trim() || null,
      };
      if (editingUnit) {
        const updatePayload: Record<string, unknown> = { ...payload };
        if (editingUnit.status !== "resold") {
          if (formUnitResale.resale_sale_id) {
            updatePayload.resale_sale_id = formUnitResale.resale_sale_id;
            updatePayload.status = "resold";
            updatePayload.settlement_type = formUnitResale.settlement_type || "with_capital";
          }
        } else if (editingUnit.status === "resold" && formUnitResale.settlement_type) {
          updatePayload.settlement_type = formUnitResale.settlement_type;
        }
        const { error } = await supabase.from("unit_investments").update(updatePayload).eq("id", editingUnit.id);
        if (error) throw error;
        showToast("تم تحديث الاستثمار");
      } else {
        const { data: inserted, error } = await supabase.from("unit_investments").insert(payload).select("id").single();
        if (error) throw error;
        const savedId = (inserted as { id: string } | null)?.id;
        if (savedId) {
          const updates: { payment_check_image_path?: string; contract_image_path?: string; id_image_path?: string } = {};
          if (unitCheckImageFile && formUnit.payment_method === "check") {
            setUploadingCheck(true);
            const uploaded = await uploadUnitInvestmentCheckFile(savedId, unitCheckImageFile);
            setUploadingCheck(false);
            if (uploaded) updates.payment_check_image_path = uploaded;
          }
          if (unitContractFile) {
            const uploaded = await uploadUnitInvestmentFile(savedId, unitContractFile, "contract");
            if (uploaded) updates.contract_image_path = uploaded;
          }
          if (unitIdFile) {
            const uploaded = await uploadUnitInvestmentFile(savedId, unitIdFile, "id");
            if (uploaded) updates.id_image_path = uploaded;
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("unit_investments").update(updates).eq("id", savedId);
          }
        }
        showToast("تم إضافة استثمار الوحدة");
      }
      setModalOpen(null);
      setEditingUnit(null);
      const { data } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId).order("created_at", { ascending: false });
      if (data && Array.isArray(data)) {
        const enriched = (data as UnitInvestmentRow[]).map((r) => {
          const b = buildings.find((x) => x.id === r.building_id) ?? null;
          const u = units.find((x) => x.id === r.unit_id) ?? null;
          return { ...r, building: b, unit: u ? { unit_number: String(u.unit_number), floor: u.floor } : null };
        });
        setUnitInvestments(enriched);
      }
    } catch (e: unknown) {
      showToast((e as { message?: string })?.message || "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteBuildingInvestor = async (id: string) => {
    const { error } = await supabase.from("building_investors").delete().eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("تم الحذف");
    setBuildingInvestors((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  };

  const deleteUnitInvestment = async (id: string) => {
    const { error } = await supabase.from("unit_investments").delete().eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("تم الحذف");
    setUnitInvestments((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
    if (viewingUnitInvestment?.id === id) setViewingUnitInvestment(null);
  };

  const confirmDeleteFromSystem = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "building") deleteBuildingInvestor(deleteConfirm.id);
    else deleteUnitInvestment(deleteConfirm.id);
  };

  // الربح = سعر إعادة البيع − السعر الفعلي (سعر الشراء − عمولة البيع)
  const unitInvestmentsWithProfit = useMemo(() => {
    return unitInvestments.map((r) => {
      const resalePrice = r.resale_sale_id ? sales.find((s) => s.id === r.resale_sale_id)?.sale_price ?? null : null;
      const profit = resalePrice != null ? resalePrice - Number(r.purchase_price) : null;
      return { ...r, resalePrice, profit };
    });
  }, [unitInvestments, sales]);

  if (ready && !can("investors_view")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">المستثمرين</h1>
              <p className="text-sm text-gray-500">إدارة عقود وحسابات المستثمرين</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/owners-investors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <Users className="w-4 h-4" />
              إدارة الملاك والمستثمرين
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/80 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <button
            type="button"
            onClick={() => setTab("building")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${tab === "building" ? "bg-teal-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Building2 className="w-5 h-5" />
            مستثمرون بالعمارة
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{buildingInvestors.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("unit")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${tab === "unit" ? "bg-teal-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Home className="w-5 h-5" />
            استثمار بالوحدات
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{unitInvestments.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">جاري التحميل...</p>
          </div>
        ) : (
          <>
            {tab === "building" && (
              <section className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600">
                        <TrendingUp className="w-5 h-5" />
                      </span>
                      مستثمرون بالعمارة
                      {buildingInvestors.length > 0 && (
                        <span className="text-sm font-normal text-slate-500 font-mono">— {buildingInvestors.length.toLocaleString("en")} مستثمر</span>
                      )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">إدارة الاتفاقيات ونسب الأرباح</p>
                  </div>
                  {canEdit && (
                    <button type="button" onClick={openAddBuilding} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600">
                      <Plus className="w-4 h-4" />
                      إضافة مستثمر بالعمارة
                    </button>
                  )}
                </div>
                <div className="overflow-auto max-h-[32rem] border-b border-slate-100" style={{ minHeight: "8rem" }}>
                  <table className="w-full text-sm text-center border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                      <tr className="border-b border-slate-200">
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">العمارة</th>
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">المستثمر</th>
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">نسبة الربح</th>
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">نوع العقد</th>
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">مبلغ الاستثمار</th>
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">الربح</th>
                        <th className="p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 w-28">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildingInvestors.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-slate-500">
                            لا يوجد مستثمرون بالعمارة. أضف سجلاً من زر «إضافة مستثمر بالعمارة».
                          </td>
                        </tr>
                      ) : (
                        buildingInvestorsPaginated.map((row) => {
                          const needsTransfer = capitalStillAvailable(row) > 0;
                          return (
                          <tr key={row.id} className={`border-b border-slate-100 hover:bg-teal-50/30 transition ${needsTransfer ? "border-r-2 border-r-amber-300 bg-amber-50/20" : ""}`}>
                            <td className="p-3 text-center font-medium text-slate-800">{row.building?.name ?? "—"}</td>
                            <td className="p-3 text-center">
                              <div className="font-medium text-slate-800">{row.investor_name}</div>
                              {row.investor_phone && <div className="text-xs text-slate-500 dir-ltr">{row.investor_phone}</div>}
                            </td>
                            <td className="p-3 text-center">
                              {row.closed_at != null ? (
                                <span className="inline-flex items-center justify-center min-w-[3.25rem] px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-200/60 shadow-sm tabular-nums dir-ltr">
                                  {row.closing_percentage != null ? `${Number(row.closing_percentage)}%` : "—"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center min-w-[3.25rem] px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 font-semibold text-sm border border-teal-200/60 shadow-sm tabular-nums dir-ltr">
                                  {row.profit_percentage_to != null && Number(row.profit_percentage_to) !== Number(row.profit_percentage)
                                    ? `${Number(row.profit_percentage)}%–${Number(row.profit_percentage_to)}%`
                                    : `${Number(row.profit_percentage)}%`}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center text-slate-600">
                              {row.agreement_type === "from_building_sales" ? "من مبيعات العمارة" : "نسبة متفق عليها"}
                            </td>
                            <td className="p-3 text-center text-slate-700 dir-ltr">
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{row.total_invested_amount != null ? `${formatNum(Number(row.total_invested_amount))} ر.س` : "—"}</span>
                                {needsTransfer && (
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setViewingBuildingInvestor(null); openTransferModal(row); }} className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-amber-700/90 font-medium tracking-tight hover:text-amber-800 hover:underline focus:outline-none" title="نقل رأس المال القائم">
                                    <ArrowRightLeft className="w-2.5 h-2.5 shrink-0 text-amber-600/80" strokeWidth={2.2} />
                                    نقل رأس مال
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center text-slate-700 dir-ltr">
                              {row.closed_at != null && row.realized_profit != null ? (
                                <span className="font-semibold text-emerald-700">+{formatNum(Number(row.realized_profit))} ر.س</span>
                              ) : row.total_invested_amount != null && row.profit_percentage != null ? (
                                (() => {
                                  const amt = Number(row.total_invested_amount);
                                  const from = (amt * Number(row.profit_percentage)) / 100;
                                  const toVal = row.profit_percentage_to != null && Number(row.profit_percentage_to) !== Number(row.profit_percentage)
                                    ? (amt * Number(row.profit_percentage_to)) / 100
                                    : null;
                                  return (
                                    <span className="font-semibold text-teal-700">
                                      {toVal != null ? `${formatNum(Math.round(from))} – ${formatNum(Math.round(toVal))} ر.س` : `${formatNum(Math.round(from))} ر.س`}
                                    </span>
                                  );
                                })()
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button type="button" onClick={() => setViewingBuildingInvestor(row)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg" title="عرض البيانات">
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canEdit && (
                                  <button type="button" onClick={() => openEditBuilding(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="تعديل">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {canEdit && (
                                  <button type="button" onClick={() => { setClosingBuildingInvestor(row); const singlePct = row.profit_percentage_to == null || Number(row.profit_percentage_to) === Number(row.profit_percentage); setClosingBuildingPercentage(singlePct ? String(row.profit_percentage) : ""); setClosingSettlementMethod(""); setClosingSettlementAccountIban(""); setClosingSettlementBankName(""); setClosingSettlementType(""); setClosingStep(1); setClosingSettlementCashAmount(""); setClosingSettlementCheckAmount(""); }} className={row.closed_at != null ? "p-2 text-slate-500 hover:bg-slate-100 rounded-lg" : "p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"} title={row.closed_at != null ? "عرض المخالصة" : "إغلاق الصفقة"}>
                                    {row.closed_at != null ? <CheckCheck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                  </button>
                                )}
                                {canEdit && (
<button type="button" onClick={() => setDeleteConfirm({ type: "building", id: row.id, label: row.investor_name })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>عرض</span>
                    <select
                      value={buildingPageSize}
                      onChange={(e) => { setBuildingPageSize(Number(e.target.value)); setBuildingPage(1); }}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                    >
                      {BUILDING_PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className="font-mono">
                      {buildingInvestors.length === 0
                        ? "—"
                        : `${((buildingPage - 1) * buildingPageSize + 1).toLocaleString("en")} - ${Math.min(buildingPage * buildingPageSize, buildingInvestors.length).toLocaleString("en")}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBuildingPage((p) => Math.max(1, p - 1))}
                      disabled={buildingPage <= 1}
                      className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                    >
                      السابق
                    </button>
                    <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                      {buildingPage.toLocaleString("en")} / {buildingTotalPages.toLocaleString("en")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBuildingPage((p) => Math.min(buildingTotalPages, p + 1))}
                      disabled={buildingPage >= buildingTotalPages}
                      className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm focus:outline-none focus:ring-0"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* تأكيد الحذف من النظام */}
            {deleteConfirm && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)} dir="rtl">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">تأكيد الحذف من النظام</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-600">
                      {deleteConfirm.type === "building" ? "حذف مستثمر العمارة" : "حذف سجل استثمار الوحدة"}: <span className="font-semibold text-slate-800">{deleteConfirm.label || "—"}</span>. لا يمكن التراجع عن هذا الإجراء.
                    </p>
                    <div className="flex gap-3">
                      <button type="button" onClick={confirmDeleteFromSystem} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition">
                        حذف
                      </button>
                      <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition">
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* بطاقة عرض بيانات المستثمر بالعمارة */}
            {viewingBuildingInvestor && (() => {
              const start = viewingBuildingInvestor.investment_start_date;
              const due = viewingBuildingInvestor.investment_due_date;
              const data = start && due ? getDurationAndRemaining(start, due) : null;
              const duration = data
                ? { years: data.durationYMD.y, months: data.durationYMD.m, days: data.durationYMD.d }
                : (start && due ? getDuration(start, due) : null);
              const remaining = data
                ? { years: data.remainingYMD.y, months: data.remainingYMD.m, days: data.remainingYMD.d }
                : (due ? getRemaining(due, start) : null);
              return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingBuildingInvestor(null)}>
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
                  <div className={`px-5 py-4 flex items-center justify-between shrink-0 ${viewingBuildingInvestor.closed_at ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-teal-500 to-cyan-600"}`}>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {viewingBuildingInvestor.closed_at && <CheckCircle2 className="w-5 h-5 text-emerald-200" />}
                      {viewingBuildingInvestor.closed_at ? "صفقة مُخالصة" : "بيانات المستثمر"}
                    </h3>
                    <button type="button" onClick={() => setViewingBuildingInvestor(null)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {viewingBuildingInvestor.closed_at ? (
                      <>
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-3">
                          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">ملخص المخالصة</p>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-600">تاريخ الإغلاق</span><span className="font-semibold text-slate-800">{formatDateEn(viewingBuildingInvestor.closed_at)}</span></div>
                            {viewingBuildingInvestor.closing_percentage != null && (
                              <div className="flex justify-between"><span className="text-slate-600">نسبة الإغلاق</span><span className="font-semibold text-emerald-700 dir-ltr">{Number(viewingBuildingInvestor.closing_percentage)}%</span></div>
                            )}
                            {viewingBuildingInvestor.realized_profit != null && (
                              <div className="flex justify-between"><span className="text-slate-600">الربح المحقق</span><span className="font-bold text-emerald-700 dir-ltr">+{formatNum(Number(viewingBuildingInvestor.realized_profit))} ر.س</span></div>
                            )}
                            {viewingBuildingInvestor.settlement_type && (
                              <>
                                <div className="flex justify-between"><span className="text-slate-600">نوع المخالصة</span><span className="font-medium">{viewingBuildingInvestor.settlement_type === "with_capital" ? "مع رأس المال" : "أرباح فقط"}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">مبلغ المخالصة</span><span className="font-bold text-emerald-800 dir-ltr">{viewingBuildingInvestor.settlement_type === "with_capital" && viewingBuildingInvestor.total_invested_amount != null ? formatNum(Number(viewingBuildingInvestor.total_invested_amount) + Number(viewingBuildingInvestor.realized_profit || 0)) : formatNum(Number(viewingBuildingInvestor.realized_profit || 0))} ر.س</span></div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">بيانات العقد والمستثمر</p>
                          <Row label="العمارة" value={viewingBuildingInvestor.building?.name ?? "—"} />
                          <Row label="المستثمر" value={viewingBuildingInvestor.investor_name} />
                          {viewingBuildingInvestor.investor_phone && <Row label="الجوال" value={viewingBuildingInvestor.investor_phone} dirLtr />}
                          <Row label="مبلغ الاستثمار" value={viewingBuildingInvestor.total_invested_amount != null ? `${formatNum(Number(viewingBuildingInvestor.total_invested_amount))} ر.س` : "—"} dirLtr />
                          <Row label="نوع العقد" value={viewingBuildingInvestor.agreement_type === "from_building_sales" ? "من مبيعات العمارة" : "نسبة متفق عليها"} />
                          {viewingBuildingInvestor.notes && <Row label="ملاحظات" value={viewingBuildingInvestor.notes} />}
                        </div>
                      </>
                    ) : (
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <Row label="العمارة" value={viewingBuildingInvestor.building?.name ?? "—"} />
                      <Row label="اسم المستثمر" value={viewingBuildingInvestor.investor_name} />
                      <Row label="الجوال" value={viewingBuildingInvestor.investor_phone ?? "—"} dirLtr />
                      <Row label="رقم الهوية" value={viewingBuildingInvestor.investor_id_number ?? "—"} dirLtr />
                      <Row
                        label="نسبة الربح %"
                        value={
                          viewingBuildingInvestor.profit_percentage_to != null && Number(viewingBuildingInvestor.profit_percentage_to) !== Number(viewingBuildingInvestor.profit_percentage)
                            ? `${Number(viewingBuildingInvestor.profit_percentage)}%–${Number(viewingBuildingInvestor.profit_percentage_to)}%`
                            : `${Number(viewingBuildingInvestor.profit_percentage)}%`
                        }
                      />
                      <Row label="نوع العقد" value={viewingBuildingInvestor.agreement_type === "from_building_sales" ? "من مبيعات العمارة" : "نسبة متفق عليها"} />
                      <Row label="مبلغ الاستثمار" value={viewingBuildingInvestor.total_invested_amount != null ? `${formatNum(Number(viewingBuildingInvestor.total_invested_amount))} ر.س` : "—"} dirLtr />
                      <Row label="طريقة الدفع" value={settlementMethodLabel(viewingBuildingInvestor.payment_method)} />
                      {viewingBuildingInvestor.payment_method === "transfer" && viewingBuildingInvestor.payment_bank_name && (
                        <Row label="على بنك" value={viewingBuildingInvestor.payment_bank_name} />
                      )}
                      {viewingBuildingInvestor.payment_method === "check" && viewingBuildingInvestor.payment_check_number && (
                        <Row label="رقم الشيك" value={viewingBuildingInvestor.payment_check_number} dirLtr />
                      )}
                      <Row
                        label="الربح المتوقع"
                        value={
                          (() => {
                            if (viewingBuildingInvestor.total_invested_amount == null || viewingBuildingInvestor.profit_percentage == null) return "—";
                            const amt = Number(viewingBuildingInvestor.total_invested_amount);
                            const from = (amt * Number(viewingBuildingInvestor.profit_percentage)) / 100;
                            const toVal = viewingBuildingInvestor.profit_percentage_to != null && Number(viewingBuildingInvestor.profit_percentage_to) !== Number(viewingBuildingInvestor.profit_percentage)
                              ? (amt * Number(viewingBuildingInvestor.profit_percentage_to)) / 100
                              : null;
                            return toVal != null ? `${formatNum(Math.round(from))} – ${formatNum(Math.round(toVal))} ر.س` : `${formatNum(Math.round(from))} ر.س`;
                          })()
                        }
                        dirLtr
                      />
                      <Row label="بدء الاستثمار" value={formatDateEn(viewingBuildingInvestor.investment_start_date)} dirLtr />
                      <Row label="استحقاق المبلغ" value={formatDateEn(viewingBuildingInvestor.investment_due_date)} dirLtr />
                      {(duration || remaining != null || (due && new Date(due + "T12:00:00").getTime() < Date.now())) && (
                        <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-slate-100">
                          {duration && (
                            <div className="rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 flex items-center gap-2 shadow-sm min-w-0">
                              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide shrink-0">مدة العقد</span>
                              <span className="text-xs font-bold text-slate-700 tabular-nums">{(formatDuration(duration.years, duration.months, duration.days))}</span>
                            </div>
                          )}
                          {remaining != null ? (
                            <div className="rounded-full border border-teal-200/70 bg-teal-50 px-3 py-1.5 flex items-center gap-2 shadow-sm min-w-0">
                              <span className="text-[10px] font-medium text-teal-600 uppercase tracking-wide shrink-0">المتبقي من العقد</span>
                              <span className="text-xs font-bold text-teal-700 tabular-nums">{formatDuration(remaining.years, remaining.months, remaining.days)}</span>
                            </div>
                          ) : due && new Date(due + "T12:00:00").getTime() < Date.now() ? (
                            <div className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1.5 flex items-center gap-2 shadow-sm min-w-0">
                              <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide shrink-0">المتبقي من العقد</span>
                              <span className="text-xs font-bold text-amber-800">منتهي</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                      {viewingBuildingInvestor.notes && <Row label="ملاحظات" value={viewingBuildingInvestor.notes} />}
                    </div>
                    )}
                    <div className="space-y-3 pt-4">
                      <p className="text-sm font-medium text-slate-700 text-center">المرفقات</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {viewingBuildingInvestor.contract_image_path ? (
                          viewingContractUrl ? (
                            <a href={viewingContractUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                              عرض صورة العقد
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">عقد مرفق — جاري التحميل...</span>
                          )
                        ) : canEdit ? (
                          <button type="button" onClick={() => { setTriggerFileInput("contract"); setViewingBuildingInvestor(null); openEditBuilding(viewingBuildingInvestor); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                            <FileUp className="w-4 h-4 shrink-0" />
                            إرفاق صورة العقد
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">لم يُرفق عقد</span>
                        )}
                        {viewingBuildingInvestor.id_image_path ? (
                          viewingIdUrl ? (
                            <a href={viewingIdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                              عرض صورة الهوية
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">هوية مرفقة — جاري التحميل...</span>
                          )
                        ) : canEdit ? (
                          <button type="button" onClick={() => { setTriggerFileInput("id"); setViewingBuildingInvestor(null); openEditBuilding(viewingBuildingInvestor); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                            <CreditCard className="w-4 h-4 shrink-0" />
                            إرفاق صورة الهوية
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">لم تُرفق هوية</span>
                        )}
                        {viewingBuildingInvestor.payment_method === "check" && viewingBuildingInvestor.payment_check_image_path ? (
                          viewingCheckImageUrl ? (
                            <a href={viewingCheckImageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                              عرض صورة الشيك
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">صورة الشيك — جاري التحميل...</span>
                          )
                        ) : null}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="pt-2 flex flex-wrap gap-2 justify-center">
                        <button type="button" onClick={() => { setViewingBuildingInvestor(null); openEditBuilding(viewingBuildingInvestor); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors">
                          تعديل
                        </button>
                        <button type="button" onClick={() => setViewingBuildingInvestor(null)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                          إغلاق
                        </button>
                      </div>
                    )}
                    {!canEdit && (
                      <button type="button" onClick={() => setViewingBuildingInvestor(null)} className="w-full py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                        إغلاق
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}

            {transferSource && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">نقل رأس المال إلى عمارة أو وحدة جديدة</h3>
                    <button type="button" onClick={() => setTransferSource(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <p className="text-sm text-slate-600">
                      المستثمر: <strong>{getTransferSourceInvestorName(transferSource)}</strong> — رأس المال المتاح للنقل: <span className="dir-ltr font-semibold text-amber-700">{formatNum(getTransferSourceAvailable(transferSource))} ر.س</span>
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الوجهة</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setTransferTargetType("building")} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${transferTargetType === "building" ? "border-teal-500 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          عمارة جديدة
                        </button>
                        <button type="button" onClick={() => setTransferTargetType("unit")} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${transferTargetType === "unit" ? "border-teal-500 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          وحدة جديدة
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ النقل (ر.س)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={transferAmount ? formatNum(parseInt(transferAmount.replace(/\D/g, ""), 10) || 0) : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          const num = raw ? parseInt(raw, 10) : 0;
                          const max = getTransferSourceAvailable(transferSource);
                          if (max <= 0) setTransferAmount("");
                          else setTransferAmount(String(Math.min(num, max)));
                        }}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        placeholder={String(getTransferSourceAvailable(transferSource))}
                      />
                    </div>
                    {transferTargetType === "building" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">العمارة المستهدفة</label>
                          <select value={transferBuildingId} onChange={(e) => setTransferBuildingId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                            {buildings.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نسبة الربح %</label>
                            <input type="number" min={0} max={100} step={0.5} value={transferProfitPct} onChange={(e) => setTransferProfitPct(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">إلى % (اختياري)</label>
                            <input type="number" min={0} max={100} step={0.5} value={transferProfitPctTo} onChange={(e) => setTransferProfitPctTo(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ البدء</label>
                            <input type="date" value={transferStartDate} onChange={(e) => setTransferStartDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الاستحقاق</label>
                            <input type="date" value={transferDueDate} onChange={(e) => setTransferDueDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                        </div>
                      </>
                    )}
                    {transferTargetType === "unit" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">العمارة</label>
                          <select value={transferBuildingId} onChange={(e) => { setTransferBuildingId(e.target.value); setTransferUnitId(""); }} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                            {buildings.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                          <select value={transferUnitId} onChange={(e) => setTransferUnitId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                            <option value="">— اختر الوحدة —</option>
                            {units
                              .filter((u) => u.building_id === transferBuildingId && u.status !== "sold")
                              .sort((a, b) => {
                                const byFloor = Number(a.floor) - Number(b.floor);
                                return byFloor !== 0 ? byFloor : Number(a.unit_number) - Number(b.unit_number);
                              })
                              .map((u) => (
                                <option key={u.id} value={u.id}>وحدة {u.unit_number} — د{u.floor}</option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الشراء</label>
                          <input type="date" value={transferStartDate} onChange={(e) => setTransferStartDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات (اختياري)</label>
                      <textarea value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" rows={2} />
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 border-t border-slate-100">
                    <button type="button" onClick={() => setTransferSource(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">إلغاء</button>
                    <button type="button" onClick={submitTransferCapital} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60">
                      {saving ? "جاري التنفيذ..." : "تأكيد النقل"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "unit" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-600">استثمار للوحدات تحت الإنشاء.</p>
                  {canEdit && (
                    <button type="button" onClick={openAddUnit} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600">
                      <Plus className="w-4 h-4" />
                      إضافة استثمار وحدة
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <th className="text-center p-3 font-semibold">الوحدة / العمارة</th>
                        <th className="text-center p-3 font-semibold">المستثمر</th>
                        <th className="text-center p-3 font-semibold">سعر الشراء</th>
                        <th className="text-center p-3 font-semibold">سعر إعادة البيع</th>
                        <th className="text-center p-3 font-semibold">الربح</th>
                        <th className="text-center p-3 font-semibold">حالة مشروع الاستثمار</th>
                        <th className="text-center p-3 font-semibold w-28">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unitInvestmentsWithProfit.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            لا يوجد استثمارات وحدات. أضف سجلاً من زر «إضافة استثمار وحدة».
                          </td>
                        </tr>
                      ) : (
                        unitInvestmentsWithProfit.map((row) => {
                          const needsTransferUnit = capitalStillAvailableUnit(row) > 0;
                          return (
                          <tr key={row.id} className={`hover:bg-slate-50/50 transition ${needsTransferUnit ? "border-r-2 border-r-amber-300 bg-amber-50/20" : ""}`}>
                            <td className="p-3 text-center">
                              <div className="font-medium text-slate-800">وحدة {row.unit?.unit_number ?? "—"} — د{row.unit?.floor ?? "—"}</div>
                              <div className="text-xs text-slate-500">{row.building?.name ?? "—"}</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-medium text-slate-800">{row.investor_name}</div>
                              {row.investor_phone && <div className="text-xs text-slate-500 dir-ltr">{row.investor_phone}</div>}
                            </td>
                            <td className="p-3 text-center font-medium text-slate-700 dir-ltr">
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{formatNum(Number(row.purchase_price))} ر.س</span>
                                {needsTransferUnit && (
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setViewingUnitInvestment(null); openTransferModalFromUnit(row); }} className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-amber-700/90 font-medium tracking-tight hover:text-amber-800 hover:underline focus:outline-none" title="نقل رأس المال القائم">
                                    <ArrowRightLeft className="w-2.5 h-2.5 shrink-0 text-amber-600/80" strokeWidth={2.2} />
                                    نقل رأس مال
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center dir-ltr">
                              {row.resalePrice != null ? `${formatNum(Number(row.resalePrice))} ر.س` : "—"}
                            </td>
                            <td className="p-3 text-center dir-ltr">
                              {row.profit != null ? (
                                <span className="font-bold text-emerald-700">+{formatNum(Number(row.profit))} ر.س</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <StatusBadge
                                label={row.status === "resold" ? "تم إعادة البيع" : row.status === "cancelled" ? "ملغي" : "تحت الإنشاء"}
                                variant={row.status === "resold" ? "emerald" : row.status === "cancelled" ? "slate" : "amber"}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button type="button" onClick={() => setViewingUnitInvestment(row)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg" title="معاينة">
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canEdit && (
                                  <button type="button" onClick={() => openEditUnit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="تعديل">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                <button type="button" onClick={() => {
                                  setClosingUnitInvestment({ ...row, buildingName: row.building?.name });
                                  setClosingUnitSaleId(row.resale_sale_id || "");
                                  setClosingUnitSettlementType((row as UnitInvestmentRow).settlement_type === "profit_only" ? "profit_only" : (row as UnitInvestmentRow).settlement_type === "with_capital" ? "with_capital" : "");
                                  setClosingUnitCommission((row as UnitInvestmentRow).resale_commission != null ? Number((row as UnitInvestmentRow).resale_commission).toLocaleString("en") : "");
                                  setClosingUnitAdminFees((row as UnitInvestmentRow).admin_fees != null ? Number((row as UnitInvestmentRow).admin_fees).toLocaleString("en") : "");
                                  setClosingUnitStep(1);
                                  setClosingUnitSettlementMethod("");
                                  setClosingUnitSettlementAccountIban("");
                                  setClosingUnitSettlementBankName("");
                                }} className={row.status === "resold" ? "p-2 text-slate-500 hover:bg-slate-100 rounded-lg" : "p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"} title={row.status === "resold" ? "عرض المخالصة" : "إغلاق الصفقة"}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                {canEdit && (
                                  <button type="button" onClick={() => setDeleteConfirm({ type: "unit", id: row.id, label: row.investor_name })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* بطاقة معاينة استثمار الوحدة */}
      {viewingUnitInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingUnitInvestment(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">بيانات استثمار الوحدة</h3>
              <button type="button" onClick={() => setViewingUnitInvestment(null)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 1. بيانات المستثمر */}
              <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200/80">بيانات المستثمر</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <Row label="المستثمر" value={viewingUnitInvestment.investor_name} />
                  <Row label="الجوال" value={viewingUnitInvestment.investor_phone ?? "—"} dirLtr />
                  <Row label="رقم الهوية" value={viewingUnitInvestment.investor_id_number ?? "—"} dirLtr />
                </div>
              </section>

              {/* 2. عملية الاستثمار */}
              <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200/80">عملية الاستثمار</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <Row label="الوحدة / العمارة" value={`وحدة ${viewingUnitInvestment.unit?.unit_number ?? "—"} — د${viewingUnitInvestment.unit?.floor ?? "—"} — ${viewingUnitInvestment.building?.name ?? "—"}`} />
                  <Row label="سعر الشراء" value={`${formatNum(Number(viewingUnitInvestment.purchase_price))} ر.س`} dirLtr />
                  {(viewingUnitInvestment as UnitInvestmentRow).purchase_commission != null && Number((viewingUnitInvestment as UnitInvestmentRow).purchase_commission) > 0 && (
                    <>
                      <Row label="عمولة البيع" value={`-${formatNum(Number((viewingUnitInvestment as UnitInvestmentRow).purchase_commission))} ر.س`} dirLtr />
                      <Row label="السعر الفعلي" value={`${formatNum(getEffectivePurchasePrice(viewingUnitInvestment))} ر.س`} dirLtr />
                    </>
                  )}
                  <Row label="طريقة الدفع" value={viewingUnitInvestment.payment_method ? settlementMethodLabel(viewingUnitInvestment.payment_method) : "—"} />
                  {viewingUnitInvestment.payment_method === "transfer" && viewingUnitInvestment.payment_bank_name && (
                    <Row label="على بنك" value={viewingUnitInvestment.payment_bank_name} />
                  )}
                  {viewingUnitInvestment.payment_method === "check" && viewingUnitInvestment.payment_check_number && (
                    <Row label="رقم الشيك" value={viewingUnitInvestment.payment_check_number} dirLtr />
                  )}
                  <Row label="تاريخ الشراء" value={viewingUnitInvestment.purchase_date ? formatDateEn(viewingUnitInvestment.purchase_date) : "—"} dirLtr />
                  <Row label="حالة مشروع الاستثمار" value={viewingUnitInvestment.status === "resold" ? "تم إعادة البيع" : viewingUnitInvestment.status === "cancelled" ? "ملغي" : "تحت الإنشاء"} />
                  {viewingUnitInvestment.notes && <Row label="ملاحظات" value={viewingUnitInvestment.notes} />}
                </div>
                <div className="pt-3 mt-2 border-t border-slate-200/80">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">المرفقات</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingUnitInvestment.contract_image_path ? (
                      <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          const { data } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).createSignedUrl(viewingUnitInvestment.contract_image_path!, 3600);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-teal-200/80 bg-teal-50/60 text-teal-800 text-xs font-medium hover:bg-teal-100/80 transition-colors"
                        title="عرض صورة العقد"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        عقد
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
                        عقد —
                      </span>
                    )}
                    {viewingUnitInvestment.id_image_path ? (
                      <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          const { data } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).createSignedUrl(viewingUnitInvestment.id_image_path!, 3600);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-teal-200/80 bg-teal-50/60 text-teal-800 text-xs font-medium hover:bg-teal-100/80 transition-colors"
                        title="عرض صورة الهوية"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        هوية
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
                        هوية —
                      </span>
                    )}
                    {viewingUnitInvestment.payment_method === "check" && (
                      viewingUnitInvestment.payment_check_image_path ? (
                        <a
                          href="#"
                          onClick={async (e) => {
                            e.preventDefault();
                            const { data } = await supabase.storage.from(INVESTOR_DOCS_BUCKET).createSignedUrl(viewingUnitInvestment.payment_check_image_path!, 3600);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-teal-200/80 bg-teal-50/60 text-teal-800 text-xs font-medium hover:bg-teal-100/80 transition-colors"
                          title="عرض صورة الشيك"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          شيك
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
                          شيك —
                        </span>
                      )
                    )}
                  </div>
                </div>
              </section>

              {/* 3. عملية إعادة البيع */}
              <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200/80">عملية إعادة البيع</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <Row label="سعر إعادة البيع" value={viewingUnitInvestment.resalePrice != null ? `${formatNum(Number(viewingUnitInvestment.resalePrice))} ر.س` : "—"} dirLtr />
                  <Row label="الربح" value={viewingUnitInvestment.profit != null ? `+${formatNum(Number(viewingUnitInvestment.profit))} ر.س` : "—"} dirLtr />
                  {viewingUnitInvestment.status === "resold" && (viewingUnitInvestment as UnitInvestmentRow).settlement_type && (
                    <Row label="نوع المخالصة" value={(viewingUnitInvestment as UnitInvestmentRow).settlement_type === "with_capital" ? "مع رأس المال" : "أرباح فقط"} />
                  )}
                  {viewingUnitInvestment.status === "resold" && (viewingUnitInvestment as UnitInvestmentRow).settlement_method && (
                    <Row label="طريقة المخالصة" value={settlementMethodLabel((viewingUnitInvestment as UnitInvestmentRow).settlement_method!)} />
                  )}
                </div>
                {viewingUnitInvestment.status === "resold" && viewingUnitInvestment.settlement_type === "profit_only" && capitalStillAvailableUnit(viewingUnitInvestment) > 0 && (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/30 p-3 mt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">رأس المال القائم في الوحدة</span>
                      <span className="font-semibold dir-ltr text-amber-700">{formatNum(capitalStillAvailableUnit(viewingUnitInvestment))} ر.س</span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center pt-1">
                      <button type="button" onClick={() => openTransferModalFromUnit(viewingUnitInvestment)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-amber-400 bg-white text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        نقل رأس المال إلى عمارة أو وحدة
                      </button>
                    </div>
                  </div>
                )}
                {viewingUnitInvestment.status !== "resold" && (
                  <p className="text-xs text-slate-400 pt-1">لم تُنفّذ إعادة البيع بعد</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إغلاق صفقة استثمار الوحدة */}
      {closingUnitInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setClosingUnitInvestment(null); setClosingUnitSaleId(""); setClosingUnitSettlementType(""); setClosingUnitCommission(""); setClosingUnitAdminFees(""); setClosingUnitStep(1); setClosingUnitSettlementMethod(""); setClosingUnitSettlementAccountIban(""); setClosingUnitSettlementBankName(""); }}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                إغلاق صفقة الاستثمار
              </h3>
              <button type="button" onClick={() => { setClosingUnitInvestment(null); setClosingUnitSaleId(""); setClosingUnitSettlementType(""); setClosingUnitCommission(""); setClosingUnitAdminFees(""); setClosingUnitStep(1); setClosingUnitSettlementMethod(""); setClosingUnitSettlementAccountIban(""); setClosingUnitSettlementBankName(""); }} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                <p className="font-semibold text-slate-700">بيانات العقد (المتاحة)</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between"><span className="text-slate-500">رأس المال (سعر الشراء)</span><span className="font-medium dir-ltr">{formatNum(Number(closingUnitInvestment.purchase_price))} ر.س</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">المستثمر</span><span className="font-medium">{closingUnitInvestment.investor_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">الوحدة / العمارة</span><span className="font-medium">وحدة {closingUnitInvestment.unit?.unit_number ?? "—"} — {closingUnitInvestment.buildingName ?? closingUnitInvestment.building?.name ?? "—"}</span></div>
                </div>
              </div>
              {closingUnitInvestment.status === "resold" ? (
                <>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2 text-sm">
                    <p className="font-semibold text-emerald-800">الصفقة مُغلقة (مُخالصة)</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between"><span className="text-slate-600">سعر إعادة البيع</span><span className="font-semibold dir-ltr text-emerald-700">{closingUnitInvestment.resalePrice != null ? `${formatNum(Number(closingUnitInvestment.resalePrice))} ر.س` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">الربح الإجمالي</span><span className="font-semibold dir-ltr text-emerald-700">+{closingUnitInvestment.profit != null ? formatNum(Number(closingUnitInvestment.profit)) : "—"} ر.س</span></div>
                      {((closingUnitInvestment as UnitInvestmentRow).resale_commission != null && Number((closingUnitInvestment as UnitInvestmentRow).resale_commission) > 0) || ((closingUnitInvestment as UnitInvestmentRow).admin_fees != null && Number((closingUnitInvestment as UnitInvestmentRow).admin_fees) > 0) ? (
                        <>
                          {(closingUnitInvestment as UnitInvestmentRow).resale_commission != null && Number((closingUnitInvestment as UnitInvestmentRow).resale_commission) > 0 && <div className="flex justify-between"><span className="text-slate-600">عمولة البيع</span><span className="font-medium dir-ltr text-slate-700">-{formatNum(Number((closingUnitInvestment as UnitInvestmentRow).resale_commission))} ر.س</span></div>}
                          {(closingUnitInvestment as UnitInvestmentRow).admin_fees != null && Number((closingUnitInvestment as UnitInvestmentRow).admin_fees) > 0 && <div className="flex justify-between"><span className="text-slate-600">رسوم إدارية</span><span className="font-medium dir-ltr text-slate-700">-{formatNum(Number((closingUnitInvestment as UnitInvestmentRow).admin_fees))} ر.س</span></div>}
                          <div className="flex justify-between"><span className="text-slate-600">صافي الربح</span><span className="font-semibold dir-ltr text-emerald-700">+{formatNum(Math.max(0, (closingUnitInvestment.profit ?? 0) - Number((closingUnitInvestment as UnitInvestmentRow).resale_commission || 0) - Number((closingUnitInvestment as UnitInvestmentRow).admin_fees || 0)))} ر.س</span></div>
                        </>
                      ) : null}
                      {Number(closingUnitInvestment.purchase_price) > 0 && closingUnitInvestment.profit != null && (
                        <div className="flex justify-between"><span className="text-slate-600">نسبة الربح</span><span className="font-semibold dir-ltr text-teal-700">{((Number(closingUnitInvestment.profit) / Number(closingUnitInvestment.purchase_price)) * 100).toFixed(1)}%</span></div>
                      )}
                      {(closingUnitInvestment as UnitInvestmentRow).settlement_method && (
                        <p className="text-emerald-800 font-semibold pb-2 border-b border-emerald-100/80">تم المخالصة بـ {settlementMethodLabel((closingUnitInvestment as UnitInvestmentRow).settlement_method)}</p>
                      )}
                      {(closingUnitInvestment as UnitInvestmentRow).settlement_type && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-600">نوع المخالصة</span><span className="font-medium">{(closingUnitInvestment as UnitInvestmentRow).settlement_type === "with_capital" ? "مع رأس المال" : "أرباح فقط"}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">مبلغ المخالصة</span><span className="font-semibold dir-ltr text-emerald-700">{(() => { const gross = closingUnitInvestment.profit ?? 0; const comm = Number((closingUnitInvestment as UnitInvestmentRow).resale_commission || 0); const adm = Number((closingUnitInvestment as UnitInvestmentRow).admin_fees || 0); const net = Math.max(0, gross - comm - adm); const capital = Number(closingUnitInvestment.purchase_price); return (closingUnitInvestment as UnitInvestmentRow).settlement_type === "with_capital" ? formatNum(capital + net) : formatNum(net); })()} ر.س</span></div>
                          {(closingUnitInvestment as UnitInvestmentRow).settlement_account_iban && <div className="flex justify-between"><span className="text-slate-600">رقم الحساب / الآيبان</span><span className="font-medium dir-ltr">{(closingUnitInvestment as UnitInvestmentRow).settlement_account_iban}</span></div>}
                          {(closingUnitInvestment as UnitInvestmentRow).settlement_bank_name && <div className="flex justify-between"><span className="text-slate-600">اسم البنك</span><span className="font-medium">{(closingUnitInvestment as UnitInvestmentRow).settlement_bank_name}</span></div>}
                          {(closingUnitInvestment as UnitInvestmentRow).settlement_type === "profit_only" && (
                            <p className="text-xs text-amber-700 mt-2 pt-2 border-t border-emerald-100">
                              يجب نقل رأس المال المتبقي إلى عمارة أو وحدة جديدة أو مخالصة رأس المال لضبط الحسابات الصحيحة.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {(closingUnitInvestment as UnitInvestmentRow).settlement_type === "profit_only" && capitalStillAvailableUnit(closingUnitInvestment as UnitInvestmentRow) > 0 && (
                    <button type="button" onClick={() => { setClosingUnitInvestment(null); setClosingUnitSaleId(""); setClosingUnitSettlementType(""); setClosingUnitCommission(""); setClosingUnitAdminFees(""); setClosingUnitStep(1); setClosingUnitSettlementMethod(""); setClosingUnitSettlementAccountIban(""); setClosingUnitSettlementBankName(""); openTransferModalFromUnit(closingUnitInvestment as UnitInvestmentRow); }} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors">
                      <ArrowRightLeft className="w-4 h-4 shrink-0" />
                      نقل رأس المال
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* مؤشر الخطوات */}
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${closingUnitStep === s ? "bg-emerald-600 text-white" : closingUnitStep > s ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{s}</span>
                    ))}
                  </div>

                  {/* الخطوة 1: ربط البيع + عمولة + رسوم + نوع المخالصة */}
                  {closingUnitStep === 1 && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">ربط عملية البيع (مطلوب للإغلاق)</label>
                        <select
                          value={closingUnitSaleId}
                          onChange={(e) => setClosingUnitSaleId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        >
                          <option value="">— اختر عملية البيع —</option>
                          {sales.filter((s) => s.unit_id === closingUnitInvestment.unit_id).map((s) => (
                            <option key={s.id} value={s.id}>بيع بـ {formatNum(Number(s.sale_price))} ر.س</option>
                          ))}
                        </select>
                        {closingUnitSaleId && (() => {
                          const sale = sales.find((s) => s.id === closingUnitSaleId);
                          const resalePrice = sale?.sale_price ?? 0;
                          const capital = Number(closingUnitInvestment.purchase_price);
                          const profit = resalePrice - capital;
                          const pct = capital > 0 ? ((profit / capital) * 100).toFixed(1) : "—";
                          return (
                            <p className="text-xs text-slate-500">الربح الإجمالي: +{formatNum(profit)} ر.س ({pct}%)</p>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-slate-700">عمولة البيع (ر.س)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={closingUnitCommission}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setClosingUnitCommission(raw === "" ? "" : Number(raw).toLocaleString("en"));
                            }}
                            placeholder="0"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dir-ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-slate-700">رسوم إدارية (ر.س)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={closingUnitAdminFees}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setClosingUnitAdminFees(raw === "" ? "" : Number(raw).toLocaleString("en"));
                            }}
                            placeholder="0"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dir-ltr"
                          />
                        </div>
                      </div>
                      {closingUnitSaleId && (() => {
                        const sale = sales.find((s) => s.id === closingUnitSaleId);
                        const resalePrice = sale?.sale_price ?? 0;
                        const capital = Number(closingUnitInvestment.purchase_price);
                        const grossProfit = resalePrice - capital;
                        const toNum = (s: string) => { const d = (s || "").replace(/\D/g, ""); return d.length > 0 ? Number(d) : 0; };
                        const commission = toNum(closingUnitCommission);
                        const adminFees = toNum(closingUnitAdminFees);
                        const netProfit = Math.max(0, grossProfit - commission - adminFees);
                        return (
                          <p className="text-xs text-slate-600 font-medium">صافي الربح بعد الخصم: <span className="dir-ltr text-emerald-700">+{formatNum(netProfit)} ر.س</span></p>
                        );
                      })()}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">نوع المخالصة (مطلوب)</label>
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => setClosingUnitSettlementType("profit_only")} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${closingUnitSettlementType === "profit_only" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                            أرباح فقط
                          </button>
                          <button type="button" onClick={() => setClosingUnitSettlementType("with_capital")} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${closingUnitSettlementType === "with_capital" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                            مع رأس المال
                          </button>
                        </div>
                        {closingUnitSaleId && closingUnitSettlementType && (() => {
                          const sale = sales.find((s) => s.id === closingUnitSaleId);
                          const resalePrice = sale?.sale_price ?? 0;
                          const capital = Number(closingUnitInvestment.purchase_price);
                          const grossProfit = resalePrice - capital;
                          const toNum = (s: string) => { const d = (s || "").replace(/\D/g, ""); return d.length > 0 ? Number(d) : 0; };
                          const netProfit = Math.max(0, grossProfit - toNum(closingUnitCommission) - toNum(closingUnitAdminFees));
                          const amount = closingUnitSettlementType === "with_capital" ? capital + netProfit : netProfit;
                          return <p className="text-xs text-slate-500">مبلغ المخالصة: {formatNum(amount)} ر.س</p>;
                        })()}
                      </div>
                      <div className="flex justify-end pt-1">
                        <button type="button" onClick={() => setClosingUnitStep(2)} disabled={!closingUnitSaleId || !closingUnitSettlementType} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                          التالي
                        </button>
                      </div>
                    </>
                  )}

                  {/* الخطوة 2: طريقة المخالصة (كاش / تحويل / شيك مصدق) + حقول */}
                  {closingUnitStep === 2 && (() => {
                    const sale = sales.find((s) => s.id === closingUnitSaleId);
                    const resalePrice = sale?.sale_price ?? 0;
                    const capital = Number(closingUnitInvestment.purchase_price);
                    const grossProfit = resalePrice - capital;
                    const toNum = (s: string) => { const d = (s || "").replace(/\D/g, ""); return d.length > 0 ? Number(d) : 0; };
                    const netProfit = Math.max(0, grossProfit - toNum(closingUnitCommission) - toNum(closingUnitAdminFees));
                    const settlementAmount = closingUnitSettlementType === "with_capital" ? capital + netProfit : netProfit;
                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">طريقة المخالصة</p>
                        <div className="flex flex-wrap gap-2">
                          {([{ value: "حوالة", label: "حوالة" }, { value: "شيك", label: "شيك مصدق" }, { value: "كاش", label: "كاش" }] as const).map(({ value, label }) => (
                            <button key={value} type="button" onClick={() => setClosingUnitSettlementMethod(value)} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${closingUnitSettlementMethod === value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{label}</button>
                          ))}
                        </div>
                        {closingUnitSettlementMethod === "حوالة" && (
                          <div className="flex flex-wrap items-end gap-2 pt-1">
                            <div className="min-w-0 flex-1 max-w-[300px]">
                              <label className="block text-xs font-medium text-slate-600 mb-0.5">رقم الحساب أو الآيبان</label>
                              <input type="text" value={closingUnitSettlementAccountIban} onChange={(e) => setClosingUnitSettlementAccountIban(e.target.value)} placeholder="رقم الحساب / الآيبان" className="w-full border border-slate-200 rounded-full px-4 py-2 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                            </div>
                            <div className="min-w-0 flex-1 max-w-[180px]">
                              <label className="block text-xs font-medium text-slate-600 mb-0.5">اسم البنك</label>
                              <input type="text" value={closingUnitSettlementBankName} onChange={(e) => setClosingUnitSettlementBankName(e.target.value)} placeholder="اسم البنك" className="w-full border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                            </div>
                          </div>
                        )}
                        {closingUnitSettlementMethod === "شيك" && (
                          <div className="flex flex-wrap items-end gap-2 pt-1">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-0.5">مبلغ الشيك (ر.س)</label>
                              <div className="border border-slate-200 rounded-full px-4 py-2 text-sm font-bold text-emerald-700 dir-ltr bg-emerald-50/50 min-w-0">
                                {formatNum(settlementAmount)} ر.س
                              </div>
                            </div>
                            <div className="flex-1 min-w-[140px] max-w-[200px]">
                              <label className="block text-xs font-medium text-slate-600 mb-0.5">من بنك</label>
                              <input type="text" value={closingUnitSettlementBankName} onChange={(e) => setClosingUnitSettlementBankName(e.target.value)} placeholder="اسم البنك" className="w-full border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                            </div>
                          </div>
                        )}
                        {closingUnitSettlementMethod === "كاش" && (
                          <div className="pt-1">
                            <p className="text-xs font-medium text-slate-600 mb-0.5">مبلغ الكاش (ر.س)</p>
                            <p className="text-sm font-bold text-emerald-700 dir-ltr">{formatNum(settlementAmount)} ر.س</p>
                          </div>
                        )}
                        <div className="flex justify-between pt-2">
                          <button type="button" onClick={() => setClosingUnitStep(1)} className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">السابق</button>
                          <button type="button" onClick={() => setClosingUnitStep(3)} disabled={!closingUnitSettlementMethod} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                            التالي
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* الخطوة 3: تأكيد إغلاق الصفقة */}
                  {closingUnitStep === 3 && (() => {
                    const sale = sales.find((s) => s.id === closingUnitSaleId);
                    const resalePrice = sale?.sale_price ?? 0;
                    const capital = Number(closingUnitInvestment.purchase_price);
                    const grossProfit = resalePrice - capital;
                    const toNum = (s: string) => { const d = (s || "").replace(/\D/g, ""); return d.length > 0 ? Number(d) : 0; };
                    const netProfit = Math.max(0, grossProfit - toNum(closingUnitCommission) - toNum(closingUnitAdminFees));
                    const amount = closingUnitSettlementType === "with_capital" ? capital + netProfit : netProfit;
                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">تأكيد إغلاق الصفقة</p>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
                          <p>نوع المخالصة: {closingUnitSettlementType === "with_capital" ? "مع رأس المال" : "أرباح فقط"} — مبلغ المخالصة: <span className="font-semibold dir-ltr text-emerald-700">{formatNum(amount)} ر.س</span></p>
                          <p>طريقة المخالصة: {closingUnitSettlementMethod === "شيك" ? "شيك مصدق" : closingUnitSettlementMethod}</p>
                        </div>
                        <div className="flex justify-between pt-1">
                          <button type="button" onClick={() => setClosingUnitStep(2)} className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">السابق</button>
                          <button type="button" onClick={confirmCloseUnitDeal} disabled={saving} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? "جاري الإغلاق..." : "تأكيد إغلاق الصفقة"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة إغلاق صفقة استثمار العمارة */}
      {closingBuildingInvestor && (() => {
        const capital = closingBuildingInvestor.total_invested_amount != null ? Number(closingBuildingInvestor.total_invested_amount) : 0;
        const pctMin = Number(closingBuildingInvestor.profit_percentage);
        const pctMax = closingBuildingInvestor.profit_percentage_to != null ? Number(closingBuildingInvestor.profit_percentage_to) : pctMin;
        const pctStr = closingBuildingPercentage.replace(/,/g, ".").trim();
        const pctNum = pctStr ? parseFloat(pctStr) : NaN;
        const pctInRange = !isNaN(pctNum) && pctNum >= Math.min(pctMin, pctMax) && pctNum <= Math.max(pctMin, pctMax);
        const computedProfit = pctInRange && capital > 0 ? Math.round((capital * pctNum) / 100) : null;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setClosingBuildingInvestor(null); setClosingBuildingPercentage(""); setClosingSettlementMethod(""); setClosingSettlementAccountIban(""); setClosingSettlementBankName(""); setClosingSettlementType(""); setClosingStep(1); setClosingSettlementCashAmount(""); setClosingSettlementCheckAmount(""); setClosingStep(1); setClosingSettlementCashAmount(""); setClosingSettlementCheckAmount(""); }}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                إغلاق صفقة الاستثمار (عمارة)
              </h3>
              <button type="button" onClick={() => { setClosingBuildingInvestor(null); setClosingBuildingPercentage(""); setClosingSettlementMethod(""); setClosingSettlementAccountIban(""); setClosingSettlementBankName(""); setClosingSettlementType(""); setClosingStep(1); setClosingSettlementCashAmount(""); setClosingSettlementCheckAmount(""); setClosingStep(1); setClosingSettlementCashAmount(""); setClosingSettlementCheckAmount(""); }} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                <p className="font-semibold text-slate-700">بيانات العقد (المتاحة)</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between"><span className="text-slate-500">رأس المال (مبلغ الاستثمار)</span><span className="font-medium dir-ltr">{closingBuildingInvestor.total_invested_amount != null ? `${formatNum(Number(closingBuildingInvestor.total_invested_amount))} ر.س` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">المستثمر</span><span className="font-medium">{closingBuildingInvestor.investor_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">نسبة الربح المتفق عليها</span><span className="font-medium">{closingBuildingInvestor.profit_percentage_to != null && Number(closingBuildingInvestor.profit_percentage_to) !== Number(closingBuildingInvestor.profit_percentage) ? `${closingBuildingInvestor.profit_percentage}%–${closingBuildingInvestor.profit_percentage_to}%` : `${closingBuildingInvestor.profit_percentage}%`}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">الربح المتوقع (من النسبة)</span><span className="font-medium dir-ltr">{closingBuildingInvestor.total_invested_amount != null && closingBuildingInvestor.profit_percentage != null ? (() => { const a = Number(closingBuildingInvestor.total_invested_amount); const from = (a * Number(closingBuildingInvestor.profit_percentage)) / 100; const to = closingBuildingInvestor.profit_percentage_to != null ? (a * Number(closingBuildingInvestor.profit_percentage_to)) / 100 : null; return to != null ? `${formatNum(Math.round(from))} – ${formatNum(Math.round(to))} ر.س` : `${formatNum(Math.round(from))} ر.س`; })() : "—"}</span></div>
                </div>
              </div>
              {closingBuildingInvestor.closed_at ? (
                <div className="rounded-xl border border-emerald-200/80 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-l from-emerald-500 to-teal-500 px-4 py-3 text-center">
                    <p className="text-lg font-bold text-white tracking-wide">مخالصة</p>
                  </div>
                  <div className="bg-emerald-50/90 p-4 space-y-2 text-sm">
                  {closingBuildingInvestor.settlement_method && (
                    <p className="text-emerald-800 font-semibold pb-2 border-b border-emerald-100/80">تم المخالصة بـ {settlementMethodLabel(closingBuildingInvestor.settlement_method)}</p>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {closingBuildingInvestor.settlement_type && (
                      <div className="flex justify-between"><span className="text-slate-600">نوع المخالصة</span><span className="font-medium">{settlementTypeLabel(closingBuildingInvestor.settlement_type)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-slate-600">نسبة الإغلاق النهائية</span><span className="font-semibold dir-ltr text-teal-700">{closingBuildingInvestor.closing_percentage != null && closingBuildingInvestor.closing_percentage !== undefined ? Number(closingBuildingInvestor.closing_percentage) + "%" : (closingBuildingInvestor.total_invested_amount != null && closingBuildingInvestor.realized_profit != null ? ((Number(closingBuildingInvestor.realized_profit) / Number(closingBuildingInvestor.total_invested_amount)) * 100).toFixed(1) + "%" : "—")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">الربح المحقق (ر.س)</span><span className="font-semibold dir-ltr text-emerald-700">{closingBuildingInvestor.realized_profit != null ? `${formatNum(Number(closingBuildingInvestor.realized_profit))} ر.س` : "—"}</span></div>
                    {closingBuildingInvestor.realized_profit != null && (
                      <div className="flex justify-between"><span className="text-slate-600">{closingBuildingInvestor.settlement_type === "profit_only" ? "مبلغ المخالصة (أرباح فقط)" : "الإجمالي (رأس المال + الربح)"}</span><span className="font-bold dir-ltr text-emerald-800">{closingBuildingInvestor.settlement_type === "profit_only" ? formatNum(Number(closingBuildingInvestor.realized_profit)) : (closingBuildingInvestor.total_invested_amount != null ? formatNum(Number(closingBuildingInvestor.total_invested_amount) + Number(closingBuildingInvestor.realized_profit)) : "—")} ر.س</span></div>
                    )}
                    {closingBuildingInvestor.settlement_type === "profit_only" && (() => { const cap = capitalStillAvailable(closingBuildingInvestor); return cap > 0 ? (<div className="flex justify-between"><span className="text-slate-600">رأس المال القائم في العمارة</span><span className="font-semibold dir-ltr text-amber-700">{formatNum(cap)} ر.س</span></div>) : null; })()}
                    <div className="flex justify-between"><span className="text-slate-600">تاريخ الإغلاق</span><span className="font-medium">{closingBuildingInvestor.closed_at ? formatDateEn(closingBuildingInvestor.closed_at) : "—"}</span></div>
                    {closingBuildingInvestor.settlement_account_iban && <div className="flex justify-between"><span className="text-slate-600">رقم الحساب / الآيبان</span><span className="font-medium dir-ltr">{closingBuildingInvestor.settlement_account_iban}</span></div>}
                    {closingBuildingInvestor.settlement_bank_name && <div className="flex justify-between"><span className="text-slate-600">اسم البنك</span><span className="font-medium">{closingBuildingInvestor.settlement_bank_name}</span></div>}
                    {(() => {
                      const t = getClosingTimingLabel(closingBuildingInvestor.closed_at, closingBuildingInvestor.investment_due_date);
                      return t ? (
                        <div className="flex justify-between items-center gap-2 pt-2 border-t border-emerald-100/80">
                          <span className="text-slate-600 text-sm">توقيت الإغلاق</span>
                          <span className={`text-xs font-medium text-right ${t.variant === "early" ? "text-teal-700" : t.variant === "late" ? "text-amber-700" : "text-slate-600"}`}>{t.label}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  </div>
                </div>
              ) : null}
              {closingBuildingInvestor.closed_at && closingBuildingInvestor.settlement_type === "profit_only" && capitalStillAvailable(closingBuildingInvestor) > 0 && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-800">نقل رأس المال</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button type="button" onClick={() => { setClosingBuildingInvestor(null); setClosingBuildingPercentage(""); setClosingSettlementMethod(""); setClosingSettlementAccountIban(""); setClosingSettlementBankName(""); setClosingSettlementType(""); setClosingStep(1); setClosingSettlementCashAmount(""); setClosingSettlementCheckAmount(""); openTransferModal(closingBuildingInvestor); }} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-amber-400 bg-white text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      نقل رأس المال إلى عمارة أو وحدة
                    </button>
                  </div>
                </div>
              )}
              {!closingBuildingInvestor.closed_at && (
                <>
                  {/* مؤشر الخطوات */}
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    {[1, 2, 3, 4].map((s) => (
                      <span key={s} className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${closingStep === s ? "bg-emerald-600 text-white" : closingStep > s ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{s}</span>
                    ))}
                  </div>

                  {/* الخطوة 1: نسبة الإغلاق والربح المحقق */}
                  {closingStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">نسبة الإغلاق والربح المحقق</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-600">نسبة الإغلاق %</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={closingBuildingPercentage}
                          onChange={(e) => setClosingBuildingPercentage(e.target.value.replace(/[^\d.,]/g, "").replace(/,/g, "."))}
                          placeholder={pctMin === pctMax ? `${pctMin}` : `${pctMin}–${pctMax}`}
                          className="w-20 h-9 border border-slate-200 rounded-full px-3 py-1.5 text-sm text-center dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        {computedProfit != null && <span className="text-sm font-semibold text-emerald-700 dir-ltr">الربح المحقق: {formatNum(computedProfit)} ر.س</span>}
                      </div>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => setClosingStep(2)} disabled={!pctInRange} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">التالي</button>
                      </div>
                    </div>
                  )}

                  {/* الخطوة 2: نوع المخالصة */}
                  {closingStep === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">نوع المخالصة</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setClosingSettlementType("profit_only")} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${closingSettlementType === "profit_only" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>الأرباح فقط</button>
                        <button type="button" onClick={() => setClosingSettlementType("with_capital")} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${closingSettlementType === "with_capital" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>مع رأس المال</button>
                      </div>
                      {closingSettlementType === "profit_only" && computedProfit != null && (
                        <p className="text-sm text-slate-600">إجمالي المخالصة: <span className="font-bold dir-ltr text-emerald-700">{formatNum(computedProfit)} ر.س</span></p>
                      )}
                      {closingSettlementType === "with_capital" && computedProfit != null && (
                        <p className="text-sm text-slate-600">إجمالي المخالصة: <span className="font-bold dir-ltr text-emerald-700">{formatNum(capital + computedProfit)} ر.س</span></p>
                      )}
                      <div className="flex justify-between pt-1">
                        <button type="button" onClick={() => setClosingStep(1)} className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">السابق</button>
                        <button type="button" onClick={() => setClosingStep(3)} disabled={!closingSettlementType} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">التالي</button>
                      </div>
                    </div>
                  )}

                  {/* الخطوة 3: طريقة المخالصة + حقول حسب النوع — المبلغ يُحسب أوتوماتيكياً حسب نوع المخالصة */}
                  {closingStep === 3 && (() => {
                    const settlementAmount = computedProfit != null ? (closingSettlementType === "with_capital" ? capital + computedProfit : computedProfit) : null;
                    return (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">طريقة المخالصة</p>
                      <div className="flex flex-wrap gap-2">
                        {([{ value: "حوالة", label: "حوالة" }, { value: "شيك", label: "شيك مصدق" }, { value: "كاش", label: "كاش" }] as const).map(({ value, label }) => (
                          <button key={value} type="button" onClick={() => setClosingSettlementMethod(value)} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${closingSettlementMethod === value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{label}</button>
                        ))}
                      </div>
                      {closingSettlementMethod === "حوالة" && (
                        <div className="flex flex-wrap items-end gap-2 pt-1">
                          <div className="min-w-0 flex-1 max-w-[300px]">
                            <label className="block text-xs font-medium text-slate-600 mb-0.5">رقم الحساب أو الآيبان</label>
                            <input type="text" value={closingSettlementAccountIban} onChange={(e) => setClosingSettlementAccountIban(e.target.value)} placeholder="رقم الحساب / الآيبان" className="w-full border border-slate-200 rounded-full px-4 py-2 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                          <div className="min-w-0 flex-1 max-w-[180px]">
                            <label className="block text-xs font-medium text-slate-600 mb-0.5">اسم البنك</label>
                            <input type="text" value={closingSettlementBankName} onChange={(e) => setClosingSettlementBankName(e.target.value)} placeholder="اسم البنك" className="w-full border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                        </div>
                      )}
                      {closingSettlementMethod === "شيك" && settlementAmount != null && (
                        <div className="flex flex-wrap items-end gap-2 pt-1">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-0.5">مبلغ الشيك (ر.س)</label>
                            <div className="border border-slate-200 rounded-full px-4 py-2 text-sm font-bold text-emerald-700 dir-ltr bg-emerald-50/50 min-w-0">
                              {formatNum(settlementAmount)} ر.س
                            </div>
                          </div>
                          <div className="flex-1 min-w-[140px] max-w-[200px]">
                            <label className="block text-xs font-medium text-slate-600 mb-0.5">من بنك</label>
                            <input type="text" value={closingSettlementBankName} onChange={(e) => setClosingSettlementBankName(e.target.value)} placeholder="اسم البنك" className="w-full border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                          </div>
                        </div>
                      )}
                      {closingSettlementMethod === "كاش" && settlementAmount != null && (
                        <div className="pt-1">
                          <p className="text-xs font-medium text-slate-600 mb-0.5">مبلغ الكاش (ر.س)</p>
                          <p className="text-sm font-bold text-emerald-700 dir-ltr">{formatNum(settlementAmount)} ر.س</p>
                        </div>
                      )}
                      <div className="flex justify-between pt-2">
                        <button type="button" onClick={() => setClosingStep(2)} className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">السابق</button>
                        <button type="button" onClick={() => setClosingStep(4)} disabled={!closingSettlementMethod} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">التالي</button>
                      </div>
                    </div>
                    );
                  })()}

                  {/* الخطوة 4: تأكيد إغلاق الصفقة */}
                  {closingStep === 4 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">تأكيد إغلاق الصفقة</p>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
                        <p>نسبة الإغلاق: <span className="font-medium dir-ltr">{closingBuildingPercentage}%</span> — الربح المحقق: <span className="font-medium dir-ltr text-emerald-700">{computedProfit != null ? formatNum(computedProfit) + " ر.س" : "—"}</span></p>
                        <p>نوع المخالصة: {closingSettlementType === "with_capital" ? "مع رأس المال" : "الأرباح فقط"}{closingSettlementType === "with_capital" && computedProfit != null ? ` (إجمالي ${formatNum(capital + computedProfit)} ر.س)` : ""}</p>
                        <p>طريقة المخالصة: {closingSettlementMethod === "شيك" ? "شيك مصدق" : closingSettlementMethod}</p>
                      </div>
                      <div className="flex justify-between pt-1">
                        <button type="button" onClick={() => setClosingStep(3)} className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">السابق</button>
                        <button type="button" onClick={confirmCloseBuildingDeal} disabled={saving || !pctInRange || !closingSettlementType || !closingSettlementMethod} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                          {saving ? "جاري الإغلاق..." : "تأكيد إغلاق الصفقة"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal: مستثمر بالعمارة */}
      {modalOpen === "building" && (() => {
        const amountRaw = formBuilding.total_invested_amount.replace(/\D/g, "");
        const amount = amountRaw ? parseInt(amountRaw, 10) || 0 : 0;
        const pctFrom = parseFloat(formBuilding.profit_percentage) || 0;
        const pctToRaw = formBuilding.profit_percentage_to.trim();
        const pctTo = pctToRaw ? parseFloat(pctToRaw) : null;
        const hasRange = amount > 0 && !isNaN(pctFrom) && pctTo != null && !isNaN(pctTo) && pctTo > pctFrom;
        const expectedFrom = amount > 0 && !isNaN(pctFrom) ? (amount * pctFrom) / 100 : null;
        const expectedTo = hasRange ? (amount * pctTo) / 100 : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(null)}>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()} dir="rtl">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-bold text-slate-800">{editingBuilding ? "تعديل مستثمر بالعمارة" : "إضافة مستثمر بالعمارة"}</h3>
                <button type="button" onClick={() => setModalOpen(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العمارة</label>
                  <select
                    value={formBuilding.building_id}
                    onChange={(e) => setFormBuilding((p) => ({ ...p, building_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    disabled={!!editingBuilding}
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستثمر</label>
                  <input
                    type="text"
                    value={formBuilding.investor_name}
                    onChange={(e) => setFormBuilding((p) => ({ ...p, investor_name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="اسم المستثمر"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الجوال</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={formBuilding.investor_phone}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, investor_phone: phoneDigitsOnly(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهوية</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formBuilding.investor_id_number}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, investor_id_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">نوع العقد</label>
                    <select
                      value={formBuilding.agreement_type}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, agreement_type: e.target.value as "agreed_percentage" | "from_building_sales" }))}
                      className="w-full h-[42px] border border-slate-200 rounded-xl px-4 py-2 text-sm leading-normal focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="agreed_percentage">نسبة متفق عليها</option>
                      <option value="from_building_sales">من مبيعات العمارة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ الاستثمار (ر.س)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formBuilding.total_invested_amount ? formatNum(parseInt(formBuilding.total_invested_amount.replace(/\D/g, ""), 10) || 0) : ""}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, total_invested_amount: e.target.value.replace(/\D/g, "") }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">نسبة الربح من %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={formBuilding.profit_percentage}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, profit_percentage: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">إلى %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={formBuilding.profit_percentage_to}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, profit_percentage_to: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
                {(expectedFrom != null && expectedFrom > 0) && (
                  <p className="w-full text-sm font-semibold text-teal-700 bg-teal-50 rounded-xl px-4 py-2.5 dir-ltr text-center">
                    {expectedTo != null
                      ? `الربح المتوقع: ${formatNum(Math.round(expectedFrom))} – ${formatNum(Math.round(expectedTo))} ر.س`
                      : `الربح المتوقع: ${formatNum(Math.round(expectedFrom))} ر.س`}
                  </p>
                )}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">طريقة الدفع</p>
                  <div className="flex flex-wrap gap-2">
                    {([{ value: "transfer", label: "حوالة" }, { value: "check", label: "شيك مصدق" }, { value: "cash", label: "كاش" }] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormBuilding((p) => ({ ...p, payment_method: value }))}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${formBuilding.payment_method === value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {formBuilding.payment_method === "transfer" && (
                    <div className="pt-1">
                      <label className="block text-xs font-medium text-slate-600 mb-0.5">على بنك</label>
                      <input
                        type="text"
                        value={formBuilding.payment_bank_name}
                        onChange={(e) => setFormBuilding((p) => ({ ...p, payment_bank_name: e.target.value }))}
                        placeholder="على بنك"
                        className="w-full max-w-[280px] border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  )}
                  {formBuilding.payment_method === "check" && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم الشيك</label>
                        <input
                          type="text"
                          value={formBuilding.payment_check_number}
                          onChange={(e) => setFormBuilding((p) => ({ ...p, payment_check_number: e.target.value }))}
                          placeholder="رقم الشيك"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">صورة الشيك</label>
                        <input
                          ref={checkFileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setCheckImageFile(f);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => checkFileInputRef.current?.click()}
className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 text-sm font-medium hover:bg-emerald-50/90 hover:border-emerald-300 transition-colors"
                    >
                          <FileUp className="w-4 h-4 shrink-0" />
                          {checkImageFile ? checkImageFile.name : formBuilding.payment_check_image_path ? "مرفق — تغيير" : "اختر ملف"}
                        </button>
                        {(formBuilding.payment_check_image_path || checkImageFile) && (
                          <p className="text-xs text-teal-600 mt-1">{checkImageFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ بدء الاستثمار</label>
                    <input
                      type="date"
                      value={formBuilding.investment_start_date}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, investment_start_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ استحقاق مبلغ الاستثمار</label>
                    <input
                      type="date"
                      value={formBuilding.investment_due_date}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, investment_due_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div ref={contractImageSectionRef}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">صورة العقد</label>
                    <input
                      ref={contractFileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setContractFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => contractFileInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 text-sm font-medium hover:bg-emerald-50/90 hover:border-emerald-300 transition-colors"
                    >
                      <FileUp className="w-4 h-4 shrink-0" />
                      {contractFile ? contractFile.name : formBuilding.contract_image_path ? "مرفق — تغيير" : "اختر ملف"}
                    </button>
                    {(formBuilding.contract_image_path || contractFile) && (
                      <p className="text-xs text-teal-600 mt-1">{contractFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                    )}
                  </div>
                  <div ref={idImageSectionRef}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">صورة الهوية</label>
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setIdFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => idFileInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 text-sm font-medium hover:bg-emerald-50/90 hover:border-emerald-300 transition-colors"
                    >
                      <FileUp className="w-4 h-4 shrink-0" />
                      {idFile ? idFile.name : formBuilding.id_image_path ? "مرفق — تغيير" : "اختر ملف"}
                    </button>
                    {(formBuilding.id_image_path || idFile) && (
                      <p className="text-xs text-teal-600 mt-1">{idFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                  <textarea
                    value={formBuilding.notes}
                    onChange={(e) => setFormBuilding((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-3 p-4 sm:p-5 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalOpen(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={saveBuildingInvestor}
                  disabled={saving || !formBuilding.investor_name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: استثمار وحدة */}
      {modalOpen === "unit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editingUnit ? "تعديل استثمار الوحدة" : "إضافة استثمار وحدة"}</h3>
              <button type="button" onClick={() => setModalOpen(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {!editingUnit ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">العمارة</label>
                    <select
                      value={formUnit.building_id}
                      onChange={(e) => setFormUnit((p) => ({ ...p, building_id: e.target.value, unit_id: "" }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                    >
                      <option value="">اختر العمارة</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                    <select
                      value={formUnit.unit_id}
                      onChange={(e) => setFormUnit((p) => ({ ...p, unit_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                      disabled={!formUnit.building_id}
                    >
                      <option value="">اختر الوحدة</option>
                      {units
                        .filter((u) => u.building_id === formUnit.building_id && u.status !== "sold")
                        .sort((a, b) => {
                          const byFloor = Number(a.floor) - Number(b.floor);
                          return byFloor !== 0 ? byFloor : Number(a.unit_number) - Number(b.unit_number);
                        })
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            وحدة {u.unit_number} — د{u.floor}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                  <p className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-700">
                    {editingUnit.unit ? `وحدة ${editingUnit.unit.unit_number} — د${editingUnit.unit.floor}` : "—"} — {editingUnit.building?.name ?? ""}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستثمر</label>
                <input
                  type="text"
                  value={formUnit.investor_name}
                  onChange={(e) => setFormUnit((p) => ({ ...p, investor_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="اسم المستثمر"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الجوال</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formUnit.investor_phone}
                    onChange={(e) => setFormUnit((p) => ({ ...p, investor_phone: phoneDigitsOnly(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr"
                    placeholder="05xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهوية</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formUnit.investor_id_number}
                    onChange={(e) => setFormUnit((p) => ({ ...p, investor_id_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">سعر الشراء (ر.س)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formUnit.purchase_price ? formatNum(parseInt(formUnit.purchase_price.replace(/\D/g, ""), 10) || 0) : ""}
                    onChange={(e) => setFormUnit((p) => ({ ...p, purchase_price: e.target.value.replace(/\D/g, "") }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">عمولة البيع (ر.س)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formUnit.purchase_commission ? formatNum(parseInt(formUnit.purchase_commission.replace(/\D/g, ""), 10) || 0) : ""}
                    onChange={(e) => setFormUnit((p) => ({ ...p, purchase_commission: e.target.value.replace(/\D/g, "") }))}
                    placeholder="0 — إن تُركت فارغة السعر الفعلي = سعر الشراء"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr placeholder:text-slate-400"
                  />
                </div>
              </div>
              {formUnit.purchase_price && formUnit.purchase_commission && (() => {
                const price = parseInt(formUnit.purchase_price.replace(/\D/g, ""), 10) || 0;
                const comm = parseInt(formUnit.purchase_commission.replace(/\D/g, ""), 10) || 0;
                const effective = Math.max(0, price - comm);
                if (comm <= 0) return null;
                return <p className="text-xs text-slate-600">السعر الفعلي بعد العمولة: <span className="font-semibold dir-ltr text-teal-700">{formatNum(effective)} ر.س</span></p>;
              })()}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">طريقة الدفع</p>
                <div className="flex flex-wrap gap-2">
                  {([{ value: "transfer", label: "حوالة" }, { value: "check", label: "شيك مصدق" }, { value: "cash", label: "كاش" }] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormUnit((p) => ({ ...p, payment_method: value }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${formUnit.payment_method === value ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {formUnit.payment_method === "transfer" && (
                  <div className="pt-1">
                    <label className="block text-xs font-medium text-slate-600 mb-0.5">على بنك</label>
                    <input
                      type="text"
                      value={formUnit.payment_bank_name}
                      onChange={(e) => setFormUnit((p) => ({ ...p, payment_bank_name: e.target.value }))}
                      placeholder="على بنك"
                      className="w-full max-w-[280px] border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                )}
                {formUnit.payment_method === "check" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">رقم الشيك</label>
                      <input
                        type="text"
                        value={formUnit.payment_check_number}
                        onChange={(e) => setFormUnit((p) => ({ ...p, payment_check_number: e.target.value }))}
                        placeholder="رقم الشيك"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">إرفاق صورة الشيك</label>
                      <input
                        ref={unitCheckFileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setUnitCheckImageFile(f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => unitCheckFileInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 text-sm font-medium hover:bg-emerald-50/90 hover:border-emerald-300 transition-colors"
                      >
                        <FileUp className="w-4 h-4 shrink-0" />
                        {unitCheckImageFile ? unitCheckImageFile.name : formUnit.payment_check_image_path ? "مرفق — تغيير" : "اختر ملف"}
                      </button>
                      {(formUnit.payment_check_image_path || unitCheckImageFile) && (
                        <p className="text-xs text-teal-600 mt-1">{unitCheckImageFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الشراء</label>
                <input type="date" value={formUnit.purchase_date} onChange={(e) => setFormUnit((p) => ({ ...p, purchase_date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 text-center">المرفقات</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <div>
                    <input
                      ref={unitContractFileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setUnitContractFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => unitContractFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 text-sm font-medium hover:bg-emerald-50/90 hover:border-emerald-300 transition-colors"
                    >
                      <FileUp className="w-4 h-4 shrink-0" />
                      {unitContractFile ? unitContractFile.name : formUnit.contract_image_path ? "مرفق — تغيير" : "إرفاق صورة العقد"}
                    </button>
                    {(formUnit.contract_image_path || unitContractFile) && (
                      <p className="text-xs text-teal-600 mt-1 text-center">{unitContractFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                    )}
                  </div>
                  <div>
                    <input
                      ref={unitIdFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setUnitIdFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => unitIdFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 text-sm font-medium hover:bg-emerald-50/90 hover:border-emerald-300 transition-colors"
                    >
                      <FileUp className="w-4 h-4 shrink-0" />
                      {unitIdFile ? unitIdFile.name : formUnit.id_image_path ? "مرفق — تغيير" : "إرفاق صورة الهوية"}
                    </button>
                    {(formUnit.id_image_path || unitIdFile) && (
                      <p className="text-xs text-teal-600 mt-1 text-center">{unitIdFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                    )}
                  </div>
                </div>
              </div>
              {editingUnit && (
                <div className="space-y-3">
                  {editingUnit.status === "resold" && editingUnit.resale_sale_id ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ربط إعادة البيع</label>
                        <p className="text-sm text-slate-600 py-2">تمت المخالصة — البيع مُربوط ولا يُعاد ربطه</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">نوع المخالصة</label>
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => setFormUnitResale((p) => ({ ...p, settlement_type: "profit_only" }))} className={`px-4 py-2 rounded-full text-sm font-medium border ${formUnitResale.settlement_type === "profit_only" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>أرباح فقط</button>
                          <button type="button" onClick={() => setFormUnitResale((p) => ({ ...p, settlement_type: "with_capital" }))} className={`px-4 py-2 rounded-full text-sm font-medium border ${formUnitResale.settlement_type === "with_capital" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>مع رأس المال</button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ربط بعملية إعادة البيع (اختياري)</label>
                        <select
                          value={formUnitResale.resale_sale_id}
                          onChange={(e) => setFormUnitResale((p) => ({ ...p, resale_sale_id: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                        >
                          <option value="">— بدون ربط —</option>
                          {sales.filter((s) => s.unit_id === editingUnit.unit_id).map((s) => (
                            <option key={s.id} value={s.id}>
                              بيع بـ {formatNum(Number(s.sale_price))} ر.س
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">عند الربط يُحسب الربح تلقائياً (سعر البيع − سعر الشراء)</p>
                      </div>
                      {formUnitResale.resale_sale_id && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">نوع المخالصة (عند الإغلاق)</label>
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => setFormUnitResale((p) => ({ ...p, settlement_type: "profit_only" }))} className={`px-4 py-2 rounded-full text-sm font-medium border ${formUnitResale.settlement_type === "profit_only" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>أرباح فقط</button>
                            <button type="button" onClick={() => setFormUnitResale((p) => ({ ...p, settlement_type: "with_capital" }))} className={`px-4 py-2 rounded-full text-sm font-medium border ${formUnitResale.settlement_type === "with_capital" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>مع رأس المال</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                <textarea value={formUnit.notes} onChange={(e) => setFormUnit((p) => ({ ...p, notes: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setModalOpen(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium">
                إلغاء
              </button>
              <button type="button" onClick={saveUnitInvestment} disabled={saving || !formUnit.investor_name.trim() || !formUnit.unit_id || !formUnit.purchase_price} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 disabled:opacity-50">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
