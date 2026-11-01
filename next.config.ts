import type { NextConfig } from "next";

const legacy: Record<string, string> = {
  "/pourquoi-sira": "/solution",
  "/solutions": "/pour-qui",
  "/services": "/solution",
  "/reservation": "/solution#billetterie",
  "/reseau": "/solution#flotte",
  "/applications": "/solution",
  "/entreprises": "/pour-qui",
  "/architecture": "/securite#sous-le-capot",
  "/methode": "/securite#sous-le-capot",
  "/faq": "/solution#faq",
  "/contact": "/demo",
};

const nextConfig: NextConfig = {
  async redirects() {
    return Object.entries(legacy).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
