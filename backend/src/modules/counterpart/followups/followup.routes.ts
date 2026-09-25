import { Router } from 'express';
import { counterpartFollowUpController } from './followup.controller';

const router = Router();

router.get('/', (req, res, next) => counterpartFollowUpController.listRecommendations(req, res, next));
router.post('/', (req, res, next) => counterpartFollowUpController.createFollowUp(req, res, next));
router.delete('/:id', (req, res, next) => counterpartFollowUpController.deleteFollowUp(req, res, next));

export default router;
