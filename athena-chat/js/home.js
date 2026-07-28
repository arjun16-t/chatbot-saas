/*
========================================
ORGANIZATION NOTE

Each feature below lives in its own object
(Icons, PipelineFlow, ScrollReveal) with an init()
method. initMainApp() at the bottom just calls
Feature.init() for each one, in order.

Methods refer to their own object by name
(e.g. "PipelineFlow.activateNode") instead of "this",
since each object is a singleton — this keeps
"this" out of the picture entirely, which
matters because passing "obj.method" directly
as a callback (e.g. to addEventListener) would
otherwise silently break "this" binding.
========================================
*/

/*
========================================
INITIALIZATION
========================================
*/

document.addEventListener("DOMContentLoaded", initMainApp);

function initMainApp() {
    Icons.init();
    ScrollReveal.init();
}

/*
========================================
ICONS MODULE
========================================
*/
const Icons = {
  init() {
    // Renders any <i data-lucide="..."></i> placeholders in index.html into
    // actual inline SVG icons. Must run after the Lucide CDN script has loaded.
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
};

/*
========================================
INITIALIZATION
========================================
*/
document.addEventListener("DOMContentLoaded", initMainApp);

function initMainApp() {
    Icons.init();
    RagSimulation.init(); // Replaces PipelineFlow
    ScrollReveal.init();
}

/*
========================================
INTERACTIVE RAG SIMULATION MODULE
========================================
*/
const RagSimulation = {
  init() {
    // Only run if the pipeline theater exists on the page
    if (!document.querySelector('.pipeline-scroll-container')) return;
    
    // Check for GSAP plugins
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger missing.');
      return;
    }
    
    gsap.registerPlugin(ScrollTrigger);

    RagSimulation.initScrollTheater();
    RagSimulation.initInteractiveChat();
  },

  // PHASE 1: The scroll-scrubbed ingestion timeline
  initScrollTheater() {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.pipeline-scroll-container',
        pin: '.pipeline-layout', // Pins the whole layout in place
        start: 'center center', // Starts when layout hits center of viewport
        end: '+=3000', // The user scrolls 3000px to scrub through the whole timeline
        scrub: 1, // Smooth scrubbing taking 1 second to catch up to the scrollbar
      }
    });

    // --- Step 1: Upload ---
    tl.to('#step-upload', { opacity: 1, duration: 1 })
      .fromTo('#sim-doc', { opacity: 0, scale: 0.8, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 1 }, "<")
      .to('#step-upload', { opacity: 0, duration: 1 }, "+=1.5"); // Pause briefly before fading out

    // --- Step 2: Chunking ---
    tl.to('#step-chunk', { opacity: 1, duration: 1 })
      .to('#sim-doc', { opacity: 0, scale: 0.9, duration: 0.5 }, "<")
      .to('#sim-chunks', { opacity: 1, duration: 0.5 }, "<0.2")
      // Explode the chunks slightly apart
      .fromTo('.sim-chunk', { y: 0 }, { y: (index) => (index * 15) - 20, stagger: 0.1, duration: 1, ease: "power2.out" }, "<")
      .to('#step-chunk', { opacity: 0, duration: 1 }, "+=1.5");

    // --- Step 3: Embed & Vector DB ---
    tl.to('#step-embed', { opacity: 1, duration: 1 })
      .to('#sim-chunks', { opacity: 0, scale: 0.9, duration: 0.5 }, "<")
      .to('#sim-vectors', { opacity: 1, duration: 0.5 }, "<0.2")
      // DB rises from the bottom
      .to('#sim-database', { bottom: '20%', duration: 1, ease: 'back.out(1.2)' }, "<")
      // Vectors drop into the DB
      .to('.sim-vector', { opacity: 0, y: 150, stagger: 0.15, duration: 1, ease: "power2.in" }, "+=0.5")
      // DB slots light up sequentially as vectors "hit" them
      .to('.db-slot', { backgroundColor: 'rgba(200, 134, 10, 0.15)', borderColor: 'var(--color-accent-primary)', stagger: 0.15, duration: 0.1 }, "<0.5")
      .to('#step-embed', { opacity: 0, duration: 1 }, "+=1.5");

    // --- Step 4: Final Phase (Retrieval Canvas Opens) ---
    tl.to('#step-query', { opacity: 1, duration: 1 })
      .to('.sim-ingestion-stage', { opacity: 0, duration: 1 }, "<")
      .to('.sim-retrieval-stage', { opacity: 1, duration: 1, pointerEvents: 'auto' }, "<");
  },

  // PHASE 2: The click-triggered live chat simulation
  initInteractiveChat() {
    const buttons = document.querySelectorAll('.query-btn');
    const chatBody = document.getElementById('sim-chat-body');
    const floatingElement = document.getElementById('sim-query-vector');
    
    // Simulated RAG knowledge base answers
    const ragDatabase = {
      pto: "Based on the employee handbook, team members accrue 20 days of Paid Time Off annually. Time rolls over up to 5 days.",
      hardware: "To request new hardware, please submit a ticket through the internal IT portal using the 'Hardware Provisioning' form.",
      hours: "Our core working hours are from 10:00 AM to 3:00 PM in your local timezone to ensure cross-team overlap."
    };

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        // 1. Prevent clicking multiple buttons at once
        buttons.forEach(b => b.style.pointerEvents = 'none');
        
        const questionText = btn.innerText;
        const targetId = btn.dataset.target;
        const answerText = ragDatabase[targetId];

        // 2. Clear previous chat and insert User Question
        chatBody.innerHTML = '';
        const userBubble = document.createElement('div');
        userBubble.className = 'sim-bubble user';
        userBubble.innerText = questionText;
        chatBody.appendChild(userBubble);

        // 3. GSAP Animation Sequence for Retrieval
        const retrieveTl = gsap.timeline({
          onComplete: () => {
            // Re-enable buttons when simulation is done
            buttons.forEach(b => b.style.pointerEvents = 'auto');
          }
        });

        // Setup the floating element to look like a vectorized query
        floatingElement.innerHTML = `<i data-lucide="layers"></i> [Query Vector]`;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Animate Vector flying up
        retrieveTl.fromTo(floatingElement, 
          { opacity: 0, x: 0, y: 100, scale: 0.5 }, 
          { opacity: 1, x: -60, y: -80, scale: 1, duration: 0.6, ease: "power2.out" }
        )
        // Simulate "searching" Vector DB
        .to(floatingElement, { opacity: 0.5, y: -90, duration: 0.4, yoyo: true, repeat: 1 })
        
        // Transform into Retrieved Context and fly back down
        .call(() => {
          floatingElement.innerHTML = `<i data-lucide="check-circle"></i> [Context Retrieved]`;
          floatingElement.style.borderColor = 'var(--color-status-success)';
          if (typeof lucide !== 'undefined') lucide.createIcons();
        })
        .to(floatingElement, { opacity: 1, x: 20, y: 40, duration: 0.6, ease: "power2.in" })
        .to(floatingElement, { opacity: 0, duration: 0.2 })
        
        // 4. Finally, inject the grounded AI Answer
        .call(() => {
          const aiBubble = document.createElement('div');
          aiBubble.className = 'sim-bubble ai';
          aiBubble.innerText = answerText;
          chatBody.appendChild(aiBubble);
          
          // Auto-scroll chat body
          chatBody.scrollTop = chatBody.scrollHeight;
          
          // Reset floating element style for the next click
          floatingElement.style.borderColor = 'var(--color-accent-primary)';
        });
      });
    });
  }
};

/*
========================================
SCROLL REVEAL MODULE
========================================
*/
const ScrollReveal = {
  init() {
    // Requires: GSAP core + ScrollTrigger plugin (loaded via CDN before this file).
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Single elements — hero headline, section headings, CTA band, etc.
    gsap.utils.toArray('.reveal').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Staggered groups — each direct child reveals in sequence.
    gsap.utils.toArray('.reveal-stagger').forEach((group) => {
      const children = group.children;
      gsap.fromTo(
        children,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: group,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }
};

/*
========================================
STICKY NAVBAR SCROLL STATE
========================================
*/
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  // If the user scrolls down more than 20 pixels, apply the frosted glass
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    // If they go back to the top, make it transparent again
    header.classList.remove('scrolled');
  }
});