import { Zap } from 'lucide-react'

const TICKER_ITEMS = [
  { type: 'hash', label: 'INDEX', value: '#DOC_8F73B9A' },
  { type: 'vector', label: 'EMBEDDING', value: '[0.124, -0.841, 0.455, 0.912]' },
  { type: 'chunk', match: '0.98', value: '"employees accrue 20 days of Paid Time Off..."', delay: '2s' },
  { type: 'vector', label: 'EMBEDDING', value: '[-0.412, 0.881, 0.119, 0.053]' },
  { type: 'hash', label: 'SYS_STATUS', value: 'AWAITING_QUERY' },
  { type: 'chunk', match: '0.92', value: '"hardware requests are routed via IT portal..."', delay: '6s' },
  { type: 'vector', label: 'EMBEDDING', value: '[0.771, 0.224, -0.551, 0.198]' },
]

function TickerBlock({ item }) {
  if (item.type === 'chunk') {
    return (
      <div className="ticker-block chunk match-pulse" style={{ '--pulse-delay': item.delay }}>
        <div className="match-badge"><Zap size={10} /> SIMILARITY: {item.match}</div>
        <span className="block-value">{item.value}</span>
      </div>
    )
  }
  return (
    <div className={`ticker-block ${item.type}`}>
      <span className="block-label">{item.label}</span>
      <span className="block-value">{item.value}</span>
    </div>
  )
}

function TickerDivider() {
  // Rendered twice back-to-back for a seamless CSS-driven loop
  // (ticker-scroll keyframe translates exactly -50%).
  return (
    <div className="rag-ticker-divider">
      <div className="ticker-track">
        {TICKER_ITEMS.map((item, i) => <TickerBlock key={`a-${i}`} item={item} />)}
        {TICKER_ITEMS.map((item, i) => <TickerBlock key={`b-${i}`} item={item} />)}
      </div>
    </div>
  )
}

export default TickerDivider
