import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts" },
  outDir: "dist",
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  sourcemap: true,
  clean: true,
  // @hocuspocus/server tire ws/yjs : on ne le bundle pas, il reste dans node_modules.
  external: ["@hocuspocus/server"],
});
