import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FileText, Database, Bot, Send, Upload, Layers as LayersIcon } from 'lucide-react'
import '../../styles/pipeline.css'

gsap.registerPlugin(ScrollTrigger)

const RAG_ANSWERS = {
  pto: "Based on the employee handbook, team members accrue 20 days of Paid Time Off annually. Time rolls over up to 5 days.",
  hardware: "To request new hardware, please submit a ticket through the internal IT portal using the 'Hardware Provisioning' form.",
  hours: "Our core working hours are from 10:00 AM to 3:00 PM in your local timezone to ensure cross-team overlap.",
}

const QUERY_BUTTONS = [
  { target: 'pto', label: 'What is the PTO policy?' },
  { target: 'hardware', label: 'How do I request hardware?' },
  { target: 'hours', label: 'What are the core hours?' },
]

const NARRATIVE_STEPS = [
  { id: 'step-upload', title: '1. Ingestion', body: 'Upload your knowledge base. We securely process your PDFs, docs, and text files instantly.', metric: 'Validated in <1s' },
  { id: 'step-chunk', title: '2. Semantic Chunking', body: 'Documents are split into overlapping blocks, ensuring no vital context is lost at the boundaries.', metric: '1,500 char chunks, 150 overlap' },
  { id: 'step-embed', title: '3. Embedding & Storage', body: 'Chunks are converted into dense and sparse vectors, securely stored in an isolated Vector DB.', metric: '768-dim dense + sparse vectors' },
]

// Final target strings for the scramble-reveal -- one per .sim-chunk,
// same order/index.
const VECTOR_STRINGS = [
  '[0.12, -0.84, 0.45, 0.91]',
  '[0.77, 0.22, -0.55, 0.19]',
  '[-0.41, 0.88, 0.11, 0.05]',
  '[0.33, -0.19, 0.67, -0.82]',
]

/**
 * Scrambles only the digit characters of `target` toward their real
 * values as `progress` (0-1) increases; brackets/commas/periods/minus
 * signs are shown correctly from the start. This reads as "numbers
 * resolving into a vector" rather than pure noise, and stays legible
 * throughout the transition instead of a full-string random flicker.
 *
 * Deliberately NOT using GSAP's ScrambleTextPlugin -- that's a paid
 * Club GreenSock plugin, not part of the free core/ScrollTrigger
 * bundle already in use here. This hand-rolled version only needs
 * the free `onUpdate` callback every tween already has.
 */
function scrambleVectorText(target, progress) {
  const digitPositions = target.split('').filter((c) => /[0-9]/.test(c)).length
  const revealCount = Math.floor(digitPositions * progress)

  let digitIndex = 0
  let result = ''
  for (const ch of target) {
    if (/[0-9]/.test(ch)) {
      result += digitIndex < revealCount ? ch : String(Math.floor(Math.random() * 10))
      digitIndex++
    } else {
      result += ch
    }
  }
  return result
}

const MOBILE_QUERY = '(max-width: 900px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Pinned scroll-scrubbed pipeline theater (desktop, motion-OK) with a
 * static stacked fallback (mobile, OR prefers-reduced-motion) -- one
 * `isSimplified` flag drives both, since they need the same fix: skip
 * the ScrollTrigger pin/scrub, show the narrative as a normal list
 * instead of an absolute-positioned crossfade.
 *
 * The interactive retrieval demo (query buttons -> floating badge ->
 * chat answer) is identical and fully functional in both modes --
 * it's short, user-triggered feedback, not continuous/autoplaying
 * motion, so there's no accessibility reason to strip it.
 *
 * The scramble-text vector reveal only exists in the full (desktop,
 * motion-OK) path -- the simplified path never shows the chunk/vector
 * sequence at all, so there's nothing to scramble there.
 */
