import { prisma } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { CreateFollowUpDto } from './followup.schema';
import { auditLogger } from '../../../utils/auditLogger';

export class CounterpartFollowUpService {
  async listRecommendations(tenantId: string, periodId: string) {
    const period = await prisma.assessmentPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode asesmen tidak ditemukan.');
    }

    const recommendations = await prisma.recommendation.findMany({
      where: { periodId },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ priorityQuadrant: 'asc' }, { id: 'asc' }],
    });

    return recommendations;
  }

  async createFollowUp(tenantId: string, userId: string, data: CreateFollowUpDto) {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: data.recommendationId },
      include: {
        period: {
          select: { tenantId: true },
        },
      },
    });

    if (!recommendation || recommendation.period.tenantId !== tenantId) {
      throw new AppError(
        404,
        'RECOMMENDATION_NOT_FOUND',
        'Rekomendasi tidak ditemukan untuk perusahaan Anda.'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const followUp = await tx.followUpRecord.create({
        data: {
          recommendationId: data.recommendationId,
          quarter: data.quarter,
          year: data.year,
          progressNotes: data.progressNotes,
          evidenceFileUrl: data.evidenceFileUrl || null,
          statusReported: data.statusReported,
          reportedBy: userId,
        },
      });

      await tx.recommendation.update({
        where: { id: data.recommendationId },
        data: {
          status: data.statusReported,
        },
      });

      return followUp;
    });

    await auditLogger.log({
      tenantId,
      userId,
      action: 'FOLLOW_UP_SUBMITTED',
      targetTable: 'follow_up_records',
      targetId: result.id,
      newValues: {
        recommendationId: data.recommendationId,
        quarter: data.quarter,
        year: data.year,
        statusReported: data.statusReported,
      },
    });

    return result;
  }

  async deleteFollowUp(tenantId: string, userId: string, followUpId: string) {
    const followUp = await prisma.followUpRecord.findUnique({
      where: { id: followUpId },
      include: {
        recommendation: {
          include: {
            period: {
              select: { tenantId: true },
            },
          },
        },
      },
    });

    if (!followUp || followUp.recommendation.period.tenantId !== tenantId) {
      throw new AppError(
        404,
        'FOLLOW_UP_NOT_FOUND',
        'Catatan tindak lanjut tidak ditemukan atau tidak memiliki akses.'
      );
    }

    await prisma.followUpRecord.delete({
      where: { id: followUpId },
    });

    await auditLogger.log({
      tenantId,
      userId,
      action: 'FOLLOW_UP_DELETED',
      targetTable: 'follow_up_records',
      targetId: followUpId,
    });

    return { message: 'Catatan tindak lanjut berhasil dihapus' };
  }
}

export const counterpartFollowUpService = new CounterpartFollowUpService();
