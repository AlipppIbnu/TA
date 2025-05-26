import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: true, // set to false if this might change in the future
      },
    ];
  },
};

export default nextConfig;