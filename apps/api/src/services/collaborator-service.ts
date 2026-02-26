import { eq, and } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { songCollaborators, users } from '../db/schema';
import { ensureAccess, ensureOwner } from './access-control';

type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle>;

export async function listCollaborators(db: DB, songId: string, userId: string) {
  await ensureAccess(db, songId, userId);

  const rows = await db
    .select({
      id: songCollaborators.id,
      songId: songCollaborators.songId,
      userId: songCollaborators.userId,
      role: songCollaborators.role,
      createdAt: songCollaborators.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(songCollaborators)
    .innerJoin(users, eq(songCollaborators.userId, users.id))
    .where(eq(songCollaborators.songId, songId));

  return rows.map((r) => ({
    id: r.id,
    songId: r.songId,
    userId: r.userId,
    role: r.role,
    createdAt: r.createdAt,
    user: { id: r.userId, email: r.userEmail, name: r.userName },
  }));
}

export async function addCollaborator(
  db: DB,
  songId: string,
  currentUserId: string,
  input: { email: string; role: 'editor' | 'viewer' },
) {
  await ensureOwner(db, songId, currentUserId);

  const targetUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .get();

  if (!targetUser) {
    throw new HTTPException(404, { message: 'User not found with that email' });
  }

  if (targetUser.id === currentUserId) {
    throw new HTTPException(400, { message: 'Cannot add yourself as collaborator' });
  }

  const id = crypto.randomUUID();

  try {
    await db.insert(songCollaborators).values({
      id,
      songId,
      userId: targetUser.id,
      role: input.role,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: 'User is already a collaborator' });
    }
    throw err;
  }

  return { id, songId, userId: targetUser.id, role: input.role };
}

export async function updateCollaboratorRole(
  db: DB,
  songId: string,
  currentUserId: string,
  targetUserId: string,
  role: 'editor' | 'viewer',
) {
  await ensureOwner(db, songId, currentUserId);

  await db
    .update(songCollaborators)
    .set({ role })
    .where(
      and(
        eq(songCollaborators.songId, songId),
        eq(songCollaborators.userId, targetUserId),
      ),
    );

  return { songId, userId: targetUserId, role };
}

export async function removeCollaborator(
  db: DB,
  songId: string,
  currentUserId: string,
  targetUserId: string,
) {
  await ensureOwner(db, songId, currentUserId);

  await db
    .delete(songCollaborators)
    .where(
      and(
        eq(songCollaborators.songId, songId),
        eq(songCollaborators.userId, targetUserId),
      ),
    );

  return { songId, userId: targetUserId };
}
