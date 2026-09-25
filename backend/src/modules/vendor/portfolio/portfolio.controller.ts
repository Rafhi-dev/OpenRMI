import { Request, Response, NextFunction } from 'express';
import { vendorPortfolioService } from './portfolio.service';
import { AppError } from '../../../middlewares/errorHandler';

export class VendorPortfolioController {
  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const summary = await vendorPortfolioService.getPortfolioProgress(req.user.vendorId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vendorPortfolioController = new VendorPortfolioController();
export default vendorPortfolioController;
