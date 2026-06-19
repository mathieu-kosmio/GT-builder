import OpenAI from "openai";
import type { PoolClient } from "pg";
import { env } from "./env";

export type LlmPurpose = "default" | "minutes" | "proposals" | "embeddings";

export interface ResolvedLlm {
  client: OpenAI;
  model: string;
}

/**
 * Résout la config LLM pour (tenant courant, purpose). Doit être appelé dans une connexion
 * déjà sous withTenant() : le SELECT sur llm_config est filtré par RLS.
 * Le déchiffrement de la clé API se fait EN SQL (pgcrypto pgp_sym_decrypt), pas en JS.
 * Fallback complet sur l'env LLM_* si aucune config tenant (squelette amorçable).
 */
export async function getLlm(client: PoolClient, purpose: LlmPurpose): Promise<ResolvedLlm> {
  const e = env();
  const { rows } = await client.query<{
    base_url: string | null;
    model: string;
    api_key: string | null;
  }>(
    `SELECT base_url,
            model,
            CASE WHEN api_key_enc IS NULL THEN NULL
                 ELSE pgp_sym_decrypt(api_key_enc, $2) END AS api_key
       FROM llm_config
      WHERE purpose = $1 AND is_active = true
      LIMIT 1`,
    [purpose, e.LLM_KEY_SECRET ?? e.AUTH_SECRET],
  );

  const cfg = rows[0];
  const baseURL = cfg?.base_url ?? e.LLM_BASE_URL;
  const apiKey = cfg?.api_key ?? e.LLM_API_KEY ?? "sk-noop";
  const model = cfg?.model ?? e.LLM_MODEL;

  return { client: new OpenAI({ baseURL, apiKey }), model };
}
