// pages/register.js
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { register } from "../lib/authService";

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
      {/* Navbar Logo - diperbaiki untuk mencegah terpotong */}
      <nav className="w-full h-24 flex items-center px-8 border-b bg-white">
        <Link href="/login">
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

      {/* Main Content - dikecilkan dengan spacing yang diperbaiki */}
      <div className="flex justify-center items-center flex-1 px-8 py-6">
        <div className="w-full max-w-[420px]">
          <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

          {/* Error Message - dikecilkan */}
          {error && (
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm text-center w-full">
              {error}
              </div>
            </div>
          )}

          {/* Success Message - dikecilkan */}
          {success && (
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm text-center w-full">
              {success}
              </div>
            </div>
          )}

          {/* Registration Form - dikecilkan */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name - dikecilkan */}
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Enter your full name"
              />
            </div>

            {/* Username - dikecilkan */}
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Choose a username"
              />
            </div>

            {/* Email - dikecilkan */}
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Enter your email"
              />
            </div>

            {/* Phone Number - dikecilkan */}
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Password - dikecilkan */}
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Create a password"
            />
            </div>
            
            {/* Confirm Password - dikecilkan */}
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Confirm your password"
            />
            </div>

            {/* Submit Button - dikecilkan */}
            <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
                className={`w-full px-8 py-3 bg-blue-500 text-white rounded-md font-semibold text-base ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                } transition`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            </div>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500 hover:text-blue-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}