function PipelineSimulation() {
  const scrollContainerRef = useRef(null)
  const layoutRef = useRef(null)
  const floatingElRef = useRef(null)
  const chatBodyRef = useRef(null)
  const clickTimelineRef = useRef(null)
  const vectorRefs = useRef([])

  const [isSimplified, setIsSimplified] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY)
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)

    function update() {
      setIsSimplified(mobileQuery.matches || reducedMotionQuery.matches)
    }
    update()

    mobileQuery.addEventListener('change', update)
    reducedMotionQuery.addEventListener('change', update)
    return () => {
      mobileQuery.removeEventListener('change', update)
      reducedMotionQuery.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (isSimplified) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainerRef.current,
        pin: layoutRef.current,
        start: 'center center',
        end: '+=3000',
        scrub: 1,
      },
    })

    tl.to('#step-upload', { opacity: 1, duration: 1 })
      .fromTo('#sim-doc', { opacity: 0, scale: 0.8, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 1 }, '<')
      .to('#step-upload', { opacity: 0, duration: 1 }, '+=1.5')

    tl.to('#step-chunk', { opacity: 1, duration: 1 })
      .to('#sim-doc', { opacity: 0, scale: 0.9, duration: 0.5 }, '<')
      .to('#sim-chunks', { opacity: 1, duration: 0.5 }, '<0.2')
      .fromTo('.sim-chunk', { y: 0 }, { y: (index) => (index * 15) - 20, stagger: 0.1, duration: 1, ease: 'power2.out' }, '<')
      .to('#step-chunk', { opacity: 0, duration: 1 }, '+=1.5')

    tl.to('#step-embed', { opacity: 1, duration: 1 })
      .to('#sim-chunks', { opacity: 0, scale: 0.9, duration: 0.5 }, '<')
      .to('#sim-vectors', {
        opacity: 1,
        duration: 0.5,
        onUpdate: function () {
          const p = this.progress()
          vectorRefs.current.forEach((el, i) => {
            if (el) el.textContent = scrambleVectorText(VECTOR_STRINGS[i], p)
          })
        },
      }, '<0.2')
      .to('#sim-database', { bottom: '20%', duration: 1, ease: 'back.out(1.2)' }, '<')
      .to('.sim-vector', { opacity: 0, y: 150, stagger: 0.15, duration: 1, ease: 'power2.in' }, '+=0.5')
      .to('.db-slot', { backgroundColor: 'rgba(200, 134, 10, 0.15)', borderColor: 'var(--color-accent-primary)', stagger: 0.15, duration: 0.1 }, '<0.5')
      .to('#step-embed', { opacity: 0, duration: 1 }, '+=1.5')

    tl.to('#step-query', { opacity: 1, duration: 1 })
      .to('.sim-ingestion-stage', { opacity: 0, duration: 1 }, '<')
      .to('.sim-retrieval-stage', { opacity: 1, duration: 1, pointerEvents: 'auto' }, '<')

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [isSimplified])

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    return () => {
      clickTimelineRef.current?.kill()
    }
  }, [])

  function handleQueryClick(target, questionText) {
    if (isSimulating) return
    setIsSimulating(true)
    setChatMessages([{ sender: 'user', text: questionText }])

    const floatingEl = floatingElRef.current
    floatingEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> [Query Vector]'
    floatingEl.style.borderColor = 'var(--color-accent-primary)'

    const tl = gsap.timeline({
      onComplete: () => setIsSimulating(false),
    })
    clickTimelineRef.current = tl

    tl.fromTo(
      floatingEl,
      { opacity: 0, x: 0, y: 100, scale: 0.5 },
      { opacity: 1, x: -60, y: -80, scale: 1, duration: 0.6, ease: 'power2.out' }
    )
      .to(floatingEl, { opacity: 0.5, y: -90, duration: 0.4, yoyo: true, repeat: 1 })
      .call(() => {
        floatingEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg> [Context Retrieved]'
        floatingEl.style.borderColor = 'var(--color-status-success)'
      })
      .to(floatingEl, { opacity: 1, x: 20, y: 40, duration: 0.6, ease: 'power2.in' })
      .to(floatingEl, { opacity: 0, duration: 0.2 })
      .call(() => {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: RAG_ANSWERS[target] }])
        floatingEl.style.borderColor = 'var(--color-accent-primary)'
      })
  }

  const chatWidget = (
    <div className="sim-chat-widget">
      <div className="chat-header">
        <Bot size={16} /> AthenaChat
      </div>
      <div className="chat-body" ref={chatBodyRef}>
        {chatMessages.map((m, i) => (
          <div key={i} className={`sim-bubble ${m.sender === 'user' ? 'user' : 'ai'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input-mock">
        <span>Type a message...</span>
        <Send size={14} />
      </div>
    </div>
  )

  const queryButtons = (
    <div className="interactive-queries">
      {QUERY_BUTTONS.map((q) => (
        <button
          key={q.target}
          type="button"
          className="query-btn"
          disabled={isSimulating}
          onClick={() => handleQueryClick(q.target, q.label)}
        >
          {q.label}
        </button>
      ))}
    </div>
  )

  return (
    <section className="pipeline-section" id="how-it-works">
      <div className="pipeline-header reveal">
        <h2>How AthenaChat works</h2>
        <p>A transparent, high-performance RAG pipeline.</p>
      </div>

      {isSimplified ? (
        <div className="pipeline-static">
          <div className="pipeline-static-steps">
            {NARRATIVE_STEPS.map((step) => (
              <div className="pipeline-static-step reveal" key={step.id}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <div className="step-metric">{step.metric}</div>
              </div>
            ))}
          </div>

          <div className="pipeline-static-chips reveal">
            <div className="static-chip"><Upload size={14} /> Upload</div>
            <div className="static-chip"><LayersIcon size={14} /> Chunk</div>
            <div className="static-chip"><Database size={14} /> Embed &amp; Store</div>
          </div>

          <div className="pipeline-static-retrieval reveal">
            <h3>4. Retrieval in Action</h3>
            <p>Select a question below to see how AthenaChat retrieves the exact context and generates an answer.</p>
            {queryButtons}

            <div className="static-canvas">
              {chatWidget}
              <div className="sim-floating-element" id="sim-query-vector" ref={floatingElRef} />
            </div>
          </div>
        </div>
      ) : (
        <div className="pipeline-scroll-container" ref={scrollContainerRef}>
          <div className="pipeline-layout" ref={layoutRef}>

            <div className="pipeline-narrative">
              <div className="narrative-step" id="step-upload">
                <h3>1. Ingestion</h3>
                <p>Upload your knowledge base. We securely process your PDFs, docs, and text files instantly.</p>
                <div className="step-metric">Validated in &lt;1s</div>
              </div>

              <div className="narrative-step" id="step-chunk">
                <h3>2. Semantic Chunking</h3>
                <p>Documents are split into overlapping blocks, ensuring no vital context is lost at the boundaries.</p>
                <div className="step-metric">1,500 char chunks, 150 overlap</div>
              </div>

              <div className="narrative-step" id="step-embed">
                <h3>3. Embedding &amp; Storage</h3>
                <p>Chunks are converted into dense and sparse vectors, securely stored in an isolated Vector DB.</p>
                <div className="step-metric">768-dim dense + sparse vectors</div>
              </div>

              <div className="narrative-step" id="step-query">
                <h3>4. Retrieval in Action</h3>
                <p>Select a question below to see how AthenaChat retrieves the exact context and generates an answer.</p>
                <div className="step-metric">Hybrid search, RRF fusion, ~124ms</div>
                {queryButtons}
              </div>
            </div>

            <div className="pipeline-visuals">
              <div className="canvas-container">
                <div className="canvas-ambient-dot d1" />
                <div className="canvas-ambient-dot d2" />
                <div className="canvas-ambient-dot d3" />
                <div className="canvas-ambient-dot d4" />
                <div className="canvas-ambient-dot d5" />
                <div className="canvas-ambient-dot d6" />

                <div className="sim-ingestion-stage">
                  <div className="sim-doc" id="sim-doc">
                    <FileText size={32} />
                    <span>employee_handbook.pdf</span>
                  </div>

                  <div className="sim-chunks" id="sim-chunks">
                    <div className="sim-chunk">Company overview and mission...</div>
                    <div className="sim-chunk">Employees accrue 20 days PTO...</div>
                    <div className="sim-chunk">Core hours are 10 AM to 3 PM...</div>
                    <div className="sim-chunk">Hardware requests via IT portal...</div>
                  </div>

                  <div className="sim-vectors" id="sim-vectors">
                    {VECTOR_STRINGS.map((v, i) => (
                      <div
                        className="sim-vector"
                        key={i}
                        ref={(el) => (vectorRefs.current[i] = el)}
                      >
                        {v}
                      </div>
                    ))}
                  </div>

                  <div className="sim-database" id="sim-database">
                    <div className="db-header">
                      <Database size={14} /> Isolated Vector DB
                    </div>
                    <div className="db-grid">
                      <div className="db-slot" />
                      <div className="db-slot" />
                      <div className="db-slot" />
                      <div className="db-slot" />
                    </div>
                  </div>
                </div>

                <div className="sim-retrieval-stage">
                  {chatWidget}
                  <div className="sim-floating-element" id="sim-query-vector" ref={floatingElRef} />
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  )
}

export default PipelineSimulation