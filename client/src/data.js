// Universal Retail Store Types & Configuration
export const STORE_TYPES = {
  'Stationery': {
    id: 'Stationery',
    label: 'Stationery',
    description: 'Stationery shop, books, writing instruments & office supplies',
    icon: 'PenTool',
    categories: [
      'Pens',
      'Notebooks',
      'Pencils',
      'Files & Folders',
      'Markers & Highlighters',
      'Paper & Envelopes',
      'Art Supplies',
      'School Supplies',
      'Office Supplies',
      'Desk Accessories',
      'Adhesives & Tapes',
      'Other'
    ],
    recommendedUnits: ['Piece', 'Pack', 'Box', 'Set', 'Dozen', 'Bundle'],
    defaultUnit: 'Piece',
    defaultExpiryTracking: false,
    samplePlaceholders: {
      productName: 'e.g. Classmate Notebook, Parker Pen, Acrylic Colors',
      brand: 'e.g. Classmate, Parker, Camlin, Doms, Faber-Castell',
      location: 'e.g. Shelf A, Row 02, Column 03'
    }
  },
  'Grocery': {
    id: 'Grocery',
    label: 'Grocery',
    description: 'Grocery store, food grains, daily cooking essentials & packaged goods',
    icon: 'ShoppingBag',
    categories: [
      'Rice & Grains',
      'Wheat & Flour',
      'Cooking Oil & Ghee',
      'Sugar & Salt',
      'Pulses & Dals',
      'Spices & Masalas',
      'Snacks & Biscuits',
      'Beverages & Tea',
      'Dairy & Eggs',
      'Packaged Food',
      'Household & Cleaning',
      'Other'
    ],
    recommendedUnits: ['Kg', 'Gram', 'Litre', 'ML', 'Pack', 'Piece', 'Bottle', 'Box', 'Dozen', 'Can', 'Bag'],
    defaultUnit: 'Kg',
    defaultExpiryTracking: true,
    samplePlaceholders: {
      productName: 'e.g. Basmati Rice, Sunflower Oil, Whole Wheat Atta',
      brand: 'e.g. India Gate, Fortune, Aashirvaad, Tata, Amul',
      location: 'e.g. Shelf A, Row 01, Column 01'
    }
  },
  'Departmental Store': {
    id: 'Departmental Store',
    label: 'Departmental Store',
    description: 'Multi-section retail store with groceries, personal care & home goods',
    icon: 'Store',
    categories: [
      'Food & Groceries',
      'Beverages',
      'Personal Care & Hygiene',
      'Household & Cleaning',
      'Stationery & Crafts',
      'Home & Kitchen',
      'Electronics & Accessories',
      'Apparel & Footwear',
      'Baby Care',
      'Other'
    ],
    recommendedUnits: ['Piece', 'Pack', 'Box', 'Bottle', 'Kg', 'Gram', 'Litre', 'ML', 'Set', 'Dozen'],
    defaultUnit: 'Piece',
    defaultExpiryTracking: false,
    samplePlaceholders: {
      productName: 'e.g. Herbal Shampoo 200ml, Dishwash Liquid, Cotton Towel',
      brand: 'e.g. Dove, Vim, Philips, Bombay Dyeing, Nestle',
      location: 'e.g. Shelf C, Row 02, Column 04'
    }
  },
  'Supermarket': {
    id: 'Supermarket',
    label: 'Supermarket',
    description: 'Large self-service supermarket with comprehensive retail categories',
    icon: 'ShoppingCart',
    categories: [
      'Groceries & Staples',
      'Beverages & Juices',
      'Dairy & Frozen',
      'Snacks & Confectionery',
      'Personal Care',
      'Cleaning & Laundry',
      'Home Essentials',
      'Bakery & Bread',
      'Electronics & Gadgets',
      'Other'
    ],
    recommendedUnits: ['Piece', 'Pack', 'Box', 'Bottle', 'Kg', 'Gram', 'Litre', 'ML', 'Can', 'Dozen', 'Set'],
    defaultUnit: 'Piece',
    defaultExpiryTracking: true,
    samplePlaceholders: {
      productName: 'e.g. Olive Oil 1L, Corn Flakes 500g, Liquid Detergent 2L',
      brand: 'e.g. Borges, Kellogg\'s, Surf Excel, Tropicana, Britannia',
      location: 'e.g. Shelf D, Row 01, Column 02'
    }
  },
  'General Store': {
    id: 'General Store',
    label: 'General Store',
    description: 'Neighborhood retail store with daily essentials, snacks & household items',
    icon: 'Package',
    categories: [
      'Daily Essentials',
      'Snacks & Sweets',
      'Beverages',
      'Personal Hygiene',
      'Cleaning Supplies',
      'Stationery & Gifts',
      'Household Items',
      'Batteries & Hardware',
      'Other'
    ],
    recommendedUnits: ['Piece', 'Pack', 'Box', 'Bottle', 'Kg', 'Gram', 'Litre', 'ML', 'Dozen', 'Strip', 'Set'],
    defaultUnit: 'Piece',
    defaultExpiryTracking: false,
    samplePlaceholders: {
      productName: 'e.g. Bathing Soap, Toothpaste 150g, Battery AA 4-Pack',
      brand: 'e.g. Dettol, Colgate, Duracell, Cadbury, Parle',
      location: 'e.g. Shelf B, Row 02, Column 03'
    }
  },
  'Other': {
    id: 'Other',
    label: 'Other Retail Store',
    description: 'Custom product-based retail business or specialty store',
    icon: 'Layers',
    categories: [
      'General Merchandise',
      'Fast Moving Items',
      'Specialty Products',
      'Consumables',
      'Accessories',
      'Other'
    ],
    recommendedUnits: ['Piece', 'Pack', 'Box', 'Bottle', 'Kg', 'Gram', 'Litre', 'ML', 'Meter', 'Set', 'Dozen', 'Bundle'],
    defaultUnit: 'Piece',
    defaultExpiryTracking: false,
    samplePlaceholders: {
      productName: 'e.g. Retail Product Name',
      brand: 'e.g. Brand Name',
      location: 'e.g. Shelf A, Row 01, Column 01'
    }
  }
};

