// pages/index.js - Landing Page for VehiTrack

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <Head>
        <title>VehiTrack - AI-Powered GPS Tracking & Fleet Management</title>
        <meta name="description" content="Real-time GPS tracking and fleet management. Optimize routes, monitor vehicles, and reduce operational costs with VehiTrack." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Header Navigation */}
        <header className={`fixed w-full top-0 z-50 bg-white/80 backdrop-blur-sm transition-all duration-300 ${
          isScrolled ? 'shadow-md' : ''
        }`}>
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <a href="#" className="flex items-center space-x-3 cursor-pointer">
                <svg width="32" height="32" viewBox="0 0 40 40">
                  <path d="M20 5 L35 15 L35 25 L20 35 L5 25 L5 15 Z" fill="#3B82F6" />
                  <path d="M20 5 L20 35 M5 15 L35 15" stroke="white" strokeWidth="2" />
                  <circle cx="20" cy="20" r="3" fill="white" />
                </svg>
                <span className="text-2xl font-bold text-gray-900">VehiTrack</span>
              </a>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Features
                </a>
                <a href="#solutions" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Solutions
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Pricing
                </a>
                <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  About Us
                </a>
              </div>
              
              {/* CTA Buttons */}
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Login
                </Link>
                <Link 
                  href="/register"
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg">
                  Register
                </Link>
              </div>

              {/* Mobile menu button */}
              <button onClick={toggleMobileMenu} className="md:hidden p-2 rounded-md text-gray-600" aria-label="Open menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </nav>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden" id="mobile-menu">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <a href="#features" onClick={toggleMobileMenu} className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">Features</a>
                <a href="#solutions" onClick={toggleMobileMenu} className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">Solutions</a>
                <a href="#pricing" onClick={toggleMobileMenu} className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">Pricing</a>
                <a href="#about" onClick={toggleMobileMenu} className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">About Us</a>
              </div>
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-5">
                  <Link href="/login" className="flex-1 text-center py-2 px-4 border border-transparent rounded-md text-base font-medium text-gray-600 hover:bg-gray-100">
                    Login
                  </Link>
                  <Link href="/register" className="flex-1 text-center ml-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700">
                    Register
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <main className="pt-16">
          <section className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Hero Text */}
                <div className="text-center lg:text-left">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                    The Future of
                    <br />
                    <span className="text-blue-600">Fleet Management</span>
                    <br />
                    is Here
                  </h1>
                  <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0">
                    VehiTrack provides intelligent GPS tracking and route optimization to boost your fleet&apos;s efficiency. Reduce costs and delivery times by up to 30%.
                  </p>
                  <Link href="/dashboard" className="mt-8 group inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl">
                    Go to Dashboard
                    <svg className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>

                {/* Hero Visual */}
                <div className="relative p-8">
                  <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                    <svg className="w-full h-auto" viewBox="0 0 400 400">
                      {/* Grid lines */}
                      {[...Array(8)].map((_, i) => (
                        <g key={i}>
                          <line x1={i * 50} y1="0" x2={i * 50} y2="400" stroke="#E5E7EB" strokeWidth="1" />
                          <line x1="0" y1={i * 50} x2="400" y2={i * 50} stroke="#E5E7EB" strokeWidth="1" />
                        </g>
                      ))}
                      
                      {/* Route paths with animation */}
                      <path d="M50 100 Q150 80 250 150 T350 200" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray="5,5" opacity="0.7">
                        <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite" />
                      </path>
                      <path d="M100 300 L200 250 L300 280" fill="none" stroke="#10B981" strokeWidth="3" />
                      
                      {/* Location markers with pulse animation */}
                      <g>
                        <circle cx="50" cy="100" r="8" fill="#3B82F6" />
                        <circle cx="50" cy="100" r="8" fill="#3B82F6" opacity="0.3">
                          <animate attributeName="r" values="8;20;8" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </g>
                      <circle cx="250" cy="150" r="8" fill="#3B82F6" />
                      <circle cx="350" cy="200" r="8" fill="#3B82F6" />
                      <circle cx="100" cy="300" r="8" fill="#10B981" />
                      <circle cx="200" cy="250" r="8" fill="#10B981" />
                      <circle cx="300" cy="280" r="8" fill="#10B981" />
                      
                      {/* Delivery truck icon */}
                      <g transform="translate(150, 200)">
                        <rect x="-15" y="-10" width="30" height="20" fill="#3B82F6" rx="2" />
                        <circle cx="-10" cy="12" r="3" fill="#1F2937" />
                        <circle cx="10" cy="12" r="3" fill="#1F2937" />
                      </g>
                    </svg>
                    
                    {/* Floating stat cards */}
                    <div className="absolute -top-5 -left-5 bg-white rounded-xl shadow-lg p-4">
                      <div className="text-2xl font-bold text-green-600">-30%</div>
                      <div className="text-sm text-gray-600">Delivery Time</div>
                    </div>
                    <div className="absolute -bottom-5 -right-5 bg-white rounded-xl shadow-lg p-4">
                      <div className="text-2xl font-bold text-green-600">+45%</div>
                      <div className="text-sm text-gray-600">Efficiency</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900">Everything You Need to Manage Your Fleet</h2>
                <p className="mt-4 text-lg text-gray-600">From real-time tracking to in-depth analytics, we&apos;ve got you covered.</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <FeatureCard 
                  icon="🚚"
                  title="Smart Route Planning"
                  description="AI algorithms optimize multi-stop deliveries in real-time."
                />
                <FeatureCard 
                  icon="📍"
                  title="Live GPS Tracking"
                  description="Monitor your fleet and deliveries with pinpoint precision."
                />
                <FeatureCard 
                  icon="🛡️"
                  title="Geofence Alerts"
                  description="Create virtual boundaries and get instant notifications."
                />
                <FeatureCard 
                  icon="📊"
                  title="Analytics Dashboard"
                  description="Gain comprehensive insights into your fleet&apos;s performance."
                />
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section id="solutions" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
                Why Choose VehiTrack?
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <BenefitCard 
                  percentage="30%"
                  label="Cost Reduction"
                  description="Average savings on fuel and operational costs."
                />
                <BenefitCard 
                  percentage="85%"
                  label="On-Time Delivery"
                  description="Improved delivery performance and customer satisfaction."
                />
                <BenefitCard 
                  percentage="2.5x"
                  label="Fleet Efficiency"
                  description="More deliveries completed with the same resources."
                />
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-blue-600">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Ready to take control of your fleet?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of companies saving time and money with our powerful tracking platform.
              </p>
              <Link href="/register" className="group inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transform hover:-translate-y-1 transition-all duration-200 shadow-lg">
                Register for Free
                <svg className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Benefit Card Component
function BenefitCard({ percentage, label, description }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-center">
      <div className="text-5xl font-bold text-blue-600 mb-2">{percentage}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">{label}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}