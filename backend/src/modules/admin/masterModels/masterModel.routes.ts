import { Router } from 'express';
import { adminMasterModelController } from './masterModel.controller';

const router = Router();

router.get('/', (req, res, next) => adminMasterModelController.getAllTaxonomy(req, res, next));
router.get('/parameter/:code', (req, res, next) => adminMasterModelController.getParameterByCode(req, res, next));
router.put('/dimension/:id', (req, res, next) => adminMasterModelController.updateDimension(req, res, next));
router.put('/sub-dimension/:id', (req, res, next) => adminMasterModelController.updateSubDimension(req, res, next));
router.put('/parameter/:id', (req, res, next) => adminMasterModelController.updateParameter(req, res, next));
router.put('/criterion/:id', (req, res, next) => adminMasterModelController.updateCriterion(req, res, next));

export default router;
