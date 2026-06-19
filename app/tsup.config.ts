import { defineConfig } from "tsup";

// Compile l'entrée worker en un bundle CJS exécutable : dist/worker.js
// (le service "worker" du docker-compose lance `node dist/worker.js`).
// Le package n'a pas "type":"module" -> .js = CommonJS, cohérent avec format "cjs".
export default defineConfig({
  entry: { worker: "src/worker/index.ts" },
  outDir: "dist",
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  sourcemap: true,
  clean: true,
  // Modules natifs / lourds : laissés dans node_modules plutôt que bundlés.
  external: [
    "pg",
    "pg-native",
    "bullmq",
    "ioredis",
    "openai",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
});
