import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { useAuth } from '../../AuthContext.jsx'
import AthenaBotLogo from '../../assets/AthenaBot.png'
import WizardStep1Details from './WizardStep1Details.jsx'
import WizardStep2Chatbot from './WizardStep2Chatbot.jsx'
import WizardStep3Review from './WizardStep3Review.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const DEFAULT_WIZARD_THEME = {
  primary_color: '#C8860A',
  secondary_color: '#F5C842',
  background_color: '#FFFDF5',
  text_color: '#111111',
  bot_bubble_color: '#FFFFFF',
  user_bubble_color: '#FCEFD4',
  user_text_color: '#111111',
}

const STEPS = [
  { id: 1, title: 'Project Details', subtitle: 'Provide basic information' },
  { id: 2, title: 'Configure Chatbot', subtitle: 'Set up your chatbot' },
  { id: 3, title: 'Review & Create', subtitle: 'Confirm and launch' },
]

/**
 * First-run project creation wizard. Owns all step state locally;
 * nothing hits the backend until the final "Create" click on step 3
 * (sequential POST /api/projects/ then PATCH .../config/ if the
 * theme step wasn't skipped).
 *
 * Props:
 *   onClose: () => void          -- called on cancel/X, no project created
 *   onCreated: (project) => void -- called after successful creation, receives the new project
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

  // Step 2 state
  const [theme, setTheme] = useState({ ...DEFAULT_WIZARD_THEME })
  const [botDisplayName, setBotDisplayName] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('Welcome! How may I assist you?')
  const [bubblePosition, setBubblePosition] = useState('bottom-right')
  const [configSkipped, setConfigSkipped] = useState(false)

  // Creation state
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${accessToken}`, ...extra }
  }

  function goToStep2() {
    const nameValid = name.trim().length > 0
    const domainValid = domain.trim().length > 0
    setNameError(!nameValid)
    setDomainError(!domainValid)
    if (!nameValid || !domainValid) return
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
    onCreated(project)
  }

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-card" onClick={(e) => e.stopPropagation()}>
        <button className="wizard-close-btn" onClick={onClose} aria-label="Close">
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
          </div>
        </div>
      </div>
    </div>
  )
}