import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Hapus atau comment redirects() untuk memungkinkan akses ke homepage
  // async redirects() {
  //   return [
  //     {
  //       source: '/',
  //       destination: '/auth/login',
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default nextConfig;