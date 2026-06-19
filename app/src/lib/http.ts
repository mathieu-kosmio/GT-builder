import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Contexte d'authentification injecté par le middleware (headers vérifiés depuis le JWT). */
export interface AuthContext {
  tenantId: string;
  userId: string | null;
  role: string | null;
}

export function getAuth(req: NextRequest): AuthContext | null {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return null;
  return {
    tenantId,
    userId: req.headers.get("x-user-id"),
    role: req.headers.get("x-user-role"),
  };
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
