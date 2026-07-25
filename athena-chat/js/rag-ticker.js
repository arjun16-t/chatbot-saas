/**
 * RAG Ticker — animated simulation of AthenaChat's document ingestion
 * and query/retrieval pipeline. Runs inside the SVG diagram markup in
 * index.html (element IDs referenced below must match that markup).
 *
 * Requires: GSAP core + MotionPathPlugin (loaded via CDN in index.html
 * before this file).
 */

gsap.registerPlugin(MotionPathPlugin);

const svgEl = document.querySelector('.ticker-diagram svg');
const svgNS = 'http://www.w3.org/2000/svg';

/**
 * Fills a label's text and resizes its background rect to fit, so short
 * labels and long quoted sentences both render cleanly without a
 * hardcoded width per piece of copy.
 *
 * Args:
 *   id: element ID of the label's <g> wrapper
 *   text: the string to display
 */
function setLabel(id, text) {
  const g = document.getElementById(id);
  const textEl = g.querySelector('.rt-label-text');
  const rectEl = g.querySelector('.rt-label-bg');
  textEl.textContent = text;
  const bbox = textEl.getBBox();
  const padX = 14, padY = 8;
  rectEl.setAttribute('x', bbox.x - padX);
  rectEl.setAttribute('y', bbox.y - padY);
  rectEl.setAttribute('width', bbox.width + padX * 2);
  rectEl.setAttribute('height', bbox.height + padY * 2);
}

function showLabel(id, text) {
  setLabel(id, text);
  gsap.to(`#${id}`, { opacity: 1, duration: 0.4, ease: 'power2.out' });
}

function hideLabel(id) {
  gsap.to(`#${id}`, { opacity: 0, duration: 0.3, ease: 'power2.in' });
}

/**
 * Spawns one traveling dot per <path> inside the given connector group,
 * animates each along its path, then removes the dot. Multiple paths
 * (the "fan"/"parallel" sections) get a slight stagger so they read as
 * one bundle of data moving together.
 *
 * Args:
 *   groupId: element ID of the <g> wrapping the connector <path>s
 *   duration: seconds for the dot to traverse its path
 */
function firePulses(groupId, duration = 0.9) {
  const group = document.getElementById(groupId);
  const paths = group.querySelectorAll('path');
  paths.forEach((path, i) => {
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', 4);
    dot.setAttribute('class', 'rt-pulse');
    svgEl.appendChild(dot);
    gsap.to(dot, {
      motionPath: { path: path, alignOrigin: [0.5, 0.5] },
      duration: duration,
      delay: i * 0.06,
      ease: 'power1.inOut',
      onComplete: () => dot.remove()
    });
  });
}

/**
 * The master timeline: ingestion pipeline plays once, pauses, then the
 * query pipeline plays, pauses, then loops back to ingestion forever.
 */
function buildTicker() {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });

  // ---- INGESTION ----
  tl.call(() => showLabel('label-document', 'returns-policy.pdf'));
  tl.to({}, { duration: 1.1 });
  tl.call(() => { hideLabel('label-document'); firePulses('conn-doc-chunk'); });
  tl.to({}, { duration: 1.1 });
  tl.call(() => showLabel('label-chunking', 'Splitting into 8 chunks'));
  tl.to({}, { duration: 1 });
  tl.call(() => { hideLabel('label-chunking'); firePulses('conn-chunk-embed'); });
  tl.to({}, { duration: 1 });
  tl.call(() => showLabel('label-embed-ingest', 'Embedding chunks'));
  tl.to({}, { duration: 1 });
  tl.call(() => { hideLabel('label-embed-ingest'); firePulses('conn-embed-vdb'); });
  tl.to({}, { duration: 1 });
  tl.call(() => showLabel('label-vectordb', 'Indexed for Bloom & Co.'));
  tl.to({}, { duration: 1.8 });
  tl.call(() => hideLabel('label-vectordb'));

  // ---- QUERY ----
  tl.call(() => showLabel('label-query', '"How long do I have to return an item?"'));
  tl.to({}, { duration: 1.3 });
  tl.call(() => { hideLabel('label-query'); firePulses('conn-query-embed'); });
  tl.to({}, { duration: 0.9 });
  tl.call(() => showLabel('label-embed-query', 'Embedding question'));
  tl.to({}, { duration: 1 });
  tl.call(() => {
    hideLabel('label-embed-query');
    firePulses('conn-embed-retrieve');
    firePulses('conn-vdb-retrieve', 1.1);
  });
  tl.to({}, { duration: 1.3 });
  tl.call(() => showLabel('label-retrieve', '3 matching chunks found'));
  tl.to({}, { duration: 1.1 });
  tl.call(() => { hideLabel('label-retrieve'); firePulses('conn-retrieve-augment'); });
  tl.to({}, { duration: 1 });
  tl.call(() => showLabel('label-augment', 'Building context'));
  tl.to({}, { duration: 1 });
  tl.call(() => { hideLabel('label-augment'); firePulses('conn-augment-generate'); });
  tl.to({}, { duration: 1 });
  tl.call(() => showLabel('label-generate', '"You can return items within 30 days of purchase."'));
  tl.to({}, { duration: 2.4 });
  tl.call(() => hideLabel('label-generate'));

  return tl;
}

buildTicker();