# Spec Kit — Global Codespaces Setup (دليل عربي)

## الهدف

هذه الملفات تضيف **Spec Kit** إلى بيئة التطوير في GitHub Codespaces في حسابك، بغض النظر عن المستودع الذي فتحت منه Codespace. لا تُغيِّر الشيفرة الموجودة في مشاريعك تلقائيًا.

- المصدر الرسمي: https://github.com/github/spec-kit
- الإصدار المثبّت: `v1.2.6`
- أداة سطر الأوامر: `specify-cli`
- التشغيل: GitHub Codespaces على Linux

## إكمال الربط مرة واحدة من إعدادات الحساب

1. افتح https://github.com/settings/codespaces
2. ابحث عن **Dotfiles**.
3. فعِّل **Automatically install dotfiles**.
4. اختر المستودع **fadfdasha/fadfdasha** من القائمة واحفظ اختيارك.
5. أنشئ **Codespace جديدًا** لأي مشروع تملكه.
6. افتح Terminal ونفِّذ `specify version` للتحقق من التثبيت.

**تنبيه:** اختيار المستودع في إعدادات الحساب مطلوب؛ لا تستطيع إضافة ملف `install.sh` وحدها تفعيل هذه الخاصية. الملفات تطبَّق على Codespaces الجديدة فقط، ولا تؤثّر على القديمة أو GitHub Actions أو الهاتف أو التطبيق المحلي.

## بدء مشروع جديد

في Terminal داخل Codespace:

```bash
specify init my-project --integration copilot
```

إذا كان Codex CLI مثبّتًا ومستعدًا:

```bash
specify init my-project --integration codex
```

## استخدام مشروع GitHub قائم

قبل التهيئة، احفظ تغييراتك الحالية وأنشئ فرعًا للتجربة. من جذر مستودع المشروع:

```bash
git switch -c chore/spec-kit-setup
specify init --here --force --integration copilot --non-interactive
git status
git diff
```

لا تنفّذ `--force` قبل أخذ نسخة احتياطية أو حفظ التغييرات، فقد تستبدل ملفات تهيئة تتعارض مع الملفات الموجودة. لا يلزم تكرار تثبيت CLI في كل مشروع داخل Codespace نفسه؛ لكن **تهيئة المشروع تتم لكل مستودع على حدة**.

لـ Codex CLI غيّر `copilot` إلى `codex`. استخدام Spec Kit في Codex يحتاج Codex CLI أو بيئة تدعم مهاراته؛ وجود GitHub Plugin في ChatGPT وحده لا يشغّل أوامر الطرفية أو مهارات Codex تلقائيًا.

## الترقية وإلغاء التفعيل

- للتحديث غيّر `SPEC_KIT_TAG` في `install.sh` إلى إصدار رسمي تمت مراجعته.
- لإيقاف التثبيت التلقائي، ألغِ خيار **Automatically install dotfiles** في إعدادات Codespaces.
- لإزالة الأداة من Codespace موجود: `uv tool uninstall specify-cli`.

## قيود

- GitHub Codespaces خدمة قد تكون لها حدود مجانية وتكاليف استخدام حسب الحساب.
- يعتمد التثبيت على اتصال الشبكة بـ GitHub وموقع تنزيل uv الرسمي.
- لا تُنسخ مفاتيح أو أسرار ولا تُضاف صلاحيات واسعة إلى GitHub.
