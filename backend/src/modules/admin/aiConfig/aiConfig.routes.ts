import { Router } from 'express';
import { adminAiConfigController } from './aiConfig.controller';

const router = Router();

router.get('/', (req, res, next) => adminAiConfigController.getAiConfig(req, res, next));
router.put('/', (req, res, next) => adminAiConfigController.updateAiConfig(req, res, next));

export default router;
