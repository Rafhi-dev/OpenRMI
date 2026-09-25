import { Router } from 'express';
import { counterpartSupplementaryController } from './supplementary.controller';
import { singleFileUpload } from '../../../middlewares/fileValidator';

const router = Router();

router.get('/', (req, res, next) => counterpartSupplementaryController.listDocs(req, res, next));
router.post('/presigned-url', (req, res, next) => counterpartSupplementaryController.getPresignedUploadUrl(req, res, next));
router.post('/', (req, res, next) => counterpartSupplementaryController.createDoc(req, res, next));
router.post('/direct-upload', singleFileUpload('file'), (req, res, next) =>
  counterpartSupplementaryController.directUpload(req, res, next)
);
router.delete('/:id', (req, res, next) => counterpartSupplementaryController.deleteDoc(req, res, next));

export default router;
