import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { shelves } from '../data';

export default function LoadStockModal({ product, onClose }) {
    const { loadStockBatch } = useStock();
    const [formData, setFormData] = useState({
        batchId: '',
        quantity: 1,
        loadedDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        supplier: '',
        shelf: product.shelf,
        row: product.row,
        column: product.column
    });

    const [error, setError] = useState('');

    if (!product) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.quantity <= 0) {
            setError('Quantity must be greater than 0.');
            return;
        }
        if (!formData.batchId.trim()) {
            setError('Batch number is required.');
            return;
        }
        if (!formData.loadedDate) {
            setError('Loaded date is required.');
            return;
        }
        if (product.expiryTracking && !formData.expiryDate) {
            setError('Expiry date is required for this product.');
            return;
        }
        if (product.expiryTracking && formData.expiryDate < formData.loadedDate) {
            setError('Expiry date cannot be before loaded date.');
            return;
        }

        const compiledBatch = {
            batchId: formData.batchId,
            quantityLoaded: Number(formData.quantity),
            currentQuantity: Number(formData.quantity),
            loadedDate: formData.loadedDate,
            expiryDate: product.expiryTracking ? formData.expiryDate : null,
            supplier: formData.supplier,
            shelf: formData.shelf,
            row: formData.row,
            column: formData.column
        };

        loadStockBatch(product.id, compiledBatch);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>

                <div className="modal-header">
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Load New Stock</h2>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: 20 }}>
                        <strong>Product:</strong> {product.name}
                        {product.expiryTracking && <span style={{ marginLeft: 12, padding: '2px 8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.75rem', borderRadius: 4, fontWeight: 600 }}>EXPIRY TRACKED</span>}
                    </div>

                    {error && <div className="text-danger mb-4" style={{ fontSize: '0.85rem', fontWeight: 500 }}>⚠ {error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Batch Number *</label>
                                <input className="form-input" placeholder="e.g. GL-2026-04" value={formData.batchId} onChange={e => setFormData({ ...formData, batchId: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Quantity *</label>
                                <input className="form-input" type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Date Loaded *</label>
                                <input className="form-input" type="date" value={formData.loadedDate} onChange={e => setFormData({ ...formData, loadedDate: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Expiry Date {product.expiryTracking ? '*' : '(Not Applicable)'}</label>
                                <input className="form-input" type="date" disabled={!product.expiryTracking} required={product.expiryTracking} value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <label className="form-label">Supplier (Optional)</label>
                            <input className="form-input" placeholder="e.g. ABC Stationery" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Shelf *</label>
                                <select className="form-input" value={formData.shelf} onChange={e => setFormData({ ...formData, shelf: e.target.value })}>
                                    {shelves.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Row *</label>
                                <input className="form-input" value={formData.row} onChange={e => setFormData({ ...formData, row: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Column *</label>
                                <input className="form-input" value={formData.column} onChange={e => setFormData({ ...formData, column: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex-between mt-4">
                            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary"><Calendar size={16} /> Load Stock</button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
