import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image on the droplet.
  output: "standalone",
  // LAN devices allowed to hit dev-only endpoints (HMR etc.) during `next dev`.
  allowedDevOrigins: ["10.0.0.23"],
};

export default nextConfig;
