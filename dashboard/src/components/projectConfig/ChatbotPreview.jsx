// components/projectConfig/ChatbotPreview.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const HARDCODED_QA = [
  { sender: 'user', text: 'Tell me how RAG works.', time: '10:31 AM' },
  {
    sender: 'bot',
    text: 'RAG (Retrieval-Augmented Generation) combines information retrieval with language generation to provide accurate and context-aware answers.',
    time: '10:31 AM',
  },
];

/**
 * Renders a mock website with the chatbot widget mimicked on top,
 * matching widget.js's real visual output.
 *
 * The website content scrolls in its own inner container
 * (.cp-mock-site-scroll) so the widget, positioned absolutely
 * against the outer fixed-height frame (.cp-mock-site), always
 * stays anchored to the visible corner regardless of how far the
 * mock website content scrolls.
 *
 * Two modes:
 *   - Static (default): hardcoded conversation, styled live from
 *     whatever `config` is passed (updates instantly as sidebar edits happen)
 *   - Live: real input, real /api/chat/ calls against the saved config
 *     (styling frozen until Save, per design)
 *
 * Both modes now prepend a real greeting row built from
 * config.greeting_message -- matching widget.js's actual behavior,
 * where the greeting is the first bot message shown on open. This
 * is rendered directly from config, never routed through a real
 * /api/chat/ call in either mode.
 *
 * Props:
 *   config: theme_color, logo_url, bot_display_name, greeting_message, bubble_position
 *   isLiveMode: boolean
 *   onRequestToggleLiveMode: (nextValue: boolean) => void
 *   projectId: string
 *   viewportMode: 'desktop' | 'mobile'
 */
