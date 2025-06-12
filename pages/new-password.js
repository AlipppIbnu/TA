import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
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
          router.push('/auth/login');
        }, 3000);
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
        <title>Buat Password Baru - VehiTrack</title>
        <meta name="description" content="Create a new secure password for VehiTrack" />
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
            <h1 className="text-3xl font-bold text-center mb-2">Buat Password Baru</h1>
            <p className="text-center text-gray-600 mb-8">
              Untuk akun: <span className="font-medium text-blue-600">{email}</span>
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input Password dengan toggle show/hide */}
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-auto h-auto p-0 m-0 bg-transparent text-gray-700 hover:text-gray-900 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>



              {/* Input Konfirmasi Password dengan toggle show/hide */}
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                  placeholder="Confirm Password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-auto h-auto p-0 m-0 bg-transparent text-gray-700 hover:text-gray-900 focus:outline-none"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-sm text-red-600">Password tidak cocok</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-2 text-sm text-green-600">Password cocok</p>
              )}

              <button
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 6}
                className={`w-full bg-blue-500 text-white p-4 rounded-lg font-semibold text-lg ${
                  (loading || password !== confirmPassword || password.length < 6) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-600'
                } transition`}
              >
                {loading ? 'Memperbarui Password...' : 'Perbarui Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
} 