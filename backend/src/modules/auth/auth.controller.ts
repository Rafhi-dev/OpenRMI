import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, impersonateSchema } from './auth.schema';
import { setAuthCookies, clearAuthCookies } from './auth.jwt';
import { logAuditEvent } from '../../utils/auditLogger';
import { AppError } from '../../middlewares/errorHandler';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Mendukung login menggunakan Username ATAU Email + Kata Sandi
   * Menyimpan token otomatis ke httpOnly Cookie
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data login tidak valid',
          validation.error.format()
        );
      }

      const { identifier, password } = validation.data;
      const { user, tokens } = await authService.login(identifier, password);

      // Simpan Access Token & Refresh Token ke httpOnly Cookie yang aman
      setAuthCookies(res, tokens, false);

      // Catat jejak audit login
      await logAuditEvent({
        vendorId: user.vendorId,
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'USER_LOGIN',
        targetTable: 'users',
        targetId: user.userId,
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.status(200).json({
        success: true,
        message: 'Login berhasil',
        data: {
          user,
          accessToken: tokens.accessToken, // Disediakan juga sebagai fallback bila frontend memerlukannya
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Rotasi Access Token menggunakan refresh_token dari httpOnly Cookie
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

      if (!refreshToken) {
        throw new AppError(401, 'MISSING_REFRESH_TOKEN', 'Refresh token tidak ditemukan di cookie.');
      }

      const { user, tokens } = await authService.refresh(refreshToken);

      setAuthCookies(res, tokens, !!user.impersonatedByAdminId);

      res.status(200).json({
        success: true,
        message: 'Token sesi berhasil diperbarui',
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Membaca informasi profil user yang sedang login
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      }

      const profile = await authService.getProfile(req.user.userId, req.user.impersonatedByAdminId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Membersihkan httpOnly cookies dan mengakhiri sesi
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await logAuditEvent({
          vendorId: req.user.vendorId,
          tenantId: req.user.tenantId,
          userId: req.user.userId,
          impersonatedByAdminId: req.user.impersonatedByAdminId,
          action: 'USER_LOGOUT',
          targetTable: 'users',
          targetId: req.user.userId,
          ipAddress: req.ip || req.socket.remoteAddress,
        });
      }

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logout berhasil. Sesi telah diakhiri.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/impersonate
   * Memulai sesi impersonasi Vendor (Eksklusif Administrator)
   */
  async impersonate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      }

      const validation = impersonateSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          validation.error.errors[0]?.message || 'Data impersonasi tidak valid',
          validation.error.format()
        );
      }

      const { targetVendorId } = validation.data;
      const { vendor, tokens } = await authService.impersonateVendor(req.user.userId, targetVendorId);

      // Simpan impersonation token ke httpOnly cookie (maksimal 2 jam)
      setAuthCookies(res, tokens, true);

      res.status(200).json({
        success: true,
        message: `Mode impersonasi aktif untuk vendor '${vendor.name}'`,
        data: {
          vendor,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/exit-impersonate
   * Mengakhiri mode impersonasi dan mengembalikan role ke Administrator
   */
  async exitImpersonate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autentikasi diperlukan');
      }

      const adminId = req.user.impersonatedByAdminId || req.user.userId;
      const { user, tokens } = await authService.exitImpersonate(adminId);

      setAuthCookies(res, tokens, false);

      res.status(200).json({
        success: true,
        message: 'Berhasil keluar dari mode impersonasi. Hak akses Administrator telah dipulihkan.',
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
