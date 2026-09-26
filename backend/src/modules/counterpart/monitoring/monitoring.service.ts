import { prisma } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { AssessmentStatus } from '@prisma/client';
import { ConfirmDraftDto } from './monitoring.schema';
import { auditLogger } from '../../../utils/auditLogger';

export class CounterpartMonitoringService {
  /**
   * Mengambil status progres pemantauan reviu asesor secara real-time
   * INVARIAN: Catatan internal konsultan (assessorNotes) dan hasil analisis AI privat
   * TIDAK BOLEH dibocorkan ke peran Counterpart.
   */
  async getMonitoringProgress(tenantId: string, periodId: string) {
    const period = await prisma.assessmentPeriod.findFirst({
      where: { id: periodId, tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
            industryCluster: true,
          },
        },
        assignments: {
          where: { isActive: true },
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

    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode asesmen tidak ditemukan untuk perusahaan Anda.');
    }

    // Ambil master taksonomi dimensi, sub-dimensi, parameter & kriteria
    const dimensions = await prisma.dimension.findMany({
      include: {
        subDimensions: {
          include: {
            parameters: {
              include: {
                criteria: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Ambil seluruh evaluasi kriteria yang sudah diisi konsultan untuk tenant & period ini
    // PERHATIAN: assessorNotes sengaja TIDAK dipilih (omitted) demi kerahasiaan konsultan!
    const evaluations = await prisma.criterionEvaluation.findMany({
      where: {
        tenantId,
        periodId,
      },
      select: {
        id: true,
        criterionId: true,
        score: true,
        reviewNotes: true,
        findingsGap: true,
        interviewNotes: true,
        screenshotUrl: true,
        updatedAt: true,
        criterion: {
          select: {
            id: true,
            level: true,
            statement: true,
            parameter: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const evaluatedCriterionMap = new Map(evaluations.map((e) => [e.criterionId, e]));

    let totalCriteriaCount = 0;
    let totalReviewedCount = 0;

    const dimensionProgress = dimensions.map((dim) => {
      let dimCriteriaTotal = 0;
      let dimCriteriaReviewed = 0;
      const parameterScores: number[] = [];

      dim.subDimensions.forEach((subDim) => {
        subDim.parameters.forEach((param) => {
          const paramCriteria = param.criteria;
          dimCriteriaTotal += paramCriteria.length;

          const evaluatedParamCriteria = paramCriteria
            .map((c) => evaluatedCriterionMap.get(c.id))
            .filter(Boolean);

          dimCriteriaReviewed += evaluatedParamCriteria.length;

          // Weakest link parameter score jika seluruh kriteria parameter sudah dievaluasi
          if (evaluatedParamCriteria.length > 0 && evaluatedParamCriteria.length === paramCriteria.length) {
            const minScore = Math.min(...evaluatedParamCriteria.map((ec) => ec!.score));
            parameterScores.push(minScore);
          }
        });
      });

      totalCriteriaCount += dimCriteriaTotal;
      totalReviewedCount += dimCriteriaReviewed;

      const dimProgressPct = dimCriteriaTotal > 0 ? (dimCriteriaReviewed / dimCriteriaTotal) * 100 : 0;
      const dimDraftAvgScore =
        parameterScores.length > 0
          ? Number((parameterScores.reduce((acc, curr) => acc + curr, 0) / parameterScores.length).toFixed(2))
          : null;

      return {
        dimensionId: dim.id,
        code: dim.code,
        name: dim.name,
        totalCriteria: dimCriteriaTotal,
        reviewedCriteria: dimCriteriaReviewed,
        progressPercentage: Number(dimProgressPct.toFixed(1)),
        draftAverageScore: dimDraftAvgScore,
      };
    });

    const overallProgressPct = totalCriteriaCount > 0 ? (totalReviewedCount / totalCriteriaCount) * 100 : 0;

    // Ambil daftar temuan dan celah gap untuk klarifikasi (tanpa assessorNotes)
    const findingsAndGaps = evaluations
      .filter((e) => e.findingsGap && e.findingsGap.trim().length > 0)
      .map((e) => ({
        evaluationId: e.id,
        parameterCode: e.criterion.parameter.code,
        parameterTitle: e.criterion.parameter.title,
        criterionLevel: e.criterion.level,
        findingsGap: e.findingsGap,
        reviewNotes: e.reviewNotes,
        updatedAt: e.updatedAt,
      }));

    // Status ringkasan dokumen tambahan
    const supplementaryStats = await prisma.supplementaryDocument.groupBy({
      by: ['ragIngestionStatus'],
      where: {
        tenantId,
        periodId,
      },
      _count: {
        id: true,
      },
    });

    const total = supplementaryStats.reduce((sum, s) => sum + s._count.id, 0);
    const completed = supplementaryStats.find((s) => s.ragIngestionStatus === 'COMPLETED')?._count.id || 0;
    const processing = supplementaryStats.find((s) => s.ragIngestionStatus === 'PROCESSING')?._count.id || 0;
    const pending = supplementaryStats.find((s) => s.ragIngestionStatus === 'PENDING')?._count.id || 0;

    const supplementarySummary = {
      total,
      totalDocuments: total,
      completed,
      processing,
      pending,
      byStatus: Object.fromEntries(supplementaryStats.map((s) => [s.ragIngestionStatus, s._count.id])),
    };

    return {
      period: {
        id: period.id,
        year: period.year,
        status: period.status,
        modelCluster: period.modelCluster,
        aspectDimScore: period.aspectDimScore ? Number(period.aspectDimScore) : null,
        perfScore: period.perfScore ? Number(period.perfScore) : null,
        adjustmentScore: period.adjustmentScore ? Number(period.adjustmentScore) : null,
        finalRmiScore: period.finalRmiScore ? Number(period.finalRmiScore) : null,
        maturityPhase: period.maturityPhase,
        isLocked: period.isLocked,
        tenant: period.tenant,
        assignedConsultants: period.assignments.map((a) => a.consultant),
      },
      progress: {
        totalCriteria: totalCriteriaCount,
        reviewedCriteria: totalReviewedCount,
        percentage: Number(overallProgressPct.toFixed(1)),
        isComplete: totalReviewedCount === totalCriteriaCount && totalCriteriaCount > 0,
      },
      dimensionProgress,
      findingsAndGaps,
      supplementarySummary,
    };
  }

  /**
   * Konfirmasi Draf Hasil Penilaian oleh Pimpinan/Tim Counterpart BUMN
   */
  async confirmDraft(tenantId: string, userId: string, data: ConfirmDraftDto) {
    const period = await prisma.assessmentPeriod.findFirst({
      where: { id: data.periodId, tenantId },
    });

    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode asesmen tidak ditemukan.');
    }

    if (period.isLocked && period.status === AssessmentStatus.FINALIZED) {
      throw new AppError(
        400,
        'ALREADY_FINALIZED',
        'Penilaian periode ini telah dikonfirmasi final dan terkunci permanen.'
      );
    }

    let nextStatus: AssessmentStatus;
    let lockState: boolean;

    if (data.decision === 'APPROVED') {
      nextStatus = AssessmentStatus.FINALIZED;
      lockState = true;
    } else {
      nextStatus = AssessmentStatus.SCORING_STAGE;
      lockState = false;
    }

    const updatedPeriod = await prisma.assessmentPeriod.update({
      where: { id: data.periodId },
      data: {
        status: nextStatus,
        isLocked: lockState,
      },
    });

    // Catat ke immutable audit log
    await auditLogger.log({
      tenantId,
      userId,
      action: 'DRAFT_CONFIRMATION',
      targetTable: 'assessment_periods',
      targetId: period.id,
      oldValues: { status: period.status, isLocked: period.isLocked },
      newValues: {
        status: nextStatus,
        isLocked: lockState,
        decision: data.decision,
        signatoryName: data.signatoryName,
        signatoryTitle: data.signatoryTitle,
        notes: data.notes,
      },
    });

    return {
      periodId: updatedPeriod.id,
      year: updatedPeriod.year,
      status: updatedPeriod.status,
      isLocked: updatedPeriod.isLocked,
      decision: data.decision,
      signatoryName: data.signatoryName,
      signatoryTitle: data.signatoryTitle,
      confirmedAt: new Date(),
      message:
        data.decision === 'APPROVED'
          ? 'Draf hasil penilaian RMI berhasil disetujui resmi dan status periode telah FINALIZED.'
          : 'Catatan klarifikasi dan permintaan revisi berhasil dikirimkan kembali ke konsultan penilai.',
    };
  }
}

export const counterpartMonitoringService = new CounterpartMonitoringService();
