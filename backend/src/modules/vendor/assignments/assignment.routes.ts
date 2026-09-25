import { Router } from 'express';
import { vendorAssignmentController } from './assignment.controller';

const router = Router();

router.get('/', (req, res, next) => vendorAssignmentController.listAssignments(req, res, next));
router.post('/', (req, res, next) => vendorAssignmentController.assignConsultant(req, res, next));
router.put('/:id', (req, res, next) => vendorAssignmentController.updateAssignment(req, res, next));

export default router;
