/**
 * Scroll-reveal system. Any element with class="reveal" starts hidden
 * (slightly below + transparent) and animates up-and-in once it enters
 * the viewport. Wrap a group of elements in class="reveal-stagger" to
 * have their DIRECT CHILDREN reveal one after another instead of all
 * at once — used for grids (steps, features) so they read as a
 * sequence, matching the reference site's staggered card reveals.
 *
 * Requires: GSAP core + ScrollTrigger plugin (loaded via CDN before
 * this file).
 */

gsap.registerPlugin(ScrollTrigger);

function initScrollReveal() {
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

initScrollReveal();