import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image on the droplet.
  output: "standalone",
};

export default nextConfig;
