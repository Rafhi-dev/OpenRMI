import { Request, Response, NextFunction } from 'express';
import { riskCultureSurveyService } from './survey.service';
import { submitPublicSurveySchema } from './survey.schema';
import { AppError } from '../../middlewares/errorHandler';

export class PublicSurveyController {
  async getPublicSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      if (!token) {
        throw new AppError(400, 'MISSING_TOKEN', 'Token survei tidak disertakan.');
      }

      const surveyData = await riskCultureSurveyService.getPublicSurvey(token);

      res.status(200).json({
        success: true,
        data: surveyData,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitPublicSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      if (!token) {
        throw new AppError(400, 'MISSING_TOKEN', 'Token survei tidak disertakan.');
      }

      const validation = submitPublicSurveySchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data jawaban survei tidak valid',
          validation.error.format()
        );
      }

      const result = await riskCultureSurveyService.submitPublicSurvey(token, validation.data);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          submittedAt: result.submittedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const publicSurveyController = new PublicSurveyController();
