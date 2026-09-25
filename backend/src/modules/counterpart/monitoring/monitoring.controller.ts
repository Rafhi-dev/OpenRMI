import { Request, Response, NextFunction } from 'express';
import { counterpartMonitoringService } from './monitoring.service';
import { confirmDraftSchema } from './monitoring.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class CounterpartMonitoringController {
  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter query periodId diperlukan.');
      }

      const progressData = await counterpartMonitoringService.getMonitoringProgress(
        req.user.tenantId,
        periodId
      );

      res.status(200).json({
        success: true,
        data: progressData,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const validation = confirmDraftSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data konfirmasi tidak valid',
          validation.error.format()
        );
      }

      const result = await counterpartMonitoringService.confirmDraft(
        req.user.tenantId,
        req.user.userId,
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

export const counterpartMonitoringController = new CounterpartMonitoringController();
