import { Request, Response, NextFunction } from 'express';
import { consultantEvaluationService } from './evaluation.service';
import { saveEvaluationSchema, batchSaveEvaluationSchema } from './evaluation.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class ConsultantEvaluationController {
  async getMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const matrix = await consultantEvaluationService.getEvaluationMatrix(
        req.user.userId,
        req.user.role,
        periodId
      );

      res.status(200).json({
        success: true,
        data: matrix,
      });
    } catch (error) {
      next(error);
    }
  }

  async getParameterEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const parameterCode = req.params.parameterCode as string;
      const periodId = req.query.periodId as string;

      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const parameterData = await consultantEvaluationService.getParameterEvaluation(
        req.user.userId,
        req.user.role,
        periodId,
        parameterCode
      );

      res.status(200).json({
        success: true,
        data: parameterData,
      });
    } catch (error) {
      next(error);
    }
  }

  async saveEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = saveEvaluationSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data evaluasi tidak valid',
          validation.error.format()
        );
      }

      const evaluation = await consultantEvaluationService.saveEvaluation(
        req.user.userId,
        req.user.role,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Evaluasi kriteria berhasil disimpan',
        data: evaluation,
      });
    } catch (error) {
      next(error);
    }
  }

  async batchSaveEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = batchSaveEvaluationSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data batch evaluasi tidak valid',
          validation.error.format()
        );
      }

      const result = await consultantEvaluationService.batchSaveEvaluations(
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

export const consultantEvaluationController = new ConsultantEvaluationController();
