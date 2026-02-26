import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { notes, noteEvents } from '../db/schema';
import { ensureAccess, ensureEditorAccess } from './access-control';

type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle>;

export async function listNotes(db: DB, songId: string, userId: string) {
  await ensureAccess(db, songId, userId);
  return db.select().from(notes).where(eq(notes.songId, songId));
}

export async function createNote(
  db: DB,
  songId: string,
  userId: string,
  input: {
    title: string;
    track: number;
    pitch?: number;
    time: number;
    color: string;
    description?: string;
  },
) {
  await ensureEditorAccess(db, songId, userId);

  const id = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const noteData = { id, songId, ...input };

  try {
    await db.batch([
      db.insert(notes).values({
        id,
        songId,
        track: input.track,
        pitch: input.pitch ?? 0,
        time: input.time,
        title: input.title,
        description: input.description ?? null,
        color: input.color,
      }),
      db.insert(noteEvents).values({
        id: eventId,
        noteId: id,
        songId,
        userId,
        action: 'CREATE',
        payload: JSON.stringify(noteData),
      }),
    ]);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, {
        message: `A note already exists at track ${input.track}, time ${input.time}`,
      });
    }
    throw err;
  }

  const note = await db.select().from(notes).where(eq(notes.id, id)).get();
  if (!note) throw new HTTPException(500, { message: 'Failed to fetch created note' });
  return note;
}

export async function updateNote(
  db: DB,
  songId: string,
  noteId: string,
  userId: string,
  input: {
    title?: string;
    track?: number;
    pitch?: number;
    time?: number;
    color?: string;
    description?: string | null;
  },
) {
  await ensureEditorAccess(db, songId, userId);

  const existing = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.songId, songId)))
    .get();

  if (!existing) {
    throw new HTTPException(404, { message: 'Note not found' });
  }

  const eventId = crypto.randomUUID();
  const merged = { ...existing, ...input };

  try {
    await db.batch([
      db
        .update(notes)
        .set({
          ...(input.title !== undefined && { title: input.title }),
          ...(input.track !== undefined && { track: input.track }),
          ...(input.pitch !== undefined && { pitch: input.pitch }),
          ...(input.time !== undefined && { time: input.time }),
          ...(input.color !== undefined && { color: input.color }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(notes.id, noteId)),
      db.insert(noteEvents).values({
        id: eventId,
        noteId,
        songId,
        userId,
        action: 'UPDATE',
        payload: JSON.stringify(merged),
      }),
    ]);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      const track = input.track ?? existing.track;
      const time = input.time ?? existing.time;
      throw new HTTPException(409, {
        message: `A note already exists at track ${track}, time ${time}`,
      });
    }
    throw err;
  }

  const updated = await db.select().from(notes).where(eq(notes.id, noteId)).get();
  if (!updated) throw new HTTPException(500, { message: 'Failed to fetch updated note' });
  return updated;
}

export async function deleteNote(
  db: DB,
  songId: string,
  noteId: string,
  userId: string,
): Promise<{ id: string }> {
  await ensureEditorAccess(db, songId, userId);

  const existing = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.songId, songId)))
    .get();

  if (!existing) {
    throw new HTTPException(404, { message: 'Note not found' });
  }

  const eventId = crypto.randomUUID();

  await db.batch([
    db.delete(notes).where(eq(notes.id, noteId)),
    db.insert(noteEvents).values({
      id: eventId,
      noteId,
      songId,
      userId,
      action: 'DELETE',
      payload: JSON.stringify(existing),
    }),
  ]);

  return { id: noteId };
}
