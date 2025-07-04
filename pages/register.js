// pages/register.js
import { useState } from "react"; // Removed useEffect import
import Link from "next/link";
import Head from 'next/head';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { register } from "../lib/authService";

export default function Register() {
  // State untuk form dan UI
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    username: "",
    phoneNumber: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler untuk proses registrasi
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validasi input
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName || !formData.username) {
      setError("Semua kolom wajib diisi!");
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Silakan masukkan alamat email yang valid.");
      return;
    }

    // Validasi password cocok
    if (formData.password !== formData.confirmPassword) {
      setError("Password tidak cocok.");
      return;
    }

    // Validasi kekuatan password
    if (formData.password.length < 8) {
      setError("Password minimal harus 8 karakter.");
      return;
    }

    // Proses registrasi
    try {
      setLoading(true);
      
      const result = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        username: formData.username,
        phoneNumber: formData.phoneNumber
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Tampilkan pesan sukses
      setSuccess("Registrasi berhasil! Mengarahkan ke halaman login...");
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
        username: "",
        phoneNumber: ""
      });

      // Redirect ke login setelah 2 detik
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (err) {
      console.error("Error saat registrasi:", err);
      setError("Registrasi gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Daftar - VehiTrack</title>
        <meta name="description" content="Buat akun VehiTrack Anda" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">

        {/* Main Content */}
        <main className="pt-16 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl w-full">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="grid lg:grid-cols-5">
                {/* Left Side - Form (3 columns on large screens) */}
                <div className="lg:col-span-3 p-8 sm:p-12 lg:p-16">
                  <div className="max-w-2xl mx-auto">
                    {/* Welcome Text */}
                    <div className="text-center mb-8">
                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                        Buat Akun Anda
                      </h1>
                      <p className="text-gray-600">
                        Bergabunglah dengan ribuan perusahaan yang mengoptimalkan manajemen armada mereka
                      </p>
                    </div>

                    {/* Messages */}
                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {error}
                        </p>
                      </div>
                    )}

                    {success && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {success}
                        </p>
                      </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleRegister} className="space-y-6">
                      {/* Name and Username Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                            Nama Lengkap
                          </label>
                          <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            placeholder="John Doe"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                          </label>
                          <input
                            id="username"
                            name="username"
                            type="text"
                            placeholder="johndoe"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={formData.username}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      {/* Email and Phone Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Alamat Email
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                            Nomor Telepon <span className="text-gray-400">(Opsional)</span>
                          </label>
                          <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            placeholder="+62 812 3456 7890"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      {/* Password Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Minimal 8 karakter"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              value={formData.password}
                              onChange={handleInputChange}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Konfirmasi Password
                          </label>
                          <div className="relative">
                            <input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Ulangi password Anda"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions */}
                      <div className="flex items-start">
                        <input
                          id="terms"
                          name="terms"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                          required
                        />
                        <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                          Saya setuju dengan{' '}
                          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                            Syarat dan Ketentuan
                          </Link>
                          {' '}dan{' '}
                          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                            Kebijakan Privasi
                          </Link>
                        </label>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 font-semibold rounded-xl transition-all duration-200 ${
                          loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {loading ? 'Membuat Akun...' : 'Buat Akun'}
                      </button>
                    </form>



                    {/* Login Link */}
                    <p className="mt-8 text-center text-sm text-gray-600">
                      Sudah punya akun?{' '}
                      <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                        Masuk di sini
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Right Side - Visual (2 columns on large screens) */}
                <div className="hidden lg:block lg:col-span-2 relative bg-gradient-to-br from-blue-600 to-blue-700">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="relative h-full flex items-center justify-center p-12">
                    <div className="text-center text-white">
                      {/* Benefits List */}
                      <h2 className="text-3xl font-bold mb-8">
                        Mulai Optimalkan Armada Anda Hari Ini
                      </h2>
                      
                      <div className="space-y-6 text-left max-w-md mx-auto">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="font-semibold mb-1">Kurangi Biaya hingga 30%</h3>
                            <p className="text-blue-100 text-sm">Optimalkan rute dan kurangi konsumsi bahan bakar</p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="font-semibold mb-1">Pelacakan Real-Time</h3>
                            <p className="text-blue-100 text-sm">Pantau seluruh armada Anda dari satu dasbor</p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="font-semibold mb-1">Keamanan yang Ditingkatkan</h3>
                            <p className="text-blue-100 text-sm">Dapatkan peringatan instan untuk penggunaan kendaraan yang tidak sah</p>
                          </div>
                        </div>

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
