// pages/login.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { login, getCurrentUser } from "../lib/authService";
import Head from 'next/head';

export default function Login() {
  // State management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  // Cek apakah user sudah login
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.replace("/dashboard");
    }
    setLoading(false);
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Email atau password salah!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Login - VehiTrack</title>
        <meta name="description" content="Login to your VehiTrack account" />
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
                        Welcome Back
                      </h1>
                      <p className="text-gray-600">
                        Login to access your fleet dashboard
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

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                      {/* Email Input */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      {/* Password Input */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
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
                          Forgot password?
                        </Link>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Sign In
                      </button>
                    </form>



                    {/* Register Link */}
                    <p className="mt-8 text-center text-sm text-gray-600">
                      Don&apos;t have an account?{' '}
                      <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
                        Create one now
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Right Side - Features */}
                <div className="hidden lg:block relative bg-gradient-to-br from-blue-600 to-blue-700 p-12">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="relative h-full flex flex-col justify-center">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl font-bold text-white mb-4">
                        Track Your Fleet in Real-Time
                      </h2>
                      <p className="text-blue-100 text-lg">
                        Monitor vehicles, optimize routes, and improve efficiency with our powerful GPS tracking platform.
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-6 max-w-md mx-auto">
                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        <span className="text-white text-lg">Real-time GPS tracking</span>
                        </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        <span className="text-white text-lg">Advanced analytics dashboard</span>
                        </div>

                      <div className="flex items-center text-left">
                        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-white text-lg">Instant alerts & notifications</span>
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