const DEFAULT_ICON_SVG_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function BotIcon() {
  return (
    <svg {...DEFAULT_ICON_SVG_PROPS}>
      <rect x="4" y="8" width="16" height="12" rx="4" />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
      <path d="M2 13h2M20 13h2" />
    </svg>
  )
}

/**
 * Compact, always-open chatbot preview: header + greeting message only,
 * no mock website, no input row. Used inside the project creation
 * wizard (steps 2 and 3) where a full-site preview would be excessive.
 *
 * Props:
 *   theme: { primary_color, secondary_color, background_color, text_color, bot_bubble_color, ... }
 *   botDisplayName: string
 *   greetingMessage: string
 */
export default function MiniChatbotPreview({ theme, botDisplayName, greetingMessage }) {
  return (
    <div className="mini-cp-frame">
      <div className="mini-cp-window" style={{ background: theme.background_color }}>
        <div className="mini-cp-header" style={{ background: theme.primary_color }}>
          <div className="mini-cp-header-icon"><BotIcon /></div>
          <div className="mini-cp-header-name">{botDisplayName || 'Your Chatbot'}</div>
        </div>
        <div className="mini-cp-body">
          <div className="mini-cp-row">
            <div
              className="mini-cp-avatar"
              style={{ background: theme.secondary_color + '33', color: theme.primary_color }}
            >
              <BotIcon />
            </div>
            <div
              className="mini-cp-msg"
              style={{ background: theme.bot_bubble_color, color: theme.text_color }}
            >
              {greetingMessage || 'Welcome! How may I assist you?'}
            </div>
          </div>
        </div>
      </div>
      <div className="mini-cp-bubble" style={{ background: theme.primary_color }}>
        <BotIcon />
      </div>
    </div>
  )
}