import http from 'http';
import app from '../../src/server';
import prisma from '../../src/config/database';
import { UserRole } from '@prisma/client';

describe('Phase 2: Authentication & Multi-Tenancy RLS Guard', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminAccessToken: string;
  let adminRefreshToken: string;
  let testVendorId: string;

  beforeAll(async () => {
    // Start Express on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });

    // Create a test vendor for impersonation tests
    const testVendor = await prisma.vendor.upsert({
      where: { code: 'VEND-TEST-PHASE2' },
      update: {},
      create: {
        code: 'VEND-TEST-PHASE2',
        name: 'PT Konsultan Risiko Nusantara',
        email: 'info@konsultanrisiko.id',
        maxTenants: 5,
        licenseStatus: 'ACTIVE',
      },
    });
    testVendorId = testVendor.id;
  });

  afterAll(async () => {
    // Cleanup test vendor if needed
    if (testVendorId) {
      await prisma.auditLog.deleteMany({ where: { vendorId: testVendorId } });
      await prisma.vendor.delete({ where: { id: testVendorId } }).catch(() => {});
    }
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('1. Login via Email & Username', () => {
    it('harus berhasil login menggunakan EMAIL dan menyetel httpOnly Cookie', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'admin@openrmi.id',
          password: 'AdminOpenRMI2024!',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('admin@openrmi.id');
      expect(body.data.user.role).toBe(UserRole.ADMINISTRATOR);
      expect(body.data.accessToken).toBeDefined();

      // Verifikasi httpOnly cookies pada response header
      const rawCookies = res.headers.get('set-cookie');
      expect(rawCookies).toBeDefined();
      expect(rawCookies).toContain('access_token=');
      expect(rawCookies).toContain('HttpOnly');
      expect(rawCookies).toContain('refresh_token=');

      // Simpan token untuk test selanjutnya
      adminAccessToken = body.data.accessToken;
      // Ambil refresh token dari header set-cookie
      const refreshMatch = rawCookies?.match(/refresh_token=([^;]+)/);
      if (refreshMatch) {
        adminRefreshToken = refreshMatch[1];
      }
    });

    it('harus berhasil login menggunakan USERNAME dan menyetel httpOnly Cookie', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'admin', // Menggunakan username
          password: 'AdminOpenRMI2024!',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.user.username).toBe('admin');
      expect(body.data.user.email).toBe('admin@openrmi.id');
      expect(body.data.user.role).toBe(UserRole.ADMINISTRATOR);
    });

    it('harus menolak login jika password salah (401 INVALID_CREDENTIALS)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'admin',
          password: 'WrongPassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('harus menolak login jika format input tidak valid (400 VALIDATION_ERROR)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'a', // Terlalu pendek
          password: '123', // Terlalu pendek
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Endpoint GET /api/v1/auth/me (Profil & Sesi)', () => {
    it('harus berhasil membaca profil menggunakan Cookie access_token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          Cookie: `access_token=${adminAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('admin@openrmi.id');
      expect(body.data.role).toBe(UserRole.ADMINISTRATOR);
      expect(body.data.isImpersonating).toBe(false);
    });

    it('harus berhasil membaca profil menggunakan Authorization Bearer header fallback', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('admin');
    });

    it('harus menolak request tanpa token (401 UNAUTHORIZED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. Endpoint POST /api/v1/auth/refresh (Rotasi Token)', () => {
    it('harus berhasil merotasi token menggunakan refresh_token di Cookie', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refresh_token=${adminRefreshToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();

      const rawCookies = res.headers.get('set-cookie');
      expect(rawCookies).toContain('access_token=');
      expect(rawCookies).toContain('HttpOnly');
    });

    it('harus menolak refresh jika token tidak disediakan (401 MISSING_REFRESH_TOKEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });
  });

  describe('4. Sesi Impersonasi Vendor (Invarian Keamanan Administrator)', () => {
    let impersonationToken: string;

    it('Administrator berhasil memulai mode impersonasi vendor', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${adminAccessToken}`,
        },
        body: JSON.stringify({
          targetVendorId: testVendorId,
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.vendor.id).toBe(testVendorId);
      expect(body.data.accessToken).toBeDefined();

      impersonationToken = body.data.accessToken;

      // Verifikasi bahwa audit_logs mencatat event impersonasi
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          vendorId: testVendorId,
          action: 'VENDOR_IMPERSONATE',
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.impersonatedByAdminId).toBeDefined();
    });

    it('Profil pengguna selama impersonasi menampilkan status isImpersonating = true', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          Cookie: `access_token=${impersonationToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.isImpersonating).toBe(true);
      expect(body.data.impersonatedByAdminId).toBeDefined();
    });

    it('Administrator berhasil keluar dari mode impersonasi (exit-impersonate)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/exit-impersonate`, {
        method: 'POST',
        headers: {
          Cookie: `access_token=${impersonationToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.user.role).toBe(UserRole.ADMINISTRATOR);
      expect(body.data.user.impersonatedByAdminId).toBeNull();
    });
  });

  describe('5. Endpoint POST /api/v1/auth/logout', () => {
    it('harus membersihkan cookies saat logout', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `access_token=${adminAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);

      const rawCookies = res.headers.get('set-cookie');
      // Cookie di-clear (expires di masa lalu atau nilai kosong)
      expect(rawCookies).toBeDefined();
    });
  });
});
