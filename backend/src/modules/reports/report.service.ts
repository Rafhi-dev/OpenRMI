import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { RmiScoringEngine } from '../scoring/scoring.engine';
import { excelReportService, FullReportAssessmentData } from './excel.service';
import { pdfReportService } from './pdf.service';
import { UserRole } from '@prisma/client';

export class ReportService {
  /**
   * Verifikasi hak otorisasi akses terhadap laporan periode asesmen
   */
  async verifyPeriodAccess(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ) {
    const period = await prisma.assessmentPeriod.findUnique({
      where: { id: periodId },
      include: {
        tenant: {
          include: {
            vendor: true,
          },
        },
        perfEvaluation: true,
        historicalScore: true,
        cultureSurvey: true,
        assignments: {
          where: { isActive: true },
          include: { consultant: true },
        },
      },
    });

    if (!period) {
      throw new AppError(404, 'PERIOD_NOT_FOUND', 'Periode asesmen tidak ditemukan.');
    }

    if (userRole === UserRole.ADMINISTRATOR) {
      return period;
    }

    if (userRole === UserRole.VENDOR) {
      // Vendor boleh mengakses seluruh tenant miliknya
      return period;
    }

    if (userRole === UserRole.COUNTERPART_TEAM) {
      if (period.tenantId !== userTenantId) {
        throw new AppError(403, 'FORBIDDEN', 'Tim Counterpart hanya berhak mengakses laporan perusahaannya sendiri.');
      }
      return period;
    }

    if (userRole === UserRole.EXTERNAL_CONSULTANT) {
      const isAssigned = period.assignments.some((a) => a.consultantId === userId);
      if (!isAssigned) {
        throw new AppError(
          403,
          'CONSULTANT_NOT_ASSIGNED',
          'Anda tidak memiliki penugasan aktif pada periode asesmen perusahaan ini.'
        );
      }
      return period;
    }

    return period;
  }

