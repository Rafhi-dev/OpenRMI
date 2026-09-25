import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/rbacGuard';

import vendorRoutes from './vendors/vendor.routes';
import masterModelRoutes from './masterModels/masterModel.routes';
import aiConfigRoutes from './aiConfig/aiConfig.routes';
import healthRoutes from './health/health.routes';
import settingsRoutes from './settings/settings.routes';
import auditRoutes from './audit/audit.routes';

const router = Router();

// Seluruh endpoint /api/v1/admin/* dilindungi: Wajib login & Peran ADMINISTRATOR
router.use(authGuard);
router.use(requireRole(UserRole.ADMINISTRATOR));

router.use('/vendors', vendorRoutes);
router.use('/master-models', masterModelRoutes);
router.use('/ai-config', aiConfigRoutes);
router.use('/system/health', healthRoutes);
router.use('/system', settingsRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
