import { Request, Response, NextFunction } from 'express';
import { consultantRecommendationService } from './recommendation.service';
import { createRecommendationSchema, updateRecommendationSchema } from './recommendation.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class ConsultantRecommendationController {
  async listRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const periodId = req.query.periodId as string;
      if (!periodId) {
        throw new AppError(400, 'MISSING_PERIOD_ID', 'Parameter periodId dalam query diperlukan.');
      }

      const result = await consultantRecommendationService.listRecommendations(
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

  async createRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const validation = createRecommendationSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data rekomendasi tidak valid',
          validation.error.format()
        );
      }

      const recommendation = await consultantRecommendationService.createRecommendation(
        req.user.userId,
        req.user.role,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Rekomendasi perbaikan berhasil ditambahkan',
        data: recommendation,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError(400, 'INVALID_ID', 'Parameter ID rekomendasi harus berupa angka.');
      }

      const validation = updateRecommendationSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data update rekomendasi tidak valid',
          validation.error.format()
        );
      }

      const updated = await consultantRecommendationService.updateRecommendation(
        req.user.userId,
        req.user.role,
        id,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Rekomendasi perbaikan berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
      }

      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        throw new AppError(400, 'INVALID_ID', 'Parameter ID rekomendasi harus berupa angka.');
      }

      const result = await consultantRecommendationService.deleteRecommendation(
        req.user.userId,
        req.user.role,
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

export const consultantRecommendationController = new ConsultantRecommendationController();
