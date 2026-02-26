import { describe, it, expect } from 'vitest';
import { request, createTestUser, enable2faForUser } from './helpers';

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('creates a new user and returns token', async () => {
      const email = `reg-new-${crypto.randomUUID().slice(0, 8)}@test.com`;
      const res = await request('POST', '/api/auth/register', {
        body: { email, name: 'New User', password: 'password123' },
      });
      expect(res.status).toBe(201);
      const json = await res.json() as { data: { token: string; user: { email: string } } };
      expect(json.data.token).toBeDefined();
      expect(json.data.user.email).toBe(email);
    });

    it('rejects duplicate email with 409', async () => {
      const email = `reg-dup-${crypto.randomUUID().slice(0, 8)}@test.com`;
      await request('POST', '/api/auth/register', {
        body: { email, name: 'User1', password: 'password123' },
      });
      const res = await request('POST', '/api/auth/register', {
        body: { email, name: 'User2', password: 'password123' },
      });
      expect(res.status).toBe(409);
    });

    it('rejects invalid email with 400', async () => {
      const res = await request('POST', '/api/auth/register', {
        body: { email: 'not-email', name: 'User', password: 'password123' },
      });
      expect(res.status).toBe(400);
    });

    it('rejects short password with 400', async () => {
      const email = `reg-short-${crypto.randomUUID().slice(0, 8)}@test.com`;
      const res = await request('POST', '/api/auth/register', {
        body: { email, name: 'User', password: '123' },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token for valid credentials', async () => {
      const user = await createTestUser();
      const res = await request('POST', '/api/auth/login', {
        body: { email: user.email, password: user.password },
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { token: string } };
      expect(json.data.token).toBeDefined();
    });

    it('rejects wrong password with 401', async () => {
      const user = await createTestUser();
      const res = await request('POST', '/api/auth/login', {
        body: { email: user.email, password: 'wrongpass123' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent email with 401', async () => {
      const email = `ghost-${crypto.randomUUID().slice(0, 8)}@test.com`;
      const res = await request('POST', '/api/auth/login', {
        body: { email, password: 'password123' },
      });
      expect(res.status).toBe(401);
    });

    it('returns requires2fa when 2FA is enabled', async () => {
      const user = await createTestUser();
      await enable2faForUser(user.id);

      const res = await request('POST', '/api/auth/login', {
        body: { email: user.email, password: user.password },
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { requires2fa: boolean } };
      expect(json.data.requires2fa).toBe(true);
    });
  });

  describe('POST /api/auth/login/2fa', () => {
    it('rejects invalid 2FA code with 401', async () => {
      const user = await createTestUser();
      await enable2faForUser(user.id);

      const res = await request('POST', '/api/auth/login/2fa', {
        body: { email: user.email, password: user.password, code: '000000' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects wrong password even with code', async () => {
      const user = await createTestUser();
      await enable2faForUser(user.id);

      const res = await request('POST', '/api/auth/login/2fa', {
        body: { email: user.email, password: 'wrongpass123', code: '123456' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('2FA setup endpoints', () => {
    it('POST /api/auth/2fa/setup returns secret and URI', async () => {
      const user = await createTestUser();
      const res = await request('POST', '/api/auth/2fa/setup', { token: user.token });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { secret: string; uri: string } };
      expect(json.data.secret).toBeDefined();
      expect(json.data.uri).toContain('otpauth://totp/');
      expect(json.data.uri).toContain(encodeURIComponent(user.email));
    });

    it('POST /api/auth/2fa/verify-setup rejects invalid code', async () => {
      const user = await createTestUser();
      await request('POST', '/api/auth/2fa/setup', { token: user.token });
      const res = await request('POST', '/api/auth/2fa/verify-setup', {
        token: user.token,
        body: { code: '000000' },
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/auth/2fa/disable disables 2FA', async () => {
      const user = await createTestUser();
      await enable2faForUser(user.id);

      const res = await request('POST', '/api/auth/2fa/disable', { token: user.token });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { enabled: boolean } };
      expect(json.data.enabled).toBe(false);

      const loginRes = await request('POST', '/api/auth/login', {
        body: { email: user.email, password: user.password },
      });
      const loginJson = await loginRes.json() as { data: { token?: string } };
      expect(loginJson.data.token).toBeDefined();
    });

    it('rejects setup without auth', async () => {
      const res = await request('POST', '/api/auth/2fa/setup');
      expect([401, 429]).toContain(res.status);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns a new token', async () => {
      const user = await createTestUser();
      const res = await request('POST', '/api/auth/refresh', { token: user.token });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { token: string } };
      expect(json.data.token).toBeDefined();
    });

    it('rejects missing token with 401', async () => {
      const res = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { env } = await import('cloudflare:test');
      const { default: app } = await import('../index');
      const response = await app.fetch(res, env);
      expect([401, 429]).toContain(response.status);
    });
  });
});
