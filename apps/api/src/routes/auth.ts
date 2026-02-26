import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { drizzle } from 'drizzle-orm/d1';
import { registerSchema, loginSchema } from '@ama-midi/shared';
import { register, login, refreshToken } from '../services/auth-service';
import { rateLimit } from '../middleware/rate-limit';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

auth.use('/*', rateLimit(10, 60_000));

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

auth.post('/refresh', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing token' });
  }
  const result = await refreshToken(c.env.JWT_SECRET, header.slice(7));
  return c.json({ data: result });
});

export default auth;
