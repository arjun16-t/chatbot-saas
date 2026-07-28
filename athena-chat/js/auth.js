/*
========================================
ORGANIZATION NOTE

Each feature below lives in its own object
(AuthFlip, AuthVisual, etc.) with an init()
method. initAuthApp() at the bottom just calls
Feature.init() for each one, in order.

Methods refer to their own object by name
(e.g. "AuthFlip.handleShowSignup") instead of "this",
since each object is a singleton — this keeps
"this" out of the picture entirely, which
matters because passing "obj.method" directly
as a callback (e.g. to addEventListener) would
otherwise silently break "this" binding.[cite: 1]
========================================
*/

/*
========================================
GLOBAL UTILITIES
(shared by multiple features, so they stay
as plain top-level functions rather than
living inside any single feature object)[cite: 1]
========================================
*/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(groupEl, show, triggerShake = false) {
    if (!groupEl) return;
    
    groupEl.classList.toggle('has-error', show);
    
    if (show && triggerShake) {
      groupEl.classList.remove('animate-shake');
      
      void groupEl.offsetWidth; 
      
      groupEl.classList.add('animate-shake');
    }
  }

/**
 * Toggles the loading state for the entire form, preventing
 * input mutation while the network request is in flight.
 */
function setFormLoading(formEl, buttonEl, isLoading) {
  if (!formEl || !buttonEl) return;

  // 1. Toggle the button state
  buttonEl.classList.toggle('is-loading', isLoading);
  buttonEl.disabled = isLoading;

  // 2. Toggle all inputs and buttons inside the form
  const elements = formEl.querySelectorAll('input, button:not([type="submit"])');
  elements.forEach(el => {
    el.disabled = isLoading;
  });
}


/*
========================================
INITIALIZATION
========================================
*/

document.addEventListener("DOMContentLoaded", initAuthApp);

function initAuthApp() {
    AuthFlip.init();
    AuthVisual.init();
    LoginForm.init();
    RegisterForm.init();
    Icons.init();
}


/*
========================================
AUTH FLIP MODULE
========================================
*/
const AuthFlip = {
  container: null,
  showSignupBtn: null,
  showSigninBtn: null,

  signinEmail: null,
  signupEmail: null,

  init() {
    AuthFlip.container = document.getElementById('auth-flip-container');
    if (!AuthFlip.container) return;

    AuthFlip.showSignupBtn = document.getElementById('show-signup');
    AuthFlip.showSigninBtn = document.getElementById('show-signin');

    if (AuthFlip.showSignupBtn) {
      AuthFlip.showSignupBtn.addEventListener('click', AuthFlip.handleShowSignup);
    }

    if (AuthFlip.showSigninBtn) {
      AuthFlip.showSigninBtn.addEventListener('click', AuthFlip.handleShowSignin);
    }
  },

  handleShowSignup() {
    AuthFlip.container.classList.add('right-active');

    if (AuthFlip.signupEmail) {
        setTimeout(() => {
            AuthFlip.signupEmail.focus();
        }, 700);
    }
  },

  handleShowSignin() {
    AuthFlip.container.classList.remove('right-active');

    if (AuthFlip.signinEmail) {
        setTimeout(() => {
            AuthFlip.signinEmail.focus();
        }, 700);
    }
  }
};


/*
========================================
AUTH VISUAL MODULE (GSAP BLOBS)
========================================
*/
const AuthVisual = {
  panel: null,
  movers: [],

  init() {
    AuthVisual.panel = document.getElementById('overlay-container');
    if (!AuthVisual.panel || typeof gsap === 'undefined') return;

    const blobs = [
      { el: document.getElementById('blob-1'), strength: 70 },
      { el: document.getElementById('blob-2'), strength: 110 },
      { el: document.getElementById('blob-3'), strength: 50 },
    ].filter((b) => b.el);

    if (!blobs.length) return;

    AuthVisual.movers = blobs.map((b) => ({
      x: gsap.quickTo(b.el, 'x', { duration: 0.5, ease: 'power2.out' }),
      y: gsap.quickTo(b.el, 'y', { duration: 0.5, ease: 'power2.out' }),
      strength: b.strength,
    }));

    AuthVisual.panel.addEventListener('mousemove', AuthVisual.handleMouseMove);
    AuthVisual.panel.addEventListener('mouseleave', AuthVisual.handleMouseLeave);
  },

  handleMouseMove(e) {
    const rect = AuthVisual.panel.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const relY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    AuthVisual.movers.forEach((m) => {
      m.x(relX * m.strength);
      m.y(relY * m.strength);
    });
  },

  handleMouseLeave() {
    AuthVisual.movers.forEach((m) => {
      m.x(0);
      m.y(0);
    });
  }
};


