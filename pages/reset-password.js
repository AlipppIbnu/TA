import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Main Content */}
        <main className="pt-16 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl w-full">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="grid lg:grid-cols-2">
                {/* Left Side - Form */}
                <div className="p-8 sm:p-12 lg:p-16">
                  <div className="max-w-md mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                        Reset Password
                      </h1>
                      <p className="text-gray-600">
                        Masukkan email Anda untuk menerima kode OTP
                      </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm text-center flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {error}
                        </p>
                      </div>
                    )}

                    {/* Success Message */}
                    {message && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm text-center flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {message}
                        </p>
                      </div>
                    )}

                    {/* Reset Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Masukkan email Anda"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 font-semibold rounded-xl transition-all duration-200 ${
                          loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
                      </button>
                    </form>

                    {/* Back to Login */}
                    <p className="mt-8 text-center text-sm text-gray-600">
                      Ingat password Anda?{' '}
                      <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                        Kembali ke Login
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Right Side - Features */}
                <div className="hidden lg:block relative bg-gradient-to-br from-blue-600 to-blue-700 p-12">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="relative h-full flex flex-col justify-center">
                    <div className="text-center mb-12">
                      <div className="mb-8">
                        <svg className="w-24 h-24 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">
                        Keamanan Akun Anda
                      </h2>
                      <p className="text-blue-100 text-lg">
                        Lindungi akun Anda dengan sistem reset password yang aman menggunakan verifikasi OTP.
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-6 max-w-md mx-auto">
                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Verifikasi OTP yang aman</span>
                      </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Notifikasi email langsung</span>
                      </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Enkripsi data terjamin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 