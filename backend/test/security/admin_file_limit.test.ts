import http from 'http';
import app from '../../src/server';
import prisma from '../../src/config/database';
import { getMaxUploadFileSizeMb } from '../../src/middlewares/fileValidator';
import { generateAuthTokens } from '../../src/modules/auth/auth.jwt';
import { UserRole } from '@prisma/client';

describe('Admin Configurable File Upload Size Limit', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminToken: string;

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
  });

  afterAll(async () => {
    // Reset kembali ke 50 MB
    await prisma.systemSetting.update({
      where: { id: 'global_system_setting' },
      data: { maxUploadFileSizeMb: 50 },
    }).catch(() => {});

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET /api/v1/admin/system/settings harus mengembalikan batas ukuran file saat ini (default 50 MB)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/system/settings`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.maxUploadFileSizeMb).toBeDefined();
    expect(body.data.allowedFileTypes).toContain('pdf,docx,xlsx,jpeg,jpg,png');
  });

  it('PUT /api/v1/admin/system/settings Administrator berhasil mengubah batas ukuran file menjadi 100 MB', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/system/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        maxUploadFileSizeMb: 100,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.maxUploadFileSizeMb).toBe(100);

    // Verifikasi bahwa modul file validator langsung mencatat limit 100 MB secara dinamis
    const currentLimit = await getMaxUploadFileSizeMb();
    expect(currentLimit).toBe(100);

    // Verifikasi pencatatan audit log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'SYSTEM_SETTINGS_UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
    expect((audit?.newValues as any)?.maxUploadFileSizeMb).toBe(100);
  });

  it('harus menolak nilai batas ukuran file yang tidak valid (< 1 MB atau > 500 MB)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/system/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        maxUploadFileSizeMb: 0, // Tidak boleh 0
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
