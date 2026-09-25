import { Router } from 'express';
import { vendorPortfolioController } from './portfolio.controller';

const router = Router();

router.get('/', (req, res, next) => vendorPortfolioController.getProgress(req, res, next));

export default router;
