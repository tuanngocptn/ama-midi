import { eq, sql, count } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { songs, songCollaborators, notes, users } from '../db/schema';
import { checkSongAccess, getSongRole, ensureOwner } from './access-control';

type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle>;

export async function listSongs(
  db: DB,
  userId: string,
  filter: string,
): Promise<typeof songs.$inferSelect[]> {
  if (filter === 'owned') {
    return db.select().from(songs).where(eq(songs.ownerId, userId));
  }

  if (filter === 'shared') {
    const rows = await db
      .select({ song: songs })
      .from(songCollaborators)
      .innerJoin(songs, eq(songCollaborators.songId, songs.id))
      .where(eq(songCollaborators.userId, userId));
    return rows.map((r) => r.song);
  }

  const owned = await db.select().from(songs).where(eq(songs.ownerId, userId));
  const sharedRows = await db
    .select({ song: songs })
    .from(songCollaborators)
    .innerJoin(songs, eq(songCollaborators.songId, songs.id))
    .where(eq(songCollaborators.userId, userId));
  const shared = sharedRows.map((r) => r.song);

  const seen = new Set(owned.map((s) => s.id));
  return [...owned, ...shared.filter((s) => !seen.has(s.id))];
}

export async function createSong(
  db: DB,
  userId: string,
  input: { title: string; description?: string },
): Promise<typeof songs.$inferSelect> {
  const id = crypto.randomUUID();
  await db.insert(songs).values({
    id,
    title: input.title,
    description: input.description ?? null,
    ownerId: userId,
  });
  const song = await db.select().from(songs).where(eq(songs.id, id)).get();
  if (!song) throw new HTTPException(500, { message: 'Failed to create song' });
  return song;
}

export async function getSong(
  db: DB,
  songId: string,
  userId: string,
) {
  const song = await db.select().from(songs).where(eq(songs.id, songId)).get();
  if (!song) {
    throw new HTTPException(404, { message: 'Song not found' });
  }
  const hasAccess = await checkSongAccess(db, songId, userId);
  if (!hasAccess) {
    throw new HTTPException(403, { message: 'No access to this song' });
  }
  const [noteCountResult] = await db
    .select({ value: count() })
    .from(notes)
    .where(eq(notes.songId, songId));
  const [collabCountResult] = await db
    .select({ value: count() })
    .from(songCollaborators)
    .where(eq(songCollaborators.songId, songId));
  const owner = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, song.ownerId))
    .get();
  return {
    ...song,
    noteCount: noteCountResult.value,
    collaboratorCount: collabCountResult.value,
    owner: owner ?? { id: song.ownerId, name: 'Unknown', email: '' },
  };
}

export async function updateSong(
  db: DB,
  songId: string,
  userId: string,
  input: { title?: string; description?: string | null },
): Promise<typeof songs.$inferSelect> {
  const song = await db.select().from(songs).where(eq(songs.id, songId)).get();
  if (!song) {
    throw new HTTPException(404, { message: 'Song not found' });
  }
  const role = await getSongRole(db, songId, userId);
  if (role === null) {
    throw new HTTPException(403, { message: 'No access to this song' });
  }
  if (role === 'viewer') {
    throw new HTTPException(403, { message: 'Viewers cannot update songs' });
  }
  await db
    .update(songs)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(songs.id, songId));
  const updated = await db.select().from(songs).where(eq(songs.id, songId)).get();
  if (!updated) throw new HTTPException(500, { message: 'Failed to update song' });
  return updated;
}

export async function deleteSong(
  db: DB,
  songId: string,
  userId: string,
): Promise<{ id: string }> {
  await ensureOwner(db, songId, userId);
  await db.delete(songs).where(eq(songs.id, songId));
  return { id: songId };
}
