import { Router } from 'express';
import aiAssistRoutes from './aiAssist/aiAssist.routes';
import evaluationRoutes from './evaluations/evaluation.routes';
import performanceRoutes from './performance/performance.routes';
import recommendationRoutes from './recommendations/recommendation.routes';

const router = Router();

// 1. Evaluasi Kriteria, Reviu Dokumen (Kolom J-L) & Matriks Parameter
router.use('/evaluations', evaluationRoutes);

// 2. Lembar Kalkulasi Aspek Kinerja (Tingkat Kesehatan & Komposit Risiko)
router.use('/performance', performanceRoutes);

// 3. Matriks Rekomendasi Perbaikan 2x2 (Impact vs Ease) & Action Plan
router.use('/recommendations', recommendationRoutes);

// 4. AI Assistance Routes
router.use('/', aiAssistRoutes);

export default router;
