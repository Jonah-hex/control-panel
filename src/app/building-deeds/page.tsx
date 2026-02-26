"use client";

import BuildingDeedsPanel from "../../components/BuildingDeedsPanel";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense, useEffect } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";

function BuildingDeedsContent() {
  const searchParams = useSearchParams();
  const buildingId = searchParams.get("buildingId");
  const unitId = searchParams.get("unitId");
  const router = useRouter();
  const { can, ready } = useDashboardAuth();

  useEffect(() => {
    if (!ready) return;
    if (!can("deeds")) {
      showToast("ليس لديك صلاحية الوصول لإدارة الصكوك ومحاضر الفرز.", "error");
      router.replace(buildingId ? `/dashboard/buildings/details?buildingId=${buildingId}` : "/dashboard");
    }
  }, [ready, can, router, buildingId]);

  if (ready && !can("deeds")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full mx-auto px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-teal-800">إدارة الصكوك ومحاضر الفرز</h1>
          {buildingId && (
            <Link
              href={`/dashboard/buildings/details?buildingId=${buildingId}#card-engineering`}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition text-sm font-semibold shadow-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              رجوع لتفاصيل المبنى
            </Link>
          )}
        </div>
        <BuildingDeedsPanel buildingId={buildingId || undefined} openTransferUnitId={unitId || undefined} />
      </div>
    </main>
  );
}

function BuildingDeedsFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full flex justify-center items-center py-24">
        <div className="animate-spin w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    </main>
  );
}

export default function BuildingDeedsPage() {
  return (
    <Suspense fallback={<BuildingDeedsFallback />}>
      <BuildingDeedsContent />
    </Suspense>
  );
}
