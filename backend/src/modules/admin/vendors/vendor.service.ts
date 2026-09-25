import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { CreateVendorInput, UpdateVendorInput } from './vendor.schema';

export class AdminVendorService {
  async listVendors(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.licenseStatus = query.status;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, vendors] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              tenants: true,
              users: true,
            },
          },
        },
      }),
    ]);

    return {
      vendors,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVendorById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        tenants: {
          select: {
            id: true,
            code: true,
            name: true,
            industryCluster: true,
            isActive: true,
            createdAt: true,
          },
        },
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            role: true,
            agencyName: true,
            isActive: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', 'Lembaga vendor tidak ditemukan');
    }

    return vendor;
  }

  async createVendor(adminId: string, input: CreateVendorInput) {
    // Cek keunikan kode dan email vendor
    const existing = await prisma.vendor.findFirst({
      where: {
        OR: [{ code: input.code }, { email: input.email }],
      },
    });

    if (existing) {
      if (existing.code === input.code) {
        throw new AppError(409, 'VENDOR_CODE_EXISTS', `Kode vendor '${input.code}' sudah terdaftar.`);
      }
      throw new AppError(409, 'VENDOR_EMAIL_EXISTS', `Email vendor '${input.email}' sudah terdaftar.`);
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: input.name,
        code: input.code,
        email: input.email,
        phone: input.phone,
        address: input.address,
        maxTenants: input.maxTenants,
        licenseStatus: input.licenseStatus,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : undefined,
      },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'VENDOR_CREATE',
      targetTable: 'vendors',
      targetId: vendor.id,
      newValues: { name: vendor.name, code: vendor.code, maxTenants: vendor.maxTenants },
    });

    return vendor;
  }

  async updateVendor(adminId: string, id: string, input: UpdateVendorInput) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', 'Lembaga vendor tidak ditemukan');
    }

    if (input.email && input.email !== vendor.email) {
      const emailExists = await prisma.vendor.findFirst({
        where: { email: input.email, NOT: { id } },
      });
      if (emailExists) {
        throw new AppError(409, 'VENDOR_EMAIL_EXISTS', `Email '${input.email}' sudah digunakan vendor lain.`);
      }
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.maxTenants !== undefined ? { maxTenants: input.maxTenants } : {}),
        ...(input.licenseStatus ? { licenseStatus: input.licenseStatus } : {}),
        ...(input.licenseExpiry !== undefined
          ? { licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null }
          : {}),
      },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'VENDOR_UPDATE',
      targetTable: 'vendors',
      targetId: updated.id,
      oldValues: { name: vendor.name, maxTenants: vendor.maxTenants, licenseStatus: vendor.licenseStatus },
      newValues: { name: updated.name, maxTenants: updated.maxTenants, licenseStatus: updated.licenseStatus },
    });

    return updated;
  }

  async deleteVendor(adminId: string, id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { _count: { select: { tenants: true } } },
    });

    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', 'Lembaga vendor tidak ditemukan');
    }

    if (vendor._count.tenants > 0) {
      // Jika memiliki tenant aktif, ubah status menjadi SUSPENDED untuk melindungi integritas data
      const suspended = await prisma.vendor.update({
        where: { id },
        data: { licenseStatus: 'SUSPENDED' },
      });

      await logAuditEvent({
        userId: adminId,
        action: 'VENDOR_SUSPEND',
        targetTable: 'vendors',
        targetId: id,
        newValues: { licenseStatus: 'SUSPENDED' },
      });

      return {
        message: 'Vendor memiliki portofolio tenant aktif. Lisensi diubah menjadi SUSPENDED.',
        vendor: suspended,
      };
    }

    await prisma.vendor.delete({ where: { id } });

    await logAuditEvent({
      userId: adminId,
      action: 'VENDOR_DELETE',
      targetTable: 'vendors',
      targetId: id,
      oldValues: { name: vendor.name, code: vendor.code },
    });

    return { message: 'Lembaga vendor berhasil dihapus permanen.' };
  }
}

export const adminVendorService = new AdminVendorService();
export default adminVendorService;
