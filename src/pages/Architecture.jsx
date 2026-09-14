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
}
