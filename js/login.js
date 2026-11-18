(() => {
  const form = document.getElementById('loginForm');
  if (!form) return;
  const identityInput = document.getElementById('identity');
  const passwordInput = document.getElementById('password');
  const remember = document.getElementById('rememberMe');
  const feedback = document.getElementById('formFeedback');

  try {
    const saved = localStorage.getItem('chaloRememberedIdentity');
    if (saved) { identityInput.value = saved; remember.checked = true; }
  } catch (_) {}

  document.getElementById('togglePassword')?.addEventListener('click', function () {
    const reveal = passwordInput.type === 'password';
    passwordInput.type = reveal ? 'text' : 'password';
    this.querySelector('span').textContent = reveal ? 'Hide' : 'Show';
    this.setAttribute('aria-pressed', String(reveal));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    document.getElementById('identityError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    feedback.textContent = '';
    feedback.className = 'form-feedback';

    const identity = identityInput.value.trim();
    const password = passwordInput.value;
    let valid = true;
    if (!identity) { document.getElementById('identityError').textContent = 'Enter your email address or phone number.'; valid = false; }
    else if (identity.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) { document.getElementById('identityError').textContent = 'Enter a valid email address.'; valid = false; }
    else if (!identity.includes('@') && !/^\+?[0-9\s-]{8,16}$/.test(identity)) { document.getElementById('identityError').textContent = 'Enter a valid phone number.'; valid = false; }
    if (!password) { document.getElementById('passwordError').textContent = 'Enter your password.'; valid = false; }
    if (!valid) return;

    const submit = form.querySelector('button[type="submit"]');
    const original = submit.innerHTML;
    submit.disabled = true; submit.textContent = 'Signing in...';
    try {
      const response = await fetch('api/auth.php?action=login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        credentials: 'same-origin', body: JSON.stringify({identity, password})
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Login failed.');
      try {
        if (remember.checked) localStorage.setItem('chaloRememberedIdentity', identity);
        else localStorage.removeItem('chaloRememberedIdentity');
      } catch (_) {}
      feedback.textContent = 'Welcome back, ' + result.user.full_name + '!';
      feedback.classList.add('success');
      window.location.href = 'account.php';
    } catch (error) {
      feedback.textContent = error.message || 'Could not connect to Chalo. Check that Apache and MySQL are running.';
      feedback.classList.add('error');
    } finally {
      submit.disabled = false; submit.innerHTML = original;
    }
  });

  document.getElementById('forgotPassword')?.addEventListener('click', () => {
    feedback.textContent = 'Password reset is not enabled yet. Contact the administrator to reset a demo account.';
    feedback.className = 'form-feedback info';
  });
  document.getElementById('googleButton')?.addEventListener('click', () => {
    feedback.textContent = 'Google sign-in is not configured. Use your Chalo email/phone and password.';
    feedback.className = 'form-feedback info';
  });
})();
