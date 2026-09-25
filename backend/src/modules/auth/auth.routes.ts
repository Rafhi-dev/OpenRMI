import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authController } from './auth.controller';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/rbacGuard';
import { authRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Public auth endpoints
router.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

// Protected auth endpoints
router.get('/me', authGuard, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout', authGuard, (req, res, next) => authController.logout(req, res, next));

// Vendor Impersonation (Hanya Administrator Platform)
router.post(
  '/impersonate',
  authGuard,
  requireRole(UserRole.ADMINISTRATOR),
  (req, res, next) => authController.impersonate(req, res, next)
);

// Keluar dari mode Impersonasi
router.post(
  '/exit-impersonate',
  authGuard,
  (req, res, next) => authController.exitImpersonate(req, res, next)
);

export default router;
