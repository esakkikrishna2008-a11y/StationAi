import express from 'express';
import { getActivityLogs, clearActivityLogs } from '../controllers/activityController.js';

const router = express.Router();

router.get('/', getActivityLogs);
router.delete('/', clearActivityLogs);

export default router;
