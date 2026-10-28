# دليل Hermes Agent وحزمة المهارات المشتركة

هذه مكتبة مهارات مفتوحة المصدر لربط **Hermes Agent** بمشاريع البرمجة المختلفة في حساب GitHub، دون تعديل ملفات أي مشروع عند تثبيت المهارات. تم وضعها في مجلد مستقل داخل المستودع العام fadfdasha/fadfdasha، لأن اتصال GitHub الحالي لا يوفر أداة إنشاء مستودع جديد؛ يمكنك نقل مجلد skills إلى مستودع مخصص لاحقاً.

> مهم: هذه **مكتبة مهارات قابلة للتثبيت**، وليست إضافة ChatGPT أصلية أو خادماً يعمل تلقائياً. إضافة GitHub داخل ChatGPT لا تشغّل Hermes بنفسها. تشغيل الوكيل يحتاج جهازاً أو VPS، مزود نموذج AI، ومصادقة GitHub منفصلة.

## الملفات

- skills/github-project-engineer/SKILL.md: مراجعة المستودعات، الخطة، التصحيح، الاختبارات، Pull Requests.
- skills/android-apk-engineer/SKILL.md: إعداد وبناء Debug APK واختبار الأندرويد.
- skills/remotion-video-engineer/SKILL.md: React/TypeScript/Remotion وFFmpeg والمونتاج.
- skills/mobile-code-editor-engineer/SKILL.md: محررات HTML/CSS/JS، المعاينة المعزولة، وتجربة الهاتف.
- hermes/setup_hermes_skills.sh: إضافة مصدر المهارات وتثبيتها في جهاز يعمل عليه Hermes.
- tools/validate_hermes_skills.py: فحص شكل ملفات المهارات؛ يفحصها GitHub Actions كذلك.

## الخطوة 1 — شغّل Hermes على جهاز أو VPS

وفق [وثائق Hermes الرسمية](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart)، على Linux / macOS / WSL2 نفّذ بعد مراجعة السكربت الرسمي:

~~~bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup
hermes model
hermes doctor
~~~

يمكنك اختيار DeepSeek أو مزوّد آخر أثناء الإعداد. لا تشارك مفاتيح API في دردشة أو ملف عام. لا تنفذ أمر التثبيت على بيئة غير موثوقة.

## الخطوة 2 — أضف مهارات GitHub المشتركة

بعد تثبيت Hermes، نفّذ من نسخة مستنسخة من هذا المستودع:

~~~bash
bash hermes/setup_hermes_skills.sh --dry-run
bash hermes/setup_hermes_skills.sh
~~~

أو مباشرة من دون تنزيل السكربت:

~~~bash
hermes skills tap add fadfdasha/fadfdasha
hermes skills install fadfdasha/fadfdasha/github-project-engineer
hermes skills install fadfdasha/fadfdasha/android-apk-engineer
hermes skills install fadfdasha/fadfdasha/remotion-video-engineer
hermes skills install fadfdasha/fadfdasha/mobile-code-editor-engineer
hermes skills list
~~~

المهارات الآتية من مصدر مجتمعي تخضع لفحص أمني عند تثبيتها؛ راجع التحذيرات ولا تستخدم force لتجاوزها. بدء جلسة Hermes جديدة قد يكون ضرورياً كي تظهر المهارات.

## الخطوة 3 — اربطه بمستودع تختاره في كل مهمة

ثبّت أداة GitHub CLI على جهاز Hermes ثم سجّل الدخول عليها أنت بنفسك بصلاحيات أقل ما يمكن:

~~~bash
gh auth login
gh auth status
gh repo view OWNER/REPO
~~~

يجب أن تكون هذه المصادقة **منفصلة عن اتصال @GitHub في ChatGPT**. امنح صلاحية قراءة فقط كبداية، ثم صلاحية كتابة للمستودع المحدد إذا احتاج العمل إلى فرع أو PR. لا تمنح Hermes إذناً شاملاً على كل المستودعات بلا حاجة.

## الخطوة 4 — الاستخدام

مثال مهمة يرسلها المستخدم إلى Hermes:

> استخدم github-project-engineer وandroid-apk-engineer على المستودع OWNER/REPO. افحص الشيفرة الحالية دون إنشاء مشروع بديل. أصلح البناء، اختبر الوظائف، وابنِ Debug APK إن كانت أدوات Android متاحة. أنشئ فرعاً وPull Request ولا تدمج أو تنشر دون موافقتي. اذكر نتائج الاختبارات الحقيقية.

للوصول إليه من هاتفك، وفّر خادماً يظل قيد التشغيل، ثم أعد إعداد البوابة عبر:

~~~bash
hermes gateway setup
~~~

اختر Telegram واتبع إعداد الاعتماد الرسمي من Hermes. لا تضع رموز Telegram في مستودع GitHub أو في المحادثة.

## الحدود والأمان

- المكتبة عامة ولا تحتوي بيانات اعتماد أو مفاتيح. لا تحفظ أسراراً في ملفات SKILL.md أو commits.
- لا توجد عملية تشغيل Hermes، أو اتصال Telegram، أو تكامل ChatGPT أصلي تم تفعيله بمجرد رفع هذه الملفات.
- لا تُعدل أي مستودعات تلقائياً. كل مهمة تستلزم اختيار مستودع والسماح بالتغييرات.
- Debug APK ليس بديلاً عن إصدار Release مُوقّع، والنجاح في البناء ليس إثباتاً على نجاح الاختبار على جهاز.
- مهارات Hermes تُنفَّذ في البيئة التي تثبت Hermes فيها، لا داخل إضافة GitHub في ChatGPT.

## المراجع

- https://github.com/NousResearch/hermes-agent
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands
