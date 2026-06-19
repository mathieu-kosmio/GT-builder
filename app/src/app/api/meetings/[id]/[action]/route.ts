import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@/lib/db";
import { getQueue } from "@/lib/queue";
import { getAuth, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/meetings/<id>/transcribe  (forme spec : /meetings/:id:transcribe)
// Crée le transcript (pending) puis enqueue le job de transcription.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  const auth = getAuth(req);
  if (!auth) return jsonError("no tenant", 401);
  if (action !== "transcribe") return jsonError("unknown action", 404);

  const transcriptId = await withTenant(auth.tenantId, auth.userId, async (db) => {
    const m = await db.query(`SELECT id FROM meeting WHERE id = $1`, [id]);
    if (m.rowCount === 0) return null;

    const { rows } = await db.query(
      `INSERT INTO transcript (tenant_id, meeting_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (meeting_id) DO UPDATE SET status = 'pending'
       RETURNING id`,
      [auth.tenantId, id],
    );
    await db.query(`UPDATE meeting SET status = 'recorded' WHERE id = $1`, [id]);
    return rows[0].id as string;
  });

  if (!transcriptId) return jsonError("meeting not found", 404);

  await getQueue("transcription").add(
    "transcribe",
    { tenantId: auth.tenantId, userId: auth.userId, transcriptId },
    { jobId: `transcribe:${transcriptId}` },
  );

  return NextResponse.json({ transcriptId, enqueued: "transcribe" }, { status: 202 });
}
