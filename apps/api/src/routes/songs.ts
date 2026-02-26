import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createSongSchema, updateSongSchema } from '@ama-midi/shared';
import * as songService from '../services/song-service';
import { authMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../types';

const songsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

songsRouter.use('/*', authMiddleware);

songsRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const filter = c.req.query('filter') ?? 'all';
  const data = await songService.listSongs(db, c.get('user').id, filter);
  return c.json({ data });
});

songsRouter.post('/', async (c) => {
  const input = createSongSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const data = await songService.createSong(db, c.get('user').id, input);
  return c.json({ data }, 201);
});

songsRouter.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const data = await songService.getSong(db, c.req.param('id'), c.get('user').id);
  return c.json({ data });
});

songsRouter.put('/:id', async (c) => {
  const input = updateSongSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const data = await songService.updateSong(db, c.req.param('id'), c.get('user').id, input);
  return c.json({ data });
});

songsRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const data = await songService.deleteSong(db, c.req.param('id'), c.get('user').id);
  return c.json({ data });
});

export default songsRouter;
