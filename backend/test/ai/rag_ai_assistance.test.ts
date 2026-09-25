import http from 'http';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { UserRole, AssessmentStatus, IndustryCluster, SupplementaryCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mineruService } from '../../src/modules/ai/services/mineru.service';
import { jinaEmbeddingService } from '../../src/modules/ai/services/jina.service';

describe('Phase 5: Background RAG Ingestion Pipeline & Consultant AI Assistance', () => {
  let server: http.Server;
  let baseUrl: string;
  let testVendor: any;
  let testTenant: any;
  let otherTenant: any;
  let consultantUser: any;
  let unassignedConsultantUser: any;
  let counterpartUser: any;
  let consultantToken: string;
  let unassignedConsultantToken: string;
  let counterpartToken: string;
  let assessmentPeriod: any;
  let sampleParameter: any;
  let sampleEvidence: any;
  let sampleSupplementaryDoc: any;
  let generatedRecId: string;
  let analysisResultId: string;

  beforeAll(async () => {
    // 0. Start Express on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    // 1. Buat Vendor Uji
    testVendor = await prisma.vendor.create({
      data: {
        name: 'PT Asesmen Solusi Nusantara',
        code: `VEND-TEST-AI-${Date.now()}`,
        email: `vendor-ai-${Date.now()}@example.com`,
        maxTenants: 10,
      },
    });

    // 2. Buat Tenant Utama dan Tenant Lain
    testTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Telekomunikasi Persero',
        code: `TEL-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    otherTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Pelabuhan Persero',
        code: `PEL-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    // 3. Buat Akun Pengguna
    const passwordHash = await bcrypt.hash('SecretPass@123', 10);

    // Konsultan Bertugas
    consultantUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: 'Dr. Firman Pratama (Lead Assessor)',
        username: `consultant_ai_${Date.now()}`,
        email: `consultant_ai_${Date.now()}@konsultan.com`,
        agencyName: 'Kantor Konsultan Solusi Risiko',
        passwordHash,
      },
    });

    // Konsultan Tidak Bertugas (Tanpa Assignment)
    unassignedConsultantUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: 'Eko Wicaksono (Unassigned)',
        username: `unassigned_${Date.now()}`,
        email: `unassigned_${Date.now()}@konsultan.com`,
        agencyName: 'Kantor Konsultan Solusi Risiko',
        passwordHash,
      },
    });

    // Tim Counterpart
    counterpartUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Ahmad Fauzi (Counterpart)',
        username: `cp_ai_${Date.now()}`,
        email: `cp_ai_${Date.now()}@telekomunikasi.co.id`,
        passwordHash,
      },
    });

    // Generate JWT Tokens
    const jwtSecret = process.env.JWT_SECRET || 'openrmi_jwt_secret_test_2026';
    consultantToken = jwt.sign(
      { userId: consultantUser.id, role: consultantUser.role, vendorId: testVendor.id, tenantId: null },
      jwtSecret,
      { expiresIn: '1h' }
    );

    unassignedConsultantToken = jwt.sign(
      { userId: unassignedConsultantUser.id, role: unassignedConsultantUser.role, vendorId: testVendor.id, tenantId: null },
      jwtSecret,
      { expiresIn: '1h' }
    );

    counterpartToken = jwt.sign(
      { userId: counterpartUser.id, role: counterpartUser.role, vendorId: null, tenantId: testTenant.id },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 4. Buat Assessment Period
    assessmentPeriod = await prisma.assessmentPeriod.create({
      data: {
        tenantId: testTenant.id,
        year: 2024,
        status: AssessmentStatus.UNDER_REVIEW,
        modelCluster: IndustryCluster.UMUM,
      },
    });

    // 5. Buat Assignment untuk Konsultan Bertugas
    await prisma.consultantAssignment.create({
      data: {
        tenantId: testTenant.id,
        consultantId: consultantUser.id,
        periodId: assessmentPeriod.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true,
      },
    });

    // 6. Ambil Parameter P01 dan kriteria
    sampleParameter = await prisma.parameter.findUnique({
      where: { code: 'P01' },
      include: { criteria: true },
    });

    // 7. Buat sample CriterionEvidence
    if (sampleParameter?.criteria?.[0]) {
      sampleEvidence = await prisma.criterionEvidence.create({
        data: {
          tenantId: testTenant.id,
          criterionId: sampleParameter.criteria[0].id,
          fileName: 'Pedoman_Tata_Kelola_Risiko_2024.pdf',
          fileUrl: 'https://s3.ap-southeast-1.amazonaws.com/openrmi/Pedoman_Tata_Kelola_Risiko_2024.pdf',
          fileSize: 1048576,
          mimeType: 'application/pdf',
          docNumber: 'SK-DIR/001/2024',
        },
      });
    }

    // 8. Buat sample SupplementaryDocument
    sampleSupplementaryDoc = await prisma.supplementaryDocument.create({
      data: {
        tenantId: testTenant.id,
        periodId: assessmentPeriod.id,
        fileName: 'Klarifikasi_Audit_Komite_Risiko.pdf',
        fileUrl: 'https://s3.ap-southeast-1.amazonaws.com/openrmi/Klarifikasi_Audit_Komite_Risiko.pdf',
        fileSize: 524288,
        mimeType: 'application/pdf',
        category: SupplementaryCategory.FGD_FOLLOW_UP,
        description: 'Tindak lanjut temuan audit komite dewan komisaris',
      },
    });
  });

  afterAll(async () => {
    try {
      if (sampleSupplementaryDoc) {
        await prisma.documentAnalysisResult.deleteMany({
          where: { supplementaryDocId: sampleSupplementaryDoc.id },
        });
      }
      if (assessmentPeriod) {
        await prisma.aiAssessmentRecommendation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.criterionEvaluation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.consultantAssignment.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.supplementaryDocument.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.assessmentPeriod.deleteMany({
          where: { tenantId: testTenant.id },
        });
      }
      if (testTenant) {
        await prisma.documentChunk.deleteMany({
          where: {
            OR: [
              { evidence: { tenantId: testTenant.id } },
              { supplementaryDoc: { tenantId: testTenant.id } },
            ],
          },
        });
        await prisma.criterionEvidence.deleteMany({
          where: { tenantId: testTenant.id },
        });
      }
      await prisma.user.deleteMany({
        where: {
          id: { in: [consultantUser?.id, unassignedConsultantUser?.id, counterpartUser?.id].filter(Boolean) },
        },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [testTenant?.id, otherTenant?.id].filter(Boolean) } },
      });
      if (testVendor) {
        await prisma.vendor.delete({ where: { id: testVendor.id } });
      }
    } catch (err) {
      console.warn('Cleanup warning:', err);
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('1. Background RAG Ingestion Pipeline (MinerU & Jina Semantic Search)', () => {
    it('MinerUService: ekstraksi dokumen menghasilkan chunk halaman terstruktur & tabel', async () => {
      const chunks = await mineruService.extractDocument(
        'https://s3.ap-southeast-1.amazonaws.com/test/pedoman.pdf',
        'Pedoman_Manajemen_Risiko.pdf'
      );

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThanOrEqual(3);
      expect(chunks[0]).toHaveProperty('pageNumber', 1);
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0].content).toContain('LEMBAR PENGESAHAN');
    });

    it('MinerUService: ingestChunks menyimpan potongan halaman ke tabel document_chunks', async () => {
      const pages = [
        {
          pageNumber: 1,
          content: 'BAB I: Kebijakan dan Kerangka Kerja Tata Kelola Risiko BUMN sesuai regulasi PER-2/MBU/03/2023.',
        },
        {
          pageNumber: 2,
          content: 'BAB II: Pembagian Peran Tiga Lini (Three Lines Model) dan Independensi Risk Officer.',
        },
      ];

      const inserted = await mineruService.ingestChunks(pages, {
        evidenceId: sampleEvidence.id,
      });

      expect(inserted.length).toBe(2);
      expect(inserted[0].pageNumber).toBe(1);

      // Verifikasi di database
      const dbChunks = await prisma.documentChunk.findMany({
        where: { evidenceId: sampleEvidence.id },
      });
      expect(dbChunks.length).toBe(2);
    });

    it('JinaEmbeddingService: searchRelevantChunks menemukan fragmen dokumen dengan isolasi tenant', async () => {
      const results = await jinaEmbeddingService.searchRelevantChunks(
        testTenant.id,
        'Tata Kelola Tiga Lini Kerangka Kerja',
        5
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('similarityScore');
      expect(results[0].similarityScore).toBeGreaterThan(0.5);
      expect(results[0]).toHaveProperty('pageNumber');
      expect(results[0]).toHaveProperty('sourceType', 'EVIDENCE');
    });

    it('JinaEmbeddingService: Tenant lain TIDAK DAPAT melihat chunk dokumen tenant ini', async () => {
      const results = await jinaEmbeddingService.searchRelevantChunks(
        otherTenant.id,
        'Tata Kelola Tiga Lini',
        5
      );

      expect(results.length).toBe(0);
    });
  });

  describe('2. Consultant AI Assistance Endpoints (/api/v1/consultant/*)', () => {
    it('POST /api/v1/consultant/ai-assist/:parameterCode menghasilkan rekomendasi skor & kutipan eviden', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/ai-assist/P01`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('recommendationId');
      expect(body.data).toHaveProperty('parameterCode', 'P01');
      expect(body.data).toHaveProperty('recommendedScore');
      expect(body.data.recommendedScore).toBeGreaterThanOrEqual(1);
      expect(body.data.recommendedScore).toBeLessThanOrEqual(5);
      expect(body.data).toHaveProperty('modelUsed');
      expect(body.data).toHaveProperty('criteriaDetails');
      expect(Array.isArray(body.data.criteriaDetails)).toBe(true);

      // Verifikasi rincian kriteria mengandung nomor halaman dan kutipan
      const firstCriterion = body.data.criteriaDetails[0];
      expect(firstCriterion).toHaveProperty('pageRef');
      expect(firstCriterion).toHaveProperty('quote');
      expect(firstCriterion).toHaveProperty('rationale');

      generatedRecId = body.data.recommendationId;
    });

    it('POST /api/v1/consultant/ai-assist/apply menerapkan skor AI ke lembar kerja evaluasi resmi (One-Click Apply)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/ai-assist/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          parameterCode: 'P01',
          recommendationId: generatedRecId,
          applyNotes: 'Disetujui berdasarkan telaah bukti dokumen pedoman.',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('appliedScore');
      expect(body.data.evaluationsCount).toBeGreaterThan(0);

      // Verifikasi di database bahwa CriterionEvaluation telah terisi
      const evaluations = await prisma.criterionEvaluation.findMany({
        where: {
          tenantId: testTenant.id,
          periodId: assessmentPeriod.id,
        },
      });
      expect(evaluations.length).toBeGreaterThan(0);

      // Verifikasi status isApplied pada AiAssessmentRecommendation
      const rec = await prisma.aiAssessmentRecommendation.findUnique({
        where: { id: generatedRecId },
      });
      expect(rec?.isApplied).toBe(true);
    });

    it('POST /api/v1/consultant/supplementary-documents/:id/ai-analyze menjalankan analisis cerdas custom prompt', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/consultant/supplementary-documents/${sampleSupplementaryDoc.id}/ai-analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${consultantToken}`,
          },
          body: JSON.stringify({
            customPrompt: 'Evaluasi apakah tindak lanjut temuan audit komite komisaris telah memitigasi risiko integritas data.',
          }),
        }
      );

      const body = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('aiGeneratedAnalysis');
      expect(body.data).toHaveProperty('pageReferences');
      expect(body.data).toHaveProperty('isPrivateToAssessor', true);

      analysisResultId = body.data.id;
    });

    it('PUT /api/v1/consultant/supplementary-documents/analysis-result/:id memperbarui catatan privat asesor', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/consultant/supplementary-documents/analysis-result/${analysisResultId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${consultantToken}`,
          },
          body: JSON.stringify({
            assessorNotes: 'Catatan internal: Penjelasan manajemen memadai, tidak perlu dilakukan penalti skor.',
            isPrivateToAssessor: true,
          }),
        }
      );

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.assessorNotes).toContain('Penjelasan manajemen memadai');
    });

    it('GET /api/v1/consultant/supplementary-documents/:id/analysis-result membaca catatan analisis privat', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/consultant/supplementary-documents/${sampleSupplementaryDoc.id}/analysis-result`,
        {
          headers: {
            Cookie: `access_token=${consultantToken}`,
          },
        }
      );

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].assessorNotes).toContain('Penjelasan manajemen memadai');
    });
  });

  describe('3. Strict Confidentiality & Multi-Tenant RBAC Guard', () => {
    it('INVARIAN KERAHASIAAN: Tim Counterpart TIDAK BISA mengakses catatan analisis privat asesor', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/consultant/supplementary-documents/${sampleSupplementaryDoc.id}/analysis-result`,
        {
          headers: {
            Cookie: `access_token=${counterpartToken}`,
          },
        }
      );

      const body = (await res.json()) as any;
      // Peran Counterpart ditolak mengakses endpoint konsultan
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('Konsultan TANPA penugasan (Assignment) DITOLAK mengakses AI Assist (403 CONSULTANT_NOT_ASSIGNED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/ai-assist/P01`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${unassignedConsultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONSULTANT_NOT_ASSIGNED');
    });
  });
});
