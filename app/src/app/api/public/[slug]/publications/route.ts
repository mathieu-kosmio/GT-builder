import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Endpoint PUBLIC (sans JWT) consommé par public-site pour afficher les livrables publiés.
// TODO : résoudre le tenant par slug via une fonction SQL SECURITY DEFINER (le rôle app
// est soumis au RLS et ne peut pas lire la table tenant sans contexte), puis lister les
// publications status='published' sous withTenant(tenantId, null). Stub : liste vide.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json({ tenant: { slug }, publications: [] });
}
