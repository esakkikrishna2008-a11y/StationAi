import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt, Search, Eye, Calendar, CreditCard, Banknote, QrCode,
  RotateCcw, Printer, ArrowRight, RefreshCw, FileText, CheckCircle2,
  AlertTriangle, XCircle, TrendingUp, PackageCheck, Filter, Download
} from 'lucide-react';
import { api } from '../services/api';
import InvoiceModal from '../components/InvoiceModal';

export default function BillingHistory() {
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedBill, setSelectedBill] = useState(null);
  const [loadingBillId, setLoadingBillId] = useState(null);
  const [error, setError] = useState(null);

  const loadBills = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getBills({
        search: searchQuery,
        paymentMethod: paymentFilter,
        status: statusFilter,
        dateFilter,
        startDate: dateFilter === 'custom' ? startDate : undefined,
        endDate: dateFilter === 'custom' ? endDate : undefined
      });
      if (res && res.bills) {
        setBills(res.bills);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
      setError('Unable to load billing history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, paymentFilter, statusFilter, dateFilter, startDate, endDate]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleViewBill = async (billId) => {
    try {
      setLoadingBillId(billId);
      const res = await api.getBill(billId);
      if (res && res.bill) {
        setSelectedBill(res.bill);
      }
    } catch (err) {
      console.error('Failed to load bill details:', err);
    } finally {
      setLoadingBillId(null);
    }
  };

  const handleReturnSuccess = () => {
    loadBills();
    if (selectedBill) {
      handleViewBill(selectedBill.id);
    }
  };

  const handleVoidSuccess = () => {
    loadBills();
    setSelectedBill(null);
  };

  // Metrics summary calculated from non-voided bills in view
  const summaryMetrics = useMemo(() => {
    const validBills = bills.filter(b => b.status !== 'Voided');
    const totalSales = validBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);
    const totalItems = validBills.reduce((sum, b) => sum + (Number(b.totalQuantity) || 0), 0);
    const avgValue = validBills.length > 0 ? totalSales / validBills.length : 0;

    return {
      totalCount: bills.length,
      validCount: validBills.length,
      totalSales,
      totalItems,
      avgValue
    };
  }, [bills]);

  return (
    <div className="billing-history-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="dash-hero" style={{ padding: '20px 24px', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div className="dash-hero-text">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={24} color="var(--primary)" /> Billing & Invoice History
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Search invoices, reprint receipts, audit stock deductions, and process item returns or voids.
          </p>
        </div>
        <div className="dash-hero-actions">
          <button className="btn btn-outline btn-sm" onClick={loadBills}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14
      }}>
        {/* Total Sales in Filter */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-bg)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Banknote size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Filtered Sales
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: 1 }}>
              ₹{summaryMetrics.totalSales.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'var(--success-bg)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Invoices
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 1 }}>
              {summaryMetrics.totalCount}
            </div>
          </div>
        </div>

        {/* Total Items Sold */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'var(--warning-bg)', color: 'var(--warning)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <PackageCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Items Sold
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 1 }}>
              {summaryMetrics.totalItems} units
            </div>
          </div>
        </div>

        {/* Average Bill */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'rgba(6, 182, 212, 0.12)', color: 'var(--secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Average Bill
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: 1 }}>
              ₹{summaryMetrics.avgValue.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by Bill ID (e.g. BILL-2026-000001), Customer, Phone, or Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38, height: 40, fontSize: '0.9rem' }}
            />
          </div>

          {/* Date Filter Pills */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={15} color="var(--text-muted)" />
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom' }
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`btn btn-xs ${dateFilter === id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDateFilter(id)}
                style={{ borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {dateFilter === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ height: 32, fontSize: '0.82rem', width: 140 }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>To:</span>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ height: 32, fontSize: '0.82rem', width: 140 }}
            />
          </div>
        )}

        {/* Secondary Filter Row: Payment & Status */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {/* Payment Method Filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Payment:</label>
            {['ALL', 'Cash', 'UPI', 'Card'].map(method => (
              <button
                key={method}
                className={`btn btn-xs ${paymentFilter === method ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPaymentFilter(method)}
                style={{ borderRadius: 6, padding: '3px 8px', fontSize: '0.74rem' }}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status:</label>
            {['ALL', 'Completed', 'Voided', 'Returned', 'Partially Returned'].map(st => (
              <button
                key={st}
                className={`btn btn-xs ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter(st)}
                style={{ borderRadius: 6, padding: '3px 8px', fontSize: '0.74rem' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bills Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '12px 20px', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spin-animation" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading billing records...</p>
          </div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
            <Receipt size={44} style={{ opacity: 0.25, margin: '0 auto 14px' }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No bills match the selected filters</h4>
            <p style={{ fontSize: '0.84rem', margin: 0 }}>Try clearing your search query or adjusting the date and payment filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Billing ID</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Items & Units</th>
                  <th>Payment</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => {
                  const dateStr = bill.createdAt
                    ? new Date(bill.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—';
                  const timeStr = bill.createdAt
                    ? new Date(bill.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    : '';

                  const isVoided = bill.status === 'Voided';

                  return (
                    <tr
                      key={bill.id}
                      style={{ cursor: 'pointer', opacity: isVoided ? 0.65 : 1 }}
                      onClick={() => handleViewBill(bill.id)}
                    >
                      <td>
                        <strong style={{ color: isVoided ? 'var(--text-muted)' : 'var(--primary)', fontFamily: 'monospace', fontSize: '0.9rem', textDecoration: isVoided ? 'line-through' : 'none' }}>
                          {bill.billingId}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dateStr}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeStr}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bill.customerName || 'Walk-in Customer'}</span>
                        {bill.customerPhone && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{bill.customerPhone}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{bill.itemsCount || 1} {bill.itemsCount === 1 ? 'item' : 'items'}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {bill.totalQuantity} units
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)'
                        }}>
                          {bill.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.98rem', fontFamily: 'monospace', color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          ₹{bill.grandTotal.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-badge ${bill.status === 'Completed' ? 'in' : bill.status === 'Voided' ? 'out' : 'low'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                          {bill.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewBill(bill.id);
                          }}
                          disabled={loadingBillId === bill.id}
                          style={{ gap: 4 }}
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details, Returns & Void Modal */}
      {selectedBill && (
        <InvoiceModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onReturnSuccess={handleReturnSuccess}
          onVoidSuccess={handleVoidSuccess}
        />
      )}
    </div>
  );
}