// All Available Retail Units
export const ALL_UNITS = [
  'Piece',
  'Pack',
  'Box',
  'Bottle',
  'Kg',
  'Gram',
  'Litre',
  'ML',
  'Dozen',
  'Meter',
  'Set',
  'Can',
  'Strip',
  'Bundle',
  'Pair',
  'Bag',
  'Roll',
  'Pouch'
];

// Grid & Shelf Configuration (Default 4 shelves, 5 rows, 5 columns = 100 locations)
export const DEFAULT_SHELVES = ['A', 'B', 'C', 'D'];
export const EXTENDED_SHELVES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const DEFAULT_ROWS = 5;
export const DEFAULT_COLUMNS = 5;

export const shelves = DEFAULT_SHELVES;

/**
 * Get active Store Type from settings/localStorage.
 */
export const getStoreType = () => {
  try {
    const saved = localStorage.getItem('stationAI_store_type');
    if (saved && STORE_TYPES[saved]) return saved;
    return 'General Store';
  } catch {
    return 'General Store';
  }
};

/**
 * Set active Store Type.
 */
export const setStoreType = (type) => {
  try {
    if (STORE_TYPES[type]) {
      localStorage.setItem('stationAI_store_type', type);
      window.dispatchEvent(new CustomEvent('store-type-changed', { detail: type }));
    }
  } catch (e) {
    console.error('Failed to save store type:', e);
  }
};

/**
 * Get Custom Categories added by user.
 */
export const getCustomCategories = () => {
  try {
    return JSON.parse(localStorage.getItem('stationAI_custom_categories') || '[]');
  } catch {
    return [];
  }
};

/**
 * Add a custom category.
 */
export const addCustomCategory = (categoryName) => {
  if (!categoryName || !categoryName.trim()) return;
  const name = categoryName.trim();
  const current = getCustomCategories();
  if (!current.includes(name)) {
    const updated = [...current, name];
    localStorage.setItem('stationAI_custom_categories', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('categories-changed', { detail: updated }));
    return updated;
  }
  return current;
};

/**
 * Delete a custom category.
 */
export const deleteCustomCategory = (categoryName) => {
  if (!categoryName) return;
  const current = getCustomCategories();
  const updated = current.filter(c => c.toLowerCase() !== categoryName.toLowerCase());
  localStorage.setItem('stationAI_custom_categories', JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('categories-changed', { detail: updated }));
  return updated;
};

/**
 * Get all combined categories for a store type + custom categories.
 */
export const getAllCategoriesForStore = (storeType = getStoreType()) => {
  const storeConfig = STORE_TYPES[storeType] || STORE_TYPES['General Store'];
  const base = storeConfig.categories || [];
  const custom = getCustomCategories();
  const set = new Set([...base, ...custom]);
  return Array.from(set);
};

/**
 * Get prioritized units list for a store type.
 */
export const getUnitsForStore = (storeType = getStoreType()) => {
  const storeConfig = STORE_TYPES[storeType] || STORE_TYPES['General Store'];
  const recommended = storeConfig.recommendedUnits || ['Piece', 'Pack', 'Box'];
  const otherUnits = ALL_UNITS.filter(u => !recommended.includes(u));
  return [...recommended, ...otherUnits];
};

export const getGridConfig = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('stationAI_grid_config') || 'null');
    return {
      shelves: saved?.shelves || DEFAULT_SHELVES,
      rows: Number(saved?.rows) || DEFAULT_ROWS,
      columns: Number(saved?.columns) || DEFAULT_COLUMNS,
    };
  } catch {
    return {
      shelves: DEFAULT_SHELVES,
      rows: DEFAULT_ROWS,
      columns: DEFAULT_COLUMNS,
    };
  }
};

/**
 * Format standard location code (e.g. 'B-02-03').
 */
