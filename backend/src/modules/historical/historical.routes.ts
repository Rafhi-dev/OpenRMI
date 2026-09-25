import { Router } from 'express';
import { historicalAssessmentController } from './historical.controller';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/rbacGuard';
import { UserRole } from '@prisma/client';

const router = Router();

// Semua route historical memerlukan autentikasi
router.use(authGuard);

// 1. Ambil data komparasi capaian YoY (Read-only untuk Vendor, Counterpart & Consultant)
router.get(
  '/comparison',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  historicalAssessmentController.getComparison
);

// 2. Input / Simpan data baseline skor historis tahun sebelumnya
// Sesuai aturan bisnis: Konsultan Eksternal dan Tim Counterpart memiliki hak input/edit setara
router.post(
  '/',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.ADMINISTRATOR
  ),
  historicalAssessmentController.saveAssessment
);

router.put(
  '/',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.ADMINISTRATOR
  ),
  historicalAssessmentController.saveAssessment
);

export default router;
