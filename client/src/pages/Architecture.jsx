import { Store, Camera, Cpu, Database, Network, Monitor, User, Brain, CheckCircle, Clock, AlertCircle, RefreshCw, Server, ShieldCheck } from 'lucide-react';

const ARCH_FLOW_STEPS = [
  {
    id: 'shop',
    icon: Store,
    title: '1. Stationery Shop Environment',
    desc: 'Physical retail store environment with categorized shelves (A, B, C, D) holding stationery inventory.',
    status: 'implemented',
    badgeText: 'Live / Operational',
    color: 'var(--info)',
    bgColor: 'var(--info-light)',
  },
  {
    id: 'ui',
    icon: Monitor,
    title: '2. React Frontend Interface',
    desc: 'Responsive web interface for shopkeeper item search, voice search, inventory management, shelf routing, and alerts.',
    status: 'implemented',
    badgeText: 'React + JavaScript',
    color: 'var(--primary)',
    bgColor: 'var(--primary-light)',
    highlight: true,
  },
  {
    id: 'api',
    icon: Server,
    title: '3. Express.js REST API Backend',
    desc: 'Node.js Express backend API with JWT authentication middleware, CORS protection, role authorization, and modular controllers.',
    status: 'implemented',
    badgeText: 'Node.js + Express REST',
    color: 'var(--success)',
    bgColor: 'var(--success-light)',
    highlight: true,
  },
  {
    id: 'db',
    icon: Database,
    title: '4. Relational Database',
    desc: 'Persistent relational database (PostgreSQL / Supabase with local SQLite fallback) storing 8 core tables with foreign key constraints.',
    status: 'implemented',
    badgeText: 'PostgreSQL / SQLite',
    color: 'var(--success)',
    bgColor: 'var(--success-light)',
  },
  {
    id: 'logic',
    icon: Network,
    title: '5. Search & Inventory Engine',
    desc: 'Multi-attribute partial matching, FEFO batch expiry calculation, stock transactions tracking, and auto-notification dispatch.',
    status: 'implemented',
    badgeText: 'Live REST Services',
    color: 'var(--primary)',
    bgColor: 'var(--primary-light)',
  },
  {
    id: 'yolo',
    icon: Brain,
    title: '6. AI Computer Vision Pipeline',
    desc: 'Future extension for shelf-mounted camera automated stock counting via YOLO object detection.',
    status: 'proposed',
    badgeText: 'Proposed AI Phase',
    color: 'var(--warning)',
    bgColor: 'var(--warning-light)',
  }
];

