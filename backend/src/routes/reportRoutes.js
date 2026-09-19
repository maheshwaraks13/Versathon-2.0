import express from 'express';
import { analyzeReport } from '../controllers/reportController.js';

const router = express.Router();

router.post('/analyze', analyzeReport);

export default router;
