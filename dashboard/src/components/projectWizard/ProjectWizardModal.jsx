import { useState, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { useAuth } from '../../AuthContext.jsx'
import AthenaBotLogo from '../../assets/AthenaBot.png'
import WizardStep1Details from './WizardStep1Details.jsx'
import WizardStep2Chatbot from './WizardStep2Chatbot.jsx'
import WizardStep3Review from './WizardStep3Review.jsx'
import WizardStep4Success from './WizardStep4Success.jsx'
import "../../styles/wizard.css"

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Mirrors the backend's validate_domain rule exactly (ProjectSerializer /
// ProjectDetailSerializer): localhost/127.0.0.1 (with or without a port)
// always pass; everything else needs a real dot-containing host.
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

function validateDomainFormat(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return 'Domain is required.'

  let value = trimmed
  if (!value.includes('://')) value = 'https://' + value

  let host
  try {
    host = new URL(value).hostname.toLowerCase()
  } catch {
    return "Enter a valid domain (e.g. example.com) or 'localhost'."
  }

  if (LOCAL_HOSTS.includes(host)) return null
  if (!host.includes('.')) {
    return "Enter a valid domain (e.g. example.com) or 'localhost'."
  }
  return null
}

export const DEFAULT_WIZARD_THEME = {
  primary_color: '#C8860A',
  secondary_color: '#F5C842',
  background_color: '#FFFDF5',
  text_color: '#111111',
  bot_bubble_color: '#FFFFFF',
  user_bubble_color: '#FCEFD4',
  user_text_color: '#111111',
}

// Only 3 real steps in the side-nav indicator -- step 4 is a
// pseudo-step (success screen), not counted here. Once step === 4,
// every circle in this list renders as "done".
const STEPS = [
  { id: 1, title: 'Project Details', subtitle: 'Provide basic information' },
  { id: 2, title: 'Configure Chatbot', subtitle: 'Set up your chatbot' },
  { id: 3, title: 'Review & Create', subtitle: 'Confirm and launch' },
]

/**
 * First-run project creation wizard. Owns all step state locally;
 * nothing hits the backend until the final "Create" click on step 3
 * (sequential POST /api/projects/ then PATCH .../config/ if the
 * theme step wasn't skipped). On success, shows step 4 -- a one-time
 * reveal of the API key/embed snippet -- before calling onCreated.
 *
 * Props:
 *   onClose: () => void          -- called on cancel/X (steps 1-3), no project created
 *   onCreated: (project) => void -- called once the user leaves step 4, receives the new project
 */
export default function ProjectWizardModal({ onClose, onCreated }) {
  const { accessToken } = useAuth()

  const [step, setStep] = useState(1)

  // Step 1 state
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [useCase, setUseCase] = useState('')
  const [otherUseCase, setOtherUseCase] = useState('')
  const [nameError, setNameError] = useState(false)
  const [domainError, setDomainError] = useState(false)

  // Debounced domain-availability check (inline hint only, not
  // authoritative -- Create still relies on the real DB constraint).
  // 'idle' | 'checking' | 'available' | 'taken' | 'error'
  const [domainAvailability, setDomainAvailability] = useState('idle')
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)

    const formatMessage = validateDomainFormat(domain)
    if (formatMessage) {
      setDomainAvailability('idle')
      return
    }

    debounceRef.current = setTimeout(async () => {
      setDomainAvailability('checking')
      try {
        const res = await fetch(
          `${API_BASE}/api/projects/check-domain/?domain=${encodeURIComponent(domain.trim())}`,
          { headers: authHeaders() }
        )
        const data = await res.json()
        if (!res.ok) {
          setDomainAvailability('error')
          return
        }
        setDomainAvailability(data.data.available ? 'available' : 'taken')
      } catch (err) {
        setDomainAvailability('error')
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain])

  // Step 2 state
  const [theme, setTheme] = useState({ ...DEFAULT_WIZARD_THEME })
  const [botDisplayName, setBotDisplayName] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('Welcome! How may I assist you?')
  const [bubblePosition, setBubblePosition] = useState('bottom-right')
  const [configSkipped, setConfigSkipped] = useState(false)

  // Creation state
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdProject, setCreatedProject] = useState(null)

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  function goToStep2() {
    const nameValid = name.trim().length > 0
    setNameError(!nameValid)

    const domainMessage = validateDomainFormat(domain)
    setDomainError(domainMessage)

    if (!nameValid || domainMessage) return
    setStep(2)
  }

  function handleSkipConfig() {
    setConfigSkipped(true)
    setStep(3)
  }

  function handleContinueFromConfig() {
    setConfigSkipped(false)
    setStep(3)
  }

  async function handleCreate() {
    setIsCreating(true)
    setCreateError('')

    let project
    try {
      const res = await fetch(`${API_BASE}/api/projects/`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.message || 'Could not create project.')
        setIsCreating(false)
        return
      }
      project = data.data
    } catch (err) {
      setCreateError('Could not reach the server. Try again.')
      setIsCreating(false)
      return
    }

    if (!configSkipped) {
      try {
        await fetch(`${API_BASE}/api/projects/${project.id}/config/`, {
          method: 'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            theme_color: theme,
            bot_display_name: botDisplayName.trim() || name.trim(),
            greeting_message: greetingMessage,
            bubble_position: bubblePosition,
          }),
        })
        // Non-fatal on failure -- project already exists and is usable
        // with default theme; styling can be finished later from Configure.
      } catch (err) {
        // swallow -- see comment above
      }
    }

    setIsCreating(false)
    setCreatedProject(project)
    setStep(4)
  }

  function handleFinish() {
    onCreated(createdProject)
  }

  function handleCloseClick() {
    // Once the project actually exists (step 4), closing must not
    // discard it silently -- treat X the same as "Go to Project".
    if (step === 4) {
      handleFinish()
    } else {
      onClose()
    }
  }

  return (
    <div className="wizard-overlay" onClick={step === 4 ? undefined : onClose}>
      <div className="wizard-card" onClick={(e) => e.stopPropagation()}>
        <button className="wizard-close-btn" onClick={handleCloseClick} aria-label="Close">
          <X size={18} />
        </button>

        <div className="wizard-side-nav">
          <div className="wizard-steps-list">
            {STEPS.map((s, i) => (
              <div key={s.id} className="wizard-step-item">
                <div className="wizard-step-indicator-col">
                  <div className={`wizard-step-circle ${step === s.id ? 'is-active' : ''} ${step > s.id ? 'is-done' : ''}`}>
                    {step > s.id ? <Check size={14} /> : s.id}
                  </div>
                  {i < STEPS.length - 1 && <div className={`wizard-step-line ${step > s.id ? 'is-done' : ''}`} />}
                </div>
                <div className="wizard-step-text">
                  <div className={`wizard-step-title ${step === s.id ? 'is-active' : ''}`}>{s.title}</div>
                  <div className="wizard-step-subtitle">{s.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="wizard-side-illustration">
            <img src={AthenaBotLogo} alt="" />
          </div>
        </div>

        <div className="wizard-main">
          <div className="wizard-main-content">
            {step === 1 && (
              <WizardStep1Details
                name={name} setName={setName} nameError={nameError}
                domain={domain} setDomain={setDomain} domainError={domainError}
                domainAvailability={domainAvailability}
                useCase={useCase} setUseCase={setUseCase}
                otherUseCase={otherUseCase} setOtherUseCase={setOtherUseCase}
              />
            )}
            {step === 2 && (
              <WizardStep2Chatbot
                theme={theme} setTheme={setTheme}
                botDisplayName={botDisplayName} setBotDisplayName={setBotDisplayName}
                greetingMessage={greetingMessage} setGreetingMessage={setGreetingMessage}
                bubblePosition={bubblePosition} setBubblePosition={setBubblePosition}
                fallbackName={name}
              />
            )}
            {step === 3 && (
              <WizardStep3Review
                name={name} domain={domain} useCase={useCase} otherUseCase={otherUseCase}
                theme={theme} botDisplayName={botDisplayName || name}
                greetingMessage={greetingMessage} bubblePosition={bubblePosition}
                configSkipped={configSkipped}
                createError={createError}
              />
            )}
            {step === 4 && createdProject && (
              <WizardStep4Success project={createdProject} />
            )}
          </div>

          <div className="wizard-footer">
            {step === 1 && (
              <>
                <button type="button" className="wizard-btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="wizard-btn-primary" onClick={goToStep2}>Next →</button>
              </>
            )}
            {step === 2 && (
              <>
                <button type="button" className="wizard-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="wizard-btn-secondary" onClick={handleSkipConfig}>Skip for now</button>
                <button type="button" className="wizard-btn-primary" onClick={handleContinueFromConfig}>Next →</button>
              </>
            )}
            {step === 3 && (
              <>
                <button type="button" className="wizard-btn-secondary" onClick={() => setStep(2)} disabled={isCreating}>Back</button>
                <button type="button" className="wizard-btn-primary" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </>
            )}
            {step === 4 && (
              <button type="button" className="wizard-btn-primary" onClick={handleFinish} style={{ marginLeft: 'auto' }}>
                Go to Project →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}