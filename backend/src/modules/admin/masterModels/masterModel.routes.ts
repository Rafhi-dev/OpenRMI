import { Router } from 'express';
import { adminMasterModelController } from './masterModel.controller';

const router = Router();

router.get('/', (req, res, next) => adminMasterModelController.getAllTaxonomy(req, res, next));
router.get('/parameter/:code', (req, res, next) => adminMasterModelController.getParameterByCode(req, res, next));
router.put('/criterion/:id', (req, res, next) => adminMasterModelController.updateCriterion(req, res, next));

export default router;
