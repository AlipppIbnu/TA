import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Shield, Smartphone, BarChart3, ArrowRight, CheckCircle, Star, Users, Clock, Zap, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const LandingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-advancing hero text
  const heroTexts = [
    "Pantau Kendaraan Anda",
    "Amankan Armada Anda", 
    "Kelola Fleet Anda"
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: MapPin,
      title: "Real-time Tracking",
      description: "Monitor posisi kendaraan dengan akurasi tinggi setiap detik",
      benefit: "Hemat 30% biaya operasional"
    },
    {
      icon: Shield,
      title: "Geofence Protection",
      description: "Zona aman virtual dengan notifikasi instant saat keluar/masuk area",
      benefit: "Tingkatkan keamanan 95%"
    },
    {
      icon: Smartphone,
      title: "Remote Control",
      description: "Kontrol mesin, kunci pintu, dan fungsi kendaraan dari jarak jauh",
      benefit: "Respons darurat <30 detik"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Laporan komprehensif konsumsi BBM, performa, dan efisiensi",
      benefit: "Optimasi rute hingga 40%"
    }
  ];

  const testimonials = [
    {
      name: "Budi Santoso",
      company: "PT Logistik Prima",
      text: "Sejak menggunakan Vehitrack, efisiensi armada kami meningkat 35%. ROI tercapai dalam 3 bulan!",
      rating: 5
    },
    {
      name: "Sari Wijaya",
      company: "Trans Jakarta Fleet",
      text: "Fitur geofencing sangat membantu mengamankan kendaraan. Kasus kehilangan turun 90%.",
      rating: 5
    }
  ];

  const stats = [
    { icon: Users, value: "5,000+", label: "Pengguna Aktif" },
    { icon: MapPin, value: "50,000+", label: "Kendaraan Terpantau" },
    { icon: CheckCircle, value: "99.9%", label: "Uptime Sistem" },
    { icon: Clock, value: "24/7", label: "Support" }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "199K",
      period: "/bulan",
      features: ["5 Kendaraan", "Real-time Tracking", "Basic Reports", "Email Support"],
      popular: false
    },
    {
      name: "Business",
      price: "499K", 
      period: "/bulan",
      features: ["25 Kendaraan", "Advanced Analytics", "Geofencing", "Priority Support", "API Access"],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: ["Unlimited Vehicles", "Custom Features", "Dedicated Support", "White-label Option"],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Enhanced Header with Responsive Mobile Menu - Following Navigation Principles */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Vehitrack
                  </h1>
                  <p className="text-xs text-slate-500 hidden sm:block">Vehicle Management System</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation - Horizontal Navigation with Limited Items (Following Principle 1 & 2) */}
            <nav className="hidden md:flex items-center">
              {/* Primary Navigation Items - Limited to 6-8 items */}
              <div className="flex items-center space-x-1">
                <Link href="/products" passHref>
                  <Button variant="ghost" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    Products
                  </Button>
                </Link>
                <Link href="/about" passHref>
                  <Button variant="ghost" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    About
                  </Button>
                </Link>
                <Link href="/blog" passHref>
                  <Button variant="ghost" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    Blog
                  </Button>
                </Link>
                <Link href="/support" passHref>
                  <Button variant="ghost" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    Support
                  </Button>
                </Link>
              </div>

              {/* Auth Section - Separated with divider */}
              <div className="flex items-center gap-3 ml-8">
                <Link href="/auth/login" passHref>
                  <Button variant="ghost" className="text-slate-600 hover:text-blue-600">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/register" passHref>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                    Get Started
                  </Button>
                </Link>
              </div>
            </nav>

            {/* Mobile Menu Button - Hamburger Menu (Following Principle 1 & 4) */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-blue-50"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-slate-600" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-600" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu - Responsive Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden border-t border-slate-200 py-4 bg-white/95 backdrop-blur-sm">
              <div className="flex flex-col space-y-1">
                {/* Primary Navigation Items */}
                <Link href="/products" passHref>
                  <Button 
                    variant="ghost" 
                    className="justify-start w-full text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Products
                  </Button>
                </Link>
                <Link href="/about" passHref>
                  <Button 
                    variant="ghost" 
                    className="justify-start w-full text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About
                  </Button>
                </Link>
                <Link href="/blog" passHref>
                  <Button 
                    variant="ghost" 
                    className="justify-start w-full text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Blog
                  </Button>
                </Link>
                <Link href="/support" passHref>
                  <Button 
                    variant="ghost" 
                    className="justify-start w-full text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Support
                  </Button>
                </Link>
                
                {/* Auth Section in Mobile */}
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                  <Link href="/auth/login" passHref>
                    <Button 
                      variant="outline" 
                      className="bg-white w-full justify-center border-slate-300 text-slate-600 hover:border-blue-600 hover:text-blue-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link href="/auth/register" passHref>
                    <Button 
                      className="w-full justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Enhanced Hero Section with Animation */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="max-w-7xl mx-auto text-center relative">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-5xl md:text-7xl font-bold text-slate-800 mb-6">
              <span className="transition-all duration-500">
                {heroTexts[currentSlide]}
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Dengan Mudah
              </span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Sistem manajemen kendaraan terdepan dengan teknologi GPS real-time, 
              AI analytics, dan kontrol jarak jauh untuk keamanan maksimal dan efisiensi optimal.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Gratis 30 Hari</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Setup 5 Menit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Tanpa Kontrak</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" passHref>
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Mulai Trial Gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/demo" passHref>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-4 border-2 hover:bg-slate-50 transition-all duration-300"
                >
                  Lihat Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-slate-300">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-800 mb-4">
              Fitur Unggulan
            </h3>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Kelola armada kendaraan Anda dengan teknologi AI terdepan dan dapatkan insights yang actionable
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <div className="text-sm text-green-600 font-semibold mb-3 bg-green-50 px-3 py-1 rounded-full inline-block">
                      {feature.benefit}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-800 mb-4">
              Apa Kata Pengguna Kami
            </h3>
            <p className="text-xl text-slate-600">
              Ribuan perusahaan mempercayai kami untuk mengelola armada mereka
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-lg text-slate-700 mb-6 italic">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold text-slate-800">{testimonial.name}</div>
                    <div className="text-slate-500">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-800 mb-4">
              Paket Berlangganan
            </h3>
            <p className="text-xl text-slate-600">
              Pilih paket yang sesuai dengan kebutuhan bisnis Anda
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-blue-500 shadow-lg scale-105' 
                  : 'border-slate-200 hover:border-blue-300'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Paling Populer
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-slate-800">{plan.price}</span>
                    <span className="text-slate-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                    size="lg"
                  >
                    {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative">
          <h3 className="text-4xl font-bold text-white mb-6">
            Siap Mentransformasi Bisnis Anda?
          </h3>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Bergabunglah dengan ribuan perusahaan yang telah meningkatkan efisiensi armada mereka hingga 40%
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" passHref>
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-slate-50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Mulai Trial 30 Hari Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/contact" passHref>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                Konsultasi Gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Enhanced Footer with Complete Sitemap (Following Principle 1) */}
      <footer className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Vehitrack</span>
              </div>
              <p className="text-slate-400 mb-4 max-w-md">
                Solusi manajemen kendaraan terdepan dengan teknologi AI dan IoT untuk efisiensi maksimal armada Anda.
              </p>
              <div className="flex gap-4">
                <Link href="/facebook" className="text-slate-400 hover:text-white transition-colors">
                  Facebook
                </Link>
                <Link href="/twitter" className="text-slate-400 hover:text-white transition-colors">
                  Twitter
                </Link>
                <Link href="/linkedin" className="text-slate-400 hover:text-white transition-colors">
                  LinkedIn
                </Link>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Products</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/gps-tracking" className="hover:text-white transition-colors">GPS Tracking</Link></li>
                <li><Link href="/fleet-management" className="hover:text-white transition-colors">Fleet Management</Link></li>
                <li><Link href="/geofencing" className="hover:text-white transition-colors">Geofencing</Link></li>
                <li><Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/partners" className="hover:text-white transition-colors">Partners</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/documentation" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-slate-400">
            <p>© 2024 Vehitrack. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
              <Link href="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
              <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;