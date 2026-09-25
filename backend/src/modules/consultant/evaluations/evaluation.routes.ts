import { Router } from 'express';
import { consultantEvaluationController } from './evaluation.controller';

const router = Router();

router.get('/matrix', (req, res, next) => consultantEvaluationController.getMatrix(req, res, next));
router.get('/parameter/:parameterCode', (req, res, next) =>
  consultantEvaluationController.getParameterEvaluation(req, res, next)
);
router.put('/', (req, res, next) => consultantEvaluationController.saveEvaluation(req, res, next));
router.post('/batch', (req, res, next) => consultantEvaluationController.batchSaveEvaluations(req, res, next));

export default router;
