import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { songs, songCollaborators } from '../db/schema';

export type DB = ReturnType<typeof drizzle>;

export async function checkSongAccess(
  db: DB,
  songId: string,
  userId: string,
): Promise<boolean> {
  const song = await db.select({ ownerId: songs.ownerId }).from(songs).where(eq(songs.id, songId)).get();
  if (song?.ownerId === userId) return true;

  const collab = await db
    .select({ id: songCollaborators.id })
    .from(songCollaborators)
    .where(
      sql`${songCollaborators.songId} = ${songId} AND ${songCollaborators.userId} = ${userId}`,
    )
    .get();

  return !!collab;
}

export async function getSongRole(
  db: DB,
  songId: string,
  userId: string,
): Promise<'owner' | 'editor' | 'viewer' | null> {
  const song = await db.select({ ownerId: songs.ownerId }).from(songs).where(eq(songs.id, songId)).get();
  if (song?.ownerId === userId) return 'owner';

  const collab = await db
    .select({ role: songCollaborators.role })
    .from(songCollaborators)
    .where(
      sql`${songCollaborators.songId} = ${songId} AND ${songCollaborators.userId} = ${userId}`,
    )
    .get();

  return (collab?.role as 'editor' | 'viewer') ?? null;
}

export async function ensureAccess(db: DB, songId: string, userId: string) {
  const song = await db
    .select({ ownerId: songs.ownerId })
    .from(songs)
    .where(eq(songs.id, songId))
    .get();

  if (!song) {
    throw new HTTPException(404, { message: 'Song not found' });
  }
  if (song.ownerId === userId) return;

  const collab = await db
    .select({ id: songCollaborators.id })
    .from(songCollaborators)
    .where(
      sql`${songCollaborators.songId} = ${songId} AND ${songCollaborators.userId} = ${userId}`,
    )
    .get();

  if (!collab) {
    throw new HTTPException(403, { message: 'No access to this song' });
  }
}

export async function ensureEditorAccess(db: DB, songId: string, userId: string) {
  const song = await db
    .select({ ownerId: songs.ownerId })
    .from(songs)
    .where(eq(songs.id, songId))
    .get();

  if (!song) {
    throw new HTTPException(404, { message: 'Song not found' });
  }
  if (song.ownerId === userId) return;

  const collab = await db
    .select({ role: songCollaborators.role })
    .from(songCollaborators)
    .where(
      sql`${songCollaborators.songId} = ${songId} AND ${songCollaborators.userId} = ${userId}`,
    )
    .get();

  if (!collab) {
    throw new HTTPException(403, { message: 'No access to this song' });
  }
  if (collab.role === 'viewer') {
    throw new HTTPException(403, { message: 'Viewers cannot modify notes' });
  }
}

export async function ensureOwner(db: DB, songId: string, userId: string) {
  const song = await db
    .select({ ownerId: songs.ownerId })
    .from(songs)
    .where(eq(songs.id, songId))
    .get();

  if (!song) {
    throw new HTTPException(404, { message: 'Song not found' });
  }
  if (song.ownerId !== userId) {
    throw new HTTPException(403, { message: 'Only the owner can manage collaborators' });
  }
}
