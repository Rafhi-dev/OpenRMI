import { Router } from 'express';
import evidenceRoutes from './evidences/evidence.routes';
import supplementaryRoutes from './supplementary/supplementary.routes';
import monitoringRoutes from './monitoring/monitoring.routes';
import followupRoutes from './followups/followup.routes';
import { counterpartEvidenceController } from './evidences/evidence.controller';
import { counterpartMonitoringController } from './monitoring/monitoring.controller';

const router = Router();

// Alias langsung sesuai spesifikasi PRD & TODO.md
router.get('/evidence-checklist', (req, res, next) =>
  counterpartEvidenceController.getChecklist(req, res, next)
);
router.get('/monitoring-progress', (req, res, next) =>
  counterpartMonitoringController.getProgress(req, res, next)
);
router.post('/confirm-draft', (req, res, next) =>
  counterpartMonitoringController.confirmDraft(req, res, next)
);

// Sub-modul routes
router.use('/evidences', evidenceRoutes);
router.use('/supplementary-documents', supplementaryRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/follow-ups', followupRoutes);

export default router;
