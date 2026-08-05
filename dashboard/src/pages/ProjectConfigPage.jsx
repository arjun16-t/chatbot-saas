import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useProjectConfig } from '../hooks/useProjectConfig.js';
import ConfigSidebar from '../components/projectConfig/ConfigSidebar.jsx';
import ChatbotPreview from '../components/projectConfig/ChatbotPreview.jsx';
import LivePreviewWarningModal from '../components/projectConfig/LivePreviewWarningModal.jsx';

export default function ProjectConfigPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const {
    savedConfig,
    draftConfig,
    isLoading,
    isSaving,
    isUploadingLogo,
    error,
    hasUnsavedChanges,
    updateDraftField,
    updateDraftThemeColor,
    resetDraft,
    saveConfig,
    uploadLogo,
  } = useProjectConfig(projectId);

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [modalConfig, setModalConfig] = useState(null);

  function enableLiveModeWithTokenWarning() {
    setModalConfig({
      title: 'Enable Live Preview?',
      message:
        'Live Preview sends real questions to your chatbot and consumes tokens from your usage quota, just like a real visitor would.',
      confirmLabel: 'Enable Live Preview',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        setIsLiveMode(true);
        setModalConfig(null);
      },
    });
  }

  function handleRequestToggleLiveMode(next) {
    if (!next) {
      setIsLiveMode(false);
      return;
    }

    if (hasUnsavedChanges) {
      setModalConfig({
        title: 'You Have Unsaved Changes',
        message:
          'Enabling Live Preview will discard your unsaved edits since it always reflects the last saved version. Save your changes first, or go back and keep editing.',
        confirmLabel: 'Save Changes',
        cancelLabel: 'Go Back',
        onConfirm: () => {
          saveConfig().then(() => {
            enableLiveModeWithTokenWarning();
          });
        },
      });
      return;
    }

    enableLiveModeWithTokenWarning();
  }

  function handleRequestSave() {
    if (isLiveMode) {
      setModalConfig({
        title: 'Save While Live Preview Is On?',
        message:
          'You are currently testing with real queries. Saving now will apply these changes to your live chatbot immediately.',
        confirmLabel: 'Save Changes',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          saveConfig();
          setModalConfig(null);
        },
      });
      return;
    }
    saveConfig();
  }

  if (isLoading) {
    return <div className="config-page-loading">Loading chatbot configuration...</div>;
  }

  if (error && !savedConfig) {
    return <div className="config-page-error">{error}</div>;
  }

  const previewConfig = isLiveMode ? savedConfig : draftConfig;

  return (
    <div className="config-page">
      <div className="config-page-topbar">
        <div className="config-page-breadcrumb">
          <span>Home</span> / <span>Project</span> / <span className="active">Chatbot</span>
        </div>
        <div className="config-page-viewport-toggle">
          <button
            className={viewportMode === 'desktop' ? 'active' : ''}
            onClick={() => setViewportMode('desktop')}
            aria-label="Desktop view"
          >
            <Monitor size={16} />
          </button>
          <button
            className={viewportMode === 'mobile' ? 'active' : ''}
            onClick={() => setViewportMode('mobile')}
            aria-label="Mobile view"
          >
            <Smartphone size={16} />
          </button>
        </div>
        <button className="config-page-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="config-page-body">
        <ChatbotPreview
          config={previewConfig}
          isLiveMode={isLiveMode}
          onRequestToggleLiveMode={handleRequestToggleLiveMode}
          projectId={projectId}
          viewportMode={viewportMode}
        />
        <ConfigSidebar
          draftConfig={draftConfig}
          updateDraftField={updateDraftField}
          updateDraftThemeColor={updateDraftThemeColor}
          resetDraft={resetDraft}
          onRequestSave={handleRequestSave}
          onUploadLogo={uploadLogo}
          isUploadingLogo={isUploadingLogo}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>

      <LivePreviewWarningModal
        isOpen={!!modalConfig}
        title={modalConfig?.title}
        message={modalConfig?.message}
        confirmLabel={modalConfig?.confirmLabel}
        cancelLabel={modalConfig?.cancelLabel}
        onConfirm={modalConfig?.onConfirm}
        onCancel={() => setModalConfig(null)}
      />
    </div>
  );
}