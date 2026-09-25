import { Request, Response, NextFunction } from 'express';
import { vendorConsultantService } from './consultant.service';
import { createConsultantSchema, updateConsultantSchema } from './consultant.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class VendorConsultantController {
  async listConsultants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;

      const result = await vendorConsultantService.listConsultants(req.user.vendorId, { page, limit, search });

      res.status(200).json({
        success: true,
        data: result.consultants,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async registerConsultant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const validation = createConsultantSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data pendaftaran konsultan tidak valid',
          validation.error.format()
        );
      }

      const consultant = await vendorConsultantService.registerConsultant(
        req.user.vendorId,
        req.user.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        message: 'Akun konsultan penilai berhasil didaftarkan',
        data: consultant,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateConsultant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const validation = updateConsultantSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data pembaruan konsultan tidak valid',
          validation.error.format()
        );
      }

      const id = req.params.id as string;
      const updated = await vendorConsultantService.updateConsultant(
        req.user.vendorId,
        id,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Data konsultan berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vendorConsultantController = new VendorConsultantController();
export default vendorConsultantController;
