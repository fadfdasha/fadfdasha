# تشغيل Hermes Agent على Oracle Cloud Always Free (ARM64)

هذه الحزمة جاهزة للتطبيق على خادم `Oracle Cloud Infrastructure` مجاني مؤهل، لكنها **لا تنشئ موارد سحابية** ولا تدخل إلى حساب Oracle أو تستخدم بطاقة ائتمان. لا تنشئ أي موارد مدفوعة أو ترقّي حسابك إلى Pay As You Go بسبب هذه التعليمات.

**قيمة تحقق مهمة بتاريخ 2026-10-28:** الحد الرسمي المجاني لـ Ampere A1 هو **2 OCPU و12 GB RAM إجمالاً**، مع **200 GB** مساحة Boot + Block Volume إجمالاً في *المنطقة الرئيسية (home region)*. كانت معلومات 4 OCPU/24 GB شائعة سابقاً، لكنها لا تطابق الوثائق الحالية؛ اتبع عرض **Always Free Eligible** وملخص التكاليف في حسابك دائماً.

## التوافق
- Oracle A1 = `aarch64` أو `linux/arm64`.
- Hermes الرسمية تدعم صور Docker للمعماريتين `amd64` و`arm64`، والإصدارات المستقرة تخضع لاختبار المعماريتين.
- Ubuntu ARM64 هو نظام تشغيل مؤهل عند اختيار الصورة الموسومة **Always Free Eligible**.
- الصورة الرسمية `nousresearch/hermes-agent:stable` تشغّل البوابة عبر s6 supervisor، وتحفظ الذاكرة، المحادثات والمهارات عبر `/opt/data` على القرص المحلي.
- لا يحتاج بوت Telegram إلى فتح منفذ HTTP عام؛ يستخدم الاتصال الصادر.

## 1. إنشاء الحساب والخادم: تنفيذ يدوي فقط في Oracle Console

1. افتح https://cloud.oracle.com/ وسجّل حساب Oracle Free Tier بنفسك. قد تتطلب عملية التحقق بطاقة دفع، لكن **لا توافق على الترقية أو خدمة مدفوعة**. ليس لدي وصول OCI إلى حسابك من إضافة GitHub أو Render.
2. اختر **home region** بعناية عند التسجيل؛ الموارد المجانية A1 يجب أن تكون في منطقتك الرئيسية. إن لم تكن سعة A1 متاحة في هذه المنطقة، لا تنشئ خادماً من عائلة مدفوعة لمجرد تجاوز المشكلة.
3. من **Compute → Instances → Create instance** اختر:
   - **Always Free Eligible**: `VM.Standard.A1.Flex` (Ampere ARM).
   - `1 OCPU` و`6 GB RAM` (لا تتجاوز مجموع حصتك المجانية مع أي أجهزة موجودة).
   - صورة Ubuntu ARM64 تحمل **Always Free Eligible**.
   - قرص الإقلاع `50 GB` (أو الحد الأدنى المؤهل المعروض في Console)، ضمن سقف جميع أقراصك المجانية البالغ `200 GB`.
   - شغّله في **home region** فقط، دون Block Volume إضافي أو خدمات مُدارة مدفوعة.
4. أنشئ زوج مفاتيح **SSH Ed25519** على جهازك الموثوق ولا تضع المفتاح الخاص في GitHub أو ChatGPT. استخدم المفتاح العام عند إنشاء الجهاز.
5. في شبكة OCI، الأفضل استعمال Network Security Group مقيّدة: **Ingress TCP/22 فقط من عنوان IP الحالي الخاص بك على شكل /32**. احذف أو قيد أي قاعدة افتراضية `0.0.0.0/0:22`. لا تفتح 80 أو 443 أو 8642، ولا تعرض Docker Engine للإنترنت. اسمح بالخروج إلى HTTPS/DNS والمستودعات اللازمة.
6. راجع شاشة **Estimated cost / Cost estimate** ويجب أن تظهر `$0` أو وسم **Always Free** للعناصر المطلوبة. إذا عرضت رسمًا أو استهلاك رصيد تجربة أو طلبت ترقية مدفوعة، **توقف ولا تنشئ**.
7. إذا ظهر `Out of host capacity`، جرب Availability Domain آخر في **نفس home region** أو جرب لاحقًا. لا تغيّر إلى A2 أو VM مدفوعة أو منطقة غير مؤهلة بهدف التحايل.

> الحصة المجانية وفق Oracle تُحسب على جميع الموارد المخصصة للحساب، وليست حصة جديدة لكل مشروع. كذلك يمكن استرداد الأجهزة الخاملة؛ لا تفتعل أحمالاً اصطناعية للتحايل على السياسة.

## 2. إعداد Ubuntu عبر SSH

بعد أن تُنشئ أنت خادمًا مجانيًا مؤهلاً، اتصل من جهاز موثوق بمفتاح SSH (الاسم عادةً `ubuntu` لصورة Ubuntu الرسمية):

~~~bash
ssh -i /path/to/your-private-key ubuntu@YOUR_ORACLE_PUBLIC_IP
git clone --depth 1 https://github.com/fadfdasha/fadfdasha.git
cd fadfdasha
bash hermes/oracle/bootstrap-ubuntu-arm64.sh
~~~

