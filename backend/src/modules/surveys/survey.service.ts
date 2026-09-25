import crypto from 'crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { logAuditEvent } from '../../utils/auditLogger';
import { DEFAULT_RISK_CULTURE_QUESTIONS } from './survey.constants';
import { InitiateSurveyDto, SubmitPublicSurveyDto, ToggleSurveyDto } from './survey.schema';
import { UserRole } from '@prisma/client';
import { RmiScoringEngine } from '../scoring/scoring.engine';

export class RiskCultureSurveyService {
  /**
   * Verifikasi otorisasi akses terhadap periode asesmen
   */
  private async verifyPeriodAccess(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ) {
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
   * Inisiasi atau ambil konfigurasi survei budaya risiko untuk suatu periode
   */
  async initiateOrGetSurvey(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    dto: InitiateSurveyDto
  ) {
    const period = await this.verifyPeriodAccess(userId, userRole, userTenantId, dto.periodId);

    let survey = await prisma.riskCultureSurvey.findUnique({
      where: { periodId: dto.periodId },
    });

    if (!survey) {
      const publicToken = crypto.randomBytes(16).toString('hex');
      survey = await prisma.riskCultureSurvey.create({
        data: {
          periodId: dto.periodId,
          publicToken,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
      });

      await logAuditEvent({
        tenantId: period.tenantId,
        userId,
        action: 'SURVEY_INITIATED',
        targetTable: 'risk_culture_surveys',
        targetId: survey.id,
        newValues: { publicToken, isActive: survey.isActive },
      });
    } else {
      // Update jika ada perubahan status atau tanggal
      if (dto.startDate !== undefined || dto.endDate !== undefined || dto.isActive !== undefined) {
        survey = await prisma.riskCultureSurvey.update({
          where: { id: survey.id },
          data: {
            isActive: dto.isActive !== undefined ? dto.isActive : survey.isActive,
            startDate: dto.startDate ? new Date(dto.startDate) : survey.startDate,
            endDate: dto.endDate ? new Date(dto.endDate) : survey.endDate,
          },
        });
      }
    }

    const publicUrl = `/surveys/fill/${survey.publicToken}`;
    const qrPayload = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${publicUrl}`;

    return {
      ...survey,
      publicUrl,
      qrPayload,
      questionsCount: DEFAULT_RISK_CULTURE_QUESTIONS.length,
    };
  }

  /**
   * Toggle status aktif survei (Buka / Tutup Pengisian)
   */
  async toggleSurveyStatus(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    dto: ToggleSurveyDto
  ) {
    const period = await this.verifyPeriodAccess(userId, userRole, userTenantId, dto.periodId);

    const survey = await prisma.riskCultureSurvey.findUnique({
      where: { periodId: dto.periodId },
    });

    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survei untuk periode ini belum diinisiasi.');
    }

    const updated = await prisma.riskCultureSurvey.update({
      where: { id: survey.id },
      data: { isActive: dto.isActive },
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'SURVEY_STATUS_TOGGLED',
      targetTable: 'risk_culture_surveys',
      targetId: survey.id,
      newValues: { isActive: dto.isActive },
    });

    return updated;
  }

  /**
   * Ambil status & statistik agregat survei budaya risiko internal
   */
  async getSurveyStatus(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ) {
    await this.verifyPeriodAccess(userId, userRole, userTenantId, periodId);

    const survey = await prisma.riskCultureSurvey.findUnique({
      where: { periodId },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!survey) {
      return {
        isInitiated: false,
        survey: null,
      };
    }

    const publicUrl = `/surveys/fill/${survey.publicToken}`;
    const qrPayload = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${publicUrl}`;

    return {
      isInitiated: true,
      survey: {
        ...survey,
        publicUrl,
        qrPayload,
        questionsCount: DEFAULT_RISK_CULTURE_QUESTIONS.length,
      },
    };
  }

  /**
   * Endpoint Publik (Tanpa Autentikasi): Mengambil instrumen survei berdasarkan token unik
   */
  async getPublicSurvey(token: string) {
    const survey = await prisma.riskCultureSurvey.findUnique({
      where: { publicToken: token },
      include: {
        period: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Tautan kuesioner survei tidak ditemukan atau sudah tidak valid.');
    }

    if (!survey.isActive) {
      throw new AppError(
        400,
        'SURVEY_INACTIVE',
        'Pengisian survei budaya risiko saat ini telah ditutup oleh administrator/asesor.'
      );
    }

    const now = new Date();
    if (survey.startDate && now < survey.startDate) {
      throw new AppError(400, 'SURVEY_NOT_STARTED', 'Survei budaya risiko belum dibuka untuk pengisian.');
    }
    if (survey.endDate && now > survey.endDate) {
      throw new AppError(400, 'SURVEY_EXPIRED', 'Masa pengisian survei budaya risiko telah berakhir.');
    }

    return {
      companyName: survey.period.tenant.name,
      companyLogoUrl: survey.period.tenant.logoUrl,
      assessmentYear: survey.period.year,
      totalResponses: survey.totalResponses,
      questions: DEFAULT_RISK_CULTURE_QUESTIONS,
    };
  }

  /**
   * Endpoint Publik (Tanpa Autentikasi): Pengiriman respons survei anonim
   */
  async submitPublicSurvey(token: string, dto: SubmitPublicSurveyDto) {
    const survey = await prisma.riskCultureSurvey.findUnique({
      where: { publicToken: token },
      include: {
        period: true,
      },
    });

    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Tautan kuesioner survei tidak valid.');
    }

    if (!survey.isActive) {
      throw new AppError(400, 'SURVEY_INACTIVE', 'Pengisian survei telah ditutup.');
    }

    // Hitung rata-rata skor respons individu (Likert 1-5)
    const sum = dto.answers.reduce((acc, curr) => acc + curr, 0);
    const calculatedScore = Number((sum / dto.answers.length).toFixed(2));

    // Simpan respons anonim
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        division: dto.division || null,
        jobLevel: dto.jobLevel || null,
        tenureYears: dto.tenureYears !== undefined ? dto.tenureYears : null,
        answers: dto.answers as any,
        calculatedScore,
      },
    });

    // Hitung ulang seluruh respons yang masuk untuk re-agregasi
    const allResponses = await prisma.surveyResponse.findMany({
      where: { surveyId: survey.id },
      select: { calculatedScore: true, answers: true },
    });

    const totalResponses = allResponses.length;
    const totalScoreSum = allResponses.reduce((acc, r) => acc + Number(r.calculatedScore), 0);
    const averageScore = Number((totalScoreSum / totalResponses).toFixed(2));

    // Agregasi rata-rata per pertanyaan
    const questionSums: number[] = new Array(DEFAULT_RISK_CULTURE_QUESTIONS.length).fill(0);
    const questionCounts: number[] = new Array(DEFAULT_RISK_CULTURE_QUESTIONS.length).fill(0);

    allResponses.forEach((r) => {
      const ansArr = r.answers as number[];
      if (Array.isArray(ansArr)) {
        ansArr.forEach((val, idx) => {
          if (idx < questionSums.length) {
            questionSums[idx] += val;
            questionCounts[idx] += 1;
          }
        });
      }
    });

    const categoryScores: Record<string, number> = {};
    DEFAULT_RISK_CULTURE_QUESTIONS.forEach((q, idx) => {
      const count = questionCounts[idx];
      const avg = count > 0 ? Number((questionSums[idx] / count).toFixed(2)) : 0;
      categoryScores[q.category] = avg;
    });

    // Perbarui agregat di RiskCultureSurvey
    await prisma.riskCultureSurvey.update({
      where: { id: survey.id },
      data: {
        totalResponses,
        averageScore,
        categoryScores: categoryScores as any,
      },
    });

    return {
      message: 'Terima kasih atas partisipasi Anda dalam survei budaya risiko perusahaan.',
      submittedAt: response.submittedAt,
    };
  }

