import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Telegram webhooks send larger payloads for photos/voice */
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
