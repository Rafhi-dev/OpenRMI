import { Router } from 'express';
import { consultantRecommendationController } from './recommendation.controller';

const router = Router();

router.get('/', (req, res, next) => consultantRecommendationController.listRecommendations(req, res, next));
router.post('/', (req, res, next) => consultantRecommendationController.createRecommendation(req, res, next));
router.put('/:id', (req, res, next) => consultantRecommendationController.updateRecommendation(req, res, next));
router.delete('/:id', (req, res, next) => consultantRecommendationController.deleteRecommendation(req, res, next));

export default router;
