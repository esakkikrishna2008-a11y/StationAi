import express from 'express';
import { searchProducts, getSearchHistory, clearSearchHistory } from '../controllers/searchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, searchProducts);
router.get('/history', authenticateToken, getSearchHistory);
router.post('/history', authenticateToken, (req, res) => res.json({ message: 'Search history recorded' }));
router.delete('/history', authenticateToken, clearSearchHistory);

export default router;
