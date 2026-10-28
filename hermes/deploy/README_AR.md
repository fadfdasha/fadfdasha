# Hermes Agent — استضافة مستمرة وآمنة على VPS

هذه ملفات نشر **بوابة Hermes الحقيقية** باستخدام صورة Docker الرسمية `nousresearch/hermes-agent:stable`، وليس استضافة صفحات ثابتة. وهي مستقلة عن شيفرة موقع الويب الموجود في هذا المستودع.

## ماذا تم إعداده؟

- `compose.yaml`: حاوية Gateway مع إعادة التشغيل التلقائي، وحجم بيانات دائم، وبدون منافذ عامة.
- `first-setup.sh`: معالج أول تشغيل تفاعلي، يحفظ مفاتيح النموذج وTelegram على الخادم فقط، ثم يسجل Skills Tap ويثبت أربع مهارات.
- `deploy.sh`: نشر/ترقية آمنة من دون لمس مجلد بيانات Hermes على الخادم.
- `.github/workflows/hermes-vps-deploy.yml`: فحص تلقائي للملفات، ونشر اختياري يدوي من GitHub Actions إلى VPS عبر SSH.

**ملاحظة**: توفر الملفات لا يعني أن VPS موجود أو أن Hermes يعمل بالفعل. يلزم توفير خادم ومفاتيح دخول أصلية؛ لا تضع هذه المفاتيح في GitHub issue أو commits أو المحادثة.

## المتطلبات قبل النشر

1. VPS بنظام Linux مع دعم Docker Engine وDocker Compose Plugin. يفضل 2 CPU و2–4 GB RAM ومساحة 2+ GB، بحسب الأدوات المستخدمة.
2. مستخدم SSH غير root، لديه صلاحية تشغيل Docker. عضوية مجموعة `docker` تعادل صلاحيات root تقريبًا؛ خصص الخادم ولا تشارك الوصول.
3. معالج Hermes يحتاج اعتماد مزوّد نموذج (Nous Portal/OpenRouter/غيره) وإعداد Telegram عبر BotFather و`TELEGRAM_ALLOWED_USERS` للسماح بحسابك فقط.
4. يفضَّل تفعيل جدار ناري يمنع أي منافذ عامة باستثناء SSH المقيّد بعنوانك، ولا تستخدم `API_SERVER_HOST=0.0.0.0` من دون مصادقة وحماية شبكة.
5. لا تشغل الوكيل فوق مستودعات GitHub خاصة من دون اعتماد مقيّد للمستودعات المطلوبة وحدها.

## إعداد الخادم لمرة واحدة

ثبّت Docker وفق تعليمات Docker الرسمية أولاً: https://docs.docker.com/engine/install/

اتصل من جهازك بالخادم عبر SSH ونفّذ:

~~~bash
git clone --depth 1 https://github.com/fadfdasha/fadfdasha.git
cd fadfdasha
bash hermes/deploy/first-setup.sh
~~~

أكمل الإعداد التفاعلي للنموذج وحساب Telegram؛ لا تضع رموزاً داخل الأوامر العامة. قد يطلب Hermes تأكيد تثبيت المهارات المجتمعية بعد الفحص الأمني. تتحقق من تشغيل الحاوية بنشر يدوي أول مرة:

~~~bash
bash hermes/deploy/deploy.sh
docker ps --filter name=hermes-agent-gateway
docker logs --tail 100 hermes-agent-gateway
~~~

يعتمد `deploy.sh` على `~/.hermes/.env` و`~/.hermes/config.yaml` بعد معالج الإعداد. قد تظهر معلومات حساسة في السجلات، فلا تنشرها عامة.

## التحكم بالنشر من GitHub

في المستودع العام، افتح Settings → Environments، أنشئ بيئة `hermes-vps` وفَعّل **Required reviewers** إن كانت متاحة، وأضف هذه الأسرار في البيئة (وليس في ملفات المستودع):

| Secret | المعنى |
|---|---|
| `HERMES_SSH_HOST` | اسم DNS أو عنوان IPv4 للـ VPS |
| `HERMES_SSH_USER` | اسم مستخدم غير root لديه وصول Docker |
| `HERMES_SSH_PRIVATE_KEY` | مفتاح SSH الخاص بالمهمة، بدون عبارة مرور لأن CI غير تفاعلي؛ خزنه فقط في GitHub Environment Secrets |
| `HERMES_SSH_KNOWN_HOSTS` | بصمة خادم SSH بصيغة known_hosts بعد مطابقتها عبر قناة موثوقة |

**قبل إضافة المفتاح**: أنشئ مفتاح SSH منفصلاً للنشر باستخدام `ssh-keygen -t ed25519` على جهاز موثوق، أضف المفتاح العام إلى `~/.ssh/authorized_keys` للمستخدم المحدد، وتحقق من هوية مفتاح المضيف عبر قناة موثوقة. لا تستخدم `StrictHostKeyChecking=no`، ولا تشارك المفتاح الخاص في المحادثة.

افتح Actions → **Hermes VPS — validate and deploy** → Run workflow؛ اختر فرع `main` ثم `deploy`. ستفشل المهمة برسالة واضحة عند غياب الأسرار أو فشل الاتصال أو عدم اكتمال معالج Hermes. لن تبدأ تلقائيًا عند push أو PR.

للتأكد من صحة Compose من GitHub من دون خادم أو مفاتيح، اختر `validate`. عملية التحقق الآلية تُنفذ كذلك على تغييرات مسار `hermes/deploy/`.

## تحديث Hermes والتراجع

- نشر الإعداد الجديد من Actions يعيد تشغيل الحاوية من صورة `stable` ويُبقي `~/.hermes` محفوظًا.
- لا تربط ملفات الأسرار بجلسة CI أو تطبع محتوى `~/.hermes/.env`.
- قبل تحديثات كبيرة خذ نسخة احتياطية **مشفرة** خارج الخادم من `~/.hermes`؛ تتضمن مفاتيح وجلسات.
- عند مشكلة في صورة جديدة، استخدم `HERMES_IMAGE` بصورة محددة الإصدار على الخادم عند تشغيل `deploy.sh` (أو عدّل `compose.yaml` ضمن PR) ثم أعد النشر. الأمان الأعلى هو تثبيت digest بعد اختباره.
- لوقف البوابة مؤقتاً:
  `docker compose -p hermes-agent -f ~/hermes-agent-deployment/compose.yaml stop` مع تعيين `HERMES_DATA_DIR` و`HERMES_UID` و`HERMES_GID` أولاً، أو `docker stop hermes-agent-gateway`.

## حدود التنفيذ

- GitHub Actions يشغّل مهامًا مؤقتة ولا يوفر VPS أو خادم 24/7.
- Docker Gateway يمكن أن يبقى قيد التشغيل على VPS بوجود كهرباء وشبكة واشتراك سارٍ.
- تُثبت مهارات GitHub داخل Hermes، **وليست** إضافة أصلية جديدة داخل ChatGPT.
- لا توجد صلاحية لكتابة secrets أو إنشاء VPS من إضافة GitHub الحالية؛ يلزم تفويض المستخدم لهذه الخطوة.
- لم تختبر هذه الملفات على الخادم الخاص بك قبل إتاحة SSH / VPS، لذلك لا تعدّ اتصال Telegram أو تنفيذ النموذج مثبتين بعد.

المصادر: https://hermes-agent.nousresearch.com/docs/user-guide/docker و https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram و https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
