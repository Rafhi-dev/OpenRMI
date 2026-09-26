import { prisma } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { logAuditEvent } from '../../../utils/auditLogger';
import { RmiScoringEngine } from '../../scoring/scoring.engine';
import { SaveEvaluationDto, BatchSaveEvaluationDto } from './evaluation.schema';
import { UserRole } from '@prisma/client';

export class ConsultantEvaluationService {
  /**
   * Verifikasi hak akses konsultan pada periode asesmen terkait
   */
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

  /**
   * Mengambil matriks lengkap evaluasi 42 parameter & 5 dimensi untuk konsultan
   */
  async getEvaluationMatrix(userId: string, userRole: UserRole, periodId: string) {
    const period = await this.verifyConsultantAccess(userId, userRole, periodId);

    const dimensions = await prisma.dimension.findMany({
      include: {
        subDimensions: {
          include: {
            parameters: {
              include: {
                criteria: {
                  orderBy: { level: 'asc' },
                },
              },
              orderBy: { parameterNumber: 'asc' },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Ambil seluruh evaluasi untuk tenant & period ini
    const evaluations = await prisma.criterionEvaluation.findMany({
      where: {
        tenantId: period.tenantId,
        periodId,
      },
    });

    const evalMap = new Map(evaluations.map((e) => [e.criterionId, e]));

    // Ambil bukti yang ada
    const evidences = await prisma.criterionEvidence.findMany({
      where: { tenantId: period.tenantId },
      select: {
        id: true,
        criterionId: true,
        fileName: true,
        fileUrl: true,
      },
    });

    const evidenceCountMap = new Map<number, number>();
    evidences.forEach((ev) => {
      evidenceCountMap.set(ev.criterionId, (evidenceCountMap.get(ev.criterionId) || 0) + 1);
    });

    let totalCriteriaAll = 0;
    let totalEvaluatedAll = 0;
    const allParameterScores: number[] = [];

    const matrixDimensions = dimensions.map((dim) => {
      const dimParameterScores: number[] = [];
      let dimCriteriaCount = 0;
      let dimEvaluatedCount = 0;

      const subDims = dim.subDimensions.map((subDim) => {
        const params = subDim.parameters.map((param) => {
          const paramCriteria = param.criteria;
          dimCriteriaCount += paramCriteria.length;
          totalCriteriaAll += paramCriteria.length;

          const paramEvaluations = paramCriteria
            .map((c) => evalMap.get(c.id))
            .filter(Boolean);

          dimEvaluatedCount += paramEvaluations.length;
          totalEvaluatedAll += paramEvaluations.length;

          let parameterScore: number | null = null;
          // Weakest-Link Rule: dihitung jika seluruh kriteria parameter telah diisi
          if (paramEvaluations.length === paramCriteria.length && paramCriteria.length > 0) {
            const scores = paramEvaluations.map((e) => e!.score);
            parameterScore = RmiScoringEngine.calculateParameterScore(scores);
            dimParameterScores.push(parameterScore);
            allParameterScores.push(parameterScore);
          }

          return {
            id: param.id,
            parameterNumber: param.parameterNumber,
            code: param.code,
            title: param.title,
            criteriaCount: paramCriteria.length,
            evaluatedCount: paramEvaluations.length,
            parameterScore,
            isComplete: paramEvaluations.length === paramCriteria.length && paramCriteria.length > 0,
          };
        });

        return {
          id: subDim.id,
          code: subDim.code,
          name: subDim.name,
          parameters: params,
        };
      });

      const dimScore =
        dimParameterScores.length > 0
          ? RmiScoringEngine.calculateDimensionScore(dimParameterScores)
          : null;

      return {
        id: dim.id,
        code: dim.code,
        name: dim.name,
        criteriaCount: dimCriteriaCount,
        evaluatedCount: dimEvaluatedCount,
        dimensionScore: dimScore,
        subDimensions: subDims,
      };
    });

    const aspectDimensionScore =
      allParameterScores.length > 0
        ? RmiScoringEngine.calculateAspectDimensionScore(allParameterScores)
        : null;

    return {
      period: {
        id: period.id,
        year: period.year,
        status: period.status,
        aspectDimScore: period.aspectDimScore ? Number(period.aspectDimScore) : aspectDimensionScore,
        perfScore: period.perfScore ? Number(period.perfScore) : null,
        finalRmiScore: period.finalRmiScore ? Number(period.finalRmiScore) : null,
        maturityPhase: period.maturityPhase,
        isLocked: period.isLocked,
      },
      summary: {
        totalCriteria: totalCriteriaAll,
        totalEvaluated: totalEvaluatedAll,
        completionPercentage: totalCriteriaAll > 0 ? Number(((totalEvaluatedAll / totalCriteriaAll) * 100).toFixed(1)) : 0,
        aspectDimensionScore,
      },
      dimensions: matrixDimensions,
    };
  }

  /**
   * Mengambil data detail satu parameter untuk workspace split-screen reviu
   */
  async getParameterEvaluation(userId: string, userRole: UserRole, periodId: string, parameterCode: string) {
    const period = await this.verifyConsultantAccess(userId, userRole, periodId);

    const parameter = await prisma.parameter.findUnique({
      where: { code: parameterCode },
      include: {
        subDimension: {
          include: {
            dimension: true,
          },
        },
        criteria: {
          orderBy: { level: 'asc' },
          include: {
            evidences: {
              where: { tenantId: period.tenantId },
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                fileSize: true,
                docNumber: true,
                effectiveDate: true,
                sectionNotes: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!parameter) {
      throw new AppError(404, 'PARAMETER_NOT_FOUND', `Parameter ${parameterCode} tidak ditemukan.`);
    }

    const evaluations = await prisma.criterionEvaluation.findMany({
      where: {
        tenantId: period.tenantId,
        periodId,
        criterionId: { in: parameter.criteria.map((c) => c.id) },
      },
    });

    const evalMap = new Map(evaluations.map((e) => [e.criterionId, e]));

    const criteriaWithEvals = parameter.criteria.map((c) => {
      const evaluation = evalMap.get(c.id) || null;
      return {
        id: c.id,
        letterCode: c.letterCode,
        level: c.level,
        statement: c.statement,
        guidanceNotes: c.guidanceNotes,
        defaultEvidences: c.defaultEvidences,
        evidences: c.evidences,
        evaluation: evaluation
          ? {
              id: evaluation.id,
              score: evaluation.score,
              reviewNotes: evaluation.reviewNotes,
              findingsGap: evaluation.findingsGap,
              interviewNotes: evaluation.interviewNotes,
              screenshotUrl: evaluation.screenshotUrl,
              assessorNotes: evaluation.assessorNotes,
              updatedAt: evaluation.updatedAt,
            }
          : null,
      };
    });

    // Hitung skor parameter saat ini
    const scores = criteriaWithEvals.map((ce) => ce.evaluation?.score).filter(Boolean) as number[];
    const isComplete = scores.length === parameter.criteria.length && parameter.criteria.length > 0;
    const currentParameterScore = isComplete ? RmiScoringEngine.calculateParameterScore(scores) : null;

    return {
      parameter: {
        id: parameter.id,
        code: parameter.code,
        parameterNumber: parameter.parameterNumber,
        title: parameter.title,
        description: parameter.description,
        dimension: parameter.subDimension.dimension.name,
        subDimension: parameter.subDimension.name,
        currentScore: currentParameterScore,
        isComplete,
      },
      criteria: criteriaWithEvals,
      // Standar flattened untuk konsumsi langsung di frontend
      id: parameter.id,
      code: parameter.code,
      parameterNumber: parameter.parameterNumber,
      title: parameter.title,
      description: parameter.description,
      calculatedScore: currentParameterScore,
      subDimension: {
        id: parameter.subDimension.id,
        code: parameter.subDimension.code,
        name: parameter.subDimension.name,
        dimension: {
          id: parameter.subDimension.dimension.id,
          code: parameter.subDimension.dimension.code,
          name: parameter.subDimension.dimension.name,
        },
      },
    };
  }

  /**
   * Menyimpan / memperbarui nilai evaluasi satu kriteria
   */
  async saveEvaluation(userId: string, userRole: UserRole, input: SaveEvaluationDto) {
    const period = await this.verifyConsultantAccess(userId, userRole, input.periodId);

    const criterion = await prisma.criterion.findUnique({
      where: { id: input.criterionId },
      include: { parameter: true },
    });

    if (!criterion) {
      throw new AppError(404, 'CRITERION_NOT_FOUND', 'Kriteria penilaian tidak ditemukan.');
    }

    const evaluation = await prisma.criterionEvaluation.upsert({
      where: {
        tenantId_periodId_criterionId: {
          tenantId: period.tenantId,
          periodId: input.periodId,
          criterionId: input.criterionId,
        },
      },
      update: {
        score: input.score,
        reviewNotes: input.reviewNotes !== undefined ? input.reviewNotes : undefined,
        findingsGap: input.findingsGap !== undefined ? input.findingsGap : undefined,
        interviewNotes: input.interviewNotes !== undefined ? input.interviewNotes : undefined,
        screenshotUrl: input.screenshotUrl !== undefined ? input.screenshotUrl : undefined,
        assessorNotes: input.assessorNotes !== undefined ? input.assessorNotes : undefined,
      },
      create: {
        tenantId: period.tenantId,
        periodId: input.periodId,
        criterionId: input.criterionId,
        score: input.score,
        reviewNotes: input.reviewNotes || null,
        findingsGap: input.findingsGap || null,
        interviewNotes: input.interviewNotes || null,
        screenshotUrl: input.screenshotUrl || null,
        assessorNotes: input.assessorNotes || null,
      },
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'CRITERION_EVALUATION_SAVED',
      targetTable: 'criterion_evaluations',
      targetId: evaluation.id,
      newValues: {
        parameterCode: criterion.parameter.code,
        criterionLetter: criterion.letterCode,
        level: criterion.level,
        score: input.score,
      },
    });

    // Perbarui agregasi skor aspek dimensi periode jika diperlukan
    await this.updatePeriodAspectScore(period.tenantId, input.periodId);

    return evaluation;
  }

  /**
   * Menyimpan / memperbarui batch evaluasi kriteria sekaligus
   */
  async batchSaveEvaluations(userId: string, userRole: UserRole, input: BatchSaveEvaluationDto) {
    const period = await this.verifyConsultantAccess(userId, userRole, input.periodId);

    const results = await prisma.$transaction(async (tx) => {
      const items = [];
      for (const item of input.evaluations) {
        const evaluation = await tx.criterionEvaluation.upsert({
          where: {
            tenantId_periodId_criterionId: {
              tenantId: period.tenantId,
              periodId: input.periodId,
              criterionId: item.criterionId,
            },
          },
          update: {
            score: item.score,
            reviewNotes: item.reviewNotes !== undefined ? item.reviewNotes : undefined,
            findingsGap: item.findingsGap !== undefined ? item.findingsGap : undefined,
            interviewNotes: item.interviewNotes !== undefined ? item.interviewNotes : undefined,
            screenshotUrl: item.screenshotUrl !== undefined ? item.screenshotUrl : undefined,
            assessorNotes: item.assessorNotes !== undefined ? item.assessorNotes : undefined,
          },
          create: {
            tenantId: period.tenantId,
            periodId: input.periodId,
            criterionId: item.criterionId,
            score: item.score,
            reviewNotes: item.reviewNotes || null,
            findingsGap: item.findingsGap || null,
            interviewNotes: item.interviewNotes || null,
            screenshotUrl: item.screenshotUrl || null,
            assessorNotes: item.assessorNotes || null,
          },
        });
        items.push(evaluation);
      }
      return items;
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'CRITERION_EVALUATIONS_BATCH_SAVED',
      targetTable: 'criterion_evaluations',
      targetId: input.periodId,
      newValues: {
        totalEvaluationsSaved: results.length,
      },
    });

    await this.updatePeriodAspectScore(period.tenantId, input.periodId);

    return {
      message: `Berhasil menyimpan ${results.length} evaluasi kriteria`,
      totalSaved: results.length,
      evaluations: results,
    };
  }

  /**
   * Rekalkulasi dan perbarui skor aspek dimensi pada tabel assessment_periods
   */
  private async updatePeriodAspectScore(tenantId: string, periodId: string) {
    const parameters = await prisma.parameter.findMany({
      include: {
        criteria: true,
      },
    });

    const evals = await prisma.criterionEvaluation.findMany({
      where: { tenantId, periodId },
    });

    const evalMap = new Map(evals.map((e) => [e.criterionId, e.score]));
    const paramScores: number[] = [];

    for (const p of parameters) {
      const scores = p.criteria.map((c) => evalMap.get(c.id)).filter((s) => s !== undefined) as number[];
      if (scores.length === p.criteria.length && p.criteria.length > 0) {
        paramScores.push(RmiScoringEngine.calculateParameterScore(scores));
      }
    }

    if (paramScores.length > 0) {
      const aspectScore = RmiScoringEngine.calculateAspectDimensionScore(paramScores);
      await prisma.assessmentPeriod.update({
        where: { id: periodId },
        data: { aspectDimScore: aspectScore },
      });
    }
  }
}

export const consultantEvaluationService = new ConsultantEvaluationService();