export default function ChatbotPreview({
  config,
  isLiveMode,
  onRequestToggleLiveMode,
  projectId,
  viewportMode,
}) {
  const { accessToken } = useAuth();
  const [liveMessages, setLiveMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const container = messagesEndRef.current?.closest('.cp-widget-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [liveMessages, isThinking]);

  if (!config) return null;

  const theme = config.theme_color;
  const positionSide = config.bubble_position === 'bottom-left' ? 'left' : 'right';
  const isMobile = viewportMode === 'mobile';

  function handleSend() {
    const question = inputValue.trim();
    if (!question || isThinking) return;

    setLiveMessages((prev) => [...prev, { sender: 'user', text: question, time: timeNow() }]);
    setInputValue('');
    setIsThinking(true);

    fetch(`${API_BASE}/api/chat/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, project_id: projectId }),
    })
      .then((res) => res.json())
      .then((data) => {
        const answer = data?.data?.answer || "Sorry, I couldn't find an answer to that.";
        setLiveMessages((prev) => [...prev, { sender: 'bot', text: answer, time: timeNow() }]);
      })
      .catch(() => {
        setLiveMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Something went wrong. Please try again.', time: timeNow() },
        ]);
      })
      .finally(() => setIsThinking(false));
  }

  // The greeting is client-side/config-only, exactly like widget.js --
  // never routed through handleSend()/fetch. Prepended fresh here so
  // both modes actually reflect config.greeting_message, which they
  // previously ignored entirely.
  const greetingRow = { sender: 'bot', text: config.greeting_message, time: '10:30 AM' };
  const displayMessages = isLiveMode
    ? [greetingRow, ...liveMessages]
    : [greetingRow, ...HARDCODED_QA];

  return (
    <div className="cp-wrapper">
      <div className="cp-mode-toggle-bar">
        <span className="cp-mode-label">
          {isLiveMode ? 'Live Preview (real queries)' : 'Static Preview'}
        </span>
        <ToggleSwitch checked={isLiveMode} onChange={(next) => onRequestToggleLiveMode(next)} />
      </div>

      <div className={`cp-mock-site-outer ${isMobile ? 'cp-mobile-outer' : ''}`}>
        <div className={`cp-mock-site ${isMobile ? 'cp-mobile-frame' : ''}`}>

          {/* Scrollable website content — widget below is a sibling, NOT inside this */}
          <div className="cp-mock-site-scroll">
            {!isMobile && (
              <>
                <div className="cp-mock-nav">
                  <span className="cp-mock-logo">DemoSite</span>
                  <div className="cp-mock-nav-links">
                    <span>Home</span>
                    <span>Features</span>
                    <span>Pricing</span>
                    <span>About</span>
                    <span>Contact</span>
                  </div>
                  <button className="cp-mock-cta">Get Started</button>
                </div>

                <div className="cp-mock-hero">
                  <div className="cp-mock-hero-text">
                    <h1>Welcome to DemoSite</h1>
                    <p>
                      This is a dummy website used to preview your chatbot in action. Experience a
                      clean and modern design.
                    </p>
                    <button className="cp-mock-learn-more">Learn More</button>
                  </div>
                  <div className="cp-mock-hero-image" />
                </div>

                <div className="cp-mock-features">
                  <h2>Our Features</h2>
                  <div className="cp-mock-feature-cards">
                    <div className="cp-mock-card">
                      <div className="cp-mock-card-icon" />
                      <h3>Fast Performance</h3>
                      <p>Optimized for speed and seamless experience.</p>
                    </div>
                    <div className="cp-mock-card">
                      <div className="cp-mock-card-icon" />
                      <h3>Secure Platform</h3>
                      <p>Built with security and privacy in mind.</p>
                    </div>
                    <div className="cp-mock-card">
                      <div className="cp-mock-card-icon" />
                      <h3>Easy Integration</h3>
                      <p>Integrate effortlessly with your existing tools.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isMobile && (
              <div className="cp-mobile-site-placeholder">
                <span>DemoSite</span>
                <p>Mobile view — chatbot opens full screen</p>
              </div>
            )}
          </div>

          {/* ── Widget mimic — anchored to cp-mock-site, unaffected by content scroll ── */}
          <div
            className={`cp-widget-window cp-open ${
              isMobile ? 'cp-mobile-fullscreen' : `cp-${positionSide}`
            }`}
            style={{ background: theme.background_color }}
          >
            <div className="cp-widget-header" style={{ background: theme.primary_color }}>
              <div className="cp-widget-header-icon">{iconMarkup(config.logo_url)}</div>
              <div className="cp-widget-header-name">{config.bot_display_name}</div>
              <button className="cp-widget-close-btn" aria-label="Close">
                &times;
              </button>
            </div>

            <div className="cp-widget-messages">
              {displayMessages.map((m, i) => (
                <MessageRow key={i} sender={m.sender} text={m.text} time={m.time} config={config} />
              ))}
              {isThinking && <TypingRow config={config} />}
              <div ref={messagesEndRef} />
            </div>

            <div className="cp-widget-input-row">
              <input
                className="cp-widget-input"
                type="text"
                placeholder={isLiveMode ? 'Type a message...' : 'Live preview to test real queries'}
                value={isLiveMode ? inputValue : ''}
                onChange={(e) => isLiveMode && setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={!isLiveMode}
              />
              <button
                className="cp-widget-send"
                onClick={handleSend}
                disabled={!isLiveMode || isThinking}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={theme.primary_color} strokeWidth="2">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>

          {!isMobile && (
            <button
              className={`cp-widget-bubble cp-${positionSide}`}
              style={{ background: theme.primary_color }}
            >
              {iconMarkup(config.logo_url)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageRow({ sender, text, time, config }) {
  const theme = config.theme_color;
  const isUser = sender === 'user';
  return (
    <div className={`cp-row ${isUser ? 'cp-user' : 'cp-bot'}`}>
      <div className="cp-bubble-line">
        {!isUser && (
          <div
            className="cp-avatar"
            style={{ background: theme.secondary_color + '33', color: theme.primary_color }}
          >
            {iconMarkup(config.logo_url)}
          </div>
        )}
        <div
          className={`cp-msg ${isUser ? 'cp-user' : 'cp-bot'}`}
          style={{
            background: isUser ? theme.user_bubble_color : theme.bot_bubble_color,
            color: isUser ? theme.user_text_color : theme.text_color,
          }}
        >
          {text}
        </div>
      </div>
      <div className={`cp-meta ${isUser ? 'cp-user' : 'cp-bot'}`}>
        {isUser ? `You • ${time}` : `${config.bot_display_name} • ${time}`}
        {isUser && (
          <span className="cp-check" style={{ color: theme.primary_color }}>
            ✓
          </span>
        )}
      </div>
    </div>
  );
}

function TypingRow({ config }) {
  const theme = config.theme_color;
  return (
    <div className="cp-row cp-bot">
      <div className="cp-bubble-line">
        <div
          className="cp-avatar"
          style={{ background: theme.secondary_color + '33', color: theme.primary_color }}
        >
          {iconMarkup(config.logo_url)}
        </div>
        <div className="cp-typing">
          <span style={{ background: theme.primary_color }} />
          <span style={{ background: theme.primary_color }} />
          <span style={{ background: theme.primary_color }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Modern iOS-style toggle switch with cubic-bezier spring easing.
 */
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`cp-toggle ${checked ? 'cp-toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="cp-toggle-thumb" />
    </button>
  );
}

function iconMarkup(logoUrl) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="cp-icon-img" />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="8" width="16" height="12" rx="4" />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
      <path d="M2 13h2M20 13h2" />
    </svg>
  );
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}