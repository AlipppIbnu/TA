import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const SidebarComponent = ({ vehicles }) => {
    const router = useRouter();
    const [filter, setFilter] = useState("ALL");

    // ✅ Listen perubahan auth state untuk redirect ke login jika user logout
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.replace("/auth/login"); // 🔥 Paksa redirect ke login jika user logout
            }
        });
        return () => unsubscribe();
    }, [router]);

    // ✅ Fungsi logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setTimeout(() => {
                router.replace("/auth/login"); // 🔥 Tambahkan delay agar Firebase sempat update state
            }, 500);
        } catch (error) {
            console.error("Logout gagal:", error);
        }
    };

    // ✅ Filter kendaraan berdasarkan status
    const filteredVehicles = vehicles.filter(vehicle => {
        if (filter === "ALL") return true;
        return vehicle.status.toLowerCase() === filter.toLowerCase();
    });

    return (
        <div className="w-80 bg-white shadow-md h-screen flex flex-col p-4">
            <h1 className="text-2xl font-bold text-center mb-4">🚗 VehiTrack</h1>

            {/* Filter ALL, Online, Offline */}
            <div className="flex justify-around mb-4">
                {["ALL", "Online", "Offline"].map((status) => (
                    <button
                        key={status}
                        className={`px-3 py-1 rounded-md ${
                            filter === status ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                        onClick={() => setFilter(status)}
                    >
                        {status} ({vehicles.filter(v => v.status.toLowerCase() === status.toLowerCase()).length})
                    </button>
                ))}
            </div>

            {/* Daftar Kendaraan */}
            <div className="flex-grow overflow-y-auto">
                {filteredVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-2 bg-gray-100 rounded-md mb-2">
                        <div>
                            <p className="font-bold">{vehicle.name}</p>
                            <p className="text-sm text-gray-600">{vehicle.time}</p>
                        </div>
                        <span className={`text-sm ${vehicle.status === "online" ? "text-green-500" : "text-red-500"}`}>
                            {vehicle.status === "online" ? "🟢" : "🔴"}
                        </span>
                    </div>
                ))}
            </div>

            {/* Kontrol Perangkat */}
            <div className="mt-4">
                <button className="w-full py-2 bg-green-500 text-white mb-2 rounded-md">ENGINE ON</button>
                <button className="w-full py-2 bg-red-500 text-white mb-2 rounded-md">ENGINE OFF</button>
                <button className="w-full py-2 bg-gray-300 mb-2 rounded-md">PLAYBACK</button>
                <button className="w-full py-2 bg-gray-300 mb-2 rounded-md">SET GEOFENCE</button>
                <button className="w-full py-2 bg-blue-500 text-white mb-2 rounded-md">FOCUS MODE</button>
            </div>

            {/* Tombol Logout */}
            <button 
                onClick={handleLogout} 
                className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-center">
                Logout
            </button>
        </div>
    );
};

export default SidebarComponent;
