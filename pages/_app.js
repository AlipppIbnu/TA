// pages/_app.js - Next.js App Component
import { useState, useEffect } from "react";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useRouter } from 'next/router'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

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
  const router = useRouter()

  // Effect untuk menangani inisialisasi aplikasi
  useEffect(() => {
    // Set loading false setelah komponen dimuat
    setLoading(false);

    const handleRouteChange = (url) => {
      console.log('App is changing to: ', url)
    }

    router.events.on('routeChangeStart', handleRouteChange)

    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router]);

  // Tampilkan loading indicator saat aplikasi dimuat
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
  }

  // Render komponen halaman yang aktif
  return (
    <>
      <Component {...pageProps} />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}