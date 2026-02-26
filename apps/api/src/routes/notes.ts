import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createNoteSchema, updateNoteSchema } from '@ama-midi/shared';
import * as noteService from '../services/note-service';
import { authMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../types';

const notesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

notesRouter.use('/*', authMiddleware);

notesRouter.get('/:songId/notes', async (c) => {
  const db = drizzle(c.env.DB);
  const data = await noteService.listNotes(db, c.req.param('songId'), c.get('user').id);
  return c.json({ data });
});

notesRouter.post('/:songId/notes', async (c) => {
  const input = createNoteSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const note = await noteService.createNote(db, c.req.param('songId'), c.get('user').id, input);

  await broadcastToSongRoom(c.env, c.req.param('songId'), { type: 'note:created', data: note });
  return c.json({ data: note }, 201);
});

notesRouter.put('/:songId/notes/:noteId', async (c) => {
  const input = updateNoteSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const note = await noteService.updateNote(
    db, c.req.param('songId'), c.req.param('noteId'), c.get('user').id, input,
  );

  await broadcastToSongRoom(c.env, c.req.param('songId'), { type: 'note:updated', data: note });
  return c.json({ data: note });
});

notesRouter.delete('/:songId/notes/:noteId', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await noteService.deleteNote(
    db, c.req.param('songId'), c.req.param('noteId'), c.get('user').id,
  );

  await broadcastToSongRoom(c.env, c.req.param('songId'), { type: 'note:deleted', data: result });
  return c.json({ data: result });
});

async function broadcastToSongRoom(env: Env, songId: string, message: unknown) {
  try {
    const roomId = env.SONG_ROOM.idFromName(songId);
    const room = env.SONG_ROOM.get(roomId);
    await room.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  } catch {
    // best-effort broadcast
  }
}

export default notesRouter;
