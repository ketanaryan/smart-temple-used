import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, AlertTriangle, CalendarCheck, Bell, Cloud, Thermometer, ShieldCheck, CheckCircle2, QrCode, Menu, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000';

function App() {
  const [temples, setTemples] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  
  const [selectedTemple, setSelectedTemple] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookedToken, setBookedToken] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [currentToken, setCurrentToken] = useState('');
  
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'home'); // 'home' | 'devotee' | 'staff' | 'admin'
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('adminToken') === 'true');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [staffSelectedTemple, setStaffSelectedTemple] = useState<number | null>(null);
  
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  
  const [userDashboard, setUserDashboard] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const fetchTemples = async () => {
    try {
      const res = await axios.get(`${API_URL}/temples/`);
      setTemples(res.data);
      if (res.data.length > 0) setSelectedTemple(res.data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSlots = async () => {
    if (!selectedTemple || !selectedDate) return;
    try {
      const res = await axios.get(`${API_URL}/temples/${selectedTemple}/slots`, {
        params: { date_str: selectedDate }
      });
      setSlots(res.data);
      setSelectedSlot('');
    } catch (e) {
      console.error(e);
    }
  };

  const adminTempleIdRef = React.useRef<number>(1);
  const [adminTempleState, setAdminTempleState] = useState<number>(1);

  const handleAdminTempleChange = (id: number) => {
    adminTempleIdRef.current = id;
    setAdminTempleState(id);
    fetchQueueStatus();
  };

  const fetchQueueStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/queue/status?temple_id=${adminTempleIdRef.current}`);
      setQueueStatus((prev: any) => ({
        ...res.data,
        cv_alerts: prev?.cv_alerts?.status !== "INITIALIZING" && prev?.cv_alerts ? prev.cv_alerts : res.data.cv_alerts
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserDashboard = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/users/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDashboard(res.data);
      setIsAdmin(res.data.user?.is_admin || false);
    } catch (e) {
      console.error("Session expired or invalid", e);
      localStorage.removeItem('token');
    }
  };

  useEffect(() => {
    fetchTemples();
    fetchQueueStatus();
    fetchUserDashboard();
    const interval = setInterval(fetchQueueStatus, 5000);
    
    // Phase 4: WebSocket for real-time CV alerts
    const WS_URL = import.meta.env.PROD ? `wss://${window.location.host}/api/ws/cv-alerts` : `ws://127.0.0.1:8000/ws/cv-alerts`;
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const cvAlert = JSON.parse(event.data);
      setQueueStatus((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          cv_alerts: cvAlert
        };
      });
    };
    
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [selectedTemple, selectedDate]);

  const handleBooking = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setBookingMessage('Please login first to make a booking.');
      return;
    }
    if (!selectedSlot) {
      setBookingMessage('Please select a time slot first.');
      return;
    }
    try {
      setBookingMessage('Booking...');
      const res = await axios.post(`${API_URL}/bookings/`, {
        slot_id: selectedSlot,
        is_online: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookingMessage(`Success!`);
      setBookedToken(res.data.token_number);
      fetchSlots(); // Refresh availability
      fetchQueueStatus(); // Refresh queue
    } catch (e: any) {
      setBookingMessage(`Failed: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleCallNext = async () => {
    try {
      const res = await axios.post(`${API_URL}/queue/call-next?temple_id=${adminTempleIdRef.current}`);
      if (res.data.called_token) {
        setCurrentToken(res.data.called_token);
        fetchQueueStatus();
      } else {
        alert("No devotees in queue for this temple!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`min-h-screen text-gray-800 font-sans flex flex-col ${activeTab === 'home' ? 'bg-black' : 'bg-gray-50'}`}>
      <header className="bg-white text-gray-800 p-4 shadow-md flex justify-between items-center z-50 sticky top-0 relative">
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 tracking-tight">
          <div className="bg-orange-500 text-white p-1.5 rounded-lg"><Users className="w-5 h-5 md:w-6 md:h-6" /></div>
          Smart Temple
        </h1>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:relative top-[100%] left-0 w-full md:w-auto bg-white md:bg-transparent shadow-lg md:shadow-none p-6 md:p-0 gap-6 md:gap-6 items-center text-sm font-semibold border-t md:border-0 border-gray-100 z-50 animate-in slide-in-from-top-2 md:animate-none`}>
          <button 
            onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
            className={`${activeTab === 'home' ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'hover:text-orange-500 text-gray-600'}`}
          >
            Home
          </button>
          <button 
            onClick={() => { setActiveTab('devotee'); setIsMobileMenuOpen(false); }}
            className={`${activeTab === 'devotee' ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'hover:text-orange-500 text-gray-600'}`}
          >
            Darshan Booking
          </button>
          <button 
            onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }}
            className="hover:text-orange-500 text-gray-600 font-bold"
          >
            Live Crowd Status
          </button>
          <button 
            onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 md:py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto"
          >
            <ShieldCheck className="w-4 h-4" /> Admin Portal
          </button>
        </div>
      </header>

      <main className={`flex-1 flex flex-col ${['home', 'devotee'].includes(activeTab) ? 'w-full' : 'p-8 max-w-5xl w-full mx-auto'}`}>
        
        {activeTab === 'home' && (
          <section className="relative flex-1 flex flex-col items-start justify-center text-left min-h-[85vh] animate-in fade-in duration-700 -mt-2">
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/temple-bg.jpg')" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
            </div>

            <div className="relative z-10 px-8 md:px-24 max-w-4xl">
              <h2 className="text-6xl md:text-[5.5rem] font-black text-white leading-[1.1] tracking-tight mb-4 drop-shadow-lg">
                Welcome to <br/><span className="text-orange-500">Smart Temple</span>
              </h2>
              <p className="text-xl md:text-3xl text-gray-200 mb-8 max-w-2xl font-medium drop-shadow-md">
                We are introducing the innovative solution to <br/><span className="text-orange-400 font-bold border-b-2 border-orange-400 pb-1">Efficient Devotee Flow Management</span>
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('devotee')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-md shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                  <CalendarCheck className="w-5 h-5"/> Book Darshan &rarr;
                </button>
                <button 
                  onClick={() => setActiveTab('staff')}
                  className="bg-black/40 backdrop-blur-sm border border-gray-400 hover:bg-black/60 text-white font-bold text-lg px-8 py-4 rounded-md shadow-sm transition-all active:scale-95 flex items-center gap-3"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Live Crowd Status
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'devotee' && (
          <section className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-12 min-h-[85vh] animate-in fade-in duration-500 -mt-2">
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center filter blur-sm scale-[1.02]"
              style={{ backgroundImage: "url('/temple-bg.jpg')" }}
            >
              <div className="absolute inset-0 bg-black/50"></div>
            </div>

            <div className="relative z-10 bg-white/95 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-3xl shadow-2xl border border-white/40 max-w-xl w-[95%] md:w-full mx-auto my-4 md:my-0">
              <div className="text-center mb-6 md:mb-8">
                <div className="inline-flex bg-orange-100 p-2 md:p-3 rounded-full mb-3 md:mb-4">
                  <CalendarCheck className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Book your Darshan</h2>
                <p className="text-gray-500 font-medium mt-2">Secure your digital token for a peaceful visit.</p>
              </div>

              {!localStorage.getItem('token') ? (
                <div className="bg-orange-50/80 p-5 md:p-8 rounded-xl md:rounded-2xl border border-orange-100/50 mb-6 text-center shadow-inner relative overflow-hidden transition-all duration-300">
                  <h3 className="font-bold text-orange-900 mb-2 text-lg md:text-xl">{authMode === 'login' ? 'Welcome Back' : 'Create an Account'}</h3>
                  <p className="text-orange-700/80 text-sm mb-6">
                    {authMode === 'login' ? 'Please log in to make a genuine slot booking.' : 'Register to book your Darshan slots.'}
                  </p>
                  
                  {authMode === 'login' ? (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                      <input id="loginEmail" type="email" placeholder="Email Address" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <input id="loginPassword" type="password" placeholder="Password" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      
                      <button 
                        onClick={async () => {
                          const email = (document.getElementById('loginEmail') as HTMLInputElement).value;
                          const pwd = (document.getElementById('loginPassword') as HTMLInputElement).value;
                          if (!email || !pwd) return alert("Please enter both an email and a password.");
                          try {
                            const { data, error } = await supabase.auth.signInWithPassword({
                              email,
                              password: pwd
                            });
                            if (error) throw error;
                            localStorage.setItem('token', data.session?.access_token || '');
                            window.location.reload();
                          } catch (e: any) { alert("Login Failed: " + (e.message || "Invalid credentials")); }
                        }}
                        className="w-full mt-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                      >Login</button>
                      
                      <p className="mt-4 text-sm text-gray-600">
                        Don't have an account?{' '}
                        <button onClick={() => setAuthMode('register')} className="text-orange-600 font-bold hover:underline">Register here</button>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <input id="regName" type="text" placeholder="Full Name" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <input id="regEmail" type="email" placeholder="Email Address" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <input id="regPassword" type="password" placeholder="Password" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <input id="regPasswordConfirm" type="password" placeholder="Re-type Password" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      
                      <button 
                        onClick={async () => {
                          const name = (document.getElementById('regName') as HTMLInputElement).value;
                          const email = (document.getElementById('regEmail') as HTMLInputElement).value;
                          const pwd = (document.getElementById('regPassword') as HTMLInputElement).value;
                          const pwdConfirm = (document.getElementById('regPasswordConfirm') as HTMLInputElement).value;
                          
                          if (!name || !email || !pwd || !pwdConfirm) return alert("Please fill in all fields.");
                          if (pwd !== pwdConfirm) return alert("Passwords do not match!");
                          
                          try {
                            const { error } = await supabase.auth.signUp({
                              email,
                              password: pwd,
                              options: { data: { name } }
                            });
                            if (error) throw error;
                            alert("Registered successfully! Please check your email for a confirmation link (if enabled), then login.");
                            setAuthMode('login');
                          } catch (e: any) { alert("Registration Failed: " + (e.message || "Error")); }
                        }}
                        className="w-full mt-2 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                      >Create Account</button>
                      
                      <p className="mt-4 text-sm text-gray-600">
                        Already have an account?{' '}
                        <button onClick={() => setAuthMode('login')} className="text-orange-600 font-bold hover:underline">Login here</button>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  {!showBookingForm ? (
                    <div className="bg-white/95 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-white/40 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
                      <div className="flex justify-between items-start mb-6 md:mb-8">
                        <div>
                          <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Welcome, {userDashboard?.user?.name || 'Devotee'}</h3>
                          <p className="text-gray-500 font-medium mt-1">{userDashboard?.user?.email}</p>
                        </div>
                        <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors">Logout</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col justify-center">
                          <div className="text-4xl font-black text-orange-600 mb-1">{userDashboard?.bookings?.length || 0}</div>
                          <div className="text-xs font-bold text-orange-900/70 uppercase tracking-wider">Total Darshans</div>
                        </div>
                        <button 
                          onClick={() => setShowBookingForm(true)}
                          className="bg-gradient-to-br from-gray-900 to-black hover:from-black hover:to-gray-900 text-white p-5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 border border-gray-800"
                        >
                          <CalendarCheck className="w-8 h-8 text-orange-500" />
                          <span className="font-bold">Book New Slot</span>
                        </button>
                      </div>

                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400"/> Recent Bookings</h4>
                      <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
                        {(!userDashboard?.bookings || userDashboard.bookings.length === 0) ? (
                          <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                            <div className="font-bold text-gray-700 mb-1">No past bookings</div>
                            <div className="text-sm">Click 'Book New Slot' to get started!</div>
                          </div>
                        ) : (
                          userDashboard.bookings.map((b: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                              <div>
                                <div className="font-bold text-gray-900">{b.temple_name}</div>
                                <div className="text-xs font-medium text-gray-500 mt-1">{b.date} • {b.start_time.substring(0,5)} - {b.end_time.substring(0,5)}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg inline-block">{b.token}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase mt-2">{b.status}</div>
                              </div>
                            </div>
                          )).reverse()
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/95 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-white/40 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                        <h3 className="text-xl font-black text-gray-900">Book New Slot</h3>
                        <button onClick={() => setShowBookingForm(false)} className="text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors">&larr; Back to Profile</button>
                      </div>
                      <div className="mb-5">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Select Temple</label>
                  <select 
                    className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition" 
                    value={selectedTemple}
                    onChange={(e) => setSelectedTemple(e.target.value)}
                  >
                    {temples.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}, {t.city}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Select Date</label>
                  <input 
                    type="date" 
                    className="w-full border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                
                <label className="block text-sm font-semibold mb-2 text-gray-700">Available Slots</label>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {slots.length === 0 ? (
                    <div className="col-span-2 text-gray-500 text-sm p-4 bg-gray-50 rounded-lg text-center border border-dashed">No slots found for this date.</div>
                  ) : (
                    slots.map(slot => (
                      <button 
                        key={slot.id}
                        onClick={() => {
                          if (slot.availability > 0) setSelectedSlot(slot.id);
                        }}
                        disabled={slot.availability <= 0}
                        className={`p-3 rounded-lg border-2 transition text-left relative overflow-hidden ${
                          slot.availability <= 0 
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : selectedSlot === slot.id 
                              ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm'
                              : 'border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50/50'
                        }`}
                      >
                        <div className="font-semibold">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</div>
                        <div className={`text-xs mt-1 font-medium ${slot.availability <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {slot.availability <= 0 ? 'FULLY BOOKED' : `${slot.availability} spots remaining`}
                        </div>
                        {selectedSlot === slot.id && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full"></div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className="bg-gray-50/80 border p-5 rounded-2xl mb-8 flex flex-col gap-4">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 accent-orange-600 rounded mt-1" checked={isPriority} onChange={e => setIsPriority(e.target.checked)} />
                    <div>
                      <div className="font-bold text-gray-800 group-hover:text-orange-700 transition-colors">Senior Citizen / Divyang (Priority)</div>
                      <div className="text-sm text-gray-500 mt-0.5">Expedites queue progression automatically</div>
                    </div>
                  </label>
                  <div className="h-px w-full bg-gray-200/60"></div>
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 accent-green-600 rounded mt-1" checked={notifyWhatsApp} onChange={e => setNotifyWhatsApp(e.target.checked)} />
                    <div>
                      <div className="font-bold text-green-800 flex items-center gap-1.5 group-hover:text-green-900 transition-colors">
                        Enable WhatsApp Alerts <Bell className="w-4 h-4"/>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">Get notified 15 mins before your expected darshan time</div>
                    </div>
                  </label>
                </div>

                <button 
                  onClick={handleBooking}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white py-5 rounded-xl font-black text-xl shadow-[0_8px_30px_rgb(234,88,12,0.3)] transition-all active:scale-[0.98] active:shadow-sm"
                >
                  Confirm Booking Request
                </button>
                
                {bookingMessage && (
                  <div className={`mt-8 p-8 rounded-2xl flex flex-col items-center text-center shadow-lg relative overflow-hidden ${bookingMessage.includes('Success') ? 'bg-green-50 border-2 border-green-500 text-green-800' : 'bg-red-50 text-red-800 border-2 border-red-200'}`}>
                    {bookingMessage.includes('Success') && <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>}
                    {bookingMessage.includes('Success') ? (
                      <>
                        <h3 className="text-2xl font-black mb-2 text-green-900">Booking Confirmed!</h3>
                        <p className="mb-6 font-medium text-green-700">Your digital e-Token has been generated.</p>
                        <div className="bg-white p-6 inline-block rounded-2xl shadow-sm border border-green-100">
                          <QRCodeSVG value={bookedToken} size={180} level="H" includeMargin={true} fgColor="#064e3b" />
                        </div>
                        <p className="text-sm text-gray-600 mt-6 flex justify-center items-center gap-2 font-bold"><QrCode className="w-5 h-5"/> Show this QR at the smart entrance gate</p>
                        {notifyWhatsApp && <p className="text-sm font-black text-green-700 mt-3">✓ WhatsApp alerts enabled for +91 ********</p>}
                      </>
                    ) : (
                      <span className="font-bold text-lg">{bookingMessage}</span>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          )}
          </div>
        </section>
      )}

        {activeTab === 'staff' && (
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-8 max-w-4xl mx-auto">
            {!staffSelectedTemple ? (
              <div className="flex flex-col gap-4 text-center items-center py-12">
                <ShieldCheck className="w-16 h-16 text-blue-500 mb-2" />
                <h2 className="text-2xl font-black text-gray-900">Select Temple to Monitor</h2>
                <p className="text-gray-500 max-w-md mb-4">Choose a temple below to view its live crowd status, queue metrics, and environment sensors.</p>
                <select
                  className="w-full max-w-md p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-bold text-lg focus:border-blue-500 outline-none transition-colors cursor-pointer"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val) {
                      setStaffSelectedTemple(val);
                      handleAdminTempleChange(val);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Choose Temple --</option>
                  {temples.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}, {t.city}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Clock className="w-7 h-7 text-blue-600" />
                    Live Queue & Crowd Control
                  </h2>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setStaffSelectedTemple(null)} className="text-sm font-bold text-gray-500 hover:text-blue-600 underline">Change Temple</button>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                </div>

            {/* NEW: IoT Environment Sensors Mock */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 border-r pr-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Thermometer className="w-5 h-5"/></div>
                <div><div className="text-xs font-bold text-gray-500">AMBIENT TEMP</div><div className="text-lg font-black text-gray-800">{queueStatus?.environment?.temp || '24.5°C'}</div></div>
              </div>
              <div className="flex items-center gap-3 border-r pr-4">
                <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg"><Cloud className="w-5 h-5"/></div>
                <div><div className="text-xs font-bold text-gray-500">INDOOR AQI</div><div className="text-lg font-black text-gray-800">{queueStatus?.environment?.aqi || 42} <span className="text-xs font-bold text-green-500">{queueStatus?.environment?.aqi_status || 'GOOD'}</span></div></div>
              </div>
              <div className="flex items-center gap-3 border-r pr-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Users className="w-5 h-5"/></div>
                <div><div className="text-xs font-bold text-gray-500">CAPACITY (ZONE A)</div><div className="text-lg font-black text-gray-800">{queueStatus?.environment?.cap || '68%'}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><ShieldCheck className="w-5 h-5"/></div>
                <div><div className="text-xs font-bold text-gray-500">SECURITY STATUS</div><div className="text-lg font-black text-teal-700">{queueStatus?.environment?.sec || 'SECURE'}</div></div>
              </div>
            </div>
            
            {queueStatus ? (
              <>
                <div className="bg-gray-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-lg border border-gray-800">
                  <div>
                    <div className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">Now Serving</div>
                    <div className="text-5xl font-black text-orange-500 tracking-wider">
                      {currentToken || "WAITING"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center border border-blue-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="text-sm text-blue-700 font-bold uppercase tracking-wider">Online Booking Queue</div>
                    <div className="text-6xl font-black text-blue-900 my-4">{queueStatus.online_queue}</div>
                    <div className="text-sm text-blue-600 font-medium">waiting devotees</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center border border-green-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                    <div className="text-sm text-green-700 font-bold uppercase tracking-wider">Walk-in Queue</div>
                    <div className="text-6xl font-black text-green-900 my-4">{queueStatus.walkin_queue}</div>
                    <div className="text-sm text-green-600 font-medium">waiting devotees</div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 p-6 rounded-2xl flex gap-4 shadow-sm items-start">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-bold text-yellow-900 text-xl mb-1">Dynamic Queue Balancer</div>
                    <div className="text-yellow-800 leading-relaxed">
                      The system detects queue imbalance. Tendency favors: <strong className="bg-yellow-200 px-2 py-1 rounded">{queueStatus.next_category || 'BALANCED'}</strong>
                      <br/>The automated gate token will be pulled from this queue next to restore fairness.
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-300 p-6 rounded-2xl shadow-sm">
                  <h3 className="font-bold mb-4 text-indigo-900 text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Phase 3: M/M/k Queuing Estimation
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 text-center">
                      <div className="text-xs text-indigo-500 font-bold uppercase">Arrival Rate (λ)</div>
                      <div className="text-xl font-black text-indigo-900">{queueStatus.mmk_metrics.arrival_rate_lambda} <span className="text-xs font-normal">/min</span></div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 text-center">
                      <div className="text-xs text-indigo-500 font-bold uppercase">Service Rate (µ)</div>
                      <div className="text-xl font-black text-indigo-900">{queueStatus.mmk_metrics.service_rate_mu} <span className="text-xs font-normal">/min</span></div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 text-center">
                      <div className="text-xs text-indigo-500 font-bold uppercase">Active Counters (k)</div>
                      <div className="text-xl font-black text-indigo-900">{queueStatus.mmk_metrics.counters_k}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-indigo-100 p-4 rounded-xl border border-indigo-200 text-center">
                      <div className="text-xs text-indigo-600 font-bold uppercase">Expected Queue Length (Lq)</div>
                      <div className="text-2xl font-black text-indigo-900">{queueStatus.mmk_metrics.expected_queue_length} <span className="text-sm font-normal">people</span></div>
                    </div>
                    <div className="bg-indigo-100 p-4 rounded-xl border border-indigo-200 text-center">
                      <div className="text-xs text-indigo-600 font-bold uppercase">System Utilization (ρ)</div>
                      <div className="text-2xl font-black text-indigo-900">{queueStatus.mmk_metrics.utilization_pct}%</div>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-600 text-white p-4 rounded-xl flex justify-between items-center shadow-inner">
                    <div className="font-bold">Expected Waiting Time (Wq):</div>
                    <div className="text-3xl font-black">
                      {queueStatus.mmk_metrics.expected_wait_mins} {typeof queueStatus.mmk_metrics.expected_wait_mins === 'number' ? 'mins' : ''}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h3 className="font-bold mb-4 text-gray-800 text-lg">Computer Vision Alerts (YOLOv8 + ByteTrack)</h3>
                  <div className={`p-6 rounded-2xl border-2 flex items-center justify-between shadow-sm transition-colors ${queueStatus.cv_alerts.status === 'HIGH CONGESTION' ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                    <div>
                      <div className="text-gray-500 font-semibold uppercase text-xs mb-1">Camera Feed Estimate</div>
                      <div className={`text-3xl font-black ${queueStatus.cv_alerts.status === 'HIGH CONGESTION' ? 'text-red-900' : 'text-green-900'}`}>
                        {queueStatus.cv_alerts.detected_crowd} <span className="text-lg font-medium opacity-60">people detected</span>
                      </div>
                      <div className="text-sm opacity-80 mt-2 font-medium">Expected threshold from bookings: {queueStatus.cv_alerts.expected_devotees}</div>
                    </div>
                    <div className={`px-6 py-3 rounded-full font-black tracking-widest text-sm shadow-sm ${queueStatus.cv_alerts.status === 'HIGH CONGESTION' ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
                      {queueStatus.cv_alerts.status}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-20 flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                Connecting to live systems...
              </div>
            )}
            </>
            )}
          </section>
        )}
        {activeTab === 'admin' && (
          <section className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto animate-in fade-in duration-300 w-[95%] md:w-full my-4 md:my-0">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3 text-orange-600">
                <ShieldCheck className="w-6 h-6 md:w-7 md:h-7" />
                Temple Admin Portal
              </h2>
            </div>

            {userDashboard?.user?.email === 'mainadmin@smarttemple.com' && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm mb-6">
                <h4 className="font-bold text-blue-800 mb-2">Main Admin Controls</h4>
                <p className="text-blue-600 text-sm mb-4">Generate unique Temple Codes to distribute to Temple Admins.</p>
                <button onClick={async () => {
                  const code = prompt("Enter a new unique temple code:");
                  if (code) {
                    try {
                      await axios.post(`${API_URL}/admin/generate-code`, {code}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
                      alert("Code generated successfully!");
                    } catch(e: any) { alert("Failed: " + (e.response?.data?.detail || e.message)); }
                  }
                }} className="bg-blue-600 text-white py-2 px-6 rounded-lg font-bold hover:bg-blue-700">Generate New Temple Code</button>
              </div>
            )}
            
            {!isAdmin ? (
              <div className="bg-gray-50 border p-8 rounded-2xl flex flex-col items-center justify-center min-h-[40vh] text-center shadow-sm">
                <ShieldCheck className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Restricted Area</h3>
                {!localStorage.getItem('token') ? (
                  <p className="text-gray-500 mb-6 max-w-md">Please login via the Home tab to access or register your temple portal.</p>
                ) : (
                  <div className="w-full max-w-md mt-4 flex flex-col gap-3 text-left">
                    <p className="text-gray-500 mb-4 text-center">Register your temple by providing the unique Temple Code assigned by the Main Admin.</p>
                    <input id="adminCity" placeholder="City (e.g. Mumbai)" className="p-3 border rounded-lg w-full outline-none focus:border-orange-500" />
                    <input id="adminTempleName" placeholder="Temple Name" className="p-3 border rounded-lg w-full outline-none focus:border-orange-500" />
                    <input id="adminTempleCode" placeholder="Temple Code" className="p-3 border rounded-lg w-full outline-none focus:border-orange-500" />
                    <button 
                      onClick={async () => {
                        const city = (document.getElementById('adminCity') as HTMLInputElement).value;
                        const templeName = (document.getElementById('adminTempleName') as HTMLInputElement).value;
                        const code = (document.getElementById('adminTempleCode') as HTMLInputElement).value;
                        if (!city || !templeName || !code) return alert("Please fill all fields.");
                        try {
                          await axios.post(`${API_URL}/admin/register-temple`, { city, temple_name: templeName, temple_code: code, name: userDashboard?.user?.name || "Admin" }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
                          alert("Registered as Admin successfully! Reloading...");
                          window.location.reload();
                        } catch(e: any) { alert("Registration Failed: " + (e.response?.data?.detail || e.message)); }
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 mt-2 rounded-lg font-bold shadow-lg transition-all"
                    >Register as Admin</button>
                    
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Managing Temple</label>
                  <select 
                    value={adminTempleState}
                    onChange={(e) => handleAdminTempleChange(Number(e.target.value))}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-bold text-lg focus:border-orange-500 outline-none transition-colors"
                  >
                    {temples.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}, {t.city}</option>
                    ))}
                  </select>
                </div>
                
                <div className="bg-gray-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0 shadow-lg border border-gray-800 text-center md:text-left">
                  <div>
                    <div className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">Queue Control</div>
                    <div className="text-4xl font-black text-orange-500 tracking-wider">
                      {currentToken || "WAITING"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-center md:items-end w-full md:w-auto">
                    <button 
                      onClick={handleCallNext}
                      className="w-full md:w-auto justify-center bg-orange-600 hover:bg-orange-500 text-white px-6 py-4 md:px-10 md:py-5 rounded-xl font-black text-lg md:text-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 border-b-4 border-orange-800"
                    >
                      CALL NEXT DEVOTEE
                    </button>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('adminToken');
                        setIsAdmin(false);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-300 underline font-bold mt-2"
                    >
                      Log out of Admin
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border rounded-xl p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-3 md:border-r md:pr-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0"><Thermometer className="w-5 h-5"/></div>
                    <div><div className="text-[10px] md:text-xs font-bold text-gray-500">AMBIENT TEMP</div><div className="text-base md:text-lg font-black text-gray-800">{queueStatus?.environment?.temp || '24.5°C'}</div></div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-3 md:border-r md:pr-4 border-l pl-4 md:border-l-0 md:pl-0">
                    <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg flex-shrink-0"><Cloud className="w-5 h-5"/></div>
                    <div><div className="text-[10px] md:text-xs font-bold text-gray-500">INDOOR AQI</div><div className="text-base md:text-lg font-black text-gray-800">{queueStatus?.environment?.aqi || 42} <span className="text-[10px] font-bold text-green-500">{queueStatus?.environment?.aqi_status || 'GOOD'}</span></div></div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-3 md:border-r md:pr-4 pt-4 md:pt-0 border-t md:border-t-0 col-span-1">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg flex-shrink-0"><Users className="w-5 h-5"/></div>
                    <div><div className="text-[10px] md:text-xs font-bold text-gray-500">CAPACITY</div><div className="text-base md:text-lg font-black text-gray-800">{queueStatus?.environment?.cap || '68%'}</div></div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-3 pt-4 md:pt-0 border-t border-l pl-4 md:border-t-0 md:border-l-0 md:pl-0 col-span-1">
                    <div className="p-2 bg-teal-100 text-teal-600 rounded-lg flex-shrink-0"><ShieldCheck className="w-5 h-5"/></div>
                    <div><div className="text-[10px] md:text-xs font-bold text-gray-500">SECURITY</div><div className="text-base md:text-lg font-black text-teal-700">{queueStatus?.environment?.sec || 'SECURE'}</div></div>
                  </div>
                </div>

                {queueStatus && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center border border-blue-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="text-sm text-blue-700 font-bold uppercase tracking-wider">Online Booking Queue</div>
                        <div className="text-6xl font-black text-blue-900 my-4">{queueStatus.online_queue}</div>
                        <div className="text-sm text-blue-600 font-medium">waiting devotees</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center border border-green-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <div className="text-sm text-green-700 font-bold uppercase tracking-wider">Walk-in Queue</div>
                        <div className="text-6xl font-black text-green-900 my-4">{queueStatus.walkin_queue}</div>
                        <div className="text-sm text-green-600 font-medium">waiting devotees</div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-300 p-6 rounded-2xl flex gap-4 shadow-sm items-start">
                      <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-bold text-yellow-900 text-xl mb-1">Dynamic Queue Balancer</div>
                        <div className="text-yellow-800 leading-relaxed">
                          The system detects queue imbalance. Tendency favors: <strong className="bg-yellow-200 px-2 py-1 rounded">{queueStatus.next_category || 'BALANCED'}</strong>
                          <br/>The automated gate token will be pulled from this queue next to restore fairness.
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-300 p-6 rounded-2xl shadow-sm">
                      <h3 className="font-bold mb-4 text-indigo-900 text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Phase 3: M/M/k Queuing Estimation
                      </h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 text-center">
                          <div className="text-xs text-indigo-500 font-bold uppercase">Arrival Rate (λ)</div>
                          <div className="text-xl font-black text-indigo-900">{queueStatus.mmk_metrics.arrival_rate_lambda} <span className="text-xs font-normal">/min</span></div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 text-center">
                          <div className="text-xs text-indigo-500 font-bold uppercase">Service Rate (µ)</div>
                          <div className="text-xl font-black text-indigo-900">{queueStatus.mmk_metrics.service_rate_mu} <span className="text-xs font-normal">/min</span></div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 text-center">
                          <div className="text-xs text-indigo-500 font-bold uppercase">Active Counters (k)</div>
                          <div className="text-xl font-black text-indigo-900">{queueStatus.mmk_metrics.counters_k}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mt-2">
                  <h4 className="font-bold text-orange-800 mb-2">System Diagnostics</h4>
                  <p className="text-sm text-orange-600 mb-4">WebSocket and AI Server status.</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-green-700 mb-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> WebSocket Broadcaster: Connected
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> YOLOv8 Crowd CV: Active
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl relative overflow-hidden mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      Live CCTV Feed
                    </h3>
                    <span className="text-xs font-mono text-gray-400">CAM-01 / GATE A</span>
                  </div>
                  <div className="relative w-full bg-black rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center h-[300px]">
                    <video 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover opacity-80 mix-blend-screen"
                      ref={(videoRef) => {
                        if (videoRef && !videoRef.srcObject) {
                          navigator.mediaDevices.getUserMedia({ video: true })
                            .then(stream => { videoRef.srcObject = stream; })
                            .catch(err => console.error("Camera access denied:", err));
                        }
                      }}
                    />
                    <div className="absolute top-4 left-4 text-[12px] font-mono text-white/90 font-bold drop-shadow-md">REC</div>
                    <div className="absolute top-4 right-4 text-[12px] font-mono text-white/90 font-bold drop-shadow-md">LIVE</div>
                    <div className="absolute inset-0 pointer-events-none border-[1px] border-white/10" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '100% 4px' }}></div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest mt-2">Authorized Personnel Only</p>
                </div>

              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
