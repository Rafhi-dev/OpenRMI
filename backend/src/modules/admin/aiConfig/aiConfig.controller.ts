import { Request, Response, NextFunction } from 'express';
import { adminAiConfigService } from './aiConfig.service';
import { updateAiConfigSchema } from './aiConfig.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class AdminAiConfigController {
  async getAiConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await adminAiConfigService.getAiConfig();
      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAiConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');

      const validation = updateAiConfigSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data konfigurasi AI tidak valid',
          validation.error.format()
        );
      }

      const updated = await adminAiConfigService.updateAiConfig(req.user.userId, validation.data);

      res.status(200).json({
        success: true,
        message: 'Konfigurasi AI global berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminAiConfigController = new AdminAiConfigController();
export default adminAiConfigController;