export const formatLocationCode = (shelf, row, column) => {
  const s = (shelf || 'A').toString().trim().toUpperCase().charAt(0) || 'A';
  const r = parseInt(row, 10) || 1;
  const c = parseInt(column, 10) || 1;
  return `${s}-${String(r).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
};

/**
 * Format readable location display (e.g. '📍 Shelf B • Row 2 • Column 03').
 */
export const formatLocationDisplay = (shelf, row, column) => {
  const s = (shelf || 'A').toString().trim().toUpperCase().charAt(0) || 'A';
  const r = parseInt(row, 10) || 1;
  const c = parseInt(column, 10) || 1;
  return `📍 Shelf ${s} • Row ${r} • Column ${String(c).padStart(2, '0')}`;
};

/**
 * Parse any location string (e.g. 'B-02-03', 'B2-03', 'B1-01', 'Shelf B') into structured object.
 */
export const parseLocation = (input) => {
  if (!input) {
    return { shelf: 'A', row: 1, column: 1, locationCode: 'A-01-01', locationDisplay: '📍 Shelf A • Row 1 • Column 01' };
  }

  if (typeof input === 'object') {
    const s = (input.shelf || 'A').toString().trim().toUpperCase().charAt(0) || 'A';
    const r = parseInt(input.rowNumber ?? input.row_number ?? input.row ?? 1, 10) || 1;
    const c = parseInt(input.columnNumber ?? input.column_number ?? input.column ?? 1, 10) || 1;
    return {
      shelf: s,
      row: r,
      column: c,
      locationCode: formatLocationCode(s, r, c),
      locationDisplay: formatLocationDisplay(s, r, c)
    };
  }

  const str = input.toString().trim();
  const m = str.match(/([A-Za-z])(?:-|\s*(?:Row|\s*))?\s*0*(\d+)(?:-|\s*(?:Col|Column|\s*))?\s*0*(\d+)/i);
  if (m) {
    const s = m[1].toUpperCase();
    const r = parseInt(m[2], 10) || 1;
    const c = parseInt(m[3], 10) || 1;
    return {
      shelf: s,
      row: r,
      column: c,
      locationCode: formatLocationCode(s, r, c),
      locationDisplay: formatLocationDisplay(s, r, c)
    };
  }

  const singleShelf = str.charAt(0).toUpperCase();
  return {
    shelf: singleShelf || 'A',
    row: 1,
    column: 1,
    locationCode: formatLocationCode(singleShelf || 'A', 1, 1),
    locationDisplay: formatLocationDisplay(singleShelf || 'A', 1, 1)
  };
};

export const shelfLayout = DEFAULT_SHELVES.map(s => ({
  shelf: s,
  name: `Shelf ${s}`,
  rows: DEFAULT_ROWS,
  columns: DEFAULT_COLUMNS
}));

/**
 * Calculate stock status string (internal).
 * Returns 'In Stock', 'Low Stock', or 'Out of Stock'.
 */
export const calculateStatus = (stock, reorderLevel) => {
    const qty = Number(stock);
    const rl = Number(reorderLevel);
    if (qty === 0) return 'Out of Stock';
    if (qty <= rl) return 'Low Stock';
    return 'In Stock';
};

/**
 * Get display-friendly status label.
 * Returns 'Available', 'Low Stock', or 'Out of Stock'.
 */
export const getDisplayStatus = (stock, reorderLevel) => {
    const qty = Number(stock);
    const rl = Number(reorderLevel);
    if (qty === 0) return 'Out of Stock';
    if (qty <= rl) return 'Low Stock';
    return 'Available';
};

/**
 * Get the shelf slot / location code string for a product (e.g. 'A-02-04').
 */
export const getShelfSlot = (product) => {
    if (!product) return 'A-01-01';
    if (product.locationCode) return product.locationCode;
    if (product.shelfLocation && /^[A-Z]-\d{2}-\d{2}$/i.test(product.shelfLocation)) return product.shelfLocation.toUpperCase();
    if (product.shelf && product.row !== undefined && product.column !== undefined) {
      return formatLocationCode(product.shelf, product.row, product.column);
    }
    if (product.shelfLocation) return product.shelfLocation;
    return 'A-01-01';
};

/**
 * Suggest alternative products for an out-of-stock item.
 */
export const getSuggestedAlternatives = (outOfStockProduct, allInventory) => {
    if (!outOfStockProduct || !allInventory) return [];

    // Match by same category with available stock
    const inStockSameCat = allInventory.filter(p =>
        p.id !== outOfStockProduct.id &&
        p.category === outOfStockProduct.category &&
        p.stock > 0
    );

    if (inStockSameCat.length >= 2) {
        return inStockSameCat.slice(0, 3);
    }

    // Related categories fallback
    const related = allInventory.filter(p =>
        p.id !== outOfStockProduct.id &&
        p.stock > 0 &&
        !inStockSameCat.some(sc => sc.id === p.id)
    ).slice(0, 3 - inStockSameCat.length);

    return [...inStockSameCat, ...related];
};