export default function Architecture() {
  return (
    <div className="architecture-page">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="badge-primary-soft">Production Full-Stack System Architecture</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>StationAI Infrastructure</span>
        </div>
        <h2>StationAI Architecture & Data Pipeline</h2>
        <p>End-to-end full-stack data flow connecting React UI to Express REST API, relational database, and shopkeeper shelf locator.</p>
      </div>

      {/* DISCLAIMER BANNER */}
      <div className="card mb-4" style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <ShieldCheck size={24} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ margin: '0 0 6px', color: 'var(--success)', fontSize: '1rem', fontWeight: 700 }}>
              Full-Stack Application Architecture
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong>1. Production Backend:</strong> Node.js Express REST API server with JWT authentication, bcrypt password encryption, and role-based permissions (ADMIN / STAFF).
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong>2. Persistent Database:</strong> 8 relational tables (users, products, inventory, batches, stock_transactions, search_history, feedback, notifications) with full CRUD & stock transaction logging.
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99 }}>
          <CheckCircle size={14} color="var(--success)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>Active Full-Stack Architecture</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99 }}>
          <Clock size={14} color="var(--warning)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--warning)', fontWeight: 600 }}>Proposed Computer Vision Extension</span>
        </div>
      </div>

      {/* Main Flow Layout */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Architecture Flow Column */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="arch-flow">
            {ARCH_FLOW_STEPS.map((node, i) => {
              const NodeIcon = node.icon;
              return (
                <div key={node.id} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    className={`arch-node ${node.highlight ? 'current' : ''}`}
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
                      {node.badgeText}
                    </span>
                  </div>

                  {i < ARCH_FLOW_STEPS.length - 1 && (
                    <div className="arch-arrow">
                      <div className="arch-arrow-line" />
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 1L7 7L13 1" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Feedback Loop Back */}
            <div style={{
              marginTop: 18,
              width: '100%',
              border: '1px dashed rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <RefreshCw size={24} color="var(--success)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--success)' }}>
                  Persistent Database & Feedback Integration
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Every search query, feedback submission, and stock change is stored in relational database tables in real-time.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Notes Column */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          {/* Production System Summary */}
          <div className="card" style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={16} /> Backend API Specifications
            </h4>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
              <li><strong>REST API:</strong> Node.js Express server on port 5000</li>
              <li><strong>Database:</strong> PostgreSQL / SQLite relational store</li>
              <li><strong>Auth:</strong> JWT Bearer token + bcrypt encryption</li>
              <li><strong>Search:</strong> Multi-attribute keyword matching with history logging</li>
              <li><strong>Stock Logic:</strong> FEFO expiry deduction & auto-notifications</li>
            </ul>
          </div>

          {/* Technology Stack */}
          <div className="card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              Implementation Matrix
            </h4>
            {[
              { label: 'Frontend Framework', value: 'React + Vite (JavaScript)', status: 'implemented' },
              { label: 'Backend Server', value: 'Node.js Express REST API', status: 'implemented' },
              { label: 'Database', value: 'PostgreSQL / SQLite Relational DB', status: 'implemented' },
              { label: 'Authentication', value: 'JWT + bcryptjs Password Hashing', status: 'implemented' },
              { label: 'Voice Search', value: 'Web Speech API (Browser Native)', status: 'implemented' },
              { label: 'Computer Vision', value: 'YOLOv8 Engine (Proposed)', status: 'proposed' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</div>
                </div>
                <span className={`arch-badge ${item.status}`} style={{ fontSize: '0.62rem' }}>
                  {item.status === 'proposed' ? 'Proposed' : 'Implemented'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── REVIEW & EVALUATION: WHAT WAS DONE WELL / AREAS TO IMPROVE & NEXT STEPS ── */}
      <div style={{
        marginTop: 32,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        alignItems: 'stretch',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Card 1: What Was Done Well */}
        <div className="card" style={{
          padding: '24px',
          borderRadius: '14px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, var(--bg-card) 100%)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, minHeight: 40 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckCircle size={20} color="var(--success)" />
            </div>
            <h3 style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              What Was Done Well
            </h3>
          </div>

          {/* Bullet Items */}
          <ul style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            flex: 1
          }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Full-stack production architecture with Node.js Express REST API and persistent relational database (PostgreSQL / SQLite).</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Secure authentication with JWT token handling, bcrypt password hashing, and role-based access control (Admin / Staff).</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>End-to-end stock transactions with FEFO batch expiry calculation, live POS checkout, and automatic notification triggers.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Multi-attribute search and physical shelf location mapping (Shelf, Row, Column) with Web Speech API voice search.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Areas to Improve & Next Steps */}
        <div className="card" style={{
          padding: '24px',
          borderRadius: '14px',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 100%)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, minHeight: 40 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertCircle size={20} color="var(--warning)" />
            </div>
            <h3 style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              Areas to Improve & Next Steps
            </h3>
          </div>

          {/* Bullet Items */}
          <ul style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            flex: 1
          }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--warning)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Implement the proposed YOLOv8 computer vision pipeline for automated shelf stock counting via shelf cameras.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--warning)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Integrate physical barcode and QR code scanner hardware support for faster POS item scanning.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--warning)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Add multi-store synchronization and cloud database replication for distributed retail chains.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--warning)',
                marginTop: 8,
                flexShrink: 0
              }} />
              <span>Automate vendor purchase order generation when inventory crosses critical low-stock thresholds.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
