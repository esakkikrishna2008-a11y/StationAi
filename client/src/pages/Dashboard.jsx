import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, XCircle, Timer, PackageCheck,
  Plus, ShoppingCart, Receipt, Banknote, ArrowRight,
  TrendingUp, RefreshCw, CheckCircle2, ChevronRight, Store, Clock, Eye
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';
import { calculateStatus } from '../data';
import { getExpiryText } from '../utils';
import { api } from '../services/api';
import AddEditProductModal from '../components/AddEditProductModal';
import InvoiceModal from '../components/InvoiceModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { inventory, isLoading: isInvLoading, refreshInventory } = useStock();
  const { user } = useAuth();

  const [dbStats, setDbStats] = useState(null);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const statsRes = await api.getDashboardStats();
      if (statsRes?.stats) {
        setDbStats(statsRes.stats);
        setStockAlerts(statsRes.stockAlerts || []);
        setExpiryAlerts(statsRes.expiryAlerts || []);
        setRecentBills(statsRes.recentBills || []);
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [inventory, loadDashboardData]);

  const metrics = useMemo(() => {
    if (dbStats) {
      return {
        total: dbStats.totalProducts ?? 0,
        available: dbStats.available ?? 0,
        lowStock: dbStats.lowStock ?? 0,
        outOfStock: dbStats.outOfStock ?? 0,
        expiringSoon: (dbStats.expiringSoon ?? 0) + (dbStats.expired ?? 0),
        todaySales: dbStats.todaySales ?? 0,
        billsToday: dbStats.billsToday ?? 0,
        itemsSoldToday: dbStats.itemsSoldToday ?? 0
      };
    }
    // Fallback calculation from local inventory
    let total = inventory.length, available = 0, lowStock = 0, outOfStock = 0, expiringSoon = 0;
    inventory.forEach(item => {
      const s = calculateStatus(item.stock, item.reorderLevel);
      if (s === 'In Stock') available++;
      else if (s === 'Low Stock') lowStock++;
      else if (s === 'Out of Stock') outOfStock++;
      if (item.expiryTracking && item.expiryStatus && item.expiryStatus !== 'SAFE') expiringSoon++;
    });
    return {
      total,
      available,
      lowStock,
      outOfStock,
      expiringSoon,
      todaySales: 0,
      billsToday: 0,
      itemsSoldToday: 0
    };
  }, [inventory, dbStats]);

  const avgBill = useMemo(() => {
    if (!metrics.billsToday || metrics.billsToday === 0) return 0;
    return metrics.todaySales / metrics.billsToday;
  }, [metrics.todaySales, metrics.billsToday]);

  const handleViewBill = async (billId) => {
    try {
      const res = await api.getBill(billId);
      if (res && res.bill) {
        setSelectedInvoice(res.bill);
      }
    } catch (e) {
      console.error('Failed to load bill details:', e);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'Store Manager';

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      
      {/* ── 1. DASHBOARD HEADER ── */}
      <div className="dash-hero" style={{ padding: '18px 22px', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div className="dash-hero-text">
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 3px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            StationAI Dashboard
          </h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            {getGreeting()}, {userName}. Here's today's store overview.
          </p>
        </div>

        {/* Action CTAs: View Inventory (tertiary), Add Product (secondary), New Bill (primary strongest) */}
        <div className="dash-hero-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/inventory')}
            style={{ fontWeight: 600, padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <Package size={15} /> View Inventory
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowAddModal(true)}
            style={{ fontWeight: 600, padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <Plus size={15} /> Add Product
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/billing')}
            style={{ fontWeight: 800, padding: '8px 18px', fontSize: '0.85rem', boxShadow: 'var(--shadow-primary)' }}
          >
            <ShoppingCart size={15} /> + New Bill
          </button>
        </div>
      </div>

      {/* ── 2. TOP SALES SUMMARY (4 COMPACT CARDS) ── */}
      <div className="dash-sales-grid">
        {/* Card 1: Today's Sales */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-bg)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Banknote size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TODAY'S SALES
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: 1 }}>
              ₹{metrics.todaySales.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Today's revenue
            </div>
          </div>
        </div>

        {/* Card 2: Bills Today */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'var(--success-bg)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Receipt size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              BILLS TODAY
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 1 }}>
              {metrics.billsToday}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Completed bills
            </div>
          </div>
        </div>

        {/* Card 3: Items Sold */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'var(--warning-bg)', color: 'var(--warning)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <PackageCheck size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ITEMS SOLD
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 1 }}>
              {metrics.itemsSoldToday}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Units sold
            </div>
          </div>
        </div>

        {/* Card 4: Average Bill */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-sm)',
            background: 'rgba(6, 182, 212, 0.12)', color: 'var(--secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <TrendingUp size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AVERAGE BILL
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: 1 }}>
              ₹{avgBill.toFixed(0)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Per bill
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. INVENTORY OVERVIEW (4 SMALL STATUS CARDS) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Inventory Overview
          </h3>
          <button
            className="btn-text"
            onClick={() => navigate('/inventory')}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            View Inventory <ArrowRight size={13} />
          </button>
        </div>

        <div className="dash-inv-grid">
          {/* Total Products (Blue) */}
          <div
            className="card"
            onClick={() => navigate('/inventory')}
            role="button"
            tabIndex={0}
            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'var(--transition)' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-bg)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Package size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                TOTAL PRODUCTS
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {statsLoading ? '—' : metrics.total}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                In store catalog
              </div>
            </div>
          </div>

          {/* In Stock (Green) */}
          <div
            className="card"
            onClick={() => navigate('/inventory')}
            role="button"
            tabIndex={0}
            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'var(--transition)' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--radius-sm)',
              background: 'var(--success-bg)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <PackageCheck size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                IN STOCK
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                {statsLoading ? '—' : metrics.available}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Available for sale
              </div>
            </div>
          </div>

          {/* Low Stock (Amber) */}
          <div
            className="card"
            onClick={() => navigate('/stock-alerts')}
            role="button"
            tabIndex={0}
            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'var(--transition)' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--radius-sm)',
              background: 'var(--warning-bg)', color: 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                LOW STOCK
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: metrics.lowStock > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {statsLoading ? '—' : metrics.lowStock}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Needs restocking
              </div>
            </div>
          </div>

          {/* Out of Stock (Red) */}
          <div
            className="card"
            onClick={() => navigate('/stock-alerts')}
            role="button"
            tabIndex={0}
            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'var(--transition)' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <XCircle size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                OUT OF STOCK
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: metrics.outOfStock > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                {statsLoading ? '—' : metrics.outOfStock}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Restock required
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. NEEDS ATTENTION (2 EQUAL CARDS: STOCK ALERTS & EXPIRY ALERTS) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Needs Attention
          </h3>
        </div>

        <div className="dash-alerts-grid">
          {/* Left Card: Stock Alerts */}
          <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={16} color="var(--warning)" />
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Stock Alerts
                </h4>
                {stockAlerts.length > 0 && (
                  <span className="alert-count-badge" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{stockAlerts.length}</span>
                )}
              </div>
              <button className="btn-text" onClick={() => navigate('/stock-alerts')} style={{ fontSize: '0.76rem' }}>
                View All <ArrowRight size={12} />
              </button>
            </div>

            {stockAlerts.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', margin: 'auto' }}>
                <CheckCircle2 size={20} color="var(--success)" style={{ margin: '0 auto 6px' }} />
                Stock levels are healthy.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stockAlerts.slice(0, 3).map((item) => {
                  const isOut = item.stock === 0;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '9px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        {isOut ? (
                          <XCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }} />
                        ) : (
                          <AlertTriangle size={15} color="var(--warning)" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: isOut ? 'var(--danger)' : 'var(--warning)' }}>
                            {isOut ? '0 units (Out of stock)' : `${item.stock} units remaining`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)'
                        }}>
                          Shelf: {item.shelfSlot || item.locationCode || 'B-01-01'}
                        </span>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => navigate('/stock-alerts')}
                          style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Card: Expiry Alerts */}
          <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Timer size={16} color="var(--danger)" />
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Expiry Alerts
                </h4>
                {expiryAlerts.length > 0 && (
                  <span className="alert-count-badge alert-count-danger" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{expiryAlerts.length}</span>
                )}
              </div>
              <button className="btn-text" onClick={() => navigate('/expiry-alerts')} style={{ fontSize: '0.76rem' }}>
                View All <ArrowRight size={12} />
              </button>
            </div>

            {expiryAlerts.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', margin: 'auto' }}>
                <CheckCircle2 size={20} color="var(--success)" style={{ margin: '0 auto 6px' }} />
                No batches expiring soon.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {expiryAlerts.slice(0, 3).map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '9px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Timer size={15} color={b.expiryStatus === 'EXPIRED' ? 'var(--danger)' : 'var(--warning)'} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.productName}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: b.expiryStatus === 'EXPIRED' ? 'var(--danger)' : 'var(--warning)' }}>
                          {b.expiryStatus === 'EXPIRED' ? 'Expired' : getExpiryText(b.daysRemaining)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)'
                      }}>
                        Shelf: {b.shelf || b.locationCode || 'B-01-01'}
                      </span>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => navigate('/expiry-alerts')}
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. RECENT BILLS SECTION ── */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={17} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Bills
            </h4>
            {recentBills.length > 0 && (
              <span className="alert-count-badge" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{recentBills.length}</span>
            )}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/billing-history')}
            style={{ fontWeight: 600, fontSize: '0.8rem' }}
          >
            View All Bills <ArrowRight size={13} />
          </button>
        </div>

        {recentBills.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={30} style={{ opacity: 0.25, margin: '0 auto 8px' }} />
            <p style={{ margin: '0 0 4px', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>No bills created yet today</p>
            <p style={{ fontSize: '0.78rem', margin: '0 0 12px' }}>Bills completed at POS checkout will appear here.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/billing')}>
              <ShoppingCart size={14} /> Create First Bill
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Billing ID</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.slice(0, 5).map((b) => {
                  const timeStr = b.createdAt
                    ? new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—';

                  const isVoided = b.status === 'Voided';

                  return (
                    <tr
                      key={b.id}
                      style={{ cursor: 'pointer', opacity: isVoided ? 0.6 : 1 }}
                      onClick={() => handleViewBill(b.id)}
                    >
                      <td>
                        <strong style={{ color: isVoided ? 'var(--text-muted)' : 'var(--primary)', fontFamily: 'monospace', fontSize: '0.86rem', textDecoration: isVoided ? 'line-through' : 'none' }}>
                          {b.billingId}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{timeStr}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.84rem' }}>{b.customerName || 'Walk-in Customer'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                          {b.itemsCount} {b.itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          fontWeight: 600
                        }}>
                          {b.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: isVoided ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          ₹{Number(b.grandTotal || 0).toFixed(2)}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewBill(b.id);
                          }}
                          style={{ gap: 4 }}
                        >
                          <Eye size={12} /> View
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

      {/* Add Product Modal */}
      {showAddModal && (
        <AddEditProductModal
          product={null}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadDashboardData();
          }}
        />
      )}

      {/* Invoice Modal for Viewed Bill */}
      {selectedInvoice && (
        <InvoiceModal
          bill={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onReturnSuccess={() => {
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
