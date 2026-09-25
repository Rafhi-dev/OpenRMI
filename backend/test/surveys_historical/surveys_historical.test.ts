import http from 'http';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { UserRole, AssessmentStatus, IndustryCluster } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Phase 7: Historical Assessment YoY Baseline & Risk Culture Public Survey', () => {
  let server: http.Server;
  let baseUrl: string;
  let testVendor: any;
  let testTenant: any;
  let consultantUser: any;
  let counterpartUser: any;
  let vendorUser: any;
  let consultantToken: string;
  let counterpartToken: string;
  let vendorToken: string;
  let assessmentPeriod: any;
  let sampleD1Parameter: any;
  let surveyPublicToken: string;

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
        name: 'PT Asesmen Risiko Nasional',
        code: `VEND-TEST-F7-${Date.now()}`,
        email: `vendor-f7-${Date.now()}@example.com`,
        maxTenants: 10,
      },
    });

    // 2. Buat Tenant Uji
    testTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Pertamina Trans Kontinental',
        code: `PTK-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    // 3. Buat Akun Pengguna
    const passwordHash = await bcrypt.hash('SecretPass@123', 10);

    consultantUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: 'Budi Santoso, CRMO (Lead Assessor)',
        username: `assessor_f7_${Date.now()}`,
        email: `assessor_f7_${Date.now()}@konsultan.com`,
        passwordHash,
      },
    });

    counterpartUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Siti Rahma (VP Manajemen Risiko PTK)',
        username: `counterpart_f7_${Date.now()}`,
        email: `counterpart_f7_${Date.now()}@ptk.co.id`,
        passwordHash,
      },
    });

    vendorUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.VENDOR,
        fullName: 'Direktur Lembaga Asesmen',
        username: `vendor_admin_f7_${Date.now()}`,
        email: `vendor_f7_${Date.now()}@lembaga.com`,
        passwordHash,
      },
    });

    const jwtSecret = process.env.JWT_SECRET || 'openrmi_jwt_secret_key_2026';

    consultantToken = jwt.sign(
      {
        userId: consultantUser.id,
        role: consultantUser.role,
        vendorId: consultantUser.vendorId,
        tenantId: null,
      },
      jwtSecret,
      { expiresIn: '2h' }
    );

    counterpartToken = jwt.sign(
      {
        userId: counterpartUser.id,
        role: counterpartUser.role,
        vendorId: null,
        tenantId: counterpartUser.tenantId,
      },
      jwtSecret,
      { expiresIn: '2h' }
    );

    vendorToken = jwt.sign(
      {
        userId: vendorUser.id,
        role: vendorUser.role,
        vendorId: vendorUser.vendorId,
        tenantId: null,
      },
      jwtSecret,
      { expiresIn: '2h' }
    );

    // 4. Buat Assessment Period
    assessmentPeriod = await prisma.assessmentPeriod.create({
      data: {
        tenantId: testTenant.id,
        year: 2024,
        status: AssessmentStatus.SCORING_STAGE,
        aspectDimScore: 3.50,
        perfScore: 85.00,
        finalRmiScore: 3.50,
        maturityPhase: 'Berkembang (+)',
      },
    });

    // 5. Tugaskan Konsultan
    await prisma.consultantAssignment.create({
      data: {
        tenantId: testTenant.id,
        periodId: assessmentPeriod.id,
        consultantId: consultantUser.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    // 6. Buat sample evaluasi untuk D1 (agar perception gap dapat dihitung)
    const d1Param = await prisma.parameter.findFirst({
      where: {
        subDimension: {
          dimension: {
            code: 'D1',
          },
        },
      },
      include: {
        criteria: true,
      },
    });

    sampleD1Parameter = d1Param;

    if (sampleD1Parameter && sampleD1Parameter.criteria.length > 0) {
      for (const crit of sampleD1Parameter.criteria) {
        await prisma.criterionEvaluation.upsert({
          where: {
            tenantId_periodId_criterionId: {
              tenantId: testTenant.id,
              periodId: assessmentPeriod.id,
              criterionId: crit.id,
            },
          },
          update: { score: 3 },
          create: {
            tenantId: testTenant.id,
            periodId: assessmentPeriod.id,
            criterionId: crit.id,
            score: 3,
            reviewNotes: 'Pemenuhan bukti level 3',
          },
        });
      }
    }
  });

  afterAll(async () => {
    // Cleanup data
    if (assessmentPeriod) {
      await prisma.surveyResponse.deleteMany({
        where: { survey: { periodId: assessmentPeriod.id } },
      });
      await prisma.riskCultureSurvey.deleteMany({
        where: { periodId: assessmentPeriod.id },
      });
      await prisma.historicalAssessment.deleteMany({
        where: { periodId: assessmentPeriod.id },
      });
      await prisma.criterionEvaluation.deleteMany({
        where: { periodId: assessmentPeriod.id },
      });
      await prisma.consultantAssignment.deleteMany({
        where: { periodId: assessmentPeriod.id },
      });
      await prisma.assessmentPeriod.delete({
        where: { id: assessmentPeriod.id },
      });
    }

    if (consultantUser) await prisma.user.delete({ where: { id: consultantUser.id } });
    if (counterpartUser) await prisma.user.delete({ where: { id: counterpartUser.id } });
    if (vendorUser) await prisma.user.delete({ where: { id: vendorUser.id } });
    if (testTenant) await prisma.tenant.delete({ where: { id: testTenant.id } });
    if (testVendor) await prisma.vendor.delete({ where: { id: testVendor.id } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // -------------------------------------------------------------
  // SUITE 1: Baseline Skor Historis & Komparasi Capaian YoY
  // -------------------------------------------------------------
  describe('1. Baseline Skor Historis & Komparasi Capaian YoY', () => {
    it('Konsultan Eksternal berhasil menginput baseline skor tahun sebelumnya', async () => {
      const payload = {
        periodId: assessmentPeriod.id,
        previousYear: 2023,
        dimensionScores: {
          D1: 2.80,
          D2: 3.10,
          D3: 2.50,
          D4: 3.00,
          D5: 2.60,
        },
        aspectDimScore: 2.80,
        perfScore: 80.00,
        finalRmiScore: 2.80,
        maturityPhase: 'Berkembang',
        notes: 'Hasil asesmen RMI independen tahun buku 2023',
      };

      const res = await fetch(`${baseUrl}/api/v1/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultantToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.previousYear).toBe(2023);
      expect(json.data.inputtedByRole).toBe(UserRole.EXTERNAL_CONSULTANT);
      expect(Number(json.data.finalRmiScore)).toBe(2.80);
    });

    it('Tim Counterpart memiliki hak setara untuk memperbarui baseline historis', async () => {
      const payload = {
        periodId: assessmentPeriod.id,
        previousYear: 2023,
        dimensionScores: {
          D1: 3.00,
          D2: 3.10,
          D3: 2.50,
          D4: 3.00,
          D5: 2.90,
        },
        aspectDimScore: 2.90,
        finalRmiScore: 2.90,
        maturityPhase: 'Berkembang (+)',
        notes: 'Koreksi resmi data historis oleh Tim Counterpart PTK',
      };

      const res = await fetch(`${baseUrl}/api/v1/historical`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counterpartToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.inputtedByRole).toBe(UserRole.COUNTERPART_TEAM);
      expect(Number(json.data.finalRmiScore)).toBe(2.90);
    });

    it('Role Vendor dilarang memutasi data baseline historis (Read-Only)', async () => {
      const payload = {
        periodId: assessmentPeriod.id,
        previousYear: 2023,
        dimensionScores: { D1: 3, D2: 3, D3: 3, D4: 3, D5: 3 },
      };

      const res = await fetch(`${baseUrl}/api/v1/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(403);
    });

    it('Ambil data komparasi YoY berhasil menghitung delta dan tren pertumbuhan', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/historical/comparison?periodId=${assessmentPeriod.id}`,
        {
          headers: {
            Authorization: `Bearer ${consultantToken}`,
          },
        }
      );

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.yoyComparison).toBeDefined();
      expect(json.data.yoyComparison.previousYear).toBe(2023);
      expect(json.data.yoyComparison.currentYear).toBe(2024);

      // Cek delta skor akhir RMI (3.50 saat ini - 2.90 sebelumnya = +0.60)
      const overall = json.data.yoyComparison.overallRmi;
      expect(overall.current).toBe(3.50);
      expect(overall.previous).toBe(2.90);
      expect(overall.delta).toBe(0.60);
      expect(overall.trend).toBe('INCREASE');

      // Vendor juga dapat mengakses komparasi YoY (Read-Only)
      const vendorRes = await fetch(
        `${baseUrl}/api/v1/historical/comparison?periodId=${assessmentPeriod.id}`,
        {
          headers: {
            Authorization: `Bearer ${vendorToken}`,
          },
        }
      );
      expect(vendorRes.status).toBe(200);
    });
  });

  // -------------------------------------------------------------
  // SUITE 2: Survei Budaya Risiko (Risk Culture Survey)
  // -------------------------------------------------------------
  describe('2. Survei Budaya Risiko Publik & Pengisian Anonim', () => {
    it('Inisiasi survei budaya risiko berhasil menghasilkan publicToken dan URL', async () => {
      const res = await fetch(`${baseUrl}/api/v1/surveys/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          isActive: true,
        }),
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.publicToken).toBeDefined();
      expect(json.data.isActive).toBe(true);
      expect(json.data.publicUrl).toContain(json.data.publicToken);
      expect(json.data.questionsCount).toBe(5);

      surveyPublicToken = json.data.publicToken;
    });

    it('Mendapatkan status survei budaya risiko internal', async () => {
      const res = await fetch(`${baseUrl}/api/v1/surveys/status?periodId=${assessmentPeriod.id}`, {
        headers: {
          Authorization: `Bearer ${counterpartToken}`,
        },
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isInitiated).toBe(true);
      expect(json.data.survey.totalResponses).toBe(0);
    });

    it('Endpoint publik mengambil pertanyaan kuesioner tanpa login (Anonymous)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/public/surveys/${surveyPublicToken}`);

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.companyName).toBe(testTenant.name);
      expect(json.data.assessmentYear).toBe(2024);
      expect(Array.isArray(json.data.questions)).toBe(true);
      expect(json.data.questions.length).toBe(5);
      expect(json.data.questions[0].category).toBe('TONE_FROM_TOP');
    });

    it('Responden anonim mengirimkan jawaban kuesioner (Likert 1-5)', async () => {
      const submission1 = {
        division: 'Operasi Perkapalan',
        jobLevel: 'Supervisor',
        tenureYears: 4,
        answers: [4, 5, 5, 4, 4], // Rata-rata = 4.40
      };

      const res1 = await fetch(`${baseUrl}/api/v1/public/surveys/${surveyPublicToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission1),
      });

      const json1 = (await res1.json()) as any;
      expect(res1.status).toBe(201);
      expect(json1.success).toBe(true);
      expect(json1.message).toContain('Terima kasih');

      // Responden kedua dengan skor lebih tinggi
      const submission2 = {
        division: 'Keuangan & SDM',
        jobLevel: 'Manajer',
        tenureYears: 8,
        answers: [5, 5, 4, 5, 4], // Rata-rata = 4.60
      };

      const res2 = await fetch(`${baseUrl}/api/v1/public/surveys/${surveyPublicToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission2),
      });
      expect(res2.status).toBe(201);

      // Cek status survei teragregasi
      const statusRes = await fetch(
        `${baseUrl}/api/v1/surveys/status?periodId=${assessmentPeriod.id}`,
        {
          headers: { Authorization: `Bearer ${consultantToken}` },
        }
      );
      const statusJson = (await statusRes.json()) as any;
      expect(statusJson.data.survey.totalResponses).toBe(2);
      expect(Number(statusJson.data.survey.averageScore)).toBe(4.50);
      expect(statusJson.data.survey.categoryScores).toBeDefined();
      expect(statusJson.data.survey.categoryScores['TONE_FROM_TOP']).toBe(4.50);
    });

    it('Jawaban dengan nilai Likert di luar rentang 1-5 ditolak', async () => {
      const invalidSubmission = {
        answers: [6, 0, 3, 4, 2], // 6 dan 0 tidak valid
      };

      const res = await fetch(`${baseUrl}/api/v1/public/surveys/${surveyPublicToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidSubmission),
      });

      expect(res.status).toBe(400);
    });

    it('Toggle status survei ke nonaktif mencegah pengisian baru', async () => {
      // Tutup survei
      const toggleRes = await fetch(`${baseUrl}/api/v1/surveys/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          isActive: false,
        }),
      });
      expect(toggleRes.status).toBe(200);

      // Coba akses publik setelah ditutup -> ditolak
      const publicRes = await fetch(`${baseUrl}/api/v1/public/surveys/${surveyPublicToken}`);
      expect(publicRes.status).toBe(400);

      // Buka kembali survei
      await fetch(`${baseUrl}/api/v1/surveys/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          isActive: true,
        }),
      });
    });
  });

  // -------------------------------------------------------------
  // SUITE 3: Analisis Kesenjangan Persepsi (Perception Gap Analysis)
  // -------------------------------------------------------------
  describe('3. Analisis Kesenjangan Persepsi (Perception Gap Analysis)', () => {
    it('Menghitung gap persepsi karyawan (Survei 4.50) vs Asesor (D1 = 3.00)', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/surveys/perception-gap?periodId=${assessmentPeriod.id}`,
        {
          headers: {
            Authorization: `Bearer ${consultantToken}`,
          },
        }
      );

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const comp = json.data.comparison;
      expect(comp.employeeSurveyScore).toBe(4.50);
      expect(comp.assessorD1Score).toBe(3.00);

      // Delta: 4.50 - 3.00 = +1.50
      expect(comp.delta).toBe(1.50);
      // Karena delta > 0.50, kategori harus OVERCONFIDENT
      expect(comp.gapCategory).toBe('OVERCONFIDENT');
      expect(comp.gapCategoryLabel).toContain('Overconfident');
      expect(comp.interpretation).toContain('re-kalibrasi pemahaman risiko');
    });

    it('Tim Counterpart dan Vendor dapat mengakses analisis gap persepsi (Read-Only)', async () => {
      const counterpartRes = await fetch(
        `${baseUrl}/api/v1/surveys/perception-gap?periodId=${assessmentPeriod.id}`,
        {
          headers: {
            Authorization: `Bearer ${counterpartToken}`,
          },
        }
      );
      expect(counterpartRes.status).toBe(200);

      const vendorRes = await fetch(
        `${baseUrl}/api/v1/surveys/perception-gap?periodId=${assessmentPeriod.id}`,
        {
          headers: {
            Authorization: `Bearer ${vendorToken}`,
          },
        }
      );
      expect(vendorRes.status).toBe(200);
    });
  });
});
