import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Lock, Check } from 'lucide-react'
import gsap from 'gsap'
import AthenaBotLogo from './assets/AthenaBot.png'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30

const STRENGTH_LEVELS = [
  { label: '', color: 'var(--color-border)' },
  { label: 'Weak', color: 'var(--color-status-error)' },
  { label: 'Weak', color: 'var(--color-status-error)' },
  { label: 'Fair', color: '#D9A441' },
  { label: 'Good', color: 'var(--color-accent-primary)' },
  { label: 'Strong', color: 'var(--color-status-success)' },
]

function maskEmail(email) {
  const [user, domain] = email.split('@')
  if (!user || !domain) return email
  const visible = user.slice(0, Math.min(2, user.length))
  return `${visible}${'*'.repeat(Math.max(user.length - visible.length, 1))}@${domain}`
}

function AuthPage({ initialView = 'signin' }) {
  const [activeView, setActiveView] = useState(initialView) // 'signin' | 'signup' | 'verify-otp'

  // ---- Sign-in form state ----
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [emailShake, setEmailShake] = useState(false)
  const [passwordShake, setPasswordShake] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [loginApiError, setLoginApiError] = useState('')

  // ---- Register form state ----
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regFirstNameError, setRegFirstNameError] = useState(false)
  const [regLastNameError, setRegLastNameError] = useState(false)
  const [regFirstNameShake, setRegFirstNameShake] = useState(false)
  const [regLastNameShake, setRegLastNameShake] = useState(false)
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regEmailError, setRegEmailError] = useState(false)
  const [regEmailShake, setRegEmailShake] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regPasswordFocused, setRegPasswordFocused] = useState(false)
  const [isRegisterLoading, setIsRegisterLoading] = useState(false)
  const [registerApiError, setRegisterApiError] = useState('')

  // ---- OTP verification state ----
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [otpStatus, setOtpStatus] = useState('idle') // 'idle' | 'verifying' | 'verified' | 'error'
  const [otpError, setOtpError] = useState('')
  const [otpRowShake, setOtpRowShake] = useState(false)
  const [spinningIndex, setSpinningIndex] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [isResending, setIsResending] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState('')

  // ---- Refs (focus management + GSAP, kept out of React state) ----
  const emailInputRef = useRef(null)
  const regEmailInputRef = useRef(null)
  const otpInputRefs = useRef([])
  const overlayPanelRef = useRef(null)
  const blob1Ref = useRef(null)
  const blob2Ref = useRef(null)
  const blob3Ref = useRef(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const containerClass = (activeView === 'signup' || activeView === 'verify-otp')
    ? 'auth-flip-container right-active'
    : 'auth-flip-container'

  // ---- Focus management per view ----
  useEffect(() => {
    let timer
    if (activeView === 'signup') {
      timer = setTimeout(() => regEmailInputRef.current?.focus(), 700)
    } else if (activeView === 'signin') {
      timer = setTimeout(() => emailInputRef.current?.focus(), 700)
    } else if (activeView === 'verify-otp') {
      timer = setTimeout(() => otpInputRefs.current[0]?.focus(), 300)
    }
    return () => clearTimeout(timer)
  }, [activeView])

  // ---- Resend cooldown countdown ----
  useEffect(() => {
    if (activeView !== 'verify-otp') return
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [activeView])

  // ---- Blob parallax via GSAP, driven by refs — never React state ----
  useEffect(() => {
    const panel = overlayPanelRef.current
    const blobs = [
      { el: blob1Ref.current, strength: 70 },
      { el: blob2Ref.current, strength: 110 },
      { el: blob3Ref.current, strength: 50 },
    ].filter((b) => b.el)

    if (!panel || !blobs.length) return

    const movers = blobs.map((b) => ({
      x: gsap.quickTo(b.el, 'x', { duration: 0.5, ease: 'power2.out' }),
      y: gsap.quickTo(b.el, 'y', { duration: 0.5, ease: 'power2.out' }),
      strength: b.strength,
    }))

    function handleMouseMove(e) {
      const rect = panel.getBoundingClientRect()
      const relX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const relY = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      movers.forEach((m) => {
        m.x(relX * m.strength)
        m.y(relY * m.strength)
      })
    }

    function handleMouseLeave() {
      movers.forEach((m) => {
        m.x(0)
        m.y(0)
      })
    }

    panel.addEventListener('mousemove', handleMouseMove)
    panel.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      panel.removeEventListener('mousemove', handleMouseMove)
      panel.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // ---- Derived password requirement checks (register only) — no state ----
  const checks = {
    length: regPassword.length >= 8,
    upper: /[A-Z]/.test(regPassword),
    lower: /[a-z]/.test(regPassword),
    number: /[0-9]/.test(regPassword),
    symbol: /[^A-Za-z0-9]/.test(regPassword),
  }
  const score = Object.values(checks).filter(Boolean).length
  const strengthLevel = STRENGTH_LEVELS[regPassword.length === 0 ? 0 : score]
  const allRequirementsMet = Object.values(checks).every(Boolean)
  const feedbackVisible = regPasswordFocused || regPassword.length > 0

  function triggerShake(setShakeFn) {
    setShakeFn(true)
    setTimeout(() => setShakeFn(false), 400)
  }

  function triggerOtpShake() {
    setOtpRowShake(true)
    setTimeout(() => setOtpRowShake(false), 400)
  }

  // ---- Sign-in submit ----
  async function handleLoginSubmit(e) {
    e.preventDefault()
    const emailValid = EMAIL_RE.test(email.trim())
    const passwordValid = password.length > 0

    setEmailError(!emailValid)
    setPasswordError(!passwordValid)
    if (!emailValid) triggerShake(setEmailShake)
    if (!passwordValid) triggerShake(setPasswordShake)
    if (!emailValid || !passwordValid) return

    setIsLoginLoading(true)
    setLoginApiError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginApiError(data.message || 'Login failed. Check your credentials.')
        return
      }
      login(data.data.access, {
        client_id: data.data.client_id,
        email: data.data.email,
        display_name: data.data.display_name,
      })
      navigate('/dashboard')
    } catch (err) {
      setLoginApiError('Could not reach the server. Try again.')
    } finally {
      setIsLoginLoading(false)
    }
  }

  // ---- Step 1: validate + send OTP ----
  async function handleRegisterSubmit(e) {
    e.preventDefault()
    const emailValid = EMAIL_RE.test(regEmail.trim())
    const firstNameValid = regFirstName.trim().length > 0
    const lastNameValid = regLastName.trim().length > 0

    setRegEmailError(!emailValid)
    setRegFirstNameError(!firstNameValid)
    setRegLastNameError(!lastNameValid)
    if (!emailValid) triggerShake(setRegEmailShake)
    if (!firstNameValid) triggerShake(setRegFirstNameShake)
    if (!lastNameValid) triggerShake(setRegLastNameShake)
    if (!emailValid || !firstNameValid || !lastNameValid || !allRequirementsMet) return

    setIsRegisterLoading(true)
    setRegisterApiError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRegisterApiError(data.message || 'Could not send verification code.')
        return
      }
      sessionStorage.setItem('pending_registration_email', regEmail.trim())
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setOtpStatus('idle')
      setOtpError('')
      setFinalizeError('')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setActiveView('verify-otp')
    } catch (err) {
      setRegisterApiError('Could not reach the server. Try again.')
    } finally {
      setIsRegisterLoading(false)
    }
  }

  // ---- OTP box handlers ----
  function handleOtpChange(index, rawValue) {
    if (otpStatus === 'verifying' || otpStatus === 'verified') return
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    if (rawValue !== '' && !digit) return

    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)

    if (digit) {
      setSpinningIndex(index)
      setTimeout(() => setSpinningIndex((i) => (i === index ? null : i)), 350)
      if (index < OTP_LENGTH - 1) {
        otpInputRefs.current[index + 1]?.focus()
      }
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!paste) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < paste.length; i++) next[i] = paste[i]
    setOtpDigits(next)
    const lastIndex = Math.min(paste.length, OTP_LENGTH) - 1
    otpInputRefs.current[lastIndex]?.focus()
  }

  // ---- Auto-verify once all 6 boxes are filled ----
  useEffect(() => {
    if (activeView === 'verify-otp' && otpDigits.every((d) => d !== '') && otpStatus === 'idle') {
      handleVerifyOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpDigits])

  async function handleVerifyOtp() {
    setOtpStatus('verifying')
    setOtpError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim(), otp: otpDigits.join('') }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid code. Please try again.')
      }
      setOtpStatus('verified')
      setTimeout(() => finalizeRegistration(), 1200)
    } catch (err) {
      setOtpStatus('error')
      setOtpError(err.message)
      triggerOtpShake()
      setTimeout(() => {
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        setOtpStatus('idle')
        otpInputRefs.current[0]?.focus()
      }, 600)
    }
  }

  // ---- Step 3: OTP verified, actually create the account ----
  async function finalizeRegistration() {
    setIsFinalizing(true)
    setFinalizeError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: regEmail.trim(),
          password: regPassword,
          display_name: `${regFirstName.trim()}_${regLastName.trim()}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.')
      }
      sessionStorage.removeItem('pending_registration_email')
      login(data.data.access, {
        client_id: data.data.client_id,
        email: data.data.email,
        display_name: data.data.display_name,
      })
      navigate('/dashboard', { state: { justRegistered: true } })
    } catch (err) {
      setFinalizeError(err.message)
    } finally {
      setIsFinalizing(false)
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setOtpError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Could not resend code.')
      }
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setOtpStatus('idle')
      otpInputRefs.current[0]?.focus()
    } catch (err) {
      setOtpError(err.message)
      triggerOtpShake()
    } finally {
      setIsResending(false)
    }
  }

  function handleChangeEmail() {
    setActiveView('signup')
    setOtpStatus('idle')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setOtpError('')
  }

  const otpBoxesDisabled = otpStatus === 'verifying' || otpStatus === 'verified'

  return (
    <div className={containerClass} id="auth-flip-container">

      {/* ---------------- SIGN IN ---------------- */}
      <div className="form-panel form-panel-signin">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={AthenaBotLogo} alt="AthenaChat logo" />
          </div>
          <h1>Welcome back</h1>
          <p className="auth-subtitle">Log in to manage your chatbot.</p>

          <form onSubmit={handleLoginSubmit} noValidate>
            <div className={`form-group ${emailError ? 'has-error' : ''} ${emailShake ? 'animate-shake' : ''}`}>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                ref={emailInputRef}
                type="email"
                id="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                disabled={isLoginLoading}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
              />
              <p className="form-error">Enter a valid email address.</p>
            </div>

            <div className={`form-group ${passwordError ? 'has-error' : ''} ${passwordShake ? 'animate-shake' : ''}`}>
              <div className="form-label-row">
                <label className="form-label" htmlFor="password">Password</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                disabled={isLoginLoading}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(false) }}
              />
              <p className="form-error">Enter your password.</p>
            </div>

            {loginApiError && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{loginApiError}</p>}

            <button type="submit" className={`btn btn-primary btn-block ${isLoginLoading ? 'is-loading' : ''}`} disabled={isLoginLoading}>
              <span className="btn-label">Log in</span>
              <span className="btn-spinner"></span>
            </button>
          </form>
        </div>
      </div>

      {/* ---------------- SIGN UP / OTP VERIFY ---------------- */}
      <div className="form-panel form-panel-signup">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={AthenaBotLogo} alt="AthenaChat logo" />
          </div>

          {activeView === 'verify-otp' ? (
            <>
              <h1>Verify your email</h1>
              <p className="otp-sent-to">
                We sent a 6-digit code to <strong>{maskEmail(regEmail.trim())}</strong>
              </p>

              {otpStatus === 'verified' ? (
                <div className="otp-verified-panel">
                  <div className="otp-verified-icon-wrap">
                    <Lock size={28} />
                    <span className="otp-check-badge"><Check size={16} /></span>
                  </div>
                  <p className="otp-verified-label">Verified</p>
                  {isFinalizing && <p className="auth-subtitle">Setting up your account...</p>}
                  {finalizeError && (
                    <>
                      <p className="form-error">{finalizeError}</p>
                      <button type="button" className="btn btn-primary btn-block" onClick={finalizeRegistration}>
                        Retry
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={`otp-boxes-row ${otpRowShake ? 'otp-row-shake' : ''}`}
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`otp-box ${spinningIndex === index ? 'otp-box-spin' : ''} ${otpStatus === 'error' ? 'otp-box-error' : ''}`}
                        value={digit}
                        disabled={otpBoxesDisabled}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      />
                    ))}
                  </div>

                  {otpError && <p className="form-error" style={{ textAlign: 'center' }}>{otpError}</p>}
                  {otpStatus === 'verifying' && <p className="auth-subtitle" style={{ textAlign: 'center' }}>Verifying...</p>}

                  <div className="otp-resend-row">
                    <span>Didn't get a code?</span>
                    <button
                      type="button"
                      className="otp-resend-btn"
                      disabled={resendCooldown > 0 || isResending}
                      onClick={handleResendOtp}
                    >
                      {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>

                  <button type="button" className="otp-change-email" onClick={handleChangeEmail}>
                    Wrong email? Change it
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <h1>Create your account</h1>
              <p className="auth-subtitle">Start deploying your chatbot for free.</p>

              <form onSubmit={handleRegisterSubmit} noValidate>
                <div className="form-row-split">
                  <div className={`form-group ${regFirstNameError ? 'has-error' : ''} ${regFirstNameShake ? 'animate-shake' : ''}`}>
                    <label className="form-label" htmlFor="reg-first-name">First name</label>
                    <input
                      type="text"
                      id="reg-first-name"
                      placeholder="Goddess of"
                      autoComplete="given-name"
                      value={regFirstName}
                      disabled={isRegisterLoading}
                      onChange={(e) => { setRegFirstName(e.target.value); setRegFirstNameError(false) }}
                    />
                    <p className="form-error">Required.</p>
                  </div>
                  <div className={`form-group ${regLastNameError ? 'has-error' : ''} ${regLastNameShake ? 'animate-shake' : ''}`}>
                    <label className="form-label" htmlFor="reg-last-name">Last name</label>
                    <input
                      type="text"
                      id="reg-last-name"
                      placeholder="Wisdom"
                      autoComplete="family-name"
                      value={regLastName}
                      disabled={isRegisterLoading}
                      onChange={(e) => { setRegLastName(e.target.value); setRegLastNameError(false) }}
                    />
                    <p className="form-error">Required.</p>
                  </div>
                </div>

                <div className={`form-group ${regEmailError ? 'has-error' : ''} ${regEmailShake ? 'animate-shake' : ''}`}>
                  <label className="form-label" htmlFor="reg-email">Email</label>
                  <input
                    ref={regEmailInputRef}
                    type="email"
                    id="reg-email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    value={regEmail}
                    disabled={isRegisterLoading}
                    onChange={(e) => { setRegEmail(e.target.value); setRegEmailError(false) }}
                    onBlur={() => {
                      const v = regEmail.trim()
                      if (v.length > 0) setRegEmailError(!EMAIL_RE.test(v))
                    }}
                  />
                  <p className="form-error">Enter a valid email address.</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-password">Password</label>
                  <div className="input-with-action">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      id="reg-password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={regPassword}
                      disabled={isRegisterLoading}
                      onChange={(e) => setRegPassword(e.target.value)}
                      onFocus={() => setRegPasswordFocused(true)}
                      onBlur={() => { if (regPassword.length === 0) setRegPasswordFocused(false) }}
                    />
                    <button
                      type="button"
                      className={`input-action-btn ${showRegPassword ? 'is-active' : ''}`}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowRegPassword((v) => !v)}
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className={`password-feedback-container ${feedbackVisible ? 'is-visible' : ''}`}>
                    <div className="password-strength">
                      <div className="strength-track">
                        <div className="strength-fill" style={{ width: `${(score / 5) * 100}%`, backgroundColor: strengthLevel.color }}></div>
                      </div>
                      <span className="strength-label">{strengthLevel.label}</span>
                    </div>
                    <ul className="password-requirements">
                      <li className={`requirement ${checks.length ? 'is-met' : ''}`}>At least 8 characters</li>
                      <li className={`requirement ${checks.upper ? 'is-met' : ''}`}>One uppercase letter</li>
                      <li className={`requirement ${checks.lower ? 'is-met' : ''}`}>One lowercase letter</li>
                      <li className={`requirement ${checks.number ? 'is-met' : ''}`}>One number</li>
                      <li className={`requirement ${checks.symbol ? 'is-met' : ''}`}>One symbol (!@#$...)</li>
                    </ul>
                  </div>
                </div>

                {registerApiError && <p className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{registerApiError}</p>}

                <button type="submit" className={`btn btn-primary btn-block ${isRegisterLoading ? 'is-loading' : ''}`} disabled={isRegisterLoading}>
                  <span className="btn-label">Create account</span>
                  <span className="btn-spinner"></span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ---------------- Sliding gradient overlay ---------------- */}
      <div className="overlay-container" id="overlay-container" ref={overlayPanelRef}>
        <div className="blob-wrap blob-wrap-1"><div className="blob blob-1" ref={blob1Ref}></div></div>
        <div className="blob-wrap blob-wrap-2"><div className="blob blob-2" ref={blob2Ref}></div></div>
        <div className="blob-wrap blob-wrap-3"><div className="blob blob-3" ref={blob3Ref}></div></div>

        <div className="overlay">
          <div className="overlay-panel overlay-panel-left">
            <div className="logo-mark">
              <img src={AthenaBotLogo} alt="" />
              <span>AthenaChat</span>
            </div>
            <h2>Already deploying with us?</h2>
            <p>Log in to manage your documents and chatbot settings.</p>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveView('signin')}>Sign In</button>
          </div>

          <div className="overlay-panel overlay-panel-right">
            <div className="logo-mark">
              <img src={AthenaBotLogo} alt="" />
              <span>AthenaChat</span>
            </div>
            <h2>New to AthenaChat?</h2>
            <p>Deploy an AI chatbot trained on your own documents — live in minutes.</p>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveView('signup')}>Sign Up</button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default AuthPage