import express from 'express';
import { analyzeReport, saveReport, getSavedReports, deleteSavedReport } from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/analyze', analyzeReport);
router.post('/save', authMiddleware, saveReport);
router.get('/saved', authMiddleware, getSavedReports);
router.delete('/saved/:id', authMiddleware, deleteSavedReport);

export default router;
