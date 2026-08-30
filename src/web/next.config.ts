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
            value: "devafusion.com",
          },
        ],
        destination: "https://devafusion.net/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "devafusion.co.uk",
          },
        ],
        destination: "https://devafusion.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
