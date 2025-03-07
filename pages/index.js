import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseConfig";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null); // ✅ Tambahkan useState untuk user

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.replace("/dashboard"); // 🔥 Redirect ke dashboard jika user sudah login
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="h-screen bg-blue-100">
      {/* Navbar */}
      <header className="flex justify-between items-center px-12 py-4 bg-blue-200 shadow-md">
        <div className="flex items-center">
          <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={120} height={40} />
        </div>
        <nav className="hidden md:flex space-x-8">
          <Link href="#" className="text-gray-700 font-medium hover:text-blue-600">Layanan</Link>
          <Link href="#" className="text-gray-700 font-medium hover:text-blue-600">Produk</Link>
          <Link href="#" className="text-gray-700 font-medium hover:text-blue-600">Platform</Link>
          <Link href="#" className="text-gray-700 font-medium hover:text-blue-600">Hubungi</Link>
        </nav>
        <Link href="/auth/login">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700">
            Login
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col md:flex-row items-center justify-between px-6 md:px-16 h-[85vh]">
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            GPS FLEET TRACKING <br />
            YANG DAPAT DI ANDALKAN{" "}
            <span className="text-blue-600">VehiTrack</span>
          </h1>
          <p className="text-gray-700 mt-6 text-base md:text-lg">
            Kendali armada kini lebih mudah dengan pelacakan real-time!
          </p>
          <div className="mt-6 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-6">
            <button className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-md font-semibold hover:bg-blue-50">
              BANTUAN
            </button>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700">
              BUY NOW
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
