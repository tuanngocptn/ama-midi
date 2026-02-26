import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE = 'csrf_token';

export const csrfMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    if (SAFE_METHODS.includes(c.req.method)) {
      const token = crypto.randomUUID();
      const isLocal = new URL(c.req.url).hostname === 'localhost';
      const flags = isLocal ? 'SameSite=Strict' : 'SameSite=Strict; Secure';
      c.header('Set-Cookie', `${CSRF_COOKIE}=${token}; Path=/; ${flags}`);
      await next();
      return;
    }

    const cookieHeader = c.req.header('Cookie') ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      }),
    );
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = c.req.header(CSRF_HEADER);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new HTTPException(403, { message: 'CSRF token mismatch' });
    }

    await next();
  },
);
