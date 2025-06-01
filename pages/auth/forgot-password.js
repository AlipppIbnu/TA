// pages/auth/forgot-password.js
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import directusConfig from "../../lib/directusConfig";

export default function ForgotPassword() {
  // State management
  const [email, setEmail] = useState("");           // State input email
  const [message, setMessage] = useState("");       // Pesan sukses
  const [error, setError] = useState("");           // Pesan error
  const [loading, setLoading] = useState(false);    // Status loading

  /**
   * Fungsi kirim email reset password
   */
  const handleReset = async (e) => {
    e.preventDefault();

    // Reset pesan dan set status loading
    setMessage("");
    setError("");
    setLoading(true);

    try {
      // Cek apakah email terdaftar
      const checkResponse = await fetch(
        `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
        {
          headers: directusConfig.headers,
        }
      );

      const checkResult = await checkResponse.json();
      
      if (!checkResult.data || checkResult.data.length === 0) {
        throw new Error("Email tidak terdaftar");
      }

      // Kirim request reset password ke endpoint Directus
      const response = await fetch(`${directusConfig.baseURL}/auth/password/request`, {
        method: 'POST',
        headers: directusConfig.headers,
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim email reset password");
      }

      setMessage("✅ Link reset password telah dikirim ke email Anda.");
    } catch (error) {
      setError("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Main Content */}
      <div className="flex justify-center items-center flex-1 px-16">
        <div className="w-full max-w-[400px]">
          <h1 className="text-3xl font-bold text-center mb-6">Reset Password</h1>
          <p className="text-gray-600 text-center mb-8">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          {/* Reset Password Form */}
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
              required
            />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-500 text-white p-4 rounded-lg font-semibold text-lg ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>

          {/* Back to Login Link */}
          <p className="text-center mt-6">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:text-blue-600">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}