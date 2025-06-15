// pages/auth/register.js
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { register } from "../../lib/authService";

export default function Register() {
  // State untuk form dan UI
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Handler untuk proses registrasi
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validasi input
    if (!email || !password || !confirmPassword || !fullName || !username) {
      setError("❗ Semua bidang harus diisi!");
      return;
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("❗ Format email tidak valid.");
      return;
    }

    // Validasi password cocok
    if (password !== confirmPassword) {
      setError("❗ Password dan Konfirmasi Password tidak cocok.");
      return;
    }

    // Proses registrasi
    try {
      setLoading(true);
      
      const result = await register({
        email,
        password,
        fullName,
        username,
        phoneNumber
      });

      if (!result.success) {
        setError("❌ " + result.error);
        return;
      }

      // Tampilkan pesan sukses
      setSuccess("✅ Pendaftaran berhasil! Silahkan login dengan akun yang telah dibuat.");
      
      // Reset form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setUsername("");
      setPhoneNumber("");
      
    } catch (err) {
      console.error("Error during registration:", err);
      setError("❌ Gagal mendaftar. " + err.message);
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
      <div className="flex justify-center items-center flex-1 px-16 py-8">
        <div className="w-full max-w-[500px]">
          <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Choose a username"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-gray-700 mb-2">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Create a password"
            />
            </div>
            
            {/* Confirm Password */}
            <div>
              <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Confirm your password"
            />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-500 text-white p-4 rounded-lg font-semibold text-lg ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:text-blue-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}