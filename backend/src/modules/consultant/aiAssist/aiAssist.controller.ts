import { Request, Response, NextFunction } from 'express';
import { consultantAiAssistService } from './aiAssist.service';
import {
  applyAiRecommendationSchema,
  analyzeSupplementaryDocSchema,
  updateAnalysisResultSchema,
} from './aiAssist.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class ConsultantAiAssistController {
  async generateRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const parameterCode = req.params.parameterCode as string;
      const periodId = req.body.periodId as string;

      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam body request diperlukan.');
      }

      const result = await consultantAiAssistService.generateParameterRecommendation(
        req.user.userId,
        req.user.role,
        periodId,
        parameterCode
      );

      res.status(200).json({
        success: true,
        message: `Rekomendasi AI untuk parameter ${parameterCode} berhasil dibuat`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async applyRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = applyAiRecommendationSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data apply rekomendasi tidak valid',
          validation.error.format()
        );
      }

      const result = await consultantAiAssistService.applyAiRecommendation(
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

  async analyzeSupplementaryDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const docId = req.params.id as string;
      const validation = analyzeSupplementaryDocSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data prompt analisis tidak valid',
          validation.error.format()
        );
      }

      const result = await consultantAiAssistService.analyzeSupplementaryDoc(
        req.user.userId,
        req.user.role,
        docId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Analisis cerdas AI terhadap dokumen tambahan berhasil diselesaikan',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAnalysisResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const resultId = req.params.id as string;
      const validation = updateAnalysisResultSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data catatan privat tidak valid',
          validation.error.format()
        );
      }

      const result = await consultantAiAssistService.updateAnalysisResult(
        req.user.userId,
        req.user.role,
        resultId,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Catatan internal privat asesor berhasil disimpan',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalysisResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const docId = req.params.id as string;
      const result = await consultantAiAssistService.getAnalysisResult(
        req.user.userId,
        req.user.role,
        docId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const consultantAiAssistController = new ConsultantAiAssistController();
