import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function NewPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const { email: emailFromQuery, token } = router.query;
    if (emailFromQuery && token) {
      setEmail(emailFromQuery);
      setResetToken(token);
    }
  }, [router.query]);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password minimal 6 karakter';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/reset-password/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          newPassword: password, 
          resetToken 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('✅ Password berhasil diperbarui! Silakan login dengan password baru.');
        // Redirect setelah 3 detik
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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
        <title>Buat Password Baru - VehiTrack</title>
        <meta name="description" content="Create a new secure password for VehiTrack" />
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
                        Buat Password Baru
                      </h1>
                      <p className="text-gray-600">
              Untuk akun: <span className="font-medium text-blue-600">{email}</span>
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
            {success && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm text-center flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                {success}
                        </p>
              </div>
            )}

                    {/* New Password Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Password Input */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                          Password Baru
                        </label>
                <div className="relative">
                  <input
                            id="password"
                            name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Masukkan password baru"
                    required
                  />
                  <button
                    type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                            {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                  </button>
                </div>
              </div>

                      {/* Confirm Password Input */}
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Konfirmasi Password
                        </label>
                <div className="relative">
                  <input
                            id="confirmPassword"
                            name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Konfirmasi password baru"
                    required
                  />
                  <button
                    type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                            {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                  </button>
                </div>
              </div>

                      {/* Password Match Indicator */}
                      {confirmPassword && (
                        <div className="text-sm">
                          {password !== confirmPassword ? (
                            <p className="text-red-600 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Password tidak cocok
                            </p>
                          ) : (
                            <p className="text-green-600 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Password cocok
                            </p>
                          )}
                        </div>
              )}

              <button
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 6}
                        className={`w-full py-3 font-semibold rounded-xl transition-all duration-200 ${
                  (loading || password !== confirmPassword || password.length < 6) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg'
                        }`}
              >
                {loading ? 'Memperbarui Password...' : 'Perbarui Password'}
              </button>
            </form>

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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">
                        Password Baru Anda
                      </h2>
                      <p className="text-blue-100 text-lg">
                        Buat password yang kuat untuk melindungi akun Anda. Pastikan password mudah diingat namun sulit ditebak.
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-6 max-w-md mx-auto">
                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Minimal 6 karakter</span>
                      </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Gabungan huruf & angka</span>
                      </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <span className="text-white text-lg">Enkripsi tingkat tinggi</span>
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