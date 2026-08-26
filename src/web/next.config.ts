import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: process.cwd(),
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "devafusion.net",
          },
        ],
        destination: "https://devafusion.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
