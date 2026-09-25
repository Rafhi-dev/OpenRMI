import http from 'http';
import app from '../../src/server';

describe('Server & Healthcheck API', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    // Listen on ephemeral random free port
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}`;
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('GET /api/v1 should return 200 and welcome message', async () => {
    const res = await fetch(`${baseUrl}/api/v1`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('OpenRMI Enterprise API v1');
    expect(body.data.regulation).toContain('PER-2/MBU/03/2023');
  });

  it('GET /health should return 200 and database CONNECTED status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('UP');
    expect(body.data.database).toBe('CONNECTED');
  });
});
