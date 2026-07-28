/**
 * Shared auth-page logic (login.html, register.html). Each form's
 * handling is guarded behind an element-existence check, so this one
 * file can serve both pages without erroring on whichever form isn't
 * present on the current page.
 *
 * No backend is wired up yet — validation and loading states are fully
 * functional, but the actual network call is a TODO stub. Search for
 * "TODO: wire to" to find where real API integration goes.
 */

document.addEventListener('DOMContentLoaded', () => {

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Toggles a field's error state.
   *
   * Args:
   *   groupEl: the .form-group wrapper element
   *   show: whether to show the error state
   */
  function setFieldError(groupEl, show) {
    groupEl.classList.toggle('has-error', show);
  }

  function setButtonLoading(buttonEl, isLoading) {
    buttonEl.classList.toggle('is-loading', isLoading);
    buttonEl.disabled = isLoading;
  }

  // ---------------------------------------------------------------------
  // Login form
  // ---------------------------------------------------------------------
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    const emailInput = document.getElementById('email');
    const emailGroup = document.getElementById('email-group');
    const passwordInput = document.getElementById('password');
    const passwordGroup = document.getElementById('password-group');
    const submitBtn = document.getElementById('login-submit');

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailValid = EMAIL_RE.test(emailInput.value.trim());
      const passwordValid = passwordInput.value.length > 0;

      setFieldError(emailGroup, !emailValid);
      setFieldError(passwordGroup, !passwordValid);

      if (!emailValid || !passwordValid) return;

      setButtonLoading(submitBtn, true);

      // TODO: wire to POST /api/auth/login/ (simplejwt TokenObtainPairView)
      // On success: store access token in memory (React Context once the
      // dashboard is built), rely on the httpOnly refresh cookie for
      // silent refresh. On failure: setButtonLoading(submitBtn, false)
      // and show a form-level error.
      setTimeout(() => {
        setButtonLoading(submitBtn, false);
        console.log('TODO: wire to POST /api/auth/login/', {
          email: emailInput.value.trim(),
        });
      }, 900);
    });

    // Clear a field's error state as soon as the person starts fixing it
    emailInput.addEventListener('input', () => setFieldError(emailGroup, false));
    passwordInput.addEventListener('input', () => setFieldError(passwordGroup, false));
  }

  // ---------------------------------------------------------------------
  // Register form
  // ---------------------------------------------------------------------
  const registerForm = document.getElementById('register-form');

  if (registerForm) {
    const emailInput = document.getElementById('reg-email');
    const emailGroup = document.getElementById('reg-email-group');
    const passwordInput = document.getElementById('reg-password');
    const passwordGroup = document.getElementById('reg-password-group');
    const submitBtn = document.getElementById('register-submit');
    const toggleBtn = document.getElementById('toggle-reg-password');
    const reqLength = document.getElementById('req-length');
    const reqNotNumeric = document.getElementById('req-notnumeric');

    /**
     * Checks the password against both requirements and updates the
     * checklist live — this replaces a single generic error message
     * with feedback the person can act on while they're still typing,
     * rather than discovering what's wrong only after they submit.
     */
    function checkPasswordRequirements() {
      const value = passwordInput.value;
      const lengthOk = value.length >= 8;
      const notNumericOk = value.length > 0 && !/^\d+$/.test(value);

      reqLength.classList.toggle('is-met', lengthOk);
      reqNotNumeric.classList.toggle('is-met', notNumericOk);

      return lengthOk && notNumericOk;
    }

    // Reveal/hide password — removes the need for a second "confirm
    // password" field entirely, since the person can just check what
    // they typed instead of typing it twice
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggleBtn.classList.toggle('is-active', isPassword);
        toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      });
    }

    passwordInput.addEventListener('input', () => {
      checkPasswordRequirements();
      setFieldError(passwordGroup, false);
    });

    // Validate email as soon as the person leaves the field (not on
    // every keystroke — that would flag "j" as invalid while they're
    // still typing "jane@company.com")
    emailInput.addEventListener('blur', () => {
      const value = emailInput.value.trim();
      if (value.length > 0) {
        setFieldError(emailGroup, !EMAIL_RE.test(value));
      }
    });
    emailInput.addEventListener('input', () => setFieldError(emailGroup, false));

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailValid = EMAIL_RE.test(emailInput.value.trim());
      const passwordValid = checkPasswordRequirements();

      setFieldError(emailGroup, !emailValid);

      if (!emailValid || !passwordValid) return;

      setButtonLoading(submitBtn, true);

      // TODO: wire to POST /api/auth/register/ (RegisterClientView).
      // Response returns { client_id, email } only — no API key at
      // registration anymore, that's issued per-project after login.
      // On success: redirect to login.html (or straight into the
      // dashboard once the cookie-based flow logs them in directly).
      setTimeout(() => {
        setButtonLoading(submitBtn, false);
        console.log('TODO: wire to POST /api/auth/register/', {
          email: emailInput.value.trim(),
        });
      }, 900);
    });
  }

  // Render any Lucide icon placeholders (password reveal icons)
  if (window.lucide) lucide.createIcons();

});