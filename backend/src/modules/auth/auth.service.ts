import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { generateAuthTokens, verifyRefreshToken } from './auth.jwt';
import { AuthTokens, JwtUserPayload } from './auth.types';

export class AuthService {
  /**
   * Login pengguna menggunakan Email ATAU Username + Password
   */
  async login(identifier: string, password: string): Promise<{
    user: JwtUserPayload & { fullName: string };
    tokens: AuthTokens;
  }> {
    const trimmed = identifier.trim();

    // Cari pengguna berdasarkan email ATAU username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmed, mode: 'insensitive' } },
          { username: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      include: {
        vendor: true,
        tenant: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email/Username atau password salah');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Akun Anda sedang dinonaktifkan. Silakan hubungi Administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email/Username atau password salah');
    }

    const payload: JwtUserPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
      vendorId: user.vendorId,
      tenantId: user.tenantId,
      impersonatedByAdminId: null,
    };

    const tokens = generateAuthTokens(payload);

    return {
      user: {
        ...payload,
        fullName: user.fullName,
      },
      tokens,
    };
  }

  /**
   * Rotasi Token menggunakan Refresh Token dari httpOnly Cookie
   */
  async refresh(token: string): Promise<{
    user: JwtUserPayload & { fullName: string };
    tokens: AuthTokens;
  }> {
    let payload: JwtUserPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Sesi telah kedaluwarsa, silakan login kembali');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'USER_INACTIVE_OR_DELETED', 'Akun tidak aktif atau telah dihapus');
    }

    const newPayload: JwtUserPayload = {
      userId: user.id,
      role: payload.impersonatedByAdminId ? UserRole.VENDOR : user.role,
      email: user.email,
      username: user.username,
      vendorId: payload.impersonatedByAdminId ? payload.vendorId : user.vendorId,
      tenantId: payload.impersonatedByAdminId ? null : user.tenantId,
      impersonatedByAdminId: payload.impersonatedByAdminId || null,
    };

    const isImpersonation = !!payload.impersonatedByAdminId;
    const tokens = generateAuthTokens(newPayload, isImpersonation);

    return {
      user: {
        ...newPayload,
        fullName: user.fullName,
      },
      tokens,
    };
  }

  /**
   * Mengambil data profil pengguna yang sedang login
   */
  async getProfile(userId: string, impersonatedByAdminId?: string | null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        role: true,
        agencyName: true,
        vendorId: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
            licenseStatus: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
            industryCluster: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan');
    }

    return {
      ...user,
      impersonatedByAdminId: impersonatedByAdminId || null,
      isImpersonating: !!impersonatedByAdminId,
    };
  }

  /**
   * Sesi Impersonasi Vendor (Hanya oleh ADMINISTRATOR)
   */
  async impersonateVendor(adminUserId: string, targetVendorId: string): Promise<{
    vendor: { id: string; name: string; code: string };
    tokens: AuthTokens;
  }> {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== UserRole.ADMINISTRATOR) {
      throw new AppError(403, 'FORBIDDEN', 'Hanya Administrator Platform yang memiliki hak impersonasi');
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: targetVendorId },
    });

    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', 'Lembaga vendor tidak ditemukan');
    }

    // Buat payload impersonasi (role menjadi VENDOR, batas waktu 2 jam)
    const impersonationPayload: JwtUserPayload = {
      userId: admin.id,
      role: UserRole.VENDOR,
      email: admin.email,
      username: admin.username,
      vendorId: vendor.id,
      tenantId: null,
      impersonatedByAdminId: admin.id,
    };

    const tokens = generateAuthTokens(impersonationPayload, true);

    // Rekam Audit Trail
    await prisma.auditLog.create({
      data: {
        vendorId: vendor.id,
        userId: admin.id,
        impersonatedByAdminId: admin.id,
        action: 'VENDOR_IMPERSONATE',
        targetTable: 'vendors',
        targetId: vendor.id,
        newValues: { vendorName: vendor.name, vendorCode: vendor.code },
      },
    });

    return {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        code: vendor.code,
      },
      tokens,
    };
  }

  /**
   * Keluar dari mode impersonasi, mengembalikan token kembali ke role ADMINISTRATOR
   */
  async exitImpersonate(adminId: string): Promise<{
    user: JwtUserPayload & { fullName: string };
    tokens: AuthTokens;
  }> {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMINISTRATOR) {
      throw new AppError(403, 'FORBIDDEN', 'Aksi tidak diizinkan');
    }

    const normalPayload: JwtUserPayload = {
      userId: admin.id,
      role: UserRole.ADMINISTRATOR,
      email: admin.email,
      username: admin.username,
      vendorId: null,
      tenantId: null,
      impersonatedByAdminId: null,
    };

    const tokens = generateAuthTokens(normalPayload, false);

    return {
      user: {
        ...normalPayload,
        fullName: admin.fullName,
      },
      tokens,
    };
  }
}

export const authService = new AuthService();
export default authService;
