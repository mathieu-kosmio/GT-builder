// Accès à l'API interne de l'app (réseau Docker : http://app:3000).
const API_BASE_URL = process.env.API_BASE_URL ?? "http://app:3000";

export interface PublishedItem {
  title: string;
  url: string;
}

export interface PublicationsResponse {
  tenant: { slug: string; name?: string };
  publications: PublishedItem[];
}

/** Résout le tenant (par slug) et ses livrables publiés. Tolère une API indisponible. */
export async function fetchPublications(slug: string): Promise<PublicationsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/${encodeURIComponent(slug)}/publications`);
    if (res.ok) return (await res.json()) as PublicationsResponse;
  } catch {
    /* API pas encore prête : on retombe sur un état vide */
  }
  return { tenant: { slug }, publications: [] };
}

/** Extrait le slug tenant depuis l'en-tête Host : <slug>.<PUBLIC_BASE_DOMAIN>. */
export function tenantSlugFromHost(host: string | null): string {
  const h = (host ?? "").split(":")[0];
  const base = process.env.PUBLIC_BASE_DOMAIN ?? "gtbuilder.fr";
  if (!h.endsWith(base)) return "";
  return h.slice(0, -base.length).replace(/\.$/, "");
}
