// pages/auth/register.js
import { useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Register() {
  // State untuk form dan UI
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // Tambahkan state untuk pesan sukses
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  /**
   * Handler untuk proses registrasi
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null); // Reset pesan sukses

    // Validasi input
    if (!email || !password || !confirmPassword) {
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
      // Buat user baru
      await createUserWithEmailAndPassword(auth, email, password);
      // Logout setelah register untuk mencegah redirect otomatis ke dashboard
      await signOut(auth);
      // Tampilkan pesan sukses
      setSuccess("✅ Pendaftaran berhasil! Silahkan login dengan akun yang telah dibuat.");
      // Reset form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error during registration:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("❌ Gagal mendaftar. Email sudah terdaftar!");
      } else {
        setError("❌ Gagal mendaftar. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-blue-600">
      {/* Container utama */}
      <div className="bg-white shadow-lg rounded-3xl p-8 flex w-[1920px]">
        {/* Kiri - Gambar */}
        <div className="w-1/2 flex flex-col items-center justify-center">
          <img src="/icon/logo_web.png" alt="VehiTrack Logo" className="w-[40%] h-[40%]" />
          <img src="/icon/map.png" alt="Peta" className="w-[300%] rounded-lg shadow-md" />
        </div>

        {/* Kanan - Form Registrasi */}
        <div className="w-[40%] flex flex-col justify-center mt-20 ml-auto p-20">
          <h1 className="text-4xl font-bold text-gray-800">Register</h1>
          <p className="text-lg text-gray-600 mt-1 text-center">
            Buat akun untuk mulai memantau armada Anda
          </p>

          {/* Tampilkan pesan error jika ada */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4">
              <p className="font-medium text-center">{error}</p>
            </div>
          )}

          {/* Tampilkan pesan sukses jika ada */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mt-4">
              <p className="font-medium text-center">{success}</p>
            </div>
          )}

          {/* Form registrasi */}
          <form onSubmit={handleRegister} className="space-y-4 mt-6">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-5 py-3 border rounded-lg text-lg text-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              className="w-full px-5 py-3 border rounded-lg text-lg text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <input
              type="password"
              placeholder="Konfirmasi Password"
              className="w-full px-5 py-3 border rounded-lg text-lg text-gray-800"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 text-lg rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? "Mendaftarkan..." : "Daftar"}
            </button>
          </form>

          {/* Link ke halaman login */}
          <p className="mt-4 text-lg text-gray-600 text-center">
            Sudah punya akun?{" "}
            <Link href="/auth/login" className="text-blue-500 underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}