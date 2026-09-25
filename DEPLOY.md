# 🚀 دليل النشر — فضفضة عشوائية

خطوة بخطوة: من الكود على جهازك إلى موقع حي يظهر في قوقل.

## 1) تجهيز الكود

```bash
cd chat-site
# تأكد أن المشروع يعمل محليًا
npm install && npm start
```

ارفع المشروع إلى GitHub (مستودع خاص أو عام — الاثنان يعملان).

## 2) النشر على Railway (موصى به — طبقة مجانية)

1. سجّل في https://railway.app بحساب GitHub.
2. **New Project ← Deploy from GitHub repo** واختر مستودع `chat-site`.
3. Railway يكتشف `Dockerfile` تلقائيًا ويبني المشروع.
4. من تبويب **Variables** أضف:
   - `SESSION_SECRET` = قيمة عشوائية طويلة (ولّدها بـ: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `SITE_URL` = رابط موقعك النهائي (بعد ربط الدومين، مثال `https://fadfadasha.com`)
   - `SITE_NAME` = فضفضة عشوائية
   - `COOKIE_SECURE` = `1`
5. **مهم — قاعدة البيانات:** ملف SQLite يُحفظ في `data/`. أضف **Volume** في Railway
   واربطه على المسار `/app/data` حتى لا تضيع البيانات عند إعادة النشر.
   (بدون Volume ستُفقد الحسابات والرسائل مع كل نشر جديد!)
6. من تبويب **Settings ← Networking** اضغط **Generate Domain** للحصول على رابط مؤقت
   للتجربة (مثال: `xxx.up.railway.app`).

### بديل: Render (طبقة مجانية)

1. سجّل في https://render.com ← **New + ← Web Service** ← اختر المستودع.
2. **Build Command:** `npm install` — **Start Command:** `node server.js`.
3. أضف نفس متغيرات البيئة أعلاه.
4. أضف **Disk** (1GB) واربطه على `/opt/render/project/src/data` لحفظ قاعدة البيانات.
5. ملاحظة: الطبقة المجانية في Render "تنام" بعد خمول — أول زيارة قد تتأخر ثواني.

## 3) ربط دومين خاص (اختياري لكن مهم لقوقل)

1. اشترِ دومين من أي مسجّل (مثال: Namecheap / Cloudflare).
2. في Railway: **Settings ← Networking ← Custom Domain** وأضف دومينك.
3. في لوحة الدومين: أضف سجل `CNAME` يشير إلى رابط Railway.
4. انتظر انتشار DNS (دقائق إلى ساعات)، ثم حدّث `SITE_URL` في المتغيرات
   إلى `https://yourdomain.com` وأعد النشر.

## 4) الظهور في قوقل — Google Search Console

1. افتح https://search.google.com/search-console وأضف **موقعك (Domain أو URL prefix)**.
2. **التحقق من الملكية:** الأسهل عبر سجل DNS من نوع TXT (تعطيك قوقل القيمة).
3. بعد التحقق، من القائمة اليسرى: **Sitemaps ← Add a new sitemap** وأدخل:
   ```
   https://yourdomain.com/sitemap.xml
   ```
4. اطلب الفهرسة اليدوية للصفحة الرئيسية: **URL Inspection** ← الصق رابط موقعك ← **Request Indexing**.
5. تحقق أن `https://yourdomain.com/robots.txt` يعمل ويشير إلى الـ sitemap.

### نصائح SEO مطبّقة مسبقًا في الموقع

- عنوان `<title>` ووصف `meta description` بالعربية.
- Open Graph وTwitter Cards للمشاركة.
- `canonical` يشير لرابطك الرسمي.
- HTML دلالي: `lang="ar" dir="rtl"`، عنوان H1 واحد، عناوين متدرجة.
- `sitemap.xml` و`robots.txt` جاهزان.

### كم يستغرق الظهور؟

عادة أيام إلى أسابيع حتى يفهرس قوقل الموقع ويبدأ بالظهور — الصبر مطلوب،
وانشر روابط موقعك (تويتر/انستغرام) لتسريع الاكتشاف.

## 5) قائمة تحقق بعد النشر

- [ ] الموقع يفتح على الدومين بـ HTTPS
- [ ] التسجيل والدخول يعملان
- [ ] زر «ابدأ دردشة عشوائية» يطابق بين مستخدمين
- [ ] `/robots.txt` و`/sitemap.xml` يعملان ويحملان الدومين الصحيح
- [ ] Search Console: تم التحقق + تم إرسال الـ sitemap
