import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Mic, MicOff,
  CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, Store,
  CreditCard, Banknote, QrCode, RefreshCw, X, Keyboard, Eye,
  Printer, Download, ShieldCheck, UserCheck, Phone, Check, Clock
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { getCategoryEmoji } from '../components/Layout';
import InvoiceModal from '../components/InvoiceModal';

export default function Billing() {
  const { inventory, completeBill, isLoading, refreshInventory, addToast } = useStock();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Cart state
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash', 'UPI', 'Card'
  const [cashReceived, setCashReceived] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerFields, setShowCustomerFields] = useState(false);

  // Execution & Modal states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedBill, setCompletedBill] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [stockValidationError, setStockValidationError] = useState('');
  const [networkError, setNetworkError] = useState('');

  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript.trim());
          addToast(`Voice search: "${transcript}"`, 'info');
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          addToast('Microphone access was denied. Please allow microphone permissions in browser settings.', 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Voice recognition init failed:', err);
      setVoiceSupported(false);
    }
  }, [addToast]);

  const toggleVoiceSearch = () => {
    if (!voiceSupported) {
      addToast('Voice search is not supported by your current browser. Please try Google Chrome.', 'warning');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Voice search start error:', e);
      }
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2 -> New Bill (Clear cart)
      if (e.key === 'F2') {
        e.preventDefault();
        clearCart();
        addToast('New Bill started', 'info');
        searchInputRef.current?.focus();
      }
      // F4 -> Focus Product Search
      else if (e.key === 'F4') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F8 -> Complete Bill / Open Preview
      else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !isSubmitting) {
          handleOpenPreview();
        }
      }
      // ESC -> Close modals
      else if (e.key === 'Escape') {
        setShowClearConfirm(false);
        setShowPreviewModal(false);
        setShowShortcutsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isSubmitting]);

  // Categories for quick filter
  const categories = useMemo(() => {
    const set = new Set();
    inventory.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [inventory]);

  // Filtered products list from actual database inventory
  const filteredProducts = useMemo(() => {
    if (!inventory || !Array.isArray(inventory)) return [];

    return inventory.filter(item => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchSku = item.sku?.toLowerCase().includes(q);
      const matchBrand = item.brand?.toLowerCase().includes(q);
      const matchCategory = item.category?.toLowerCase().includes(q);
      const matchLoc = (item.locationCode || item.shelfLocation || '')?.toLowerCase().includes(q);
      const matchShelf = `shelf ${item.shelf || ''}`.toLowerCase().includes(q);
      const matchShelfSlot = `shelf ${item.shelf || ''} row ${item.row || ''}`.toLowerCase().includes(q);

      return matchName || matchSku || matchBrand || matchCategory || matchLoc || matchShelf || matchShelfSlot;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // Add item to cart with strict real stock validation
  const addToCart = (product) => {
    setStockValidationError('');
    setNetworkError('');
    const availableStock = Number(product.stock || product.quantity || 0);

    if (availableStock <= 0) {
      addToast(`"${product.name}" is OUT OF STOCK. Cannot add to bill.`, 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          addToast(`Only ${availableStock} units available for "${product.name}".`, 'warning');
          return prev;
        }
        return prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          category: product.category,
          unitPrice: Number(product.price),
          unit: product.unit || 'Piece',
          availableStock,
          quantity: 1,
          locationCode: product.locationCode || product.shelfLocation || `${product.shelf || 'A'}-${String(product.row || 1).padStart(2,'0')}-${String(product.column || 1).padStart(2,'0')}`,
          shelf: product.shelf,
          row: product.row,
          column: product.column,
          expiryTracking: Boolean(product.expiryTracking),
          batches: product.batches || []
        }
      ];
    });
  };

  // Update quantity with strict stock limit
  const updateQuantity = (productId, newQty) => {
    setStockValidationError('');
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.availableStock) {
      setStockValidationError(`Only ${item.availableStock} units available for "${item.name}".`);
      addToast(`Only ${item.availableStock} units available for "${item.name}".`, 'warning');
      return;
    }

    setCart(prev =>
      prev.map(i =>
        i.productId === productId ? { ...i, quantity: newQty } : i
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setPaymentMethod('Cash');
    setCashReceived('');
    setTransactionRef('');
    setCustomerName('');
    setCustomerPhone('');
    setShowClearConfirm(false);
    setShowPreviewModal(false);
    setStockValidationError('');
    setNetworkError('');
  };

  // Billing Totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const rawDisc = Number(discount) || 0;
    if (discountType === 'percent') {
      return Math.round(((subtotal * Math.min(Math.max(rawDisc, 0), 100)) / 100) * 100) / 100;
    }
    return Math.min(Math.max(rawDisc, 0), subtotal);
  }, [subtotal, discount, discountType]);

  const grandTotal = useMemo(() => {
    return Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  }, [subtotal, discountAmount]);

  // Cash Change calculations
  const parsedCashReceived = Number(cashReceived) || 0;
  const changeDue = Math.max(0, Math.round((parsedCashReceived - grandTotal) * 100) / 100);
  const isCashInsufficient = paymentMethod === 'Cash' && cashReceived !== '' && parsedCashReceived < grandTotal;

  // Open Bill Preview Modal
  const handleOpenPreview = () => {
    if (cart.length === 0) {
      addToast('Cart is empty. Please add items to bill.', 'warning');
      return;
    }

    // Validate available stock for each cart item
    for (const item of cart) {
      if (item.quantity > item.availableStock) {
        setStockValidationError(`Cannot proceed: Only ${item.availableStock} units available for "${item.name}".`);
        return;
      }
    }

    if (isCashInsufficient) {
      setStockValidationError(`Amount received (₹${parsedCashReceived}) is insufficient. Total bill is ₹${grandTotal}.`);
      return;
    }

    setStockValidationError('');
    setNetworkError('');
    setShowPreviewModal(true);
  };

  // Execute Final Bill Submission (Transaction)
  const handleConfirmAndGenerateBill = async () => {
    if (cart.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setStockValidationError('');
      setNetworkError('');

      const billPayload = {
        items: cart.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        })),
        discount: discountAmount,
        discountType: 'flat',
        tax: 0,
        paymentMethod,
        cashReceived: paymentMethod === 'Cash' ? (parsedCashReceived || grandTotal) : 0,
        amountReceived: paymentMethod === 'Cash' ? (parsedCashReceived || grandTotal) : 0,
        transactionRef: transactionRef.trim(),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim()
      };

      const bill = await completeBill(billPayload);
      setShowPreviewModal(false);
      setCompletedBill(bill);
      clearCart();
    } catch (err) {
      const errMsg = err.message || 'Billing failed. Please try again.';
      if (errMsg.includes('Unable to connect') || errMsg.includes('server') || errMsg.includes('fetch')) {
        setNetworkError('Unable to connect to the billing server. Your bill has NOT been created. Please check connection and retry.');
      } else {
        setStockValidationError(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-container">
      {/* ── TOP HERO BAR WITH ACTIONS & KEYBOARD SHORTCUTS ── */}
      <div className="dash-hero" style={{ padding: '18px 24px', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div className="dash-hero-text">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={24} color="var(--primary)" /> StationAI POS & Billing
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-world stationery shop POS · Live inventory integration & instant stock deduction
          </p>
        </div>
        <div className="dash-hero-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowShortcutsModal(true)}
            title="View Keyboard Shortcuts"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Keyboard size={15} /> <span>Shortcuts</span>
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => refreshInventory && refreshInventory()}
            title="Sync stock from database"
          >
            <RefreshCw size={14} /> Sync Stock
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              clearCart();
              searchInputRef.current?.focus();
            }}
            style={{ fontWeight: 700 }}
          >
            + New Bill <span className="pos-shortcut-badge" style={{ marginLeft: 4, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>F2</span>
          </button>
        </div>
      </div>

      {/* ── MAIN POS LAYOUT (LEFT: CATALOG, RIGHT: STICKY BILL PANEL) ── */}
      <div className="pos-layout">
        
        {/* ── LEFT COLUMN: PRODUCT SEARCH & REAL DATABASE CATALOG ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Search & Voice Bar */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-input"
                  placeholder={isListening ? '🔴 Listening... speak product name (e.g. Rice, Notebook, Shampoo)...' : 'Search name, brand, SKU, shelf (e.g. A-02-04, Parker, Rice)... [F4]'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 42, paddingRight: searchQuery ? 40 : 12, height: 46, fontSize: '0.94rem' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                    }}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Voice Search Button */}
              <button
                type="button"
                className={`btn ${isListening ? 'btn-danger' : 'btn-outline'}`}
                onClick={toggleVoiceSearch}
                title={isListening ? 'Listening... click to stop' : 'Voice Search (Speak product name)'}
                style={{ height: 46, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                {isListening ? (
                  <>
                    <MicOff size={18} className="pulse-animation" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>🔴 Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic size={18} color="var(--primary)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>🎤 Voice</span>
                  </>
                )}
              </button>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn btn-xs ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 99, fontSize: '0.75rem', padding: '4px 12px', whiteSpace: 'nowrap' }}
                >
                  {cat === 'ALL' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Results Grid */}
          <div className="card" style={{ padding: '18px 20px', minHeight: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Store size={18} color="var(--primary)" />
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  Shop Inventory Catalog
                </h4>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {filteredProducts.length} items available
              </span>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={28} className="spin-animation" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Connecting to inventory database...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
                <Store size={44} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
                <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>No products match your search</h4>
                <p style={{ fontSize: '0.84rem', margin: 0 }}>Try searching with a different product name, brand, SKU or shelf location.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 14
              }}>
                {filteredProducts.map(prod => {
                  const stock = Number(prod.stock || prod.quantity || 0);
                  const isOut = stock === 0;
                  const isLow = stock > 0 && stock <= (prod.reorderLevel || 5);
                  const cartItem = cart.find(c => c.productId === prod.id);
                  const inCartQty = cartItem ? cartItem.quantity : 0;
                  const isMaxedInCart = inCartQty >= stock;

                  // Location Display (e.g. Shelf B2-03)
                  const shelfCode = prod.locationCode || prod.shelfLocation || `Shelf ${prod.shelf || 'B'}-${String(prod.row || 1).padStart(2,'0')}-${String(prod.column || 1).padStart(2,'0')}`;

                  // FEFO / Expiry warning if batch exists
                  const hasBatches = prod.batches && prod.batches.length > 0;
                  const earliestBatch = hasBatches
                    ? [...prod.batches].sort((a,b) => new Date(a.expiryDate || a.expiry_date) - new Date(b.expiryDate || b.expiry_date))[0]
                    : null;

                  return (
                    <div
                      key={prod.id}
                      className={`pos-card-product ${isOut ? 'out-of-stock' : ''}`}
                    >
                      <div>
                        {/* Top Meta: Emoji / Category / Stock Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontSize: '1.4rem' }}>{getCategoryEmoji(prod.category)}</span>
                          <span
                            className={`status-badge ${isOut ? 'out' : isLow ? 'low' : 'in'}`}
                            style={{ fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}
                          >
                            {isOut ? 'OUT OF STOCK' : isLow ? `Low Stock: ${stock}` : `Stock: ${stock}`}
                          </span>
                        </div>

                        {/* Product Title & Brand */}
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                          {prod.brand ? <strong style={{ color: 'var(--text-secondary)' }}>{prod.brand}</strong> : ''}
                          {prod.brand && prod.sku ? ' · ' : ''}
                          <span>{prod.sku}</span>
                        </div>

                        {/* Shelf Location Badge */}
                        <div style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-tertiary)',
                          padding: '3px 7px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontFamily: 'monospace',
                          marginBottom: 6
                        }}>
                          📍 {shelfCode}
                        </div>

                        {/* FEFO Batch Hint if available */}
                        {earliestBatch && earliestBatch.expiryDate && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--warning)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            <span>FEFO: Batch #{earliestBatch.batchNumber || '01'}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Price & Add Button */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border)'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Price</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            ₹{Number(prod.price).toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => addToCart(prod)}
                          disabled={isOut || isMaxedInCart}
                          style={{
                            padding: '7px 14px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            borderRadius: 6
                          }}
                        >
                          {isOut ? 'Unavailable' : isMaxedInCart ? `Max (${inCartQty})` : inCartQty > 0 ? `+ Add (${inCartQty})` : '+ Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: STICKY POS BILLING CART & CHECKOUT ── */}
        <div className="pos-sticky-cart">
          <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Header: Current Bill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={19} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>Current Bill</h3>
                {cart.length > 0 && (
                  <span className="alert-count-badge" style={{ fontSize: '0.75rem', padding: '2px 7px' }}>
                    {cart.reduce((s, i) => s + i.quantity, 0)} units
                  </span>
                )}
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setShowClearConfirm(true)}
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={12} /> Clear Bill
                </button>
              )}
            </div>

            {/* Stock Validation or Network Error Banner */}
            {stockValidationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: 'var(--danger)',
                padding: '10px 12px',
                borderRadius: 6,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{stockValidationError}</span>
              </div>
            )}

            {networkError && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: 'var(--warning)',
                padding: '10px 12px',
                borderRadius: 6,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{networkError}</span>
                </div>
                <button className="btn btn-primary btn-xs" onClick={handleConfirmAndGenerateBill}>
                  Retry
                </button>
              </div>
            )}

            {/* Customer Section */}
            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 600 }}>
                  <UserCheck size={15} color="var(--primary)" />
                  <span>{customerName.trim() || 'Walk-in Customer'}</span>
                  {customerPhone.trim() && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({customerPhone})</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-text"
                  onClick={() => setShowCustomerFields(!showCustomerFields)}
                  style={{ fontSize: '0.76rem' }}
                >
                  {showCustomerFields ? 'Done' : '+ Add Customer'}
                </button>
              </div>

              {showCustomerFields && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ height: 32, fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ height: 32, fontSize: '0.8rem' }}
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                <ShoppingCart size={36} style={{ opacity: 0.25, margin: '0 auto 10px' }} />
                <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Cart is empty</p>
                <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Click [ + Add ] on any product in the catalog.</p>
              </div>
            ) : (
              <div className="pos-cart-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cart.map(item => {
                  const itemTotal = item.unitPrice * item.quantity;
                  const isMax = item.quantity >= item.availableStock;

                  return (
                    <div key={item.productId} className="pos-cart-item">
                      {/* Product Name, SKU & Unit Price */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          ₹{item.unitPrice.toFixed(2)} × {item.quantity} · <span style={{ color: 'var(--text-secondary)' }}>Stock: {item.availableStock}</span>
                        </div>
                      </div>

                      {/* Quantity Controls [-]  qty  [+] */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="pos-stepper-btn"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          title="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', minWidth: 22, textAlign: 'center', fontFamily: 'monospace' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="pos-stepper-btn"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={isMax}
                          title={isMax ? `Max stock reached (${item.availableStock})` : 'Increase quantity'}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Total for item */}
                      <div style={{ minWidth: 64, textAlign: 'right', fontWeight: 900, fontSize: '0.92rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        ₹{itemTotal.toFixed(2)}
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Calculations & Payment Section */}
            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Discount input */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <label style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Discount:</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      max={discountType === 'percent' ? 100 : subtotal}
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{ width: 80, height: 32, fontSize: '0.84rem', textAlign: 'right', padding: '2px 8px' }}
                    />
                    <select
                      className="form-input"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      style={{ height: 32, fontSize: '0.82rem', padding: '2px 8px', width: 55 }}
                    >
                      <option value="flat">₹</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                </div>

                {/* Subtotal / Discount / Grand Total Summary */}
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--success)' }}>
                      <span>Discount ({discountType === 'percent' ? `${discount}%` : 'Flat'}):</span>
                      <span style={{ fontFamily: 'monospace' }}>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    borderTop: '2px solid var(--border)',
                    paddingTop: 8,
                    marginTop: 4
                  }}>
                    <span>TOTAL:</span>
                    <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                    Payment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { id: 'Cash', label: 'CASH', icon: Banknote },
                      { id: 'UPI', label: 'UPI', icon: QrCode },
                      { id: 'Card', label: 'CARD', icon: CreditCard },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        className={`pos-payment-btn ${paymentMethod === id ? 'active' : ''}`}
                        onClick={() => {
                          setPaymentMethod(id);
                          if (id === 'Cash' && !cashReceived) {
                            setCashReceived(String(grandTotal));
                          }
                        }}
                      >
                        <Icon size={16} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Payment Details */}
                {paymentMethod === 'Cash' && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Amount Received (₹):
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        style={{ width: 110, height: 34, textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem' }}
                      />
                    </div>

                    {/* Quick Cash Denomination Chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <button type="button" className="pos-quick-cash-chip" onClick={() => setCashReceived(String(grandTotal))}>
                        Exact (₹{grandTotal})
                      </button>
                      {[100, 200, 500, 2000].filter(amt => amt >= grandTotal).map(amt => (
                        <button key={amt} type="button" className="pos-quick-cash-chip" onClick={() => setCashReceived(String(amt))}>
                          ₹{amt}
                        </button>
                      ))}
                    </div>

                    {/* Change Display or Warning */}
                    {isCashInsufficient ? (
                      <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={14} /> Amount received is insufficient.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Change to Return:</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--success)', fontFamily: 'monospace' }}>
                          ₹{changeDue.toFixed(2)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'UPI' && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      UPI Payment · ₹{grandTotal.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                      <div style={{ padding: 8, background: '#fff', borderRadius: 8, display: 'inline-block' }}>
                        <QrCode size={90} color="#000" />
                      </div>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="UPI Ref / UTR / Transaction ID (Optional)"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      style={{ height: 34, fontSize: '0.82rem', textAlign: 'center' }}
                    />
                  </div>
                )}

                {paymentMethod === 'Card' && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                      Card POS Terminal · ₹{grandTotal.toFixed(2)}
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Card Ref / Auth Code / Last 4 Digits (Optional)"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      style={{ height: 34, fontSize: '0.82rem' }}
                    />
                  </div>
                )}

                {/* Checkout Action Button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenPreview}
                  disabled={isSubmitting || cart.length === 0 || isCashInsufficient}
                  style={{
                    height: 48,
                    fontSize: '1rem',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                    boxShadow: 'var(--shadow-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="spin-animation" /> Processing Bill...
                    </>
                  ) : (
                    <>
                      COMPLETE BILL · ₹{grandTotal.toFixed(2)}
                      <span className="pos-shortcut-badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>F8</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BILL PREVIEW MODAL (BEFORE FINAL CONFIRMATION) ── */}
      {showPreviewModal && (
        <div className="confirm-dialog-overlay" onClick={() => setShowPreviewModal(false)}>
          <div
            className="confirm-dialog"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '92%' }}
            role="dialog"
          >
            <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border)', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Store size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>STATIONAI</h3>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Stationery & Supplies Shop</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                Customer: {customerName.trim() || 'Walk-in Customer'} {customerPhone.trim() ? `(${customerPhone})` : ''}
              </div>
            </div>

            {/* Items Summary */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: 14 }}>
              <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 0' }}>Item</th>
                    <th style={{ padding: '4px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed var(--border)' }}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>₹{item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{(item.unitPrice * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Payment */}
            <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span style={{ fontFamily: 'monospace' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount:</span>
                  <span style={{ fontFamily: 'monospace' }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                <span>TOTAL:</span>
                <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
                <span>Payment Method:</span>
                <span style={{ fontWeight: 700 }}>{paymentMethod}</span>
              </div>
              {paymentMethod === 'Cash' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <span>Cash Received: ₹{parsedCashReceived || grandTotal}</span>
                  <span>Change: ₹{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="confirm-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowPreviewModal(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAndGenerateBill}
                disabled={isSubmitting}
                style={{ fontWeight: 800 }}
              >
                {isSubmitting ? 'Generating Bill...' : 'Confirm & Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KEYBOARD SHORTCUTS MODAL ── */}
      {showShortcutsModal && (
        <div className="confirm-dialog-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }} role="dialog">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Keyboard size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>POS Keyboard Shortcuts</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
              {[
                { key: 'F2', desc: 'New Bill (Clear & reset current bill)' },
                { key: 'F4', desc: 'Search Product (Focus product search bar)' },
                { key: 'F8', desc: 'Complete Bill (Open confirmation checkout)' },
                { key: 'ESC', desc: 'Close open dialogs or modals' },
                { key: '+ / -', desc: 'Increase / Decrease cart item quantity' }
              ].map(({ key, desc }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                  <span className="pos-shortcut-badge" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>{key}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowShortcutsModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLEAR BILL CONFIRMATION DIALOG ── */}
      {showClearConfirm && (
        <div className="confirm-dialog-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} role="dialog">
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Clear current bill?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>All items added to the cart will be removed.</p>
            <div className="confirm-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setShowClearConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={clearCart}>Clear All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS INVOICE & RECEIPT MODAL ── */}
      {completedBill && (
        <InvoiceModal
          bill={completedBill}
          isSuccessScreen={true}
          onClose={() => setCompletedBill(null)}
          onNewBill={() => {
            setCompletedBill(null);
            clearCart();
            searchInputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
