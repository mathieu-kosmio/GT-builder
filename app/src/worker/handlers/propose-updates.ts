import type { Job } from "bullmq";
import { withTenant } from "../../lib/db";
import type { ProposeUpdatesJob } from "../types";

// STUB du moteur de propositions traçées (le différenciant). À terme :
//   1. récupère le CR validé, 2. RAG pgvector pour cibler les sections proches,
//   3. appelle le LLM (getLlm(db,'proposals')) -> patchs par section + rationale,
//   4. matérialise proposal[] (proposed) + provenance_link.
// Ici : crée UNE proposition vide sur la 1re section du livrable du même GT, pour
// câbler le flux DB de bout en bout.
export async function proposeUpdates(job: Job<ProposeUpdatesJob>) {
  const { tenantId, userId, minutesId } = job.data;
  console.log(`[proposals] propose-updates minutes=${minutesId} tenant=${tenantId}`);

  return withTenant(tenantId, userId, async (db) => {
    // CR -> réunion -> GT -> livrable -> 1re section. RLS filtre déjà par tenant.
    const { rows } = await db.query<{ id: string }>(
      `SELECT s.id
         FROM minutes m
         JOIN meeting mt    ON mt.id = m.meeting_id
         JOIN deliverable d ON d.workgroup_id = mt.workgroup_id
         JOIN section s     ON s.deliverable_id = d.id
        WHERE m.id = $1
        ORDER BY s.position
        LIMIT 1`,
      [minutesId],
    );

    // Le squelette tolère l'absence de section (aucune proposition créée).
    if (!rows[0]) {
      return { proposalsCreated: 0 };
    }

    await db.query(
      `INSERT INTO proposal (tenant_id, section_id, source_minutes_id, diff, rationale, status)
       VALUES ($1, $2, $3, $4::jsonb, $5, 'proposed')`,
      [
        tenantId,
        rows[0].id,
        minutesId,
        JSON.stringify({ op: "noop", note: "stub proposal" }),
        "Généré par le squelette (stub, sans appel LLM)",
      ],
    );
    return { proposalsCreated: 1 };
  });
}
