import express from 'express';
import { updateStock, stockIn, stockOut, getTransactions } from '../controllers/inventoryController.js';
import { getStockMovements } from '../controllers/billingController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.put('/:productId', authenticateToken, requireRole(['ADMIN']), updateStock);
router.post('/stock-in', authenticateToken, requireRole(['ADMIN']), stockIn);
router.post('/stock-out', authenticateToken, requireRole(['ADMIN']), stockOut);
router.get('/transactions', authenticateToken, getTransactions);
router.get('/movements', authenticateToken, getStockMovements);

export default router;

