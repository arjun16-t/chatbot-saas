import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Shield, Briefcase, Folder, FolderLock, Zap, Cpu, BarChart2, Code2, Copy, Check } from 'lucide-react'

const SCRIPT_SNIPPET = '<script src="cdn.athenachat.io/widget.js" data-api-key="ac_..."></script>'

function AnalyticsCard() {
  const numberRef = useRef(null)
  const tweenRef = useRef(null)
  const valueRef = useRef({ n: 0 })

  function handleMouseEnter() {
    tweenRef.current?.kill()
    tweenRef.current = gsap.to(valueRef.current, {
      n: 94,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        if (numberRef.current) numberRef.current.textContent = Math.round(valueRef.current.n)
      },
    })
  }

  function handleMouseLeave() {
    tweenRef.current?.kill()
    tweenRef.current = gsap.to(valueRef.current, {
      n: 0,
      duration: 0.4,
      ease: 'power1.in',
      onUpdate: () => {
        if (numberRef.current) numberRef.current.textContent = Math.round(valueRef.current.n)
      },
    })
  }

  return (
    <div className="bento-card group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="bento-content">
        <div className="bento-icon"><BarChart2 size={20} /></div>
        <h3>Advanced Analytics</h3>
        <p>Monitor hit rates and instantly identify unanswered queries to patch documentation gaps.</p>
      </div>
      <div className="bento-visual visual-analytics-stat">
        <span className="analytics-stat-number"><span ref={numberRef}>0</span><span className="unit">% hit rate</span></span>
      </div>
      <div className="bento-visual visual-analytics-bars">
        <div className="mini-bar-col"><div className="mini-bar hit" /><span>Hits</span></div>
        <div className="mini-bar-col"><div className="mini-bar miss" /><span>Misses</span></div>
        <div className="mini-bar-col"><div className="mini-bar gap" /><span>Gaps</span></div>
      </div>
    </div>
  )
}

function ScriptTagCard() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SCRIPT_SNIPPET)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="bento-card group">
      <div className="bento-content">
        <div className="bento-icon"><Code2 size={20} /></div>
        <h3>One Script Tag</h3>
        <p>Paste one line into your site and your chatbot is live. No SDK, no build step, no backend of your own.</p>
      </div>
      <div className="bento-visual visual-script">
        <button type="button" className={`script-chip ${copied ? 'is-copied' : ''}`} onClick={handleCopy} title="Copy snippet">
          <code>{SCRIPT_SNIPPET}</code>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

function BentoGrid() {
  return (
    <section className="bento-section" id="features">
      <div className="bento-header">
        <h2>Enterprise-grade infrastructure.</h2>
        <p>Built for scale, speed, and absolute precision.</p>
      </div>

      <div className="bento-grid">

        {/* Card 1: Multi-Tenancy -- signature card, deliberately
            different silhouette from the other four (no boxed icon,
            eyebrow label + large faded watermark instead) */}
        <div className="bento-card span-2 group is-signature">
          <div className="bento-icon-watermark"><Shield /></div>
          <div className="bento-content">
            <div className="bento-eyebrow"><Shield size={14} /> Security</div>
            <h3>Multi-Layered Tenancy</h3>
            <p>Absolute data isolation. Manage context securely across overarching client accounts and isolated, project-specific boundaries without data bleed.</p>
          </div>
          <div className="bento-visual visual-tenancy">
            <div className="tenant-layer client"><Briefcase size={14} /> Client Organization</div>
            <div className="tenant-layer project p-a"><Folder size={14} /> Alpha Environment</div>
            <div className="tenant-layer project p-b"><FolderLock size={14} /> Beta Environment (Isolated)</div>
          </div>
        </div>

        {/* Card 2: Low Latency */}
        <div className="bento-card group">
          <div className="bento-content">
            <div className="bento-icon"><Zap size={20} /></div>
            <h3>Ultra-Low Latency</h3>
            <p>Optimized retrieval pipelines and high-performance vector operations delivering responses instantly.</p>
          </div>
          <div className="bento-visual visual-latency">
            <div className="ping-dot" />
            <span className="latency-stat">124<span className="unit">ms</span></span>
          </div>
        </div>

        {/* Card 3: Hybrid Search */}
        <div className="bento-card group">
          <div className="bento-content">
            <div className="bento-icon"><Cpu size={20} /></div>
            <h3>Hybrid Search</h3>
            <p>We combine dense vectors for deep semantic meaning and sparse vectors for exact keyword precision.</p>
          </div>
          <div className="bento-visual visual-hybrid">
            <div className="search-track dense">
              <div className="scanner" />
              <span>DENSE (Semantic)</span>
            </div>
            <div className="search-track sparse">
              <div className="scanner delay" />
              <span>SPARSE (Keyword)</span>
            </div>
          </div>
        </div>

        {/* Card 4: One Script Tag */}
        <ScriptTagCard />

        {/* Card 5: Analytics */}
        <AnalyticsCard />

      </div>
    </section>
  )
}

export default BentoGrid