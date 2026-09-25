import http from 'http';
import app from '../../src/server';
import prisma from '../../src/config/database';
import { generateAuthTokens } from '../../src/modules/auth/auth.jwt';
import { UserRole, IndustryCluster } from '@prisma/client';

describe('Phase 3: Administrator Console & Vendor Portal Module', () => {
  let server: http.Server;
  let baseUrl: string;

  let adminToken: string;
  let vendorToken: string;
  let nonVendorToken: string;

  let testVendorId: string;
  let testTenantId: string;
  let testPeriodId: string;
  let testConsultantId: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    // 1. Get or setup root administrator
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMINISTRATOR },
    });
    if (admin) {
      const tokens = generateAuthTokens({
        userId: admin.id,
        role: admin.role,
        email: admin.email,
        username: admin.username,
        vendorId: null,
        tenantId: null,
      });
      adminToken = tokens.accessToken;
    }

    // 2. Setup a test vendor institution
    const vendor = await prisma.vendor.upsert({
      where: { code: 'VEND-PHASE3-TEST' },
      update: { maxTenants: 2 },
      create: {
        code: 'VEND-PHASE3-TEST',
        name: 'PT Asesmen Solusi Risiko',
        email: 'admin@solusirisiko.id',
        maxTenants: 2, // Kuota kecil untuk menguji quota enforcement
        licenseStatus: 'ACTIVE',
      },
    });
    testVendorId = vendor.id;

    // 3. Setup a vendor manager user
    const vendorUser = await prisma.user.upsert({
      where: { email: 'manager@solusirisiko.id' },
      update: { vendorId: testVendorId },
      create: {
        vendorId: testVendorId,
        fullName: 'Budi Vendor Manager',
        username: 'budimanager',
        email: 'manager@solusirisiko.id',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.VENDOR,
        isActive: true,
      },
    });

    const vendorTokens = generateAuthTokens({
      userId: vendorUser.id,
      role: vendorUser.role,
      email: vendorUser.email,
      username: vendorUser.username,
      vendorId: vendorUser.vendorId,
      tenantId: null,
    });
    vendorToken = vendorTokens.accessToken;

    // 4. Setup non-vendor user (e.g. COUNTERPART_TEAM) for RBAC testing
    const nonVendorTokens = generateAuthTokens({
      userId: 'dummy-counterpart-id',
      role: UserRole.COUNTERPART_TEAM,
      email: 'counterpart@client.com',
      username: 'counterpart1',
      vendorId: null,
      tenantId: 'dummy-tenant-id',
    });
    nonVendorToken = nonVendorTokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup created data
    if (testVendorId) {
      await prisma.consultantAssignment.deleteMany({
        where: { tenant: { vendorId: testVendorId } },
      });
      await prisma.assessmentPeriod.deleteMany({
        where: { tenant: { vendorId: testVendorId } },
      });
      await prisma.tenant.deleteMany({
        where: { vendorId: testVendorId },
      });
      await prisma.user.deleteMany({
        where: { vendorId: testVendorId, NOT: { email: 'manager@solusirisiko.id' } },
      });
      await prisma.auditLog.deleteMany({
        where: { vendorId: testVendorId },
      });
      await prisma.user.deleteMany({ where: { email: 'manager@solusirisiko.id' } });
      await prisma.vendor.delete({ where: { id: testVendorId } }).catch(() => {});
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('1. Administrator Console API (/api/v1/admin/*)', () => {
    let createdVendorId: string;

    it('GET /api/v1/admin/vendors harus mengembalikan daftar vendor terdaftar', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/vendors`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/admin/vendors Administrator berhasil mendaftarkan vendor baru', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Kantor Konsultan Mandiri Risk',
          code: 'VEND-MANDIRI-01',
          email: 'kontak@mandiririsk.id',
          maxTenants: 15,
          licenseStatus: 'ACTIVE',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('VEND-MANDIRI-01');
      createdVendorId = body.data.id;
    });

    it('GET /api/v1/admin/master-models harus mengembalikan 5 Dimensi baku KBUMN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/master-models`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(5); // 5 Dimensi
      expect(body.data[0].code).toBe('D1');
    });

    it('GET /api/v1/admin/ai-config harus mengembalikan konfigurasi AI dengan API keys ter-masking', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/ai-config`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.deepseekApiKeyMasked).toBeDefined();
      expect(body.data.deepseekApiKeyMasked).toContain('...');
      // Memastikan plain text key tidak bocor
      expect(body.data.deepseekApiKey).toBeUndefined();
    });

    it('PUT /api/v1/admin/ai-config Administrator berhasil memperbarui konfigurasi AI global', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/ai-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          activeLlmModel: 'deepseek-v4-pro',
          thinkingMode: true,
          temperature: 0.2,
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.activeLlmModel).toBe('deepseek-v4-pro');
      expect(Number(body.data.temperature)).toBe(0.2);
    });

    it('GET /api/v1/admin/system/health harus mendiagnosis koneksi PostgreSQL, Redis, dan Storage', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.components.database.status).toBe('UP');
      expect(body.data.components.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(body.data.system.memory.heapUsedMb).toBeGreaterThan(0);
    });

    it('GET /api/v1/admin/audit-logs harus menampilkan jejak audit transaksi', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('Non-Administrator ditolak mengakses /api/v1/admin/* (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/vendors`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });

      expect(res.status).toBe(403);
    });

    // Cleanup createdVendor
    afterAll(async () => {
      if (createdVendorId) {
        await prisma.vendor.delete({ where: { id: createdVendorId } }).catch(() => {});
      }
    });
  });

  describe('2. Vendor Portal API (/api/v1/vendor/*)', () => {
    it('POST /api/v1/vendor/tenants Vendor berhasil mendaftarkan tenant klien baru (Tenant #1)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          name: 'PT Pelabuhan Nusantara BUMN',
          code: 'PELABUHAN-01',
          industryCluster: IndustryCluster.UMUM,
          initialYear: 2024,
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('PELABUHAN-01');
      expect(body.data.periods.length).toBe(1);

      testTenantId = body.data.id;
      testPeriodId = body.data.periods[0].id;
    });

    it('POST /api/v1/vendor/tenants Vendor mendaftarkan Tenant #2 (mencapai batas kuota maxTenants = 2)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          name: 'PT Kereta Api Logistik BUMN',
          code: 'KALOG-02',
          industryCluster: IndustryCluster.UMUM,
        }),
      });

      expect(res.status).toBe(201);
    });

    it('POST /api/v1/vendor/tenants harus MENOLAK pendaftaran Tenant #3 karena kuota maxTenants terlampaui (400 QUOTA_EXCEEDED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          name: 'PT Energi Terbarukan BUMN',
          code: 'ENERGI-03',
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('QUOTA_EXCEEDED');
      expect(body.error.message).toContain('Kuota tenant');
    });

    it('POST /api/v1/vendor/consultants Vendor berhasil mendaftarkan akun konsultan eksternal', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/consultants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          fullName: 'Dr. Ahmad Konsultan RMI',
          username: 'ahmad_rmi',
          email: 'ahmad@solusirisiko.id',
          password: 'PasswordAhmad123!',
          agencyName: 'PT Asesmen Solusi Risiko',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.role).toBe(UserRole.EXTERNAL_CONSULTANT);
      expect(body.data.username).toBe('ahmad_rmi');

      testConsultantId = body.data.id;
    });

    it('POST /api/v1/vendor/assignments Vendor berhasil menugaskan konsultan ke tenant klien dan periode observasi', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          tenantId: testTenantId,
          consultantId: testConsultantId,
          periodId: testPeriodId,
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-12-31T23:59:59.000Z',
          ndaDocumentUrl: 'https://media-rmi.example.com/nda/nda_ahmad.pdf',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.isActive).toBe(true);
      expect(body.data.tenant.name).toBe('PT Pelabuhan Nusantara BUMN');
    });

    it('GET /api/v1/vendor/portfolio-progress harus mengembalikan ringkasan makro portofolio vendor', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/portfolio-progress`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.vendorInfo.currentTenants).toBe(2);
      expect(body.data.tenants.length).toBe(2);
      const assignedTenant = body.data.tenants.find((t: any) => t.code === 'PELABUHAN-01');
      expect(assignedTenant).toBeDefined();
      expect(assignedTenant.activeConsultants.length).toBeGreaterThanOrEqual(1);
    });

    it('Peran non-Vendor ditolak mengakses /api/v1/vendor/* (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/vendor/tenants`, {
        headers: { Authorization: `Bearer ${nonVendorToken}` },
      });

      expect(res.status).toBe(403);
    });
  });
});
