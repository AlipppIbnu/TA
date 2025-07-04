import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function VerifyResetOTP() {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60); // 1 menit untuk resend OTP
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const emailFromQuery = router.query.email;
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router.query.email]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reset-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/new-password?email=${encodeURIComponent(email)}&token=${data.resetToken}`);
      } else {
        setError(data.message);
        if (data.expired) {
          setCountdown(0);
        }
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const res = await fetch('/api/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setCountdown(60);
        setError('');
        setOtp('');
        setSuccessMessage('Kode OTP baru telah dikirim ke email Anda');
        // Auto hide success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Gagal mengirim ulang OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <>
      <Head>
        <title>Verifikasi OTP - VehiTrack</title>
        <meta name="description" content="Verify OTP for password reset" />
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
                        Verifikasi OTP
                      </h1>
                      <p className="text-gray-600">
                        Masukkan kode OTP yang dikirim ke<br />
                        <span className="font-medium text-blue-600">{email}</span>
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
                    {successMessage && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm text-center flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {successMessage}
                        </p>
                      </div>
                    )}

                    {/* Countdown Timer */}
                    <div className="text-center mb-6">
                      <p className="text-sm text-gray-600">
                        Kode akan kedaluwarsa dalam:{' '}
                        <span className={`font-semibold ${countdown < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatTime(countdown)}
                        </span>
                      </p>
                      {countdown === 0 && (
                        <p className="text-red-600 text-sm mt-2">
                          Kode OTP telah kedaluwarsa. Silakan minta kode baru.
                        </p>
                      )}
                    </div>

                    {/* OTP Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                          Kode OTP
                        </label>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          value={otp}
                          onChange={handleOtpChange}
                          maxLength="6"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center text-xl font-mono tracking-widest"
                          placeholder="123456"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || countdown === 0 || otp.length !== 6}
                        className={`w-full py-3 font-semibold rounded-xl transition-all duration-200 ${
                          (loading || countdown === 0 || otp.length !== 6) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                      </button>
                    </form>

                    {/* Resend OTP */}
                    <div className="text-center mt-6">
                      <button
                        onClick={handleResendOTP}
                        disabled={countdown > 0 || resendLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          countdown > 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' 
                            : resendLoading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {resendLoading ? 'Mengirim ulang...' : 'Kirim ulang OTP'}
                      </button>
                    </div>

                    {/* Back to Login */}
                    <p className="mt-8 text-center text-sm text-gray-600">
                      Kembali ke{' '}
                      <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                        Login
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">
                        Verifikasi Keamanan
                      </h2>
                      <p className="text-blue-100 text-lg">
                        Kode OTP telah dikirim ke email Anda. Masukkan kode tersebut untuk melanjutkan proses reset password.
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-6 max-w-md mx-auto">
                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Cek email Anda</span>
                      </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Masukkan kode 6 digit</span>
                      </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Lanjutkan ke password baru</span>
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