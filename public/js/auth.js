/**
 * auth.js — منطق صفحتي التسجيل والدخول
 * كل النصوص المعروضة للمستخدم تُحقن عبر textContent (لا innerHTML).
 */
(function () {
  const form = document.querySelector('form[data-form]');
  if (!form) return;
  const errBox = document.getElementById('formError');
  const mode = form.getAttribute('data-form'); // register | login

  function showError(msg) {
    errBox.textContent = msg;
  }

  // إن كان مسجلًا مسبقًا، اذهب للتطبيق مباشرة
  fetch('/api/me').then((r) => {
    if (r.ok) window.location.href = '/app';
  }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const username = form.username.value.trim();
    const password = form.password.value;

    if (username.length < 3) return showError('اسم المستخدم قصير جدًا (3 أحرف على الأقل)');
    if (mode === 'register' && password.length < 6) return showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const r = await fetch(mode === 'register' ? '/api/register' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return showError(data.error || 'حدث خطأ — حاول مجددًا');
      window.location.href = '/app';
    } catch (err) {
      showError('تعذّر الاتصال بالسيرفر — تحقق من الإنترنت');
    } finally {
      btn.disabled = false;
    }
  });
})();
