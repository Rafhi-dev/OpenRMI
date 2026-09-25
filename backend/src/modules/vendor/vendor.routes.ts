import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/rbacGuard';

import tenantRoutes from './tenants/tenant.routes';
import consultantRoutes from './consultants/consultant.routes';
import assignmentRoutes from './assignments/assignment.routes';
import portfolioRoutes from './portfolio/portfolio.routes';

const router = Router();

// Seluruh endpoint /api/v1/vendor/* dilindungi: Wajib login & Peran VENDOR
router.use(authGuard);
router.use(requireRole(UserRole.VENDOR));

router.use('/tenants', tenantRoutes);
router.use('/consultants', consultantRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/portfolio-progress', portfolioRoutes);

export default router;
