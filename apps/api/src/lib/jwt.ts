import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from '../types';

const ALG = 'HS256';
const EXPIRY = '24h';

function getSecret(jwtSecret: string) {
  return new TextEncoder().encode(jwtSecret);
}

export async function createToken(
  user: AuthUser,
  jwtSecret: string,
): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret(jwtSecret));
}

export async function verifyToken(
  token: string,
  jwtSecret: string,
): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getSecret(jwtSecret));
  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string,
  };
}
