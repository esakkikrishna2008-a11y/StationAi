import React, { useState } from 'react';
import {
  X, Printer, CheckCircle2, RotateCcw, ArrowLeft, Store,
  Calendar, CreditCard, Banknote, QrCode, ShieldCheck, Download,
  AlertTriangle, UserCheck, Phone, Check, RefreshCw, XCircle
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';

export default function InvoiceModal({
  bill,
  isSuccessScreen = false,
  onClose,
  onNewBill,
  onReturnSuccess,
  onVoidSuccess
}) {
  const { processReturn, voidBill, addToast } = useStock();
  const { user } = useAuth();

  // Print mode: 'standard' (A4) or 'thermal' (80mm)
  const [printMode, setPrintMode] = useState('standard');

  // Return sub-modal
  const [returnItemModal, setReturnItemModal] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('Customer returned item');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState('');

  // Void sub-modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('Customer cancelled / Billing error');
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);
  const [voidError, setVoidError] = useState('');

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Standard clean browser print-to-pdf prompt
    window.print();
  };

  const handleOpenReturn = (item) => {
    setReturnItemModal(item);
    setReturnQty(1);
    setReturnReason('Customer returned item');
    setReturnError('');
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnItemModal) return;

    try {
      setIsSubmittingReturn(true);
      setReturnError('');
      await processReturn(bill.id, {
        billItemId: returnItemModal.id,
        returnQuantity: parseInt(returnQty, 10),
        reason: returnReason
      });

      setReturnItemModal(null);
      if (onReturnSuccess) {
        onReturnSuccess();
      }
    } catch (err) {
      setReturnError(err.message || 'Return failed');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingVoid(true);
      setVoidError('');
      await voidBill(bill.id, { reason: voidReason });
      setShowVoidModal(false);
      if (onVoidSuccess) {
        onVoidSuccess();
      } else if (onClose) {
        onClose();
      }
    } catch (err) {
      setVoidError(err.message || 'Voiding bill failed');
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  const formattedDate = bill.createdAt
    ? new Date(bill.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : new Date().toLocaleString('en-IN');

  const items = bill.items || [];
  const shopName = bill.shop?.name || 'StationAI Central Mart';
  const isVoided = bill.status === 'Voided';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card invoice-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: printMode === 'thermal' ? '420px' : '700px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Modal Action Header (Hidden during Print) */}
        <div className="modal-header no-print" style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: isSuccessScreen ? 'var(--success-bg)' : isVoided ? 'var(--danger-bg)' : 'var(--primary-bg)',
              color: isSuccessScreen ? 'var(--success)' : isVoided ? 'var(--danger)' : 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isSuccessScreen ? <CheckCircle2 size={20} /> : isVoided ? <XCircle size={20} /> : <Store size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {isSuccessScreen ? '✓ Bill Created Successfully' : 'Customer Invoice & Receipt'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {bill.billingId}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Thermal / Standard View Toggle */}
            <button
              className={`btn btn-xs ${printMode === 'thermal' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPrintMode(printMode === 'thermal' ? 'standard' : 'thermal')}
              title="Toggle Thermal Receipt View (80mm POS)"
            >
              {printMode === 'thermal' ? '📄 A4 Format' : '🧾 Thermal (80mm)'}
            </button>

            <button className="btn btn-outline btn-sm" onClick={handlePrint} title="Print Bill">
              <Printer size={15} /> Print
            </button>

            <button className="btn-close" onClick={onClose} aria-label="Close invoice">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="invoice-printable-area" style={{ overflowY: 'auto', padding: printMode === 'thermal' ? '18px' : '24px 28px', flex: 1 }}>
          
          {/* Success Banner if freshly billed */}
          {isSuccessScreen && (
            <div className="no-print" style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--success)',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Bill #{bill.billingId} Generated</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock updated in database successfully.</div>
                </div>
              </div>
              <strong style={{ fontSize: '1.2rem', fontFamily: 'monospace' }}>₹{Number(bill.grandTotal || 0).toFixed(2)}</strong>
            </div>
          )}

          {/* Voided Banner if bill is cancelled */}
          {isVoided && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem' }}>THIS BILL IS VOIDED</strong>
                <span style={{ fontSize: '0.78rem' }}>
                  Reason: {bill.voidedReason || 'Cancelled by Store Admin'}
                  {bill.voidedByName && ` · Voided by: ${bill.voidedByName}`}
                  {bill.voidedAt && ` · Date: ${new Date(bill.voidedAt).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          )}

          {/* ── SHOP RECEIPT HEADER ── */}
          <div style={{ textAlign: 'center', marginBottom: 18, borderBottom: '2px dashed var(--border)', paddingBottom: 14 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6, background: 'var(--primary)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Store size={15} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em' }}>STATIONAI</h2>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{shopName}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Premium Stationery & Commercial Office Supplies
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Phone: +91 98765 43210 · GSTIN: 29AAAAA0000A1Z5
            </div>
          </div>

          {/* ── BILL META DETAILS (GRID) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: printMode === 'thermal' ? '1fr' : 'repeat(2, 1fr)',
            gap: 10,
            background: 'var(--bg-secondary)',
            padding: '12px 14px',
            borderRadius: '8px',
            marginBottom: 18,
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Bill ID:</span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                {bill.billingId}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Date & Time:</span>
              <span>{formattedDate}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Customer:</span>
              <span style={{ fontWeight: 700 }}>
                {bill.customerName || 'Walk-in Customer'} {bill.customerPhone ? `(${bill.customerPhone})` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Payment Method:</span>
              <span style={{ fontWeight: 700 }}>
                {bill.paymentMethod || 'Cash'}
                {bill.transactionRef ? ` · Ref: ${bill.transactionRef}` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Cashier:</span>
              <span>{bill.cashierName || 'Store Admin'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
              <span className={`status-badge ${bill.status === 'Completed' ? 'in' : bill.status === 'Voided' ? 'out' : 'low'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {bill.status || 'Completed'}
              </span>
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <div style={{ marginBottom: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Item</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Total</th>
                  <th className="no-print" style={{ padding: '8px 4px', textAlign: 'right', width: 65 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const availableForReturn = it.availableForReturn !== undefined
                    ? it.availableForReturn
                    : Math.max(0, it.quantity - (it.returnedQuantity || 0));

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{it.productName || it.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {it.sku && <span>SKU: {it.sku}</span>}
                          {it.locationCode && <span> · Loc: {it.locationCode}</span>}
                        </div>
                        
                        {/* Live Inventory Impact Breakdown */}
                        {it.inventoryImpact && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: 2, fontFamily: 'monospace' }}>
                            📊 Stock: {it.inventoryImpact.previousStock} → {it.inventoryImpact.newStock} ({it.inventoryImpact.difference} units)
                          </div>
                        )}

                        {it.returnedQuantity > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 2, fontWeight: 700 }}>
                            ↩ {it.returnedQuantity} returned to inventory
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{Number(it.unitPrice || it.price).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>
                        {it.quantity}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                        ₹{Number(it.totalPrice || (it.unitPrice * it.quantity)).toFixed(2)}
                      </td>
                      <td className="no-print" style={{ padding: '8px 4px', textAlign: 'right' }}>
                        {!isVoided && availableForReturn > 0 && onReturnSuccess && (
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleOpenReturn(it)}
                            title="Return item back to stock"
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                          >
                            <RotateCcw size={11} /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── TOTALS BREAKDOWN ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            marginLeft: 'auto',
            width: printMode === 'thermal' ? '100%' : '260px',
            fontSize: '0.84rem',
            borderTop: '1px solid var(--border)',
            paddingTop: 10,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: 'monospace' }}>₹{Number(bill.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(bill.discount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>Discount:</span>
                <span style={{ fontFamily: 'monospace' }}>-₹{Number(bill.discount).toFixed(2)}</span>
              </div>
            )}
            {Number(bill.tax || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Tax:</span>
                <span style={{ fontFamily: 'monospace' }}>+₹{Number(bill.tax).toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
              borderTop: '2px solid var(--border)',
              paddingTop: 6,
              marginTop: 4
            }}>
              <span>GRAND TOTAL:</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                ₹{Number(bill.grandTotal || 0).toFixed(2)}
              </span>
            </div>

            {/* Cash details if paid by Cash */}
            {bill.paymentMethod === 'Cash' && bill.cashReceived > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                <span>Cash Received: ₹{Number(bill.cashReceived).toFixed(2)}</span>
                <span>Change: ₹{Number(bill.changeAmount || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* ── FOOTER NOTE ── */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            borderTop: '1px dashed var(--border)',
            paddingTop: 14
          }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700 }}>Thank you for shopping at StationAI!</p>
            <p style={{ margin: 0 }}>Goods can be returned within 7 days with this bill.</p>
          </div>
        </div>

        {/* Modal Actions Footer (Hidden during Print) */}
        <div className="modal-footer no-print" style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onNewBill && (
              <button className="btn btn-primary" onClick={onNewBill} style={{ fontWeight: 800 }}>
                + New Bill
              </button>
            )}

            {/* Void Button (Admin authorization) */}
            {!isVoided && isAdmin && !isSuccessScreen && (
              <button
                className="btn btn-outline"
                onClick={() => setShowVoidModal(true)}
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.35)', fontSize: '0.82rem' }}
                title="Cancel / Void this bill and restore stock"
              >
                <XCircle size={15} /> Void Bill
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-outline" onClick={handleDownloadPDF} title="Download PDF or Print">
              <Download size={15} /> Download PDF
            </button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ fontWeight: 700 }}>
              <Printer size={15} /> Print Bill
            </button>
          </div>
        </div>
      </div>

      {/* ── VOID BILL CONFIRMATION SUB-MODAL ── */}
      {showVoidModal && (
        <div className="confirm-dialog-overlay" onClick={() => setShowVoidModal(false)} style={{ zIndex: 1200 }}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} role="dialog">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Void Bill #{bill.billingId}?</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Stock Restoration</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Voiding this bill will mark it as <strong>VOIDED</strong> and automatically restore all sold quantities back to inventory stock.
            </p>

            {voidError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>
                {voidError}
              </div>
            )}

            <form onSubmit={handleConfirmVoid}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Reason for Voiding Bill:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Customer cancelled order, incorrect billing"
                  required
                />
              </div>

              <div className="confirm-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowVoidModal(false)}
                  disabled={isSubmittingVoid}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isSubmittingVoid}
                  style={{ fontWeight: 800 }}
                >
                  {isSubmittingVoid ? 'Voiding & Restoring Stock...' : 'Confirm Void & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RETURN ITEM SUB-MODAL ── */}
      {returnItemModal && (
        <div className="confirm-dialog-overlay" onClick={() => setReturnItemModal(null)} style={{ zIndex: 1200 }}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} role="dialog">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>Return Item</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Return <strong>{returnItemModal.productName}</strong> back to store inventory.
            </p>

            {returnError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>
                {returnError}
              </div>
            )}

            <form onSubmit={handleSubmitReturn}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Return Quantity (Max: {returnItemModal.availableForReturn || (returnItemModal.quantity - (returnItemModal.returnedQuantity || 0))})
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max={returnItemModal.availableForReturn || (returnItemModal.quantity - (returnItemModal.returnedQuantity || 0))}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Reason for Return:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective, Customer changed mind"
                />
              </div>

              <div className="confirm-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReturnItemModal(null)}
                  disabled={isSubmittingReturn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isSubmittingReturn}
                  style={{ fontWeight: 800 }}
                >
                  {isSubmittingReturn ? 'Processing...' : 'Confirm Return & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
