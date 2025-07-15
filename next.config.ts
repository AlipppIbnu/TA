import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* opsi konfigurasi di sini */
  
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

  // Favicon web menggunakan logo_web.png yang sudah dikonversi menjadi favicon.ico dan diletakkan di folder public
  // Tidak perlu konfigurasi tambahan jika file favicon.ico sudah ada di public
};

export default nextConfig;