import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

// Client S3 (stockage objet souverain : Scaleway / OVH / Garage). Paresseux.
let _s3: S3Client | null = null;

export function s3(): S3Client {
  if (!_s3) {
    const e = env();
    _s3 = new S3Client({
      endpoint: e.S3_ENDPOINT,
      region: e.S3_REGION ?? "fr-par",
      forcePathStyle: true,
      credentials:
        e.S3_ACCESS_KEY && e.S3_SECRET_KEY
          ? { accessKeyId: e.S3_ACCESS_KEY, secretAccessKey: e.S3_SECRET_KEY }
          : undefined,
    });
  }
  return _s3;
}

/** Clés S3 préfixées par tenant (isolation du stockage objet). */
export function tenantKey(tenantId: string, ...parts: string[]): string {
  return [tenantId, ...parts].join("/");
}
