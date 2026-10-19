import { jwtVerify, SignJWT } from 'jose';

// Edge-safe: used by middleware as well as server code.
export const SESSION_COOKIE = 'pulse_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(s || 'dev-only-secret-change-me-dev-only-secret');
}

export async function signSession(userId: number) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === 'number' ? payload.uid : null;
  } catch {
    return null;
  }
}
