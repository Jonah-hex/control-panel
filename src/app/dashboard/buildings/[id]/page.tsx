"use client";
import { useState, useEffect, useRef } from "react";
// قائمة الكاردات المتاحة
const cardOptions = [
  { id: 1, label: "معلومات أساسية" },
  { id: 2, label: "تفاصيل العمارة" },
  { id: 3, label: "المرافق والتأمين" },
  { id: 4, label: "معلومات الحارس" },
  { id: 5, label: "معلومات إضافية" },
  { id: 6, label: "معلومات الوحدات" },
  { id: 7, label: "معلومات المكتب الهندسي" },
  { id: 8, label: "معلومات المشترين" },
];
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BuildingCard from "@/components/BuildingCard";
import {
  Building2, Grid3x3, Home, BarChart3, Shield, Image, UserCheck, Users, Pencil, Trash2, Share2, Printer, ArrowRight, Eye
} from 'lucide-react';
const step1 = [
  { key: "name", label: "اسم المبنى" },
  { key: "plot_number", label: "رقم القطعة" },
  { key: "neighborhood", label: "الحي" },
  { key: "address", label: "العنوان" },
  { key: "description", label: "الوصف" },
];
const step2 = [
  { key: "total_floors", label: "عدد الأدوار" },
  { key: "total_units", label: "عدد الوحدات" },
  { key: "reserved_units", label: "الوحدات المحجوزة" },
  { key: "parking_slots", label: "مواقف السيارات" },
  { key: "driver_rooms", label: "غرف السائقين" },
  { key: "elevators", label: "عدد المصاعد" },
  { key: "year_built", label: "سنة البناء" },
  { key: "land_area", label: "مساحة الأرض" },
];
const step3 = [
  { key: "insurance_available", label: "يوجد تأمين" },
  { key: "insurance_policy_number", label: "رقم وثيقة التأمين" },
  { key: "has_main_water_meter", label: "عداد ماء رئيسي" },
  { key: "water_meter_number", label: "رقم عداد الماء" },
  { key: "has_main_electricity_meter", label: "عداد كهرباء رئيسي" },
  { key: "electricity_meter_number", label: "رقم عداد الكهرباء" },
];
const step4 = [
  { key: "guard_name", label: "اسم الحارس" },
  { key: "guard_phone", label: "هاتف الحارس" },
  { key: "guard_room_number", label: "غرفة الحارس" },
  { key: "guard_shift", label: "دوام الحارس" },
  { key: "guard_has_salary", label: "للحارس راتب" },
  { key: "guard_id_photo", label: "صورة هوية الحارس" },
];
const step5 = [
  { key: "google_maps_link", label: "رابط الموقع" },
  { key: "image_urls", label: "الصور" },
  { key: "owner_association", label: "اتحاد الملاك" },
  { key: "owner_id", label: "معرف المالك" },
  { key: "created_at", label: "تاريخ الإنشاء" },
  { key: "updated_at", label: "تاريخ التحديث" },
];

// دالة مساعدة لعرض صفوف البيانات
function renderRows(step: { key: string; label: string }[], building: any) {
  return (
    <>
      {step.map(({ key, label }) => (
        <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
          <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
          <span style={{color:'#666'}}>{(building && building[key]) ? building[key] : '-'}</span>
        </div>
      ))}
    </>
  );
}

