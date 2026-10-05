import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStockRoute
} from '../controllers/productController.js';
import { searchProducts } from '../controllers/searchController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getProducts);
router.get('/search', authenticateToken, searchProducts);
router.get('/:id', authenticateToken, getProductById);
router.post('/', authenticateToken, requireRole(['ADMIN']), createProduct);
router.put('/:id', authenticateToken, requireRole(['ADMIN']), updateProduct);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteProduct);
router.post('/:id/stock', authenticateToken, requireRole(['ADMIN']), updateProductStockRoute);

export default router;
