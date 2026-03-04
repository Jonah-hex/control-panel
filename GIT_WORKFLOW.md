# دليل Git — التزامن بين الجهازين وتوحيد المستودعات والفروع

## اختصار: «حفظ التعديلات»

عندما تقول **«احفظ التعديلات»** أو **«حفظ التعديلات»** يُنفَّذ تلقائياً:
1. `git add .`
2. `git commit -m "وصف التعديلات"`
3. `git push origin main`

بهذا تُحفظ التعديلات وتُزامَن مع المسار الرئيسي `main` ليكون العمل موحَّداً بين الجهازين.

---

## 1. العمل اليومي (على أي جهاز)

### قبل البدء بالعمل
```bash
cd "مسار المشروع"   # مثال: c:\Users\My Pc\control-panel
git pull origin main
```

### عند الانتهاء أو قبل إغلاق الجهاز
```bash
git status
git add .
git commit -m "وصف التعديلات"
git push origin main
```

---

## 2. توحيد المستودع والفرع

- **مستودع واحد:** المستودع على GitHub (مثلاً `https://github.com/Jonah-hex/control-panel`)
- **فرع رئيسي واحد:** `main`
- على **كلا الجهازين** اعمل دائماً على الفرع `main`: pull قبل الشغل، push بعد الانتهاء.

### توحيد الفرع الحالي مع البعيد
```bash
git fetch origin
git checkout main
git pull origin main
# ثم احفظ تعديلاتك وارفعها:
git add .
git commit -m "آخر التعديلات"
git push origin main
```

### على الجهاز الآخر (بعد التوحيد)
```bash
git fetch origin
git checkout main
git pull origin main
```

---

## 3. التعامل مع الفرع old-commit

### لو تحتاج محتوى old-commit داخل main (دمج ثم توحيد)
```bash
git checkout main
git pull origin main
git merge origin/old-commit
# إذا ظهر تعارض (conflict) أصلح الملفات ثم:
git add .
git commit -m "دمج old-commit في main"
git push origin main
```

### لو لا تحتاج الفرع old-commit (حذفه وتوحيد الفروع)
```bash
git push origin --delete old-commit
```

---

## 4. رفع commit قديم كفرع (لو ظهر "does not belong to any branch")

```bash
git push origin <هاش_الكوميت>:refs/heads/old-commit
# مثال:
# git push origin ff838dce3aab1d52b2c5f92513111d691ebc7916:refs/heads/old-commit
```

---

## 5. العمل الموحد على الجهازين (نفس الخطوات على كل جهاز)

لضمان أن العمل على الجهازين متطابق مع المسار الرئيسي `main`:

| الخطوة | الأمر | متى |
|--------|--------|-----|
| 1 | `git pull origin main` | **قبل** فتح المشروع أو البدء بالعمل |
| 2 | (تعديل الملفات وحفظها) | العمل العادي |
| 3 | `git add .` | عند الانتهاء أو قبل مغادرة الجهاز |
| 4 | `git commit -m "وصف التعديلات"` | بعد add |
| 5 | `git push origin main` | بعد commit لرفع التعديلات إلى GitHub |

على **الجهاز الآخر**: نفّذ فقط **الخطوة 1** (`git pull origin main`) لسحب آخر التعديلات، ثم اعمل بنفس الطريقة (2 → 3 → 4 → 5).

---

## 6. قواعد سريعة

| القاعدة | السبب |
|--------|--------|
| **Pull قبل ما تبدأ** | حتى تعمل على آخر نسخة من الجهاز الآخر. |
| **Push قبل ما تترك الجهاز** | حتى تنتقل التعديلات للبعيد ويستفيد منها الجهاز الآخر. |
| **لا تترك شغل بدون commit ثم push** | لو انتقلت لجهاز ثاني بدون push، التعديلات لا تنتقل. |

---

*آخر تحديث: تم إنشاء الملف للرجوع إليه على الجهاز الأساسي.*
