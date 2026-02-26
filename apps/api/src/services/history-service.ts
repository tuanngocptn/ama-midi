import { eq, desc } from 'drizzle-orm';
import { noteEvents, users } from '../db/schema';
import { ensureAccess } from './access-control';

type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle>;

export async function listHistory(
  db: DB,
  songId: string,
  userId: string,
  limit: number,
  offset: number,
) {
  await ensureAccess(db, songId, userId);

  const rows = await db
    .select({
      id: noteEvents.id,
      noteId: noteEvents.noteId,
      songId: noteEvents.songId,
      userId: noteEvents.userId,
      action: noteEvents.action,
      payload: noteEvents.payload,
      createdAt: noteEvents.createdAt,
      userName: users.name,
    })
    .from(noteEvents)
    .innerJoin(users, eq(noteEvents.userId, users.id))
    .where(eq(noteEvents.songId, songId))
    .orderBy(desc(noteEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    ...r,
    user: { id: r.userId, name: r.userName },
  }));
}
