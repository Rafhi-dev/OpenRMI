import { Router } from 'express';
import aiAssistRoutes from './aiAssist/aiAssist.routes';
import evaluationRoutes from './evaluations/evaluation.routes';
import performanceRoutes from './performance/performance.routes';
import recommendationRoutes from './recommendations/recommendation.routes';

import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { UserRole } from '@prisma/client';

const router = Router();

// 0. Ambil penugasan aktif (Consultant Assignments & Client Tenants)
router.get('/assignments', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
    }

    const where: any = req.user.role === UserRole.ADMINISTRATOR
      ? {}
      : { consultantId: req.user.userId, isActive: true };

    const assignments = await prisma.consultantAssignment.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
            industryCluster: true,
          },
        },
        period: {
          select: {
            id: true,
            year: true,
            status: true,
            modelCluster: true,
            isLocked: true,
            aspectDimScore: true,
            perfScore: true,
            finalRmiScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
});

// 1. Evaluasi Kriteria, Reviu Dokumen (Kolom J-L) & Matriks Parameter
router.use('/evaluations', evaluationRoutes);

// 2. Lembar Kalkulasi Aspek Kinerja (Tingkat Kesehatan & Komposit Risiko)
router.use('/performance', performanceRoutes);

// 3. Matriks Rekomendasi Perbaikan 2x2 (Impact vs Ease) & Action Plan
router.use('/recommendations', recommendationRoutes);

// 4. AI Assistance Routes
router.use('/', aiAssistRoutes);

export default router;
