import { Request, Response, NextFunction } from 'express';
import { consultantPerformanceService } from './performance.service';
import { savePerformanceSchema } from './performance.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class ConsultantPerformanceController {
  async getPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const result = await consultantPerformanceService.getPerformance(
        req.user.userId,
        req.user.role,
        periodId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async savePerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = savePerformanceSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data evaluasi kinerja tidak valid',
          validation.error.format()
        );
      }

      const result = await consultantPerformanceService.savePerformance(
        req.user.userId,
        req.user.role,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const consultantPerformanceController = new ConsultantPerformanceController();
