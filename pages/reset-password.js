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
    } catch {
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
        {/* Navbar Logo - dikecilkan */}
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

        {/* Main Content - dikecilkan */}
        <div className="flex justify-center items-center flex-1 px-8 py-6">
          <div className="w-full max-w-[350px]">
            <h1 className="text-xl font-bold text-center mb-2">Reset Password</h1>
            <p className="text-center text-gray-600 mb-6 text-sm">Masukkan email Anda untuk menerima kode OTP</p>

            {/* Error Message - dikecilkan */}
            {error && (
              <div className="flex justify-center mb-2">
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs text-center max-w-[250px]">
                {error}
                </div>
              </div>
            )}

            {/* Success Message - dikecilkan */}
            {message && (
              <div className="flex justify-center mb-2">
                <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-xs text-center max-w-[250px]">
                {message}
                </div>
              </div>
            )}

            {/* Reset Password Form - dikecilkan */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-base"
                placeholder="Enter Email"
                required
              />

              <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                  className={`max-w-[200px] px-8 py-3 bg-blue-500 text-white rounded-md font-semibold text-base ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                } transition`}
              >
                {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
              </button>
              </div>
            </form>

            {/* Back to Login - dikecilkan */}
            <div className="text-center mt-4">
              <Link href="/auth/login" className="text-blue-500 text-sm">
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 