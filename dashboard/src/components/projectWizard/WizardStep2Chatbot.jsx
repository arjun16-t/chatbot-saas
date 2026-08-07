import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import MiniChatbotPreview from './MiniChatbotPreview.jsx'

function MiniColorField({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="wizard-color-field" ref={wrapperRef}>
      <label className="wizard-field-label">{label}</label>
      <div className="wizard-color-control">
        <button
          type="button"
          className="wizard-color-swatch"
          style={{ background: value }}
          onClick={() => setIsOpen((o) => !o)}
          aria-label={`Pick ${label}`}
        />
        <span className="wizard-color-hex">{value}</span>
      </div>
      {isOpen && (
        <div className="wizard-color-popover">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

/**
 * Step 2: trimmed theme configuration -- bot name, greeting, two key
 * colors, and bubble position. Full 7-color palette + logo upload are
 * intentionally deferred to the real Configure page after the wizard;
 * this step exists to give a first-run project a non-default look
 * without overwhelming a brand-new user.
 */
export default function WizardStep2Chatbot({
  theme, setTheme,
  botDisplayName, setBotDisplayName,
  greetingMessage, setGreetingMessage,
  bubblePosition, setBubblePosition,
  fallbackName,
}) {
  function updateThemeKey(key, value) {
    setTheme((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="wizard-step-panel wizard-step-panel-split">
      <div className="wizard-step-panel-form">
        <h2>Configure Chatbot</h2>
        <p className="wizard-step-intro">Give your chatbot a name and a look. You can refine everything later.</p>

        <div className="wizard-field">
          <label className="wizard-field-label">Bot Display Name</label>
          <input
            type="text"
            placeholder={fallbackName || 'e.g. Support Bot'}
            value={botDisplayName}
            onChange={(e) => setBotDisplayName(e.target.value)}
          />
        </div>

        <div className="wizard-field">
          <label className="wizard-field-label">Default Greeting</label>
          <textarea
            rows={2}
            maxLength={200}
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value)}
          />
        </div>

        <div className="wizard-color-row">
          <MiniColorField label="Primary Color" value={theme.primary_color} onChange={(v) => updateThemeKey('primary_color', v)} />
          <MiniColorField label="Secondary Color" value={theme.secondary_color} onChange={(v) => updateThemeKey('secondary_color', v)} />
        </div>

        <div className="wizard-field">
          <label className="wizard-field-label">Bubble Position</label>
          <select value={bubblePosition} onChange={(e) => setBubblePosition(e.target.value)}>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </div>
      </div>

      <div className="wizard-step-panel-preview">
        <MiniChatbotPreview
          theme={theme}
          botDisplayName={botDisplayName || fallbackName}
          greetingMessage={greetingMessage}
        />
      </div>
    </div>
  )
}