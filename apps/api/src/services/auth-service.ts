import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { users } from '../db/schema';
import { hashPassword, verifyPassword } from '../lib/password';
import { createToken, verifyToken } from '../lib/jwt';
import { generateSecret, generateOtpAuthUri, verifyTotp } from './totp-service';

type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle>;

type LoginResult =
  | { token: string; user: { id: string; email: string; name: string }; requires2fa?: never }
  | { requires2fa: true; token?: never; user?: never };

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
): Promise<LoginResult> {
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

  if (user.totpEnabled) {
    return { requires2fa: true };
  }

  const token = await createToken(
    { id: user.id, email: user.email, name: user.name },
    jwtSecret,
  );

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function loginWith2fa(
  db: DB,
  jwtSecret: string,
  input: { email: string; password: string; code: string },
  opts?: { devBypass?: boolean },
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

  if (!user.totpEnabled || !user.totpSecret) {
    throw new HTTPException(400, { message: '2FA is not enabled for this account' });
  }

  const codeValid = await verifyTotp(user.totpSecret, input.code, { devBypass: opts?.devBypass });
  if (!codeValid) {
    throw new HTTPException(401, { message: 'Invalid 2FA code' });
  }

  const token = await createToken(
    { id: user.id, email: user.email, name: user.name },
    jwtSecret,
  );

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function setup2fa(
  db: DB,
  userId: string,
): Promise<{ secret: string; uri: string }> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new HTTPException(404, { message: 'User not found' });
  if (user.totpEnabled) throw new HTTPException(400, { message: '2FA is already enabled' });

  const secret = generateSecret();
  await db.update(users).set({ totpSecret: secret }).where(eq(users.id, userId));

  const uri = generateOtpAuthUri(secret, user.email);
  return { secret, uri };
}

export async function verifySetup2fa(
  db: DB,
  userId: string,
  code: string,
  opts?: { devBypass?: boolean },
): Promise<void> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new HTTPException(404, { message: 'User not found' });
  if (!user.totpSecret) throw new HTTPException(400, { message: 'Call setup first' });
  if (user.totpEnabled) throw new HTTPException(400, { message: '2FA is already enabled' });

  const valid = await verifyTotp(user.totpSecret, code, { devBypass: opts?.devBypass });
  if (!valid) throw new HTTPException(401, { message: 'Invalid 2FA code' });

  await db.update(users).set({ totpEnabled: 1 }).where(eq(users.id, userId));
}

export async function disable2fa(
  db: DB,
  userId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ totpEnabled: 0, totpSecret: null })
    .where(eq(users.id, userId));
}

export async function refreshToken(
  jwtSecret: string,
  token: string,
): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
  try {
    const user = await verifyToken(token, jwtSecret);
    const newToken = await createToken(user, jwtSecret);
    return { token: newToken, user: { id: user.id, email: user.email, name: user.name } };
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
}
