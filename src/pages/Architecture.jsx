<<<<<<< HEAD
import { Store, Camera, Cpu, Database, Network, Monitor, User, Brain, CheckCircle, Clock } from 'lucide-react';

const ARCH_NODES = [
  {
    id: 'shop',
    icon: Store,
    title: 'Real-World Stationery Shop',
    desc: 'Physical inventory: products on shelves, daily stock movements',
    status: 'implemented',
    color: 'var(--info)',
    bgColor: 'var(--info-light)',
  },
  {
    id: 'camera',
    icon: Camera,
    title: 'Camera / Inventory Data Feed',
    desc: 'CCTV or handheld scanner captures shelf images and stock data',
    status: 'proposed',
    color: 'var(--warning)',
    bgColor: 'var(--warning-light)',
  },
  {
    id: 'preprocess',
    icon: Cpu,
    title: 'Image Pre-processing & Normalization',
    desc: 'Resize, denoise, and normalize frames before AI inference',
    status: 'proposed',
    color: 'var(--warning)',
    bgColor: 'var(--warning-light)',
  },
  {
    id: 'yolo',
    icon: Brain,
    title: 'YOLO Object Detection Engine',
    desc: 'Real-time product detection and classification from shelf images',
    status: 'proposed',
    color: 'var(--orange)',
    bgColor: 'var(--orange-light)',
    highlight: true,
  },
  {
    id: 'extract',
    icon: Cpu,
    title: 'Product Identification & Extraction',
    desc: 'Map detected objects to product catalog entries',
    status: 'proposed',
    color: 'var(--warning)',
    bgColor: 'var(--warning-light)',
  },
  {
    id: 'db',
    icon: Database,
    title: 'Inventory Database Updates',
    desc: 'Automatically sync detected quantities to the inventory store',
    status: 'implemented',
    color: 'var(--primary)',
    bgColor: 'var(--primary-light)',
  },
  {
    id: 'logic',
    icon: Network,
    title: 'Search & Decision Logic',
    desc: 'FEFO sorting, stock status calculation, expiry flagging, alerts',
    status: 'implemented',
    color: 'var(--primary)',
    bgColor: 'var(--primary-light)',
  },
  {
    id: 'ui',
    icon: Monitor,
    title: 'StationAI Web Interface',
    desc: "Dashboard, Find Item, Inventory, Expiry Alerts \u2014 what you\u2019re using now",
    status: 'implemented',
    color: 'var(--success)',
    bgColor: 'var(--success-light)',
    highlight: true,
  },
  {
    id: 'shopkeeper',
    icon: User,
    title: 'Shopkeeper Review & Verification',
    desc: 'Manual override, stock adjustments, and inventory decisions',
    status: 'implemented',
    color: 'var(--success)',
    bgColor: 'var(--success-light)',
  },
];

