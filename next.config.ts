import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin usa binários/deps nativas (gRPC etc.) — deixar externo evita
  // que o bundler quebre a API route /api/notify-owner no servidor da Vercel.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
