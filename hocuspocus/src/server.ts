import { Hocuspocus, type onAuthenticatePayload } from "@hocuspocus/server";
import { verifyToken } from "./auth";
import { env } from "./env";

// Serveur de co-édition temps réel (Yjs CRDT) du livrable vivant.
// - onAuthenticate : valide le JWT émis par l'app (AUTH_SECRET partagé) ; le contexte
//   tenant/user retourné est attaché à la connexion.
// - documentName = yjs_doc_id du livrable (vérification d'appartenance à brancher ici).
//
// Persistance : EN MÉMOIRE pour le squelette (la co-édition fonctionne, mais les documents
// ne survivent pas à un redémarrage). À brancher en 1re migration applicative via
// @hocuspocus/extension-database sur une table yjs_document(name PK, data bytea, tenant_id),
// absente du schéma d'init figé.
const server = new Hocuspocus({
  port: env().PORT,
  address: "0.0.0.0",
  async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
    const claims = await verifyToken(token);
    return {
      userId: claims.sub,
      tenantId: claims.tid,
      role: claims.role,
      documentName,
    };
  },
});

server.listen();
console.log(`hocuspocus up on :${env().PORT}`);
