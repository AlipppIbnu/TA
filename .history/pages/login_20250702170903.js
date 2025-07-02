// pages/auth/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Image from "next/image";
import { login, getCurrentUser } from "../../lib/authService";

export default function Login() {
  // State management
  const [email, setEmail] = useState("");             // State untuk input email
  const [password, setPassword] = useState("");       // State untuk input password
  const [showPassword, setShowPassword] = useState(false); // Tampilkan/sembunyikan password
  const [error, setError] = useState(null);           // Untuk menampilkan pesan error
  const [loading, setLoading] = useState(true);       // Untuk menangani loading saat auth
  
  const router = useRouter();

  // Cek apakah user sudah login
  useEffect(() => {
    const user = getCurrentUser();
      if (user) {
      router.replace("/dashboard");
      }
    setLoading(false);
  }, [router]);

  /**
   * Fungsi login saat submit
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Proses login dengan Directus
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Email atau password salah!");
    }
  };

  // Loading screen saat cek autentikasi
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar Logo - diperbaiki untuk mencegah terpotong */}
      <nav className="w-full h-24 flex items-center px-8 border-b bg-white">
        <Link href="/auth/login">
          <Image
            src="/icon/logo_web.png"
            alt="Vehitrack Logo"
            width={120}
            height={40}
            className="cursor-pointer"
            priority
          />
        </Link>
      </nav>

      {/* Konten Utama - ukuran dikecilkan dengan spacing yang diperbaiki */}
      <div className="flex justify-center items-center flex-1 px-8 py-6">
        <div className="flex w-full max-w-[700px] space-x-12 items-center">
          {/* Kiri - Gambar - dikecilkan */}
          <div className="flex-1">
            <Image
              src="/icon/map.png"
              alt="Map Preview"
              width={500}
              height={300}
              className="rounded-lg shadow-md object-cover w-full h-auto"
            />
          </div>

          {/* Kanan - Form Login - diperbesar sedikit */}
          <div className="w-[280px] flex flex-col items-center">
            {/* Logo kecil */}
            <div className="mb-4">
              <Link href="/auth/login">
                <Image
                  src="/icon/logo_web.png"
                  alt="Vehitrack Logo"
                  width={120}
                  height={35}
                  className="cursor-pointer"
                />
              </Link>
            </div>

            {/* Tampilkan pesan error jika ada - dikecilkan */}
            {error && (
              <div 
                className="mb-2 w-full"
              >
                <p 
                  className="text-red-500 text-xs text-center"
                >
                  {error}
                </p>
              </div>
            )}

            {/* Form Login - diperbesar sedikit */}
            <form 
              onSubmit={handleLogin} 
              className="space-y-3 w-full"
            >
              {/* Input Email - diperbesar sedikit */}
              <div className="w-full">
                <input
                  name="email"
                  type="email"
                  placeholder="Enter Email"
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                  required
                />
              </div>

              {/* Input Password dengan toggle show/hide - diperbesar sedikit */}
              <div className="relative w-full">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label="Password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-auto h-auto p-0 m-0 bg-transparent text-gray-700 hover:text-gray-900 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? 
                    <FaEyeSlash size={14} /> : 
                    <FaEye size={14} />
                  }
                </button>
              </div>

              {/* Forgot Password - diperbesar sedikit */}
                <div className="flex justify-end text-sm">
                <Link 
                  href="/reset-password" 
                  className="text-blue-500"     
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Tombol Login - diperbesar sedikit */}
              <div className="w-full">
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-md transition font-semibold text-base"
                  aria-label="Log in to your account"
                >
                  Log in
                </button>
              </div>
            </form>

            {/* Link ke Register - diperbesar sedikit */}
            <div className="text-center mt-3 text-sm">
              <Link 
                href="/auth/register" 
                className="text-blue-500"                   
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}