/*
========================================
LOGIN FORM MODULE
========================================
*/
const LoginForm = {
  form: null,
  emailInput: null,
  emailGroup: null,
  passwordInput: null,
  passwordGroup: null,
  submitBtn: null,

  init() {
    LoginForm.form = document.getElementById('login-form');
    if (!LoginForm.form) return;

    LoginForm.emailInput = document.getElementById('email');
    LoginForm.emailGroup = document.getElementById('email-group');
    LoginForm.passwordInput = document.getElementById('password');
    LoginForm.passwordGroup = document.getElementById('password-group');
    LoginForm.submitBtn = document.getElementById('login-submit');

    LoginForm.form.addEventListener('submit', LoginForm.handleSubmit);
    LoginForm.emailInput.addEventListener('input', () => setFieldError(LoginForm.emailGroup, false));
    LoginForm.passwordInput.addEventListener('input', () => setFieldError(LoginForm.passwordGroup, false));
  },

  handleSubmit(e) {
    e.preventDefault();

    const emailValid = EMAIL_RE.test(LoginForm.emailInput.value.trim());
    const passwordValid = LoginForm.passwordInput.value.length > 0;

    setFieldError(LoginForm.emailGroup, !emailValid, true);
    setFieldError(LoginForm.passwordGroup, !passwordValid, true);

    if (!emailValid || !passwordValid) return;

    setFormLoading(LoginForm.form, LoginForm.submitBtn, true);

    setTimeout(() => {
      setFormLoading(LoginForm.form, LoginForm.submitBtn, false);
      console.log('TODO: wire to POST /api/auth/login/', {
        email: LoginForm.emailInput.value.trim(),
      });
    }, 900);
  }
};


