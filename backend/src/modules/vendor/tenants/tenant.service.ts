import prisma from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { CreateTenantInput, UpdateTenantInput } from './tenant.schema';

export class VendorTenantService {
  async listTenants(vendorId: string, query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { vendorId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          periods: {
            orderBy: { year: 'desc' },
            take: 1,
            select: { id: true, year: true, status: true },
          },
          _count: {
            select: {
              assignments: true,
              evidences: true,
              evaluations: true,
            },
          },
        },
      }),
    ]);

    return {
      tenants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTenantById(vendorId: string, tenantId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, vendorId },
      include: {
        periods: {
          orderBy: { year: 'desc' },
          include: {
            _count: {
              select: {
                evaluations: true,
                supplementaryDocs: true,
              },
            },
          },
        },
        assignments: {
          include: {
            consultant: {
              select: {
                id: true,
                fullName: true,
                email: true,
                agencyName: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Perusahaan klien tidak ditemukan dalam portofolio Anda.');
    }

    return tenant;
  }

  async createTenant(vendorId: string, userId: string, input: CreateTenantInput) {
    // 1. Validasi kuota vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { _count: { select: { tenants: true } } },
    });

    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor tidak ditemukan.');
    }

    if (vendor._count.tenants >= vendor.maxTenants) {
      throw new AppError(
        400,
        'QUOTA_EXCEEDED',
        `Kuota tenant (${vendor.maxTenants} perusahaan) telah penuh. Silakan ajukan peningkatan kuota lisensi ke Administrator.`
      );
    }

    // 2. Cek keunikan kode tenant
    const existing = await prisma.tenant.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw new AppError(409, 'TENANT_CODE_EXISTS', `Kode tenant '${input.code}' sudah digunakan.`);
    }

    // 3. Buat tenant baru beserta periode penilaian awal
    const yearToCreate = input.initialYear || new Date().getFullYear();

    const tenant = await prisma.tenant.create({
      data: {
        vendorId,
        name: input.name,
        code: input.code,
        industryCluster: input.industryCluster,
        logoUrl: input.logoUrl,
        periods: {
          create: {
            year: yearToCreate,
            status: 'EVIDENCE_GATHERING',
          },
        },
      },
      include: {
        periods: true,
      },
    });

    await logAuditEvent({
      vendorId,
      tenantId: tenant.id,
      userId,
      action: 'TENANT_CREATE',
      targetTable: 'tenants',
      targetId: tenant.id,
      newValues: { name: tenant.name, code: tenant.code, industryCluster: tenant.industryCluster },
    });

    return tenant;
  }

  async updateTenant(vendorId: string, tenantId: string, userId: string, input: UpdateTenantInput) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, vendorId },
    });

    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Perusahaan klien tidak ditemukan dalam portofolio Anda.');
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.industryCluster ? { industryCluster: input.industryCluster } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await logAuditEvent({
      vendorId,
      tenantId,
      userId,
      action: 'TENANT_UPDATE',
      targetTable: 'tenants',
      targetId: tenantId,
      oldValues: { name: tenant.name, industryCluster: tenant.industryCluster, isActive: tenant.isActive },
      newValues: { name: updated.name, industryCluster: updated.industryCluster, isActive: updated.isActive },
    });

    return updated;
  }
}

export const vendorTenantService = new VendorTenantService();
export default vendorTenantService;
