import express from 'express';
import {
  getInventorySummaryReport,
  getLowStockReport,
  getOutOfStockReport,
  getExpiryReport,
  getStockMovementsReport,
  exportInventoryCSV
} from '../controllers/reportController.js';

const router = express.Router();

router.get('/summary', getInventorySummaryReport);
router.get('/low-stock', getLowStockReport);
router.get('/out-of-stock', getOutOfStockReport);
router.get('/expiry', getExpiryReport);
router.get('/movements', getStockMovementsReport);
router.get('/export-csv', exportInventoryCSV);

export default router;