export default function Architecture() {
  return (
    <div className="architecture-page">
      <div className="page-header">
        <h2>AI Engine Architecture</h2>
        <p>How StationAI is designed to process inventory information — current and proposed future phases.</p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99 }}>
          <CheckCircle size={14} color="var(--success)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>Implemented</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99 }}>
          <Clock size={14} color="var(--warning)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--warning)', fontWeight: 600 }}>Proposed / Future Phase</span>
        </div>
      </div>

      {/* Main flow */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Architecture flow column */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div className="arch-flow">
            {ARCH_NODES.map((node, i) => {
              const NodeIcon = node.icon;
              return (
                <div key={node.id} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    className={`arch-node ${node.highlight ? (node.status === 'proposed' ? 'proposed' : 'current') : ''}`}
                    style={{ borderColor: node.highlight ? node.color + '66' : undefined }}
                  >
                    <div className="arch-node-icon" style={{ background: node.bgColor }}>
                      <NodeIcon size={20} color={node.color} />
                    </div>
                    <div className="arch-node-content">
                      <div className="arch-node-title">{node.title}</div>
                      <div className="arch-node-desc">{node.desc}</div>
                    </div>
                    <span className={`arch-badge ${node.status}`}>
                      {node.status === 'proposed' ? 'Proposed' : 'Live'}
                    </span>
                  </div>
                  {i < ARCH_NODES.length - 1 && (
                    <div className="arch-arrow">
                      <div className="arch-arrow-line" />
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 1L7 7L13 1" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Feedback loop */}
            <div style={{
              marginTop: 16, width: '100%',
              border: '1px dashed rgba(245,158,11,0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: '1rem' }}>🔁</span>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--warning)' }}>Manual Correction & Verification Loop</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Shopkeeper reviews AI decisions and provides corrections that improve the model over time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Side notes column */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <div className="card" style={{ border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Monitor size={16} /> Current Status
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              This interface is a <strong style={{ color: 'var(--text-primary)' }}>functional frontend prototype</strong> built to demonstrate the full UX flow and data model.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
              The inventory data, stock tracking, expiry management, and FEFO logic are <strong style={{ color: 'var(--success)' }}>fully implemented</strong> using a demo dataset.
            </p>
          </div>

          <div className="card" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={16} /> AI Vision Phase
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The YOLO computer vision pipeline is a <strong style={{ color: 'var(--warning)' }}>proposed future phase</strong>. It is not actively running in this prototype.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
              When integrated, the AI camera feed will automatically detect products on shelves and update stock quantities without manual entry.
            </p>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              Technology Stack
            </h4>
            {[
              { label: 'Frontend', value: 'React + Vite', status: 'implemented' },
              { label: 'State', value: 'React Context + localStorage', status: 'implemented' },
              { label: 'AI Vision', value: 'YOLO v8 (proposed)', status: 'proposed' },
              { label: 'Backend API', value: 'REST API (planned)', status: 'proposed' },
              { label: 'Database', value: 'PostgreSQL (planned)', status: 'proposed' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</div>
                </div>
                <span className={`arch-badge ${item.status}`} style={{ fontSize: '0.6rem' }}>
                  {item.status === 'proposed' ? 'Planned' : 'Live'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
=======
import { Network, ArrowDown, Database, Cpu, Brain, ArrowDownCircle, Store, Smartphone } from 'lucide-react';

export default function Architecture() {
    return (
        <div>
            <div className="page-header">
                <h2>AI Engine Architecture</h2>
                <p>How StationAI uses Computer Vision to maintain real-time inventory tracking.</p>
            </div>

            <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
                <div className="flow-diagram">

                    <div className="flow-node">
                        <Store size={32} style={{ margin: '0 auto 12px', color: 'var(--text-primary)' }} />
                        REAL-WORLD STATIONERY SHOP
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node">
                        Camera / Inventory Data Feed
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node">
                        Image Pre-processing & Normalization
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node highlight">
                        <Brain size={32} style={{ margin: '0 auto 12px' }} />
                        <div>YOLO Object Detection</div>
                        <div style={{ fontSize: '0.75rem', marginTop: 8, fontWeight: 'normal', opacity: 0.9 }}>
                            (Proposed / Future Phase Architecture)
                        </div>
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node">
                        <Cpu size={24} style={{ margin: '0 auto 8px' }} />
                        Product Identification & extraction
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node">
                        <Database size={24} style={{ margin: '0 auto 8px' }} />
                        Inventory Database Updates
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node">
                        <Network size={24} style={{ margin: '0 auto 8px' }} />
                        Search / Decision Logic
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node highlight" style={{ background: 'var(--bg-primary)', color: 'var(--primary)' }}>
                        StationAI Web Interface
                    </div>

                    <div className="flow-arrow">
                        <div className="flow-line"></div>
                        <ArrowDown size={20} />
                    </div>

                    <div className="flow-node">
                        <Smartphone size={32} style={{ margin: '0 auto 12px', color: 'var(--text-primary)' }} />
                        SHOPKEEPER
                    </div>

                    {/* Feedback loop representation */}
                    <div className="feedback-loop">
                        <div className="feedback-label">
                            Manual correction & verification loop
                        </div>
                        <ArrowDownCircle size={24} style={{ position: 'absolute', top: -14, left: 12, transform: 'rotate(180deg)', color: 'var(--warning)', background: 'var(--bg-secondary)', borderRadius: '50%' }} />
                    </div>

                </div>

                <div style={{ marginTop: 40, padding: 24, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
                        <Database size={18} /> Architecture Note
                    </h4>
                    <p style={{ marginTop: 8, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        This website is currently a prototype interface built to demonstrate the UX flow and backend integration structure.
                        The YOLO computer vision backend will be introduced in a future release to act as the primary data feed.
                        Currently, the interface renders demo inventory data to mimic real-time states.
                    </p>
                </div>
            </div>
        </div>
    );
>>>>>>> origin/main
}
