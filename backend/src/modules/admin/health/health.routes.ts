import { Router } from 'express';
import { adminHealthController } from './health.controller';

const router = Router();

router.get('/', (req, res, next) => adminHealthController.checkHealth(req, res, next));

export default router;
