import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Save, Trash2, PackagePlus, Edit3, CheckCircle2,
  MapPin, AlertCircle, Info, Plus, ArrowRight, Image as ImageIcon,
  Calendar, Layers, DollarSign, Barcode, AlignLeft, Upload
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import {
  getStoreType,
  STORE_TYPES,
  getAllCategoriesForStore,
  getUnitsForStore,
  addCustomCategory,
  getGridConfig,
  formatLocationCode,
  formatLocationDisplay,
  parseLocation
} from '../data';

export default function AddEditProductModal({ product, onClose, onSuccess }) {
  const { createProduct, updateProduct, deleteProduct, inventory } = useStock();
  const isEditing = Boolean(product && product.id);
  const fileInputRef = useRef(null);

  // Store Type & suggestions
  const [storeType, setStoreTypeState] = useState(() => getStoreType());
  const storeConfig = useMemo(() => STORE_TYPES[storeType] || STORE_TYPES['General Store'], [storeType]);
  
  // Categories & Units
  const [categories, setCategories] = useState(() => getAllCategoriesForStore(storeType));
  const availableUnits = useMemo(() => getUnitsForStore(storeType), [storeType]);
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Dynamic grid configuration (shelves, rows, columns)
  const gridConfig = useMemo(() => getGridConfig(), []);
  const shelvesList = gridConfig.shelves || ['A', 'B', 'C', 'D'];
  const totalRows = gridConfig.rows || 5;
  const totalCols = gridConfig.columns || 5;

  // Initialize location
  const initialLoc = useMemo(() => {
    if (product) {
      return parseLocation({
        shelf: product.shelf,
        rowNumber: product.row || product.rowNumber,
        columnNumber: product.column || product.columnNumber,
        locationCode: product.locationCode || product.shelfLocation
      });
    }
    return {
      shelf: 'A',
      row: 1,
      column: 1,
      locationCode: 'A-01-01',
      locationDisplay: '📍 Shelf A • Row 01 • Column 01'
    };
  }, [product]);

  const [formData, setFormData] = useState({
    name: '',
    category: categories[0] || 'General Merchandise',
    brand: '',
    price: '',
    stock: 10,
    unit: storeConfig.defaultUnit || 'Piece',
    reorderLevel: 5,
    barcode: '',
    shelf: initialLoc.shelf,
    row: initialLoc.row,
    column: initialLoc.column,
    hasExpiry: storeConfig.defaultExpiryTracking || false,
    expiryDate: '',
    batchNumber: '',
    imageUrl: '',
    description: ''
  });

  const [activeShelf, setActiveShelf] = useState(initialLoc.shelf);
  const [occupiedWarning, setOccupiedWarning] = useState(null);
  const [hoveredOccupied, setHoveredOccupied] = useState(null);
  const [showShelfVisualizer, setShowShelfVisualizer] = useState(true);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createdProductResult, setCreatedProductResult] = useState(null);

  // Sync categories when store type changes
  useEffect(() => {
    const handleStoreChange = (e) => {
      const newType = e.detail || getStoreType();
      setStoreTypeState(newType);
      setCategories(getAllCategoriesForStore(newType));
    };
    const handleCatChange = () => {
      setCategories(getAllCategoriesForStore(storeType));
    };
    window.addEventListener('store-type-changed', handleStoreChange);
    window.addEventListener('categories-changed', handleCatChange);
    return () => {
      window.removeEventListener('store-type-changed', handleStoreChange);
      window.removeEventListener('categories-changed', handleCatChange);
    };
  }, [storeType]);

  // Load product data when editing
  useEffect(() => {
    if (product) {
      const loc = parseLocation({
        shelf: product.shelf,
        rowNumber: product.row || product.rowNumber,
        columnNumber: product.column || product.columnNumber,
        locationCode: product.locationCode || product.shelfLocation
      });

      setFormData({
        name: product.name || '',
        category: product.category || categories[0] || 'General',
        brand: product.brand || '',
        price: product.price !== undefined ? product.price : '',
        stock: product.stock !== undefined ? product.stock : 10,
        unit: product.unit || storeConfig.defaultUnit || 'Piece',
        reorderLevel: product.reorderLevel !== undefined ? product.reorderLevel : 5,
        barcode: product.barcode || product.sku || '',
        shelf: loc.shelf,
        row: loc.row,
        column: loc.column,
        hasExpiry: Boolean(product.hasExpiry || product.expiryTracking || product.expiryDate),
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
        batchNumber: product.batchNumber || '',
        imageUrl: product.imageUrl || product.image || product.image_url || '',
        description: product.description || ''
      });
      setActiveShelf(loc.shelf);
    } else {
      const defaultCat = categories[0] || 'General';
      const defaultUnit = storeConfig.defaultUnit || 'Piece';
      setFormData(prev => ({
        ...prev,
        category: defaultCat,
        unit: defaultUnit,
        hasExpiry: storeConfig.defaultExpiryTracking || false
      }));
    }
  }, [product, categories, storeConfig]);

  // Real-time occupied locations map from real database products
  const occupiedMap = useMemo(() => {
    const map = {};
    if (Array.isArray(inventory)) {
      inventory.forEach(item => {
        // Skip current product when editing
        if (isEditing && product && item.id === product.id) {
          return;
        }
        const loc = parseLocation({
          shelf: item.shelf,
          rowNumber: item.row || item.rowNumber,
          columnNumber: item.column || item.columnNumber,
          locationCode: item.locationCode || item.shelfLocation
        });
        const key = `${loc.shelf}-${loc.row}-${loc.column}`;
        map[key] = {
          id: item.id,
          name: item.name,
          sku: item.sku,
          shelf: loc.shelf,
          row: loc.row,
          column: loc.column,
          locationCode: loc.locationCode,
          locationDisplay: loc.locationDisplay
        };
      });
    }
    return map;
  }, [inventory, isEditing, product]);

  const handleShelfChange = (s) => {
    setActiveShelf(s);
    setFormData(prev => ({ ...prev, shelf: s }));
    checkOccupancy(s, formData.row, formData.column);
  };

  const handleRowChange = (r) => {
    const rowNum = parseInt(r, 10) || 1;
    setFormData(prev => ({ ...prev, row: rowNum }));
    checkOccupancy(formData.shelf, rowNum, formData.column);
  };

  const handleColumnChange = (c) => {
    const colNum = parseInt(c, 10) || 1;
    setFormData(prev => ({ ...prev, column: colNum }));
    checkOccupancy(formData.shelf, formData.row, colNum);
  };

  const checkOccupancy = (s, r, c) => {
    const key = `${s}-${r}-${c}`;
    const occupied = occupiedMap[key];
    if (occupied) {
      setOccupiedWarning({
        name: occupied.name,
        location: occupied.locationDisplay || formatLocationDisplay(s, r, c),
        locationCode: occupied.locationCode || formatLocationCode(s, r, c)
      });
    } else {
      setOccupiedWarning(null);
    }
  };

  const handleCellClick = (r, c) => {
    setFormData(prev => ({
      ...prev,
      shelf: activeShelf,
      row: r,
      column: c
    }));
    checkOccupancy(activeShelf, r, c);
  };

  const handleAddCustomCat = () => {
    if (!newCatInput.trim()) return;
    const updated = addCustomCategory(newCatInput.trim());
    if (updated) {
      setCategories(getAllCategoriesForStore(storeType));
      setFormData(prev => ({ ...prev, category: newCatInput.trim() }));
    }
    setNewCatInput('');
    setShowAddCat(false);
  };

  // Image Upload via FileReader
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file size should be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Format active selected location
  const currentLocCode = formatLocationCode(formData.shelf, formData.row, formData.column);
  const currentLocDisplay = formatLocationDisplay(formData.shelf, formData.row, formData.column);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field Validations with friendly user messages
    if (!formData.name.trim()) {
      return setError('Product Name is required.');
    }
    if (!formData.category) {
      return setError('Category is required.');
    }
    if (formData.price === '' || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      return setError('Selling Price must be greater than or equal to 0.');
    }
    if (formData.stock === '' || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      return setError('Stock Quantity cannot be negative.');
    }
    if (!formData.unit) {
      return setError('Unit is required.');
    }
    if (formData.reorderLevel === '' || isNaN(Number(formData.reorderLevel)) || Number(formData.reorderLevel) < 0) {
      return setError('Reorder Level cannot be negative.');
    }
    if (!formData.shelf || formData.row === undefined || formData.column === undefined) {
      return setError('Store Location is required. Please select Shelf, Row, and Column.');
    }
    if (formData.hasExpiry && !formData.expiryDate) {
      return setError('Expiry Date is required when expiry tracking is enabled.');
    }

    // Client-side occupied duplicate check
    const checkKey = `${formData.shelf}-${formData.row}-${formData.column}`;
    const conflicting = occupiedMap[checkKey];
    if (conflicting) {
      return setError(`Location ${currentLocCode} is already occupied by "${conflicting.name}". Please select another store location.`);
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
        quantity: Number(formData.stock),
        unit: formData.unit || 'Piece',
        reorderLevel: Number(formData.reorderLevel),
        shelf: formData.shelf,
        row: Number(formData.row),
        rowNumber: Number(formData.row),
        column: Number(formData.column),
        columnNumber: Number(formData.column),
        locationCode: currentLocCode,
        shelfLocation: currentLocCode,
        expiryTracking: formData.hasExpiry,
        hasExpiry: formData.hasExpiry,
        expiryDate: formData.hasExpiry ? formData.expiryDate : null,
        batchNumber: formData.hasExpiry && formData.batchNumber ? formData.batchNumber.trim() : undefined,
        barcode: formData.barcode ? formData.barcode.trim() : undefined,
        sku: formData.barcode ? formData.barcode.trim() : undefined,
        imageUrl: formData.imageUrl || undefined,
        image: formData.imageUrl || undefined,
        description: formData.description ? formData.description.trim() : undefined
      };

      if (isEditing) {
        const updated = await updateProduct(product.id, payload);
        if (onSuccess) onSuccess(updated);
        onClose();
      } else {
        const created = await createProduct(payload);
        setCreatedProductResult(created);
        if (onSuccess) onSuccess(created);
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('occupied')) {
        setError(`Location ${currentLocCode} is already occupied. Please select another storage position.`);
      } else {
        setError(err.message || 'Failed to save product. Please check the inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await deleteProduct(product.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="retail-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* ================================================================= */}
        {/* 1. FORM HEADER */}
        {/* ================================================================= */}
        <div className="retail-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-bg)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {isEditing ? <Edit3 size={20} /> : <PackagePlus size={22} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {isEditing ? 'Edit Product' : 'Add Product'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {isEditing ? `Editing product: ${product.name}` : 'Add any retail product to your catalog and assign its store location.'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* ================================================================= */}
        {/* SUCCESS MESSAGE AFTER PRODUCT CREATION */}
        {/* ================================================================= */}
        {createdProductResult ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={38} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Product Added Successfully!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 24, maxWidth: 460, margin: '0 auto 24px' }}>
              The product has been saved to your inventory and assigned to its store location.
            </p>

            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid var(--border)',
              textAlign: 'left',
              maxWidth: 500,
              margin: '0 auto 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              fontSize: '0.9rem'
            }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{createdProductResult.name}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Category / Brand:</span>
                <span>{createdProductResult.category} {createdProductResult.brand ? `• ${createdProductResult.brand}` : ''}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>SKU / Barcode:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 8px', borderRadius: 4 }}>
                  {createdProductResult.sku}
                </span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Selling Price:</span>
                <strong style={{ color: 'var(--success)' }}>₹{Number(createdProductResult.price).toFixed(2)}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Initial Stock:</span>
                <strong>{createdProductResult.stock} {createdProductResult.unit || 'Piece'}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Store Location:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', background: 'var(--bg-secondary)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  {createdProductResult.locationCode || formatLocationCode(createdProductResult.shelf, createdProductResult.row, createdProductResult.column)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, maxWidth: 500, margin: '0 auto' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px' }}
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => {
                  setCreatedProductResult(null);
                  setFormData({
                    name: '',
                    category: categories[0] || 'General',
                    brand: '',
                    price: '',
                    stock: 10,
                    unit: storeConfig.defaultUnit || 'Piece',
                    reorderLevel: 5,
                    barcode: '',
                    shelf: 'A',
                    row: 1,
                    column: 1,
                    hasExpiry: storeConfig.defaultExpiryTracking || false,
                    expiryDate: '',
                    batchNumber: '',
                    imageUrl: '',
                    description: ''
                  });
                  setActiveShelf('A');
                }}
              >
                <PackagePlus size={16} /> Add Another Product
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            
            <div className="retail-modal-scroll">
              
              {/* Error Banner */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--danger)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <AlertCircle size={16} flexShrink={0} />
                  <span>{error}</span>
                </div>
              )}

              {/* ============================================================= */}
              {/* SECTION 1: PRODUCT INFORMATION */}
              {/* ============================================================= */}
              <div className="retail-form-section">
                <div className="retail-section-title-wrap">
                  <h3 className="retail-section-title">
                    <Layers size={15} /> 1. Product Information
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Fields marked with <span style={{ color: 'var(--danger)' }}>*</span> are required
                  </span>
                </div>

                {/* Row 1: Product Name * (more width) + Category * */}
                <div className="retail-info-grid-2col">
                  
                  {/* Product Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Product Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="e.g. Bathing Soap, Toothpaste 150g, Rice 5kg, Notebook"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                        Category <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="btn-text"
                        onClick={() => setShowAddCat(!showAddCat)}
                        style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 2, color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                      >
                        <Plus size={12} /> {showAddCat ? 'Cancel' : '+ New Category'}
                      </button>
                    </div>

                    {showAddCat ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          className="form-input"
                          placeholder="Type new category..."
                          value={newCatInput}
                          onChange={e => setNewCatInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomCat();
                            }
                          }}
                          style={{ fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleAddCustomCat}
                          style={{ padding: '6px 12px' }}
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        className="form-input"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        required
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Row 2: Brand / Manufacturer + Unit * */}
                <div className="retail-info-grid-2col">
                  {/* Brand */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Brand / Manufacturer <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Optional)</span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="e.g. Dettol, Nestlé, ITC, Britannia, Classmate"
                      value={formData.brand}
                      onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>

                  {/* Unit */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Unit <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      required
                    >
                      {availableUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* ============================================================= */}
              {/* SECTION 2: PRICING & STOCK */}
              {/* ============================================================= */}
              <div className="retail-form-section">
                <div className="retail-section-title-wrap">
                  <h3 className="retail-section-title">
                    <DollarSign size={15} /> 2. Pricing & Stock
                  </h3>
                </div>

                <div className="retail-pricing-4col">
                  {/* Selling Price */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Selling Price (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="₹ 0.00"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  {/* Stock Quantity */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Stock Quantity <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="10"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Unit <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      required
                    >
                      {availableUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reorder Level */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Reorder Level <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Default: 5)</span>
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={formData.reorderLevel}
                      onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
                    />
                  </div>
                </div>

              </div>

              {/* ============================================================= */}
              {/* SECTION 3: PRODUCT IDENTIFICATION */}
              {/* ============================================================= */}
              <div className="retail-form-section">
                <div className="retail-section-title-wrap">
                  <h3 className="retail-section-title">
                    <Barcode size={15} /> 3. Product Identification
                  </h3>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Barcode / SKU
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. 8901234567890 or SKU-NOTE-0001"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Leave empty to generate automatically.
                  </span>
                </div>
              </div>

              {/* ============================================================= */}
              {/* SECTION 4: STORE LOCATION — MOST IMPORTANT */}
              {/* ============================================================= */}
              <div className="retail-form-section" style={{ border: '1.5px solid rgba(99, 102, 241, 0.3)' }}>
                <div className="retail-section-title-wrap">
                  <div>
                    <h3 className="retail-section-title" style={{ color: 'var(--primary)' }}>
                      <MapPin size={16} /> 4. Store Location <span style={{ color: 'var(--danger)' }}>*</span>
                    </h3>
                    <p className="retail-section-subtitle">
                      Select the exact place where this product is stored.
                    </p>
                  </div>
                </div>

                {/* Occupied Warning Banner */}
                {occupiedWarning && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--danger)',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={16} />
                      <div>
                        <strong>Location Occupied:</strong> {occupiedWarning.locationCode} is currently used by <strong>"{occupiedWarning.name}"</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOccupiedWarning(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Visual Three-Step Arrangement: SHELF → ROW → COLUMN */}
                <div className="location-three-step-wrapper">
                  
                  {/* Step 1: Shelf */}
                  <div className="location-step-item">
                    <label className="location-step-label">
                      Shelf <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={formData.shelf}
                      onChange={e => handleShelfChange(e.target.value)}
                      style={{ fontWeight: 700 }}
                      required
                    >
                      {shelvesList.map(s => (
                        <option key={s} value={s}>Shelf {s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Connector Arrow */}
                  <div className="location-step-arrow">
                    <ArrowRight size={18} />
                  </div>

                  {/* Step 2: Row */}
                  <div className="location-step-item">
                    <label className="location-step-label">
                      Row <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={formData.row}
                      onChange={e => handleRowChange(e.target.value)}
                      style={{ fontWeight: 700 }}
                      required
                    >
                      {Array.from({ length: totalRows }, (_, i) => i + 1).map(r => (
                        <option key={r} value={r}>Row {String(r).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Connector Arrow */}
                  <div className="location-step-arrow">
                    <ArrowRight size={18} />
                  </div>

                  {/* Step 3: Column */}
                  <div className="location-step-item">
                    <label className="location-step-label">
                      Column <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={formData.column}
                      onChange={e => handleColumnChange(e.target.value)}
                      style={{ fontWeight: 700 }}
                      required
                    >
                      {Array.from({ length: totalCols }, (_, i) => i + 1).map(c => (
                        <option key={c} value={c}>Column {String(c).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Prominent Selected Location Banner Underneath */}
                <div className="selected-location-hero">
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    Selected Location
                  </span>
                  <div className="selected-location-code">
                    {formData.shelf} - {String(formData.row).padStart(2, '0')} - {String(formData.column).padStart(2, '0')}
                  </div>
                  <div className="selected-location-text">
                    <MapPin size={14} color="var(--primary)" />
                    Shelf {formData.shelf} • Row {String(formData.row).padStart(2, '0')} • Column {String(formData.column).padStart(2, '0')}
                  </div>
                </div>

                {/* Interactive Shelf Grid Matrix View Toggle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowShelfVisualizer(!showShelfVisualizer)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showShelfVisualizer ? '▼ Hide' : '▶ Show'} Interactive Shelf Visualizer (Shelf {activeShelf})
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click any slot to select</span>
                  </div>

                  {showShelfVisualizer && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px',
                      overflowX: 'auto'
                    }}>
                      {/* Grid Header (Columns) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `64px repeat(${totalCols}, minmax(36px, 1fr))`,
                        gap: 6,
                        marginBottom: 6,
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)'
                      }}>
                        <div style={{ textAlign: 'left', paddingLeft: 4 }}>ROWS</div>
                        {Array.from({ length: totalCols }, (_, i) => (
                          <div key={i}>{String(i + 1).padStart(2, '0')}</div>
                        ))}
                      </div>

                      {/* Grid Rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {Array.from({ length: totalRows }, (_, rIndex) => {
                          const rowNum = rIndex + 1;
                          return (
                            <div
                              key={rowNum}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `64px repeat(${totalCols}, minmax(36px, 1fr))`,
                                gap: 6,
                                alignItems: 'center'
                              }}
                            >
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                paddingLeft: 4
                              }}>
                                Row {String(rowNum).padStart(2, '0')}
                              </div>

                              {Array.from({ length: totalCols }, (_, cIndex) => {
                                const colNum = cIndex + 1;
                                const cellKey = `${activeShelf}-${rowNum}-${colNum}`;
                                const isOccupied = Boolean(occupiedMap[cellKey]);
                                const occupiedProduct = occupiedMap[cellKey];
                                const isSelected = formData.shelf === activeShelf && formData.row === rowNum && formData.column === colNum;

                                return (
                                  <button
                                    key={colNum}
                                    type="button"
                                    onClick={() => handleCellClick(rowNum, colNum)}
                                    onMouseEnter={() => isOccupied && setHoveredOccupied(occupiedProduct)}
                                    onMouseLeave={() => setHoveredOccupied(null)}
                                    title={
                                      isOccupied
                                        ? `Occupied by: ${occupiedProduct.name} (Shelf ${activeShelf} • Row ${rowNum} • Col ${colNum})`
                                        : `Available: Shelf ${activeShelf} • Row ${rowNum} • Col ${colNum}`
                                    }
                                    style={{
                                      height: 32,
                                      borderRadius: '6px',
                                      border: isSelected
                                        ? '2px solid var(--primary)'
                                        : isOccupied
                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                        : '1px solid var(--border)',
                                      background: isSelected
                                        ? 'var(--primary)'
                                        : isOccupied
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : 'var(--bg-card)',
                                      color: isSelected
                                        ? '#ffffff'
                                        : isOccupied
                                        ? 'var(--danger)'
                                        : 'var(--text-secondary)',
                                      fontSize: '0.82rem',
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {isSelected ? '✓' : isOccupied ? '●' : '□'}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Hover Info Tooltip */}
                      {hoveredOccupied && (
                        <div style={{
                          marginTop: 10,
                          padding: '6px 10px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <Info size={14} color="var(--danger)" />
                          <span>Product: <strong>{hoveredOccupied.name}</strong> • Location: {hoveredOccupied.locationDisplay}</span>
                        </div>
                      )}

                      {/* Legend */}
                      <div style={{
                        display: 'flex',
                        gap: 16,
                        justifyContent: 'center',
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border)',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>□</span> Available
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>●</span> Occupied
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span> Selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* ============================================================= */}
              {/* SECTION 5: EXPIRY TRACKING */}
              {/* ============================================================= */}
              <div className="retail-form-section">
                <div className="retail-section-title-wrap">
                  <h3 className="retail-section-title">
                    <Calendar size={15} /> 5. Expiry Tracking
                  </h3>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  <input
                    type="checkbox"
                    checked={formData.hasExpiry}
                    onChange={e => setFormData({ ...formData, hasExpiry: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  This product has an expiry date
                </label>

                {formData.hasExpiry && (
                  <div style={{
                    marginTop: 8,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14
                  }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Expiry Date <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.expiryDate}
                        onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                        required={formData.hasExpiry}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        Batch Number <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Optional)</span>
                      </label>
                      <input
                        className="form-input"
                        placeholder="e.g. BATCH-2026-01"
                        value={formData.batchNumber}
                        onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* SECTION 6: PRODUCT IMAGE & DESCRIPTION (PRODUCT DETAILS) */}
              {/* ============================================================= */}
              <div className="retail-form-section">
                <div className="retail-section-title-wrap">
                  <h3 className="retail-section-title">
                    <AlignLeft size={15} /> 6. Product Details <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 400 }}>(Optional)</span>
                  </h3>
                </div>

                <div className="retail-info-grid-even">
                  {/* Product Image */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Product Image
                    </label>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Upload size={14} /> Upload Image
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>OR Image URL</span>
                    </div>

                    <input
                      className="form-input"
                      placeholder="https://example.com/product-image.jpg"
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                      style={{ fontSize: '0.85rem' }}
                    />

                    {formData.imageUrl && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          className="btn-text"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          style={{ fontSize: '0.75rem', color: 'var(--danger)' }}
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Description
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Enter brief product details or specifications..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* ============================================================= */}
            {/* SECTION 7: ACTIONS / FOOTER */}
            {/* ============================================================= */}
            <div className="retail-modal-footer">
              {isEditing ? (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                  style={{ minWidth: 90 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Save size={16} /> {isEditing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </div>

          </form>
        )}

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="confirm-dialog-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <h3>Delete Product "{product.name}"?</h3>
              <p>This action will permanently delete the product from your store inventory.</p>
              <div className="confirm-dialog-actions">
                <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={isSubmitting}>
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
