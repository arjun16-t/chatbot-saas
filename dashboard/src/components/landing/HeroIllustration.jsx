/**
 * Custom hero illustration: document -> chunks/vectors -> answer,
 * replacing the three floating dashboard-screenshot cards (that
 * pattern -- drop-shadowed app-mockup cards floating around a hero
 * headline -- is one of the most recognizable "AI-generated SaaS
 * site" tells right now, and it didn't tie thematically to anything
 * else on the page).
 *
 * This is deliberately geometric (rects, circles, gentle curves)
 * rather than freehand illustration -- confident and simple reads
 * better than an attempt at detailed art, especially for something
 * built without a live visual feedback loop.
 *
 * The connecting dashes animate via stroke-dashoffset -- a subtle,
 * continuous "data flowing" cue that echoes the data-track dividers
 * elsewhere on the page, tying the hero to the rest of the site's
 * visual language instead of sitting alone.
 */
function HeroIllustration() {
  return (
    <svg
      className="hero-illustration"
      viewBox="0 0 640 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document */}
      <rect x="24" y="150" width="110" height="140" rx="10" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
      <path d="M104 150 L134 180 L104 180 Z" fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1.5" />
      <rect x="42" y="200" width="60" height="5" rx="2.5" fill="var(--color-border)" />
      <rect x="42" y="214" width="46" height="5" rx="2.5" fill="var(--color-border)" />
      <rect x="42" y="228" width="52" height="5" rx="2.5" fill="var(--color-border)" />
      <rect x="42" y="242" width="34" height="5" rx="2.5" fill="var(--color-accent-primary)" opacity="0.4" />

      {/* Connector: document -> chips */}
      <path
        className="hero-illustration-flow"
        d="M136 210 Q 210 150 262 196"
        stroke="var(--color-border)"
        strokeWidth="1.5"
        strokeDasharray="5 6"
        fill="none"
      />

      {/* Vector chips, cascading toward the answer bubble */}
      <g>
        <rect x="262" y="178" width="118" height="36" rx="18" fill="rgba(200, 134, 10, 0.06)" stroke="rgba(200, 134, 10, 0.25)" strokeWidth="1.2" />
        <text x="321" y="200" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-text-secondary)">[0.12, -0.84, 0.45]</text>
      </g>
      <g>
        <rect x="292" y="232" width="118" height="36" rx="18" fill="rgba(200, 134, 10, 0.06)" stroke="rgba(200, 134, 10, 0.25)" strokeWidth="1.2" />
        <text x="351" y="254" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-text-secondary)">[0.77, 0.22, -0.55]</text>
      </g>
      <g>
        <rect x="326" y="286" width="118" height="36" rx="18" fill="rgba(200, 134, 10, 0.08)" stroke="var(--color-accent-primary)" strokeWidth="1.4" />
        <text x="385" y="308" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-text-primary)">[-0.41, 0.88, 0.11]</text>
      </g>

      {/* Connector: chips -> answer bubble */}
      <path
        className="hero-illustration-flow"
        d="M444 304 Q 500 320 520 300"
        stroke="var(--color-accent-primary)"
        strokeWidth="1.5"
        strokeDasharray="5 6"
        fill="none"
        opacity="0.6"
      />

      {/* Answer bubble -- deliberately the largest element, anchored
          so it bleeds past the illustration column's right edge */}
      <rect x="470" y="120" width="170" height="110" rx="22" fill="var(--color-surface)" stroke="var(--color-accent-primary)" strokeWidth="2" />
      <path d="M498 226 L498 250 L522 226 Z" fill="var(--color-surface)" stroke="var(--color-accent-primary)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="503" cy="153" r="14" fill="rgba(200, 134, 10, 0.1)" />
      <path d="M497 153 L501 158 L510 147" stroke="var(--color-accent-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="528" y="147" width="94" height="6" rx="3" fill="var(--color-border)" />
      <rect x="528" y="163" width="70" height="6" rx="3" fill="var(--color-border)" />
      <rect x="528" y="179" width="82" height="6" rx="3" fill="var(--color-border)" />
      <rect x="528" y="195" width="50" height="6" rx="3" fill="var(--color-accent-secondary)" />
    </svg>
  )
}

export default HeroIllustration