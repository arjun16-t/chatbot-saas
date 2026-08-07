import MiniChatbotPreview from './MiniChatbotPreview.jsx'

const USE_CASE_LABELS = {
  customer_support: 'Customer Support',
  internal_knowledge_base: 'Internal Knowledge Base / HR Docs',
  sales_lead_qualification: 'Sales & Lead Qualification',
  ecommerce_assistant: 'E-commerce Product Assistant',
  developer_docs: 'Documentation / Developer Support',
  student_academic: 'Student / Academic Project',
  personal_project: 'Personal Project',
  other: 'Other',
}

/**
 * Step 3: read-only summary of everything entered, plus the final
 * themed mini preview, right before the actual creation calls fire.
 */
export default function WizardStep3Review({
  name, domain, useCase, otherUseCase,
  theme, botDisplayName, greetingMessage, bubblePosition,
  configSkipped, createError,
}) {
  const useCaseDisplay = useCase === 'other' ? otherUseCase : USE_CASE_LABELS[useCase]

  return (
    <div className="wizard-step-panel wizard-step-panel-split">
      <div className="wizard-step-panel-form">
        <h2>Review & Create</h2>
        <p className="wizard-step-intro">Confirm everything looks right before launching.</p>

        <div className="wizard-review-row">
          <span className="wizard-review-label">Project Name</span>
          <span className="wizard-review-value">{name}</span>
        </div>
        <div className="wizard-review-row">
          <span className="wizard-review-label">Domain</span>
          <span className="wizard-review-value">{domain}</span>
        </div>
        {useCaseDisplay && (
          <div className="wizard-review-row">
            <span className="wizard-review-label">Use Case</span>
            <span className="wizard-review-value">{useCaseDisplay}</span>
          </div>
        )}
        <div className="wizard-review-row">
          <span className="wizard-review-label">Bubble Position</span>
          <span className="wizard-review-value">{bubblePosition === 'bottom-left' ? 'Bottom Left' : 'Bottom Right'}</span>
        </div>

        {configSkipped && (
          <p className="wizard-review-note">
            Chatbot styling was skipped — your project will use default colors. You can customize it anytime from Configure.
          </p>
        )}

        {createError && <p className="wizard-field-error">{createError}</p>}
      </div>

      <div className="wizard-step-panel-preview">
        <MiniChatbotPreview
          theme={theme}
          botDisplayName={botDisplayName}
          greetingMessage={greetingMessage}
        />
      </div>
    </div>
  )
}