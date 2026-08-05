import { useState } from 'react';
import { ChevronRight, RotateCcw, Check } from 'lucide-react';
import ColorsStyleSection from './ColorsStyleSection.jsx';
import BubblePositionSelect from './BubblePositionSelect.jsx';
import GreetingTextarea from './GreetingTextarea.jsx';

export default function ConfigSidebar({
  draftConfig,
  updateDraftField,
  updateDraftThemeColor,
  resetDraft,
  onRequestSave,
  onUploadLogo,
  isUploadingLogo,
  isSaving,
  hasUnsavedChanges,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!draftConfig || !draftConfig.theme_color) return null;

  const greetingLimit = 200;

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (file) onUploadLogo(file);
  }

  return (
    <div className={`config-sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="config-sidebar-collapse-btn"
        onClick={() => setIsCollapsed((c) => !c)}
        aria-label={isCollapsed ? 'Expand configuration panel' : 'Collapse configuration panel'}
      >
        <ChevronRight size={16} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }} />
      </button>

      {!isCollapsed && (
        <div className="config-sidebar">
          <div className="config-sidebar-header">
            <h2>Chatbot Configuration</h2>
            <p>Customize the look and behavior of your chatbot.</p>
          </div>

          <div className="config-section">
            <div className="config-section-title">
              <span className="config-step-badge">1</span>
              <span>Logo</span>
            </div>
            <div className="config-logo-upload">
              {draftConfig.logo_url && (
                <img src={draftConfig.logo_url} alt="Logo preview" className="config-logo-preview" />
              )}
              <label className="config-logo-input-label">
                {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  disabled={isUploadingLogo}
                  hidden
                />
              </label>
            </div>
          </div>

          <ColorsStyleSection
            themeColor={draftConfig.theme_color}
            onChange={updateDraftThemeColor}
          />

          <div className="config-section">
            <div className="config-section-title">
              <span className="config-step-badge">3</span>
              <span>Bubble Position</span>
            </div>
            <BubblePositionSelect
              value={draftConfig.bubble_position}
              onChange={(val) => updateDraftField('bubble_position', val)}
            />
          </div>

          <div className="config-section">
            <div className="config-section-title">
              <span className="config-step-badge">4</span>
              <span>Default Greeting</span>
            </div>
            <GreetingTextarea
              value={draftConfig.greeting_message}
              onChange={(val) => updateDraftField('greeting_message', val)}
              maxLength={greetingLimit}
            />
          </div>

          <div className="config-sidebar-actions">
            <button
              className="config-btn-secondary"
              onClick={resetDraft}
              disabled={!hasUnsavedChanges || isSaving}
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              className="config-btn-primary"
              onClick={onRequestSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              <Check size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}