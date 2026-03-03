"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
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
  Percent,
  X,
  Eye,
  FileUp,
  CreditCard,
} from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import { phoneDigitsOnly, isValidPhone10Digits } from "@/lib/validation-utils";

const INVESTOR_DOCS_BUCKET = "building-documents";
const INVESTOR_DOCS_PREFIX = "investors";

const NUM_LOCALE = "en";
function formatNum(n: number): string {
  return n.toLocaleString(NUM_LOCALE);
}
function formatDateEn(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
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

/** المتبقي من اليوم حتى تاريخ الاستحقاق */
function getRemaining(due: string): { years: number; months: number; days: number } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(due + "T12:00:00");
  end.setHours(0, 0, 0, 0);
  if (end.getTime() < today.getTime()) return null;
  const startStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  return getDuration(startStr, due);
}

function formatDuration(y: number, m: number, d: number): string {
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} سنة`);
  if (m > 0) parts.push(`${m} شهر`);
  if (d > 0) parts.push(`${d} يوم`);
  return parts.length ? parts.join(" و ") : "0 يوم";
}

function Row({ label, value, dirLtr }: { label: string; value: string; dirLtr?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 font-medium shrink-0">{label}</span>
      <span className={`text-slate-800 text-left ${dirLtr ? "dir-ltr" : ""}`}>{value}</span>
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
  notes: string | null;
  created_at: string;
  unit?: { unit_number: string; floor: number } | null;
  building?: Building | null;
}

export default function InvestorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();

  const [tab, setTab] = useState<TabType>("building");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingInvestors, setBuildingInvestors] = useState<BuildingInvestorRow[]>([]);
  const [unitInvestments, setUnitInvestments] = useState<UnitInvestmentRow[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string; floor: number; building_id: string }[]>([]);
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
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [viewingContractUrl, setViewingContractUrl] = useState<string | null>(null);
  const [viewingIdUrl, setViewingIdUrl] = useState<string | null>(null);

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
    purchase_date: "",
    notes: "",
  });

  const [formUnitResale, setFormUnitResale] = useState({ resale_sale_id: "" });

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
    };
    load();
  }, [viewingBuildingInvestor?.id, viewingBuildingInvestor?.contract_image_path, viewingBuildingInvestor?.id_image_path, supabase]);

  useEffect(() => {
    if (!effectiveOwnerId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: bData } = await supabase.from("buildings").select("id, name").eq("owner_id", effectiveOwnerId).order("name");
        const buildingList = (bData || []) as Building[];
        setBuildings(buildingList);
        const buildingIds = buildingList.map((b) => b.id);

        const { data: biData } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId);
        if (biData) {
          const withBuildings = await Promise.all(
            (biData as BuildingInvestorRow[]).map(async (row) => {
              const b = buildingList.find((x) => x.id === row.building_id) ?? null;
              return { ...row, building: b };
            })
          );
          setBuildingInvestors(withBuildings);
        }

        let unitsList: { id: string; unit_number: number; floor: number; building_id: string }[] = [];
        if (buildingIds.length) {
          const { data: uData } = await supabase.from("units").select("id, unit_number, floor, building_id").in("building_id", buildingIds);
          if (uData) {
            unitsList = uData as typeof unitsList;
            setUnits(uData as typeof units);
          }
          const { data: sData } = await supabase.from("sales").select("id, unit_id, sale_price").in("building_id", buildingIds);
          if (sData) setSales(sData as typeof sales);
        }

        const { data: uiData, error: uiError } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId);
        if (uiError) {
          showToast("تحميل استثمارات الوحدات: " + (uiError.message || "خطأ"), "error");
        }
        if (uiData && Array.isArray(uiData)) {
          const enriched = (uiData as UnitInvestmentRow[]).map((r) => {
            const b = buildingList.find((x) => x.id === r.building_id) ?? null;
            const u = unitsList.find((x) => x.id === r.unit_id) ?? null;
            return { ...r, building: b, unit: u };
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
      const { data } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId);
      if (data && Array.isArray(data)) {
        const enriched = (data as UnitInvestmentRow[]).map((r) => {
          const b = buildings.find((x) => x.id === r.building_id) ?? null;
          const u = units.find((x) => x.id === r.unit_id) ?? null;
          const resalePrice = r.resale_sale_id ? sales.find((s) => s.id === r.resale_sale_id)?.sale_price ?? null : null;
          const profit = resalePrice != null ? resalePrice - r.purchase_price : null;
          return { ...r, building: b, unit: u, resalePrice, profit };
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
      contract_image_path: "",
      id_image_path: "",
      notes: "",
    });
    setContractFile(null);
    setIdFile(null);
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
      contract_image_path: row.contract_image_path || "",
      id_image_path: row.id_image_path || "",
      notes: row.notes || "",
    });
    setContractFile(null);
    setIdFile(null);
    setModalOpen("building");
  };

  const uploadInvestorFile = async (investorId: string, file: File, type: "contract" | "id"): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${INVESTOR_DOCS_PREFIX}/${investorId}/${type}.${ext}`;
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
          contract_image_path: null,
          id_image_path: null,
          notes: formBuilding.notes.trim() || null,
        };
        const { data: inserted, error } = await supabase.from("building_investors").insert(payload).select("id").single();
        if (error) throw error;
        savedId = inserted?.id;
        if (savedId && (contractFile || idFile)) {
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
          await supabase.from("building_investors").update({ contract_image_path: contractPath, id_image_path: idPath }).eq("id", savedId);
        }
        showToast("تم إضافة المستثمر");
      }
      setModalOpen(null);
      setEditingBuilding(null);
      setContractFile(null);
      setIdFile(null);
      const { data } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId);
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
      purchase_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setFormUnitResale({ resale_sale_id: "" });
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
      purchase_date: row.purchase_date || "",
      notes: row.notes || "",
    });
    setFormUnitResale({ resale_sale_id: row.resale_sale_id || "" });
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
    const buildingId = units.find((u) => u.id === formUnit.unit_id)?.building_id;
    if (!buildingId) {
      showToast("اختر الوحدة", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        unit_id: formUnit.unit_id,
        building_id: buildingId,
        owner_id: effectiveOwnerId,
        investor_name: formUnit.investor_name.trim(),
        investor_phone: phoneVal || null,
        investor_id_number: formUnit.investor_id_number.trim() || null,
        purchase_price: price,
        purchase_date: formUnit.purchase_date || null,
        notes: formUnit.notes.trim() || null,
      };
      if (editingUnit) {
        const updatePayload: Record<string, unknown> = { ...payload };
        if (formUnitResale.resale_sale_id) {
          updatePayload.resale_sale_id = formUnitResale.resale_sale_id;
          updatePayload.status = "resold";
        }
        const { error } = await supabase.from("unit_investments").update(updatePayload).eq("id", editingUnit.id);
        if (error) throw error;
        showToast("تم تحديث الاستثمار");
      } else {
        const { error } = await supabase.from("unit_investments").insert(payload);
        if (error) throw error;
        showToast("تم إضافة استثمار الوحدة");
      }
      setModalOpen(null);
      setEditingUnit(null);
      const { data } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId);
      if (data && Array.isArray(data)) {
        const enriched = (data as UnitInvestmentRow[]).map((r) => {
          const b = buildings.find((x) => x.id === r.building_id) ?? null;
          const u = units.find((x) => x.id === r.unit_id) ?? null;
          return { ...r, building: b, unit: u };
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
    if (!confirm("حذف هذا المستثمر؟")) return;
    const { error } = await supabase.from("building_investors").delete().eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("تم الحذف");
    setBuildingInvestors((prev) => prev.filter((r) => r.id !== id));
  };

  const deleteUnitInvestment = async (id: string) => {
    if (!confirm("حذف سجل الاستثمار؟")) return;
    const { error } = await supabase.from("unit_investments").delete().eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("تم الحذف");
    setUnitInvestments((prev) => prev.filter((r) => r.id !== id));
  };

  const unitInvestmentsWithProfit = useMemo(() => {
    return unitInvestments.map((r) => {
      const resalePrice = r.resale_sale_id ? sales.find((s) => s.id === r.resale_sale_id)?.sale_price ?? null : null;
      const profit = resalePrice != null ? resalePrice - r.purchase_price : null;
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
              <p className="text-sm text-gray-500">مستثمرون بالعمارة واستثمار بالوحدات — إدارة وحسابات الأرباح</p>
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-600">مستثمرون بالعمارة — إدارة الاتفاقيات ونسب الأرباح</p>
                  {canEdit && (
                    <button type="button" onClick={openAddBuilding} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600">
                      <Plus className="w-4 h-4" />
                      إضافة مستثمر بالعمارة
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <th className="text-center p-3 font-semibold">العمارة</th>
                        <th className="text-center p-3 font-semibold">المستثمر</th>
                        <th className="text-center p-3 font-semibold">نسبة الربح</th>
                        <th className="text-center p-3 font-semibold">نوع الاتفاق</th>
                        <th className="text-center p-3 font-semibold">مبلغ الاستثمار</th>
                        <th className="text-center p-3 font-semibold">الربح المتوقع</th>
                        <th className="text-center p-3 font-semibold w-28">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {buildingInvestors.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-slate-500">
                            لا يوجد مستثمرون بالعمارة. أضف سجلاً من زر «إضافة مستثمر بالعمارة».
                          </td>
                        </tr>
                      ) : (
                        buildingInvestors.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center font-medium text-slate-800">{row.building?.name ?? "—"}</td>
                            <td className="p-3 text-center">
                              <div className="font-medium text-slate-800">{row.investor_name}</div>
                              {row.investor_phone && <div className="text-xs text-slate-500 dir-ltr">{row.investor_phone}</div>}
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold">
                                <Percent className="w-4 h-4" />
                                {row.profit_percentage_to != null && Number(row.profit_percentage_to) !== Number(row.profit_percentage)
                                  ? `${Number(row.profit_percentage)}%–${Number(row.profit_percentage_to)}%`
                                  : `${Number(row.profit_percentage)}%`}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-600">
                              {row.agreement_type === "from_building_sales" ? "من مبيعات العمارة" : "نسبة متفق عليها"}
                            </td>
                            <td className="p-3 text-center text-slate-700 dir-ltr">
                              {row.total_invested_amount != null ? `${formatNum(Number(row.total_invested_amount))} ر.س` : "—"}
                            </td>
                            <td className="p-3 text-center text-slate-700 dir-ltr">
                              {row.total_invested_amount != null && row.profit_percentage != null ? (
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
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => setViewingBuildingInvestor(row)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg" title="عرض البيانات">
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canEdit && (
                                  <>
                                    <button type="button" onClick={() => openEditBuilding(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="تعديل">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => deleteBuildingInvestor(row.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* بطاقة عرض بيانات المستثمر بالعمارة */}
            {viewingBuildingInvestor && (() => {
              const start = viewingBuildingInvestor.investment_start_date;
              const due = viewingBuildingInvestor.investment_due_date;
              const duration = start && due ? getDuration(start, due) : null;
              const remaining = due ? getRemaining(due) : null;
              return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingBuildingInvestor(null)}>
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
                  <div className="bg-gradient-to-br from-teal-500 to-cyan-600 px-5 py-4 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-white">بيانات المستثمر</h3>
                    <button type="button" onClick={() => setViewingBuildingInvestor(null)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                      <Row label="نوع الاتفاق" value={viewingBuildingInvestor.agreement_type === "from_building_sales" ? "من مبيعات العمارة" : "نسبة متفق عليها"} />
                      <Row label="مبلغ الاستثمار" value={viewingBuildingInvestor.total_invested_amount != null ? `${formatNum(Number(viewingBuildingInvestor.total_invested_amount))} ر.س` : "—"} dirLtr />
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
                      {(duration || remaining != null) && (
                        <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-100">
                          {duration && (
                            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
                              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">مدة العقد</p>
                              <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatDuration(duration.years, duration.months, duration.days)}</p>
                            </div>
                          )}
                          {remaining != null ? (
                            <div className="rounded-xl bg-teal-50/80 px-3 py-2.5">
                              <p className="text-[11px] text-teal-600 uppercase tracking-wider mb-0.5">المتبقي من العقد</p>
                              <p className="text-sm font-semibold text-teal-800 tabular-nums">{formatDuration(remaining.years, remaining.months, remaining.days)}</p>
                            </div>
                          ) : due && new Date(due + "T12:00:00").getTime() < Date.now() ? (
                            <div className="rounded-xl bg-amber-50/80 px-3 py-2.5">
                              <p className="text-[11px] text-amber-600 uppercase tracking-wider mb-0.5">المتبقي من العقد</p>
                              <p className="text-sm font-semibold text-amber-800">منتهي</p>
                            </div>
                          ) : null}
                        </div>
                      )}
                      {viewingBuildingInvestor.notes && <Row label="ملاحظات" value={viewingBuildingInvestor.notes} />}
                    </div>
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-700 text-center">المرفقات</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {viewingBuildingInvestor.contract_image_path ? (
                          viewingContractUrl ? (
                            <a href={viewingContractUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100">
                              عرض صورة العقد
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">عقد مرفق — جاري التحميل...</span>
                          )
                        ) : canEdit ? (
                          <button type="button" onClick={() => { setViewingBuildingInvestor(null); openEditBuilding(viewingBuildingInvestor); }} className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 text-amber-800 text-sm font-medium shadow-sm hover:shadow hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 transition-all duration-200">
                            <FileUp className="w-4 h-4 text-amber-600 shrink-0" />
                            إرفاق صورة العقد
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">لم يُرفق عقد</span>
                        )}
                        {viewingBuildingInvestor.id_image_path ? (
                          viewingIdUrl ? (
                            <a href={viewingIdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100">
                              عرض صورة الهوية
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">هوية مرفقة — جاري التحميل...</span>
                          )
                        ) : canEdit ? (
                          <button type="button" onClick={() => { setViewingBuildingInvestor(null); openEditBuilding(viewingBuildingInvestor); }} className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-200/80 text-sky-800 text-sm font-medium shadow-sm hover:shadow hover:from-sky-100 hover:to-teal-100 hover:border-sky-300 transition-all duration-200">
                            <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
                            إرفاق صورة الهوية
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">لم تُرفق هوية</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="pt-2 flex gap-2">
                        <button type="button" onClick={() => { setViewingBuildingInvestor(null); openEditBuilding(viewingBuildingInvestor); }} className="flex-1 py-2.5 rounded-xl border border-teal-500 text-teal-600 font-medium hover:bg-teal-50">
                          تعديل
                        </button>
                        <button type="button" onClick={() => setViewingBuildingInvestor(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200">
                          إغلاق
                        </button>
                      </div>
                    )}
                    {!canEdit && (
                      <button type="button" onClick={() => setViewingBuildingInvestor(null)} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200">
                        إغلاق
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}

            {tab === "unit" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-600">استثمار بالوحدات: شراء وحدة تحت الإنشاء ثم إعادة بيعها للمشتري النهائي؛ يُحسب الربح من الفرق بين سعر البيع وسعر الشراء.</p>
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
                        <th className="text-center p-3 font-semibold">الحالة</th>
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
                        unitInvestmentsWithProfit.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center">
                              <div className="font-medium text-slate-800">وحدة {row.unit?.unit_number ?? "—"} — ط {row.unit?.floor ?? "—"}</div>
                              <div className="text-xs text-slate-500">{row.building?.name ?? "—"}</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-medium text-slate-800">{row.investor_name}</div>
                              {row.investor_phone && <div className="text-xs text-slate-500 dir-ltr">{row.investor_phone}</div>}
                            </td>
                            <td className="p-3 text-center font-medium text-slate-700 dir-ltr">{formatNum(Number(row.purchase_price))} ر.س</td>
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
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  row.status === "resold" ? "bg-emerald-100 text-emerald-800" : row.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {row.status === "resold" ? "تم إعادة البيع" : row.status === "cancelled" ? "ملغي" : "تحت الإنشاء"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => setViewingUnitInvestment(row)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg" title="معاينة">
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canEdit && (
                                  <>
                                    <button type="button" onClick={() => openEditUnit(row)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="تعديل">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => deleteUnitInvestment(row.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
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
              <div className="grid grid-cols-1 gap-3 text-sm">
                <Row label="الوحدة / العمارة" value={`وحدة ${viewingUnitInvestment.unit?.unit_number ?? "—"} — ط ${viewingUnitInvestment.unit?.floor ?? "—"} — ${viewingUnitInvestment.building?.name ?? "—"}`} />
                <Row label="المستثمر" value={viewingUnitInvestment.investor_name} />
                <Row label="الجوال" value={viewingUnitInvestment.investor_phone ?? "—"} dirLtr />
                <Row label="رقم الهوية" value={viewingUnitInvestment.investor_id_number ?? "—"} dirLtr />
                <Row label="سعر الشراء" value={`${formatNum(Number(viewingUnitInvestment.purchase_price))} ر.س`} dirLtr />
                <Row label="تاريخ الشراء" value={viewingUnitInvestment.purchase_date ? formatDateEn(viewingUnitInvestment.purchase_date) : "—"} dirLtr />
                <Row label="الحالة" value={viewingUnitInvestment.status === "resold" ? "تم إعادة البيع" : viewingUnitInvestment.status === "cancelled" ? "ملغي" : "تحت الإنشاء"} />
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">ربط إعادة البيع</p>
                  {canEdit && viewingUnitInvestment.status !== "cancelled" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={cardResaleId}
                        onChange={(e) => setCardResaleId(e.target.value)}
                        className="flex-1 min-w-[140px] border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      >
                        <option value="">— لا ربط —</option>
                        {sales.filter((s) => s.unit_id === viewingUnitInvestment.unit_id).map((s) => (
                          <option key={s.id} value={s.id}>بيع بـ {formatNum(Number(s.sale_price))} ر.س</option>
                        ))}
                      </select>
                      <button type="button" onClick={saveUnitResaleLink} disabled={saving} className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                        {saving ? "جاري..." : "حفظ الربط"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-800 dir-ltr">
                      {viewingUnitInvestment.resale_sale_id
                        ? `بيع مُربوط: ${viewingUnitInvestment.resalePrice != null ? formatNum(Number(viewingUnitInvestment.resalePrice)) + " ر.س" : "—"}`
                        : "— لا ربط —"}
                    </p>
                  )}
                </div>
                <Row label="سعر إعادة البيع" value={viewingUnitInvestment.resalePrice != null ? `${formatNum(Number(viewingUnitInvestment.resalePrice))} ر.س` : "—"} dirLtr />
                <Row label="الربح" value={viewingUnitInvestment.profit != null ? `+${formatNum(Number(viewingUnitInvestment.profit))} ر.س` : "—"} dirLtr />
                {viewingUnitInvestment.notes && <Row label="ملاحظات" value={viewingUnitInvestment.notes} />}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {canEdit && (
                  <>
                    <button type="button" onClick={() => { setViewingUnitInvestment(null); openEditUnit(viewingUnitInvestment); }} className="flex-1 min-w-[100px] py-2.5 rounded-xl border border-teal-500 text-teal-600 font-medium hover:bg-teal-50 text-sm">
                      تعديل
                    </button>
                    <button type="button" onClick={() => { if (confirm("حذف سجل الاستثمار؟")) { deleteUnitInvestment(viewingUnitInvestment.id); setViewingUnitInvestment(null); } }} className="flex-1 min-w-[100px] py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 text-sm">
                      حذف
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setViewingUnitInvestment(null)} className="flex-1 min-w-[100px] py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 text-sm">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      type="text"
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
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">نوع الاتفاق</label>
                    <select
                      value={formBuilding.agreement_type}
                      onChange={(e) => setFormBuilding((p) => ({ ...p, agreement_type: e.target.value as "agreed_percentage" | "from_building_sales" }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="agreed_percentage">نسبة متفق عليها</option>
                      <option value="from_building_sales">من مبيعات العمارة</option>
                    </select>
                  </div>
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
                  {(expectedFrom != null && expectedFrom > 0) && (
                    <p className="mt-2 text-sm font-semibold text-teal-700 bg-teal-50 rounded-xl px-3 py-2 dir-ltr">
                      {expectedTo != null
                        ? `الربح المتوقع: ${formatNum(Math.round(expectedFrom))} – ${formatNum(Math.round(expectedTo))} ر.س`
                        : `الربح المتوقع: ${formatNum(Math.round(expectedFrom))} ر.س`}
                    </p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">صورة العقد</label>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="w-full text-sm text-slate-600 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-teal-50 file:text-teal-700 file:font-medium"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setContractFile(f);
                        e.target.value = "";
                      }}
                    />
                    {(formBuilding.contract_image_path || contractFile) && (
                      <p className="text-xs text-teal-600 mt-1">{contractFile ? "سيتم رفع الملف عند الحفظ" : "مرفق"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">صورة الهوية</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-sm text-slate-600 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-teal-50 file:text-teal-700 file:font-medium"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setIdFile(f);
                        e.target.value = "";
                      }}
                    />
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
                      {units.filter((u) => u.building_id === formUnit.building_id).map((u) => (
                        <option key={u.id} value={u.id}>
                          وحدة {u.unit_number} — ط {u.floor}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                  <p className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-700">
                    {editingUnit.unit ? `وحدة ${editingUnit.unit.unit_number} — ط ${editingUnit.unit.floor}` : "—"} — {editingUnit.building?.name ?? ""}
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
                    type="text"
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">سعر الشراء (ر.س) — عند الشراء تحت الإنشاء</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formUnit.purchase_price ? formatNum(parseInt(formUnit.purchase_price.replace(/\D/g, ""), 10) || 0) : ""}
                  onChange={(e) => setFormUnit((p) => ({ ...p, purchase_price: e.target.value.replace(/\D/g, "") }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm dir-ltr"
                />
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  المستثمر مربوط بالوحدة التي اخترتها. عند إتمام بيع الوحدة من المالك (أو من المنصة) إلى المشتري الجديد يُربَط البيع هنا ويُحسب الربح تلقائياً (سعر البيع − سعر الشراء).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الشراء</label>
                <input type="date" value={formUnit.purchase_date} onChange={(e) => setFormUnit((p) => ({ ...p, purchase_date: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              {editingUnit && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ربط بعملية إعادة البيع (اختياري)</label>
                  <select
                    value={formUnitResale.resale_sale_id}
                    onChange={(e) => setFormUnitResale((p) => ({ ...p, resale_sale_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <option value="">— لا ربط —</option>
                    {sales.filter((s) => s.unit_id === editingUnit.unit_id).map((s) => (
                      <option key={s.id} value={s.id}>
                        بيع بـ {formatNum(Number(s.sale_price))} ر.س
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">عند الربط يُحسب الربح تلقائياً (سعر البيع − سعر الشراء)</p>
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
      </div>
    </main>
  );
}
