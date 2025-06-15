import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

export default function VerifyResetOTP() {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60); // 1 menit untuk resend OTP
  const [resendLoading, setResendLoading] = useState(false);
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
        alert('Kode OTP baru telah dikirim ke email Anda');
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
            <h1 className="text-3xl font-bold text-center mb-2">Verifikasi OTP</h1>
            <p className="text-center text-gray-600 mb-8">
              Masukkan kode OTP yang dikirim ke<br />
              <span className="font-medium text-blue-600">{email}</span>
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Countdown Timer */}
            <div className="text-center mb-6">
              <p className="text-lg text-gray-600">
                Kode akan kedaluwarsa dalam:{' '}
                <span className={`font-semibold ${countdown < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                  {formatTime(countdown)}
                </span>
              </p>
              {countdown === 0 && (
                <p className="text-red-600 text-sm mt-1">
                  Kode OTP telah kedaluwarsa. Silakan minta kode baru.
                </p>
              )}
            </div>

            {/* OTP Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={handleOtpChange}
                maxLength="6"
                className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                placeholder="123456"
                required
              />

              <button
                type="submit"
                disabled={loading || countdown === 0 || otp.length !== 6}
                className={`w-full bg-blue-500 text-white p-4 rounded-lg font-semibold text-lg ${
                  (loading || countdown === 0 || otp.length !== 6) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                } transition`}
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
              </button>
            </form>

            {/* Resend OTP */}
            <div className="text-center mt-6">
              <button
                onClick={handleResendOTP}
                disabled={countdown > 0 || resendLoading}
                className={`text-white text-lg ${
                  (countdown > 0 || resendLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-600'
                } transition`}
              >
                {resendLoading ? 'Mengirim ulang...' : countdown > 0 ? `Kirim ulang dalam ${formatTime(countdown)}` : 'Kirim Ulang OTP'}
              </button>
            </div>

            {/* Back to Reset Password */}
            <div className="text-center mt-6">
              <Link href="/reset-password" className="text-blue-500 text-lg ">
                Kembali ke Reset Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 