export default function BuildingPage() {
  const router = useRouter();
  const params = useParams();
  const [building, setBuilding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<number>(0); // 0 = الكل مغلق
  const [unitFilter, setUnitFilter] = useState("");
  const [units, setUnits] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchBuildingAndUnits = async () => {
      setLoading(true);
      // جلب بيانات المبنى
      const { data: buildingData, error: buildingError } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", params.id)
        .single();
      setBuilding(buildingData);
      // جلب بيانات الوحدات المرتبطة بالمبنى
      if (params.id) {
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("*")
          .eq("building_id", params.id)
          .order("floor", { ascending: true })
          .order("unit_number", { ascending: true });
        const raw = unitsData || [];
        const sorted = [...raw].sort((a, b) => {
          const fA = Number(a.floor) ?? 0;
          const fB = Number(b.floor) ?? 0;
          if (fA !== fB) return fA - fB;
          const uA = Number(a.unit_number) || 0;
          const uB = Number(b.unit_number) || 0;
          return uA - uB;
        });
        setUnits(sorted);
      }
      setLoading(false);
    };
    if (params.id) fetchBuildingAndUnits();
  }, [params.id]);

  // عند اختيار كارد من القائمة المنسدلة
  const handleCardSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cardId = Number(e.target.value);
    setOpenCard(cardId);
    setSelectedCard(cardId);
    // مرر للعنصر ومرر له focus/scroll
    setTimeout(() => {
      if (cardRefs.current[cardId - 1]) {
        cardRefs.current[cardId - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div style={{maxWidth:'1100px',margin:'2em auto'}}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto 2em auto',
        padding: '1.5em 1.5em 1em 1.5em',
        background: 'linear-gradient(90deg, #f0f4fa 60%, #e0e7ef 100%)',
        borderRadius: '18px',
        boxShadow: '0 4px 24px 0 #0001',
        border: '1.5px solid #e3e7ee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5em',
        flexWrap: 'wrap',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:'0.5em',minWidth:180}}>
          <button
            onClick={()=>{window.location.href='/dashboard/buildings'}}
            title="رجوع لصفحة العماير"
            style={{
              background:'#f5f7fa',
              border:'1.5px solid #d1d5db',
              borderRadius:'8px',
              padding:'0.35em 0.7em',
              marginInlineEnd:'0.5em',
              cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'background 0.15s',
            }}
            onMouseOver={e=>e.currentTarget.style.background='#e3e7ee'}
            onMouseOut={e=>e.currentTarget.style.background='#f5f7fa'}
          >
            <ArrowRight size={20} style={{marginLeft:2}}/>
          </button>
          <h2 style={{
            fontWeight: 'bold',
            fontSize: '1.6em',
            margin: 0,
            color: '#1a237e',
            letterSpacing: '0.5px',
            flex: 1,
            minWidth: 120,
          }}>
            تفاصيل المبنى
          </h2>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #f8fafc 60%, #e0e7ef 100%)',
          borderRadius: '12px',
          boxShadow: '0 2px 12px 0 #0001',
          padding: '0.25em 1em',
          minWidth: 270,
          border: '1.5px solid #d1d5db',
          transition: 'box-shadow 0.2s',
        }}>
          <span style={{marginInlineEnd: 8, color: '#1976d2', display:'flex', alignItems:'center'}}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-4.15a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <select
            value={openCard || ''}
            onChange={handleCardSelect}
            style={{
              flex: 1,
              padding: '0.6em 1em',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1.05em',
              color: '#222',
              fontWeight: 500,
              borderRadius: '8px',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onFocus={e => e.currentTarget.parentElement!.style.boxShadow = '0 0 0 3px #1976d255'}
            onBlur={e => e.currentTarget.parentElement!.style.boxShadow = '0 2px 12px 0 #0001'}
          >
            <option value="">اختر بطاقة للانتقال السريع...</option>
            {cardOptions.map(card => (
              <option key={card.id} value={card.id}>{card.label}</option>
            ))}
          </select>
        </div>
      </div>


      {/* كروت بيانات رأسية مستطيلة */}
      <div style={{maxWidth:'900px',margin:'0 auto'}}>
        <div ref={el => { cardRefs.current[0] = el; }}>
          <BuildingCard
            title="معلومات أساسية"
            open={openCard===1}
            onToggle={()=>setOpenCard(openCard===1?0:1)}
            effect="js"
            icon={<Building2 />}
            gradient="from-blue-500 to-cyan-500"
            iconColor="text-white"
          >
            <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
              {step1.map(({key, label}) => (
                <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                  <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
                  <span style={{color:'#1976d2',fontWeight:500}}>{(building && building[key]) ? building[key] : 'لا يوجد'}</span>
                </div>
              ))}
            </div>
          </BuildingCard>
        </div>
        <div ref={el => { cardRefs.current[1] = el; }}>
          <BuildingCard
            title="تفاصيل العمارة"
            open={openCard===2}
            onToggle={()=>setOpenCard(openCard===2?0:2)}
            effect="js"
            icon={<Grid3x3 />}
            gradient="from-purple-500 to-pink-500"
            iconColor="text-white"
          >
            <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
              {step2.map(({key, label}) => (
                <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                  <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
                  <span style={{color:'#1976d2',fontWeight:500}}>{(building && building[key]) ? building[key] : 'لا يوجد'}</span>
                </div>
              ))}
            </div>
          </BuildingCard>
        </div>
        <div ref={el => { cardRefs.current[2] = el; }}>
          <BuildingCard
            title="المرافق والتأمين"
            open={openCard===3}
            onToggle={()=>setOpenCard(openCard===3?0:3)}
            effect="gsap"
            icon={<Shield />}
            gradient="from-green-500 to-emerald-500"
            iconColor="text-white"
          >
            {/* عرض مخصص للمرافق والتأمين */}
            <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
              {/* يوجد تأمين */}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                <span style={{fontWeight:'bold',color:'#333'}}>يوجد تأمين</span>
                <span style={{color:'#666'}}>
                  {building && building.insurance_available
                    ? <>
                        نعم يوجد
                        {building.insurance_policy_number &&
                          <span style={{marginRight:8,color:'#1976d2',fontWeight:500}}>
                            ({building.insurance_policy_number})
                          </span>
                        }
                      </>
                    : 'لا يوجد'}
                </span>
              </div>
              {/* عداد ماء رئيسي */}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                <span style={{fontWeight:'bold',color:'#333'}}>عداد ماء رئيسي</span>
                <span style={{color:'#666'}}>
                  {building && building.has_main_water_meter
                    ? <>
                        نعم يوجد
                        {building.water_meter_number &&
                          <span style={{marginRight:8,color:'#1976d2',fontWeight:500}}>
                            ({building.water_meter_number})
                          </span>
                        }
                      </>
                    : 'لا يوجد'}
                </span>
              </div>
              {/* عداد كهرباء رئيسي */}
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                <span style={{fontWeight:'bold',color:'#333'}}>عداد كهرباء رئيسي</span>
                <span style={{color:'#666'}}>
                  {building && building.has_main_electricity_meter
                    ? <>
                        نعم يوجد
                        {building.electricity_meter_number &&
                          <span style={{marginRight:8,color:'#1976d2',fontWeight:500}}>
                            ({building.electricity_meter_number})
                          </span>
                        }
                      </>
                    : 'لا يوجد'}
                </span>
              </div>
            </div>
          </BuildingCard>
        </div>
        <div ref={el => { cardRefs.current[3] = el; }}>
          <BuildingCard
            title="معلومات الحارس"
            open={openCard===4}
            onToggle={()=>setOpenCard(openCard===4?0:4)}
            effect="js"
            icon={<UserCheck />}
            gradient="from-yellow-400 to-orange-400"
            iconColor="text-white"
          >
            <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
              {step4.map(({key, label}) => {
                if (key === 'guard_shift') {
                  let shiftValue = '';
                  if (building && building.guard_shift) {
                    switch (building.guard_shift) {
                      case 'morning': shiftValue = 'صباحي'; break;
                      case 'evening': shiftValue = 'مسائي'; break;
                      case 'shift': shiftValue = 'مناوبة'; break;
                      default: shiftValue = building.guard_shift;
                    }
                  } else {
                    shiftValue = 'غير محدد';
                  }
                  // دعم المدخلات day/night/shift وغيرها
                  let shiftAr = '';
                  if (building && building.guard_shift) {
                    switch (building.guard_shift) {
                      case 'morning':
                      case 'day':
                        shiftAr = 'صباحي'; break;
                      case 'evening':
                      case 'night':
                        shiftAr = 'مسائي'; break;
                      case 'shift':
                        shiftAr = 'مناوبة'; break;
                      default:
                        shiftAr = 'غير محدد';
                    }
                  } else {
                    shiftAr = 'غير محدد';
                  }
                  return (
                    <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                      <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
                      <span style={{color:'#1976d2',fontWeight:500}}>{shiftAr}</span>
                    </div>
                  );
                }
                if (key === 'guard_has_salary') {
                  return (
                    <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                      <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
                      <span style={{color:'#1976d2',fontWeight:500}}>
                        {building && building.guard_has_salary
                          ? <>
                              نعم يوجد
                              {building.guard_salary_amount &&
                                <span style={{marginRight:8}}>
                                  ({building.guard_salary_amount} ريال)
                                </span>
                              }
                            </>
                          : 'لا يوجد'}
                      </span>
                    </div>
                  );
                }
                if (key === 'guard_id_photo') {
                  return (
                    <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                      <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
                      <span style={{color:'#1976d2',fontWeight:500}}>
                        {(building && building[key]) ? (
                          <>
                            <button
                              style={{
                                background:'#e3e7ee',
                                border:'none',
                                borderRadius:'50px',
                                height:'30px',
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                cursor:'pointer',
                                transition:'background 0.18s',
                                boxShadow:'0 1px 4px #0001',
                                marginRight:'2px',
                                padding:'0 10px',
                                gap:'5px',
                              }}
                              title="معاينة الصورة"
                              onMouseOver={e=>e.currentTarget.style.background='#1976d2'}
                              onMouseOut={e=>e.currentTarget.style.background='#e3e7ee'}
                              onClick={()=>{
                                const img = document.createElement('img');
                                img.src = building[key];
                                img.style.maxWidth = '90vw';
                                img.style.maxHeight = '80vh';
                                img.style.display = 'block';
                                img.style.margin = '2em auto';
                                const overlay = document.createElement('div');
                                overlay.style.position = 'fixed';
                                overlay.style.top = '0';
                                overlay.style.left = '0';
                                overlay.style.width = '100vw';
                                overlay.style.height = '100vh';
                                overlay.style.background = 'rgba(0,0,0,0.7)';
                                overlay.style.zIndex = '9999';
                                overlay.appendChild(img);
                                overlay.onclick = ()=>document.body.removeChild(overlay);
                                document.body.appendChild(overlay);
                              }}
                            >
                              <Eye size={16} color="#1976d2" style={{transition:'color 0.18s'}}/>
                              <span style={{fontSize:'0.93em',color:'#1976d2',fontWeight:500,marginRight:'2px'}}>معاينة</span>
                            </button>
                          </>
                        ) : 'لا يوجد'}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee'}}>
                    <span style={{fontWeight:'bold',color:'#333'}}>{label}</span>
                    <span style={{color:'#1976d2',fontWeight:500}}>{(building && building[key]) ? building[key] : 'لا يوجد'}</span>
                  </div>
                );
              })}
            </div>
          </BuildingCard>
        </div>
        <div ref={el => { cardRefs.current[4] = el; }}>
          <BuildingCard
            title="معلومات إضافية"
            open={openCard===5}
            onToggle={()=>setOpenCard(openCard===5?0:5)}
            effect="js"
            icon={<Image />}
            gradient="from-pink-500 to-fuchsia-500"
            iconColor="text-white"
          >
            <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
                {/* اتحاد الملاك - سند احترافي */}
                <div style={{
                  width:'100%',
                  maxWidth:'1000px',
                  minWidth:'340px',
                  background:'#f9fafb',
                  border:'1.5px solid #e0e3ea',
                  borderRadius:'14px',
                  boxShadow:'0 2px 12px #0001',
                  padding:'18px 60px 12px 60px',
                  margin:'32px auto 16px auto',
                  direction:'rtl',
                  position:'relative',
                  transition:'max-width 0.2s,min-width 0.2s',
                  display:'block'
                }}>
                  <div style={{display:'flex',justifyContent:'flex-start',marginBottom:'18px',marginTop:'0',zIndex:2}}>
                    <button
                      title="تعديل المعلومات الإضافية"
                      style={{
                        background:'#1976d2',
                        border:'none',
                        borderRadius:'50%',
                        width:'36px',
                        height:'36px',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        cursor:'pointer',
                        boxShadow:'0 1px 4px #1976d222',
                        transition:'background 0.18s',
                        outline:'none',
                        position:'relative',
                      }}
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const path = window.location.pathname.replace(/\/$/,"") + "/edit-owner-association";
                          window.location.href = path;
                        }
                      }}
                      onMouseOver={e=>e.currentTarget.style.background='#1565c0'}
                      onMouseOut={e=>e.currentTarget.style.background='#1976d2'}
                    >
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15.232 5.232a3 3 0 1 1 4.243 4.243L7.5 21H3v-4.5L15.232 5.232Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 7.5 3 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{
                        position:'absolute',
                        top:'-30px',
                        left:'50%',
                        transform:'translateX(-50%)',
                        background:'#222',
                        color:'#fff',
                        padding:'2px 10px',
                        borderRadius:'6px',
                        fontSize:'0.85em',
                        fontWeight:500,
                        opacity:0,
                        pointerEvents:'none',
                        transition:'opacity 0.18s',
                        zIndex:10
                      }} className="edit-owner-tooltip">تعديل المعلومات الإضافية</span>
                    </button>
                    <script dangerouslySetInnerHTML={{__html:`
                      document.querySelectorAll('button[title="تعديل المعلومات الإضافية"]')?.forEach(btn=>{
                        btn.onmouseenter=()=>{const t=btn.querySelector('.edit-owner-tooltip');if(t)t.style.opacity=1;};
                        btn.onmouseleave=()=>{const t=btn.querySelector('.edit-owner-tooltip');if(t)t.style.opacity=0;};
                      });
                    `}} />
                  </div>
                  <div style={{width:'100%',textAlign:'center',fontWeight:'bold',color:'#1976d2',fontSize:'1.13em',letterSpacing:'0.5px',marginBottom:'18px',marginTop:'-2px'}}>
                    سند اتحاد الملاك
                  </div>
                  {building && building.owner_association
                    ? (typeof building.owner_association === 'object' && building.owner_association !== null
                        ? (() => {
                            const oa = building.owner_association;
                            // ترتيب الحقول
                            const hasAssociation = typeof oa.hasAssociation !== 'undefined' ? oa.hasAssociation : null;
                            const managerName = oa.managerName || '—';
                            const contactNumber = oa.contactNumber || '—';
                            const registrationNumber = oa.registrationNumber || '—';
                            const startDate = oa.startDate || '—';
                            const endDate = oa.endDate || '—';
                            const monthlyFee = oa.monthlyFee || '—';
                            // تنسيق رقم الحساب والآيبان
                            const formatIban = (iban: string | undefined) => {
                              if (!iban || typeof iban !== 'string') return iban || '—';
                              return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 29); // 24 رقم + رمز الدولة
                            };
                            const formatAccount = (acc: string | undefined) => {
                              if (!acc || typeof acc !== 'string') return acc || '—';
                              return acc.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 17); // 14 رقم تقريباً
                            };
                            // الحقول المتبقية
                            const exclude = ['hasAssociation','managerName','contactNumber','registrationNumber','startDate','endDate','monthlyFee'];
                            const rest = Object.entries(oa).filter(([k]) => !exclude.includes(k));
                            // إذا لا يوجد اتحاد
                            if(hasAssociation === false || hasAssociation === 'false') {
                              return <div style={{color:'#d32f2f',fontWeight:700,fontSize:'1.08em',margin:'10px 0 6px 0'}}>لا يوجد اتحاد ملاك</div>;
                            }
                            return (
                              <>
                                {/* خانة يوجد اتحاد */}
                                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                                  <span style={{color:'#888',fontWeight:500}}>يوجد اتحاد</span>
                                  <span style={{color:'#1976d2',fontWeight:700}}>{hasAssociation === true || hasAssociation === 'true' ? 'نعم' : 'لا'}</span>
                                </div>
                                {/* صف أفقي: المدير - التواصل - السجل */}
                                <div style={{display:'flex',gap:'32px',marginBottom:'10px',flexWrap:'wrap',justifyContent:'flex-start'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',minWidth:'170px'}}>
                                    <span style={{color:'#888',fontWeight:500}}>اسم المدير</span>
                                    <span style={{color:'#1976d2',fontWeight:700}}>{managerName}</span>
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',minWidth:'170px'}}>
                                    <span style={{color:'#888',fontWeight:500}}>رقم التواصل</span>
                                    <span style={{color:'#1976d2',fontWeight:700}}>{contactNumber}</span>
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',minWidth:'170px'}}>
                                    <span style={{color:'#888',fontWeight:500}}>رقم التسجيل</span>
                                    <span style={{color:'#1976d2',fontWeight:700}}>{registrationNumber}</span>
                                  </div>
                                </div>
                                {/* صف أفقي: تواريخ البداية والانتهاء والرسوم الشهرية */}
                                <div style={{display:'flex',gap:'32px',marginBottom:'10px',flexWrap:'wrap',justifyContent:'flex-start'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',minWidth:'170px'}}>
                                    <span style={{color:'#888',fontWeight:500}}>تاريخ البداية</span>
                                    <span style={{color:'#1976d2',fontWeight:700}}>{startDate}</span>
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',minWidth:'170px'}}>
                                    <span style={{color:'#888',fontWeight:500}}>تاريخ الانتهاء</span>
                                    <span style={{color:'#1976d2',fontWeight:700}}>{endDate}</span>
                                  </div>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',minWidth:'170px'}}>
                                    <span style={{color:'#888',fontWeight:500}}>الرسوم الشهرية</span>
                                    <span style={{color:'#1976d2',fontWeight:700}}>{monthlyFee}</span>
                                  </div>
                                </div>
                                {/* باقي البيانات مع اختصار يشمل الماء/الكهرباء */}
                                <div style={{display:'flex',flexWrap:'wrap',gap:'12px 32px',marginTop:'8px',alignItems:'center'}}>
                                  {/* عدد الوحدات المسجلة في الأعلى */}
                                  {rest.find(([k]) => k === 'registeredUnitsCount') && (
                                    <div style={{display:'flex',alignItems:'center',gap:'6px',background:'#fff',border:'1px solid #e0e3ea',borderRadius:'7px',padding:'6px 14px',minWidth:'160px',boxShadow:'0 1px 4px #0001',marginBottom:'6px',flex:'1 1 0',maxWidth:'unset'}}>
                                      <span style={{color:'#888',fontWeight:500}}>عدد الوحدات المسجلة</span>
                                      <span style={{color:'#1976d2',fontWeight:700}}>{
                                        (() => {
                                          const f = rest.find(([k]) => k === 'registeredUnitsCount');
                                          const v = f ? f[1] : undefined;
                                          return v != null ? String(v) : '—';
                                        })()
                                      }</span>
                                    </div>
                                  )}
                                  {/* يشمل الماء والكهرباء بمربعين صغيرين بجانب بعض */}
                                  {(rest.find(([k]) => k === 'includesWater') || rest.find(([k]) => k === 'includesElectricity')) && (
                                    <div style={{display:'flex',gap:'10px',marginBottom:'6px'}}>
                                      {rest.find(([k]) => k === 'includesWater') && (
                                        <div style={{display:'flex',alignItems:'center',gap:'6px',background:'#fff',border:'1px solid #e0e3ea',borderRadius:'7px',padding:'6px 14px',minWidth:'90px',boxShadow:'0 1px 4px #0001'}}>
                                          <span style={{color:'#888',fontWeight:500}}>يشمل الماء</span>
                                          <span style={{color:'#1976d2',fontWeight:700}}>{
                                            (() => {
                                              const f = rest.find(([k]) => k === 'includesWater');
                                              const v = f ? f[1] : undefined;
                                              return typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : (typeof v === 'string' || typeof v === 'number' ? String(v) : '—');
                                            })()
                                          }</span>
                                        </div>
                                      )}
                                      {rest.find(([k]) => k === 'includesElectricity') && (
                                        <div style={{display:'flex',alignItems:'center',gap:'6px',background:'#fff',border:'1px solid #e0e3ea',borderRadius:'7px',padding:'6px 14px',minWidth:'90px',boxShadow:'0 1px 4px #0001'}}>
                                          <span style={{color:'#888',fontWeight:500}}>يشمل الكهرباء</span>
                                          <span style={{color:'#1976d2',fontWeight:700}}>{
                                            (() => {
                                              const f = rest.find(([k]) => k === 'includesElectricity');
                                              const v = f ? f[1] : undefined;
                                              return typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : (typeof v === 'string' || typeof v === 'number' ? String(v) : '—');
                                            })()
                                          }</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* رقم الحساب ثم الآيبان تحته */}
                                  {(rest.find(([k]) => k === 'accountNumber') || rest.find(([k]) => k === 'iban')) && (
                                    <div style={{display:'flex',gap:'16px',marginBottom:'6px'}}>
                                      {rest.find(([k]) => k === 'accountNumber') && (
                                        <div style={{flex:'1 1 100%',display:'flex',alignItems:'center',gap:'6px',background:'#fff',border:'1px solid #e0e3ea',borderRadius:'7px',padding:'6px 14px',minWidth:'unset',maxWidth:'100%',boxShadow:'0 1px 4px #0001',justifyContent:'flex-start',marginBottom:'6px'}}>
                                          <span style={{color:'#888',fontWeight:500}}>رقم الحساب</span>
                                          <span style={{color:'#1976d2',fontWeight:700}}>{
                                            (() => {
                                              const f = rest.find(([k]) => k === 'accountNumber');
                                              const v = f ? f[1] : undefined;
                                              return formatAccount(typeof v === 'string' ? v : undefined);
                                            })()
                                          }</span>
                                        </div>
                                      )}
                                      {rest.find(([k]) => k === 'iban') && (
                                        <div style={{flex:'1 1 0',display:'flex',alignItems:'center',gap:'6px',background:'#fff',border:'1px solid #e0e3ea',borderRadius:'7px',padding:'6px 14px',minWidth:'160px',boxShadow:'0 1px 4px #0001',justifyContent:'flex-start',maxWidth:'unset'}}>
                                          <span style={{color:'#888',fontWeight:500}}>الآيبان</span>
                                          <span style={{color:'#1976d2',fontWeight:700}}>{
                                            (() => {
                                              const f = rest.find(([k]) => k === 'iban');
                                              const v = f ? f[1] : undefined;
                                              return formatIban(typeof v === 'string' ? v : undefined);
                                            })()
                                          }</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* باقي الحقول بدون يشمل الماء/الكهرباء/الحساب/الآيبان/عدد الوحدات */}
                                  {rest.filter(([k]) => !['includesWater','includesElectricity','accountNumber','iban','registeredUnitsCount'].includes(k)).map(([k, v]) => {
                                    let value = v;
                                    return (
                                      <div key={k} style={{display:'flex',alignItems:'center',gap:'6px',background:'#fff',border:'1px solid #e0e3ea',borderRadius:'7px',padding:'6px 14px',minWidth:'160px',boxShadow:'0 1px 4px #0001',flex:'1 1 0',maxWidth:'unset'}}>
                                        <span style={{color:'#888',fontWeight:500}}>{
                                          k==='monthlyFee' ? 'الرسوم الشهرية'
                                          : k
                                        }</span>
                                        <span style={{color:'#1976d2',fontWeight:700}}>{
                                          typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : (typeof value === 'string' || typeof value === 'number' ? String(value) : '—')
                                        }</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()
                        : building.owner_association)
                    : <span style={{color:'#bbb',fontWeight:500}}>لا يوجد</span>}
                </div>
                {/* زر الموقع على الخريطة */}
                <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee',alignItems:'center'}}>
                  <span style={{fontWeight:'bold',color:'#333'}}>الموقع على الخريطة</span>
                  {(building && building.google_maps_link) ? (
                    <button
                      style={{
                        background:'#43a047',color:'#fff',border:'none',borderRadius:'8px',padding:'0.3em 1.1em',cursor:'pointer',fontWeight:500,display:'flex',alignItems:'center',gap:'6px',fontSize:'0.98em'
                      }}
                      onClick={()=>window.open(building.google_maps_link, '_blank')}
                    >
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 10.5C21 17 12 22 12 22S3 17 3 10.5a9 9 0 1118 0z"/><circle cx="12" cy="10.5" r="3.5" stroke="#fff" strokeWidth="2"/></svg>
                      الموقع
                    </button>
                  ) : (
                    <span style={{color:'#1976d2',fontWeight:500}}>لا يوجد</span>
                  )}
                </div>
                {/* صور العمارة */}
                <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee',alignItems:'center'}}>
                  <span style={{fontWeight:'bold',color:'#333'}}>صور العمارة</span>
                  {(building && building.image_urls && Array.isArray(building.image_urls) && building.image_urls.length > 0) ? (
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      {building.image_urls.map((imgUrl:string,idx:number) => (
                        <button
                          key={imgUrl+idx}
                          style={{
                            background:'#e3e7ee',
                            border:'none',
                            borderRadius:'50px',
                            height:'30px',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            cursor:'pointer',
                            transition:'background 0.18s',
                            boxShadow:'0 1px 4px #0001',
                            padding:'0 10px',
                            gap:'5px',
                          }}
                          title="معاينة الصورة"
                          onMouseOver={e=>e.currentTarget.style.background='#1976d2'}
                          onMouseOut={e=>e.currentTarget.style.background='#e3e7ee'}
                          onClick={()=>{
                            const img = document.createElement('img');
                            img.src = imgUrl;
                            img.style.maxWidth = '90vw';
                            img.style.maxHeight = '80vh';
                            img.style.display = 'block';
                            img.style.margin = '2em auto';
                            const overlay = document.createElement('div');
                            overlay.style.position = 'fixed';
                            overlay.style.top = '0';
                            overlay.style.left = '0';
                            overlay.style.width = '100vw';
                            overlay.style.height = '100vh';
                            overlay.style.background = 'rgba(0,0,0,0.7)';
                            overlay.style.zIndex = '9999';
                            overlay.appendChild(img);
                            overlay.onclick = ()=>document.body.removeChild(overlay);
                            document.body.appendChild(overlay);
                          }}
                        >
                          <Image size={16} color="#1976d2" style={{transition:'color 0.18s'}}/>
                          <span style={{fontSize:'0.93em',color:'#1976d2',fontWeight:500,marginRight:'2px'}}>معاينة</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={{color:'#1976d2',fontWeight:500}}>لا يوجد</span>
                  )}
                </div>
            </div>
          </BuildingCard>
        </div>

        {/* كارد معلومات الوحدات */}
        <BuildingCard
          title="معلومات الوحدات"
          open={openCard===6}
          onToggle={()=>setOpenCard(openCard===6?0:6)}
          effect="js"
          icon={<Home />}
          gradient="from-blue-600 to-indigo-600"
          iconColor="text-white"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-right border border-gray-200 rounded-xl bg-white">
              <thead>
                <tr className="bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-700">
                  <th className="px-3 py-2">رقم الوحدة</th>
                  <th className="px-3 py-2">الدور</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2">النوع</th>
                  <th className="px-3 py-2">المساحة</th>
                  <th className="px-3 py-2">السعر</th>
                  <th className="px-3 py-2">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-400">لا توجد وحدات مسجلة لهذا المبنى.</td></tr>
                ) : (
                  units.map((unit, index) => (
                    <tr key={unit.id} className="border-b hover:bg-blue-50 transition" data-seq={index + 1}>
                      <td className="px-3 py-2 font-bold">{unit.unit_number}</td>
                      <td className="px-3 py-2">{unit.floor}</td>
                      <td className="px-3 py-2">{unit.status === 'available' ? 'متاحة' : unit.status === 'reserved' ? 'محجوزة' : 'مباعة'}</td>
                      <td className="px-3 py-2">{unit.type === 'apartment' ? 'شقة' : unit.type === 'studio' ? 'ملحق' : unit.type === 'duplex' ? 'دوبلكس' : unit.type === 'penthouse' ? 'بنتهاوس' : unit.type}</td>
                      <td className="px-3 py-2">{unit.area ?? '-'}</td>
                      <td className="px-3 py-2">{unit.price ? unit.price.toLocaleString('ar-EG') : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button title=" تعديل" className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                            <Pencil size={16}/>
                          </button>
                          <button title="حذف" className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition">
                            <Trash2 size={16}/>
                          </button>
                          <button title="مشاركة" className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition">
                            <Share2 size={16}/>
                          </button>
                          <button title="طباعة" className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
                            <Printer size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </BuildingCard>

        {/* كارد معلومات المكتب الهندسي (فارغ حالياً) */}
        <BuildingCard
          title="اداري المكتب الهندسي"
          open={openCard===7}
          onToggle={()=>setOpenCard(openCard===7?0:7)}
          effect="js"
          icon={<BarChart3 />}
          gradient="from-gray-500 to-gray-700"
          iconColor="text-white"
        >
          <div className="text-gray-400 text-center py-6">سيتم إضافة بيانات المكتب الهندسي لاحقاً</div>
        </BuildingCard>

        {/* كارد معلومات المشترين (فارغ حالياً) */}
        <BuildingCard
          title="معلومات المشترين"
          open={openCard===8}
          onToggle={()=>setOpenCard(openCard===8?0:8)}
          effect="js"
          icon={<Users />}
          gradient="from-green-500 to-lime-500"
          iconColor="text-white"
        >
          <div className="text-gray-400 text-center py-6">سيتم إضافة بيانات المشترين لاحقاً</div>
        </BuildingCard>
      </div>
    </div>
  );
}