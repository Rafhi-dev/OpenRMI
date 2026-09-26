import prisma from '../../../config/database';
import { UserRole } from '@prisma/client';
import { AppError } from '../../../middlewares/errorHandler';

export class VendorPortfolioService {
  async getPortfolioProgress(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        _count: {
          select: {
            tenants: true,
            users: { where: { role: UserRole.EXTERNAL_CONSULTANT, isActive: true } },
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor tidak ditemukan');
    }

    const tenants = await prisma.tenant.findMany({
      where: { vendorId },
      include: {
        periods: {
          orderBy: { year: 'desc' },
          take: 1,
          include: {
            _count: {
              select: {
                evaluations: true,
                recommendations: true,
                supplementaryDocs: true,
              },
            },
          },
        },
        _count: {
          select: {
            evidences: true,
          },
        },
        assignments: {
          where: { isActive: true },
          include: {
            consultant: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    const tenantSummaries = tenants.map((tenant) => {
      const latestPeriod = tenant.periods[0];
      const evaluationCount = latestPeriod?._count.evaluations || 0;
      // KBUMN standar 42 parameter
      const targetEvaluations = tenant.industryCluster === 'ASURANSI' ? 41 : 42;
      const progressPercent = Math.min(100, Math.round((evaluationCount / targetEvaluations) * 100));

      return {
        tenantId: tenant.id,
        name: tenant.name,
        code: tenant.code,
        industryCluster: tenant.industryCluster,
        isActive: tenant.isActive,
        latestPeriod: latestPeriod
          ? {
              id: latestPeriod.id,
              year: latestPeriod.year,
              status: latestPeriod.status,
              evidenceCount: tenant._count.evidences,
              supplementaryDocCount: latestPeriod._count.supplementaryDocs,
              evaluationCount,
              recommendationCount: latestPeriod._count.recommendations,
              progressPercent,
            }
          : null,
        activeConsultants: tenant.assignments.map((a) => a.consultant),
      };
    });

    const totalTenants = vendor._count.tenants;
    const totalConsultants = vendor._count.users;
    const totalActiveAssignments = tenants.reduce((acc, t) => acc + t.assignments.length, 0);

    const tenantsProgress = tenants.map((tenant) => {
      const latestPeriod = tenant.periods[0];
      const evaluationCount = latestPeriod?._count.evaluations || 0;
      const targetEvaluations = tenant.industryCluster === 'ASURANSI' ? 41 : 42;
      const progressPercent = Math.min(100, Math.round((evaluationCount / targetEvaluations) * 100));
      const leadConsultant = tenant.assignments[0]?.consultant.fullName || null;

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantCode: tenant.code,
        industryCluster: tenant.industryCluster,
        isActive: tenant.isActive,
        currentPeriod: latestPeriod
          ? {
              id: latestPeriod.id,
              year: latestPeriod.year,
              status: latestPeriod.status,
              finalRmiScore: latestPeriod.finalRmiScore ? Number(latestPeriod.finalRmiScore) : null,
              maturityPhase: latestPeriod.maturityPhase || null,
              evidenceCount: tenant._count.evidences,
              supplementaryDocCount: latestPeriod._count.supplementaryDocs,
              evaluationCount,
              recommendationCount: latestPeriod._count.recommendations,
              progressPercent,
            }
          : null,
        leadConsultant,
        activeConsultants: tenant.assignments.map((a) => a.consultant),
      };
    });

    return {
      macroSummary: {
        totalTenants,
        totalConsultants,
        totalActiveAssignments,
      },
      tenantsProgress,
      vendorInfo: {
        id: vendor.id,
        name: vendor.name,
        code: vendor.code,
        licenseStatus: vendor.licenseStatus,
        maxTenants: vendor.maxTenants,
        currentTenants: totalTenants,
        activeConsultants: totalConsultants,
      },
      tenants: tenantSummaries,
    };
  }
}

export const vendorPortfolioService = new VendorPortfolioService();
export default vendorPortfolioService;
