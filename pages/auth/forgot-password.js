import { useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Link reset password telah dikirim ke email Anda.");
    } catch (error) {
      setError("❌ Gagal mengirim email reset: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-blue-600">
      {/* Container utama */}
      <div className="bg-white shadow-lg rounded-3xl p-8 flex w-[1920px]">
        
        {/* Bagian Kiri (Gambar) */}
        <div className="w-1/2 flex flex-col items-center justify-center">
          <img src="/icon/logo_web.png" alt="VehiTrack Logo" className="w-[40%] h-[40%]" />
          <img src="/icon/map.png" alt="Peta" className="w-[300%] rounded-lg shadow-md" />
        </div>

        {/* Bagian Kanan (Form Reset Password) */}
        <div className="w-[40%] flex flex-col justify-center mt-20 ml-auto p-20">
          <h1 className="text-4xl font-bold text-gray-800 text-center">Lupa Password</h1>
          <p className="text-lg text-gray-600 mt-1 text-center">
            Masukkan email Anda untuk menerima link reset password
          </p>

          {/* Notifikasi */}
          {message && <p className="text-green-500 text-lg mt-2 text-center">{message}</p>}
          {error && <p className="text-red-500 text-lg mt-2 text-center">{error}</p>}

          <form onSubmit={handleReset} className="space-y-4 mt-6">
            <input
              type="email"
              placeholder="Masukkan email"
              className="w-full px-5 py-3 border rounded-lg text-lg text-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 text-lg rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
          </form>

          <p className="mt-4 text-lg text-gray-600 text-center">
            <Link href="/auth/login" className="text-blue-500 underline">
              Kembali ke Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