يفحص السكربت Ubuntu/ARM64 ثم يثبت Docker Engine وCompose من مستودع Docker الرسمي بعد **التحقق من بصمة مفتاح GPG**. لا يفتح منافذ أو ينشئ موارد OCI، ولا يضيف المستخدم إلى مجموعة Docker. لا تنفذ محتوى GitHub غير المراجع في حساب root. لا تشارك مفتاح SSH الخاص في أي محادثة أو صفحة عامة.

## 3. إعداد Hermes والتكامل مرة واحدة

~~~bash
bash hermes/oracle/setup-hermes.sh
~~~

يحمّل صورة ARM64 الرسمية ويشغل معالج Hermes التفاعلي. أدخل مفاتيح النموذج ومعلومات Telegram عبر SSH فقط؛ لا تضعها في ملفات مشروع GitHub:
- اصنع Bot عبر `@BotFather` ثم ضع `TELEGRAM_BOT_TOKEN` عبر معالج إعداد Hermes.
- ضع `TELEGRAM_ALLOWED_USERS` = رقم حساب Telegram الرقمي الخاص بك؛ لا تفعّل `TELEGRAM_ALLOW_ALL_USERS`. يظل Gateway API معطلاً صراحة في Docker.
- اختر مزوّد نموذج: DeepSeek أو OpenRouter أو أي مزوّد آخر. **خادم Oracle مجاني لا يعني أن API للنموذج مجاني**؛ تتطلب بعض النماذج دفعًا، ويمكن اختيار خطة API مجانية رسمية عند توفرها. لا تفترض وجود نموذج LLM محلي عالي الأداء على 1 OCPU.
- السكربت يثبّت أربع Skills مشتركة موجودة على GitHub. راجع تحذيرات فحص Community Skills ولا تتجاوزها بالقوة.
- `~/.hermes/.env` و `~/.hermes/config.yaml` وSkills والجلسات تُحفظ على خادمك فقط.

ربط GitHub الخاص بـ ChatGPT لا ينتقل تلقائيًا إلى Hermes على Oracle. عند الحاجة إلى تعديل مستودع بعينه عبر Hermes، اربطه من الخادم بمصادقة GitHub مستقلة ومقيّدة بالمستودع فقط؛ لا تنقل رمز GitHub الشامل أو توكن ChatGPT.

## 4. نشر وتشغيل مستمر

~~~bash
bash hermes/oracle/deploy.sh
bash hermes/oracle/verify.sh
~~~

- `compose.yaml`: نسخة واحدة، `restart: unless-stopped`، لا `ports`، وحفظ دائم `~/.hermes:/opt/data`.
- `verify.sh`: يفحص المعمارية والذاكرة والقرص والحاوية والمنافذ، ولا يقرأ أو يطبع كلمات المرور.
- **الاختبار النهائي**: أرسل رسالة آمنة إلى البوت من حساب Telegram المسموح به. تأكد من وصول رد النموذج، ثم أعد تشغيل الحاوية وتحقق من بقاء مهاراتك. لا تعتمد على كون Docker `running` كدليل على نجاح Telegram أو النموذج.
- حالة البوابة الخاصة: `sudo docker logs --tail 100 hermes-oracle-gateway`؛ قد تتضمن السجلات بيانات حساسة فاحتفظ بها على الخادم.

لإيقاف الخدمة دون حذف بياناتها:

~~~bash
sudo docker stop hermes-oracle-gateway
~~~

للتحديث، يُفضّل نسخ `~/.hermes` احتياطيًا بشكل مشفر خارج الخادم، ومراجعة تحديثات الصورة قبل إعادة النشر. الوسم `stable` متغير؛ بعد التأكد من إصدار موثوق يمكن تثبيت digest. لا تحفظ النسخة الاحتياطية في GitHub عام.

## فحوصات المشروع
- GitHub Actions: `.github/workflows/hermes-oracle-always-free-validate.yml` يفحص Shell وCompose والحصص الأمنية ومعمارية الصورة الرسمية ARM64.
- الملف `hermes/oracle/always-free-config.json` يوثّق مقاسات الخادم المطلوبة ويمنع خلطها بالحصص المدفوعة؛ **ليس Terraform** ولا ينشئ خدمات.
- فحوص CI ليست بديلاً عن اختبار خادم حقيقي أو شهادة $0 من Oracle Console.

## تنبيهات ومحددات
- Oracle قد يطلب بطاقة للتحقق من الهوية، وقد لا تتوفر سعة A1 المجانية. لا يوجد ضمان للحصول على خادم.
- 1 OCPU مناسب لبوابة Hermes خفيفة، لكنه ليس مناسبًا لعمليات Android build أو محاكٍ كبير. استخدم GitHub Actions للبناء مع مراعاة حدود الاستخدام المجاني الخاصة بخطتك.
- الاسترداد بسبب الخمول ممكن، والنسخ الاحتياطي مهم. لا ترفع الذاكرة أو المعالج أو الأقراص خارج المتاح المجاني.
- لا توجد حسابات Oracle أو Telegram أو مفاتيح API جرى إنشاؤها/تثبيتها تلقائياً خلال هذه المهمة.

## المصادر الرسمية
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- https://hermes-agent.nousresearch.com/docs/user-guide/docker
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
