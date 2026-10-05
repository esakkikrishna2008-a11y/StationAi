import express from 'express';
import { submitFeedback, getFeedbackStats } from '../controllers/feedbackController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, submitFeedback);
router.get('/stats', authenticateToken, getFeedbackStats);

export default router;
