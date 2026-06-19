/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produit .next/standalone/server.js + un node_modules tracé (image Docker légère).
  output: "standalone",
  // pg/bullmq/ioredis ne doivent pas être bundlés par le runtime serveur de Next :
  // ce sont des modules Node natifs/serveur, résolus depuis node_modules.
  serverExternalPackages: ["pg", "bullmq", "ioredis"],
  // Le squelette n'embarque pas de config ESLint ; ne pas bloquer le build dessus.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
