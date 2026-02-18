"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, ArrowRight } from 'lucide-react';

export default function EditUnitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unitId = searchParams.get('unitId');
  const [unit, setUnit] = useState<any>(null);
  const [form, setForm] = useState({
    unit_number: '',
    floor: '',
    status: '',
    type: '',
    facing: '',
    area: '',
    rooms: '',
    bathrooms: '',
    living_rooms: '',
    kitchens: '',
    maid_room: false,
    driver_room: false,
    // entrances: '', (تم حذفه من قاعدة البيانات)
    ac_type: '',
    price: '',
    description: '',
    building_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!unitId) return;
    const supabase = createClient();
    supabase
      .from('units')
      .select('*')
      .eq('id', unitId)
      .single()
      .then(({ data, error }) => {
        if (error) setError('تعذر جلب بيانات الوحدة');
        else {
          setUnit(data);
          setForm({
            unit_number: data.unit_number || '',
            floor: data.floor || '',
            status: data.status || '',
            type: data.type || '',
            facing: data.facing || '',
            area: data.area || '',
            rooms: data.rooms || '',
            bathrooms: data.bathrooms || '',
            living_rooms: data.living_rooms || '',
            kitchens: data.kitchens || '',
            maid_room: !!data.maid_room,
            driver_room: !!data.driver_room,
            // entrances: data.entrances || '', (تم حذفه من قاعدة البيانات)
            ac_type: data.ac_type || '',
            price: data.price || '',
            description: data.description || '',
            building_id: data.building_id || '',
          });
        }
      });
  }, [unitId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    // استبعاد الحقول غير القابلة للتعديل
    const updateData = { ...form, updated_at: new Date().toISOString() };
    delete updateData.unit_number;
    delete updateData.floor;
    delete updateData.building_id;
    const { error } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', unitId);
    setLoading(false);
    if (error) setError('تعذر حفظ التعديلات');
    else router.push('/dashboard/units');
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8 border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-8 h-8 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">تعديل بيانات الوحدة</h2>
      </div>
      {error && <div className="text-red-600 mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-gray-700 font-bold mb-1">رقم الوحدة</label>
        <input name="unit_number" value={form.unit_number} onChange={handleChange} placeholder="رقم الوحدة" className="w-full border rounded-xl px-4 py-2" disabled />
        <label className="block text-gray-700 font-bold mb-1">الدور</label>
        <input name="floor" value={form.floor} onChange={handleChange} placeholder="الدور" className="w-full border rounded-xl px-4 py-2" disabled />
        <label className="block text-gray-700 font-bold mb-1">الحالة</label>
        <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded-xl px-4 py-2">
          <option value="">اختر الحالة</option>
          <option value="available">متاحة</option>
          <option value="reserved">محجوزة</option>
          <option value="sold">مباعة</option>
        </select>
        <label className="block text-gray-700 font-bold mb-1">نوع الوحدة</label>
        <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-xl px-4 py-2">
          <option value="">اختر نوع الوحدة</option>
          <option value="apartment">شقة</option>
          <option value="studio">ملحق - سطح</option>
          <option value="duplex">دوبلكس</option>
          <option value="penthouse">بنتهاوس</option>
        </select>
        <label className="block text-gray-700 font-bold mb-1">واجهة الوحدة</label>
        <select name="facing" value={form.facing} onChange={handleChange} className="w-full border rounded-xl px-4 py-2">
          <option value="">اختر الواجهة</option>
          <option value="front">أمامية</option>
          <option value="back">خلفية</option>
          <option value="corner">زاوية</option>
        </select>
        <label className="block text-gray-700 font-bold mb-1">المساحة (م²)</label>
        <input name="area" value={form.area} onChange={handleChange} placeholder="المساحة" className="w-full border rounded-xl px-4 py-2" type="number" />
        <label className="block text-gray-700 font-bold mb-1">عدد الغرف</label>
        <input name="rooms" value={form.rooms} onChange={handleChange} placeholder="عدد الغرف" className="w-full border rounded-xl px-4 py-2" type="number" />
        <label className="block text-gray-700 font-bold mb-1">عدد الحمامات</label>
        <input name="bathrooms" value={form.bathrooms} onChange={handleChange} placeholder="عدد الحمامات" className="w-full border rounded-xl px-4 py-2" type="number" />
        <label className="block text-gray-700 font-bold mb-1">عدد غرف المعيشة</label>
        <input name="living_rooms" value={form.living_rooms} onChange={handleChange} placeholder="عدد غرف المعيشة" className="w-full border rounded-xl px-4 py-2" type="number" />
        <label className="block text-gray-700 font-bold mb-1">عدد المطابخ</label>
        <input name="kitchens" value={form.kitchens} onChange={handleChange} placeholder="عدد المطابخ" className="w-full border rounded-xl px-4 py-2" type="number" />
        <label className="block text-gray-700 font-bold mb-1">غرفة خادمة</label>
        <label className="flex items-center gap-2 mb-2">
          <input name="maid_room" type="checkbox" checked={form.maid_room} onChange={e => setForm({ ...form, maid_room: e.target.checked })} /> نعم
        </label>
        <label className="block text-gray-700 font-bold mb-1">غرفة سائق</label>
        <label className="flex items-center gap-2 mb-2">
          <input name="driver_room" type="checkbox" checked={form.driver_room} onChange={e => setForm({ ...form, driver_room: e.target.checked })} /> نعم
        </label>
        <label className="block text-gray-700 font-bold mb-1">عدد المداخل</label>
        {/* <input name="entrances" value={form.entrances} onChange={handleChange} placeholder="عدد المداخل" className="w-full border rounded-xl px-4 py-2" type="number" /> */}
        <label className="block text-gray-700 font-bold mb-1">نوع التكييف</label>
        <select name="ac_type" value={form.ac_type} onChange={handleChange} className="w-full border rounded-xl px-4 py-2">
          <option value="">اختر نوع التكييف</option>
          <option value="split">سبليت</option>
          <option value="window">شباك</option>
          <option value="splitWindow">سبليت/شباك</option>
          <option value="central">مركزي</option>
          <option value="none">بدون تكييف</option>
        </select>
        <label className="block text-gray-700 font-bold mb-1">السعر (ر.س)</label>
        <input name="price" value={form.price} onChange={handleChange} placeholder="السعر" className="w-full border rounded-xl px-4 py-2" type="number" />
        <label className="block text-gray-700 font-bold mb-1">وصف الوحدة</label>
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="وصف الوحدة" className="w-full border rounded-xl px-4 py-2" />
        <label className="block text-gray-700 font-bold mb-1">معرف العمارة</label>
        <input name="building_id" value={form.building_id ? form.building_id.slice(-4) : ''} placeholder="معرف العمارة" className="w-full border rounded-xl px-4 py-2" disabled />
        <button type="submit" className="w-full bg-emerald-600 text-white rounded-xl py-3 font-bold mt-2" disabled={loading}>
          {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </form>
      <div className="text-xs text-gray-400 mt-6">
        <div>تاريخ الإضافة: {unit?.created_at ? new Date(unit.created_at).toLocaleString('ar-SA') : '-'}</div>
        <div>آخر تعديل: {unit?.updated_at ? new Date(unit.updated_at).toLocaleString('ar-SA') : '-'}</div>
      </div>
      <button onClick={() => router.push('/dashboard/units')} className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all">
        <ArrowRight className="w-4 h-4" />
        رجوع لقائمة الوحدات
      </button>
    </div>
  );
}
