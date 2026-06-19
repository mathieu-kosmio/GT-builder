import type { Job } from "bullmq";
import type { RenderPdfJob } from "../types";

// STUB : à terme, rend le HTML charté du livrable puis appelle Gotenberg (GOTENBERG_URL)
// pour produire le PDF, stocké en S3 (clé pdf_s3_key sur publication). Ici : log seulement.
export async function renderPdf(job: Job<RenderPdfJob>) {
  const { tenantId, deliverableId } = job.data;
  console.log(`[render] render-pdf deliverable=${deliverableId} tenant=${tenantId} (stub)`);
  return { deliverableId, rendered: false };
}
