import http from 'http';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { UserRole, AssessmentStatus, IndustryCluster, RecommendationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

describe('Phase 8: Official Assessment Reports Engine (ExcelJS & PDF Format 1.2.8)', () => {
  let server: http.Server;
  let baseUrl: string;
  let testVendor: any;
  let otherVendor: any;
  let testTenant: any;
  let otherTenant: any;
  let consultantUser: any;
  let counterpartUser: any;
  let otherCounterpartUser: any;
  let vendorUser: any;
  let consultantToken: string;
  let counterpartToken: string;
  let otherCounterpartToken: string;
  let vendorToken: string;
  let assessmentPeriod: any;

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
        name: 'PT Mitra Audit Risiko Global',
        code: `VEND-TEST-F8-${Date.now()}`,
        email: `vendor-f8-${Date.now()}@example.com`,
        maxTenants: 10,
      },
    });

    otherVendor = await prisma.vendor.create({
      data: {
        name: 'PT Vendor Lain Konsultan',
        code: `VEND-OTHER-F8-${Date.now()}`,
        email: `vendor-other-f8-${Date.now()}@example.com`,
        maxTenants: 5,
      },
    });

    // 2. Buat Tenant Uji
    testTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Pelabuhan Indonesia Persero',
        code: `PELINDO-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    otherTenant = await prisma.tenant.create({
      data: {
        vendorId: otherVendor.id,
        name: 'PT Kereta Api Indonesia Persero',
        code: `KAI-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    // 3. Buat Akun Pengguna
    const passwordHash = await bcrypt.hash('SecretPass@123', 10);

    consultantUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.EXTERNAL_CONSULTANT,
        fullName: 'Prof. Bambang Hermanto, PhD, CRMO',
        username: `assessor_f8_${Date.now()}`,
        email: `assessor_f8_${Date.now()}@konsultan.com`,
        passwordHash,
      },
    });

    counterpartUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Agus Setiawan (Kepala Divisi MR Pelindo)',
        username: `counterpart_f8_${Date.now()}`,
        email: `counterpart_f8_${Date.now()}@pelindo.co.id`,
        passwordHash,
      },
    });

    otherCounterpartUser = await prisma.user.create({
      data: {
        tenantId: otherTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Rudi Hartono (KAI Counterpart)',
        username: `other_counterpart_f8_${Date.now()}`,
        email: `other_counterpart_f8_${Date.now()}@kai.id`,
        passwordHash,
      },
    });

    vendorUser = await prisma.user.create({
      data: {
        vendorId: testVendor.id,
        role: UserRole.VENDOR,
        fullName: 'Direktur Utama PT Mitra Audit Risiko',
        username: `vendor_f8_${Date.now()}`,
        email: `vendor_dir_f8_${Date.now()}@mitra.com`,
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

    otherCounterpartToken = jwt.sign(
      {
        userId: otherCounterpartUser.id,
        role: otherCounterpartUser.role,
        vendorId: null,
        tenantId: otherCounterpartUser.tenantId,
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

    // 4. Buat Periode Asesmen Lengkap
    assessmentPeriod = await prisma.assessmentPeriod.create({
      data: {
        tenantId: testTenant.id,
        year: 2024,
        status: AssessmentStatus.SCORING_STAGE,
        aspectDimScore: 3.50,
        perfScore: 85.00,
        adjustmentScore: 0.00,
        finalRmiScore: 3.50,
        maturityPhase: 'Praktik yang Baik (+)',
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

    // 6. Buat Data Evaluasi Kinerja (Performance Evaluation)
    await prisma.performanceEvaluation.create({
      data: {
        periodId: assessmentPeriod.id,
        finalRating: 'AAA',
        kpmrScore: 85.00,
        compositeRating: 1,
        spiReviewNotes: 'Hasil audit SPI menunjukkan sistem pengendalian internal sangat memadai.',
      },
    });

    // 7. Buat Rekomendasi 2x2
    await prisma.recommendation.create({
      data: {
        periodId: assessmentPeriod.id,
        parameterCode: 'P01',
        recommendation: 'Melakukan program sertifikasi manajemen risiko untuk seluruh jajaran BoD-1',
        targetDate: new Date('2025-11-30'),
        mainActivities: 'Penyelenggaraan workshop dan uji kompetensi sertifikasi QRMO/CRMO',
        expectedOutput: '100% VP dan Manajer memiliki sertifikasi kompetensi manajemen risiko',
        successIndicator: 'Sertifikat kompetensi BNSP diterbitkan',
        unitInCharge: 'Divisi SDM & Manajemen Risiko',
        priorityQuadrant: 1,
        horizon: 'SHORT_TERM',
        status: RecommendationStatus.BD,
      },
    });

    // 8. Buat Skor Historis (Baseline)
    await prisma.historicalAssessment.create({
      data: {
        periodId: assessmentPeriod.id,
        previousYear: 2023,
        aspectDimScore: 3.00,
        finalRmiScore: 3.00,
        maturityPhase: 'Praktik yang Baik',
        dimensionScores: { D1: 3.0, D2: 3.0, D3: 3.0, D4: 3.0, D5: 3.0 },
        inputtedByRole: UserRole.EXTERNAL_CONSULTANT,
      },
    });

    // 9. Buat Survei Budaya Risiko
    await prisma.riskCultureSurvey.create({
      data: {
        periodId: assessmentPeriod.id,
        publicToken: `test_token_f8_${Date.now()}`,
        isActive: true,
        totalResponses: 15,
        averageScore: 4.20,
        categoryScores: { TONE_FROM_TOP: 4.30, ACCOUNTABILITY: 4.10 },
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (assessmentPeriod) {
      await prisma.surveyResponse.deleteMany({ where: { survey: { periodId: assessmentPeriod.id } } });
      await prisma.riskCultureSurvey.deleteMany({ where: { periodId: assessmentPeriod.id } });
      await prisma.historicalAssessment.deleteMany({ where: { periodId: assessmentPeriod.id } });
      await prisma.recommendation.deleteMany({ where: { periodId: assessmentPeriod.id } });
      await prisma.performanceEvaluation.deleteMany({ where: { periodId: assessmentPeriod.id } });
      await prisma.criterionEvaluation.deleteMany({ where: { periodId: assessmentPeriod.id } });
      await prisma.consultantAssignment.deleteMany({ where: { periodId: assessmentPeriod.id } });
      await prisma.assessmentPeriod.delete({ where: { id: assessmentPeriod.id } });
    }

    if (consultantUser) await prisma.user.delete({ where: { id: consultantUser.id } });
    if (counterpartUser) await prisma.user.delete({ where: { id: counterpartUser.id } });
    if (otherCounterpartUser) await prisma.user.delete({ where: { id: otherCounterpartUser.id } });
    if (vendorUser) await prisma.user.delete({ where: { id: vendorUser.id } });
    if (testTenant) await prisma.tenant.delete({ where: { id: testTenant.id } });
    if (otherTenant) await prisma.tenant.delete({ where: { id: otherTenant.id } });
    if (testVendor) await prisma.vendor.delete({ where: { id: testVendor.id } });
    if (otherVendor) await prisma.vendor.delete({ where: { id: otherVendor.id } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // -------------------------------------------------------------
  // SUITE 1: Tinjauan Agregat Lengkap Laporan (JSON Preview)
  // -------------------------------------------------------------
  describe('1. Full Report Data Aggregation (JSON Preview)', () => {
    it('Konsultan Eksternal berhasil mengambil seluruh agregat data laporan asesmen', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/reports/${assessmentPeriod.id}/full-report`,
        {
          headers: {
            Authorization: `Bearer ${consultantToken}`,
          },
        }
      );

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const report = json.data;
      expect(report.tenant.name).toBe(testTenant.name);
      expect(report.period.year).toBe(2024);
      expect(report.period.finalRmiScore).toBe(3.50);
      expect(report.leadConsultant.fullName).toBe(consultantUser.fullName);

      // Verifikasi 5 Dimensi hadir dalam laporan
      expect(Array.isArray(report.dimensions)).toBe(true);
      expect(report.dimensions.length).toBe(5);

      // Verifikasi Aspek Kinerja hadir
      expect(report.performance).toBeDefined();
      expect(report.performance.finalRating).toBe('AAA');
      expect(report.performance.compositeRating).toBe(1);

      // Verifikasi Rekomendasi 2x2 hadir
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(report.recommendations[0].parameterCode).toBe('P01');

      // Verifikasi data historis dan survei terkompilasi
      expect(report.historical.previousYear).toBe(2023);
      expect(report.cultureSurvey.totalResponses).toBe(15);
    });

    it('Tim Counterpart dari perusahaan lain DITOLAK mengakses laporan ini (403 FORBIDDEN)', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/reports/${assessmentPeriod.id}/full-report`,
        {
          headers: {
            Authorization: `Bearer ${otherCounterpartToken}`,
          },
        }
      );

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // SUITE 2: Ekspor Berkas Excel Resmi Kompatibel SCORE RMI.xlsx
  // -------------------------------------------------------------
  describe('2. Official Excel Report Generator (ExcelJS)', () => {
    it('Ekspor Excel mengembalikan file spreadsheet terisi penuh sesuai struktur SCORE RMI.xlsx', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/reports/${assessmentPeriod.id}/export-excel`,
        {
          headers: {
            Authorization: `Bearer ${counterpartToken}`,
          },
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.headers.get('content-disposition')).toContain('.xlsx');

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.length).toBeGreaterThan(5000);

      // Baca kembali dengan ExcelJS untuk memverifikasi 5 Sheet Resmi
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const sheetNames = workbook.worksheets.map((ws) => ws.name);
      expect(sheetNames).toContain('Ringkasan RMI');
      expect(sheetNames).toContain('Reviu Dokumen');
      expect(sheetNames).toContain('Aspek Kinerja');
      expect(sheetNames).toContain('Rekomendasi 2x2');
      expect(sheetNames).toContain('Komparasi YoY & Survei');

      // Verifikasi Sheet Ringkasan RMI
      const summarySheet = workbook.getWorksheet('Ringkasan RMI');
      expect(summarySheet).toBeDefined();
      expect(summarySheet?.getCell('B2').value).toContain('RINGKASAN HASIL PENILAIAN RISK MATURITY INDEX');
      expect(summarySheet?.getCell('C5').value).toBe(testTenant.name);

      // Verifikasi Sheet Reviu Dokumen (Memiliki minimal baris header dan data parameter)
      const reviewSheet = workbook.getWorksheet('Reviu Dokumen');
      expect(reviewSheet).toBeDefined();
      expect(reviewSheet?.getRow(1).getCell(1).value).toBe('Dimensi');
      expect(reviewSheet?.getRow(1).getCell(2).value).toBe('Kode Parameter');
      expect(reviewSheet?.rowCount).toBeGreaterThan(1);

      // Verifikasi Sheet Rekomendasi
      const recSheet = workbook.getWorksheet('Rekomendasi 2x2');
      expect(recSheet).toBeDefined();
      expect(recSheet?.getRow(2).getCell(2).value).toBe('P01');
      expect(recSheet?.getRow(2).getCell(3).value).toBe('Kuadran 1');
    });

    it('Role Vendor juga dapat mengunduh berkas Excel portofolio kliennya', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/reports/${assessmentPeriod.id}/export-excel`,
        {
          headers: {
            Authorization: `Bearer ${vendorToken}`,
          },
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });
  });

  // -------------------------------------------------------------
  // SUITE 3: Ekspor Dokumen Ringkasan Hasil Format 1.2.8 PDF
  // -------------------------------------------------------------
  describe('3. Official Summary PDF Generator (Format 1.2.8 KBUMN)', () => {
    it('Ekspor Ringkasan PDF mengembalikan dokumen PDF resmi berstandar KBUMN', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/reports/${assessmentPeriod.id}/summary-pdf`,
        {
          headers: {
            Authorization: `Bearer ${consultantToken}`,
          },
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toContain('.pdf');

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.length).toBeGreaterThan(1000);

      // Verifikasi Magic Bytes PDF (%PDF-)
      const magicBytes = buffer.subarray(0, 5).toString('ascii');
      expect(magicBytes).toBe('%PDF-');
    });

    it('Request tanpa autentikasi ditolak (401 UNAUTHORIZED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/reports/${assessmentPeriod.id}/summary-pdf`);
      expect(res.status).toBe(401);
    });
  });
});
