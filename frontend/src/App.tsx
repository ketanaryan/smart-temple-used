import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, AlertTriangle, CalendarCheck, Bell, Cloud, Thermometer, ShieldCheck, CheckCircle2, QrCode, Menu, X, Camera, MapPin, Grid, Heart, Car, Search, Languages, Upload, Copy, Check, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000';



const getLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalTimeStr = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const normalizeCity = (city: string) => {
  if (!city) return '';
  const c = city.trim();
  return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
};

function App() {
  const [temples, setTemples] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  
  const [selectedTemple, setSelectedTemple] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookedToken, setBookedToken] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [currentToken, setCurrentToken] = useState('');
  
  
  const [lang, setLang] = useState<string>(localStorage.getItem('lang') || 'en');
  const isHindi = lang === 'hi';
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(true);

  const changeLanguage = (newLang: 'en' | 'hi') => {
    localStorage.setItem('lang', newLang);
    setLang(newLang);
  };
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'home'); // 'home' | 'devotee' | 'staff' | 'admin'
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('adminToken') === 'true');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'devotee' | 'admin'>('devotee');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [staffSelectedTemple, setStaffSelectedTemple] = useState<number | null>(null);

  const [ticketViewToken, setTicketViewToken] = useState<string | null>(new URLSearchParams(window.location.search).get('ticket'));
  const [bookingHistoryTab, setBookingHistoryTab] = useState<'active' | 'past'>('active');
  const [ticketData, setTicketData] = useState<any>(null);
  const [activeServiceModal, setActiveServiceModal] = useState<string | null>(null);
  const [sosSent, setSosSent] = useState(false);
  const [donateAmount, setDonateAmount] = useState('501');
  const [donatePurpose, setDonatePurpose] = useState('General Temple Fund');
  const [donateDevoteeName, setDonateDevoteeName] = useState('');
  const [donateStep, setDonateStep] = useState<'select' | 'pay' | 'receipt'>('select');
  const [donateUtr, setDonateUtr] = useState('');
  const [donateScreenshot, setDonateScreenshot] = useState<string | null>(null);
  const [donateReceiptData, setDonateReceiptData] = useState<any>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [lostFoundData, setLostFoundData] = useState<any[]>([]);
  const [parkingData, setParkingData] = useState<any>(null);
  const [parkingZone, setParkingZone] = useState<'A' | 'B' | 'C'>('A');
  const [parkingSelectedSlot, setParkingSelectedSlot] = useState<string>('');
  const [parkingVehicleType, setParkingVehicleType] = useState<string>('4-Wheeler');
  const [parkingVehicleNum, setParkingVehicleNum] = useState<string>('');
  const [parkingDriverName, setParkingDriverName] = useState<string>('');
  const [parkingPhone, setParkingPhone] = useState<string>('');
  const [parkingPass, setParkingPass] = useState<any>(null);
  const [isReservingParking, setIsReservingParking] = useState<boolean>(false);
  const [parkingError, setParkingError] = useState<string>('');
  const [lfType, setLfType] = useState('child');
  const [lfDesc, setLfDesc] = useState('');

  const handleSelectParkingZone = (zoneId: 'A' | 'B' | 'C') => {
    setParkingZone(zoneId);
    setParkingSelectedSlot('');
    setParkingError('');
    if (zoneId === 'A') setParkingVehicleType('4-Wheeler');
    else if (zoneId === 'B') setParkingVehicleType('2-Wheeler');
    else if (zoneId === 'C') setParkingVehicleType('VIP & Divyang');
  };

  const handleReserveParking = async (e: React.FormEvent) => {
    e.preventDefault();
    setParkingError('');
    if (!parkingSelectedSlot) {
      setParkingError(isHindi ? 'कृपया ऊपर दिए गए नक्शे में से एक खाली (हरा) स्लॉट चुनें।' : 'Please select an available (green) slot on the parking map.');
      return;
    }
    if (!parkingVehicleNum.trim()) {
      setParkingError(isHindi ? 'कृपया अपने वाहन का नंबर दर्ज करें (उदा. MH 02 CZ 4589)।' : 'Please enter vehicle number plate (e.g. MH 02 CZ 4589).');
      return;
    }
    if (!parkingDriverName.trim()) {
      setParkingError(isHindi ? 'कृपया चालक / श्रद्धालु का नाम दर्ज करें।' : 'Please enter driver / devotee name.');
      return;
    }

    setIsReservingParking(true);
    try {
      const res = await axios.post(`${API_URL}/services/parking/book`, {
        vehicle_type: parkingVehicleType,
        vehicle_number: parkingVehicleNum.trim().toUpperCase(),
        driver_name: parkingDriverName.trim(),
        phone: parkingPhone.trim() || undefined,
        zone_id: parkingZone,
        slot_name: parkingSelectedSlot
      });

      if (res.data.success && res.data.pass) {
        setParkingPass(res.data.pass);
        setParkingData(res.data);
      }
    } catch (err: any) {
      setParkingError(err.response?.data?.detail || 'Slot reservation failed. Please try again.');
    } finally {
      setIsReservingParking(false);
    }
  };

  const handleResetParking = () => {
    setParkingPass(null);
    setParkingSelectedSlot('');
    setParkingVehicleNum('');
    setParkingDriverName('');
    setParkingPhone('');
    setParkingError('');
    fetchServices();
  };
  
  const fetchServices = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/services/parking`);
      setParkingData(pRes.data);
      const lfRes = await axios.get(`${API_URL}/services/lostfound`);
      setLostFoundData(lfRes.data);
    } catch(e) {}
  };

  const [ticketError, setTicketError] = useState('');

  useEffect(() => {
    if (ticketViewToken) {
      axios.get(`${API_URL}/ticket/${ticketViewToken}`)
        .then(res => setTicketData(res.data))
        .catch(err => setTicketError('Invalid or Expired Ticket'));
    }
  }, [ticketViewToken]);

  useEffect(() => {
    if (!ticketViewToken) {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, ticketViewToken]);
  
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
    if (!selectedTemple || !selectedDate) {
      setSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    try {
      const res = await axios.get(`${API_URL}/temples/${selectedTemple}/slots`, {
        params: { date_str: selectedDate }
      });
      setSlots(res.data);
      setSelectedSlot('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSlots(false);
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

  const [adminCodes, setAdminCodes] = useState<any[]>([]);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);

  const fetchAdminCodes = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/admin/codes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminCodes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserDashboard = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoadingDashboard(false);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/users/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDashboard(res.data);
      setIsAdmin(res.data.user?.is_admin || false);
      if (res.data.user?.is_admin && res.data.user?.email !== 'mainadmin@smarttemple.com' && res.data.user?.managed_temples?.length > 0) {
        setAdminTempleState(res.data.user.managed_temples[0].id);
        adminTempleIdRef.current = res.data.user.managed_temples[0].id;
      }
      if (res.data.user?.email === 'mainadmin@smarttemple.com') {
        fetchAdminCodes();
      }
    } catch (e) {
      console.error("Session expired or invalid", e);
      localStorage.removeItem('token');
    } finally {
      setIsLoadingDashboard(false);
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
      fetchUserDashboard(); // Refresh devotee dashboard bookings
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
    if (!timeStr) return '';
    try {
      const [h, m] = String(timeStr).split(':');
      const d = new Date();
      d.setHours(parseInt(h, 10), parseInt(m, 10));
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(timeStr);
    }
  };

  const isBookingActive = (b: any) => {
    if (!b || !b.date) return false;
    if (b.status === 'SERVED' || b.status === 'CANCELLED' || b.status === 'COMPLETED' || b.status === 'VISITED') {
      return false;
    }
    const today = getLocalDateStr();
    const bDate = String(b.date).substring(0, 10);
    if (bDate > today) return true;
    if (bDate === today) {
      const nowTime = getLocalTimeStr();
      const endTime = b.end_time ? String(b.end_time).substring(0, 8) : (b.start_time ? String(b.start_time).substring(0, 8) : '23:59:59');
      return endTime >= nowTime;
    }
    return false;
  };

  const allUserBookings = userDashboard?.bookings || [];
  const activeBookings = allUserBookings.filter((b: any) => isBookingActive(b));
  const pastBookings = allUserBookings.filter((b: any) => !isBookingActive(b));

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(isHindi ? "स्क्रीनशॉट का आकार 5MB से कम होना चाहिए।" : "Screenshot size must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDonateScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText("templetrust@sbi");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitDonation = async () => {
    setIsSubmittingDonation(true);
    const amountVal = Number(donateAmount) || 101;
    const nameVal = donateDevoteeName || userDashboard?.user?.name || 'Devotee';
    const purposeVal = donatePurpose || 'General Temple Trust Fund';
    const utrVal = donateUtr || `UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    try {
      const res = await axios.post(`${API_URL}/services/donate`, {
        user_name: nameVal,
        amount: amountVal,
        purpose: purposeVal,
        utr_number: utrVal,
        receipt_image: donateScreenshot ? 'attached' : null
      });
      setDonateReceiptData(res.data.receipt || {
        receipt_id: `REC-${Date.now().toString().slice(-6)}`,
        user_name: nameVal,
        amount: amountVal,
        purpose: purposeVal,
        utr_number: utrVal,
        timestamp: new Date().toLocaleString(),
        status: 'VERIFIED'
      });
      setDonateStep('receipt');
    } catch (e) {
      setDonateReceiptData({
        receipt_id: `REC-${Date.now().toString().slice(-6)}`,
        user_name: nameVal,
        amount: amountVal,
        purpose: purposeVal,
        utr_number: utrVal,
        timestamp: new Date().toLocaleString(),
        status: 'VERIFIED'
      });
      setDonateStep('receipt');
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  const handleCloseDonateModal = () => {
    setActiveServiceModal(null);
    setDonateStep('select');
    setDonateUtr('');
    setDonateScreenshot(null);
    setDonateReceiptData(null);
  };

  if (ticketViewToken) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans bg-[url('https://images.unsplash.com/photo-1582510003544-4d00b7f74151?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-orange-600 p-6 text-center text-white relative">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full"></div>
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full"></div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-orange-200 mb-1">e-Darshan Ticket</h2>
            <h1 className="text-2xl font-black">{ticketData ? ticketData.temple_name : 'Loading...'}</h1>
          </div>
          
          <div className="p-8 flex flex-col gap-6 relative">
            {ticketError ? (
              <div className="text-red-500 font-bold text-center py-10 flex flex-col items-center gap-2">
                <AlertTriangle className="w-12 h-12 mb-2" />
                {ticketError}
              </div>
            ) : !ticketData ? (
              <div className="text-gray-500 font-bold text-center py-10 flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                Verifying ticket...
              </div>
            ) : (
              (() => {
                const isTicketPassed = !isBookingActive(ticketData) || ticketData?.status === 'VISITED' || ticketData?.status === 'SERVED' || ticketData?.status === 'COMPLETED';
                return (
                  <>
                    <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-6">
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase">Devotee</div>
                        <div className="text-lg font-black text-gray-800">{ticketData.user_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-400 uppercase">{isHindi ? "स्थिति" : "Status"}</div>
                        {isTicketPassed ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border border-blue-300 px-3 py-1 rounded-full mt-1 shadow-sm uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            {isHindi ? 'दर्शन संपन्न (VISITED)' : 'VISITED'}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full mt-1 shadow-sm uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {isHindi ? 'कन्फर्म' : 'CONFIRMED'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase">{isHindi ? "तिथि" : "Date"}</div>
                        <div className="text-md font-bold text-gray-800">{ticketData.date}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase">{isHindi ? "समय स्लॉट" : "Time Slot"}</div>
                        <div className="text-md font-bold text-gray-800">{formatTime(ticketData.start_time)} - {formatTime(ticketData.end_time)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col items-center">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-2 relative overflow-hidden">
                        <QRCodeSVG value={`${window.location.origin}/?ticket=${ticketData.token}`} size={150} level="H" fgColor={isTicketPassed ? "#94a3b8" : "#000000"} />
                        {isTicketPassed && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-2">
                            <div className="rotate-[-10deg] border-2 border-blue-600 text-blue-700 bg-white/95 px-3 py-1 rounded-lg font-black text-xs shadow-md tracking-widest flex items-center gap-1.5 uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              {isHindi ? 'दर्शन संपन्न' : 'VISITED'}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-mono text-gray-400">{ticketData.token}</div>
                    </div>

                    {isTicketPassed ? (
                      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 text-center">
                        <div className="text-xs font-black text-blue-900 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          {isHindi ? "दर्शन संपन्न (Slot Completed)" : "Darshan Completed & Visited"}
                        </div>
                        <p className="text-[10px] text-blue-700/80 mt-0.5 leading-relaxed">
                          {isHindi ? "इस दर्शन पास का निर्धारित समय पूर्ण हो चुका है। मंदिर पधारने के लिए धन्यवाद!" : "The scheduled time for this darshan has concluded. Thank you for visiting!"}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-center">
                        <div className="text-xs font-black text-emerald-900 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {isHindi ? "सक्रिय ई-दर्शन पास" : "Active e-Darshan Pass"}
                        </div>
                        <p className="text-[10px] text-emerald-700/80 mt-0.5 leading-relaxed">
                          {isHindi ? "कृपया अपने निर्धारित स्लॉट पर मंदिर प्रवेश द्वार पर यह पास स्कैन कराएं।" : "Please present this pass at the temple entry gate during your slot."}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
          
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100 flex flex-col gap-2">
            <button 
              onClick={() => window.print()}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition shadow-sm active:scale-95"
            >
              {isHindi ? "टिकट प्रिंट / सहेजें" : "Print / Save Ticket"}
            </button>
            <button 
              onClick={() => { 
                setTicketViewToken(null);
                setTicketData(null);
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition active:scale-95"
            >
              {isHindi ? "← डैशबोर्ड पर वापस जाएं" : "Back to Smart Temple"}
            </button>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Powered by Smart Temple System</p>
          </div>
        </div>
      </div>
    );
  }

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
            className={`${activeTab === 'home' ? 'text-orange-500 border-b-2 border-orange-500 pb-1 font-black' : 'hover:text-orange-500 text-gray-600'}`}
          >
            {isHindi ? "होम" : "Home"}
          </button>
          <button 
            onClick={() => { setActiveTab('devotee'); setIsMobileMenuOpen(false); }}
            className={`${activeTab === 'devotee' ? 'text-orange-500 border-b-2 border-orange-500 pb-1 font-black' : 'hover:text-orange-500 text-gray-600'}`}
          >
            {isHindi ? "दर्शन बुकिंग" : "Darshan Booking"}
          </button>
          <button 
            onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }}
            className="hover:text-orange-500 text-gray-600 font-bold"
          >
            {isHindi ? "लाइव भीड़ स्थिति" : "Live Crowd Status"}
          </button>

          {/* Instant Language Toggle in Header */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`px-2.5 py-1 rounded-lg transition-all ${!isHindi ? 'bg-white text-gray-900 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('hi')}
              className={`px-2.5 py-1 rounded-lg transition-all ${isHindi ? 'bg-orange-500 text-white shadow-sm font-black' : 'text-gray-500 hover:text-orange-600'}`}
            >
              हिन्दी
            </button>
          </div>

          <button 
            onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 md:py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto font-bold"
          >
            <ShieldCheck className="w-4 h-4" /> {isHindi ? "एडमिन पोर्टल" : "Admin Portal"}
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
          <section className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-[85vh] animate-in fade-in duration-500 -mt-2">
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center filter blur-sm scale-[1.02]"
              style={{ backgroundImage: "url('/temple-bg.jpg')" }}
            >
              <div className="absolute inset-0 bg-black/70"></div>
            </div>

            <div className={`relative z-10 bg-white/95 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-2xl md:rounded-3xl shadow-2xl border border-white/40 my-4 md:my-0 ${localStorage.getItem('token') ? 'max-w-6xl w-full' : 'max-w-xl w-[95%] md:w-full mx-auto'}`}>
              
              {!localStorage.getItem('token') ? (
                <>
                <div className="text-center mb-6 md:mb-8">
                  <div className="inline-flex bg-orange-100 p-2 md:p-3 rounded-full mb-3 md:mb-4">
                    <CalendarCheck className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{isHindi ? "अपना दर्शन बुक करें" : "Book your Darshan"}</h2>
                  <p className="text-gray-500 font-medium mt-2">Secure your digital token for a peaceful visit.</p>
                </div>
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
                            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
                            if (error) throw error;
                            localStorage.setItem('token', data.session?.access_token || '');
                            window.location.reload();
                          } catch(e: any) { alert("Login Failed: " + (e.message)); }
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-95"
                      >
                        Log In
                      </button>
                      <p className="mt-4 text-sm text-gray-600">
                        Don't have an account? <button onClick={() => setAuthMode('register')} className="text-orange-600 font-bold hover:underline">Register here</button>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <input id="regName" placeholder="Full Name" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <input id="regEmail" type="email" placeholder="Email Address" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <input id="regPassword" type="password" placeholder="Password" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition" />
                      <select id="regRole" className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition text-gray-700 font-medium">
                        <option value="devotee">Devotee (Book Darshan)</option>
                        <option value="admin">Temple Admin</option>
                      </select>
                      
                      <button 
                        onClick={async () => {
                          const name = (document.getElementById('regName') as HTMLInputElement).value;
                          const email = (document.getElementById('regEmail') as HTMLInputElement).value;
                          const pwd = (document.getElementById('regPassword') as HTMLInputElement).value;
                          const role = (document.getElementById('regRole') as HTMLSelectElement).value;
                          
                          if (!name || !email || !pwd) return alert("Please fill all fields.");
                          try {
                            const { data, error } = await supabase.auth.signUp({ email, password: pwd, options: { data: { name, role } } });
                            if (error) throw error;
                            
                            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pwd });
                            if (signInErr) throw signInErr;
                            localStorage.setItem('token', signInData.session?.access_token || '');
                            
                            if (role === 'admin') {
                              alert("Registered successfully! Please complete Temple Admin registration on the Admin Tab.");
                              setActiveTab('admin');
                            } else {
                              alert("Devotee Registration Successful! You can now book tickets.");
                              window.location.reload();
                            }
                          } catch(e: any) { alert("Registration Failed: " + (e.message)); }
                        }}
                        className="bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-95 mt-2"
                      >
                        Create Account
                      </button>
                      
                      <p className="mt-4 text-sm text-gray-600">
                        Already have an account? <button onClick={() => setAuthMode('login')} className="text-orange-600 font-bold hover:underline">Login here</button>
                      </p>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <div className="w-full flex flex-col md:flex-row gap-8">
                  
                  {/* Left Column: Dashboard Sidebar */}
                  <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-black tracking-tight">{userDashboard?.user?.name || 'Devotee'}</h3>
                          <p className="text-orange-100 font-medium text-sm mt-1">{userDashboard?.user?.email}</p>
                        </div>
                        <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="text-xs font-bold text-orange-200 hover:text-white bg-orange-700/30 px-3 py-1.5 rounded-full transition-colors">Logout</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                          <div className="text-2xl font-black mb-0.5">{activeBookings.length}</div>
                          <div className="text-[10px] font-bold text-orange-100 uppercase tracking-wider">{isHindi ? "सक्रिय दर्शन" : "Active Darshans"}</div>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                          <div className="text-2xl font-black mb-0.5">{pastBookings.length}</div>
                          <div className="text-[10px] font-bold text-orange-200 uppercase tracking-wider">{isHindi ? "पिछला इतिहास" : "Past History"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3.5">
                        <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-orange-500"/>
                          {isHindi ? "दर्शन रिकॉर्ड" : "Darshan Bookings"}
                        </h4>
                        <span className="text-[11px] font-bold text-gray-400">
                          {allUserBookings.length} {isHindi ? "कुल" : "Total"}
                        </span>
                      </div>

                      {/* 2 Tabs: Active / Upcoming vs Past History */}
                      <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl mb-4 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setBookingHistoryTab('active')}
                          className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            bookingHistoryTab === 'active'
                              ? 'bg-white text-orange-600 shadow-sm font-black'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{isHindi ? "सक्रिय दर्शन" : "Active / Upcoming"}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            bookingHistoryTab === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {activeBookings.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBookingHistoryTab('past')}
                          className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            bookingHistoryTab === 'past'
                              ? 'bg-white text-gray-900 shadow-sm font-black'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{isHindi ? "पिछला इतिहास" : "Past History"}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            bookingHistoryTab === 'past' ? 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {pastBookings.length}
                          </span>
                        </button>
                      </div>

                      {/* Bookings List */}
                      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {isLoadingDashboard && !userDashboard ? (
                          <div className="p-6 bg-orange-50/40 rounded-xl border border-dashed border-orange-200 text-center flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-gray-500">
                              {isHindi ? "दर्शन विवरण लोड हो रहा है..." : "Loading bookings..."}
                            </span>
                          </div>
                        ) : bookingHistoryTab === 'active' ? (
                          activeBookings.length === 0 ? (
                            <div className="text-center p-6 bg-orange-50/40 rounded-xl border border-dashed border-orange-200 text-gray-500">
                              <CalendarCheck className="w-8 h-8 mx-auto text-orange-400/80 mb-2" />
                              <div className="text-xs font-bold text-gray-800 mb-1">
                                {isHindi ? "कोई सक्रिय आगामी दर्शन नहीं है" : "No Active Upcoming Bookings"}
                              </div>
                              <p className="text-[11px] text-gray-500 mb-3">
                                {isHindi ? "नया दर्शन स्लॉट बुक करने के लिए दाईं ओर मंदिर चुनें।" : "Select a temple on the right to reserve your darshan slot."}
                              </p>
                              {pastBookings.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setBookingHistoryTab('past')}
                                  className="text-[11px] font-black text-orange-600 hover:text-orange-700 underline"
                                >
                                  {isHindi ? `पिछला इतिहास देखें (${pastBookings.length})` : `View Past History (${pastBookings.length})`} &rarr;
                                </button>
                              )}
                            </div>
                          ) : (
                            activeBookings.map((b: any, i: number) => (
                              <div 
                                key={`act-${i}`} 
                                onClick={() => {
                                  setTicketViewToken(b.token);
                                  window.history.pushState({}, '', `/?ticket=${b.token}`);
                                }}
                                className="flex flex-col p-3.5 bg-gradient-to-br from-white to-emerald-50/30 rounded-xl border-2 border-emerald-200 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group relative overflow-hidden"
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="font-black text-gray-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                                    {b.temple_name}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {isHindi ? 'कन्फर्म' : 'CONFIRMED'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium mb-2">
                                  <span>📅 {b.date}</span>
                                  <span>•</span>
                                  <span>🕒 {b.start_time ? formatTime(String(b.start_time)) : ""}{b.end_time ? ` - ${formatTime(String(b.end_time))}` : ""}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-emerald-100 text-[11px]">
                                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-[10px]">
                                    {b.token}
                                  </span>
                                  <span className="text-[11px] text-emerald-700 font-black group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                    {isHindi ? 'ई-पास देखें' : 'View e-Ticket'} &rarr;
                                  </span>
                                </div>
                              </div>
                            ))
                          )
                        ) : (
                          pastBookings.length === 0 ? (
                            <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                              <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                              <div className="text-xs font-medium">
                                {isHindi ? "कोई पिछला दर्शन इतिहास नहीं मिला" : "No past darshan history found"}
                              </div>
                            </div>
                          ) : (
                            pastBookings.map((b: any, i: number) => (
                              <div 
                                key={`pst-${i}`} 
                                onClick={() => {
                                  setTicketViewToken(b.token);
                                  window.history.pushState({}, '', `/?ticket=${b.token}`);
                                }}
                                className="flex flex-col p-3 bg-gray-50 hover:bg-white rounded-xl border border-gray-200 shadow-none cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all group"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-gray-700 text-xs truncate group-hover:text-gray-900 transition-colors">
                                    {b.temple_name}
                                  </span>
                                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                    {isHindi ? 'दर्शन संपन्न' : 'VISITED'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <div className="text-[11px] font-medium text-gray-400">
                                    {b.date} • {b.start_time ? String(b.start_time).substring(0,5) : ""}
                                  </div>
                                  <div className="text-[10px] font-mono font-medium text-gray-400 group-hover:text-orange-600 transition-colors">
                                    {b.token} &rarr;
                                  </div>
                                </div>
                              </div>
                            ))
                          )
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mt-4">
                      <h4 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider"><Grid className="w-4 h-4 text-orange-500"/> {isHindi ? "भक्त सेवाएं" : "Devotee Services"}</h4>
                      
                      {/* Language Selection Pill */}
                      <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex flex-col gap-1.5 mb-3">
                        <div className="flex items-center justify-between text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Languages className="w-3.5 h-3.5 text-indigo-600"/> {isHindi ? "भाषा चुनें" : "Language"}</span>
                          <span className="text-[9px] text-indigo-700 bg-white font-bold px-1.5 py-0.5 rounded border border-indigo-200">{isHindi ? 'हिंदी चालू है' : 'English Active'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 bg-white/90 p-1 rounded-lg border border-indigo-200/60">
                          <button
                            type="button"
                            onClick={() => changeLanguage('en')}
                            className={`py-1 text-xs font-black rounded-md transition-all ${!isHindi ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-indigo-600'}`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => changeLanguage('hi')}
                            className={`py-1 text-xs font-black rounded-md transition-all ${isHindi ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-indigo-600'}`}
                          >
                            हिंदी
                          </button>
                        </div>
                      </div>

                      {/* Services Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button onClick={() => setActiveServiceModal('sos')} className="bg-red-50 text-red-600 p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 hover:bg-red-100 transition border border-red-100 active:scale-95 text-xs">
                          <AlertTriangle className="w-5 h-5"/>
                          <span className="text-[10px] uppercase font-black tracking-wider">{isHindi ? "आपातकालीन SOS" : "Emergency SOS"}</span>
                        </button>
                        <button onClick={() => { setDonateStep('select'); setDonateUtr(''); setDonateScreenshot(null); setActiveServiceModal('donate'); }} className="bg-green-50 text-green-600 p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 hover:bg-green-100 transition border border-green-100 active:scale-95 text-xs">
                          <Heart className="w-5 h-5"/>
                          <span className="text-[10px] uppercase font-black tracking-wider">{isHindi ? "दान करें" : "Donate Now"}</span>
                        </button>
                        <button onClick={() => { fetchServices(); setActiveServiceModal('parking'); }} className="bg-blue-50 text-blue-600 p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 hover:bg-blue-100 transition border border-blue-100 active:scale-95 text-xs">
                          <Car className="w-5 h-5"/>
                          <span className="text-[10px] uppercase font-black tracking-wider">{isHindi ? "पार्किंग स्थिति" : "Parking Mgmt"}</span>
                        </button>
                        <button onClick={() => { fetchServices(); setActiveServiceModal('lostfound'); }} className="bg-purple-50 text-purple-600 p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 hover:bg-purple-100 transition border border-purple-100 active:scale-95 text-xs">
                          <Search className="w-5 h-5"/>
                          <span className="text-[10px] uppercase font-black tracking-wider">{isHindi ? "खोया-पाया" : "AI Lost & Found"}</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  
                  {/* Right Column: Booking Interface */}
                  <div className="w-full md:w-2/3 flex flex-col h-[600px]">
                    {!showBookingForm ? (
                      <div className="flex flex-col h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                          <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{isHindi ? "मंदिर चुनें" : "Select Temple"}</h3>
                            <p className="text-sm font-medium text-gray-500">{isHindi ? "दर्शन के लिए अपना गंतव्य चुनें" : "Choose your destination for Darshan"}</p>
                          </div>
                          <select 
                            className="w-full md:w-auto border p-3 rounded-xl bg-gray-50 font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition cursor-pointer"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                          >
                            {['All Cities', ...Array.from(new Set(temples.map((t: any) => normalizeCity(t.city)).filter(Boolean))).sort()].map((city: any, i: number) => (
                              <option key={i} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
                          {temples.filter((t: any) => (selectedCity === 'All Cities' || normalizeCity(t.city) === selectedCity)).map((t: any) => {
                            const density = t.id % 3 === 0 ? 'HIGH' : t.id % 2 === 0 ? 'MODERATE' : 'LOW';
                            const isFestival = t.id % 4 === 0;
                            return (
                              <button 
                                key={t.id} 
                                onClick={() => { setSelectedTemple(t.id); setShowBookingForm(true); }}
                                className="text-left bg-white border-2 border-gray-100 p-5 rounded-2xl hover:border-orange-400 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                              >
                                {isFestival && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl tracking-wider shadow-sm z-10">SANKASHTI - RUSH</div>}
                                <div>
                                  <div className="font-black text-gray-900 text-lg group-hover:text-orange-600 transition-colors pr-16 leading-tight mb-1">{t.name}</div>
                                  <div className="text-xs font-bold text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{normalizeCity(t.city)}</div>
                                </div>
                                <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Crowd Density</div>
                                  <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider shadow-sm ${density === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' : density === 'MODERATE' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                    {density}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-500 h-full">
                        
                        {ticketViewToken || bookedToken ? (
                          <div className="bg-white border-2 border-orange-500 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-500 flex flex-col h-full justify-center">
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed
                            </div>
                            
                            <h3 className="text-2xl font-black text-gray-900 mb-2 mt-4">Booking Successful!</h3>
                            <p className="text-gray-500 text-sm mb-6">Please present this QR code at the temple entry gate.</p>
                            
                            <div className="bg-gray-50 rounded-3xl p-6 md:p-8 border border-gray-200 inline-block mb-6 shadow-inner relative mx-auto w-fit">
                              <div className="absolute -left-3 top-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
                              <div className="absolute -right-3 top-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
                              <QRCodeSVG value={`${window.location.origin}/?ticket=${ticketViewToken || bookedToken}`} size={160} level="H" includeMargin={false} />
                              <div className="mt-6 text-3xl font-black text-orange-600 tracking-widest">{ticketViewToken || bookedToken}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">E-Ticket Token</div>
                            </div>
                            
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 mb-6 text-left shadow-sm">
                               <div className="text-orange-800 font-black text-sm mb-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Live Queue Prediction</div>
                               <div className="text-orange-700/80 text-xs font-medium leading-relaxed">Based on real-time YOLOv8 CCTV analytics, expect a 15-20 minute wait when you arrive for this slot. Keep your QR code ready for scanning.</div>
                            </div>

                            <div className="flex gap-4 mt-auto">
                              <button onClick={() => {setTicketViewToken(''); setBookedToken(''); setShowBookingForm(false);}} className="flex-1 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition shadow-md active:scale-95">Back to Dashboard</button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white flex flex-col h-full rounded-2xl p-6 md:p-8 shadow-xl border border-gray-100 relative">
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                              <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Choose Slot</h3>
                                <p className="text-sm font-bold text-orange-600 mt-1">{temples.find((t: any) => t.id == selectedTemple)?.name}</p>
                              </div>
                              <button onClick={() => { setShowBookingForm(false); setSelectedTemple(''); setSelectedSlot(''); }} className="text-gray-400 hover:text-gray-900 transition bg-gray-100 hover:bg-gray-200 p-2 rounded-full active:scale-95">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="mb-6">
                              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-400">Select Date</label>
                              <input 
                                type="date" 
                                min={getLocalDateStr()} 
                                className="w-full border-2 border-gray-100 p-4 rounded-xl bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-0 outline-none transition font-bold text-gray-700 cursor-pointer" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                              />
                            </div>
                            
                            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-400">Available Slots</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 overflow-y-auto pr-2 flex-1 content-start">
                              {isLoadingSlots ? (
                                <div className="col-span-2 sm:col-span-3 text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                  <div className="text-gray-500 text-sm font-bold">
                                    {isHindi ? "लाइव उपलब्धता जांची जा रही है..." : "Fetching live availability..."}
                                  </div>
                                </div>
                              ) : (() => {
                                const isSelectedToday = selectedDate === getLocalDateStr();
                                const currentTime = getLocalTimeStr();
                                // For today, only show slots that haven't ended yet
                                const availableSlots = slots.filter((slot: any) => {
                                  if (isSelectedToday) {
                                    const slotEnd = slot.end_time || slot.start_time;
                                    return slotEnd > currentTime;
                                  }
                                  return true;
                                });

                                if (isSelectedToday && slots.length > 0 && availableSlots.length === 0) {
                                  return (
                                    <div className="col-span-2 sm:col-span-3 text-center p-6 bg-orange-50/80 border-2 border-dashed border-orange-200 rounded-2xl animate-in fade-in">
                                      <div className="text-2xl mb-2">🌙</div>
                                      <h4 className="font-black text-gray-900 text-base mb-1">
                                        {isHindi ? "आज के सभी दर्शन समाप्त हो चुके हैं" : "Today's Darshan Concluded"}
                                      </h4>
                                      <p className="text-gray-600 text-xs max-w-sm mx-auto mb-4 leading-relaxed font-medium">
                                        {isHindi 
                                          ? "आज के सभी समय स्लॉट बीत चुके हैं एवं मंदिर के पट रात्रि विश्राम हेतु बंद हैं। कृपया कल या आगामी तिथि चुनें।" 
                                          : "All slots for today have ended and the temple is closed for the night. Please select tomorrow or an upcoming date to book your Darshan."}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const tomorrow = new Date();
                                          tomorrow.setDate(tomorrow.getDate() + 1);
                                          const y = tomorrow.getFullYear();
                                          const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
                                          const d = String(tomorrow.getDate()).padStart(2, '0');
                                          setSelectedDate(`${y}-${m}-${d}`);
                                        }}
                                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md transition active:scale-95"
                                      >
                                        {isHindi ? "कल के स्लॉट चुनें →" : "Select Tomorrow's Date →"}
                                      </button>
                                    </div>
                                  );
                                }

                                if (availableSlots.length === 0) {
                                  return (
                                    <div className="col-span-2 sm:col-span-3 text-gray-500 text-sm p-6 bg-gray-50 rounded-xl text-center border-2 border-dashed border-gray-200 font-bold">
                                      {isHindi ? "इस तिथि के लिए कोई स्लॉट नहीं मिला।" : "No slots found for this date."}
                                    </div>
                                  );
                                }

                                return availableSlots.map((slot, idx) => {
                                  const isLowRush = (idx % 3 === 0);
                                  return (
                                    <button 
                                      key={slot.id}
                                      onClick={() => {
                                        if (slot.booked_count < slot.max_capacity) setSelectedSlot(slot.id);
                                      }}
                                      disabled={slot.booked_count >= slot.max_capacity}
                                      className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col justify-center items-center gap-1 transition-all relative overflow-hidden min-h-[80px]
                                        ${slot.booked_count >= slot.max_capacity 
                                          ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                                          : selectedSlot === slot.id 
                                            ? 'bg-orange-600 border-orange-600 text-white shadow-lg transform scale-[1.02] z-10' 
                                            : 'bg-white border-gray-100 text-gray-700 hover:border-orange-300 hover:shadow-md'}`}
                                    >
                                      {isLowRush && slot.booked_count < slot.max_capacity && (
                                        <div className={`absolute top-0 w-full text-[8px] font-black uppercase tracking-widest py-0.5 ${selectedSlot === slot.id ? 'bg-orange-700 text-orange-100' : 'bg-green-500 text-white'}`}>
                                          {isHindi ? "कम भीड़ होगी" : "Kam Rush Hogi"}
                                        </div>
                                      )}
                                      <span className={isLowRush ? "mt-2" : ""}>
                                        {slot.start_time ? String(slot.start_time).substring(0,5) : ''} - {slot.end_time ? String(slot.end_time).substring(0,5) : ''}
                                      </span>
                                      <span className={`text-[10px] uppercase tracking-wider font-black ${slot.booked_count >= slot.max_capacity ? 'text-red-500' : selectedSlot === slot.id ? 'text-orange-200' : 'text-green-600'}`}>
                                        {slot.booked_count >= slot.max_capacity ? (isHindi ? 'पूर्ण' : 'Fully Booked') : `${slot.max_capacity - slot.booked_count} ${isHindi ? 'शेष' : 'Left'}`}
                                      </span>
                                    </button>
                                  );
                                });
                              })()}
                            </div>

                            <button 
                              onClick={handleBooking}
                              disabled={!selectedSlot}
                              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all mt-auto border-b-4
                                ${!selectedSlot ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-orange-600 border-orange-800 text-white hover:bg-orange-500 hover:border-orange-700 active:scale-95'}`}
                            >
                              Confirm Booking
                            </button>
                            {bookingMessage && <p className="text-red-500 text-center text-sm font-bold mt-4">{bookingMessage}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </section>
        )}
{activeTab === 'staff' && (
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-8 max-w-4xl mx-auto">
            {!localStorage.getItem('token') ? (
              <div className="flex flex-col gap-4 text-center items-center py-12">
                <ShieldCheck className="w-16 h-16 text-gray-400 mb-2" />
                <h2 className="text-2xl font-black text-gray-900">Restricted Area</h2>
                <p className="text-gray-500 max-w-md">Please login to access the Live Crowd Status portal.</p>
                <button onClick={() => setActiveTab('devotee')} className="mt-4 bg-orange-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-700 transition shadow-sm">Go to Login</button>
              </div>
            ) : !staffSelectedTemple ? (
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
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-bl-full opacity-5 pointer-events-none"></div>
                  <h3 className="font-bold mb-5 text-indigo-900 text-xl flex items-center gap-3">
                    <Clock className="w-6 h-6 text-indigo-600" /> Live Queue Predictions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
                      <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">People Arriving</div>
                      <div className="text-2xl font-black text-gray-800">{queueStatus.mmk_metrics.arrival_rate_lambda} <span className="text-sm font-bold text-gray-400">/min</span></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
                      <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Darshan Rate</div>
                      <div className="text-2xl font-black text-gray-800">{queueStatus.mmk_metrics.service_rate_mu} <span className="text-sm font-bold text-gray-400">/min</span></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
                      <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Open Gates</div>
                      <div className="text-2xl font-black text-gray-800">{queueStatus.mmk_metrics.counters_k}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="bg-indigo-100/50 p-5 rounded-xl border border-indigo-100 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider mb-1">Est. Queue Size</div>
                        <div className="text-sm text-indigo-500 font-medium">People waiting right now</div>
                      </div>
                      <div className="text-3xl font-black text-indigo-900">{queueStatus.mmk_metrics.expected_queue_length}</div>
                    </div>
                    <div className="bg-indigo-100/50 p-5 rounded-xl border border-indigo-100 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider mb-1">System Load</div>
                        <div className="text-sm text-indigo-500 font-medium">Current capacity used</div>
                      </div>
                      <div className="text-3xl font-black text-indigo-900">{queueStatus.mmk_metrics.utilization_pct}%</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 rounded-xl flex flex-col md:flex-row justify-between items-center shadow-md">
                    <div className="text-lg font-bold mb-2 md:mb-0">Estimated Wait Time</div>
                    <div className="text-4xl font-black tracking-tight">
                      {queueStatus.mmk_metrics.expected_wait_mins} {typeof queueStatus.mmk_metrics.expected_wait_mins === 'number' ? <span className="text-xl font-medium opacity-80 ml-1">mins</span> : ''}
                    </div>
                  </div>
                </div>

                {/* NEW: AI Prediction & Action Controller */}
                {queueStatus.ai_predictions && (
                  <div className={`mt-4 border-2 p-6 rounded-2xl shadow-sm transition-all duration-500 relative overflow-hidden ${queueStatus.ai_predictions.risk_level === 'CRITICAL' ? 'bg-red-50 border-red-300' : queueStatus.ai_predictions.risk_level === 'WARNING' ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'}`}>
                    
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl shadow-inner ${queueStatus.ai_predictions.risk_level === 'CRITICAL' ? 'bg-red-500 text-white animate-pulse' : queueStatus.ai_predictions.risk_level === 'WARNING' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-black text-xl tracking-tight ${queueStatus.ai_predictions.risk_level === 'CRITICAL' ? 'text-red-900' : queueStatus.ai_predictions.risk_level === 'WARNING' ? 'text-orange-900' : 'text-green-900'}`}>
                            Intelligent Crowd Flow Controller
                          </h3>
                          <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-widest shadow-sm border ${queueStatus.ai_predictions.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' : queueStatus.ai_predictions.risk_level === 'WARNING' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                            {queueStatus.ai_predictions.risk_level}
                          </span>
                        </div>
                        
                        <div className={`font-medium mb-4 ${queueStatus.ai_predictions.risk_level === 'CRITICAL' ? 'text-red-700' : queueStatus.ai_predictions.risk_level === 'WARNING' ? 'text-orange-700' : 'text-green-700'}`}>
                          {queueStatus.ai_predictions.prediction_text}
                        </div>
                        
                        <div className="bg-white/60 p-4 rounded-xl border border-black/5 shadow-sm">
                          <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Recommended Action</div>
                          <div className="text-gray-900 font-bold">{queueStatus.ai_predictions.recommended_action}</div>
                          
                          {queueStatus.ai_predictions.slots_auto_adjusted > 0 && (
                            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50/50 p-2 rounded-lg">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              Dynamic Time-Slot Capacity Engine active: Automatically scaled {queueStatus.ai_predictions.slots_auto_adjusted} upcoming time slots.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                

                

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
                
                <div className="flex flex-col md:flex-row gap-2 w-full max-w-md mb-6">
                  <select id="newTempleCode" className="p-3 border border-blue-200 rounded-lg flex-1 outline-none focus:border-blue-500 bg-white" defaultValue="">
                    <option value="" disabled>-- Select Temple to Assign --</option>
                    {temples.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}, {t.city}</option>
                    ))}
                  </select>
                  <button onClick={async () => {
                    const selectEl = document.getElementById('newTempleCode') as HTMLSelectElement;
                    const templeId = selectEl.value;
                    if (!templeId) return alert("Select a temple first!");
                    try {
                      await axios.post(`${API_URL}/admin/generate-code`, {code: 'AUTO', temple_id: Number(templeId)}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
                      selectEl.value = '';
                      fetchAdminCodes();
                    } catch(e: any) { alert("Failed: " + (e.response?.data?.detail || e.message)); }
                  }} className="bg-blue-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-blue-700 shadow-sm">Generate</button>
                </div>

                {adminCodes.length > 0 && (
                  <div className="w-full max-w-md bg-white rounded-xl border border-blue-100 p-4 text-left shadow-sm">
                    <h5 className="font-bold text-gray-700 mb-3 text-sm">Generated Codes History</h5>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                      {adminCodes.map((c: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div>
                            <div className="font-mono font-bold text-sm text-gray-800">{c.code}</div>
                            {c.temple_name && <div className="text-xs text-gray-500 font-medium mt-1">{c.temple_name}</div>}
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${c.is_used ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {c.is_used ? 'USED' : 'AVAILABLE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    {(userDashboard?.user?.email === 'mainadmin@smarttemple.com' ? temples : (userDashboard?.user?.managed_temples || [])).map((t: any) => (
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

      {/* Dynamic Services Modals */}
      {activeServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`bg-white w-full ${activeServiceModal === 'parking' ? 'max-w-2xl' : 'max-w-md'} rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100 max-h-[92vh] flex flex-col`}>
            <button onClick={() => {setActiveServiceModal(null); setSosSent(false); setParkingError('');}} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-2 z-20"><X className="w-5 h-5"/></button>
            
            {activeServiceModal === 'sos' && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Emergency SOS</h3>
                <p className="text-gray-500 mb-8 font-medium">This will instantly alert Temple Security and broadcast your approximate zone via CCTV tracking.</p>
                {sosSent ? (
                  <div className="bg-green-50 text-green-700 p-4 rounded-xl font-bold border border-green-200">Alert Sent! Security is on the way.</div>
                ) : (
                  <button onClick={async () => {
                    try { await axios.post(`${API_URL}/services/sos`, {user_name: userDashboard?.user?.name || 'Devotee', location: 'Main Gate'}); setSosSent(true); } catch(e) {}
                  }} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xl tracking-wider rounded-xl shadow-lg active:scale-95 transition">TRIGGER SOS</button>
                )}
              </div>
            )}

            {activeServiceModal === 'donate' && (
              <div className="p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                      <Heart className="w-5 h-5 fill-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
                        {isHindi ? "मंदिर दान एवं हुंडी सेवा" : "Temple Daan & E-Hundi"}
                      </h3>
                      <p className="text-gray-500 text-[11px]">
                        {isHindi ? "पवित्र सेवा संकल्प एवं डिजिटल दान रसीद" : "Official Digital Seva & Trust Contribution"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDonateModal}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Step Indicator */}
                <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl text-[11px] font-bold mb-4">
                  <div className={`py-1.5 text-center rounded-lg transition-all ${donateStep === 'select' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-400'}`}>
                    1. {isHindi ? "राशि चुनें" : "Amount"}
                  </div>
                  <div className={`py-1.5 text-center rounded-lg transition-all ${donateStep === 'pay' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-400'}`}>
                    2. {isHindi ? "UPI & प्रूफ" : "Pay & Proof"}
                  </div>
                  <div className={`py-1.5 text-center rounded-lg transition-all ${donateStep === 'receipt' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-400'}`}>
                    3. {isHindi ? "दान रसीद" : "Receipt"}
                  </div>
                </div>

                {/* STEP 1: Select Amount and Seva */}
                {donateStep === 'select' && (
                  <div className="flex flex-col gap-3.5 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-400 mb-1">
                        {isHindi ? "भक्त का नाम" : "Devotee Name"}
                      </label>
                      <input 
                        type="text" 
                        value={donateDevoteeName} 
                        onChange={(e) => setDonateDevoteeName(e.target.value)}
                        placeholder={userDashboard?.user?.name || "Enter your name"}
                        className="w-full p-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm font-bold text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-400 mb-1">
                        {isHindi ? "सेवा संकल्प" : "Seva / Purpose"}
                      </label>
                      <select 
                        value={donatePurpose} 
                        onChange={(e) => setDonatePurpose(e.target.value)}
                        className="w-full p-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm font-bold text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition cursor-pointer"
                      >
                        <option value="General Temple Trust Fund">General Temple Trust Fund (सामान्य मंदिर कोष)</option>
                        <option value="Annadaan Mahaprasad Seva">Annadaan Mahaprasad Seva (अन्नदान महाप्रसाद सेवा)</option>
                        <option value="Goshala Seva & Cow Care">Goshala Seva - Cow Care (गौशाला सेवा)</option>
                        <option value="Special Puja & Deepam">Special Puja & Deepam (विशेष पूजा एवं दीप सेवा)</option>
                        <option value="Mandir Renovation & Vikas">Mandir Renovation & Development (मंदिर विकास)</option>
                      </select>
                    </div>

                    {/* Pre-set Amount Chips */}
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-400 mb-1">
                        {isHindi ? "पवित्र दान राशि चुनें (₹)" : "Select Daan Offering (₹)"}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['51', '101', '251', '501', '1100', '2100'].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDonateAmount(amt)}
                            className={`py-2 rounded-xl font-black text-sm border-2 transition-all ${donateAmount === amt ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm scale-[1.02]' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-emerald-300'}`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-400 mb-1">
                        {isHindi ? "या अन्य राशि दर्ज करें (₹)" : "Or Custom Amount (₹)"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">₹</span>
                        <input 
                          type="number" 
                          min="1"
                          placeholder="e.g. 500" 
                          value={donateAmount} 
                          onChange={(e) => setDonateAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-base font-black text-gray-900 outline-none focus:border-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!donateAmount || Number(donateAmount) <= 0}
                      onClick={() => setDonateStep('pay')}
                      className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <span>{isHindi ? `₹${donateAmount || '501'} के UPI भुगतान हेतु आगे बढ़ें` : `Proceed to Pay ₹${donateAmount || '501'} via UPI`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2: Pay via UPI & Upload Screenshot Proof */}
                {donateStep === 'pay' && (
                  <div className="flex flex-col gap-3.5 animate-in fade-in">
                    {/* Offering Summary Card */}
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                      <div>
                        <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">{donatePurpose}</div>
                        <div className="text-sm font-black text-gray-800">{donateDevoteeName || userDashboard?.user?.name || 'Devotee'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">{isHindi ? "राशि" : "Amount"}</div>
                        <div className="text-2xl font-black text-emerald-700">₹{donateAmount || '501'}</div>
                      </div>
                    </div>

                    {/* Direct UPI App Button */}
                    <a
                      href={`upi://pay?pa=templetrust@sbi&pn=Smart%20Temple%20Trust&am=${donateAmount || '101'}&cu=INR&tn=${encodeURIComponent(donatePurpose || 'Temple Donation')}`}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-center rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>📲 {isHindi ? "UPI ऐप में खोलें (GPay / PhonePe / Paytm)" : "Open in UPI App (GPay / PhonePe / Paytm)"}</span>
                    </a>

                    {/* Official UPI ID with Copy Button */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Temple Trust UPI ID</div>
                        <div className="font-mono font-black text-sm text-gray-900">templetrust@sbi</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-700 transition flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-black">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                            <span>Copy UPI</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Show/Hide QR Code Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowUpiQr(!showUpiQr)}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4 text-gray-600" />
                      <span>{showUpiQr ? (isHindi ? "QR कोड छुपाएं" : "Hide QR Code") : (isHindi ? "📱 स्कैन करने हेतु UPI QR कोड देखें" : "📱 Show UPI QR Code to Scan")}</span>
                    </button>

                    {showUpiQr && (
                      <div className="bg-white border-2 border-dashed border-emerald-300 p-4 rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95 shadow-sm">
                        <QRCodeSVG 
                          value={`upi://pay?pa=templetrust@sbi&pn=Smart%20Temple%20Trust&am=${donateAmount || '101'}&cu=INR&tn=${encodeURIComponent(donatePurpose || 'Temple Donation')}`} 
                          size={150} 
                          level="M" 
                        />
                        <div className="mt-2 text-xs font-bold text-gray-700">
                          Scan with GPay / PhonePe / Paytm / BHIM
                        </div>
                        <div className="text-[11px] text-emerald-700 font-black mt-0.5">
                          Amount: ₹{donateAmount || '101'}
                        </div>
                      </div>
                    )}

                    {/* Step 2 Verification: UTR and SS Upload */}
                    <div className="pt-2 border-t-2 border-dashed border-gray-200 flex flex-col gap-3">
                      <div className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>{isHindi ? "भुगतान प्रमाण एवं सत्यापन (Proof of Payment)" : "Payment Proof & Verification"}</span>
                      </div>

                      {/* UTR Input */}
                      <div>
                        <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                          {isHindi ? "UPI रेफरेंस / UTR नंबर (12-अंक)" : "UPI Reference / UTR Number"}
                        </label>
                        <input
                          type="text"
                          value={donateUtr}
                          onChange={(e) => setDonateUtr(e.target.value)}
                          placeholder="e.g. 428912345678 (12-digit ref id)"
                          maxLength={25}
                          className="w-full p-2.5 border-2 border-gray-200 rounded-xl bg-white text-sm font-mono font-bold text-gray-800 outline-none focus:border-emerald-500 transition"
                        />
                        <span className="text-[10px] text-gray-400 font-medium">UPI भुगतान के बाद मिलने वाला 12-अंक का UTR नंबर दर्ज करें</span>
                      </div>

                      {/* Screenshot Upload */}
                      <div>
                        <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                          {isHindi ? "भुगतान का स्क्रीनशॉट अपलोड करें (SS Upload)" : "Upload Payment Screenshot / Receipt"}
                        </label>

                        {!donateScreenshot ? (
                          <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                            <Upload className="w-6 h-6 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-emerald-800">
                              {isHindi ? "स्क्रीनशॉट चुनें या फोटो खींचें" : "Click to Upload Screenshot / Receipt"}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, JPEG up to 5MB</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleScreenshotUpload}
                              className="hidden" 
                            />
                          </label>
                        ) : (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={donateScreenshot} alt="Payment SS" className="w-12 h-12 object-cover rounded-lg border border-emerald-300 shadow-sm" />
                              <div>
                                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  {isHindi ? "स्क्रीनशॉट अटैच हो गया" : "Screenshot Attached"}
                                </div>
                                <div className="text-[10px] text-gray-500">Ready for ledger verification</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDonateScreenshot(null)}
                              className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 bg-white rounded-md border border-red-200 transition"
                            >
                              {isHindi ? "हटाएं" : "Remove"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Back & Submit Proof */}
                      <div className="grid grid-cols-3 gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setDonateStep('select')}
                          className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>{isHindi ? "पीछे" : "Back"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSubmittingDonation}
                          onClick={handleSubmitDonation}
                          className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {isSubmittingDonation ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>{isHindi ? "सत्यापित हो रहा है..." : "Verifying..."}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isHindi ? "दान रसीद जमा करें (Submit Proof)" : "Confirm & Submit Proof"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Official Digital Daan Receipt */}
                {donateStep === 'receipt' && (
                  <div className="flex flex-col gap-4 animate-in zoom-in-95">
                    <div className="bg-white border-2 border-emerald-500 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </div>

                      <div className="text-center border-b border-dashed border-gray-200 pb-4 mb-4 mt-2">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <h4 className="text-lg font-black text-gray-900">
                          {isHindi ? "दान रसीद (Official Daan Receipt)" : "Official Temple Daan Receipt"}
                        </h4>
                        <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                          {donateReceiptData?.receipt_id || 'REC-2026-001'}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-gray-100">
                          <span className="text-gray-400 font-bold uppercase">{isHindi ? "भक्त" : "Devotee"}</span>
                          <span className="font-black text-gray-800">{donateReceiptData?.user_name || 'Devotee'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-100">
                          <span className="text-gray-400 font-bold uppercase">{isHindi ? "सेवा संकल्प" : "Seva Purpose"}</span>
                          <span className="font-bold text-gray-700 text-right">{donateReceiptData?.purpose}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-100">
                          <span className="text-gray-400 font-bold uppercase">{isHindi ? "दान राशि" : "Amount Paid"}</span>
                          <span className="font-black text-xl text-emerald-600">₹{donateReceiptData?.amount}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-100">
                          <span className="text-gray-400 font-bold uppercase">{isHindi ? "रेफरेंस / UTR" : "UTR / Ref No"}</span>
                          <span className="font-mono font-bold text-gray-800">{donateReceiptData?.utr_number}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-400 font-bold uppercase">{isHindi ? "दिनांक व समय" : "Date & Time"}</span>
                          <span className="font-medium text-gray-600">{donateReceiptData?.timestamp}</span>
                        </div>
                      </div>

                      {donateScreenshot && (
                        <div className="mt-3 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-[10px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isHindi ? "भुगतान स्क्रीनशॉट सत्यापित एवं बहीखाते में संलग्न" : "Payment screenshot verified & recorded in Temple Trust ledger"}</span>
                        </div>
                      )}

                      <div className="mt-4 p-3 bg-gray-50 rounded-xl text-center text-[10px] text-gray-500 font-medium">
                        Smart Temple Trust • Recognized under Section 80G of Income Tax Act
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{isHindi ? "रसीद प्रिंट / सहेजें" : "Print Receipt"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseDonateModal}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-md active:scale-95"
                      >
                        {isHindi ? "संपन्न (Done)" : "Done"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeServiceModal === 'parking' && (() => {
              const activeZone = parkingData?.zones?.[parkingZone] || {
                name: parkingZone === 'A' ? 'Zone A - North Gate' : parkingZone === 'B' ? 'Zone B - East Gate' : 'Zone C - Sanctum VIP',
                type: parkingZone === 'A' ? '4-Wheeler (Car / SUV)' : parkingZone === 'B' ? '2-Wheeler (Bike / Scooter)' : 'VIP & Divyang (Accessible)',
                description: parkingZone === 'A' ? 'Covered Ground Parking with Automated Boom Barrier #1' : parkingZone === 'B' ? 'Two-Wheeler Dedicated Parking Ground with Barrier #2' : 'Direct Ramp Access to Sanctum Sanctorum',
                total: parkingZone === 'C' ? 8 : 16,
                occupied_slots: parkingZone === 'A' ? ['A-02', 'A-03', 'A-06', 'A-08', 'A-11', 'A-14', 'A-15'] : parkingZone === 'B' ? ['B-01', 'B-04', 'B-05', 'B-09', 'B-10', 'B-13'] : ['C-02', 'C-05'],
                gate: parkingZone === 'A' ? 'North Entry Barrier #1' : parkingZone === 'B' ? 'East Gate Barrier #2' : 'VIP Priority Gate #3'
              };

              const occupiedList: string[] = activeZone.occupied_slots || [];
              const totalSlotsCount: number = activeZone.total || (parkingZone === 'C' ? 8 : 16);
              const allSlots = Array.from({ length: totalSlotsCount }, (_, idx) => {
                const num = String(idx + 1).padStart(2, '0');
                return `${parkingZone}-${num}`;
              });
              const halfCount = Math.ceil(totalSlotsCount / 2);
              const row1Slots = allSlots.slice(0, halfCount);
              const row2Slots = allSlots.slice(halfCount);
              const vacantCount = Math.max(0, totalSlotsCount - occupiedList.length);
              const occupancyPercent = Math.min(100, Math.round((occupiedList.length / totalSlotsCount) * 100));

              return (
                <div className="p-5 md:p-7 flex flex-col max-h-[85vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        <Car className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
                          {isHindi ? "स्मार्ट पार्किंग एवं लाइव स्लॉट बुकिंग" : "Smart Parking & Slot Reservation"}
                        </h3>
                        <p className="text-gray-500 text-[11px] font-medium">
                          {isHindi ? "वास्तविक समय में खाली स्लॉट चुनें और बूम बैरियर ई-पास प्राप्त करें" : "Live sensor map • Select a vacant bay & get barrier e-pass"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {parkingPass ? (
                    /* PARKING PASS VIEW */
                    <div className="flex flex-col gap-4 animate-in fade-in">
                      {/* Success Alert Banner */}
                      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-emerald-950">
                            {isHindi ? "पार्किंग स्लॉट सफलतापूर्वक आरक्षित हो गया!" : "Parking Bay Confirmed Successfully!"}
                          </div>
                          <div className="text-[11px] text-emerald-700 font-medium">
                            {isHindi ? "प्रवेश द्वार (बूम बैरियर) पर यह डिजिटल ई-पास दिखाएं या स्कैन करें।" : "Present or scan this QR pass at the entrance camera."}
                          </div>
                        </div>
                      </div>

                      {/* Official Digital Parking Pass Card */}
                      <div className="border-2 border-blue-200 rounded-2xl bg-gradient-to-b from-blue-50/70 via-white to-blue-50/30 p-5 shadow-sm relative overflow-hidden">
                        {/* Temple Trust Watermark/Header */}
                        <div className="flex items-center justify-between border-b-2 border-dashed border-gray-200 pb-3 mb-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                              श्री काशी विश्वनाथ मंदिर न्यास • SMART TEMPLE
                            </div>
                            <div className="text-base font-black text-gray-900 tracking-tight">
                              DIGITAL PARKING E-PASS
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              PASS ID: <span className="font-bold text-gray-900">{parkingPass.pass_id}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full tracking-wider">
                              ● ACTIVE / CONFIRMED
                            </span>
                            <div className="text-[10px] text-gray-400 font-bold mt-1">
                              {parkingPass.booked_at}
                            </div>
                          </div>
                        </div>

                        {/* Allocated Bay & Gate Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {/* Bay Badge */}
                          <div className="bg-blue-600 text-white rounded-xl p-3.5 text-center flex flex-col justify-center shadow-md">
                            <div className="text-[10px] uppercase font-black tracking-widest text-blue-200">
                              RESERVED BAY NUMBER
                            </div>
                            <div className="text-3xl font-black tracking-tight my-0.5">
                              {parkingPass.slot_name}
                            </div>
                            <div className="text-xs font-bold text-blue-100">
                              {parkingPass.zone_name}
                            </div>
                          </div>

                          {/* Gate Barrier */}
                          <div className="bg-white border-2 border-blue-100 rounded-xl p-3.5 flex flex-col justify-center">
                            <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">
                              DESIGNATED ENTRY BARRIER
                            </div>
                            <div className="text-sm font-black text-gray-900 mt-0.5">
                              {parkingPass.gate}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>{parkingPass.valid_until}</span>
                            </div>
                          </div>
                        </div>

                        {/* Vehicle Plate & QR scanner row */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3.5 mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                          <div className="flex items-center gap-3">
                            {/* HSRP Plate Mock */}
                            <div className="border-2 border-gray-900 bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm font-mono font-black text-sm text-gray-900 tracking-wider">
                              <span className="bg-blue-800 text-white text-[8px] font-black px-1 py-0.5 rounded leading-none">IND</span>
                              <span>{parkingPass.vehicle_number}</span>
                            </div>
                            <div>
                              <div className="text-xs font-black text-gray-800">{parkingPass.driver_name}</div>
                              <div className="text-[10px] text-gray-500 font-medium">{parkingPass.vehicle_type} • 📞 {parkingPass.phone || 'Phone N/A'}</div>
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="flex items-center gap-2 self-center sm:self-auto bg-gray-50 p-2 rounded-xl border border-gray-200">
                            <QRCodeSVG
                              value={`TEMPLE_PARK:${parkingPass.pass_id}:${parkingPass.slot_name}:${parkingPass.vehicle_number}`}
                              size={58}
                              level="M"
                            />
                            <div className="text-[9px] text-gray-500 font-bold max-w-[85px] leading-tight">
                              Scan at barrier camera for entry
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 text-center font-medium">
                          * Please park only within yellow markings at slot {parkingPass.slot_name}. Keep pass ready for automated exit scan.
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{isHindi ? "पास प्रिंट / सहेजें" : "Print / Save Pass"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetParking}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Car className="w-4 h-4" />
                          <span>{isHindi ? "अन्य वाहन बुक करें" : "Book Another Slot"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* INTERACTIVE MAP & BOOKING FORM VIEW */
                    <div className="flex flex-col gap-3">
                      {/* Zone Tabs */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'A', label: isHindi ? "ज़ोन A (कार/SUV)" : "Zone A (Cars)", desc: "North Gate", icon: "🚗" },
                          { id: 'B', label: isHindi ? "ज़ोन B (बाइक)" : "Zone B (Bikes)", desc: "East Gate", icon: "🏍️" },
                          { id: 'C', label: isHindi ? "ज़ोन C (VIP)" : "Zone C (VIP)", desc: "Sanctum Gate", icon: "♿" }
                        ].map(z => (
                          <button
                            key={z.id}
                            type="button"
                            onClick={() => handleSelectParkingZone(z.id as any)}
                            className={`p-2.5 rounded-2xl border-2 text-left transition-all ${
                              parkingZone === z.id
                                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <div className="text-xs md:text-sm font-black flex items-center gap-1">
                              <span>{z.icon}</span>
                              <span>{z.label}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold mt-0.5">{z.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Legend & Stats Banner */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3 text-[11px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-md bg-emerald-100 border-2 border-emerald-400 inline-block"></span>
                            <span className="text-gray-700">{isHindi ? "खाली (चुनें)" : "Available"} ({vacantCount})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-md bg-red-100 border-2 border-red-400 inline-block"></span>
                            <span className="text-gray-700">{isHindi ? "भरा हुआ" : "Occupied"} ({occupiedList.length})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-md bg-blue-600 border-2 border-blue-600 inline-block"></span>
                            <span className="text-gray-700">{isHindi ? "चयनित" : "Selected"}</span>
                          </div>
                        </div>

                        {/* Occupancy Progress Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500">{occupancyPercent}% Full</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${occupancyPercent}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Visual Parking Layout */}
                      <div className="bg-slate-900/5 border-2 border-dashed border-gray-200 rounded-2xl p-3">
                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 text-center">
                          {activeZone.name} • {isHindi ? "इंटरैक्टिव पार्किंग लेआउट" : "Interactive Parking Layout"}
                        </div>

                        {/* Top Bay Row */}
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {row1Slots.map(slotId => {
                            const isOccupied = occupiedList.includes(slotId);
                            const isSelected = parkingSelectedSlot === slotId;
                            return (
                              <button
                                key={slotId}
                                type="button"
                                disabled={isOccupied}
                                onClick={() => {
                                  setParkingSelectedSlot(slotId);
                                  setParkingError('');
                                }}
                                className={`p-2 rounded-xl border-2 font-bold flex flex-col items-center justify-between min-h-[58px] transition-all select-none ${
                                  isOccupied
                                    ? 'bg-red-50/70 border-red-200 text-red-400 cursor-not-allowed opacity-75'
                                    : isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-105 ring-2 ring-blue-300 z-10'
                                    : 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-500 text-emerald-800 cursor-pointer hover:scale-105 active:scale-95'
                                }`}
                              >
                                <span className={`text-[11px] font-black tracking-wider ${isSelected ? 'text-white' : isOccupied ? 'text-red-500' : 'text-emerald-900'}`}>
                                  {slotId}
                                </span>
                                {isOccupied ? (
                                  <span className="text-[8px] font-black uppercase text-red-500 bg-red-100/80 px-1 py-0.5 rounded">
                                    {isHindi ? "भरा" : "FULL"}
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-[8px] font-black uppercase text-blue-100 bg-blue-700 px-1 py-0.5 rounded flex items-center gap-0.5">
                                    <Check className="w-2 h-2" />
                                    {isHindi ? "चयन" : "PICK"}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100/90 px-1 py-0.5 rounded">
                                    {isHindi ? "खाली" : "OPEN"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Middle Driveway / Corridor */}
                        <div className="my-2 py-1.5 px-3 bg-white/80 rounded-xl border border-dashed border-gray-300 flex items-center justify-between text-[10px] font-black tracking-widest text-gray-400 uppercase select-none">
                          <span>⬅ ENTRY</span>
                          <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                            <Car className="w-3.5 h-3.5" />
                            <span>DRIVEWAY • SPEED LIMIT 10 KM/H</span>
                          </span>
                          <span>EXIT ➡</span>
                        </div>

                        {/* Bottom Bay Row */}
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {row2Slots.map(slotId => {
                            const isOccupied = occupiedList.includes(slotId);
                            const isSelected = parkingSelectedSlot === slotId;
                            return (
                              <button
                                key={slotId}
                                type="button"
                                disabled={isOccupied}
                                onClick={() => {
                                  setParkingSelectedSlot(slotId);
                                  setParkingError('');
                                }}
                                className={`p-2 rounded-xl border-2 font-bold flex flex-col items-center justify-between min-h-[58px] transition-all select-none ${
                                  isOccupied
                                    ? 'bg-red-50/70 border-red-200 text-red-400 cursor-not-allowed opacity-75'
                                    : isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-105 ring-2 ring-blue-300 z-10'
                                    : 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-500 text-emerald-800 cursor-pointer hover:scale-105 active:scale-95'
                                }`}
                              >
                                <span className={`text-[11px] font-black tracking-wider ${isSelected ? 'text-white' : isOccupied ? 'text-red-500' : 'text-emerald-900'}`}>
                                  {slotId}
                                </span>
                                {isOccupied ? (
                                  <span className="text-[8px] font-black uppercase text-red-500 bg-red-100/80 px-1 py-0.5 rounded">
                                    {isHindi ? "भरा" : "FULL"}
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-[8px] font-black uppercase text-blue-100 bg-blue-700 px-1 py-0.5 rounded flex items-center gap-0.5">
                                    <Check className="w-2 h-2" />
                                    {isHindi ? "चयन" : "PICK"}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100/90 px-1 py-0.5 rounded">
                                    {isHindi ? "खाली" : "OPEN"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Devotee & Vehicle Reservation Form */}
                      <form onSubmit={handleReserveParking} className="mt-2 pt-3 border-t border-gray-100 flex flex-col gap-3">
                        {/* Selected Slot Indicator */}
                        {parkingSelectedSlot ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-sm">
                                {parkingSelectedSlot}
                              </div>
                              <div>
                                <div className="font-black text-blue-900">
                                  {isHindi ? `चयनित पार्किंग स्लॉट: ${parkingSelectedSlot}` : `Selected Bay: ${parkingSelectedSlot}`}
                                </div>
                                <div className="text-[10px] text-blue-700 font-medium">
                                  {activeZone.name} • {activeZone.gate}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                              {isHindi ? "4 घंटे निःशुल्क" : "4 Hrs Free"}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span>{isHindi ? "कृपया ऊपर दिए गए लेआउट में से किसी भी खाली (हरे) स्लॉट पर क्लिक करें।" : "Click any vacant (green) slot on the map above to select your bay."}</span>
                          </div>
                        )}

                        {/* Vehicle Number & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Number Plate */}
                          <div>
                            <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                              {isHindi ? "वाहन नंबर प्लेट *" : "Vehicle Number Plate *"}
                            </label>
                            <div className="flex items-center border-2 border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-blue-500 transition shadow-sm">
                              <div className="bg-blue-900 text-white font-black text-[9px] px-2 py-2 flex flex-col items-center justify-center border-r border-blue-800 select-none">
                                <span className="leading-none text-[8px]">🇮🇳</span>
                                <span className="tracking-widest font-mono text-[8px]">IND</span>
                              </div>
                              <input
                                type="text"
                                value={parkingVehicleNum}
                                onChange={(e) => setParkingVehicleNum(e.target.value.toUpperCase())}
                                placeholder="e.g. MH 02 CZ 4589"
                                maxLength={16}
                                className="flex-1 p-2 outline-none font-mono font-black text-xs uppercase text-gray-900 tracking-wider"
                                required
                              />
                            </div>
                          </div>

                          {/* Vehicle Category */}
                          <div>
                            <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                              {isHindi ? "वाहन का प्रकार" : "Vehicle Category"}
                            </label>
                            <select
                              value={parkingVehicleType}
                              onChange={(e) => setParkingVehicleType(e.target.value)}
                              className="w-full p-2 border-2 border-gray-200 rounded-xl bg-white font-bold text-xs text-gray-800 outline-none focus:border-blue-500 transition"
                            >
                              <option value="4-Wheeler">🚗 4-Wheeler (Car / SUV / EV)</option>
                              <option value="2-Wheeler">🏍️ 2-Wheeler (Motorcycle / Scooter)</option>
                              <option value="VIP & Divyang">♿ VIP / Divyang Accessible</option>
                            </select>
                          </div>
                        </div>

                        {/* Driver Name & Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                              {isHindi ? "चालक / श्रद्धालु का नाम *" : "Driver / Devotee Name *"}
                            </label>
                            <input
                              type="text"
                              value={parkingDriverName}
                              onChange={(e) => setParkingDriverName(e.target.value)}
                              placeholder={userDashboard?.user?.name || "e.g. Ketan Sharma"}
                              className="w-full p-2 border-2 border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-800 outline-none focus:border-blue-500 transition"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                              {isHindi ? "मोबाइल नंबर (वैकल्पिक)" : "Contact Mobile (Optional)"}
                            </label>
                            <input
                              type="tel"
                              value={parkingPhone}
                              onChange={(e) => setParkingPhone(e.target.value)}
                              placeholder="e.g. 9876543210"
                              maxLength={14}
                              className="w-full p-2 border-2 border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-800 outline-none focus:border-blue-500 transition"
                            />
                          </div>
                        </div>

                        {parkingError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{parkingError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isReservingParking}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                        >
                          {isReservingParking ? (
                            <span>{isHindi ? "स्लॉट आरक्षित किया जा रहा है..." : "Reserving Slot..."}</span>
                          ) : (
                            <>
                              <Car className="w-4 h-4" />
                              <span>
                                {isHindi
                                  ? `पार्किंग स्लॉट ${parkingSelectedSlot || ''} आरक्षित करें`
                                  : `Confirm & Reserve Slot ${parkingSelectedSlot || ''}`}
                              </span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeServiceModal === 'lostfound' && (
              <div className="p-8 flex flex-col h-[500px]">
                <h3 className="text-2xl font-black text-gray-900 mb-1">AI Lost & Found</h3>
                <p className="text-gray-500 mb-6 text-xs font-medium">CCTV cameras will actively scan for reported children.</p>
                
                <div className="bg-gray-50 p-4 rounded-xl mb-4 border-2 border-gray-100">
                  <div className="flex gap-2 mb-3">
                    <select value={lfType} onChange={(e)=>setLfType(e.target.value)} className="p-2 border border-gray-200 bg-white rounded-lg outline-none text-sm font-bold"><option value="child">Lost Child</option><option value="item">Lost Item</option></select>
                    <input value={lfDesc} onChange={(e)=>setLfDesc(e.target.value)} placeholder="E.g. Red shirt..." className="flex-1 p-2 border border-gray-200 rounded-lg outline-none text-sm font-medium" />
                  </div>
                  <button onClick={async () => {
                      if (!lfDesc) return;
                      try { await axios.post(`${API_URL}/services/lostfound`, {item_type: lfType, desc: lfDesc}); setLfDesc(''); fetchServices(); } catch(e) {}
                  }} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-sm tracking-wide shadow-sm active:scale-95 transition">Report Missing</button>
                </div>

                <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-3">Live AI Search Feed</h4>
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                  {lostFoundData.map((lf, i) => (
                    <div key={i} className="p-4 border-2 border-gray-100 rounded-xl flex justify-between items-center bg-white shadow-sm">
                      <div>
                        <div className="font-bold text-sm text-gray-900">{lf.desc}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">{lf.type}</div>
                      </div>
                      <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider ${lf.status === 'found' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 animate-pulse'}`}>{lf.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

export default App;
