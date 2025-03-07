import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarComponent from "../components/SidebarComponent";

// Load MapComponent secara dinamis
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [vehicles] = useState([
        { id: 1, name: "D 1953 FTE", time: "15/07/2025, 05:12:00", status: "online", position: [52.4862, -1.8904] },
        { id: 2, name: "D 1723 FEB", time: "15/07/2025, 04:13:00", status: "offline", position: [51.5074, -0.1278] },
    ]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.replace("/");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

    return (
        <div className="h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <SidebarComponent vehicles={vehicles} />

            {/* Peta */}
            <div className="flex-grow">
                <MapComponent vehicles={vehicles} />
            </div>
        </div>
    );
}
