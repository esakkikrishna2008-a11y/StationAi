import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../services/api';
import { calculateExpiryStatus } from '../utils';
import { useAuth } from './AuthContext';

const StockContext = createContext();

export function StockProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from backend API
  const fetchInventory = useCallback(async () => {
    const token = localStorage.getItem('stationAI_token') || sessionStorage.getItem('stationAI_token');
    if (!token && !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.getProducts();
      if (res && res.products && Array.isArray(res.products)) {
        setInventory(res.products);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load inventory from API:', err);
      if (err.message?.includes('Unable to connect') || err.message?.includes('gateway error') || err.message?.includes('Backend unavailable') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Unable to connect to backend server. Please ensure the backend is running.');
      } else if (err.message?.includes('Authentication') || err.message?.includes('token') || err.message?.includes('401') || err.message?.includes('Invalid email')) {
        // Not a backend outage, just unauthenticated
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('stationAI_token') || sessionStorage.getItem('stationAI_token');
    if (!token && !isAuthenticated) return;

    try {
      const res = await api.getNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [isAuthenticated]);

  const fetchActivities = useCallback(async () => {
    const token = localStorage.getItem('stationAI_token') || sessionStorage.getItem('stationAI_token');
    if (!token && !isAuthenticated) return;

    try {
      const res = await api.getTransactions();
      if (res && res.transactions) {
        setActivities(res.transactions);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      setError(null);
      fetchInventory();
      fetchNotifications();
      fetchActivities();
    }
  }, [isAuthenticated, fetchInventory, fetchNotifications, fetchActivities]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const computeActiveStock = (item) => {
    if (!item.expiryTracking || !item.batches || item.batches.length === 0) {
      return item.stock;
    }
    return item.batches
      .filter(b => calculateExpiryStatus(b.expiryDate, true) !== 'EXPIRED')
      .reduce((acc, curr) => acc + (curr.currentQuantity || 0), 0);
  };

  const updateStock = async (productId, newStockValue, reason = '') => {
    try {
      const res = await api.updateStock(productId, newStockValue, reason);
      if (res && res.product) {
        setInventory(prev => prev.map(p => p.id === productId ? res.product : p));
        addToast(`Stock updated for ${res.product.name}`, 'success');
        fetchNotifications();
        fetchActivities();
        return res.product;
      }
    } catch (err) {
      addToast(err.message || 'Failed to update stock', 'error');
      throw err;
    }
  };

  const stockIn = async (productId, amount, reason = '') => {
    try {
      const res = await api.stockIn(productId, amount, reason);
      if (res && res.product) {
        setInventory(prev => prev.map(p => p.id === productId ? res.product : p));
        addToast(res.message || 'Stock added successfully', 'success');
        fetchNotifications();
        fetchActivities();
        return res.product;
      }
    } catch (err) {
      addToast(err.message || 'Stock In failed', 'error');
      throw err;
    }
  };

  const stockOut = async (productId, amount, reason = '') => {
    try {
      const res = await api.stockOut(productId, amount, reason);
      if (res && res.product) {
        setInventory(prev => prev.map(p => p.id === productId ? res.product : p));
        addToast(res.message || 'Stock deducted successfully', 'success');
        fetchNotifications();
        fetchActivities();
        return res.product;
      }
    } catch (err) {
      addToast(err.message || 'Stock Out failed', 'error');
      throw err;
    }
  };

  const loadStockBatch = async (productId, batchDetails) => {
    try {
      const res = await api.loadStockBatch(productId, batchDetails);
      addToast(res.message || 'Batch loaded successfully', 'success');
      await fetchInventory();
      fetchNotifications();
      fetchActivities();
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to load batch', 'error');
      throw err;
    }
  };

  const createProduct = async (productData) => {
    try {
      const res = await api.createProduct(productData);
      if (res && res.product) {
        setInventory(prev => [res.product, ...prev]);
        addToast(`Product "${res.product.name}" created successfully`, 'success');
        fetchNotifications();
        fetchActivities();
        return res.product;
      }
    } catch (err) {
      addToast(err.message || 'Failed to create product', 'error');
      throw err;
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      const res = await api.updateProduct(id, productData);
      if (res && res.product) {
        setInventory(prev => prev.map(p => p.id === Number(id) ? res.product : p));
        addToast(`Product "${res.product.name}" updated`, 'success');
        return res.product;
      }
    } catch (err) {
      addToast(err.message || 'Failed to update product', 'error');
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await api.deleteProduct(id);
      setInventory(prev => prev.filter(p => p.id !== Number(id)));
      addToast(res.message || 'Product deleted', 'info');
      fetchActivities();
      return res;
    } catch (err) {
      addToast(err.message || 'Failed to delete product', 'error');
      throw err;
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const completeBill = async (billData) => {
    try {
      const res = await api.createBill(billData);
      if (res && res.bill) {
        addToast(`Bill ${res.bill.billingId} created successfully (Total: ₹${res.bill.grandTotal})`, 'success');
        await fetchInventory();
        fetchNotifications();
        fetchActivities();
        return res.bill;
      }
    } catch (err) {
      addToast(err.message || 'Billing failed', 'error');
      throw err;
    }
  };

  const processReturn = async (billId, returnData) => {
    try {
      const res = await api.returnBillItem(billId, returnData);
      addToast(res.message || 'Item return processed successfully', 'success');
      await fetchInventory();
      fetchNotifications();
      fetchActivities();
      return res;
    } catch (err) {
      addToast(err.message || 'Return processing failed', 'error');
      throw err;
    }
  };

  const voidBill = async (billId, { reason } = {}) => {
    try {
      const res = await api.voidBill(billId, { reason });
      addToast(res.message || 'Bill voided successfully and stock restored', 'success');
      await fetchInventory();
      fetchNotifications();
      fetchActivities();
      return res;
    } catch (err) {
      addToast(err.message || 'Voiding bill failed', 'error');
      throw err;
    }
  };

  return (
    <StockContext.Provider value={{
      inventory,
      isLoading,
      error,
      refreshInventory: fetchInventory,
      updateStock,
      stockIn,
      stockOut,
      loadStockBatch,
      createProduct,
      updateProduct,
      deleteProduct,
      completeBill,
      voidBill,
      processReturn,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      toasts,
      addToast,
      removeToast: (id) => setToasts(prev => prev.filter(t => t.id !== id)),
      activities,
      computeActiveStock
    }}>
      {children}
    </StockContext.Provider>
  );
}

export const useStock = () => useContext(StockContext);

