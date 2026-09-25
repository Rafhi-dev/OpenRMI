import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { logAuditEvent } from '../../utils/auditLogger';
import { getMaturityPhase } from '../scoring/scoring.constants';
import { RmiScoringEngine } from '../scoring/scoring.engine';
import { SaveHistoricalAssessmentDto } from './historical.schema';
import { UserRole } from '@prisma/client';

export class HistoricalAssessmentService {
  /**
   * Verifikasi akses terhadap periode asesmen
   */
  private async verifyPeriodAccess(userId: string, userRole: UserRole, userTenantId: string | null, periodId: string) {
    const period = await prisma.assessmentPeriod.findUnique({
      where: { id: periodId },
      include: { tenant: true },
    });

    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode asesmen tidak ditemukan.');
    }

    if (userRole === UserRole.ADMINISTRATOR) {
      return period;
    }

    if (userRole === UserRole.VENDOR) {
      if (period.tenant.vendorId !== userTenantId && period.tenant.vendorId !== (period.tenant as any).vendorId) {
        // Cek apakah vendorId cocok
      }
      return period;
    }

    if (userRole === UserRole.COUNTERPART_TEAM) {
      if (period.tenantId !== userTenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Tim Counterpart hanya berhak mengakses data perusahaannya sendiri.');
      }
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
      return period;
    }

