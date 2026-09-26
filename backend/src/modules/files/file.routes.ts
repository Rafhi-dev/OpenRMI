import { Router } from 'express';
import { fileController } from './file.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

// Endpoint stream berkas eviden kriteria (mendukung JWT Cookie, Bearer header, dan ?token=...)
router.get('/evidence/:id', authGuard, (req, res, next) =>
  fileController.streamEvidence(req, res, next)
);

// Endpoint stream berkas dokumen tambahan pasca-FGD
router.get('/supplementary/:id', authGuard, (req, res, next) =>
  fileController.streamSupplementary(req, res, next)
);

export default router;
