import { Request, Response, NextFunction } from 'express';
import { adminVendorService } from './vendor.service';
import { createVendorSchema, updateVendorSchema } from './vendor.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class AdminVendorController {
  async listVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await adminVendorService.listVendors({ page, limit, search, status });

      res.status(200).json({
        success: true,
        data: result.vendors,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getVendorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const vendor = await adminVendorService.getVendorById(id);
      res.status(200).json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');

      const validation = createVendorSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data vendor tidak valid',
          validation.error.format()
        );
      }

      const vendor = await adminVendorService.createVendor(req.user.userId, validation.data);

      res.status(201).json({
        success: true,
        message: 'Lembaga vendor berhasil didaftarkan',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');

      const id = req.params.id as string;
      const validation = updateVendorSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data pembaruan vendor tidak valid',
          validation.error.format()
        );
      }

      const updated = await adminVendorService.updateVendor(req.user.userId, id, validation.data);

      res.status(200).json({
        success: true,
        message: 'Data lembaga vendor berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');

      const id = req.params.id as string;
      const result = await adminVendorService.deleteVendor(req.user.userId, id);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.vendor || null,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminVendorController = new AdminVendorController();
export default adminVendorController;
