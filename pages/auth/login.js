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
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-screen">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="login-page">
      {/* Navbar Logo */}
      <nav className="w-full h-40 flex items-center px-16 border-b" data-testid="navbar">
        <Link href="/auth/login">
          <Image
            src="/icon/logo_web.png"
            alt="Vehitrack Logo"
            width={300}
            height={0}
            className="cursor-pointer"
            data-testid="navbar-logo"
          />
        </Link>
      </nav>

      {/* Konten Utama */}
      <div className="flex justify-center items-center flex-1 px-16" data-testid="main-content">
        <div className="flex w-full max-w-[1400px] space-x-24 items-center">
          {/* Kiri - Gambar */}
          <div className="flex-1" data-testid="image-section">
            <Image
              src="/icon/map.png"
              alt="Map Preview"
              width={1000}
              height={600}
              className="rounded-lg shadow-md object-cover w-full h-auto"
              data-testid="map-preview-image"
            />
          </div>

          {/* Kanan - Form Login */}
          <div className="w-[400px] flex flex-col items-center" data-testid="login-form-section">
            {/* Logo kecil */}
            <div className="mb-6" data-testid="form-logo-container">
              <Link href="/auth/login">
                <Image
                  src="/icon/logo_web.png"
                  alt="Vehitrack Logo"
                  width={300}
                  height={60}
                  className="cursor-pointer"
                  data-testid="form-logo"
                />
              </Link>
            </div>

            {/* Tampilkan pesan error jika ada */}
            {error && (
              <div 
                className="mb-4 w-full"
                data-testid="error-message-container"
              >
                <p 
                  className="text-red-500 text-sm text-center"
                  id="error-message"
                  data-testid="error-message"
                >
                  {error}
                </p>
              </div>
            )}

            {/* Form Login */}
            <form 
              onSubmit={handleLogin} 
              className="space-y-4 w-full"
              id="login-form"
              data-testid="login-form"
            >
              {/* Input Email */}
              <div className="w-full" data-testid="email-input-container">
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  placeholder="Enter Email"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="email-input"
                  aria-label="Email address"
                  required
                />
              </div>

              {/* Input Password dengan toggle show/hide */}
              <div className="relative w-full" data-testid="password-input-container">
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="password-input"
                  aria-label="Password"
                  required
                />
                <button
                  id="password-toggle-button"
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-auto h-auto p-0 m-0 bg-transparent text-gray-700 hover:text-gray-900 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? 
                    <FaEyeSlash size={20} data-testid="hide-password-icon" /> : 
                    <FaEye size={20} data-testid="show-password-icon" />
                  }
                </button>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end text-md" data-testid="forgot-password-container">
                <Link 
                  href="/reset-password" 
                  className="text-blue-500"
                  id="forgot-password-link"
                  data-testid="forgot-password-link"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Tombol Login */}
              <div className="w-full" data-testid="login-button-container">
                <button
                  id="login-submit-button"
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg transition font-semibold text-lg"
                  data-testid="login-submit-button"
                  aria-label="Log in to your account"
                >
                  Log in
                </button>
              </div>
            </form>

            {/* Link ke Register */}
            <div className="text-center mt-5 text-md" data-testid="register-link-container">
              <Link 
                href="/auth/register" 
                className="text-blue-500"
                id="register-link"
                data-testid="register-link"
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