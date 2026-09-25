import { Router } from 'express';
import { vendorTenantController } from './tenant.controller';

const router = Router();

router.get('/', (req, res, next) => vendorTenantController.listTenants(req, res, next));
router.post('/', (req, res, next) => vendorTenantController.createTenant(req, res, next));
router.get('/:id', (req, res, next) => vendorTenantController.getTenantById(req, res, next));
router.put('/:id', (req, res, next) => vendorTenantController.updateTenant(req, res, next));

export default router;
