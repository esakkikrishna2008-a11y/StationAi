import express from 'express';
import { getExpiryAlerts, loadStockBatch } from '../controllers/expiryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getExpiryAlerts);
router.post('/batch/:productId', authenticateToken, requireRole(['ADMIN']), loadStockBatch);

export default router;
