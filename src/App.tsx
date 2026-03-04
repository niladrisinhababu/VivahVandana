/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Star, 
  Filter, 
  ChevronRight, 
  Menu, 
  X, 
  User, 
  Store, 
  ShieldCheck,
  CheckCircle2,
  IndianRupee
} from 'lucide-react';

// Types
interface Service {
  id: number;
  vendor_id: number;
  category: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  business_name: string;
  location: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [view, setView] = useState<'home' | 'detail' | 'vendor' | 'admin'>('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userVendorProfile, setUserVendorProfile] = useState<any>(null);
  const [pendingVendors, setPendingVendors] = useState<any[]>([]);
  const [vendorForm, setVendorForm] = useState({
    business_name: '',
    category: 'PANDAL',
    location: '',
    description: '',
    price: '',
    contact_number: '',
    email: '',
    image_url: ''
  });

  const categories = ['All', 'PANDAL', 'CATERING', 'LODGE', 'DECORATOR', 'MUSIC', 'VIDEOGRAPHY WITH DRONE', 'VIDEOGRAPHY WITHOUT DRONE', 'PALANQUINE', 'BAND'];

  const calculateGST = (price: number) => {
    return {
      total: price * 1.18,
      gst: price * 0.18
    };
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('vivah_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchServices();
      fetchUserVendorProfile();
      if (currentUser.role === 'ADMIN') {
        fetchPendingVendors();
      }
    }
  }, [currentUser]);

