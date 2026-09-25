import { Request, Response, NextFunction } from 'express';
import { vendorTenantService } from './tenant.service';
import { createTenantSchema, updateTenantSchema } from './tenant.schema';
import { AppError } from '../../../middlewares/errorHandler';

export class VendorTenantController {
  async listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;

      const result = await vendorTenantService.listTenants(req.user.vendorId, { page, limit, search });

      res.status(200).json({
        success: true,
        data: result.tenants,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const id = req.params.id as string;
      const tenant = await vendorTenantService.getTenantById(req.user.vendorId, id);
      res.status(200).json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const validation = createTenantSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data tenant tidak valid',
          validation.error.format()
        );
      }

      const tenant = await vendorTenantService.createTenant(req.user.vendorId, req.user.userId, validation.data);

      res.status(201).json({
        success: true,
        message: 'Perusahaan klien berhasil didaftarkan ke dalam portofolio vendor',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.vendorId) {
        throw new AppError(403, 'FORBIDDEN', 'Akun Anda tidak terafiliasi dengan vendor mana pun');
      }

      const validation = updateTenantSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data pembaruan tenant tidak valid',
          validation.error.format()
        );
      }

      const id = req.params.id as string;
      const updated = await vendorTenantService.updateTenant(
        req.user.vendorId,
        id,
        req.user.userId,
        validation.data
      );

      res.status(200).json({
        success: true,
        message: 'Profil perusahaan klien berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vendorTenantController = new VendorTenantController();
export default vendorTenantController;
