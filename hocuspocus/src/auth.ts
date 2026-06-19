import { jwtVerify, type JWTPayload } from "jose";
import { env } from "./env";

// Vérifie les mêmes JWT HS256 que ceux émis par l'app (AUTH_SECRET partagé).
export interface Claims extends JWTPayload {
  sub: string;
  tid: string;
  role: string;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export async function verifyToken(token: string): Promise<Claims> {
  const { payload } = await jwtVerify<Claims>(token, secret(), { algorithms: ["HS256"] });
  return payload;
}
