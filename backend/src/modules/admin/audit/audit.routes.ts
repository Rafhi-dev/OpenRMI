import { Router } from 'express';
import { adminAuditController } from './audit.controller';

const router = Router();

router.get('/', (req, res, next) => adminAuditController.listLogs(req, res, next));

export default router;
