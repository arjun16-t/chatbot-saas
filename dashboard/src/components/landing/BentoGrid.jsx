import { Shield, Briefcase, Folder, FolderLock, Zap, Cpu, BarChart2 } from 'lucide-react'

function BentoGrid() {
  return (
    <section className="bento-section" id="features">
      <div className="bento-header">
        <h2>Enterprise-grade infrastructure.</h2>
        <p>Built for scale, speed, and absolute precision.</p>
      </div>

      <div className="bento-grid">

        {/* Card 1: Multi-Tenancy */}
        <div className="bento-card span-2 group">
          <div className="bento-content">
            <div className="bento-icon"><Shield size={20} /></div>
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

        {/* Card 4: Analytics */}
        <div className="bento-card span-2 group">
          <div className="bento-content">
            <div className="bento-icon"><BarChart2 size={20} /></div>
            <h3>Advanced Analytics</h3>
            <p>Monitor hit rates, track overall accuracy, and instantly identify unanswered queries to patch documentation gaps.</p>
          </div>
          <div className="bento-visual visual-analytics">
            <div className="chart-col">
              <div className="bar hit" style={{ '--target-height': '98%' }} />
              <span>Hits</span>
            </div>
            <div className="chart-col">
              <div className="bar miss" style={{ '--target-height': '15%' }} />
              <span>Misses</span>
            </div>
            <div className="chart-col">
              <div className="bar gap" style={{ '--target-height': '4%' }} />
              <span>Gaps</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

export default BentoGrid
