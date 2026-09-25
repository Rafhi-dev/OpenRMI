import { Router } from 'express';
import { counterpartEvidenceController } from './evidence.controller';
import { singleFileUpload } from '../../../middlewares/fileValidator';

const router = Router();

router.get('/checklist', (req, res, next) => counterpartEvidenceController.getChecklist(req, res, next));
router.post('/presigned-url', (req, res, next) => counterpartEvidenceController.getPresignedUploadUrl(req, res, next));
router.post('/', (req, res, next) => counterpartEvidenceController.createEvidence(req, res, next));
router.post('/direct-upload', singleFileUpload('file'), (req, res, next) =>
  counterpartEvidenceController.directUpload(req, res, next)
);
router.delete('/:id', (req, res, next) => counterpartEvidenceController.deleteEvidence(req, res, next));

export default router;
