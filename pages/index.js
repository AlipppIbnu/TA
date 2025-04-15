import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseConfig";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.replace("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#D0E1F2]">
      {/* Navbar */}
      <header className="flex justify-between items-center px-12 py-4 bg-white shadow-md">
        {/* Logo */}
        <Link href="/">
          <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={180} height={50} className="cursor-pointer" />
        </Link>

        {/* Menu Navigasi */}
        <nav className="hidden md:flex space-x-8 text-lg">
          <Link href="#" className="text-gray-900 font-medium hover:text-blue-600">Layanan</Link>
          <Link href="#" className="text-gray-900 font-medium hover:text-blue-600">Produk</Link>
          <Link href="#" className="text-gray-900 font-medium hover:text-blue-600">Platform</Link>
          <Link href="#" className="text-gray-900 font-medium hover:text-blue-600">Hubungi</Link>
        </nav>

        {/* Tombol Login */}
        <Link href="/auth/login">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 shadow-md">
            Login
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col md:flex-row items-center justify-between px-8 md:px-16 py-12">
        {/* Bagian Kiri - Teks */}
        <div className="w-full md:w-[45%] text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            GPS FLEET TRACKING <br />
            YANG DAPAT DI ANDALKAN <br />
            <span className="text-blue-600">VehiTrack</span>
          </h1>
          <p className="text-gray-700 mt-6 text-lg leading-relaxed">
            VEHITRACK adalah solusi GPS andalan untuk rental dan manajemen armada.
            Dengan pelacakan real-time, geofencing, dan laporan perjalanan, kendali
            armada kini lebih mudah!
          </p>

          {/* Tombol Bantuan & Buy Now */}
          <div className="mt-6 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-6">
            <button className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-md font-semibold hover:bg-blue-50 shadow-md">
              BANTUAN
            </button>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 shadow-md">
              BUY NOW
            </button>
          </div>
        </div>

        {/* Bagian Kanan - Gambar */}
        <div className="w-full md:w-[50%] mt-10 md:mt-0 flex justify-center">
          <Image
            src="/icon/logo_home.png"
            alt="Map Illustration"
            width={800}
            height={800}
            className="rounded-xl shadow-lg"
          />
        </div>
      </main>
    </div>
  );
}
