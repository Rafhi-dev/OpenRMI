import { Request, Response, NextFunction } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from './errorHandler';

export interface TenantContextInfo {
  tenantId: string;
  vendorId?: string | null;
  userId: string;
  impersonatedByAdminId?: string | null;
}

/**
 * Middleware untuk memvalidasi akses tenant berdasarkan 4 Peran RBAC
 * Parameter tenantId dapat diambil dari req.params.tenantId, req.query.tenantId, atau req.body.tenantId
 */
export const requireTenantAccess = (paramName = 'tenantId') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan.'));
      }

      // Ambil tenantId dari params, query, atau body
      const targetTenantId =
        req.params[paramName] ||
        (req.query[paramName] as string) ||
        req.body[paramName];

      if (!targetTenantId) {
        return next(new AppError(400, 'MISSING_TENANT_ID', `Parameter '${paramName}' diperlukan.`));
      }

      const { role, userId, vendorId, tenantId: userTenantId } = req.user;

      // 1. Peran ADMINISTRATOR: Akses global penuh
      if (role === UserRole.ADMINISTRATOR) {
        return next();
      }

      // 2. Peran VENDOR: Hanya dapat mengakses tenant klien dalam portofolionya
      if (role === UserRole.VENDOR) {
        if (!vendorId) {
          return next(new AppError(403, 'FORBIDDEN', 'Akun vendor Anda tidak terafiliasi dengan ID vendor valid.'));
        }

        const tenant = await prisma.tenant.findUnique({
          where: { id: targetTenantId },
          select: { vendorId: true },
        });

        if (!tenant || tenant.vendorId !== vendorId) {
          return next(
            new AppError(403, 'TENANT_ACCESS_DENIED', 'Anda tidak memiliki hak akses ke tenant klien ini.')
          );
        }

        return next();
      }

      // 3. Peran COUNTERPART_TEAM: Hanya dapat mengakses perusahaannya sendiri
      if (role === UserRole.COUNTERPART_TEAM) {
        if (!userTenantId || userTenantId !== targetTenantId) {
          return next(
            new AppError(403, 'TENANT_ACCESS_DENIED', 'Tim Counterpart hanya berhak mengakses data perusahaannya sendiri.')
          );
        }
        return next();
      }

      // 4. Peran EXTERNAL_CONSULTANT: Hanya dapat mengakses jika memiliki penugasan aktif (ConsultantAssignment)
      if (role === UserRole.EXTERNAL_CONSULTANT) {
        const activeAssignment = await prisma.consultantAssignment.findFirst({
          where: {
            consultantId: userId,
            tenantId: targetTenantId,
            isActive: true,
          },
        });

        if (!activeAssignment) {
          return next(
            new AppError(
              403,
              'CONSULTANT_NOT_ASSIGNED',
              'Anda tidak memiliki surat penugasan aktif (Assignment) pada tenant perusahaan ini.'
            )
          );
        }

        return next();
      }

      return next(new AppError(403, 'FORBIDDEN', 'Peran tidak dikenali untuk otorisasi tenant.'));
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Menyuntikkan variabel sesi PostgreSQL RLS ke dalam transaksi database
 */
export const setPostgresRlsSession = async (
  tx: Prisma.TransactionClient,
  context: TenantContextInfo
): Promise<void> => {
  const vendorIdStr = context.vendorId || '';
  const tenantIdStr = context.tenantId || '';
  const userIdStr = context.userId || '';
  const impersonatedStr = context.impersonatedByAdminId || '';

  await tx.$executeRawUnsafe(`
    SET LOCAL app.current_vendor_id = '${vendorIdStr}';
    SET LOCAL app.current_tenant_id = '${tenantIdStr}';
    SET LOCAL app.current_user_id = '${userIdStr}';
    SET LOCAL app.impersonated_by_admin_id = '${impersonatedStr}';
  `);
};
