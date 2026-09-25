import { prisma } from '../../../config/database';
import { AppError } from '../../../middlewares/errorHandler';
import { jinaEmbeddingService } from '../../ai/services/jina.service';
import { deepseekReasoningService, CriterionRecommendationDetail } from '../../ai/services/deepseek.service';
import { logAuditEvent } from '../../../utils/auditLogger';
import { ApplyAiRecommendationDto, AnalyzeSupplementaryDocDto, UpdateAnalysisResultDto } from './aiAssist.schema';
import { UserRole } from '@prisma/client';

export class ConsultantAiAssistService {
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
   * Menghasilkan rekomendasi nilai skor kriteria & kutipan eviden berbasis AI (DeepSeek + Jina RAG)
   */
  async generateParameterRecommendation(
    userId: string,
    userRole: UserRole,
    periodId: string,
    parameterCode: string
  ) {
    const period = await this.verifyConsultantAccess(userId, userRole, periodId);

    // Ambil master parameter beserta kriteria level 1 s.d. 5
    const parameter = await prisma.parameter.findUnique({
      where: { code: parameterCode },
      include: {
        criteria: {
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!parameter) {
      throw new AppError(404, 'PARAMETER_NOT_FOUND', `Parameter dengan kode ${parameterCode} tidak ditemukan.`);
    }

    // Ambil fragmen dokumen bukti yang relevan via Jina semantic search
    const query = `${parameter.title} ${parameter.criteria.map((c) => c.statement).join(' ')}`;
    const relevantChunks = await jinaEmbeddingService.searchRelevantChunks(period.tenantId, query, 5);

    // Jalankan penalaran regulasi KBUMN via DeepSeek LLM
    const aiResult = await deepseekReasoningService.generateParameterRecommendation(
      period.tenantId,
      periodId,
      parameterCode,
      parameter.criteria,
      relevantChunks
    );

    // Simpan ke tabel ai_assessment_recommendations
    const recommendation = await prisma.aiAssessmentRecommendation.create({
      data: {
        periodId,
        parameterCode,
        recommendedScore: aiResult.recommendedScore,
        modelUsed: aiResult.modelUsed,
        thinkingProcess: aiResult.thinkingProcess || null,
        criteriaDetails: aiResult.criteriaDetails as any,
        isApplied: false,
      },
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'AI_ASSIST_INVOKED',
      targetTable: 'ai_assessment_recommendations',
      targetId: recommendation.id,
      newValues: {
        parameterCode,
        recommendedScore: aiResult.recommendedScore,
        modelUsed: aiResult.modelUsed,
      },
    });

    return {
      recommendationId: recommendation.id,
      parameterCode: recommendation.parameterCode,
      parameterTitle: parameter.title,
      recommendedScore: recommendation.recommendedScore,
      modelUsed: recommendation.modelUsed,
      thinkingProcess: recommendation.thinkingProcess,
      criteriaDetails: recommendation.criteriaDetails,
      isApplied: recommendation.isApplied,
      relevantEvidenceChunks: relevantChunks,
      createdAt: recommendation.createdAt,
    };
  }

  /**
   * One-Click Apply: Konsultan menyetujui rekomendasi AI ke lembar kerja evaluasi resmi
   */
  async applyAiRecommendation(
    userId: string,
    userRole: UserRole,
    input: ApplyAiRecommendationDto
  ) {
    const period = await this.verifyConsultantAccess(userId, userRole, input.periodId);

    const rec = await prisma.aiAssessmentRecommendation.findUnique({
      where: { id: input.recommendationId },
    });

    if (!rec || rec.periodId !== input.periodId || rec.parameterCode !== input.parameterCode) {
      throw new AppError(404, 'RECOMMENDATION_NOT_FOUND', 'Rekomendasi AI tidak ditemukan.');
    }

    const details = (rec.criteriaDetails as unknown as CriterionRecommendationDetail[]) || [];

    // Terapkan skor ke tabel criterion_evaluations
    const evaluations = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of details) {
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
            reviewNotes: item.rationale,
            findingsGap: item.score < 4 ? `Perlu penguatan bukti implementasi berkelanjutan (Halaman ${item.pageRef})` : null,
          },
          create: {
            tenantId: period.tenantId,
            periodId: input.periodId,
            criterionId: item.criterionId,
            score: item.score,
            reviewNotes: item.rationale,
            findingsGap: item.score < 4 ? `Perlu penguatan bukti implementasi berkelanjutan (Halaman ${item.pageRef})` : null,
          },
        });
        results.push(evaluation);
      }

