import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// SSR (rendu à la demande) : nécessaire pour servir les pages publiques d'un tenant
// résolu par sous-domaine au runtime. Adapter node "standalone" -> dist/server/entry.mjs.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { host: true, port: 4321 },
});
