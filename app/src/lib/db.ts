import { Pool, type PoolClient } from "pg";
import { env } from "./env";

let _pool: Pool | null = null;

/** Pool PG paresseux : créé au premier usage (et non à l'import) pour un build sans secrets. */
export function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: env().DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

/**
 * Exécute `fn` dans une TRANSACTION avec le contexte tenant positionné.
 *
 * Pourquoi SET LOCAL (via set_config(..., true)) + transaction :
 * - Le pool `pg` recycle les connexions. Un `SET app.tenant_id` (sans LOCAL) resterait
 *   collé à la connexion et fuiterait sur la requête du tenant suivant -> faille d'isolation.
 * - `set_config(name, value, true)` borne la valeur à la transaction : au COMMIT/ROLLBACK
 *   le GUC est réinitialisé, la connexion rendue au pool est propre.
 * - On passe l'uuid en paramètre lié ($1) — `SET` n'accepte pas de paramètre, `set_config` si.
 * - La policy RLS lit current_setting('app.tenant_id', true) via app_current_tenant().
 *   Sans contexte -> NULL -> aucune ligne visible (fail-closed). TOUTE requête métier
 *   doit donc passer par withTenant().
 */
export async function withTenant<T>(
  tenantId: string,
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
