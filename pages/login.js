// pages/login.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { login, getCurrentUser } from "../lib/authService";
import Head from 'next/head';
import Cookies from 'js-cookie';

export default function Login() {
  // State management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const router = useRouter();

  // Cek apakah user sudah login
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.replace("/dashboard");
    }
    setLoading(false);
  }, [router]);

  // Countdown timer untuk resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Get device_id from cookie
      const deviceId = Cookies.get('device_id');
      
      // Login dengan device_id jika ada
      const loginData = await login(email, password, deviceId);
      
      if (loginData.requireOtp) {
        // Device baru terdeteksi, perlu OTP
        setUserId(loginData.userId);
        setShowOtpStep(true);
        setOtpSending(true);
        
        // Kirim OTP
        try {
          const otpResponse = await fetch('/api/auth/generateOTP', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              userId: loginData.userId,
            }),
          });

          const otpResult = await otpResponse.json();
          
          if (!otpResult.success) {
            throw new Error(otpResult.message);
          }
          
          setCountdown(60); // Start 60 second countdown
        } catch {
          setError('Gagal mengirim kode OTP. Silakan coba lagi.');
          setShowOtpStep(false);
        } finally {
          setOtpSending(false);
        }
      } else {
        // Device sudah dikenali, langsung masuk
        // Data user sudah disimpan di localStorage oleh authService
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Email atau password salah!");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    setError(null);
    setOtpVerifying(true);
    
    try {
      // Verifikasi OTP
      const verifyResponse = await fetch('/api/auth/verifyOTP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          userId: userId,
        }),
      });

      const verifyResult = await verifyResponse.json();
      
      if (!verifyResult.success) {
        throw new Error(verifyResult.message);
      }

      // Register device setelah OTP berhasil
      const deviceResponse = await fetch('/api/auth/registerDevice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          userAgent: navigator.userAgent,
        }),
      });

      const deviceResult = await deviceResponse.json();
      
      if (deviceResult.success && deviceResult.deviceId) {
        // Simpan device_id ke cookie (expires in 30 days)
        Cookies.set('device_id', deviceResult.deviceId, { 
          expires: 30,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production'
        });
      }

      // Login sukses, redirect ke dashboard
      router.push("/dashboard");
      
    } catch (err) {
      setError(err.message || "Kode OTP tidak valid!");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setError(null);
    setOtpSending(true);
    
    try {
      const otpResponse = await fetch('/api/auth/generateOTP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          userId: userId,
        }),
      });

      const otpResult = await otpResponse.json();
      
      if (!otpResult.success) {
        throw new Error(otpResult.message);
      }
      
      setCountdown(60); // Reset countdown
      setOtp(""); // Clear OTP input
    } catch {
      setError('Gagal mengirim ulang kode OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Masuk - VehiTrack</title>
        <meta name="description" content="Masuk ke akun VehiTrack Anda" />
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
                    {/* Welcome Text */}
                    <div className="text-center mb-8">
                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                        {showOtpStep ? 'Verifikasi Perangkat Baru' : 'Selamat Datang Kembali'}
                      </h1>
                      <p className="text-gray-600">
                        {showOtpStep 
                          ? 'Kami mendeteksi login dari perangkat baru. Masukkan kode OTP untuk melanjutkan.'
                          : 'Masuk untuk mengakses dashboard armada Anda'
                        }
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

                    {!showOtpStep ? (
                      /* Login Form */
                      <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Input */}
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Alamat Email
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Masukkan email Anda"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                          />
                        </div>

                        {/* Password Input */}
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Kata Sandi
                          </label>
                          <div className="relative">
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Masukkan kata sandi Anda"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              disabled={loading}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                            >
                              {showPassword ? 
                                <FaEyeSlash size={20} /> : 
                                <FaEye size={20} />
                              }
                            </button>
                          </div>
                        </div>

                        {/* Forgot Password */}
                        <div className="flex items-center justify-end">
                          <Link 
                            href="/reset-password" 
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Lupa kata sandi?
                          </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              Memverifikasi...
                            </>
                          ) : (
                            'Masuk'
                          )}
                        </button>
                      </form>
                    ) : (
                      /* OTP Form */
                      <form onSubmit={handleOtpVerification} className="space-y-6">
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

                        {/* Countdown Timer */}
                        <div className="text-center mb-6">
                          <p className="text-sm text-gray-600">
                            Kode akan kedaluwarsa dalam:{' '}
                            <span className={`font-semibold ${countdown < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                              {formatCountdown(countdown)}
                            </span>
                          </p>
                          {countdown === 0 && (
                            <p className="text-red-600 text-sm mt-2">
                              Kode OTP telah kedaluwarsa. Silakan minta kode baru.
                            </p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                            Kode OTP
                          </label>
                          <input
                            id="otp"
                            name="otp"
                            type="text"
                            placeholder="Masukkan 6 digit kode OTP"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center text-xl font-mono tracking-widest"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength="6"
                            required
                            disabled={otpVerifying || otpSending}
                          />
                          <p className="mt-2 text-sm text-gray-600 text-center">
                            Kode OTP telah dikirim ke email: <strong>{email}</strong>
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={otpVerifying || otp.length !== 6 || countdown === 0}
                          className={`w-full py-3 font-semibold rounded-xl transition-all duration-200 ${
                            (otpVerifying || otp.length !== 6 || countdown === 0)
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {otpVerifying ? 'Memverifikasi...' : 'Verifikasi OTP'}
                        </button>

                        {/* Resend OTP */}
                        <div className="text-center mt-6">
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={countdown > 0 || otpSending}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              countdown > 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' 
                                : otpSending
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {otpSending ? 'Mengirim ulang...' : 'Kirim ulang OTP'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Register Link */}
                    {!showOtpStep && (
                      <p className="mt-8 text-center text-sm text-gray-600">
                        Belum punya akun?{' '}
                        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
                          Buat akun sekarang
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side - Features */}
                <div className="hidden lg:block relative bg-gradient-to-br from-blue-600 to-blue-700 p-12">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="relative h-full flex flex-col justify-center">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl font-bold text-white mb-4">
                        {showOtpStep 
                          ? 'Keamanan Akun Anda adalah Prioritas Kami'
                          : 'Lacak Armada Anda secara Real-Time'
                        }
                      </h2>
                      <p className="text-blue-100 text-lg">
                        {showOtpStep
                          ? 'Kami menggunakan verifikasi dua faktor untuk melindungi akun Anda dari akses yang tidak sah.'
                          : 'Pantau kendaraan, optimalkan rute, dan tingkatkan efisiensi dengan platform GPS tracking kami yang canggih.'
                        }
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-6 max-w-md mx-auto">
                      {showOtpStep ? (
                        <>
                          <div className="flex items-center text-left">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <span className="text-white text-lg">Verifikasi dua faktor</span>
                          </div>

                          <div className="flex items-center text-left">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-white text-lg">Deteksi perangkat baru</span>
                          </div>

                          <div className="flex items-center text-left">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-white text-lg">Riwayat login tersimpan</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center text-left">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="text-white text-lg">Pelacakan GPS real-time</span>
                          </div>

                          <div className="flex items-center text-left">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <span className="text-white text-lg">Dashboard analitik yang canggih</span>
                          </div>

                          <div className="flex items-center text-left">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <span className="text-white text-lg">Peringatan & notifikasi instan</span>
                          </div>
                        </>
                      )}
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