import { Router } from 'express';
import { counterpartMonitoringController } from './monitoring.controller';

const router = Router();

router.get('/progress', (req, res, next) => counterpartMonitoringController.getProgress(req, res, next));
router.post('/confirm-draft', (req, res, next) => counterpartMonitoringController.confirmDraft(req, res, next));

export default router;
