// pages/_app.js - Next.js App Component dengan SWR Provider
import { useState, useEffect } from "react";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import SWRProvider from "../components/SWRProvider";

/**
 * MyApp - Komponen utama Next.js yang membungkus seluruh aplikasi
 * 
 * @param {Object} props - Properties
 * @param {Component} props.Component - Komponen page yang aktif
 * @param {Object} props.pageProps - Props yang diteruskan ke Component
 * @returns {JSX.Element} Rendered component
 */
export default function MyApp({ Component, pageProps }) {
  // State untuk loading
  const [loading, setLoading] = useState(true);

  // Effect untuk menangani inisialisasi aplikasi
  useEffect(() => {
    // Set loading false setelah komponen dimuat
    setLoading(false);
  }, []);

  // Tampilkan loading indicator saat aplikasi dimuat
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  // Render komponen halaman yang aktif dengan SWR Provider
  return (
    <SWRProvider>
      <Component {...pageProps} />
    </SWRProvider>
  );
}