  /**
   * Mengumpulkan dan mengompilasi seluruh data asesmen secara komprehensif
   */
  async compileFullReportData(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ): Promise<FullReportAssessmentData> {
    const period = await this.verifyPeriodAccess(userId, userRole, userTenantId, periodId);

    // Ambil struktur dimensi, sub-dimensi, parameter, kriteria
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
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Ambil seluruh evaluasi kriteria
    const evaluations = await prisma.criterionEvaluation.findMany({
      where: { tenantId: period.tenantId, periodId },
    });
    const evalMap = new Map(evaluations.map((e) => [e.criterionId, e]));

    // Ambil seluruh rekomendasi perbaikan
    const recommendations = await prisma.recommendation.findMany({
      where: { periodId },
      orderBy: [{ priorityQuadrant: 'asc' }, { id: 'asc' }],
    });

    // Compile 5 Dimensi
    const compiledDimensions = dimensions.map((dim) => {
      const dimParamScores: number[] = [];

      const compiledParams = dim.subDimensions.flatMap((sd) =>
        sd.parameters.map((param) => {
          const critScores: number[] = [];

          const compiledCriteria = param.criteria.map((crit) => {
            const ev = evalMap.get(crit.id);
            const score = ev?.score ?? null;
            if (score !== null) {
              critScores.push(score);
            }
            return {
              id: crit.id,
              letterCode: crit.letterCode,
              level: crit.level,
              statement: crit.statement,
              guidanceNotes: crit.guidanceNotes,
              defaultEvidences: crit.defaultEvidences,
              score,
              reviewNotes: ev?.reviewNotes ?? null,
              findingsGap: ev?.findingsGap ?? null,
              interviewNotes: ev?.interviewNotes ?? null,
              screenshotUrl: ev?.screenshotUrl ?? null,
            };
          });

          // Weakest-Link Parameter Score
          let paramScore: number | null = null;
          if (critScores.length === param.criteria.length && param.criteria.length > 0) {
            paramScore = RmiScoringEngine.calculateParameterScore(critScores);
            dimParamScores.push(paramScore);
          }

          return {
            id: param.id,
            code: param.code,
            title: param.title,
            score: paramScore,
            criteria: compiledCriteria,
          };
        })
      );

      const dimScore =
        dimParamScores.length > 0 ? RmiScoringEngine.calculateDimensionScore(dimParamScores) : null;

      return {
        id: dim.id,
        code: dim.code,
        name: dim.name,
        score: dimScore,
        parameters: compiledParams,
      };
    });

    // Hitung penalti aspek kinerja
    let perfData = null;
    if (period.perfEvaluation) {
      const aspectScore = period.aspectDimScore !== null ? Number(period.aspectDimScore) : 0;
      const perfCalc = RmiScoringEngine.calculatePerformanceAdjustment(aspectScore, {
        finalRating: period.perfEvaluation.finalRating,
        compositeRiskRating: period.perfEvaluation.compositeRating,
      });

      perfData = {
        finalRating: period.perfEvaluation.finalRating,
        kpmrScore: Number(period.perfEvaluation.kpmrScore),
        compositeRating: period.perfEvaluation.compositeRating,
        spiReviewNotes: period.perfEvaluation.spiReviewNotes,
        penalty: perfCalc.scoreAdjustment,
        isGatingApplied: perfCalc.isEligible,
      };
    }

    const leadAssignment = period.assignments.find((a) => a.isActive);

    return {
      period: {
        id: period.id,
        year: period.year,
        status: period.status,
        modelCluster: period.modelCluster,
        aspectDimScore: period.aspectDimScore !== null ? Number(period.aspectDimScore) : null,
        perfScore: period.perfScore !== null ? Number(period.perfScore) : null,
        finalRmiScore: period.finalRmiScore !== null ? Number(period.finalRmiScore) : null,
        maturityPhase: period.maturityPhase,
        isLocked: period.isLocked,
      },
      tenant: {
        id: period.tenant.id,
        name: period.tenant.name,
        code: period.tenant.code,
        industryCluster: period.tenant.industryCluster,
      },
      vendor: period.tenant.vendor
        ? {
            id: period.tenant.vendor.id,
            name: period.tenant.vendor.name,
          }
        : null,
      leadConsultant: leadAssignment?.consultant
        ? {
            id: leadAssignment.consultant.id,
            fullName: leadAssignment.consultant.fullName,
          }
        : null,
      dimensions: compiledDimensions,
      performance: perfData,
      recommendations: recommendations.map((r) => ({
        id: r.id,
        parameterCode: r.parameterCode,
        recommendation: r.recommendation,
        targetDate: r.targetDate,
        mainActivities: r.mainActivities,
        expectedOutput: r.expectedOutput,
        successIndicator: r.successIndicator,
        unitInCharge: r.unitInCharge,
        priorityQuadrant: r.priorityQuadrant,
        horizon: r.horizon,
        status: r.status,
      })),
      historical: period.historicalScore
        ? {
            previousYear: period.historicalScore.previousYear,
            aspectDimScore:
              period.historicalScore.aspectDimScore !== null
                ? Number(period.historicalScore.aspectDimScore)
                : null,
            finalRmiScore:
              period.historicalScore.finalRmiScore !== null
                ? Number(period.historicalScore.finalRmiScore)
                : null,
            maturityPhase: period.historicalScore.maturityPhase,
            dimensionScores: period.historicalScore.dimensionScores as Record<string, number>,
          }
        : null,
      cultureSurvey: period.cultureSurvey
        ? {
            isActive: period.cultureSurvey.isActive,
            totalResponses: period.cultureSurvey.totalResponses,
            averageScore:
              period.cultureSurvey.averageScore !== null
                ? Number(period.cultureSurvey.averageScore)
                : null,
            categoryScores: period.cultureSurvey.categoryScores as Record<string, number>,
          }
        : null,
    };
  }

  /**
   * Menghasilkan file Excel resmi SCORE RMI
   */
  async generateExcelReport(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const data = await this.compileFullReportData(userId, userRole, userTenantId, periodId);
    const buffer = await excelReportService.generateRmiExcelWorkbook(data);
    const cleanTenant = data.tenant.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `SCORE_RMI_${cleanTenant}_${data.period.year}.xlsx`;
    return { buffer, fileName };
  }

  /**
   * Menghasilkan dokumen PDF Formulir Format 1.2.8
   */
  async generatePdfSummary(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const data = await this.compileFullReportData(userId, userRole, userTenantId, periodId);
    const buffer = await pdfReportService.generateSummaryPdf(data);
    const cleanTenant = data.tenant.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Ringkasan_RMI_Format_1.2.8_${cleanTenant}_${data.period.year}.pdf`;
    return { buffer, fileName };
  }
}

export const reportService = new ReportService();
