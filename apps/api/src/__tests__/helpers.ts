import { eq } from 'drizzle-orm';
import app from '../index';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../db/schema';
import { hashPassword } from '../lib/password';
import { createToken } from '../lib/jwt';
import { generateSecret } from '../services/totp-service';
import { env } from 'cloudflare:test';

export function getDb() {
  return drizzle(env.DB);
}

export async function createTestUser(
  overrides?: Partial<{ email: string; name: string; password: string }>,
) {
  const db = getDb();
  const id = crypto.randomUUID();
  const email = overrides?.email ?? `user-${id.slice(0, 8)}@test.com`;
  const name = overrides?.name ?? 'Test User';
  const password = overrides?.password ?? 'password123';
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({ id, email, name, passwordHash });

  const token = await createToken(
    { id, email, name },
    env.JWT_SECRET,
  );

  return { id, email, name, password, token };
}

export async function request(
  method: string,
  path: string,
  options?: {
    token?: string;
    body?: unknown;
    csrf?: string;
  },
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  if (options?.csrf) {
    headers['Cookie'] = `csrf_token=${options.csrf}`;
    headers['X-CSRF-Token'] = options.csrf;
  }

  const req = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  return app.fetch(req, env);
}

export async function getCsrfToken(token: string): Promise<string> {
  const res = await request('GET', '/api/songs', { token });
  const cookie = res.headers.get('Set-Cookie') ?? '';
  const match = cookie.match(/csrf_token=([^;]+)/);
  return match?.[1] ?? '';
}

export async function enable2faForUser(userId: string): Promise<string> {
  const db = getDb();
  const secret = generateSecret();
  await db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: 1 })
    .where(eq(users.id, userId));
  return secret;
}
