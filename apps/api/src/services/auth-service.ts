import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { users } from '../db/schema';
import { hashPassword, verifyPassword } from '../lib/password';
import { createToken, verifyToken } from '../lib/jwt';

type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle>;

export async function register(
  db: DB,
  jwtSecret: string,
  input: { email: string; name: string; password: string },
): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .get();

  if (existing) {
    throw new HTTPException(409, { message: 'Email already registered' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);

  await db.insert(users).values({
    id,
    email: input.email,
    name: input.name,
    passwordHash,
  });

  const token = await createToken(
    { id, email: input.email, name: input.name },
    jwtSecret,
  );

  return { token, user: { id, email: input.email, name: input.name } };
}

export async function login(
  db: DB,
  jwtSecret: string,
  input: { email: string; password: string },
): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .get();

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid email or password' });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new HTTPException(401, { message: 'Invalid email or password' });
  }

  const token = await createToken(
    { id: user.id, email: user.email, name: user.name },
    jwtSecret,
  );

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function refreshToken(
  jwtSecret: string,
  token: string,
): Promise<{ token: string }> {
  try {
    const user = await verifyToken(token, jwtSecret);
    const newToken = await createToken(user, jwtSecret);
    return { token: newToken };
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
}
