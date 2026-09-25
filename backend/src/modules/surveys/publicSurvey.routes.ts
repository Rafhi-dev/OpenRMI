import { Router } from 'express';
import { publicSurveyController } from './publicSurvey.controller';

const router = Router();

// Endpoint publik terbuka tanpa autentikasi bagi responden internal BUMN
// 1. Ambil pertanyaan dan informasi survei berdasarkan token unik
router.get('/:token', publicSurveyController.getPublicSurvey);

// 2. Kirim jawaban survei anonim
router.post('/:token/submit', publicSurveyController.submitPublicSurvey);

export default router;
