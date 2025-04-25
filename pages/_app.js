import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebaseConfig";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isAuthPage = router.pathname.startsWith("/auth");

      if (user) {
        // Jika sudah login dan berada di halaman login/register, arahkan ke dashboard
        if (isAuthPage) router.push("/dashboard");
      } else {
        // Jika belum login dan bukan di halaman auth, redirect ke login
        if (!isAuthPage) router.push("/auth/login");
      }

      setLoading(false);
    });

    return () => unsubscribe(); // Bersihkan listener saat unmount
  }, [router]);

  if (loading) return <div className="h-screen flex items-center justify-center text-xl">Loading...</div>;

  return <Component {...pageProps} />;
}
