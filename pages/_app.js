import { useState, useEffect } from "react";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

export default function MyApp({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false); // Set loading false setelah komponen dimuat
  }, []);

  if (loading) return <p>Loading...</p>;

  return <Component {...pageProps} />;
}
