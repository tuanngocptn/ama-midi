import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verifyToken } from '../lib/jwt';
import type { Env, Variables } from '../types';

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  try {
    const user = await verifyToken(token, c.env.JWT_SECRET);
    c.set('user', user);
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  await next();
});
