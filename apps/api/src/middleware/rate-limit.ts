import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env, Variables } from '../types';

const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
      const user = c.get('user' as never) as { id: string } | undefined;
      const key = user ? `user:${user.id}` : `ip:${ip}`;

      const now = Date.now();
      const entry = windows.get(key);

      if (!entry || now > entry.resetAt) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
        if (entry.count > maxRequests) {
          throw new HTTPException(429, { message: 'Too many requests' });
        }
      }

      await next();
    },
  );
}
