// pages/auth/login.js
import { useState, useEffect } from "react";
import { auth } from "../../lib/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Image from "next/image";

export default function Login() {
  // State management
  const [email, setEmail] = useState("");             // State untuk input email
  const [password, setPassword] = useState("");       // State untuk input password
  const [showPassword, setShowPassword] = useState(false); // Tampilkan/sembunyikan password
  const [rememberMe, setRememberMe] = useState(false);     // State checkbox "remember me"
  const [error, setError] = useState(null);           // Untuk menampilkan pesan error
  const [loading, setLoading] = useState(true);       // Untuk menangani loading saat auth
  
  const router = useRouter();

  // Cek apakah user sudah login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/dashboard");  // Redirect jika sudah login
      } else {
        setLoading(false);            // Hentikan loading jika belum login
      }
    });

    return () => unsubscribe();        // Cleanup listener
  }, [router]);

  // Cek localStorage jika email disimpan (remember me)
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  /**
   * Fungsi login saat submit
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      // Proses autentikasi dengan Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Simpan atau hapus email sesuai dengan pilihan "remember me"
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      router.push("/dashboard"); // Redirect ke dashboard setelah login
    } catch (err) {
      setError("Email atau password salah!");
    }
  };

  // Loading screen saat cek autentikasi
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar Logo */}
      <nav className="w-full h-40 flex items-center px-16 border-b">
        <Link href="/auth/login">
          <Image
            src="/icon/logo_web.png"
            alt="Vehitrack Logo"
            width={300}
            height={0}
            className="cursor-pointer"
          />
        </Link>
      </nav>

      {/* Konten Utama */}
      <div className="flex justify-center items-center flex-1 px-16">
        <div className="flex w-full max-w-[1400px] space-x-24 items-center">
          {/* Kiri - Gambar */}
          <div className="flex-1">
            <Image
              src="/icon/map.png"
              alt="Map Preview"
              width={1000}
              height={600}
              className="rounded-lg shadow-md object-cover w-full h-auto"
            />
          </div>

          {/* Kanan - Form Login */}
          <div className="w-[400px] flex flex-col items-center">
            {/* Logo kecil */}
            <div className="mb-6">
              <Link href="/auth/login">
                <Image
                  src="/icon/logo_web.png"
                  alt="Vehitrack Logo"
                  width={300}
                  height={60}
                  className="cursor-pointer"
                />
              </Link>
            </div>

            {/* Tampilkan pesan error jika ada */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Form Login */}
            <form onSubmit={handleLogin} className="space-y-4 w-full">
              {/* Input Email */}
              <input
                type="email"
                placeholder="Enter Email"
                className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* Input Password dengan toggle show/hide */}
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-auto h-auto p-0 m-0 bg-transparent text-gray-700 hover:text-gray-900 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex justify-between items-center text-md">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-blue-500"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-blue-500">
                  Forgot Password?
                </Link>
              </div>

              {/* Tombol Login */}
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg transition font-semibold text-lg"
              >
                Log in
              </button>
            </form>

            {/* Link ke Register */}
            <div className="text-center mt-5 text-md">
              <Link href="/auth/register" className="text-blue-500">
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}