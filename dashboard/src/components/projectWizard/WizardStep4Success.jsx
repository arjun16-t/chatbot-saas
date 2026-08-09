import { useState } from 'react'
import { PartyPopper, Copy, Check } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const WIDGET_SCRIPT_URL = `${API_BASE}/static/widget.js`

/**
 * Step 4 (pseudo-step, not counted in the side-nav indicator):
 * shown once, right after successful creation. Displays the raw
 * API key and a ready-to-copy embed snippet -- the only moment
 * this key will ever be visible again outside Settings > Rotate.
 */
export default function WizardStep4Success({ project }) {
  const [keyCopied, setKeyCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)

  const snippet = `<script src="${WIDGET_SCRIPT_URL}" data-api-key="${project.api_key}"></script>`

  async function handleCopyKey() {
    try {
      await navigator.clipboard.writeText(project.api_key)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  async function handleCopySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="wizard-step-panel wizard-step-panel-success">
      <div className="wizard-success-icon">
        <PartyPopper size={28} />
      </div>
      <h2>{project.name} is live</h2>
      <p className="wizard-step-intro">
        Copy your API key or the embed snippet below — for security, the key won't be shown again.
      </p>

      <div className="wizard-field">
        <label className="wizard-field-label">API Key</label>
        <button type="button" className="wizard-copy-box" onClick={handleCopyKey}>
          <span className="mono">{project.api_key}</span>
          {keyCopied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <div className="wizard-field">
        <label className="wizard-field-label">Embed Snippet</label>
        <button type="button" className="wizard-copy-box wizard-copy-box-code" onClick={handleCopySnippet}>
          <code>{snippet}</code>
          {snippetCopied ? <Check size={15} /> : <Copy size={15} />}
        </button>
        <p className="wizard-field-hint">Paste this before the closing &lt;/body&gt; tag on your site.</p>
      </div>
    </div>
  )
}