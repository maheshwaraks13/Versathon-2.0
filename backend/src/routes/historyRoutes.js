import express from 'express';
import { getDistinctTests, getTestTrends } from '../controllers/historyController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/tests', getDistinctTests);
router.get('/trends/:testName', getTestTrends);

export default router;
