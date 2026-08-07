import { Lock, Globe, LayoutGrid, Pencil } from 'lucide-react'

const USE_CASE_OPTIONS = [
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'internal_knowledge_base', label: 'Internal Knowledge Base / HR Docs' },
  { value: 'sales_lead_qualification', label: 'Sales & Lead Qualification' },
  { value: 'ecommerce_assistant', label: 'E-commerce Product Assistant' },
  { value: 'developer_docs', label: 'Documentation / Developer Support' },
  { value: 'student_academic', label: 'Student / Academic Project' },
  { value: 'personal_project', label: 'Personal Project' },
  { value: 'other', label: 'Other' },
]

/**
 * Step 1: project name, domain, and an optional, frontend-only
 * use case selector (never sent to the backend).
 */
export default function WizardStep1Details({
  name, setName, nameError,
  domain, setDomain, domainError,
  useCase, setUseCase,
  otherUseCase, setOtherUseCase,
}) {
  return (
    <div className="wizard-step-panel">
      <h2>Create a New Project</h2>
      <p className="wizard-step-intro">Let's get started by setting up your project.</p>

      <div className={`wizard-field ${nameError ? 'has-error' : ''}`}>
        <label className="wizard-field-label">Project Name</label>
        <p className="wizard-field-hint">Choose a name for your project.</p>
        <div className="wizard-input-icon-row">
          <Lock size={16} className="wizard-input-icon" />
          <input
            type="text"
            placeholder="e.g. My Knowledge Base"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {nameError && <p className="wizard-field-error">Project name is required.</p>}
      </div>

      <div className={`wizard-field ${domainError ? 'has-error' : ''}`}>
        <label className="wizard-field-label">Domain</label>
        <p className="wizard-field-hint">Enter the domain where the chatbot will be embedded.</p>
        <div className="wizard-input-icon-row">
          <Globe size={16} className="wizard-input-icon" />
          <input
            type="text"
            placeholder="e.g. www.yourwebsite.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        {domainError && <p className="wizard-field-error">Domain is required.</p>}
      </div>

      <div className="wizard-field">
        <label className="wizard-field-label">Use Case <span className="wizard-optional-tag">Optional</span></label>
        <p className="wizard-field-hint">Select the primary use case for your chatbot.</p>
        <div className="wizard-input-icon-row">
          <LayoutGrid size={16} className="wizard-input-icon" />
          <select value={useCase} onChange={(e) => setUseCase(e.target.value)}>
            <option value="">Select a use case</option>
            {USE_CASE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {useCase === 'other' && (
        <div className="wizard-field">
          <label className="wizard-field-label">Specify Other Use Case</label>
          <p className="wizard-field-hint">Please specify your use case.</p>
          <div className="wizard-input-icon-row">
            <Pencil size={16} className="wizard-input-icon" />
            <input
              type="text"
              placeholder="e.g. Internal Knowledge Assistant for HR Policies"
              value={otherUseCase}
              onChange={(e) => setOtherUseCase(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}