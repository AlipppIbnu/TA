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
            <h1 className="text-xl font-bold text-center mb-2">Verifikasi OTP</h1>
            <p className="text-center text-gray-600 mb-6 text-sm">
              Masukkan kode OTP yang dikirim ke<br />
              <span className="font-medium text-blue-600">{email}</span>
            </p>

            {/* Error Message - dikecilkan */}
            {error && (
              <div className="flex justify-center mb-2">
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs text-center max-w-[250px]">
                {error}
                </div>
              </div>
            )}

            {/* Success Message - dikecilkan */}
            {successMessage && (
              <div className="flex justify-center mb-2">
                <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-xs text-center max-w-[250px]">
                  {successMessage}
                </div>
              </div>
            )}

            {/* Countdown Timer - dikecilkan */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Kode akan kedaluwarsa dalam:{' '}
                <span className={`font-semibold ${countdown < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                  {formatTime(countdown)}
                </span>
              </p>
              {countdown === 0 && (
                <p className="text-red-600 text-xs mt-1">
                  Kode OTP telah kedaluwarsa. Silakan minta kode baru.
                </p>
              )}
            </div>

            {/* OTP Form - dikecilkan */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={otp}
                onChange={handleOtpChange}
                maxLength="6"
                className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:border-blue-500 text-center text-lg font-mono tracking-widest"
                placeholder="123456"
                required
              />

              <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading || countdown === 0 || otp.length !== 6}
                  className={`max-w-[200px] px-8 py-3 bg-blue-500 text-white rounded-md font-semibold text-base ${
                  (loading || countdown === 0 || otp.length !== 6) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                } transition`}
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
              </button>
              </div>
            </form>

            {/* Resend OTP - dikecilkan */}
            <div className="text-center mt-4">
              <button
                onClick={handleResendOTP}
                disabled={countdown > 0 || resendLoading}
                className={`max-w-[180px] px-4 py-2 rounded-md text-sm font-medium transition ${
                  countdown > 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' 
                    : resendLoading
                    ? 'bg-green-500 text-white cursor-not-allowed hover:bg-green-500'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {resendLoading ? 'Mengirim ulang...' : countdown > 0 ? `Kirim ulang dalam ${formatTime(countdown)}` : 'Kirim Ulang OTP'}
              </button>
            </div>

            {/* Back to Reset Password - dikecilkan */}
            <div className="text-center mt-4">
              <Link href="/reset-password" className="text-blue-500 text-sm">
                Kembali ke Reset Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 