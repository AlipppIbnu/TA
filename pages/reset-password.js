import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(data.message);
        setTimeout(() => {
          router.push(`/verify-reset-otp?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - VehiTrack</title>
        <meta name="description" content="Reset your VehiTrack password securely" />
      </Head>

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
            <h1 className="text-3xl font-bold text-center mb-2">Reset Password</h1>
            <p className="text-center text-gray-600 mb-8">Masukkan email Anda untuk menerima kode OTP</p>

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
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                placeholder="Enter Email"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-blue-500 text-white p-4 rounded-lg font-semibold text-lg ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                } transition`}
              >
                {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
              </button>
            </form>

            {/* Back to Login */}
            <div className="text-center mt-6">
              <Link href="/auth/login" className="text-blue-500 text-lg">
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 