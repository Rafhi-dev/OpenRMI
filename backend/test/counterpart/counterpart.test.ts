import http from 'http';
import app from '../../src/server';
import { prisma } from '../../src/config/database';
import { UserRole, AssessmentStatus, IndustryCluster, RecommendationStatus, SupplementaryCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Phase 4: Counterpart Team Portal Module & Evidence Invariants', () => {
  let server: http.Server;
  let baseUrl: string;
  let testVendor: any;
  let testTenant: any;
  let counterpartUser: any;
  let anotherTenantUser: any;
  let counterpartToken: string;
  let anotherTenantToken: string;
  let assessmentPeriod: any;
  let sampleCriterion: any;
  let createdEvidenceId: string;
  let createdSupplementaryId: string;
  let sampleRecommendation: any;

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
        name: 'PT Asesmen Risiko Nusantara',
        code: `VEND-TEST-CP-${Date.now()}`,
        email: `vendor-cp-${Date.now()}@example.com`,
        maxTenants: 10,
      },
    });

    // 2. Buat Tenant Uji Utama
    testTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Energi Mandiri Persero',
        code: `EM-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    // 3. Buat Tenant Lain (untuk pengujian isolasi RLS tenant)
    const otherTenant = await prisma.tenant.create({
      data: {
        vendorId: testVendor.id,
        name: 'PT Logistik Sejahtera Persero',
        code: `LS-${Date.now()}`,
        industryCluster: IndustryCluster.UMUM,
      },
    });

    // 4. Buat Akun Counterpart Utama
    const passwordHash = await bcrypt.hash('Counterpart@123', 10);
    counterpartUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Bambang Sudirman (Counterpart)',
        username: `cp_${Date.now()}`,
        email: `counterpart_${Date.now()}@energi.co.id`,
        passwordHash,
      },
    });

    // 5. Buat Akun Counterpart Tenant Lain
    anotherTenantUser = await prisma.user.create({
      data: {
        tenantId: otherTenant.id,
        role: UserRole.COUNTERPART_TEAM,
        fullName: 'Siti Rahmawati (Other CP)',
        username: `other_cp_${Date.now()}`,
        email: `other_${Date.now()}@logistik.co.id`,
        passwordHash,
      },
    });

    // Generate JWT Tokens
    const jwtSecret = process.env.JWT_SECRET || 'openrmi_jwt_secret_test_2026';
    counterpartToken = jwt.sign(
      {
        userId: counterpartUser.id,
        role: counterpartUser.role,
        tenantId: testTenant.id,
        vendorId: null,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    anotherTenantToken = jwt.sign(
      {
        userId: anotherTenantUser.id,
        role: anotherTenantUser.role,
        tenantId: otherTenant.id,
        vendorId: null,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 6. Buat Assessment Period
    assessmentPeriod = await prisma.assessmentPeriod.create({
      data: {
        tenantId: testTenant.id,
        year: 2024,
        status: AssessmentStatus.EVIDENCE_GATHERING,
        modelCluster: IndustryCluster.UMUM,
      },
    });

    // 7. Ambil 1 kriteria sampel dari master data
    sampleCriterion = await prisma.criterion.findFirst({
      include: {
        parameter: true,
      },
    });

    // 8. Buat Rekomendasi sampel untuk pengujian follow-up
    sampleRecommendation = await prisma.recommendation.create({
      data: {
        periodId: assessmentPeriod.id,
        parameterCode: sampleCriterion ? sampleCriterion.parameter.code : 'P01',
        recommendation: 'Penyusunan SOP Penilaian Risiko Terintegrasi',
        targetDate: new Date('2024-11-30'),
        mainActivities: 'FGD lintas divisi dan perumusan dokumen SOP',
        expectedOutput: 'SK Direksi tentang SOP Manajemen Risiko Terintegrasi',
        successIndicator: 'SOP diundangkan dan disosialisasikan',
        unitInCharge: 'Divisi Manajemen Risiko',
        priorityQuadrant: 1,
        horizon: 'SHORT_TERM',
        status: RecommendationStatus.BD,
      },
    });
  });

  afterAll(async () => {
    // Bersihkan data pengujian
    try {
      if (assessmentPeriod) {
        await prisma.followUpRecord.deleteMany({
          where: { recommendation: { periodId: assessmentPeriod.id } },
        });
        await prisma.recommendation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.supplementaryDocument.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.criterionEvaluation.deleteMany({
          where: { periodId: assessmentPeriod.id },
        });
        await prisma.assessmentPeriod.deleteMany({
          where: { tenantId: testTenant.id },
        });
      }
      if (testTenant) {
        await prisma.criterionEvidence.deleteMany({
          where: { tenantId: testTenant.id },
        });
      }
      await prisma.user.deleteMany({
        where: {
          id: { in: [counterpartUser?.id, anotherTenantUser?.id].filter(Boolean) },
        },
      });
      await prisma.tenant.deleteMany({
        where: {
          id: { in: [testTenant?.id].filter(Boolean) },
        },
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

  describe('1. Evidence Checklist & Direct/Presigned Upload', () => {
    it('GET /api/v1/counterpart/evidence-checklist mengembalikan checklist kriteria parameter', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/evidence-checklist?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.meta).toHaveProperty('totalCriteria');
      expect(body.meta).toHaveProperty('uploadedEvidences');
    });

    it('POST /api/v1/counterpart/evidences/presigned-url berhasil menerbitkan presigned URL S3', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/evidences/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          fileName: 'Pedoman_Manajemen_Risiko_2024.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 2048500,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('uploadUrl');
      expect(body.data).toHaveProperty('fileUrl');
      expect(body.data).toHaveProperty('storageKey');
      expect(body.data.uploadUrl).toContain('http');
    });

    it('POST /api/v1/counterpart/evidences/presigned-url MENOLAK tipe file terlarang (.exe)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/evidences/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          fileName: 'malicious_script.exe',
          mimeType: 'application/x-msdownload',
          fileSizeBytes: 1024,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('POST /api/v1/counterpart/evidences berhasil mencatat metadata bukti dokumen', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/evidences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          criterionId: sampleCriterion.id,
          fileName: 'Pedoman_Manajemen_Risiko_2024.pdf',
          fileUrl: 'https://s3.ap-southeast-1.amazonaws.com/openrmi-test/Pedoman_Manajemen_Risiko_2024.pdf',
          fileSize: 2048500,
          mimeType: 'application/pdf',
          docNumber: 'SK-DIR/042/2024',
          effectiveDate: '2024-01-15T00:00:00.000Z',
          sectionNotes: 'Bab IV Butir 3 Halaman 45-50',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.criterionId).toBe(sampleCriterion.id);
      expect(body.data.docNumber).toBe('SK-DIR/042/2024');

      createdEvidenceId = body.data.id;
    });

    it('DELETE /api/v1/counterpart/evidences/:id berhasil menghapus dokumen bukti', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/evidences/${createdEvidenceId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('berhasil dihapus');
    });
  });

  describe('2. Supplementary Documents & Assessor Confidentiality Invariant', () => {
    it('POST /api/v1/counterpart/supplementary-documents berhasil mencatat dokumen tambahan pasca-FGD', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/supplementary-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          fileName: 'Notulensi_Klarifikasi_FGD_Direksi.pdf',
          fileUrl: 'https://s3.ap-southeast-1.amazonaws.com/openrmi-test/Notulensi_Klarifikasi_FGD.pdf',
          fileSize: 1048576,
          mimeType: 'application/pdf',
          category: SupplementaryCategory.FGD_FOLLOW_UP,
          description: 'Penjelasan tambahan tindak lanjut risiko strategis pasca FGD reviu',
          submissionNotes: 'Diserahkan oleh Tim ERM Mandiri',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.ragIngestionStatus).toBe('PENDING');

      createdSupplementaryId = body.data.id;
    });

    it('INVARIAN KERAHASIAAN: GET /api/v1/counterpart/supplementary-documents TIDAK BOLEH memuat analysisResults / assessorNotes', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/supplementary-documents?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const targetDoc = body.data.find((d: any) => d.id === createdSupplementaryId);
      expect(targetDoc).toBeDefined();
      // INVARIAN: analysisResults dan assessorNotes dilarang keras terpapar ke Counterpart!
      expect(targetDoc.analysisResults).toBeUndefined();
      expect(targetDoc.assessorNotes).toBeUndefined();
    });

    it('DELETE /api/v1/counterpart/supplementary-documents/:id berhasil menghapus dokumen tambahan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/supplementary-documents/${createdSupplementaryId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('3. Live Monitoring Progress & Strict Confidentiality', () => {
    beforeAll(async () => {
      // Simulasikan konsultan telah menginput evaluasi pada kriteria dengan assessorNotes internal
      await prisma.criterionEvaluation.create({
        data: {
          tenantId: testTenant.id,
          periodId: assessmentPeriod.id,
          criterionId: sampleCriterion.id,
          score: 4,
          reviewNotes: 'Dokumen pedoman telah memadai dan ditandatangani Direksi.',
          findingsGap: 'Belum ada bukti pelaksanaan sosialisasi berkala ke unit cabang.',
          interviewNotes: 'Dikonfirmasi saat wawancara dengan Kepala Divisi ERM.',
          assessorNotes: 'RAHASIA ASESOR: Ada perbedaan persepsi antara Divisi Risiko dan Kepatuhan.',
        },
      });
    });

    it('GET /api/v1/counterpart/monitoring-progress mengembalikan progres dan celah temuan secara real-time', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/monitoring-progress?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('period');
      expect(body.data).toHaveProperty('progress');
      expect(body.data).toHaveProperty('dimensionProgress');
      expect(body.data).toHaveProperty('findingsAndGaps');

      // Verifikasi celah temuan (findingsAndGaps) ada
      const gap = body.data.findingsAndGaps.find(
        (g: any) => g.parameterCode === sampleCriterion.parameter.code
      );
      expect(gap).toBeDefined();
      expect(gap.findingsGap).toBe('Belum ada bukti pelaksanaan sosialisasi berkala ke unit cabang.');

      // INVARIAN KERAHASIAAN KONSULTAN: assessorNotes TIDAK BOLEH muncul dalam respons apa pun
      const jsonString = JSON.stringify(body);
      expect(jsonString).not.toContain('RAHASIA ASESOR');
      expect(gap.assessorNotes).toBeUndefined();
    });

    it('POST /api/v1/counterpart/confirm-draft berhasil menyetujui draf penilaian (FINALIZED & isLocked)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/confirm-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          decision: 'APPROVED',
          signatoryName: 'Ir. Hendra Kusuma, M.M.',
          signatoryTitle: 'Direktur Utama',
          notes: 'Draf penilaian RMI telah ditelaah dan disetujui tanpa catatan perbaikan.',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(AssessmentStatus.FINALIZED);
      expect(body.data.isLocked).toBe(true);

      // Verifikasi di database
      const updatedPeriod = await prisma.assessmentPeriod.findUnique({
        where: { id: assessmentPeriod.id },
      });
      expect(updatedPeriod?.status).toBe(AssessmentStatus.FINALIZED);
      expect(updatedPeriod?.isLocked).toBe(true);
    });

    it('POST /api/v1/counterpart/confirm-draft MENOLAK konfirmasi ulang jika sudah FINALIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/confirm-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          periodId: assessmentPeriod.id,
          decision: 'APPROVED',
          signatoryName: 'Ir. Hendra Kusuma, M.M.',
          signatoryTitle: 'Direktur Utama',
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ALREADY_FINALIZED');
    });
  });

  describe('4. Recommendation Follow-ups (Pemantauan Tindak Lanjut Triwulanan)', () => {
    let createdFollowUpId: string;

    it('GET /api/v1/counterpart/follow-ups mengembalikan daftar rekomendasi perbaikan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/follow-ups?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].id).toBe(sampleRecommendation.id);
    });

    it('POST /api/v1/counterpart/follow-ups berhasil mencatat laporan tindak lanjut triwulanan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${counterpartToken}`,
        },
        body: JSON.stringify({
          recommendationId: sampleRecommendation.id,
          quarter: 'TW_1',
          year: 2024,
          progressNotes: 'Telah diselesaikan draf final SOP Manajemen Risiko dan disahkan Direksi pada 28 Maret 2024.',
          evidenceFileUrl: 'https://s3.ap-southeast-1.amazonaws.com/openrmi-test/SK_SOP_Manajemen_Risiko.pdf',
          statusReported: RecommendationStatus.S,
        }),
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.statusReported).toBe(RecommendationStatus.S);

      createdFollowUpId = body.data.id;

      // Verifikasi status Rekomendasi diupdate menjadi S (Sesuai)
      const updatedRec = await prisma.recommendation.findUnique({
        where: { id: sampleRecommendation.id },
      });
      expect(updatedRec?.status).toBe(RecommendationStatus.S);
    });

    it('DELETE /api/v1/counterpart/follow-ups/:id berhasil menghapus catatan tindak lanjut', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/follow-ups/${createdFollowUpId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `access_token=${counterpartToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('5. Multi-Tenant Isolation & RBAC Security Guard', () => {
    it('Tenant Lain DITOLAK mengakses data monitoring tenant ini (404 PERIOD_NOT_FOUND)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/monitoring-progress?periodId=${assessmentPeriod.id}`, {
        headers: {
          Cookie: `access_token=${anotherTenantToken}`,
        },
      });

      const body = (await res.json()) as any;
      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PERIOD_NOT_FOUND');
    });

    it('Request tanpa autentikasi DITOLAK (401 UNAUTHORIZED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/counterpart/monitoring-progress?periodId=${assessmentPeriod.id}`);

      const body = (await res.json()) as any;
      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });
  });
});
