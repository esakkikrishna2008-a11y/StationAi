/**
 * StationAI Centralized API Service
 * Encapsulates all backend REST API calls with JWT token authorization and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeader() {
  const token = localStorage.getItem('stationAI_token') || sessionStorage.getItem('stationAI_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    console.error(`[API Network Error] ${options.method || 'GET'} ${url}:`, err);
    if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please try again.');
    }
    throw err;
  }
}

async function handleResponse(res) {
  let data = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.error(`[API Response Error ${res.status}]`, res.url, data);
    }

    if (data.error) {
      throw new Error(data.error);
    }
    if (data.message) {
      throw new Error(data.message);
    }

    if (res.status === 401) {
      throw new Error('Invalid email or password');
    } else if (res.status === 403) {
      throw new Error('Access denied');
    } else if (res.status === 404) {
      throw new Error('API endpoint not found');
    } else if (res.status === 502) {
      throw new Error('Server gateway error. Check backend deployment.');
    } else if (res.status === 503) {
      throw new Error('Service unavailable. Please try again later.');
    } else if (res.status >= 500) {
      throw new Error('Server error. Please try again.');
    }
    throw new Error(`API Error (${res.status})`);
  }
  return data;
}

export const api = {
  // --- HEALTH ---
  async getHealth() {
    const res = await safeFetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  },

  // --- AUTH ---
  async login(email, password) {
    const res = await safeFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('stationAI_token', data.token);
    }
    return data;
  },

  async register(userData) {
    const res = await safeFetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('stationAI_token', data.token);
    }
    return data;
  },

  async getProfile() {
    const res = await safeFetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async updateProfile(updates) {
    const res = await safeFetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('stationAI_token', data.token);
    }
    return data;
  },

  logout() {
    localStorage.removeItem('stationAI_token');
    sessionStorage.removeItem('stationAI_token');
  },

  // --- PRODUCTS ---
  async getProducts() {
    const res = await safeFetch(`${API_BASE_URL}/products`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getProduct(id) {
    const res = await safeFetch(`${API_BASE_URL}/products/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createProduct(productData) {
    const res = await safeFetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(productData)
    });
    return handleResponse(res);
  },

  async updateProduct(id, productData) {
    const res = await safeFetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(productData)
    });
    return handleResponse(res);
  },

  async deleteProduct(id) {
    const res = await safeFetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- INVENTORY ---
  async updateStock(productId, newStockValue, reason = '') {
    const res = await safeFetch(`${API_BASE_URL}/inventory/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ newStockValue, reason })
    });
    return handleResponse(res);
  },

  async stockIn(productId, amount, reason = '') {
    const res = await safeFetch(`${API_BASE_URL}/inventory/stock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ productId, amount, reason })
    });
    return handleResponse(res);
  },

  async stockOut(productId, amount, reason = '') {
    const res = await safeFetch(`${API_BASE_URL}/inventory/stock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ productId, amount, reason })
    });
    return handleResponse(res);
  },

  async getTransactions() {
    const res = await safeFetch(`${API_BASE_URL}/inventory/transactions`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- SEARCH ---
  async searchProducts(query) {
    const res = await safeFetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query || '')}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getSearchHistory() {
    const res = await safeFetch(`${API_BASE_URL}/search/history`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async clearSearchHistory() {
    const res = await safeFetch(`${API_BASE_URL}/search/history`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- EXPIRY & ALERTS ---
  async getStockAlerts() {
    const res = await safeFetch(`${API_BASE_URL}/alerts/stock`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getExpiryAlerts() {
    const res = await safeFetch(`${API_BASE_URL}/expiry`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async loadStockBatch(productId, batchDetails) {
    const res = await safeFetch(`${API_BASE_URL}/expiry/batch/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(batchDetails)
    });
    return handleResponse(res);
  },

  // --- NOTIFICATIONS ---
  async getNotifications() {
    const res = await safeFetch(`${API_BASE_URL}/notifications`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async markNotificationRead(id) {
    const res = await safeFetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead() {
    const res = await safeFetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- FEEDBACK ---
  async submitFeedback(feedbackData) {
    const res = await safeFetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(feedbackData)
    });
    return handleResponse(res);
  },

  async getFeedbackStats() {
    const res = await safeFetch(`${API_BASE_URL}/feedback/stats`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- DASHBOARD & SETTINGS ---
  async getDashboardStats() {
    const res = await safeFetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getSettings() {
    const res = await safeFetch(`${API_BASE_URL}/settings`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async updateSettings(settingsData) {
    const res = await safeFetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settingsData)
    });
    return handleResponse(res);
  },

  // --- ACTIVITY LOG ---
  async getActivityLogs({ type, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (type && type !== 'ALL') params.set('type', type);
    const res = await safeFetch(`${API_BASE_URL}/activity?${params}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async clearActivityLogs() {
    const res = await safeFetch(`${API_BASE_URL}/activity`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- BILLING & POS ---
  async createBill(billData) {
    const res = await safeFetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(billData)
    });
    return handleResponse(res);
  },

  async getBills({ search, paymentMethod, status, dateFilter, startDate, endDate, limit = 100, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (paymentMethod && paymentMethod !== 'ALL') params.set('paymentMethod', paymentMethod);
    if (status && status !== 'ALL') params.set('status', status);
    if (dateFilter && dateFilter !== 'all') params.set('dateFilter', dateFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    const res = await safeFetch(`${API_BASE_URL}/bills?${params}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getBill(id) {
    const res = await safeFetch(`${API_BASE_URL}/bills/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async voidBill(id, { reason } = {}) {
    const res = await safeFetch(`${API_BASE_URL}/bills/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  async returnBillItem(billId, returnData) {
    const res = await safeFetch(`${API_BASE_URL}/bills/${billId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(returnData)
    });
    return handleResponse(res);
  },

  async getStockMovements({ productId, movementType, limit = 150, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (movementType && movementType !== 'ALL') params.set('movementType', movementType);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    const res = await safeFetch(`${API_BASE_URL}/bills/movements?${params}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // --- REPORTS ---
  async getInventorySummaryReport({ category, shelf } = {}) {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (shelf && shelf !== 'All') params.set('shelf', shelf);
    const res = await safeFetch(`${API_BASE_URL}/reports/summary?${params}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getLowStockReport() {
    const res = await safeFetch(`${API_BASE_URL}/reports/low-stock`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getOutOfStockReport() {
    const res = await safeFetch(`${API_BASE_URL}/reports/out-of-stock`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getExpiryReport() {
    const res = await safeFetch(`${API_BASE_URL}/reports/expiry`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getMovementsReport() {
    const res = await safeFetch(`${API_BASE_URL}/reports/movements`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  getInventoryCSVUrl() {
    return `${API_BASE_URL}/reports/export-csv`;
  }
};