  /**
   * Analisis Kesenjangan Persepsi (Perception Gap Analysis):
   * Selisih persepsi karyawan (Survei) vs Penilaian Asesor (Parameter 1 / Dimensi 1)
   */
  async getPerceptionGap(
    userId: string,
    userRole: UserRole,
    userTenantId: string | null,
    periodId: string
  ) {
    const period = await this.verifyPeriodAccess(userId, userRole, userTenantId, periodId);

    const survey = await prisma.riskCultureSurvey.findUnique({
      where: { periodId },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    // Cari Dimensi 1 (D1) dan kriteria P01 untuk menghitung skor Asesor
    const d1 = await prisma.dimension.findFirst({
      where: { code: 'D1' },
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
    });

    let assessorD1Score: number | null = null;
    let assessorP1Score: number | null = null;

    if (d1) {
      const evaluations = await prisma.criterionEvaluation.findMany({
        where: { tenantId: period.tenantId, periodId },
      });
      const evalMap = new Map(evaluations.map((e) => [e.criterionId, e.score]));

      const d1ParamScores: number[] = [];

      d1.subDimensions.forEach((sd) => {
        sd.parameters.forEach((param) => {
          const scores = param.criteria.map((c) => evalMap.get(c.id)).filter((s) => s !== undefined) as number[];
          if (scores.length === param.criteria.length && param.criteria.length > 0) {
            const pScore = RmiScoringEngine.calculateParameterScore(scores);
            d1ParamScores.push(pScore);
            if (param.code === 'P01' || param.code === 'P1') {
              assessorP1Score = pScore;
            }
          }
        });
      });

      if (d1ParamScores.length > 0) {
        assessorD1Score = RmiScoringEngine.calculateDimensionScore(d1ParamScores);
      }
    }

    const employeeSurveyScore = survey?.averageScore ? Number(survey.averageScore) : null;
    const totalResponses = survey?.totalResponses ?? 0;

    let delta: number | null = null;
    let gapCategory: 'OVERCONFIDENT' | 'ALIGNED' | 'NEEDS_EDUCATION' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let gapCategoryLabel = 'Belum Cukup Data';
    let interpretation = 'Memerlukan data evaluasi asesor D1 dan minimal pengisian survei budaya risiko.';

    if (assessorD1Score !== null && employeeSurveyScore !== null && totalResponses > 0) {
      delta = Number((employeeSurveyScore - assessorD1Score).toFixed(2));

      if (delta > 0.50) {
        gapCategory = 'OVERCONFIDENT';
        gapCategoryLabel = 'Overconfident (Persepsi Karyawan Lebih Tinggi)';
        interpretation =
          'Persepsi budaya risiko internal karyawan berada jauh di atas tingkat kematangan implementasi faktual yang dibuktikan oleh asesor. Direkomendasikan re-kalibrasi pemahaman risiko dan pengetatan kepatuhan operasional.';
      } else if (delta < -0.50) {
        gapCategory = 'NEEDS_EDUCATION';
        gapCategoryLabel = 'Perlu Edukasi & Sosialisasi';
        interpretation =
          'Karyawan mempersepsikan budaya risiko lebih rendah dibandingkan kerangka kebijakan yang sudah ada. Perlu peningkatan sosialisasi keterbukaan risiko, program penghargaan, dan komunikasi dua arah.';
      } else {
        gapCategory = 'ALIGNED';
        gapCategoryLabel = 'Selaras (Aligned)';
        interpretation =
          'Persepsi karyawan terhadap budaya risiko selaras dengan hasil reviu pemenuhan dokumen dan tata kelola oleh asesor.';
      }
    }

    return {
      period: {
        id: period.id,
        year: period.year,
        tenantId: period.tenantId,
        tenantName: period.tenant.name,
      },
      surveyStatus: {
        isInitiated: !!survey,
        isActive: survey?.isActive ?? false,
        totalResponses,
        employeeSurveyScore,
        categoryScores: survey?.categoryScores ?? null,
      },
      assessorScores: {
        dimension1Score: assessorD1Score,
        parameter1Score: assessorP1Score,
      },
      comparison: {
        employeeSurveyScore,
        assessorD1Score,
        delta,
        gapCategory,
        gapCategoryLabel,
        interpretation,
      },
    };
  }
}

export const riskCultureSurveyService = new RiskCultureSurveyService();
