import type { Job } from "bullmq";
import { withTenant } from "../../lib/db";
import type { TranscribeJob } from "../types";

// STUB : à terme, appelle l'API de transcription souveraine (TRANSCRIBE_BASE_URL),
// insère les transcript_segment diarisés. Ici on marque seulement le transcript prêt.
export async function transcribe(job: Job<TranscribeJob>) {
  const { tenantId, userId, transcriptId } = job.data;
  console.log(`[transcription] transcribe transcript=${transcriptId} tenant=${tenantId}`);

  return withTenant(tenantId, userId, async (db) => {
    await db.query(
      `UPDATE transcript SET status = 'ready' WHERE id = $1`,
      [transcriptId],
    );
    return { transcriptId, status: "ready" };
  });
}