    return period;
  }

  /**
   * Mengambil baseline skor historis dan analisis perbandingan capaian YoY
   */
  async getHistoricalComparison(userId: string, userRole: UserRole, userTenantId: string | null, periodId: string) {
    const period = await this.verifyPeriodAccess(userId, userRole, userTenantId, periodId);

    const historical = await prisma.historicalAssessment.findUnique({
      where: { periodId },
    });

    // Hitung skor dimensi berjalan (current)
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

    const evaluations = await prisma.criterionEvaluation.findMany({
      where: { tenantId: period.tenantId, periodId },
    });

    const evalMap = new Map(evaluations.map((e) => [e.criterionId, e.score]));

    const currentDimensionScores: Record<string, number | null> = {};
    const allCurrentParamScores: number[] = [];

    dimensions.forEach((dim) => {
      const dimParamScores: number[] = [];

      dim.subDimensions.forEach((sd) => {
        sd.parameters.forEach((param) => {
          const scores = param.criteria.map((c) => evalMap.get(c.id)).filter((s) => s !== undefined) as number[];
          if (scores.length === param.criteria.length && param.criteria.length > 0) {
            const paramScore = RmiScoringEngine.calculateParameterScore(scores);
            dimParamScores.push(paramScore);
            allCurrentParamScores.push(paramScore);
          }
        });
      });

      currentDimensionScores[dim.code] =
        dimParamScores.length > 0 ? RmiScoringEngine.calculateDimensionScore(dimParamScores) : null;
    });

    const currentAspectDimScore =
      period.aspectDimScore !== null
        ? Number(period.aspectDimScore)
        : allCurrentParamScores.length > 0
        ? RmiScoringEngine.calculateAspectDimensionScore(allCurrentParamScores)
        : null;

    const currentPerfScore = period.perfScore !== null ? Number(period.perfScore) : null;
    const currentFinalRmi = period.finalRmiScore !== null ? Number(period.finalRmiScore) : null;

    // Komparasi YoY jika data historis tersedia
    let yoyComparison = null;
    if (historical && historical.dimensionScores) {
      const prevDimScores = historical.dimensionScores as Record<string, number>;
      const dimensionDeltas: Record<string, { current: number | null; previous: number; delta: number | null; trend: 'INCREASE' | 'DECREASE' | 'STAGNANT' }> = {};

      ['D1', 'D2', 'D3', 'D4', 'D5'].forEach((code) => {
        const curr = currentDimensionScores[code] ?? null;
        const prev = prevDimScores[code] ?? 0;
        const delta = curr !== null ? Number((curr - prev).toFixed(2)) : null;

        let trend: 'INCREASE' | 'DECREASE' | 'STAGNANT' = 'STAGNANT';
        if (delta !== null) {
          if (delta > 0) trend = 'INCREASE';
          else if (delta < 0) trend = 'DECREASE';
        }

        dimensionDeltas[code] = {
          current: curr,
          previous: prev,
          delta,
          trend,
        };
      });

      const prevFinalRmi = historical.finalRmiScore ? Number(historical.finalRmiScore) : null;
      const finalRmiDelta =
        currentFinalRmi !== null && prevFinalRmi !== null
          ? Number((currentFinalRmi - prevFinalRmi).toFixed(2))
          : null;

      yoyComparison = {
        previousYear: historical.previousYear,
        currentYear: period.year,
        dimensionDeltas,
        overallRmi: {
          current: currentFinalRmi,
          previous: prevFinalRmi,
          delta: finalRmiDelta,
          trend: finalRmiDelta !== null && finalRmiDelta > 0 ? 'INCREASE' : finalRmiDelta !== null && finalRmiDelta < 0 ? 'DECREASE' : 'STAGNANT',
          currentMaturityPhase: period.maturityPhase,
          previousMaturityPhase: historical.maturityPhase,
        },
      };
    }

    return {
      period: {
        id: period.id,
        year: period.year,
        tenantId: period.tenantId,
        tenantName: period.tenant.name,
      },
      currentAssessment: {
        year: period.year,
        dimensionScores: currentDimensionScores,
        aspectDimScore: currentAspectDimScore,
        perfScore: currentPerfScore,
        finalRmiScore: currentFinalRmi,
        maturityPhase: period.maturityPhase,
      },
      historicalBaseline: historical,
      yoyComparison,
    };
  }

  /**
   * Menyimpan / memperbarui data baseline skor tahun sebelumnya
   * Dapat diisi setara oleh Konsultan Eksternal maupun Tim Counterpart
   */
  async saveHistoricalAssessment(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    input: SaveHistoricalAssessmentDto
  ) {
    const period = await this.verifyPeriodAccess(userId, userRole, userTenantId, input.periodId);

    // Hitung rata-rata aspek dimensi tahun lalu jika tidak disediakan
    const dimVals = Object.values(input.dimensionScores);
    const calculatedAspectDim = Number((dimVals.reduce((a, b) => a + b, 0) / dimVals.length).toFixed(2));
    const aspectDimScore = input.aspectDimScore !== undefined ? input.aspectDimScore : calculatedAspectDim;

    const finalRmiScore = input.finalRmiScore !== undefined ? input.finalRmiScore : aspectDimScore;
    const maturityPhase = input.maturityPhase || getMaturityPhase(finalRmiScore);

    const historical = await prisma.historicalAssessment.upsert({
      where: { periodId: input.periodId },
      update: {
        previousYear: input.previousYear,
        dimensionScores: input.dimensionScores as any,
        aspectDimScore,
        perfScore: input.perfScore !== undefined ? input.perfScore : undefined,
        finalRmiScore,
        maturityPhase,
        parameterScores: input.parameterScores ? (input.parameterScores as any) : undefined,
        inputtedByRole: userRole,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
      create: {
        periodId: input.periodId,
        previousYear: input.previousYear,
        dimensionScores: input.dimensionScores as any,
        aspectDimScore,
        perfScore: input.perfScore || null,
        finalRmiScore,
        maturityPhase,
        parameterScores: input.parameterScores ? (input.parameterScores as any) : undefined,
        inputtedByRole: userRole,
        notes: input.notes || null,
      },
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'HISTORICAL_BASELINE_SAVED',
      targetTable: 'historical_assessments',
      targetId: historical.id,
      newValues: {
        previousYear: historical.previousYear,
        finalRmiScore: historical.finalRmiScore,
        inputtedByRole: userRole,
      },
    });

    return historical;
  }
}

export const historicalAssessmentService = new HistoricalAssessmentService();
