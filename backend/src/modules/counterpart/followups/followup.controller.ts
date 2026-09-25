import { Request, Response, NextFunction } from 'express';
import { counterpartFollowUpService } from './followup.service';
import { createFollowUpSchema } from './followup.schema';
import { AppError } from '../../../middlewares/errorHandler';
import { prisma } from '../../../config/database';

export class CounterpartFollowUpController {
  async listRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      let periodId = req.query.periodId as string;
      if (!periodId) {
        const latestPeriod = await prisma.assessmentPeriod.findFirst({
          where: { tenantId: req.user.tenantId },
          orderBy: { year: 'desc' },
        });
        if (!latestPeriod) {
          throw new AppError(404, 'PERIOD_NOT_FOUND', 'Belum ada periode penilaian aktif untuk perusahaan Anda.');
        }
        periodId = latestPeriod.id;
      }

      const list = await counterpartFollowUpService.listRecommendations(req.user.tenantId, periodId);

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error) {
      next(error);
    }
  }

  async createFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const validation = createFollowUpSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data tindak lanjut tidak valid',
          validation.error.format()
        );
      }

      const followUp = await counterpartFollowUpService.createFollowUp(
        req.user.tenantId,
        req.user.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Laporan progres tindak lanjut rekomendasi berhasil disimpan',
        data: followUp,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const id = req.params.id as string;
      const result = await counterpartFollowUpService.deleteFollowUp(
        req.user.tenantId,
        req.user.userId,
        id
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const counterpartFollowUpController = new CounterpartFollowUpController();