  const fetchUserVendorProfile = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/vendor/profile/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserVendorProfile(data);
      }
    } catch (err) {
      console.error("Failed to fetch vendor profile", err);
    }
  };

  const fetchPendingVendors = async () => {
    try {
      const res = await fetch('/api/admin/vendors/pending');
      const data = await res.json();
      setPendingVendors(data);
    } catch (err) {
      console.error("Failed to fetch pending vendors", err);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchPendingVendors();
        fetchServices();
      }
    } catch (err) {
      console.error("Approval failed", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
        localStorage.setItem('vivah_user', JSON.stringify(data));
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('vivah_user');
    setView('home');
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch services", err);
      setLoading(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.business_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBook = async (serviceId: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          service_id: serviceId,
          booking_date: new Date().toISOString()
        })
      });
      if (res.ok) {
        setBookingSuccess(true);
        setTimeout(() => {
          setBookingSuccess(false);
          setView('home');
        }, 3000);
      }
    } catch (err) {
      console.error("Booking failed", err);
    }
  };

  const handleVendorRegister = async (e: React.FormEvent) => {
    if (!currentUser) return;
    e.preventDefault();
    try {
      const res = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          ...vendorForm,
          price: parseFloat(vendorForm.price)
        })
      });
      if (res.ok) {
        setRegistrationSuccess(true);
        fetchUserVendorProfile();
        setVendorForm({
          business_name: '',
          category: 'PANDAL',
          location: '',
          description: '',
          price: '',
          contact_number: '',
          email: '',
          image_url: ''
        });
        setTimeout(() => {
          setRegistrationSuccess(false);
        }, 5000);
      }
    } catch (err) {
      console.error("Vendor registration failed", err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVendorForm({ ...vendorForm, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl max-w-md w-full"
        >
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Store className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-orange-600">VivahVandana</span>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-center text-black/40 mb-8 text-sm">
            {authMode === 'login' ? 'Sign in to access wedding services' : 'Join the VivahVandana community'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                  placeholder="John Doe"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Email Address</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                placeholder="you@example.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Password</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              />
            </div>

            {authError && (
              <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">
                {authError}
              </div>
            )}

            <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-sm font-bold text-orange-600 hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Store className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-orange-600">VivahVandana</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => setView('home')} className="text-sm font-medium hover:text-orange-600 transition-colors">Browse</button>
              <button onClick={() => setView('vendor')} className="text-sm font-medium hover:text-orange-600 transition-colors">
                {currentUser?.role === 'ADMIN' ? 'Admin Panel' : 'For Vendors'}
              </button>
              <div className="h-8 w-[1px] bg-black/10 mx-2"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold">{currentUser?.name}</div>
                  <div className="text-[10px] text-black/40 uppercase tracking-wider">{currentUser?.role}</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black/80 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-black/5 px-4 py-6 space-y-4"
          >
            <button onClick={() => {setView('home'); setIsMenuOpen(false)}} className="block w-full text-left font-medium">Browse Services</button>
            <button onClick={() => {setView('vendor'); setIsMenuOpen(false)}} className="block w-full text-left font-medium">
              {currentUser?.role === 'ADMIN' ? 'Admin Panel' : 'Vendor Dashboard'}
            </button>
            <button onClick={handleLogout} className="w-full bg-black text-white py-3 rounded-xl font-medium">Sign Out</button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Hero Section */}
            <div className="mb-12 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                Find the perfect <span className="text-orange-600">Mandap</span> for your big day.
              </h1>
              <p className="text-lg text-black/60 max-w-2xl">
                Book pandals, catering, decorators, and more from verified vendors across India. 
                Culturally curated services for your dream wedding.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 mb-12 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" size={20} />
                <input 
                  type="text" 
                  placeholder="Search for pandals, catering, decorators..." 
                  className="w-full pl-12 pr-4 py-3 bg-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-600/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat ? 'bg-orange-600 text-white' : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1,2,3].map(i => <div key={i} className="h-80 bg-black/5 animate-pulse rounded-2xl"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filteredServices.map(service => (
                  <motion.div 
                    key={service.id}
                    layoutId={`service-${service.id}`}
                    onClick={() => { setSelectedService(service); setView('detail'); }}
                    className="group bg-white rounded-2xl overflow-hidden border border-black/5 hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <img 
                        src={service.image_url} 
                        alt={service.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        4.8
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1 block">
                            {service.category}
                          </span>
                          <h3 className="font-bold text-lg leading-tight">{service.title}</h3>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-sm font-bold">
                            <IndianRupee size={14} />
                            {calculateGST(service.price).total.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-black/40 font-medium">+18% GST</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-black/40 text-sm mb-4">
                        <MapPin size={14} />
                        {service.location}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-black/5">
                        <span className="text-sm font-medium text-black/60">{service.business_name}</span>
                        <ChevronRight size={18} className="text-black/20 group-hover:text-orange-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {view === 'detail' && selectedService && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setView('home')} className="mb-8 flex items-center gap-2 text-sm font-medium text-black/60 hover:text-black transition-colors">
              <ChevronRight className="rotate-180" size={16} />
              Back to search
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="aspect-video rounded-3xl overflow-hidden bg-black/5">
                  <img 
                    src={selectedService.image_url} 
                    alt={selectedService.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-black/5">
                      <img src={`https://picsum.photos/seed/${selectedService.id + i}/400/400`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {selectedService.category}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      4.8 (124 reviews)
                    </span>
                  </div>
                  <h1 className="text-4xl font-bold mb-2">{selectedService.title}</h1>
                  <div className="flex items-center gap-2 text-black/60">
                    <MapPin size={18} />
                    {selectedService.location}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-sm text-black/40 block">Starting from</span>
                      <div className="text-3xl font-bold flex items-center">
                        <IndianRupee size={24} />
                        {calculateGST(selectedService.price).total.toLocaleString()}
                      </div>
                      <span className="text-xs text-black/40 font-medium">+18% GST Included</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                        <ShieldCheck size={16} />
                        Verified Vendor
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-black/40" />
                        <div>
                          <span className="text-xs text-black/40 block">Select Date</span>
                          <span className="text-sm font-bold">Check Availability</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-black/20" />
                    </div>
                  </div>

                  <button 
                    onClick={() => handleBook(selectedService.id)}
                    className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                  >
                    Reserve Now
                  </button>
                  <p className="text-center text-xs text-black/40 mt-4">
                    No payment required yet. Vendor will confirm within 24 hours.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-xl">About this service</h3>
                  <p className="text-black/60 leading-relaxed">
                    {selectedService.description}
                  </p>
                  <div className="pt-4 border-t border-black/5">
                    <h4 className="font-bold mb-2">Vendor Information</h4>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center font-bold text-lg">
                        {selectedService.business_name[0]}
                      </div>
                      <div>
                        <div className="font-bold">{selectedService.business_name}</div>
                        <div className="text-sm text-black/40">Member since 2023</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'vendor' && (
          currentUser?.role === 'ADMIN' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <div className="flex gap-4">
                  <div className="bg-white px-4 py-2 rounded-xl border border-black/5 shadow-sm">
                    <span className="text-xs text-black/40 block">Total Bookings</span>
                    <span className="font-bold">1,284</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-black/5 shadow-sm">
                    <span className="text-xs text-black/40 block">Revenue</span>
                    <span className="font-bold">₹4.2M</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-black/5 flex justify-between items-center">
                  <h3 className="font-bold">Pending Vendor Approvals</h3>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                    {pendingVendors.length} New
                  </span>
                </div>
                <div className="divide-y divide-black/5">
                  {pendingVendors.length === 0 ? (
                    <div className="p-12 text-center text-black/40">No pending approvals</div>
                  ) : (
                    pendingVendors.map(v => (
                      <div key={v.id} className="p-6 flex items-center justify-between hover:bg-black/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                            <Store size={24} />
                          </div>
                          <div>
                            <div className="font-bold">{v.business_name}</div>
                            <div className="text-sm text-black/40">{v.category} • {v.location}</div>
                            <div className="text-[10px] text-black/30 mt-1">{v.email} • {v.contact_number}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 rounded-lg text-sm font-bold border border-black/10 hover:bg-black/5">Reject</button>
                          <button 
                            onClick={() => handleApprove(v.id)}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-600 text-white hover:bg-orange-700"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          ) : userVendorProfile ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-12">
              <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Your Vendor Profile</h2>
                  <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    userVendorProfile.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {userVendorProfile.status}
                  </span>
                </div>

                <div className="flex items-center gap-6 mb-8 p-6 bg-black/5 rounded-2xl">
                  {userVendorProfile.image_url ? (
                    <img src={userVendorProfile.image_url} alt="Business" className="w-24 h-24 rounded-xl object-cover" />
                  ) : (
                    <div className="w-24 h-24 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                      <Store size={40} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{userVendorProfile.business_name}</h3>
                    <p className="text-black/60">{userVendorProfile.category} • {userVendorProfile.location}</p>
                    <p className="text-sm font-bold mt-1 text-orange-600">₹{userVendorProfile.price.toLocaleString()} + 18% GST</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40 block mb-1">Description</label>
                    <p className="text-black/80">{userVendorProfile.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 block mb-1">Contact</label>
                      <p className="font-medium">{userVendorProfile.contact_number}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 block mb-1">Email</label>
                      <p className="font-medium">{userVendorProfile.email}</p>
                    </div>
                  </div>
                </div>

                {userVendorProfile.status === 'PENDING' && (
                  <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="text-orange-600 mt-0.5" size={18} />
                    <p className="text-sm text-orange-800">
                      Your application is currently under review. Once approved, your services will be visible to the public in the browse section.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Store className="text-orange-600 w-10 h-10" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Grow your business with VivahVandana</h1>
              <p className="text-lg text-black/60 mb-12">
                Join India's largest network of wedding service providers. 
                Register your business and start receiving bookings today.
              </p>
              
              <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl text-left">
                <h3 className="text-xl font-bold mb-6">Vendor Registration</h3>
                <form className="space-y-4" onSubmit={handleVendorRegister}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Business Name</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                        placeholder="e.g. Royal Decorators" 
                        value={vendorForm.business_name}
                        onChange={(e) => setVendorForm({...vendorForm, business_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Category</label>
                      <select 
                        className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none"
                        value={vendorForm.category}
                        onChange={(e) => setVendorForm({...vendorForm, category: e.target.value})}
                      >
                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Email ID</label>
                      <input 
                        type="email" 
                        required 
                        className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                        placeholder="vendor@example.com" 
                        value={vendorForm.email}
                        onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Contact Number</label>
                      <input 
                        type="tel" 
                        required 
                        className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                        placeholder="+91 98765 43210" 
                        value={vendorForm.contact_number}
                        onChange={(e) => setVendorForm({...vendorForm, contact_number: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Location</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                        placeholder="City, State" 
                        value={vendorForm.location}
                        onChange={(e) => setVendorForm({...vendorForm, location: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Starting Price (₹)</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none" 
                        placeholder="50000" 
                        value={vendorForm.price}
                        onChange={(e) => setVendorForm({...vendorForm, price: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Business Description</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-black/5 rounded-xl focus:outline-none h-32" 
                      placeholder="Tell us about your services..."
                      value={vendorForm.description}
                      onChange={(e) => setVendorForm({...vendorForm, description: e.target.value})}
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40 mb-1 block">Business Showcase Image</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-black/5 border-dashed rounded-xl hover:border-orange-600/20 transition-colors">
                      <div className="space-y-1 text-center">
                        {vendorForm.image_url ? (
                          <div className="relative inline-block">
                            <img src={vendorForm.image_url} alt="Preview" className="h-32 w-auto rounded-lg object-cover" />
                            <button 
                              type="button"
                              onClick={() => setVendorForm({ ...vendorForm, image_url: '' })}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-black/20" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-black/60">
                              <label className="relative cursor-pointer bg-white rounded-md font-bold text-orange-600 hover:text-orange-500 focus-within:outline-none">
                                <span>Upload a file</span>
                                <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-black/40">PNG, JPG, GIF up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-black/80 transition-all">
                    Submit Application
                  </button>
                </form>
              </div>
            </motion.div>
          )
        )}

        {view === 'admin' && null}
      </main>

      {/* Booking Success Modal */}
      <AnimatePresence>
        {bookingSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Booking Requested!</h3>
              <p className="text-black/60 mb-6">
                The vendor has been notified. You'll receive a confirmation shortly.
              </p>
              <button 
                onClick={() => setBookingSuccess(false)}
                className="w-full py-3 bg-black text-white rounded-xl font-bold"
              >
                Great!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Success Modal */}
      <AnimatePresence>
        {registrationSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="text-orange-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Application Sent!</h3>
              <p className="text-black/60 mb-6">
                Your vendor profile has been submitted for review. You can track the status in the Vendor tab.
              </p>
              <button 
                onClick={() => setRegistrationSuccess(false)}
                className="w-full py-3 bg-black text-white rounded-xl font-bold"
              >
                View Status
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-white border-t border-black/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center">
              <Store className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-orange-600">VivahVandana</span>
          </div>
          <p className="text-sm text-black/40 mb-8">© 2024 VivahVandana Services Pvt Ltd. All rights reserved.</p>
          <div className="flex justify-center gap-8 text-sm font-medium text-black/60">
            <a href="#" className="hover:text-orange-600">Privacy Policy</a>
            <a href="#" className="hover:text-orange-600">Terms of Service</a>
            <a href="#" className="hover:text-orange-600">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
