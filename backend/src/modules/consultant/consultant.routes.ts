import { Router } from 'express';
import aiAssistRoutes from './aiAssist/aiAssist.routes';

const router = Router();

// Mount AI Assistance routes
router.use('/', aiAssistRoutes);

export default router;
