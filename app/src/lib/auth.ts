import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "./env";

// HS256 via `jose` : fonctionne à la fois dans le runtime Edge du middleware Next
// (WebCrypto) et dans Node (worker, hocuspocus). `AUTH_SECRET` est partagé avec hocuspocus.
const ALG = "HS256";

export const SESSION_COOKIE = "gtb_session";

export interface SessionClaims extends JWTPayload {
  sub: string; // user_id
  tid: string; // tenant_id
  role: string; // role_tenant
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export async function signSession(
  claims: { sub: string; tid: string; role: string },
  ttl: string = "12h",
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify<SessionClaims>(token, secret(), { algorithms: [ALG] });
  return payload;
}
