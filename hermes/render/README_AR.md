# Hermes Agent على Render — نشر بوابة Telegram دائمة

هذه الحزمة **جاهزة للربط بخدمة Render** وليست استضافة نشطة في حد ذاتها. تم تجهيز `render.yaml` لخدمة `worker`، مع قرص دائم، تشغيل نسخة واحدة، والصورة الرسمية `nousresearch/hermes-agent:stable`، دون منافذ عامة.

## قبل البدء
1. افتح [Render Dashboard](https://dashboard.render.com/) واربط حسابك بحساب GitHub. ثم استورد `render.yaml` من المستودع `fadfdasha/fadfdasha` عبر **New → Blueprint**.
2. **وافق على التكلفة قبل النشر**: العامل `1c-2g` والقرص الدائم `5 GB` مدفوعان، وقد توجد فواتير لاستخدام نموذج DeepSeek. راجع خطة Render الحالية قبل قبول الإنشاء. الإعداد لا ينشئ اشتراكًا تلقائيًا.
3. لا تستخدم خطة مجانية مع بيانات Hermes المهمة: نظام ملفات الخدمة غير الملحقة بقرص دائم مؤقت.
4. اختر أسرار Render في نموذج إنشاء Blueprint، ولا تنسخها داخل GitHub أو الدردشة:
   - `DEEPSEEK_API_KEY`: مفتاح DeepSeek الحقيقي من لوحة مزود النموذج.
   - `TELEGRAM_BOT_TOKEN`: رمز البوت الذي تنشئه عبر @BotFather.
   - `TELEGRAM_ALLOWED_USERS`: رقم Telegram الرقمي الخاص بك (يمكن معرفته عبر @userinfobot). **ليس اسم الحساب**.
5. ابقِ `TELEGRAM_ALLOW_ALL_USERS=false` و`GATEWAY_ALLOW_ALL_USERS=false` و`API_SERVER_ENABLED=false`. لا تعطِ إذن تشغيل الوكيل لأي مستخدم آخر.

## الإعداد الأول للنموذج والمهارات

بعد نشر الخدمة، افتح **Shell** الخاص بالخدمة إن أتاحه حسابك/نوع الخدمة. الحاوية تعتمد على الصورة الرسمية التي تُنشئ ملفات الإعداد في القرص `/opt/data`. اضبط النموذج مرة واحدة ثم أعد تشغيل الخدمة إن لزم:

~~~bash
hermes config set model.provider deepseek
hermes config set model.default deepseek-chat
hermes doctor
~~~

استخدم أمر `hermes model` بدل الأمرين أعلاه إن تغيّر اسم النموذج في إصدار Hermes الخاص بك، وافحص اختيار النموذج الفعلي. لم يتم تنفيذ هذه الخطوة حتى الآن لأن خدمة Render غير متصلة.

ثم ثبّت مهارات الحساب من GitHub بعد مراجعتها:

~~~bash
hermes skills tap add fadfdasha/fadfdasha
hermes skills install fadfdasha/fadfdasha/github-project-engineer
hermes skills install fadfdasha/fadfdasha/android-apk-engineer
hermes skills install fadfdasha/fadfdasha/remotion-video-engineer
hermes skills install fadfdasha/fadfdasha/mobile-code-editor-engineer
hermes skills list
~~~

راجع التحذيرات الأمنية عند تثبيت Community Skills. يُفضّل تشغيل جلسة جديدة أو إعادة تشغيل البوابة حتى تُحمّل المهارات.

## كيف تتحقق؟
- تحقق من **Render Logs** وعدم ظهور أخطاء مصادقة DeepSeek أو Telegram؛ لا تنسخ السجلات إذا ظهرت فيها بيانات سرية.
- افتح محادثة البوت على Telegram من حسابك المسموح به، ثم أرسل رسالة اختبار؛ لا تفترض نجاح الاتصال بناءً على كلمة `Live` في Render وحدها.
- جرّب أمرًا غير مؤذٍ: سؤال عن المهارات المتاحة، وليس تعديل المستودعات مباشرة.
- بعد إعادة نشر الخدمة، تأكد من بقاء المهارات والجلسات داخل القرص `/opt/data`.
- لا تنشئ نسخة ثانية على نفس القرص: Hermes لا يدعم مشاركة حالته للكتابة بين نسختين في نفس الوقت.

## وصول Hermes إلى GitHub
Render لا يرث توثيق GitHub الخاص بتطبيق ChatGPT. أنشئ GitHub App أو Fine-Grained PAT منفصلاً بصلاحية محدودة لمستودع واحد، واحتفظ به في **Render Environment** فقط (ليس بالـ `render.yaml`). ابدأ بقراءة فقط؛ ولإنشاء فروع وPRs، امنح صلاحيات الكتابة الضرورية لمستودع تختاره. لا تستخدم رمز GitHub شخصي شامل.

## فروقات مهمة عن VPS
- هذه الخدمة عامل Render، ولا تحتاج إلى SSH أو `HERMES_SSH_*`.
- إعداد VPS السابق في `hermes/deploy/` يبقى خيارًا بديلًا منفصلًا.
- GitHub Actions يختبر ملف Render فقط ولا ينشئ خدمة مدفوعة ولا يُدخل أسرارًا.
- `autoDeployTrigger: off` لمنع التحديثات غير المقصودة؛ وافق على التحديثات من Render Dashboard.
- استضافة عامل Render قد لا تتضمن Docker daemon داخلي أو Android SDK/emulator؛ لذلك لا تَعِد ببناء APK داخل العامل نفسه. يمكن استخدام GitHub Actions أو خادم بناء منفصل عند الحاجة.

## الأمان والتكلفة
- القرص الدائم مدفوع، وتوجد تكلفة تشغيل العامل وتكلفة النموذج؛ لا تفعل الخدمة قبل مراجعة التسعير.
- احفظ نسخًا احتياطية مشفرة من الحالة المهمة إذا كانت الخدمة تسمح بنقل بياناتها، لأن القرص ليس بديلاً عن النسخ الاحتياطي.
- لا توجد واجهة ويب أو API عامة في هذا Blueprint. التعامل عبر Telegram فقط.
- لإيقاف الاستضافة أو الفوترة، راجع خدمة Render في حسابك؛ حذف Blueprint من GitHub لا يوقف خدمة قائمة تلقائيًا.

## مراجع رسمية
- https://render.com/docs/blueprint-spec
- https://render.com/docs/disks
- https://hermes-agent.nousresearch.com/docs/user-guide/docker
- https://hermes-agent.nousresearch.com/docs/integrations/providers
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram

**الحالة عند إنشاء هذا الملف:** لم يتم فتح حساب Render أو إنشاء Worker أو إضافة أسرار أو الاتصال بـTelegram؛ هذا إعداد هندسي جاهز لمرحلة التفويض.
