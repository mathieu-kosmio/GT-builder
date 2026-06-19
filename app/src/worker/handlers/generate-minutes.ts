import type { Job } from "bullmq";
import { withTenant } from "../../lib/db";
import type { GenerateMinutesJob } from "../types";

// STUB : à terme, récupère le transcript et appelle le LLM (getLlm(db,'minutes')) pour
// produire un CR structuré. Ici on crée un brouillon vide (status draft_ai).
export async function generateMinutes(job: Job<GenerateMinutesJob>) {
  const { tenantId, userId, meetingId } = job.data;
  console.log(`[minutes] generate-minutes meeting=${meetingId} tenant=${tenantId}`);

  return withTenant(tenantId, userId, async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO minutes (tenant_id, meeting_id, status, content)
       VALUES ($1, $2, 'draft_ai', '{}'::jsonb)
       RETURNING id`,
      [tenantId, meetingId],
    );
    await db.query(`UPDATE meeting SET status = 'minuted' WHERE id = $1`, [meetingId]);
    return { minutesId: rows[0]?.id };
  });
}
