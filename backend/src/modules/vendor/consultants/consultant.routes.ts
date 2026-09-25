import { Router } from 'express';
import { vendorConsultantController } from './consultant.controller';

const router = Router();

router.get('/', (req, res, next) => vendorConsultantController.listConsultants(req, res, next));
router.post('/', (req, res, next) => vendorConsultantController.registerConsultant(req, res, next));
router.put('/:id', (req, res, next) => vendorConsultantController.updateConsultant(req, res, next));

export default router;
