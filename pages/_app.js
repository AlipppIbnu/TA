import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebaseConfig";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("vehitrackUser") || sessionStorage.getItem("vehitrackUser");

    if (storedUser) {
      auth.onAuthStateChanged((user) => {
        if (!user) {
          localStorage.removeItem("vehitrackUser");
          sessionStorage.removeItem("vehitrackUser");
          router.push("/auth/login");
        }
      });
    } else {
      router.push("/auth/login");
    }

    setLoading(false);
  }, []);

  if (loading) return <p>Loading...</p>;

  return <Component {...pageProps} />;
}
