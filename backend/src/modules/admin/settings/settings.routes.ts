import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { systemSettingsController } from './settings.controller';
import { authGuard } from '../../../middlewares/authGuard';
import { requireRole } from '../../../middlewares/rbacGuard';

const router = Router();

// Seluruh endpoint pengaturan sistem hanya dapat diakses oleh Administrator
router.use(authGuard);
router.use(requireRole(UserRole.ADMINISTRATOR));

router.get('/settings', (req, res, next) => systemSettingsController.getSettings(req, res, next));
router.put('/settings', (req, res, next) => systemSettingsController.updateSettings(req, res, next));

export default router;
