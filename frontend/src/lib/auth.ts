// src/lib/auth.ts
// JWT helpers using the `jose` library (Edge Runtime compatible)

import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'enteprintlabs-dev-secret-change-in-production'
);

const ALGORITHM = 'HS256';
const EXPIRY    = '24h';

export async function signToken(payload: { sub: string; role: string; username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { sub: string; role: string; username: string };
  } catch {
    return null;
  }
}

/** Extract Bearer token from Authorization header */
export function extractBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
