import type { Job } from "bullmq";
import { withTenant } from "../../lib/db";
import type { EmbedSectionJob } from "../types";

// STUB : à terme, récupère le texte de la section et appelle l'API embeddings
// (getLlm(db,'embeddings')) pour produire un vecteur. Ici, vecteur nul de dim 1024
// (dimension de la colonne section_embedding.embedding).
const ZERO_VECTOR = `[${Array(1024).fill(0).join(",")}]`;

export async function embedSection(job: Job<EmbedSectionJob>) {
  const { tenantId, userId, sectionId } = job.data;
  console.log(`[embeddings] embed-section section=${sectionId} tenant=${tenantId}`);

  return withTenant(tenantId, userId, async (db) => {
    await db.query(
      `INSERT INTO section_embedding (tenant_id, section_id, embedding, model)
       VALUES ($1, $2, $3::vector, $4)`,
      [tenantId, sectionId, ZERO_VECTOR, "stub-zero-1024"],
    );
    return { sectionId, embedded: true };
  });
}
