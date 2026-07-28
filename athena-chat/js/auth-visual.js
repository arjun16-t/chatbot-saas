/**
 * Cursor-reactive gradient blobs for the auth pages' visual panel.
 * Each blob drifts toward the cursor position at a different strength,
 * so nearer/"lower" blobs move more than farther ones — a cheap but
 * convincing parallax depth effect. Falls back to the CSS idle-float
 * keyframe (already running regardless) when the cursor isn't over
 * the panel, so it's never fully static either way.
 */

document.addEventListener('DOMContentLoaded', () => {

  const panel = document.getElementById('overlay-container');
  if (!panel) return;

  const blobs = [
    { el: document.getElementById('blob-1'), strength: 70 },
    { el: document.getElementById('blob-2'), strength: 110 },
    { el: document.getElementById('blob-3'), strength: 50 },
  ].filter((b) => b.el);

  if (!blobs.length) return;

  // gsap.quickTo gives a performant, reusable tween function per blob —
  // far cheaper than calling gsap.to() fresh on every mousemove event
  const movers = blobs.map((b) => ({
    x: gsap.quickTo(b.el, 'x', { duration: 0.5, ease: 'power2.out' }),
    y: gsap.quickTo(b.el, 'y', { duration: 0.5, ease: 'power2.out' }),
    strength: b.strength,
  }));

  panel.addEventListener('mousemove', (e) => {
    const rect = panel.getBoundingClientRect();
    // Normalize cursor position to -1..1 relative to the panel's center
    const relX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const relY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    movers.forEach((m) => {
      m.x(relX * m.strength);
      m.y(relY * m.strength);
    });
  });

  panel.addEventListener('mouseleave', () => {
    movers.forEach((m) => {
      m.x(0);
      m.y(0);
    });
  });

});