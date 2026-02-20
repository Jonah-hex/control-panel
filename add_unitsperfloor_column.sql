-- إضافة عمود عدد الشقق بالدور إلى جدول المباني
ALTER TABLE buildings
ADD COLUMN unitsperfloor INTEGER;

-- ملاحظة: إذا كان لديك بيانات سابقة وتريد تعبئة هذا العمود بناءً على بيانات موجودة في JSON أو مصفوفة floors، يمكنك استخدام UPDATE لاحقاً.
