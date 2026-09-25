import { Router } from 'express';
import { adminVendorController } from './vendor.controller';
import { authController } from '../../auth/auth.controller';

const router = Router();

router.get('/', (req, res, next) => adminVendorController.listVendors(req, res, next));
router.post('/', (req, res, next) => adminVendorController.createVendor(req, res, next));
router.get('/:id', (req, res, next) => adminVendorController.getVendorById(req, res, next));
router.put('/:id', (req, res, next) => adminVendorController.updateVendor(req, res, next));
router.delete('/:id', (req, res, next) => adminVendorController.deleteVendor(req, res, next));

// Shortcut untuk impersonasi langsung dari ID vendor
router.post('/:id/impersonate', (req, res, next) => {
  req.body = { ...req.body, targetVendorId: req.params.id };
  return authController.impersonate(req, res, next);
});

export default router;
