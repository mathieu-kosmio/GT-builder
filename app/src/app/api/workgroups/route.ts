import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@/lib/db";
import { getAuth, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return jsonError("no tenant", 401);

  const workgroups = await withTenant(auth.tenantId, auth.userId, async (db) => {
    const { rows } = await db.query(
      `SELECT id, name, objective, status, created_at
         FROM workgroup ORDER BY created_at DESC`,
    );
    return rows;
  });
  return NextResponse.json({ workgroups });
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return jsonError("no tenant", 401);

  const body = (await req.json().catch(() => null)) as { name?: string; objective?: string } | null;
  if (!body?.name) return jsonError("name required");

  try {
    const workgroup = await withTenant(auth.tenantId, auth.userId, async (db) => {
      const { rows } = await db.query(
        `INSERT INTO workgroup (tenant_id, name, objective)
         VALUES ($1, $2, $3)
         RETURNING id, name, objective, status, created_at`,
        [auth.tenantId, body.name, body.objective ?? null],
      );
      return rows[0];
    });
    return NextResponse.json({ workgroup }, { status: 201 });
  } catch (err) {
    // Le trigger de quota lève check_violation (SQLSTATE 23514) -> invite à upgrader.
    const e = err as { code?: string; message?: string };
    if (e.code === "23514") return jsonError(e.message ?? "quota atteint", 402);
    throw err;
  }
}
