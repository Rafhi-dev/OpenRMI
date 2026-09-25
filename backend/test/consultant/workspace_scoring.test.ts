import http from 'http';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { UserRole, AssessmentStatus, IndustryCluster, RecommendationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Phase 6: Consultant Evaluation Workspace, Performance & 2x2 Priority Matrix', () => {
  let server: http.Server;
  let baseUrl: string;
  let testVendor: any;
  let testTenant: any;
  let consultantUser: any;
  let unassignedUser: any;
  let counterpartUser: any;
  let consultantToken: string;
  let unassignedToken: string;
  let counterpartToken: string;
  let assessmentPeriod: any;
  let sampleParameter: any;
  let createdRecommendationId: number;

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
        name: 'PT Asesmen Solusi Finansial',
        code: `VEND-TEST-F6-${Date.now()}`,
        email: `vendor-f6-${Date.now()}@example.com`,
        maxTenants: 10,
      },
    });

    // 2. Buat Tenant Uji
    testTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Bio Farma Persero',
        code: `BIO-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    // 3. Buat Akun Pengguna
    const passwordHash = await bcrypt.hash('Consultant@123', 10);

    consultantUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: 'Dr. Hendra Wijaya (Lead Assessor)',
        username: `assessor_f6_${Date.now()}`,
        email: `assessor_f6_${Date.now()}@konsultan.com`,
        passwordHash,
      },
    });

    unassignedUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: 'Bambang Pamungkas (Unassigned)',
        username: `unassigned_f6_${Date.now()}`,
        email: `unassigned_f6_${Date.now()}@konsultan.com`,
        passwordHash,
      },
    });

    counterpartUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Dewi Lestari (Counterpart)',
        username: `cp_f6_${Date.now()}`,
        email: `cp_f6_${Date.now()}@biofarma.co.id`,
        passwordHash,
      },
    });

    const jwtSecret = process.env.JWT_SECRET || 'openrmi_jwt_secret_test_2026';
    consultantToken = jwt.sign(
      { userId: consultantUser.id, role: consultantUser.role, vendorId: testVendor.id, tenantId: null },
      jwtSecret,
      { expiresIn: '1h' }
    );

    unassignedToken = jwt.sign(
      { userId: unassignedUser.id, role: unassignedUser.role, vendorId: testVendor.id, tenantId: null },
      jwtSecret,
      { expiresIn: '1h' }
    );

    counterpartToken = jwt.sign(
      { userId: counterpartUser.id, role: counterpartUser.role, vendorId: null, tenantId: testTenant.id },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 4. Buat Assessment Period dengan skor aspek dimensi awal 3.40 (memenuhi gating clause >= 3.00)
    assessmentPeriod = await prisma.assessmentPeriod.create({
      data: {
        tenantId: testTenant.id,
        year: 2024,
        status: AssessmentStatus.SCORING_STAGE,
        modelCluster: IndustryCluster.UMUM,
        aspectDimScore: 3.4,
      },
    });

    // 5. Buat Consultant Assignment aktif
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

    // 6. Ambil Parameter P01 beserta kriteria
    sampleParameter = await prisma.parameter.findUnique({
      where: { code: 'P01' },
      include: {
        criteria: {
          orderBy: { level: 'asc' },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      if (assessmentPeriod) {
        await prisma.recommendation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.performanceEvaluation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.criterionEvaluation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.consultantAssignment.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.assessmentPeriod.deleteMany({
          where: { tenantId: testTenant.id },
        });
      }
      await prisma.user.deleteMany({
        where: {
          id: { in: [consultantUser?.id, unassignedUser?.id, counterpartUser?.id].filter(Boolean) },
        },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [testTenant?.id].filter(Boolean) } },
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

  describe('1. Parameter Matrix & Split-Screen Evaluation (Kolom J-L)', () => {
    it('GET /api/v1/consultant/evaluations/matrix mengembalikan matriks 5 dimensi & 42 parameter', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/evaluations/matrix?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${consultantToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('period');
      expect(body.data).toHaveProperty('summary');
      expect(body.data).toHaveProperty('dimensions');
      expect(body.data.dimensions.length).toBe(5);
    });

    it('GET /api/v1/consultant/evaluations/parameter/P01 mengembalikan detail parameter dan 5 kriteria', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/consultant/evaluations/parameter/P01?periodId=${assessmentPeriod.id}`,
        {
          headers: {
            Cookie: `access_token=${consultantToken}`,
          },
        }
      );

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.parameter.code).toBe('P01');
      expect(Array.isArray(body.data.criteria)).toBe(true);
      expect(body.data.criteria.length).toBe(sampleParameter.criteria.length);
    });

    it('PUT /api/v1/consultant/evaluations berhasil menyimpan skor kriteria, catatan reviu (Kolom J) & screenshot (Kolom L)', async () => {
      const firstCriterion = sampleParameter.criteria[0];

      const res = await fetch(`${baseUrl}/api/v1/consultant/evaluations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          criterionId: firstCriterion.id,
          score: 4,
          reviewNotes: 'Pedoman manajemen risiko telah disahkan Direksi dan Dewan Komisaris (Kolom J).',
          findingsGap: 'Belum dilakukan pengujian kepatuhan berkala.',
          interviewNotes: 'Dikonfirmasi saat wawancara dengan Kepala Divisi ERM (Kolom K).',
          screenshotUrl: 'https://s3.ap-southeast-1.amazonaws.com/openrmi/screenshot_pedoman_p01.png',
          assessorNotes: 'Catatan internal konsultan: Perlu dicocokkan dengan laporan audit tahun lalu.',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.score).toBe(4);
      expect(body.data.reviewNotes).toContain('Pedoman manajemen risiko');
      expect(body.data.screenshotUrl).toContain('screenshot_pedoman_p01.png');
      expect(body.data.assessorNotes).toContain('Catatan internal konsultan');
    });

    it('POST /api/v1/consultant/evaluations/batch berhasil menyimpan batch evaluasi kriteria & menerapkan Weakest-Link', async () => {
      // Simpan seluruh kriteria untuk P01: satu kriteria bernilai 2, sisanya bernilai 4
      // Weakest-Link Rule mengharuskan skor parameter menjadi min(2, 4, 4, ...) = 2
      const batchPayload = sampleParameter.criteria.map((c: any, idx: number) => ({
        criterionId: c.id,
        score: idx === 1 ? 2 : 4,
        reviewNotes: `Reviu kriteria level ${c.level}`,
        findingsGap: idx === 1 ? 'Kelemahan implementasi' : null,
      }));

      const res = await fetch(`${baseUrl}/api/v1/consultant/evaluations/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          evaluations: batchPayload,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.totalSaved).toBe(sampleParameter.criteria.length);

      // Verifikasi skor parameter P01 sekarang adalah 2 (Kaidah Kriteria Terlemah / Weakest-Link Rule)
      const paramCheck = await fetch(
        `${baseUrl}/api/v1/consultant/evaluations/parameter/P01?periodId=${assessmentPeriod.id}`,
        {
          headers: { Cookie: `access_token=${consultantToken}` },
        }
      );
      const paramBody = (await paramCheck.json()) as any;
      expect(paramBody.data.parameter.isComplete).toBe(true);
      expect(paramBody.data.parameter.currentScore).toBe(2);
    });
  });

  describe('2. Performance Evaluation & Gating Clause Calculation', () => {
    it('Klausul Gating: Penyesuaian Kinerja TIDAK DIHITUNG jika Skor Aspek Dimensi < 3.00', async () => {
      // Saat ini aspekDimScore = 2.00 (< 3.00) akibat Weakest-Link P01 = 2
      const res = await fetch(`${baseUrl}/api/v1/consultant/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          finalRating: 'AAA',
          kpmrScore: 92.5,
          compositeRating: 1,
          spiReviewNotes: 'Tata kelola prima namun aspek dimensi di bawah threshold 3.00.',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.calculation.isEligible).toBe(false);
      expect(body.data.calculation.scoreAdjustment).toBe(0.0);
      expect(body.data.calculation.finalRmiScore).toBe(2.0);
    });

    it('POST /api/v1/consultant/performance menghitung penyesuaian kinerja saat Aspek Dimensi >= 3.00 (Prima: AAA & Komposit 1 -> Penalti 0.00)', async () => {
      // Set aspectDimScore menjadi 3.40 untuk memenuhi klausul ambang batas
      await prisma.assessmentPeriod.update({
        where: { id: assessmentPeriod.id },
        data: { aspectDimScore: 3.40 },
      });

      const res = await fetch(`${baseUrl}/api/v1/consultant/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          finalRating: 'AAA',
          kpmrScore: 92.5,
          compositeRating: 1,
          spiReviewNotes: 'Hasil audit independen menunjukkan tata kelola risiko beroperasi efektif.',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.calculation.isEligible).toBe(true);
      expect(body.data.calculation.combinedPerformanceScore).toBe(100);
      expect(body.data.calculation.scoreAdjustment).toBe(0.0);
      expect(body.data.calculation.finalRmiScore).toBe(3.4);
      expect(body.data.calculation.maturityPhase).toBe('Baik');
    });

    it('POST /api/v1/consultant/performance menerapkan penalti kinerja jika rating moderat (BBB=75 & Komposit 3=60 -> Score 68 -> Penalti -0.50)', async () => {
      // Pastikan aspectDimScore = 3.40
      await prisma.assessmentPeriod.update({
        where: { id: assessmentPeriod.id },
        data: { aspectDimScore: 3.40 },
      });

      const res = await fetch(`${baseUrl}/api/v1/consultant/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          finalRating: 'BBB',
          kpmrScore: 68.0,
          compositeRating: 3,
          spiReviewNotes: 'Terdapat beberapa catatan reviu SPI terkait mitigasi risiko operasional.',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.calculation.isEligible).toBe(true);
      expect(body.data.calculation.combinedPerformanceScore).toBe(68);
      expect(body.data.calculation.scoreAdjustment).toBe(-0.5);
      // Aspek Dimensi 3.40 + (-0.50) = 2.90
      expect(body.data.calculation.finalRmiScore).toBe(2.9);
      expect(body.data.calculation.maturityPhase).toBe('Berkembang (+)');
    });
  });

  describe('3. Recommendations 2x2 Priority Matrix (Impact vs Ease)', () => {
    it('POST /api/v1/consultant/recommendations berhasil membuat rekomendasi Kuadran 1 (Quick Win)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          parameterCode: 'P01',
          recommendation: 'Penyempurnaan Risk Appetite Statement pada Rencana Kerja Anggaran Perusahaan (RKAP)',
          targetDate: '2024-11-30',
          mainActivities: 'Workshop penyelarasan selera risiko dengan indikator KPI Direksi',
          expectedOutput: 'Lampiran RAS pada dokumen RKAP 2025',
          successIndicator: 'Disetujui Dewan Komisaris',
          unitInCharge: 'Divisi Perencanaan Strategis & Divisi Manajemen Risiko',
          priorityQuadrant: 1, // Quick Win
          horizon: 'SHORT_TERM',
          status: RecommendationStatus.BD,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.priorityQuadrant).toBe(1);
      expect(body.data.horizon).toBe('SHORT_TERM');

      createdRecommendationId = body.data.id;
    });

    it('POST /api/v1/consultant/recommendations berhasil membuat rekomendasi Kuadran 2 (Inisiatif Strategis Jangka Panjang)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          parameterCode: 'P01',
          recommendation: 'Implementasi Platform Enterprise Governance, Risk and Compliance (e-GRC) Terintegrasi',
          targetDate: '2025-11-30',
          mainActivities: 'Pengadaan software, kustomisasi modul, dan integrasi dengan Core ERP',
          expectedOutput: 'Sistem e-GRC live dan diadopsi seluruh unit bisnis',
          successIndicator: '100% register risiko terisi secara real-time di sistem',
          unitInCharge: 'Divisi Teknologi Informasi & Divisi Manajemen Risiko',
          priorityQuadrant: 2, // Strategis / High Impact Difficult
          horizon: 'LONG_TERM',
          status: RecommendationStatus.BD,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.priorityQuadrant).toBe(2);
      expect(body.data.horizon).toBe('LONG_TERM');
    });

    it('GET /api/v1/consultant/recommendations mengembalikan pengelompokan Matriks Prioritas 2x2', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/recommendations?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${consultantToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('priorityMatrix');
      expect(body.data.priorityMatrix.quadrant1.count).toBeGreaterThanOrEqual(1);
      expect(body.data.priorityMatrix.quadrant2.count).toBeGreaterThanOrEqual(1);
      expect(body.data).toHaveProperty('statusSummary');
    });

    it('PUT /api/v1/consultant/recommendations/:id memperbarui rekomendasi', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/recommendations/${createdRecommendationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${consultantToken}`,
        },
        body: JSON.stringify({
          recommendation: 'Penyempurnaan Risk Appetite Statement pada RKAP (Revisi Tahap II)',
          status: RecommendationStatus.BS,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.recommendation).toContain('Revisi Tahap II');
      expect(body.data.status).toBe(RecommendationStatus.BS);
    });

    it('DELETE /api/v1/consultant/recommendations/:id berhasil menghapus rekomendasi', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/recommendations/${createdRecommendationId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `access_token=${consultantToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('4. Strict RBAC Guard & Authorization Invariants', () => {
    it('Tim Counterpart DITOLAK memanipulasi evaluasi skor (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/evaluations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          criterionId: sampleParameter.criteria[0].id,
          score: 5,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('Konsultan TANPA penugasan DITOLAK mengubah data evaluasi (403 CONSULTANT_NOT_ASSIGNED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/consultant/evaluations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${unassignedToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          criterionId: sampleParameter.criteria[0].id,
          score: 5,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONSULTANT_NOT_ASSIGNED');
    });
  });
});
