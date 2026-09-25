import { Request, Response, NextFunction } from 'express';
import { systemSettingsService } from './settings.service';
import { updateSystemSettingsSchema } from './settings.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class SystemSettingsController {
  /**
   * GET /api/v1/admin/system/settings
   * Membaca pengaturan sistem (batas ukuran upload & allowed file types)
   */
  async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await systemSettingsService.getSettings();
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/system/settings
   * Mengubah pengaturan sistem (termasuk batas upload file)
   */
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      }

      const validation = updateSystemSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data pengaturan tidak valid',
          validation.error.format()
        );
      }

      const updated = await systemSettingsService.updateSettings(req.user.userId, validation.data);

      res.status(200).json({
        success: true,
        message: `Pengaturan berhasil diperbarui. Batas upload berkas sekarang ${updated.maxUploadFileSizeMb} MB.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const systemSettingsController = new SystemSettingsController();
export default systemSettingsController;
