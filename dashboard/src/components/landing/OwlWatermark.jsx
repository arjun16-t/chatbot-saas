/**
 * Very low-opacity owl silhouette for the dark CTA section's
 * background -- leaning into the brand's own actual mythology
 * (Athena's owl, matching AthenaBot.png) rather than a generic
 * decorative pattern.
 *
 * Simplified single-path silhouette approximating the real logo's
 * angular, faceted character (flared pointed ear tufts, center
 * diamond crest, kite-shaped eyes, diamond beak, V-tapered body) --
 * not a pixel-faithful trace, since at ~4% opacity fine detail
 * wouldn't read anyway. The eye/beak "cutouts" use a hardcoded
 * #0a0a0a fill matching the CTA section's own background, mirroring
 * the real logo's own negative-space eye/beak technique -- this
 * component is specific to that dark context, not general-purpose.
 */
function OwlWatermark() {
  return (
    <svg className="owl-watermark" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Outer silhouette: flared ears, center crest, tapered body */}
      <path
        d="M70 40 L130 140 L170 110 L200 70 L230 110 L270 140 L330 40
           L340 180 L320 260 L300 300 L200 370 L100 300 L80 260 L60 180 Z"
        fill="currentColor"
      />
      {/* Kite-shaped eyes */}
      <path d="M130 188 L172 222 L130 262 L98 222 Z" fill="#0a0a0a" />
      <path d="M270 188 L302 222 L270 262 L228 222 Z" fill="#0a0a0a" />
      {/* Diamond beak */}
      <path d="M200 254 L216 276 L200 298 L184 276 Z" fill="#0a0a0a" />
    </svg>
  )
}

export default OwlWatermark