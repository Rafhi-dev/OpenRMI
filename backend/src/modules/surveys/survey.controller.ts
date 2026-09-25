import { Request, Response, NextFunction } from 'express';
import { riskCultureSurveyService } from './survey.service';
import { initiateSurveySchema, toggleSurveySchema } from './survey.schema';
import { AppError } from '../../middlewares/errorHandler';

export class RiskCultureSurveyController {
  async initiateOrGetSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = initiateSurveySchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data inisiasi survei tidak valid',
          validation.error.format()
        );
      }

      const survey = await riskCultureSurveyService.initiateOrGetSurvey(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Survei budaya risiko berhasil diinisiasi / diambil',
        data: survey,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleSurveyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = toggleSurveySchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data toggle status survei tidak valid',
          validation.error.format()
        );
      }

      const updated = await riskCultureSurveyService.toggleSurveyStatus(
        req.user.userId,
        req.user.role,
        req.user.tenantId,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: `Status penerimaan survei berhasil ${updated.isActive ? 'dibuka' : 'ditutup'}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSurveyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const data = await riskCultureSurveyService.getSurveyStatus(
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

  async getPerceptionGap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const data = await riskCultureSurveyService.getPerceptionGap(
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
}

export const riskCultureSurveyController = new RiskCultureSurveyController();
