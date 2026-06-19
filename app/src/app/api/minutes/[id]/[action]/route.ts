import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@/lib/db";
import { getQueue } from "@/lib/queue";
import { getAuth, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/minutes/<id>/validate  (forme spec : /minutes/:id:validate)
// Valide le CR (figé), journalise (append-only), puis déclenche propose-updates.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  const auth = getAuth(req);
  if (!auth) return jsonError("no tenant", 401);
  if (action !== "validate") return jsonError("unknown action", 404);

  const validated = await withTenant(auth.tenantId, auth.userId, async (db) => {
    const upd = await db.query(
      `UPDATE minutes
          SET status = 'validated',
              validated_by = NULLIF($2, '')::uuid,
              validated_at = now()
        WHERE id = $1 AND status <> 'validated'
        RETURNING id`,
      [id, auth.userId ?? ""],
    );
    if (upd.rowCount === 0) return false;

    await db.query(
      `INSERT INTO validation_log (tenant_id, entity_type, entity_id, action, actor_user_id)
       VALUES ($1, 'minutes', $2, 'validated', NULLIF($3, '')::uuid)`,
      [auth.tenantId, id, auth.userId ?? ""],
    );
    return true;
  });

  if (!validated) return jsonError("not found or already validated", 409);

  await getQueue("proposals").add(
    "propose-updates",
    { tenantId: auth.tenantId, userId: auth.userId, minutesId: id },
    { jobId: `propose:${id}` }, // idempotence
  );

  return NextResponse.json({ minutesId: id, enqueued: "propose-updates" }, { status: 202 });
}
