-- سكريبت تعريب أسماء الجداول والأعمدة إلى العربية بالكامل
-- ⚠️ تحذير: تنفيذ هذا السكريبت سيغير أسماء الجداول والأعمدة، وقد يتسبب في تعطل أي كود أو استعلامات تعتمد على الأسماء القديمة
-- يُنصح بأخذ نسخة احتياطية قبل التنفيذ


-- أولاً: إعادة تسمية جميع الجداول إلى العربية
ALTER TABLE buildings RENAME TO العماير;
ALTER TABLE units RENAME TO الوحدات;
ALTER TABLE reservations RENAME TO الحجوزات;
ALTER TABLE sales RENAME TO المبيعات;
ALTER TABLE staff RENAME TO الموظفين;
ALTER TABLE expenses RENAME TO المصروفات;
ALTER TABLE income RENAME TO الإيرادات;

-- ثانياً: إعادة تسمية الأعمدة لكل جدول بعد إعادة تسميته

-- جدول العماير
ALTER TABLE العماير RENAME COLUMN id TO معرف;
ALTER TABLE العماير RENAME COLUMN name TO الاسم;
ALTER TABLE العماير RENAME COLUMN plot_number TO رقم_القطعة;
ALTER TABLE العماير RENAME COLUMN neighborhood TO الحي;
ALTER TABLE العماير RENAME COLUMN address TO العنوان;
ALTER TABLE العماير RENAME COLUMN description TO الوصف;
ALTER TABLE العماير RENAME COLUMN total_floors TO عدد_الأدوار;
ALTER TABLE العماير RENAME COLUMN total_units TO عدد_الوحدات;
ALTER TABLE العماير RENAME COLUMN reserved_units TO الوحدات_المحجوزة;
ALTER TABLE العماير RENAME COLUMN parking_slots TO مواقف_السيارات;
ALTER TABLE العماير RENAME COLUMN driver_rooms TO غرف_السائقين;
ALTER TABLE العماير RENAME COLUMN elevators TO المصاعد;
ALTER TABLE العماير RENAME COLUMN street_type TO نوع_الشارع;
ALTER TABLE العماير RENAME COLUMN building_facing TO اتجاه_المبنى;
ALTER TABLE العماير RENAME COLUMN year_built TO سنة_البناء;
ALTER TABLE العماير RENAME COLUMN phone TO الهاتف;
ALTER TABLE العماير RENAME COLUMN build_status TO حالة_البناء;
ALTER TABLE العماير RENAME COLUMN deed_number TO رقم_الصك;
ALTER TABLE العماير RENAME COLUMN land_area TO مساحة_الأرض;
ALTER TABLE العماير RENAME COLUMN building_license_number TO رقم_رخصة_البناء;
ALTER TABLE العماير RENAME COLUMN insurance_available TO يوجد_تأمين;
ALTER TABLE العماير RENAME COLUMN insurance_policy_number TO رقم_وثيقة_التأمين;
ALTER TABLE العماير RENAME COLUMN has_main_water_meter TO يوجد_عداد_ماء_رئيسي;
ALTER TABLE العماير RENAME COLUMN water_meter_number TO رقم_عداد_الماء;
ALTER TABLE العماير RENAME COLUMN has_main_electricity_meter TO يوجد_عداد_كهرباء_رئيسي;
ALTER TABLE العماير RENAME COLUMN electricity_meter_number TO رقم_عداد_الكهرباء;
ALTER TABLE العماير RENAME COLUMN guard_name TO اسم_الحارس;
ALTER TABLE العماير RENAME COLUMN guard_phone TO هاتف_الحارس;
ALTER TABLE العماير RENAME COLUMN guard_room_number TO رقم_غرفة_الحارس;
ALTER TABLE العماير RENAME COLUMN guard_id_photo TO صورة_هوية_الحارس;
ALTER TABLE العماير RENAME COLUMN guard_shift TO دوام_الحارس;
ALTER TABLE العماير RENAME COLUMN guard_has_salary TO للحارس_راتب;
ALTER TABLE العماير RENAME COLUMN guard_salary_amount TO راتب_الحارس;
ALTER TABLE العماير RENAME COLUMN google_maps_link TO رابط_الموقع;
ALTER TABLE العماير RENAME COLUMN image_urls TO روابط_الصور;
ALTER TABLE العماير RENAME COLUMN floors_data TO بيانات_الأدوار;
ALTER TABLE العماير RENAME COLUMN owner_association TO اتحاد_الملاك;
ALTER TABLE العماير RENAME COLUMN owner_id TO معرف_المالك;
ALTER TABLE العماير RENAME COLUMN created_at TO تاريخ_الإنشاء;
ALTER TABLE العماير RENAME COLUMN updated_at TO تاريخ_التحديث;

-- جدول الوحدات
ALTER TABLE الوحدات RENAME COLUMN id TO معرف;
ALTER TABLE الوحدات RENAME COLUMN building_id TO معرف_العمارة;
ALTER TABLE الوحدات RENAME COLUMN unit_number TO رقم_الوحدة;
ALTER TABLE الوحدات RENAME COLUMN floor TO الدور;
ALTER TABLE الوحدات RENAME COLUMN type TO النوع;
ALTER TABLE الوحدات RENAME COLUMN facing TO الواجهة;
ALTER TABLE الوحدات RENAME COLUMN area TO المساحة;
ALTER TABLE الوحدات RENAME COLUMN rooms TO عدد_الغرف;
ALTER TABLE الوحدات RENAME COLUMN bathrooms TO عدد_الحمامات;
ALTER TABLE الوحدات RENAME COLUMN living_rooms TO عدد_الصالات;
ALTER TABLE الوحدات RENAME COLUMN kitchens TO عدد_المطابخ;
ALTER TABLE الوحدات RENAME COLUMN maid_room TO غرفة_خادمة;
ALTER TABLE الوحدات RENAME COLUMN driver_room TO غرفة_سائق;
ALTER TABLE الوحدات RENAME COLUMN entrances TO عدد_المداخل;
ALTER TABLE الوحدات RENAME COLUMN ac_type TO نوع_التكييف;
ALTER TABLE الوحدات RENAME COLUMN status TO الحالة;
ALTER TABLE الوحدات RENAME COLUMN price TO السعر;
ALTER TABLE الوحدات RENAME COLUMN description TO الوصف;
ALTER TABLE الوحدات RENAME COLUMN created_at TO تاريخ_الإنشاء;
ALTER TABLE الوحدات RENAME COLUMN updated_at TO تاريخ_التحديث;
