import express from 'express';
import {
  createBill,
  getBills,
  getBillById,
  voidBill,
  returnBillItem,
  getStockMovements
} from '../controllers/billingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Billing Routes
router.post('/', authenticateToken, createBill);
router.get('/', authenticateToken, getBills);
router.get('/movements', authenticateToken, getStockMovements);
router.get('/:id', authenticateToken, getBillById);
router.post('/:id/void', authenticateToken, voidBill);
router.post('/:id/return', authenticateToken, returnBillItem);

export default router;