      await tx.aiAssessmentRecommendation.update({
        where: { id: input.recommendationId },
        data: { isApplied: true },
      });

      return results;
    });

    await logAuditEvent({
      tenantId: period.tenantId,
      userId,
      action: 'AI_RECOMMENDATION_APPLIED',
      targetTable: 'ai_assessment_recommendations',
      targetId: rec.id,
      newValues: {
        parameterCode: input.parameterCode,
        appliedScore: rec.recommendedScore,
        criteriaEvaluatedCount: evaluations.length,
      },
    });

    return {
      message: `Rekomendasi AI untuk parameter ${input.parameterCode} berhasil diterapkan (One-Click Apply).`,
      parameterCode: input.parameterCode,
      appliedScore: rec.recommendedScore,
      evaluationsCount: evaluations.length,
      evaluations,
    };
  }

  /**
   * Analisis Cerdas Dokumen Tambahan Pasca-FGD berbasis Custom Prompt Bebas Konsultan
   */
  async analyzeSupplementaryDoc(
    userId: string,
    userRole: UserRole,
    docId: string,
    input: AnalyzeSupplementaryDocDto
  ) {
    const doc = await prisma.supplementaryDocument.findUnique({
      where: { id: docId },
      include: {
        documentChunks: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });

    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tambahan tidak ditemukan.');
    }

    await this.verifyConsultantAccess(userId, userRole, doc.periodId);

    // Pastikan chunks tersedia (jika belum, parsing instan)
    let chunks = doc.documentChunks;
    if (chunks.length === 0) {
      const pages = await deepseekReasoningService.analyzeSupplementaryDoc(doc.fileName, [], input.customPrompt);
    }

    const aiAnalysis = await deepseekReasoningService.analyzeSupplementaryDoc(
      doc.fileName,
      chunks.map((c) => ({ pageNumber: c.pageNumber, content: c.content })),
      input.customPrompt
    );

    // Simpan ke tabel document_analysis_results (Strict Assessor Confidentiality)
    const result = await prisma.documentAnalysisResult.create({
      data: {
        supplementaryDocId: doc.id,
        assessorId: userId,
        promptGiven: input.customPrompt,
        aiGeneratedAnalysis: aiAnalysis.aiGeneratedAnalysis,
        modelUsed: aiAnalysis.modelUsed,
        thinkingProcess: aiAnalysis.thinkingProcess || null,
        pageReferences: aiAnalysis.pageReferences,
        isPrivateToAssessor: true,
      },
    });

    await logAuditEvent({
      tenantId: doc.tenantId,
      userId,
      action: 'AI_SUPPLEMENTARY_ANALYSIS',
      targetTable: 'document_analysis_results',
      targetId: result.id,
      newValues: {
        supplementaryDocId: doc.id,
        promptGiven: input.customPrompt,
      },
    });

    return result;
  }

  /**
   * Simpan / Perbarui Catatan Internal Privat Asesor (Strict Assessor Confidentiality)
   */
  async updateAnalysisResult(
    userId: string,
    userRole: UserRole,
    resultId: string,
    input: UpdateAnalysisResultDto
  ) {
    const result = await prisma.documentAnalysisResult.findUnique({
      where: { id: resultId },
      include: {
        supplementaryDoc: true,
      },
    });

    if (!result) {
      throw new AppError(404, 'ANALYSIS_RESULT_NOT_FOUND', 'Hasil analisis tidak ditemukan.');
    }

    await this.verifyConsultantAccess(userId, userRole, result.supplementaryDoc.periodId);

    const updated = await prisma.documentAnalysisResult.update({
      where: { id: resultId },
      data: {
        assessorNotes: input.assessorNotes,
        isPrivateToAssessor: input.isPrivateToAssessor ?? true,
      },
    });

    return updated;
  }

  /**
   * Mengambil Hasil Analisis Dokumen Tambahan (Hanya untuk Konsultan & Admin)
   */
  async getAnalysisResult(userId: string, userRole: UserRole, docId: string) {
    const doc = await prisma.supplementaryDocument.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    }

    await this.verifyConsultantAccess(userId, userRole, doc.periodId);

    const results = await prisma.documentAnalysisResult.findMany({
      where: { supplementaryDocId: docId },
      orderBy: { createdAt: 'desc' },
      include: {
        assessor: {
          select: {
            id: true,
            fullName: true,
            agencyName: true,
          },
        },
      },
    });

    return results;
  }
}

export const consultantAiAssistService = new ConsultantAiAssistService();
