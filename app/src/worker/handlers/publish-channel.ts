import type { Job } from "bullmq";
import { withTenant } from "../../lib/db";
import type { PublishChannelJob } from "../types";

// STUB : à terme, publie sur le canal (web public via public-site, PDF, LinkedIn mode dégradé).
// Ici on marque la publication comme publiée + journal d'audit.
export async function publishChannel(job: Job<PublishChannelJob>) {
  const { tenantId, userId, publicationId } = job.data;
  console.log(`[publish] publish-channel publication=${publicationId} tenant=${tenantId}`);

  return withTenant(tenantId, userId, async (db) => {
    await db.query(
      `UPDATE publication SET status = 'published', published_at = now() WHERE id = $1`,
      [publicationId],
    );
    await db.query(
      `INSERT INTO validation_log (tenant_id, entity_type, entity_id, action, actor_user_id)
       VALUES ($1, 'deliverable', $2, 'published', NULLIF($3, '')::uuid)`,
      [tenantId, publicationId, userId ?? ""],
    );
    return { publicationId, status: "published" };
  });
}
