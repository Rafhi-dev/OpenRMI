import { Router } from 'express';
import { consultantAiAssistController } from './aiAssist.controller';

const router = Router();

router.post('/ai-assist/apply', (req, res, next) =>
  consultantAiAssistController.applyRecommendation(req, res, next)
);

router.post('/ai-assist/:parameterCode', (req, res, next) =>
  consultantAiAssistController.generateRecommendation(req, res, next)
);

router.post('/supplementary-documents/:id/ai-analyze', (req, res, next) =>
  consultantAiAssistController.analyzeSupplementaryDoc(req, res, next)
);

router.put('/supplementary-documents/analysis-result/:id', (req, res, next) =>
  consultantAiAssistController.updateAnalysisResult(req, res, next)
);

router.get('/supplementary-documents/:id/analysis-result', (req, res, next) =>
  consultantAiAssistController.getAnalysisResult(req, res, next)
);

export default router;
