"use client";
import { useState } from "react";

interface Deed {
  id: number;
  deedNumber: string;
  owner: string;
  unitNumber: string;
  issueDate: string;
  deedType: 'رئيسي' | 'فرعي';
  deedStatus: 'ساري' | 'منتهي' | 'معلق';
  notes?: string;
  deedImage?: string; // رابط أو اسم ملف صورة الصك
}

const initialDeeds: Deed[] = [
  {
    id: 1,
    deedNumber: "123456",
    owner: "محمد أحمد",
    unitNumber: "A-101",
    issueDate: "2025-01-10",
    deedType: "رئيسي",
    deedStatus: "ساري",
    notes: "صك رئيسي",
    deedImage: "deed1.jpg"
  },
  {
    id: 2,
    deedNumber: "654321",
    owner: "سارة علي",
    unitNumber: "B-202",
    issueDate: "2024-11-22",
    deedType: "فرعي",
    deedStatus: "منتهي",
    deedImage: "deed2.jpg"
  }
];

// mock owners and units
const mockOwners = [
  { id: 1, name: "محمد أحمد" },
  { id: 2, name: "سارة علي" },
  { id: 3, name: "عبدالله صالح" }
];
const mockUnits = [
  { id: "A-101", unit_number: "A-101" },
  { id: "B-202", unit_number: "B-202" },
  { id: "C-303", unit_number: "C-303" }
];

