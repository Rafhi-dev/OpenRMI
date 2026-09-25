import { Request, Response, NextFunction } from 'express';
import { historicalAssessmentService } from './historical.service';
import { saveHistoricalAssessmentSchema } from './historical.schema';
import { AppError } from '../../middlewares/errorHandler';

export class HistoricalAssessmentController {
  async getComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const data = await historicalAssessmentService.getHistoricalComparison(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        periodId
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async saveAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = saveHistoricalAssessmentSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data baseline historis tidak valid',
          validation.error.format()
        );
      }

      const saved = await historicalAssessmentService.saveHistoricalAssessment(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Data baseline skor historis tahun sebelumnya berhasil disimpan',
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const historicalAssessmentController = new HistoricalAssessmentController();
