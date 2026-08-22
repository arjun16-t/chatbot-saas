import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FileText, Database, Bot, Send } from 'lucide-react'
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

// Small inline SVGs for the floating element GSAP writes directly via
// innerHTML mid-timeline -- kept as raw markup (not lucide-react JSX)
// deliberately, since this one node is animation-owned, not React-owned.
const LAYERS_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
const CHECK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>'

/**
 * Pinned scroll-scrubbed pipeline theater + click-triggered retrieval
 * demo. Direct port of RagSimulation from the old home.js, split into
 * two GSAP concerns:
 *
 *  - initScrollTheater(): a single ScrollTrigger-pinned timeline the
 *    user scrubs through by scrolling (4 phases: upload, chunk,
 *    embed/store, then reveals the retrieval canvas).
 *  - handleQueryClick(): a self-contained timeline per click, animating
 *    the floating "vector" element across the canvas and injecting a
 *    chat bubble at the end.
 *
 * Both are cleaned up on unmount (kill the ScrollTrigger + any
 * in-flight timeline) -- the original vanilla version never needed
 * this since it only ever ran once globally, but a React component
 * can mount/unmount, so leaving stale instances around would leak
 * and (worse) risk duplicate pins if this ever remounts.
 */
function PipelineSimulation() {
  const scrollContainerRef = useRef(null)
  const layoutRef = useRef(null)
  const floatingElRef = useRef(null)
  const chatBodyRef = useRef(null)
  const clickTimelineRef = useRef(null)

  const [chatMessages, setChatMessages] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
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
      .to('#sim-vectors', { opacity: 1, duration: 0.5 }, '<0.2')
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
  }, [])

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
    floatingEl.innerHTML = `${LAYERS_SVG} [Query Vector]`
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
        floatingEl.innerHTML = `${CHECK_SVG} [Context Retrieved]`
        floatingEl.style.borderColor = 'var(--color-status-success)'
      })
      .to(floatingEl, { opacity: 1, x: 20, y: 40, duration: 0.6, ease: 'power2.in' })
      .to(floatingEl, { opacity: 0, duration: 0.2 })
      .call(() => {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: RAG_ANSWERS[target] }])
        floatingEl.style.borderColor = 'var(--color-accent-primary)'
      })
  }

  return (
    <section className="pipeline-section" id="how-it-works">
      <div className="pipeline-header reveal">
        <h2>How AthenaChat works</h2>
        <p>A transparent, high-performance RAG pipeline.</p>
      </div>

      <div className="pipeline-scroll-container" ref={scrollContainerRef}>
        <div className="pipeline-layout" ref={layoutRef}>

          <div className="pipeline-narrative">
            <div className="narrative-step" id="step-upload">
              <h3>1. Ingestion</h3>
              <p>Upload your knowledge base. We securely process your PDFs, docs, and text files instantly.</p>
            </div>

            <div className="narrative-step" id="step-chunk">
              <h3>2. Semantic Chunking</h3>
              <p>Documents are split into overlapping blocks, ensuring no vital context is lost at the boundaries.</p>
            </div>

            <div className="narrative-step" id="step-embed">
              <h3>3. Embedding &amp; Storage</h3>
              <p>Chunks are converted into dense and sparse vectors, securely stored in an isolated Vector DB.</p>
            </div>

            <div className="narrative-step" id="step-query">
              <h3>4. Retrieval in Action</h3>
              <p>Select a question below to see how AthenaChat retrieves the exact context and generates an answer.</p>

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
            </div>
          </div>

          <div className="pipeline-visuals">
            <div className="canvas-container">

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
                  <div className="sim-vector">[0.12, -0.84, 0.45, 0.91]</div>
                  <div className="sim-vector">[0.77, 0.22, -0.55, 0.19]</div>
                  <div className="sim-vector">[-0.41, 0.88, 0.11, 0.05]</div>
                  <div className="sim-vector">[0.33, -0.19, 0.67, -0.82]</div>
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

                <div className="sim-floating-element" id="sim-query-vector" ref={floatingElRef} />
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default PipelineSimulation