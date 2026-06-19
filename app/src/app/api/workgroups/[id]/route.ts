import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@/lib/db";
import { getAuth, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuth(req);
  if (!auth) return jsonError("no tenant", 401);

  const workgroup = await withTenant(auth.tenantId, auth.userId, async (db) => {
    const { rows } = await db.query(
      `SELECT id, name, objective, status, created_at FROM workgroup WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  });

  if (!workgroup) return jsonError("not found", 404);
  return NextResponse.json({ workgroup });
}
