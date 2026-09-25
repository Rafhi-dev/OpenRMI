import { Router } from 'express';
import { consultantPerformanceController } from './performance.controller';

const router = Router();

router.get('/', (req, res, next) => consultantPerformanceController.getPerformance(req, res, next));
router.put('/', (req, res, next) => consultantPerformanceController.savePerformance(req, res, next));
router.post('/', (req, res, next) => consultantPerformanceController.savePerformance(req, res, next));

export default router;
