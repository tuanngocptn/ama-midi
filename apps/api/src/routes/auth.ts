import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { drizzle } from 'drizzle-orm/d1';
import { registerSchema, loginSchema, login2faSchema, verify2faCodeSchema } from '@ama-midi/shared';
import {
  register,
  login,
  loginWith2fa,
  refreshToken,
  setup2fa,
  verifySetup2fa,
  disable2fa,
} from '../services/auth-service';
import { rateLimit } from '../middleware/rate-limit';
import { authMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../types';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

auth.use('/*', rateLimit(100, 60_000));

auth.post('/register', async (c) => {
  const input = registerSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const result = await register(db, c.env.JWT_SECRET, input);
  return c.json({ data: result }, 201);
});

auth.post('/login', async (c) => {
  const input = loginSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const result = await login(db, c.env.JWT_SECRET, input);
  return c.json({ data: result });
});

auth.post('/login/2fa', async (c) => {
  const input = login2faSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const result = await loginWith2fa(db, c.env.JWT_SECRET, input);
  return c.json({ data: result });
});

auth.post('/refresh', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing token' });
  }
  const result = await refreshToken(c.env.JWT_SECRET, header.slice(7));
  return c.json({ data: result });
});

auth.post('/2fa/setup', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const result = await setup2fa(db, c.get('user').id);
  return c.json({ data: result });
});

auth.post('/2fa/verify-setup', authMiddleware, async (c) => {
  const { code } = verify2faCodeSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  await verifySetup2fa(db, c.get('user').id, code);
  return c.json({ data: { enabled: true } });
});

auth.post('/2fa/disable', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  await disable2fa(db, c.get('user').id);
  return c.json({ data: { enabled: false } });
});

export default auth;
