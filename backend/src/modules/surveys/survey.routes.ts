import { Router } from 'express';
import { riskCultureSurveyController } from './survey.controller';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/rbacGuard';
import { UserRole } from '@prisma/client';

const router = Router();

// Seluruh route internal manajemen survei membutuhkan autentikasi
router.use(authGuard);

// 1. Inisiasi atau ambil konfigurasi survei & URL publik
router.post(
  '/initiate',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  riskCultureSurveyController.initiateOrGetSurvey
);

// 2. Buka / Tutup status pengisian survei
router.patch(
  '/toggle',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  riskCultureSurveyController.toggleSurveyStatus
);

// 3. Ambil status & statistik agregat pengisian survei
router.get(
  '/status',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  riskCultureSurveyController.getSurveyStatus
);

// 4. Analisis Kesenjangan Persepsi (Perception Gap: Survei vs Asesor D1 / P01)
// Read-only mutlak untuk Vendor & Counterpart
router.get(
  '/perception-gap',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  riskCultureSurveyController.getPerceptionGap
);

export default router;
