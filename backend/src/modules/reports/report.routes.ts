import { Router } from 'express';
import { reportController } from './report.controller';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/rbacGuard';
import { UserRole } from '@prisma/client';

const router = Router();

// Seluruh endpoint pelaporan resmi memerlukan autentikasi
router.use(authGuard);

// 1. Tinjauan Agregat Lengkap Laporan Asesmen (JSON Preview)
router.get(
  '/:periodId/full-report',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  reportController.getFullReportData
);

// 2. Ekspor Berkas Excel Resmi Kompatibel SCORE RMI.xlsx (ExcelJS)
router.get(
  '/:periodId/export-excel',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  reportController.exportExcel
);

// 3. Ekspor Dokumen Cetak Formulir Ringkasan Hasil Format 1.2.8 PDF
router.get(
  '/:periodId/summary-pdf',
  requireRole(
    UserRole.EXTERNAL_CONSULTANT,
    UserRole.COUNTERPART_TEAM,
    UserRole.VENDOR,
    UserRole.ADMINISTRATOR
  ),
  reportController.exportSummaryPdf
);

export default router;
