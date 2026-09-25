import { prisma } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { CreateRecommendationDto, UpdateRecommendationDto } from './recommendation.schema';
import { UserRole } from '@prisma/client';

export class ConsultantRecommendationService {
  private async verifyConsultantAccess(userId: string, userRole: UserRole, periodId: string) {
    const period = await prisma.assessmentPeriod.findUnique({
      where: { id: periodId },
      include: { tenant: true },
    });

    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode asesmen tidak ditemukan.');
    }

    if (period.isLocked) {
      throw new AppError(400, 'PERIOD_LOCKED', 'Periode asesmen telah dikonfirmasi final dan terkunci permanen.');
    }

    if (userRole === UserRole.ADMINISTRATOR) {
      return period;
    }

    if (userRole === UserRole.EXTERNAL_CONSULTANT) {
      const assignment = await prisma.consultantAssignment.findFirst({
        where: {
          periodId,
          consultantId: userId,
          isActive: true,
        },
      });

      if (!assignment) {
        throw new AppError(
          403,
          'CONSULTANT_NOT_ASSIGNED',
          'Anda tidak memiliki surat penugasan aktif (Assignment) pada periode asesmen perusahaan ini.'
        );
      }
    }

    return period;
  }

  async listRecommendations(userId: string, userRole: UserRole, periodId: string) {
    await this.verifyConsultantAccess(userId, userRole, periodId);

    const recommendations = await prisma.recommendation.findMany({
      where: { periodId },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ priorityQuadrant: 'asc' }, { id: 'asc' }],
    });

    // Klasifikasi Matriks Prioritas 2x2
    const quadrant1 = recommendations.filter((r) => r.priorityQuadrant === 1); // Quick Wins: Dampak Tinggi / Mudah
    const quadrant2 = recommendations.filter((r) => r.priorityQuadrant === 2); // Strategis: Tinggi/Sulit atau Rendah/Mudah
    const quadrant3 = recommendations.filter((r) => r.priorityQuadrant === 3); // Rendah: Rendah/Sulit

    const statusCounts = {
      S: recommendations.filter((r) => r.status === 'S').length,
      BS: recommendations.filter((r) => r.status === 'BS').length,
      BD: recommendations.filter((r) => r.status === 'BD').length,
      TDD: recommendations.filter((r) => r.status === 'TDD').length,
    };

    return {
      periodId,
      totalRecommendations: recommendations.length,
      priorityMatrix: {
        quadrant1: {
          title: 'Kuadran 1: Quick Wins (Dampak Tinggi & Mudah Diterapkan)',
          count: quadrant1.length,
          items: quadrant1,
        },
        quadrant2: {
          title: 'Kuadran 2: Inisiatif Strategis / Penunjang (Dampak Tinggi/Sulit atau Rendah/Mudah)',
          count: quadrant2.length,
          items: quadrant2,
        },
        quadrant3: {
          title: 'Kuadran 3: Prioritas Rendah (Dampak Rendah & Sulit Diterapkan)',
          count: quadrant3.length,
          items: quadrant3,
        },
      },
      statusSummary: statusCounts,
      allRecommendations: recommendations,
    };
  }

  async createRecommendation(userId: string, userRole: UserRole, input: CreateRecommendationDto) {
    const period = await this.verifyConsultantAccess(userId, userRole, input.periodId);

    const recommendation = await prisma.recommendation.create({
      data: {
        periodId: input.periodId,
        parameterCode: input.parameterCode,
        recommendation: input.recommendation,
        targetDate: new Date(input.targetDate),
        mainActivities: input.mainActivities,
        expectedOutput: input.expectedOutput,
        successIndicator: input.successIndicator,
        unitInCharge: input.unitInCharge,
        priorityQuadrant: input.priorityQuadrant,
        horizon: input.horizon,
        status: input.status,
      },
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'RECOMMENDATION_CREATED',
      targetTable: 'recommendations',
      targetId: String(recommendation.id),
      newValues: {
        parameterCode: recommendation.parameterCode,
        priorityQuadrant: recommendation.priorityQuadrant,
        horizon: recommendation.horizon,
      },
    });

    return recommendation;
  }

  async updateRecommendation(userId: string, userRole: UserRole, id: number, input: UpdateRecommendationDto) {
    const rec = await prisma.recommendation.findUnique({
      where: { id },
      include: { period: true },
    });

    if (!rec) {
      throw new AppError(404, 'RECOMMENDATION_NOT_FOUND', 'Rekomendasi tidak ditemukan.');
    }

    await this.verifyConsultantAccess(userId, userRole, rec.periodId);

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        parameterCode: input.parameterCode !== undefined ? input.parameterCode : undefined,
        recommendation: input.recommendation !== undefined ? input.recommendation : undefined,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        mainActivities: input.mainActivities !== undefined ? input.mainActivities : undefined,
        expectedOutput: input.expectedOutput !== undefined ? input.expectedOutput : undefined,
        successIndicator: input.successIndicator !== undefined ? input.successIndicator : undefined,
        unitInCharge: input.unitInCharge !== undefined ? input.unitInCharge : undefined,
        priorityQuadrant: input.priorityQuadrant !== undefined ? input.priorityQuadrant : undefined,
        horizon: input.horizon !== undefined ? input.horizon : undefined,
        status: input.status !== undefined ? input.status : undefined,
      },
    });

    await logAuditEvent({
      tenantId: rec.period.tenantId,
      userId,
      action: 'RECOMMENDATION_UPDATED',
      targetTable: 'recommendations',
      targetId: String(id),
      newValues: input,
    });

    return updated;
  }

  async deleteRecommendation(userId: string, userRole: UserRole, id: number) {
    const rec = await prisma.recommendation.findUnique({
      where: { id },
      include: { period: true },
    });

    if (!rec) {
      throw new AppError(404, 'RECOMMENDATION_NOT_FOUND', 'Rekomendasi tidak ditemukan.');
    }

    await this.verifyConsultantAccess(userId, userRole, rec.periodId);

    await prisma.recommendation.delete({
      where: { id },
    });

    await logAuditEvent({
      tenantId: rec.period.tenantId,
      userId,
      action: 'RECOMMENDATION_DELETED',
      targetTable: 'recommendations',
      targetId: String(id),
    });

    return { message: 'Rekomendasi berhasil dihapus' };
  }
}

export const consultantRecommendationService = new ConsultantRecommendationService();