export default function BuildingDeedsPanel() {
  const [deeds, setDeeds] = useState<Deed[]>(initialDeeds);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Deed | null>(null);

  const filteredDeeds = deeds.filter(
    (d) => {
      const matchesSearch =
        d.deedNumber.includes(search) ||
        d.owner.includes(search) ||
        (d.notes && d.notes.includes(search));
      const matchesType = filterType ? d.deedType === filterType : true;
      const matchesStatus = filterStatus ? d.deedStatus === filterStatus : true;
      const matchesOwner = filterOwner ? d.owner === filterOwner : true;
      const matchesUnit = filterUnit ? d.unitNumber === filterUnit : true;
      return matchesSearch && matchesType && matchesStatus && matchesOwner && matchesUnit;
    }
  );

  const handleAdd = () => {
    setFormData({
      id: Date.now(),
      deedNumber: "",
      owner: mockOwners[0].name,
      unitNumber: mockUnits[0].unit_number,
      issueDate: "",
      deedType: "رئيسي",
      deedStatus: "ساري",
      notes: "",
      deedImage: ""
    });
    setShowForm(true);
  };

  const handleEdit = (deed: Deed) => {
    setFormData(deed);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setDeeds(deeds.filter((d) => d.id !== id));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setDeeds((prev) => {
      const exists = prev.find((d) => d.id === formData.id);
      if (exists) {
        return prev.map((d) => (d.id === formData.id ? formData : d));
      } else {
        return [...prev, formData];
      }
    });
    setShowForm(false);
    setFormData(null);
  };

  return (
    <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-xl p-8 border border-indigo-100">
      <div className="flex flex-col md:flex-row md:justify-between mb-6 gap-4">
        <input
          type="text"
          placeholder="بحث عن الصك أو المالك..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-indigo-200 rounded-xl px-4 py-2 mb-2 md:mb-0 md:w-1/4 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm text-indigo-700"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-indigo-200 rounded-xl px-4 py-2 mb-2 md:mb-0 md:w-1/4"
        >
          <option value="">كل الأنواع</option>
          <option value="رئيسي">رئيسي</option>
          <option value="فرعي">فرعي</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-indigo-200 rounded-xl px-4 py-2 mb-2 md:mb-0 md:w-1/4"
        >
          <option value="">كل الحالات</option>
          <option value="ساري">ساري</option>
          <option value="منتهي">منتهي</option>
          <option value="معلق">معلق</option>
        </select>
        <select
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
          className="border border-indigo-200 rounded-xl px-4 py-2 mb-2 md:mb-0 md:w-1/4"
        >
          <option value="">كل الملاك</option>
          {mockOwners.map(owner => (
            <option key={owner.id} value={owner.name}>{owner.name}</option>
          ))}
        </select>
        <select
          value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)}
          className="border border-indigo-200 rounded-xl px-4 py-2 mb-2 md:mb-0 md:w-1/4"
        >
          <option value="">كل الوحدات</option>
          {mockUnits.map(unit => (
            <option key={unit.id} value={unit.unit_number}>{unit.unit_number}</option>
          ))}
        </select>
        <button
          className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-full shadow-lg hover:from-indigo-600 hover:to-purple-600 transition font-bold"
          onClick={handleAdd}
        >
          إضافة صك جديد
        </button>
        <button
          className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-full shadow-lg hover:from-blue-600 hover:to-cyan-600 transition font-bold"
          onClick={() => {
            const csv = [
              [
                "رقم الصك",
                "اسم المالك",
                "رقم الوحدة",
                "تاريخ الإصدار",
                "نوع الصك",
                "حالة الصك",
                "ملاحظات",
                "صورة الصك"
              ],
              ...deeds.map(d => [
                d.deedNumber,
                d.owner,
                d.unitNumber,
                d.issueDate,
                d.deedType,
                d.deedStatus,
                d.notes || "",
                d.deedImage || ""
              ])
            ].map(row => row.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "deeds.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          تصدير الصكوك CSV
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-md p-6 mb-6 border border-indigo-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="رقم الصك"
              value={formData?.deedNumber || ""}
              onChange={(e) => setFormData({ ...formData!, deedNumber: e.target.value })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
              required
            />
            <select
              value={formData?.owner || mockOwners[0].name}
              onChange={(e) => setFormData({ ...formData!, owner: e.target.value })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
              required
            >
              {mockOwners.map((owner) => (
                <option key={owner.id} value={owner.name}>{owner.name}</option>
              ))}
            </select>
            <select
              value={formData?.unitNumber || mockUnits[0].unit_number}
              onChange={(e) => setFormData({ ...formData!, unitNumber: e.target.value })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
              required
            >
              {mockUnits.map((unit) => (
                <option key={unit.id} value={unit.unit_number}>{unit.unit_number}</option>
              ))}
            </select>
            <input
              type="date"
              placeholder="تاريخ الإصدار"
              value={formData?.issueDate || ""}
              onChange={(e) => setFormData({ ...formData!, issueDate: e.target.value })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
              required
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={formData?.deedType || "رئيسي"}
              onChange={(e) => setFormData({ ...formData!, deedType: e.target.value as 'رئيسي' | 'فرعي' })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
            >
              <option value="رئيسي">رئيسي</option>
              <option value="فرعي">فرعي</option>
            </select>
            <select
              value={formData?.deedStatus || "ساري"}
              onChange={(e) => setFormData({ ...formData!, deedStatus: e.target.value as 'ساري' | 'منتهي' | 'معلق' })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
            >
              <option value="ساري">ساري</option>
              <option value="منتهي">منتهي</option>
              <option value="معلق">معلق</option>
            </select>
            <input
              type="text"
              placeholder="ملاحظات"
              value={formData?.notes || ""}
              onChange={(e) => setFormData({ ...formData!, notes: e.target.value })}
              className="border border-indigo-200 rounded px-4 py-2 w-full md:w-1/4"
            />
            <div className="w-full md:w-1/4 flex flex-col">
              <label className="mb-1 text-sm text-indigo-700">رفع صورة الصك (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                className="border border-indigo-200 rounded px-4 py-2"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setFormData({ ...formData!, deedImage: ev.target?.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-4 justify-end">
            <button type="submit" className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-full shadow-lg hover:from-indigo-600 hover:to-purple-600 transition font-bold">حفظ</button>
            <button type="button" className="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold" onClick={() => { setShowForm(false); setFormData(null); }}>إلغاء</button>
          </div>
        </form>
      )}
      <table className="w-full text-right border-collapse mt-4">
        <thead>
          <tr className="bg-gradient-to-br from-indigo-100 to-purple-100">
            <th className="p-2 text-indigo-700">رقم الصك</th>
            <th className="p-2 text-indigo-700">اسم المالك</th>
            <th className="p-2 text-indigo-700">رقم الوحدة</th>
            <th className="p-2 text-indigo-700">تاريخ الإصدار</th>
            <th className="p-2 text-indigo-700">نوع الصك</th>
            <th className="p-2 text-indigo-700">حالة الصك</th>
            <th className="p-2 text-indigo-700">ملاحظات</th>
            <th className="p-2 text-indigo-700">صورة الصك</th>
            <th className="p-2 text-indigo-700">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredDeeds.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center p-4 text-indigo-400">لا توجد صكوك مطابقة</td>
            </tr>
          ) : (
            filteredDeeds.map((deed) => (
              <tr key={deed.id} className="border-b border-indigo-100 hover:bg-indigo-50 transition">
                <td className="p-2 font-mono text-indigo-700">{deed.deedNumber}</td>
                <td className="p-2 text-purple-700">{deed.owner}</td>
                <td className="p-2 text-indigo-600">{deed.unitNumber}</td>
                <td className="p-2 text-indigo-600">{deed.issueDate}</td>
                <td className="p-2 text-indigo-600">{deed.deedType}</td>
                <td className="p-2 text-indigo-600">{deed.deedStatus}</td>
                <td className="p-2 text-gray-700">{deed.notes || "-"}</td>
                <td className="p-2">
                  {deed.deedImage ? <img src={deed.deedImage} alt="صورة الصك" className="w-16 h-16 object-cover rounded shadow" /> : "-"}
                </td>
                <td className="p-2">
                  <button className="text-indigo-600 hover:text-purple-600 font-bold mx-1 transition" onClick={() => handleEdit(deed)}>تعديل</button>
                  <button className="text-rose-600 hover:text-rose-800 font-bold mx-1 transition" onClick={() => handleDelete(deed.id)}>حذف</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
