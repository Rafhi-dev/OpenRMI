import { Request, Response, NextFunction } from 'express';
import { counterpartMonitoringService } from './monitoring.service';
import { confirmDraftSchema } from './monitoring.schema';
import { AppError } from '../../../middlewares/errorHandler';
import { prisma } from '../../../config/database';

export class CounterpartMonitoringController {
  async getPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Counterpart harus terafiliasi dengan Tenant perusahaan.');
      }

      const periods = await prisma.assessmentPeriod.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { year: 'desc' },
        include: {
          assignments: {
            where: { isActive: true },
            include: {
              consultant: {
                select: {
                  id: true,
                  fullName: true,
                  agencyName: true,
                },
              },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: periods,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
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
