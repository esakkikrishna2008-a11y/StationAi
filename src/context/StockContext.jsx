import { createContext, useState, useEffect, useContext } from 'react';
import { initialInventory, calculateStatus } from '../data';
import { calculateExpiryStatus } from '../utils';

const StockContext = createContext();

export function StockProvider({ children }) {
    const [inventory, setInventory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [activities, setActivities] = useState([]);

    // Initialize from LocalStorage or Fallback to initial
    useEffect(() => {
        const saved = localStorage.getItem('stationAI_inventory');
        if (saved) {
            setInventory(JSON.parse(saved));
        } else {
            setInventory(initialInventory);
            localStorage.setItem('stationAI_inventory', JSON.stringify(initialInventory));
        }

        const savedNotifs = localStorage.getItem('stationAI_notifications');
        if (savedNotifs) {
            setNotifications(JSON.parse(savedNotifs));
        }

        const savedActs = localStorage.getItem('stationAI_activities');
        if (savedActs) {
            setActivities(JSON.parse(savedActs));
        }
    }, []);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const addNotification = (title, message, type) => {
        const notif = {
            id: Date.now(),
            title,
            message,
            type,
            read: false,
            date: new Date().toISOString()
        };
        setNotifications(prev => {
            const newNotifs = [notif, ...prev].slice(0, 50);
            localStorage.setItem('stationAI_notifications', JSON.stringify(newNotifs));
            return newNotifs;
        });
    };

    const addActivity = (title, details, type) => {
        const act = {
            id: Date.now(),
            title,
            details,
            type,
            timestamp: new Date().toISOString()
        };
        setActivities(prev => {
            const acts = [act, ...prev].slice(0, 10);
            localStorage.setItem('stationAI_activities', JSON.stringify(acts));
            return acts;
        });
    };

    const markNotificationRead = (id) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
            localStorage.setItem('stationAI_notifications', JSON.stringify(updated));
            return updated;
        });
    };

    // Helper calculating real stock (excludes expired bins)
    const computeActiveStock = (item) => {
        if (!item.expiryTracking || !item.batches || item.batches.length === 0) {
            return item.stock; // generic fallback
        }
        return item.batches
            .filter(b => calculateExpiryStatus(b.expiryDate, true) !== 'EXPIRED')
            .reduce((acc, curr) => acc + curr.currentQuantity, 0);
    };

    const updateStock = (productId, newStockValue) => {
        if (newStockValue < 0) return;

        setInventory(prev => {
            const updated = prev.map(item => {
                if (item.id === productId) {
                    const oldStatus = calculateStatus(computeActiveStock(item), item.reorderLevel);
                    let newTotal = newStockValue;
                    let clonedBatches = item.batches ? [...item.batches] : [];

                    // Handle FEFO deduction if we are decreasing stock and tracking expiry
                    if (item.expiryTracking && newStockValue < item.stock) {
                        let differenceToDrop = item.stock - newStockValue;

                        // Sort by earliest expiry that is NOT expired, then pull from there
                        const sortedBatches = clonedBatches
                            .filter(b => calculateExpiryStatus(b.expiryDate, true) !== 'EXPIRED' && b.currentQuantity > 0)
                            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

                        for (let b of sortedBatches) {
                            if (differenceToDrop <= 0) break;
                            const bIdx = clonedBatches.findIndex(ox => ox.batchId === b.batchId);
                            if (clonedBatches[bIdx].currentQuantity >= differenceToDrop) {
                                clonedBatches[bIdx] = { ...clonedBatches[bIdx], currentQuantity: clonedBatches[bIdx].currentQuantity - differenceToDrop };
                                differenceToDrop = 0;
                            } else {
                                differenceToDrop -= clonedBatches[bIdx].currentQuantity;
                                clonedBatches[bIdx] = { ...clonedBatches[bIdx], currentQuantity: 0 };
                            }
                        }
                    } else if (item.expiryTracking && newStockValue > item.stock) {
                        // Cannot artificially bump tracked stock using standard plus/minus, it must go through load batch!
                        addToast("Stock increases for tracked items must use Load Stock panel", "warning");
                        return item;
                    }

                    const newlyComputedStock = item.expiryTracking ? clonedBatches.reduce((a, c) => a + c.currentQuantity, 0) : newStockValue;
                    const newStatus = calculateStatus(newlyComputedStock, item.reorderLevel);

                    if (newStatus === 'Out of Stock' && oldStatus !== 'Out of Stock') {
                        const msg = `${item.name} is now out of stock.`;
                        addToast(`Stock Over: ${msg}`, 'error');
                        addNotification(`🔴 ${item.name}`, 'Out of stock', 'error');
                        addActivity('Out of stock', `${item.name} depleted (0 units)`, 'error');
                    } else if (newStatus === 'Low Stock' && oldStatus === 'In Stock') {
                        const msg = `${item.name} has only ${newlyComputedStock} units remaining.`;
                        addToast(`Low Stock: ${msg}`, 'warning');
                        addNotification(`🟠 ${item.name}`, `Only ${newlyComputedStock} units remaining`, 'warning');
                        addActivity('Low stock', `${item.name} dropped below ${item.reorderLevel}`, 'warning');
                    }

                    return { ...item, stock: newlyComputedStock, batches: clonedBatches };
                }
                return item;
            });

            localStorage.setItem('stationAI_inventory', JSON.stringify(updated));
            return updated;
        });
    };

    const loadStockBatch = (productId, batchDetails) => {
        setInventory(prev => {
            const updated = prev.map(item => {
                if (item.id === productId) {
                    const existingBatches = item.batches || [];
                    const newBatches = [...existingBatches, batchDetails];
                    const newTotal = item.stock + batchDetails.quantityLoaded;

                    addToast(`Loaded ${batchDetails.quantityLoaded} units of ${item.name}`, 'success');
                    addActivity('Stock updated', `${item.name} (${batchDetails.batchId}): ${item.stock} → ${newTotal} units`, 'success');

                    return { ...item, stock: newTotal, batches: newBatches };
                }
                return item;
            });
            localStorage.setItem('stationAI_inventory', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <StockContext.Provider value={{
            inventory,
            updateStock,
            loadStockBatch,
            notifications,
            markNotificationRead,
            toasts,
            removeToast: (id) => setToasts(prev => prev.filter(t => t.id !== id)),
            activities,
            computeActiveStock
        }}>
            {children}
        </StockContext.Provider>
    );
}

export const useStock = () => useContext(StockContext);