/*
========================================
REGISTER FORM MODULE
========================================
*/
const RegisterForm = {
  form: null,
  emailInput: null,
  emailGroup: null,
  passwordInput: null,
  passwordGroup: null,
  submitBtn: null,
  toggleBtn: null,

  feedbackContainer: null,

  // Strength Requirements Elements
  reqLength: null,
  reqUpper: null,
  reqLower: null,
  reqNumber: null,
  reqSymbol: null,
  strengthFill: null,
  strengthLabel: null,

  STRENGTH_LEVELS: [
    { label: '', color: 'var(--color-border)' },
    { label: 'Weak', color: 'var(--color-status-error)' },
    { label: 'Weak', color: 'var(--color-status-error)' },
    { label: 'Fair', color: '#D9A441' },
    { label: 'Good', color: 'var(--color-accent-primary)' },
    { label: 'Strong', color: 'var(--color-status-success)' },
  ],

  init() {
    RegisterForm.form = document.getElementById('register-form');
    if (!RegisterForm.form) return;

    RegisterForm.emailInput = document.getElementById('reg-email');
    RegisterForm.emailGroup = document.getElementById('reg-email-group');
    RegisterForm.passwordInput = document.getElementById('reg-password');
    RegisterForm.passwordGroup = document.getElementById('reg-password-group');
    RegisterForm.submitBtn = document.getElementById('register-submit');
    RegisterForm.toggleBtn = document.getElementById('toggle-reg-password');

    RegisterForm.feedbackContainer = document.getElementById('password-feedback-container');
    
    RegisterForm.reqLength = document.getElementById('req-length');
    RegisterForm.reqUpper = document.getElementById('req-upper');
    RegisterForm.reqLower = document.getElementById('req-lower');
    RegisterForm.reqNumber = document.getElementById('req-number');
    RegisterForm.reqSymbol = document.getElementById('req-symbol');
    
    RegisterForm.strengthFill = document.getElementById('strength-fill');
    RegisterForm.strengthLabel = document.getElementById('strength-label');

    if (RegisterForm.toggleBtn) {
      RegisterForm.toggleBtn.addEventListener('click', RegisterForm.handleTogglePassword);
    }

    RegisterForm.passwordInput.addEventListener('input', () => {
      RegisterForm.checkPasswordRequirements();
      setFieldError(RegisterForm.passwordGroup, false);
    });

    // Show requirements when they focus the field
    RegisterForm.passwordInput.addEventListener('focus', () => {
      if (RegisterForm.feedbackContainer) {
        RegisterForm.feedbackContainer.classList.add('is-visible');
      }
    });

    // Hide requirements when they leave, BUT only if the field is empty
    RegisterForm.passwordInput.addEventListener('blur', () => {
      if (RegisterForm.passwordInput.value.length === 0 && RegisterForm.feedbackContainer) {
        RegisterForm.feedbackContainer.classList.remove('is-visible');
      }
    });

    RegisterForm.emailInput.addEventListener('blur', RegisterForm.handleEmailBlur);
    RegisterForm.emailInput.addEventListener('input', () => setFieldError(RegisterForm.emailGroup, false));
    RegisterForm.form.addEventListener('submit', RegisterForm.handleSubmit);
  },

  checkPasswordRequirements() {
    const value = RegisterForm.passwordInput.value;
    const checks = {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      symbol: /[^A-Za-z0-9]/.test(value),
    };

    RegisterForm.reqLength.classList.toggle('is-met', checks.length);
    RegisterForm.reqUpper.classList.toggle('is-met', checks.upper);
    RegisterForm.reqLower.classList.toggle('is-met', checks.lower);
    RegisterForm.reqNumber.classList.toggle('is-met', checks.number);
    RegisterForm.reqSymbol.classList.toggle('is-met', checks.symbol);

    const score = Object.values(checks).filter(Boolean).length;
    const level = RegisterForm.STRENGTH_LEVELS[value.length === 0 ? 0 : score];
    
    RegisterForm.strengthFill.style.width = `${(score / 5) * 100}%`;
    RegisterForm.strengthFill.style.backgroundColor = level.color;
    RegisterForm.strengthLabel.textContent = level.label;

    return Object.values(checks).every(Boolean);
  },

  handleTogglePassword() {
    const isPassword = RegisterForm.passwordInput.type === 'password';
    RegisterForm.passwordInput.type = isPassword ? 'text' : 'password';
    RegisterForm.toggleBtn.classList.toggle('is-active', isPassword);
    RegisterForm.toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  },

  handleEmailBlur() {
    const value = RegisterForm.emailInput.value.trim();
    if (value.length > 0) {
      setFieldError(RegisterForm.emailGroup, !EMAIL_RE.test(value));
    }
  },

  handleSubmit(e) {
    e.preventDefault();

    const emailValid = EMAIL_RE.test(RegisterForm.emailInput.value.trim());
    const passwordValid = RegisterForm.checkPasswordRequirements();

    setFieldError(RegisterForm.emailGroup, !emailValid, true);

    if (!emailValid || !passwordValid) return;

    setFormLoading(RegisterForm.form, RegisterForm.submitBtn, false);

    setTimeout(() => {
      setFormLoading(RegisterForm.form, RegisterForm.submitBtn, false);
      console.log('TODO: wire to POST /api/auth/register/', {
        email: RegisterForm.emailInput.value.trim(),
      });
    }, 900);
  }
};


/*
========================================
ICON RENDERING
========================================
*/
const Icons = {
  init() {
    // Render any Lucide icon placeholders (password reveal icons)
    if (window.lucide) {
      lucide.createIcons();
    }
  }
};