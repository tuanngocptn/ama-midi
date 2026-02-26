import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listHistory } from '../services/history-service';
import { authMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../types';

const historyRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

historyRouter.use('/*', authMiddleware);

historyRouter.get('/:songId/history', async (c) => {
  const db = drizzle(c.env.DB);
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const data = await listHistory(db, c.req.param('songId'), c.get('user').id, limit, offset);
  return c.json({ data });
});

export default historyRouter;
