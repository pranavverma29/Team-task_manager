// ── Login / Signup Logic ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initPageChrome === 'function') initPageChrome();
  // Redirect if already logged in
  if (localStorage.getItem('token')) {
    window.location.href = '/dashboard';
    return;
  }

  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    // Role selection logic for Login
    const roleTabs = document.querySelectorAll('.role-tabs .role-tab');
    const roleInput = document.getElementById('role-input');

    roleTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        roleTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (roleInput) roleInput.value = tab.dataset.role;
      });
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      const err = document.getElementById('login-error');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      err.classList.remove('visible');
      try {
        const data = await API.post('/auth/login', {
          email:    loginForm.email.value.trim(),
          password: loginForm.password.value,
        });
        saveAuth(data);
        window.location.href = '/dashboard';
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  if (signupForm) {
    // Role selection logic
    const roleTabs = document.querySelectorAll('.role-tab');
    const roleInput = document.getElementById('role-input');

    roleTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        roleTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (roleInput) roleInput.value = tab.dataset.role;
      });
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = signupForm.querySelector('button[type=submit]');
      const err = document.getElementById('signup-error');
      btn.disabled = true;
      btn.textContent = 'Creating account…';
      err.classList.remove('visible');

      const password  = signupForm.password.value;
      const password2 = signupForm.password2.value;
      if (password !== password2) {
        err.textContent = 'Passwords do not match';
        err.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
      }
      try {
        const data = await API.post('/auth/signup', {
          name:     signupForm.name.value.trim(),
          email:    signupForm.email.value.trim(),
          password,
          role:     roleInput ? roleInput.value : 'MEMBER'
        });
        saveAuth(data);
        window.location.href = '/dashboard';
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
});
