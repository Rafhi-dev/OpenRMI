import { prisma } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { RmiScoringEngine } from '../../scoring/scoring.engine';
import { getMaturityPhase } from '../../scoring/scoring.constants';
import { SavePerformanceDto } from './performance.schema';
import { UserRole } from '@prisma/client';

export class ConsultantPerformanceService {
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

  async getPerformance(userId: string, userRole: UserRole, periodId: string) {
    const period = await this.verifyConsultantAccess(userId, userRole, periodId);

    const perfEvaluation = await prisma.performanceEvaluation.findUnique({
      where: { periodId },
    });

    const aspectScore = period.aspectDimScore ? Number(period.aspectDimScore) : 0.0;

    let adjustmentDetails = null;
    if (perfEvaluation) {
      adjustmentDetails = RmiScoringEngine.calculatePerformanceAdjustment(aspectScore, {
        finalRating: perfEvaluation.finalRating,
        compositeRiskRating: perfEvaluation.compositeRating,
      });
    }

    return {
      periodId,
      aspectDimensionScore: aspectScore,
      perfEvaluation,
      calculation: adjustmentDetails,
      finalRmiScore: period.finalRmiScore ? Number(period.finalRmiScore) : null,
      maturityPhase: period.maturityPhase,
    };
  }

  async savePerformance(userId: string, userRole: UserRole, input: SavePerformanceDto) {
    const period = await this.verifyConsultantAccess(userId, userRole, input.periodId);

    const aspectScore = period.aspectDimScore ? Number(period.aspectDimScore) : 0.0;

    // Hitung penyesuaian kinerja dan klausul gating
    const perfAdjustment = RmiScoringEngine.calculatePerformanceAdjustment(aspectScore, {
      finalRating: input.finalRating,
      compositeRiskRating: input.compositeRating,
    });

    // Hitung skor akhir RMI
    const rawFinalScore = aspectScore + perfAdjustment.scoreAdjustment;
    const finalRmiScore = Math.max(1.0, Math.min(5.0, Math.round(rawFinalScore * 100) / 100));
    const maturityPhase = getMaturityPhase(finalRmiScore);

    // Simpan ke performance_evaluations
    const perfRecord = await prisma.performanceEvaluation.upsert({
      where: { periodId: input.periodId },
      update: {
        finalRating: input.finalRating,
        kpmrScore: input.kpmrScore,
        compositeRating: input.compositeRating,
        spiReviewNotes: input.spiReviewNotes || null,
      },
      create: {
        periodId: input.periodId,
        finalRating: input.finalRating,
        kpmrScore: input.kpmrScore,
        compositeRating: input.compositeRating,
        spiReviewNotes: input.spiReviewNotes || null,
      },
    });

    // Perbarui tabel assessment_periods
    const updatedPeriod = await prisma.assessmentPeriod.update({
      where: { id: input.periodId },
      data: {
        perfScore: perfAdjustment.combinedPerformanceScore,
        adjustmentScore: perfAdjustment.scoreAdjustment,
        finalRmiScore,
        maturityPhase,
      },
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'PERFORMANCE_EVALUATION_SAVED',
      targetTable: 'performance_evaluations',
      targetId: perfRecord.id,
      newValues: {
        finalRating: input.finalRating,
        compositeRating: input.compositeRating,
        combinedPerformanceScore: perfAdjustment.combinedPerformanceScore,
        scoreAdjustment: perfAdjustment.scoreAdjustment,
        finalRmiScore,
        maturityPhase,
      },
    });

    return {
      message: 'Kalkulasi aspek kinerja dan skor akhir RMI berhasil disimpan',
      performance: perfRecord,
      calculation: {
        aspectDimensionScore: aspectScore,
        finalRatingScore: perfAdjustment.finalRatingScore,
        compositeRiskScore: perfAdjustment.compositeRiskScore,
        combinedPerformanceScore: perfAdjustment.combinedPerformanceScore,
        isEligible: perfAdjustment.isEligible,
        scoreAdjustment: perfAdjustment.scoreAdjustment,
        notes: perfAdjustment.notes,
        finalRmiScore,
        maturityPhase,
      },
      period: {
        id: updatedPeriod.id,
        aspectDimScore: updatedPeriod.aspectDimScore,
        perfScore: updatedPeriod.perfScore,
        adjustmentScore: updatedPeriod.adjustmentScore,
        finalRmiScore: updatedPeriod.finalRmiScore,
        maturityPhase: updatedPeriod.maturityPhase,
      },
    };
  }
}

export const consultantPerformanceService = new ConsultantPerformanceService();
