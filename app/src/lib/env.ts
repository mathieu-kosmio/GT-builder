import { z } from "zod";

// Validation des variables d'environnement.
// IMPORTANT : env() est appelé À L'EXÉCUTION (pas à l'import) pour que `next build`
// réussisse sans secrets. Les ressources lourdes (pool PG, Valkey) sont aussi paresseuses.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  VALKEY_URL: z.string(), // redis://:pass@valkey:6379
  AUTH_SECRET: z.string().min(16),
  PUBLIC_BASE_DOMAIN: z.string().default("gtbuilder.fr"),

  // LLM (endpoint OpenAI-compatible) — fallback si pas de config tenant
  LLM_BASE_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("mistral-large-latest"),
  // Clé symétrique pgcrypto pour pgp_sym_decrypt(api_key_enc) ; à défaut, AUTH_SECRET
  LLM_KEY_SECRET: z.string().optional(),

  // Services internes
  HOCUSPOCUS_URL: z.string().optional(),
  GOTENBERG_URL: z.string().url().optional(),

  // Stockage objet S3-compatible
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Transcription (worker)
  TRANSCRIBE_BASE_URL: z.string().optional(),
  TRANSCRIBE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
