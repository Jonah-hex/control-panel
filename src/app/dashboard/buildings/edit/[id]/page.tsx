"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Building {
  id: string;
  name: string;
  owner_name?: string | null;
  plot_number: string;
  neighborhood?: string;
  address?: string;
  description?: string;
  total_floors?: number;
  total_units?: number;
  year_built?: number;
  owner?: string;
}

export default function EditBuildingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const buildingId = searchParams.get("id");
      if (!buildingId) return;
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", buildingId)
        .single();
      if (!error) setBuilding(data);
      setLoading(false);
    };
    fetchData();
  }, [searchParams]);

  const handleSave = async (updatedData: Partial<Building>) => {
    if (!building) return;
    const { error } = await supabase
      .from("buildings")
      .update(updatedData)
      .eq("id", building.id);
    if (!error) {
      setBuilding({ ...building, ...updatedData });
      router.push(`/dashboard/buildings/details?id=${building.id}`);
    }
  };

  if (loading || !building) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        جاري تحميل بيانات المبنى...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">تعديل بيانات المبنى</h2>
          <form
            className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4"
            onSubmit={e => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const updatedData: Partial<Building> = {
                name: formData.get("name") as string,
                plot_number: formData.get("plot_number") as string,
                neighborhood: formData.get("neighborhood") as string,
                address: formData.get("address") as string,
                description: formData.get("description") as string,
                total_floors: Number(formData.get("total_floors")),
                total_units: Number(formData.get("total_units")),
                year_built: Number(formData.get("year_built")),
                owner_name: formData.get("owner_name") as string,
              };
              handleSave(updatedData);
            }}
          >
            <label className="font-bold text-gray-700">اسم المبنى
              <input name="name" defaultValue={building.name} className="w-full border rounded px-2 py-1 mt-1" required />
            </label>
            <label className="font-bold text-gray-700">رقم القطعة
              <input name="plot_number" defaultValue={building.plot_number} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">الحي
              <input name="neighborhood" defaultValue={building.neighborhood} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">العنوان
              <input name="address" defaultValue={building.address} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">الوصف
              <input name="description" defaultValue={building.description} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">عدد الأدوار
              <input name="total_floors" type="number" defaultValue={building.total_floors} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">عدد الوحدات
              <input name="total_units" type="number" defaultValue={building.total_units} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">سنة البناء
              <input name="year_built" type="number" defaultValue={building.year_built} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <label className="font-bold text-gray-700">اسم المالك
              <input name="owner_name" defaultValue={building.owner_name ?? building.owner ?? ""} className="w-full border rounded px-2 py-1 mt-1" />
            </label>
            <div className="col-span-2 flex gap-4 mt-4">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-full shadow hover:bg-green-700 transition">حفظ</button>
              <button type="button" className="px-4 py-2 bg-gray-400 text-white rounded-full shadow hover:bg-gray-500 transition" onClick={() => router.back()}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
