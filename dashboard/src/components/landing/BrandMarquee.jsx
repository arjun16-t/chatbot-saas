import { Sparkles } from 'lucide-react'

const ITEMS = Array.from({ length: 3 })

function BrandMarquee() {
  // Rendered twice back-to-back for a seamless CSS loop (brand-scroll
  // keyframe translates exactly -50%), same pattern as TickerDivider.
  return (
    <div className="brand-marquee-section">
      <div className="brand-marquee-track">
        {ITEMS.map((_, i) => (
          <div className="brand-marquee-item" key={`a-${i}`}>
            <span>AthenaChat</span>
            <Sparkles size={48} />
          </div>
        ))}
        {ITEMS.map((_, i) => (
          <div className="brand-marquee-item" key={`b-${i}`}>
            <span>AthenaChat</span>
            <Sparkles size={48} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default BrandMarquee
