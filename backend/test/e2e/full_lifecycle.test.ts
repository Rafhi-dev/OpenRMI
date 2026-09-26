import http from 'http';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { UserRole, AssessmentStatus, IndustryCluster, RecommendationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../../src/modules/auth/auth.jwt';

describe('Phase 9: Comprehensive End-to-End Enterprise Risk Maturity Lifecycle', () => {
  let server: http.Server;
  let baseUrl: string;

  let adminToken: string;
  let vendorToken: string;
  let consultantToken: string;
  let counterpartToken: string;

  let vendorId: string;
  let tenantId: string;
  let periodId: string;
  let consultantUserId: string;
  let counterpartUserId: string;
  let publicSurveyToken: string;

  beforeAll(async () => {
    // 0. Start test HTTP server
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    // 1. Setup Master Super Admin
    const adminEmail = `e2e_admin_${Date.now()}@openrmi.internal`;
    const adminUser = await prisma.user.create({
      data: {
        username: `e2e_admin_${Date.now()}`,
        email: adminEmail,
        passwordHash: await bcrypt.hash('AdminPassword123!', 10),
        fullName: 'E2E Super Administrator',
        role: UserRole.ADMINISTRATOR,
        isActive: true,
      },
    });

    adminToken = signAccessToken({
      userId: adminUser.id,
      role: adminUser.role,
      email: adminUser.email,
      username: adminUser.username,
      vendorId: null,
      tenantId: null,
    });
  });

  afterAll(async () => {
    // Cleanup database transactions
    try {
      if (periodId) {
        await prisma.surveyResponse.deleteMany({ where: { survey: { periodId } } });
        await prisma.riskCultureSurvey.deleteMany({ where: { periodId } });
        await prisma.historicalAssessment.deleteMany({ where: { periodId } });
        await prisma.recommendation.deleteMany({ where: { periodId } });
        await prisma.criterionEvaluation.deleteMany({ where: { periodId } });
        await prisma.documentAnalysisResult.deleteMany({ where: { supplementaryDoc: { periodId } } });
        await prisma.supplementaryDocument.deleteMany({ where: { periodId } });
        await prisma.criterionEvidence.deleteMany({ where: { tenantId } });
        await prisma.consultantAssignment.deleteMany({ where: { periodId } });
        await prisma.performanceEvaluation.deleteMany({ where: { periodId } });
        await prisma.assessmentPeriod.deleteMany({ where: { id: periodId } });
      }
      if (tenantId) {
        await prisma.tenant.deleteMany({ where: { id: tenantId } });
      }
      if (vendorId) {
        await prisma.vendor.deleteMany({ where: { id: vendorId } });
      }
      await prisma.user.deleteMany({
        where: {
          email: { contains: 'e2e_' },
        },
      });
    } catch (e) {
      console.warn('E2E teardown cleanup:', e);
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Super Admin & Vendor Setup', () => {
    it('Super Admin berhasil membuat Vendor Jasa Asesmen Baru', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${adminToken}`,
        },
        body: JSON.stringify({
          name: 'PT Mitra Audit Solusindo',
          code: `MAS_${Date.now()}`,
          picName: 'Budi Santoso',
          email: `e2e_vendor_${Date.now()}@mas.co.id`,
          maxTenants: 5,
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      vendorId = json.data.id;

      // Create Vendor User & JWT
      const vendorUser = await prisma.user.create({
        data: {
          username: `e2e_vendor_user_${Date.now()}`,
          email: `e2e_vendor_user_${Date.now()}@mas.co.id`,
          passwordHash: await bcrypt.hash('VendorPassword123!', 10),
          fullName: 'PIC Vendor MAS',
          role: UserRole.VENDOR,
          vendorId,
          isActive: true,
        },
      });

      vendorToken = signAccessToken({
        userId: vendorUser.id,
        role: vendorUser.role,
        email: vendorUser.email,
        username: vendorUser.username,
        vendorId,
        tenantId: null,
      });
    });

    it('Vendor berhasil mendaftarkan Klien BUMN dan Periode Observasi', async () => {
      const tenantCode = `PEL${Date.now().toString().slice(-6)}`;
      const res = await fetch(`${baseUrl}/api/v1/vendor/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${vendorToken}`,
        },
        body: JSON.stringify({
          name: 'PT Pelabuhan Nusantara (Persero)',
          code: tenantCode,
          industryCluster: IndustryCluster.UMUM,
          initialYear: 2025,
        }),
      });

      const json = await res.json() as any;
      if (!res.ok) {
        console.error('CREATE TENANT ERROR:', res.status, JSON.stringify(json));
      }
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      tenantId = json.data.id;
      periodId = json.data.periods[0].id;

      // Create Counterpart User for this tenant
      const counterpartUser = await prisma.user.create({
        data: {
          username: `e2e_counterpart_${Date.now()}`,
          email: `e2e_counterpart_${Date.now()}@pelabuhan.co.id`,
          passwordHash: await bcrypt.hash('CounterpartPassword123!', 10),
          fullName: 'Siti Rahmawati (Risk Counterpart)',
          role: UserRole.COUNTERPART_TEAM,
          tenantId,
          isActive: true,
        },
      });
      counterpartUserId = counterpartUser.id;

      counterpartToken = signAccessToken({
        userId: counterpartUser.id,
        role: counterpartUser.role,
        email: counterpartUser.email,
        username: counterpartUser.username,
        vendorId: null,
        tenantId,
      });
    });

    it('Vendor mendaftarkan Konsultan Eksternal dan Menerbitkan Penugasan', async () => {
      const consultantEmail = `e2e_consultant_${Date.now()}@mas.co.id`;
      const res = await fetch(`${baseUrl}/api/v1/vendor/consultants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${vendorToken}`,
        },
        body: JSON.stringify({
          username: `e2e_cons_${Date.now()}`,
          email: consultantEmail,
          fullName: 'Dr. Hendra Gunawan, CRMA',
          password: 'ConsultantPassword123!',
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      consultantUserId = json.data.id;

      consultantToken = signAccessToken({
        userId: consultantUserId,
        role: UserRole.EXTERNAL_CONSULTANT,
        email: consultantEmail,
        username: json.data.username,
        vendorId,
        tenantId: null,
      });

      // Assign to Tenant & Period with valid ISO datetimes
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 86400000).toISOString();

      const assignRes = await fetch(`${baseUrl}/api/v1/vendor/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${vendorToken}`,
        },
        body: JSON.stringify({
          consultantId: consultantUserId,
          tenantId,
          periodId,
          startDate,
          endDate,
        }),
      });

      const assignJson = await assignRes.json() as any;
      if (!assignRes.ok) {
        console.error('ASSIGN ERROR:', assignRes.status, JSON.stringify(assignJson));
      }
      expect(assignRes.status).toBe(201);
      expect(assignJson.success).toBe(true);
    });
  });

  describe('2. Counterpart Team Workflow & Confidentiality Invariants', () => {
    it('Counterpart dapat mengunggah metadata bukti dokumen kriteria', async () => {
      // Find criterion id for P01 level 1
      const criterion = await prisma.criterion.findFirst({
        where: { parameter: { code: 'P01' }, level: 1 },
      });
      expect(criterion).toBeDefined();

      const res = await fetch(`${baseUrl}/api/v1/counterpart/evidences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          criterionId: criterion!.id,
          fileName: 'pedoman_2025.pdf',
          fileUrl: `https://storage.openrmi.id/tenants/${tenantId}/evidences/pedoman_2025.pdf`,
          fileSize: 2048500,
          mimeType: 'application/pdf',
          docNumber: 'SK-DIR-2025-01',
          sectionNotes: 'Bab III Pasal 5 Halaman 12',
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
    });

    it('Counterpart dapat mengunggah dokumen tambahan pasca-FGD', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/supplementary-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId,
          fileName: 'notula_fgd.pdf',
          fileUrl: `https://storage.openrmi.id/tenants/${tenantId}/supplementary/notula_fgd.pdf`,
          fileSize: 1024000,
          mimeType: 'application/pdf',
          description: 'Berita Acara dan Notula FGD Bersama Direksi',
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
    });

    it('INVARIAN KERAHASIAAN ASESOR: Dokumen Tambahan TIDAK PERNAH membocorkan assessorNotes ke Counterpart', async () => {
      // First, simulate Consultant adding a private note to supplementary document
      const supDoc = await prisma.supplementaryDocument.findFirst({ where: { periodId } });
      expect(supDoc).toBeDefined();

      await prisma.documentAnalysisResult.create({
        data: {
          supplementaryDocId: supDoc!.id,
          assessorId: consultantUserId,
          promptGiven: 'Analisis kepatuhan SOP tata kelola risiko',
          aiGeneratedAnalysis: 'SOP telah memenuhi standar ISO 31000',
          assessorNotes: 'RAHASIA ASESOR: Dokumen ini terindikasi dibuat setelah periode observasi selesai.',
          pageReferences: [2, 5],
          modelUsed: 'deepseek-flash',
          isPrivateToAssessor: true,
        },
      });

      // Now query as Counterpart
      const res = await fetch(`${baseUrl}/api/v1/counterpart/supplementary-documents?periodId=${periodId}`, {
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const json = await res.json() as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const docs = json.data;
      expect(docs.length).toBeGreaterThan(0);
      for (const doc of docs) {
        expect(doc.assessorNotes).toBeUndefined();
        expect(doc.analysisResults).toBeUndefined();
      }
    });

    it('INVARIAN MULTI-TENANT: Tenant lain DITOLAK mengakses data pemantauan tenant ini', async () => {
      // Create a foreign tenant and user
      const foreignTenant = await prisma.tenant.create({
        data: {
          vendorId,
          name: 'PT Asing Bersama (Persero)',
          code: `ASG${Date.now().toString().slice(-6)}`,
          industryCluster: IndustryCluster.UMUM,
        },
      });

      const foreignUser = await prisma.user.create({
        data: {
          username: `e2e_foreign_user_${Date.now()}`,
          email: `e2e_foreign_${Date.now()}@asing.co.id`,
          passwordHash: await bcrypt.hash('Secret123!', 10),
          fullName: 'Foreign Counterpart',
          role: UserRole.COUNTERPART_TEAM,
          tenantId: foreignTenant.id,
          isActive: true,
        },
      });

      const foreignToken = signAccessToken({
        userId: foreignUser.id,
        role: foreignUser.role,
        email: foreignUser.email,
        username: foreignUser.username,
        vendorId: null,
        tenantId: foreignTenant.id,
      });

      const res = await fetch(`${baseUrl}/api/v1/counterpart/monitoring-progress?periodId=${periodId}`, {
        headers: {
          Cookie: `access_token=${foreignToken}`,
        },
      });

      const json = await res.json() as any;
      expect(res.status).toBe(404);
      expect(json.success).toBe(false);

      // Cleanup foreign tenant
      await prisma.user.delete({ where: { id: foreignUser.id } });
      await prisma.tenant.delete({ where: { id: foreignTenant.id } });
    });
  });

  describe('3. Consultant Workspace, Scoring & Recommendations', () => {
    it('Konsultan dapat menyimpan evaluasi kriteria & menerapkan Weakest-Link', async () => {
      // Fetch criteria for P01
      const criteriaList = await prisma.criterion.findMany({
        where: { parameter: { code: 'P01' } },
        orderBy: { level: 'asc' },
      });
      expect(criteriaList.length).toBeGreaterThan(0);

      const evaluationsPayload = criteriaList.map((crit, idx) => ({
        criterionId: crit.id,
        score: idx === 0 ? 2 : 4,
        reviewNotes: 'Evaluasi dokumen P01',
      }));

      const res = await fetch(`${baseUrl}/api/v1/consultant/evaluations/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId,
          evaluations: evaluationsPayload,
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.totalSaved).toBe(evaluationsPayload.length);

      // Verifikasi Weakest-Link pada detail parameter P01 (min score = 2)
      const detailRes = await fetch(`${baseUrl}/api/v1/consultant/evaluations/parameter/P01?periodId=${periodId}`, {
        headers: {
          Cookie: `access_token=${consultantToken}`,
        },
      });
      const detailJson = await detailRes.json() as any;
      expect(detailRes.status).toBe(200);
      expect(detailJson.data.parameter.currentScore).toBe(2);
    });

    it('Konsultan menghitung penyesuaian Aspek Kinerja dengan Klausul Gating', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId,
          finalRating: 'AAA',
          kpmrScore: 85,
          compositeRating: 1, // Sangat Rendah
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.calculation.scoreAdjustment).toBe(0.0);
    });

    it('Konsultan menambahkan Rekomendasi Matriks Prioritas 2x2', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId,
          parameterCode: 'P01',
          recommendation: 'Memperbarui SOP identifikasi risiko operasional',
          targetDate: new Date('2025-12-31').toISOString(),
          mainActivities: 'Penyusunan dan sosialisasi SOP',
          expectedOutput: 'Dokumen SOP disahkan Direksi',
          successIndicator: 'SK Direksi diterbitkan',
          unitInCharge: 'Divisi Manajemen Risiko',
          priorityQuadrant: 1, // Kuadran 1
          horizon: 'SHORT_TERM',
          status: RecommendationStatus.BD,
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.priorityQuadrant).toBe(1); // Quick Win
    });
  });

  describe('4. Historical Baseline, Public Survey & Perception Gap', () => {
    it('Counterpart atau Konsultan dapat mengisi baseline historis YoY', async () => {
      const res = await fetch(`${baseUrl}/api/v1/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId,
          previousYear: 2024,
          dimensionScores: {
            D1: 2.8,
            D2: 3.1,
            D3: 2.9,
            D4: 3.0,
            D5: 2.7,
          },
          aspectDimScore: 2.9,
          perfScore: 78,
          finalRmiScore: 2.9,
          notes: 'Baseline audit RMI tahun 2024 oleh konsultan sebelumnya',
        }),
      });

      const json = await res.json() as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.previousYear).toBe(2024);
    });

    it('Inisiasi Survei Budaya Risiko Publik & Pengisian Anonim Karyawan', async () => {
      // Initiate Survey
      const initRes = await fetch(`${baseUrl}/api/v1/surveys/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId,
          isActive: true,
        }),
      });

      const initJson = await initRes.json() as any;
      expect(initRes.status).toBe(200);
      expect(initJson.success).toBe(true);
      publicSurveyToken = initJson.data.publicToken;
      expect(publicSurveyToken).toBeDefined();

      // Submit Anonymous Public Survey Response (No Bearer token!)
      const surveyRes = await fetch(`${baseUrl}/api/v1/public/surveys/${publicSurveyToken}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          division: 'DIVISI_OPERASIONAL',
          jobLevel: 'STAFF',
          tenureYears: 3,
          answers: [4, 5, 4, 4, 5],
        }),
      });

      const surveyJson = await surveyRes.json() as any;
      expect(surveyRes.status).toBe(201);
      expect(surveyJson.success).toBe(true);
    });

    it('Analisis Kesenjangan Persepsi (Perception Gap) teragregasi secara otomatis', async () => {
      const res = await fetch(`${baseUrl}/api/v1/surveys/perception-gap?periodId=${periodId}`, {
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const json = await res.json() as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.surveyStatus.totalResponses).toBeGreaterThan(0);
      expect(json.data.comparison.employeeSurveyScore).toBeDefined();
    });
  });

  describe('5. Official Reports & Document Exports', () => {
    it('Berhasil mengekspor Laporan Resmi Excel SCORE RMI.xlsx', async () => {
      const res = await fetch(`${baseUrl}/api/v1/reports/${periodId}/export-excel`, {
        headers: {
          Cookie: `access_token=${consultantToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('Berhasil mengekspor Ringkasan PDF Resmi Format 1.2.8 KBUMN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/reports/${periodId}/summary-pdf`, {
        headers: {
          Cookie: `access_token=${consultantToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
    });
  });
});
