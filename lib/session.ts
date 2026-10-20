import { jwtVerify, SignJWT } from 'jose';

// Edge-safe: used by middleware as well as server code.
export const SESSION_COOKIE = 'pulse_session';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(s || 'dev-only-secret-change-me-dev-only-secret');
}

export async function signSession(userId: number, version = 0) {
  return new SignJWT({ uid: userId, sv: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<number | null> {
  return (await readSession(token))?.uid ?? null;
}

/** User ID and session version; the version is compared with the account to sign out old sessions. */
export async function readSession(token: string): Promise<{ uid: number; sv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === 'number' ? { uid: payload.uid, sv: typeof payload.sv === 'number' ? payload.sv : 0 } : null;
  } catch {
    return null;
  }
}
