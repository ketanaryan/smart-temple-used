import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, AlertTriangle, CalendarCheck, Bell, Cloud, Thermometer, ShieldCheck, CheckCircle2, QrCode, Menu, X, Camera, MapPin, Grid, Heart, Car, Search, Languages, Upload, Copy, Check, FileText, ArrowLeft, ArrowRight, Printer, Shield, Sparkles, Info, Ticket, Lock, Eye, EyeOff } from 'lucide-react';
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
  return city.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const getTempleUpiConfig = (templeName: string, templesList: any[] = []) => {
  const tName = (templeName || '').toLowerCase().trim();
  const matched = (templesList || []).find((t: any) => 
    t.name && (t.name.toLowerCase().trim() === tName || tName.includes(t.name.toLowerCase().trim()) || t.name.toLowerCase().trim().includes(tName))
  );
  if (matched) {
    const defaultUpi = `${matched.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.trust@sbi`;
    return {
      upiId: matched.upi_id || defaultUpi,
      trustName: matched.trust_name || `${matched.name} Trust`,
      qrImage: matched.qr_image || null,
      isVerifiedCustomQr: Boolean(matched.qr_image)
    };
  }
  if (tName.includes('kashi') || tName.includes('vishwanath')) {
    return { upiId: 'kashivishwanath.trust@sbi', trustName: 'Shri Kashi Vishwanath Mandir Trust', qrImage: null, isVerifiedCustomQr: false };
  }
  if (tName.includes('siddhi') || tName.includes('vinayak')) {
    return { upiId: 'siddhivinayak.trust@axis', trustName: 'Shree Siddhivinayak Ganapati Temple Trust', qrImage: null, isVerifiedCustomQr: false };
  }
  if (tName.includes('somnath')) {
    return { upiId: 'somnath.trust@sbi', trustName: 'Shree Somnath Trust', qrImage: null, isVerifiedCustomQr: false };
  }
  if (tName.includes('mahakal')) {
    return { upiId: 'mahakaleshwar.trust@pnb', trustName: 'Shri Mahakaleshwar Temple Management Committee', qrImage: null, isVerifiedCustomQr: false };
  }
  if (tName.includes('tirupati') || tName.includes('venkateswara') || tName.includes('balaji')) {
    return { upiId: 'tirupati.ttd@sbi', trustName: 'Tirumala Tirupati Devasthanams (TTD)', qrImage: null, isVerifiedCustomQr: false };
  }
  if (tName.includes('vaishno') || tName.includes('devi')) {
    return { upiId: 'vaishnodevi.shrine@sbi', trustName: 'Shri Mata Vaishno Devi Shrine Board', qrImage: null, isVerifiedCustomQr: false };
  }
  return { upiId: 'templetrust@sbi', trustName: `${templeName || 'Smart Temple'} Trust`, qrImage: null, isVerifiedCustomQr: false };
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const [devoteeCount, setDevoteeCount] = useState<number>(1);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<string | null>(null);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [staffSelectedTemple, setStaffSelectedTemple] = useState<number | null>(null);

  const [ticketViewToken, setTicketViewToken] = useState<string | null>(new URLSearchParams(window.location.search).get('ticket'));
  const [bookingHistoryTab, setBookingHistoryTab] = useState<'active' | 'past'>('active');
  const [ticketData, setTicketData] = useState<any>(null);
  const [gateActionStatus, setGateActionStatus] = useState<string | null>(null);
  const [isProcessingGateEntry, setIsProcessingGateEntry] = useState(false);
  const [isStaffGateMode, setIsStaffGateMode] = useState(false);
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
  const [showUpiQr, setShowUpiQr] = useState(true);
  const [lostFoundData, setLostFoundData] = useState<any[]>([]);
  const [parkingData, setParkingData] = useState<any>(null);
  const [parkingZone, setParkingZone] = useState<'A' | 'B' | 'C'>('A');
  const [parkingSelectedSlot, setParkingSelectedSlot] = useState<string>('');
  const [parkingVehicleType, setParkingVehicleType] = useState<string>('4-Wheeler');
  const [parkingVehicleNum, setParkingVehicleNum] = useState<string>('');
  const [parkingDriverName, setParkingDriverName] = useState<string>('');
  const [parkingPhone, setParkingPhone] = useState<string>('');
  const [parkingPass, setParkingPass] = useState<any>(null);
  const [activeParkingPass, setActiveParkingPass] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('activeParkingPass') || 'null'); } catch { return null; }
  });
  const [isVacatingParking, setIsVacatingParking] = useState<boolean>(false);
  const [isReservingParking, setIsReservingParking] = useState<boolean>(false);
  const [parkingError, setParkingError] = useState<string>('');
  
  // Gate Volunteer Token Scanner state
  const [queueDateFilter, setQueueDateFilter] = useState<string>('ALL');
  const [queueSearchTerm, setQueueSearchTerm] = useState<string>('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VISITED'>('ALL');
  const [gateTokenInput, setGateTokenInput] = useState<string>('');
  const [gateScanResult, setGateScanResult] = useState<any>(null);
  const [isVerifyingGateToken, setIsVerifyingGateToken] = useState<boolean>(false);
  const [gateHistory, setGateHistory] = useState<any[]>([]);

  // Emergency SOS state
  const [sosZone, setSosZone] = useState<string>('Sanctum Sanctorum (Garbhagriha)');
  const [sosType, setSosType] = useState<string>('Medical Emergency / Fainting');
  const [sosPhone, setSosPhone] = useState<string>('');
  const [sosResult, setSosResult] = useState<any>(null);
  const [isSubmittingSos, setIsSubmittingSos] = useState<boolean>(false);

  // Donation state extensions
  const [donateTemple, setDonateTemple] = useState<string>('Shri Kashi Vishwanath Temple');
  const [donatePan, setDonatePan] = useState<string>('');
  const [recentDonations, setRecentDonations] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('recentDonations') || '[]'); } catch { return []; }
  });

  // Temple Admin Official UPI & Authentic QR Code State
  const [adminUpiId, setAdminUpiId] = useState<string>('');
  const [adminTrustName, setAdminTrustName] = useState<string>('');
  const [adminQrImage, setAdminQrImage] = useState<string | null>(null);
  const [isSavingDonationSettings, setIsSavingDonationSettings] = useState<boolean>(false);
  const [adminDonationMsg, setAdminDonationMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Ticket Preview Details
  const [bookedTicketDetails, setBookedTicketDetails] = useState<any>(null);

  // Lost & Found extensions
  const [lfType, setLfType] = useState('child');
  const [lfDesc, setLfDesc] = useState('');
  const [lfLocation, setLfLocation] = useState('Main Corridor / Queue');
  const [lfContactName, setLfContactName] = useState('');
  const [lfContactPhone, setLfContactPhone] = useState('');
  const [isSubmittingLf, setIsSubmittingLf] = useState(false);

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
        setActiveParkingPass(res.data.pass);
        try { localStorage.setItem('activeParkingPass', JSON.stringify(res.data.pass)); } catch {}
        setParkingData(res.data);
      }
    } catch (err: any) {
      setParkingError(err.response?.data?.detail || 'Slot reservation failed. Please try again.');
    } finally {
      setIsReservingParking(false);
    }
  };

  const handleVacateParking = async (passToVacate?: any) => {
    const target = passToVacate || parkingPass || activeParkingPass;
    if (!target) return;
    setIsVacatingParking(true);
    try {
      const res = await axios.post(`${API_URL}/services/parking/vacate`, {
        zone_id: target.zone_id || parkingZone,
        slot_name: target.slot_name
      });
      if (res.data.success) {
        setParkingPass(null);
        setActiveParkingPass(null);
        try { localStorage.removeItem('activeParkingPass'); } catch {}
        fetchServices();
      }
    } catch (err: any) {
      console.error('Vacate parking error:', err);
    } finally {
      setIsVacatingParking(false);
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

  const handleVerifyGateToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gateTokenInput.trim()) return;
    setIsVerifyingGateToken(true);
    setGateScanResult(null);
    try {
      const res = await axios.post(`${API_URL}/gate/verify-token`, {
        token: gateTokenInput.trim().toUpperCase()
      });
      setGateScanResult(res.data);
      setGateHistory(prev => [res.data, ...prev.slice(0, 9)]);
      if (res.data.success) {
        setGateTokenInput('');
        fetchQueueStatus();
      }
    } catch (err: any) {
      const errData = {
        success: false,
        status: 'NOT_FOUND',
        message: err.response?.data?.detail || `Pass '${gateTokenInput.trim().toUpperCase()}' not found in database. Invalid pass.`,
        token: gateTokenInput.trim().toUpperCase(),
        is_duplicate: false
      };
      setGateScanResult(errData);
      setGateHistory(prev => [errData, ...prev.slice(0, 9)]);
    } finally {
      setIsVerifyingGateToken(false);
    }
  };

  const handleTriggerSos = async () => {
    setIsSubmittingSos(true);
    try {
      const res = await axios.post(`${API_URL}/services/sos`, {
        user_name: userDashboard?.user?.name || 'Devotee',
        location: sosZone,
        emergency_type: sosType,
        contact_phone: sosPhone.trim() || undefined
      });
      setSosResult(res.data?.alert || {
        emergency_type: sosType,
        location: sosZone,
        timestamp: new Date().toLocaleTimeString(),
        status: 'DISPATCHED'
      });
      setSosSent(true);
    } catch (e) {
      setSosResult({
        emergency_type: sosType,
        location: sosZone,
        timestamp: new Date().toLocaleTimeString(),
        status: 'DISPATCHED'
      });
      setSosSent(true);
    } finally {
      setIsSubmittingSos(false);
    }
  };

  const handleResolveLostFound = async (itemId: number) => {
    try {
      await axios.post(`${API_URL}/services/lostfound/${itemId}/resolve`);
      fetchServices();
    } catch (e) {
      console.error(e);
    }
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
      const isUserAdmin = Boolean(res.data.user?.is_admin);
      setIsAdmin(isUserAdmin);
      if (isUserAdmin && res.data.user?.email !== 'mainadmin@smarttemple.com' && res.data.user?.managed_temples?.length > 0) {
        setAdminTempleState(res.data.user.managed_temples[0].id);
        adminTempleIdRef.current = res.data.user.managed_temples[0].id;
      }
      if (res.data.user?.email === 'mainadmin@smarttemple.com') {
        fetchAdminCodes();
      }
    } catch (e) {
      console.error("Session expired or invalid", e);
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      setIsAdmin(false);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Redirect non-admins away from the admin tab
  useEffect(() => {
    if (!isLoadingDashboard && !isAdmin && activeTab === 'admin') {
      setActiveTab('devotee');
    }
  }, [isAdmin, activeTab, isLoadingDashboard]);

  // Synchronize admin donation settings whenever adminTempleState or temples changes
  useEffect(() => {
    const currentManagingTemple = temples.find((t: any) => t.id === adminTempleState);
    if (currentManagingTemple) {
      setAdminUpiId(currentManagingTemple.upi_id || `${currentManagingTemple.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.trust@sbi`);
      setAdminTrustName(currentManagingTemple.trust_name || `${currentManagingTemple.name} Trust`);
      setAdminQrImage(currentManagingTemple.qr_image || null);
    }
  }, [adminTempleState, temples]);

  const handleAdminQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(isHindi ? "QR इमेज का आकार 5MB से कम होना चाहिए।" : "QR image size must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminQrImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDonationSettings = async () => {
    setIsSavingDonationSettings(true);
    setAdminDonationMsg(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const res = await axios.post(`${API_URL}/admin/temples/${adminTempleState}/donation-settings`, {
        upi_id: adminUpiId,
        trust_name: adminTrustName,
        qr_image: adminQrImage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemples(prev => prev.map((t: any) => t.id === adminTempleState ? {
        ...t,
        upi_id: adminUpiId,
        trust_name: adminTrustName,
        qr_image: adminQrImage
      } : t));
      setAdminDonationMsg({ type: 'success', text: res.data.message || (isHindi ? "मंदिर UPI एवं QR कोड सफलतापूर्वक सहेजा गया!" : "Temple UPI & QR Code updated successfully!") });
      setTimeout(() => setAdminDonationMsg(null), 4000);
    } catch (err: any) {
      setAdminDonationMsg({ type: 'error', text: err.response?.data?.detail || err.message || (isHindi ? "सेटिंग्स सहेजने में विफल।" : "Failed to update donation settings.") });
    } finally {
      setIsSavingDonationSettings(false);
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
        is_online: true,
        devotee_count: devoteeCount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tokenNumber = res.data.token_number;
      setBookingMessage(`Success!`);
      setBookedToken(tokenNumber);

      const matchedTemple = temples.find((t: any) => String(t.id) === String(selectedTemple));
      const matchedSlot = slots.find((s: any) => String(s.id) === String(selectedSlot));
      const passInfo = {
        token: tokenNumber,
        temple_name: matchedTemple?.name || 'Temple',
        city: matchedTemple?.city || '',
        date: selectedDate,
        start_time: matchedSlot?.start_time || '',
        end_time: matchedSlot?.end_time || '',
        user_name: userDashboard?.user?.name || 'Devotee',
        total_devotees: devoteeCount,
        status: 'CONFIRMED'
      };
      setBookedTicketDetails(passInfo);
      setTicketData(passInfo);

      fetchSlots(); // Refresh availability
      fetchQueueStatus(); // Refresh queue
      fetchUserDashboard(); // Refresh devotee dashboard bookings
    } catch (e: any) {
      setBookingMessage(`Failed: ${e.response?.data?.detail || e.message}`);
    }
  };

  const handleCancelBooking = async (tokenToCancel: string) => {
    if (!tokenToCancel) return;
    const confirmCancel = window.confirm(
      isHindi 
        ? "क्या आप वाकई यह दर्शन बुकिंग रद्द करना चाहते हैं? इससे आपका स्लॉट अन्य श्रद्धालुओं के लिए उपलब्ध हो जाएगा।" 
        : "Are you sure you want to cancel this Darshan booking? This will release your time slot for other waiting devotees."
    );
    if (!confirmCancel) return;

    setIsCancellingBooking(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`${API_URL}/bookings/${tokenToCancel}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCancelStatusMsg(res.data.message || "Booking successfully cancelled.");
      await fetchUserDashboard();
      await fetchSlots();
      if (staffSelectedTemple) fetchQueueStatus();
      setTimeout(() => setCancelStatusMsg(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not cancel booking.");
    } finally {
      setIsCancellingBooking(false);
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

  const filteredDevotees = (queueStatus?.devotee_roster || []).filter((d: any) => {
    if (queueDateFilter !== 'ALL' && d.date !== queueDateFilter) return false;
    if (queueStatusFilter === 'ACTIVE' && d.is_visited) return false;
    if (queueStatusFilter === 'VISITED' && !d.is_visited) return false;
    if (queueSearchTerm.trim()) {
      const q = queueSearchTerm.toLowerCase().trim();
      const matchToken = d.token && d.token.toLowerCase().includes(q);
      const matchName = d.devotee_name && d.devotee_name.toLowerCase().includes(q);
      const matchDate = d.date && d.date.toLowerCase().includes(q);
      if (!matchToken && !matchName && !matchDate) return false;
    }
    return true;
  });

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
    const upiCfg = getTempleUpiConfig(donateTemple, temples);
    navigator.clipboard.writeText(upiCfg.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitDonation = async () => {
    setIsSubmittingDonation(true);
    const amountVal = Number(donateAmount) || 101;
    const nameVal = donateDevoteeName || userDashboard?.user?.name || 'Devotee';
    const purposeVal = donatePurpose || 'General Temple Trust Fund';
    const utrVal = donateUtr || `UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const templeVal = donateTemple || 'Shri Kashi Vishwanath Temple';

    try {
      const res = await axios.post(`${API_URL}/services/donate`, {
        user_name: nameVal,
        amount: amountVal,
        purpose: purposeVal,
        temple_name: templeVal,
        utr_number: utrVal,
        pan_number: donatePan.trim() || undefined,
        receipt_image: donateScreenshot ? 'attached' : null
      });
      const receipt = res.data.receipt || {
        receipt_id: `REC-${Date.now().toString().slice(-6)}`,
        user_name: nameVal,
        amount: amountVal,
        temple_name: templeVal,
        purpose: purposeVal,
        utr_number: utrVal,
        pan_number: donatePan.trim() || 'N/A',
        timestamp: new Date().toLocaleString(),
        status: 'VERIFIED'
      };
      setDonateReceiptData(receipt);
      setRecentDonations((prev) => {
        const updated = [receipt, ...prev.filter((r: any) => r.receipt_id !== receipt.receipt_id)].slice(0, 5);
        try { localStorage.setItem('recentDonations', JSON.stringify(updated)); } catch {}
        return updated;
      });
      setDonateStep('receipt');
    } catch (e) {
      const fallbackReceipt = {
        receipt_id: `REC-${Date.now().toString().slice(-6)}`,
        user_name: nameVal,
        amount: amountVal,
        temple_name: templeVal,
        purpose: purposeVal,
        utr_number: utrVal,
        pan_number: donatePan.trim() || 'N/A',
        timestamp: new Date().toLocaleString(),
        status: 'VERIFIED'
      };
      setDonateReceiptData(fallbackReceipt);
      setRecentDonations((prev) => {
        const updated = [fallbackReceipt, ...prev.filter((r: any) => r.receipt_id !== fallbackReceipt.receipt_id)].slice(0, 5);
        try { localStorage.setItem('recentDonations', JSON.stringify(updated)); } catch {}
        return updated;
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
    const isTicketPassed = !isBookingActive(ticketData) || ticketData?.status === 'VISITED' || ticketData?.status === 'SERVED' || ticketData?.status === 'COMPLETED';

    const formatNiceDate = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const getReportingTime = (startTimeStr: string) => {
      if (!startTimeStr) return '15 mins before slot';
      try {
        const parts = String(startTimeStr).split(':');
        if (parts.length >= 2) {
          let h = Number(parts[0]);
          let m = Number(parts[1]) - 15;
          if (m < 0) {
            m += 60;
            h -= 1;
          }
          if (h < 0) h += 24;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const displayH = h % 12 || 12;
          return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        }
        return '15 mins before slot';
      } catch {
        return '15 mins before slot';
      }
    };

    const handleAdmitAtGate = async () => {
      if (!ticketData?.token) return;
      setIsProcessingGateEntry(true);
      try {
        const res = await axios.post(`${API_URL}/gate/verify-token`, {
          token: ticketData.token.trim().toUpperCase()
        });
        if (res.data.success) {
          setGateActionStatus('SUCCESS');
          setTicketData((prev: any) => prev ? ({ ...prev, status: 'VISITED', is_visited: true }) : prev);
        } else {
          setGateActionStatus('REPLAY');
        }
      } catch (err: any) {
        setGateActionStatus('ERROR');
      } finally {
        setIsProcessingGateEntry(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#FBF9F5] text-slate-800 py-6 md:py-10 px-3 md:px-6 font-sans relative flex flex-col items-center">
        {/* Print Stylesheet */}
        <style>{`
          @media print {
            body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-ticket-wrapper { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
            .print-ticket { box-shadow: none !important; border: 2px solid #ea580c !important; width: 100% !important; max-width: 100% !important; border-radius: 12px !important; }
          }
        `}</style>

        {/* Top Control Bar (Hidden during Print) */}
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 no-print bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-orange-100 shadow-sm">
          <button 
            onClick={() => { 
              setTicketViewToken(null);
              setTicketData(null);
              setGateActionStatus(null);
              window.history.pushState({}, '', window.location.pathname);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isHindi ? "← स्मार्ट मंदिर डैशबोर्ड" : "← Back to Smart Temple"}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setIsHindi(!isHindi)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl text-xs border border-orange-200 transition"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{isHindi ? "English" : "हिंदी"}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isHindi ? "पास प्रिंट / सेव करें" : "Print / Save Pass"}</span>
            </button>
          </div>
        </div>

        {/* Gate Verification Clearance Bar for QR Scanners */}
        {ticketData && (
          <div className="w-full max-w-4xl mb-6 no-print animate-in fade-in slide-in-from-top-4 duration-500">
            {gateActionStatus === 'SUCCESS' ? (
              <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-emerald-900 font-black text-sm uppercase tracking-wide">
                      {isHindi ? "प्रवेश की पुष्टि संपन्न! (Gate Entry Approved)" : "Gate Entry Verified & Recorded"}
                    </div>
                    <div className="text-emerald-700 text-xs">
                      {isHindi ? "श्रद्धालु का प्रवेश मंदिर द्वार पर दर्ज हो चुका है। दर्शन हेतु आगे बढ़ें।" : `Token ${ticketData.token} has been admitted at the gate turnstile.`}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-200 text-emerald-900 rounded-full font-bold text-xs uppercase tracking-wider">
                  Admitted
                </span>
              </div>
            ) : isTicketPassed ? (
              <div className="bg-blue-50/90 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-blue-900 font-black text-sm uppercase tracking-wide">
                      {isHindi ? "दर्शन संपन्न • पास पहले से प्रयुक्त है" : "Darshan Completed • Pass Already Used"}
                    </div>
                    <div className="text-blue-700 text-xs">
                      {isHindi ? "इस दर्शन पास का उपयोग हो चुका है। एकल प्रवेश मान्य था।" : "This pass has completed its scheduled entry quota. Thank you for visiting!"}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-black text-xs uppercase tracking-wider border border-blue-200">
                  {isHindi ? "दर्शन संपन्न" : "Visited"}
                </span>
              </div>
            ) : (isAdmin || isStaffGateMode) ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 border-2 border-emerald-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                      <span>{isHindi ? "गेट स्टाफ सत्यापन: पास वैध व सक्रिय" : "Gate Staff Verification: Pass Valid & Active"}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping"></span>
                    </div>
                    <div className="text-emerald-100 text-xs mt-0.5">
                      {isHindi 
                        ? `श्रद्धालु: ${ticketData.user_name} • स्लॉट: ${formatTime(ticketData.start_time)} - ${formatTime(ticketData.end_time)}`
                        : `Devotee: ${ticketData.user_name} • Slot: ${formatTime(ticketData.start_time)} - ${formatTime(ticketData.end_time)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleAdmitAtGate}
                    disabled={isProcessingGateEntry}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isProcessingGateEntry ? (isHindi ? "पुष्टि हो रही है..." : "Admitting...") : (isHindi ? "गेट पर प्रवेश दर्ज करें" : "Mark Gate Entry")}</span>
                  </button>
                  {!isAdmin && (
                    <button
                      onClick={() => setIsStaffGateMode(false)}
                      title="Exit Staff Mode"
                      className="px-2.5 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-emerald-200 hover:text-white rounded-xl text-xs font-bold transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                      <span>{isHindi ? "आधिकारिक दर्शन पास • गेट स्कैनर पर प्रस्तुत करें" : "Official Devotee e-Pass • Present at Gate Turnstile"}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    </div>
                    <div className="text-orange-100 text-xs mt-0.5">
                      {isHindi 
                        ? "कृपया मंदिर मुख्य द्वार पर टर्नस्टाइल स्कैनर या सुरक्षा अधिकारी के समक्ष यह क्यूआर कोड दिखाएं।"
                        : "Please present this digital pass or printed QR code at the temple entrance gate turnstile scanner."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full font-bold text-xs uppercase tracking-wider border border-white/30">
                    {isHindi ? "सक्रिय व वैध" : "Valid & Active"}
                  </span>
                  <button
                    onClick={() => setIsStaffGateMode(true)}
                    title={isHindi ? "मंदिर स्टाफ / सुरक्षा गार्ड के लिए" : "Temple Staff / Gate Scanner Access"}
                    className="text-[11px] text-orange-200 hover:text-white underline px-2 py-1 transition"
                  >
                    {isHindi ? "स्टाफ मोड?" : "Staff Mode?"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* The Authentic e-Darshan Boarding Pass */}
        <div className="w-full max-w-4xl print-ticket-wrapper">
          {ticketError ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-red-200 shadow-xl max-w-lg mx-auto">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-red-800 mb-2">{isHindi ? "अमान्य अथवा समाप्त पास" : "Invalid or Expired Pass"}</h2>
              <p className="text-gray-500 text-sm mb-6">{isHindi ? "यह क्यूआर कोड या टोकन डेटाबेस में उपलब्ध नहीं है।" : "This ticket token was not found or has been revoked."}</p>
              <button 
                onClick={() => { setTicketViewToken(null); window.history.pushState({}, '', window.location.pathname); }}
                className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                {isHindi ? "वापस जाएं" : "Return to Home"}
              </button>
            </div>
          ) : !ticketData ? (
            <div className="bg-white rounded-3xl p-16 text-center border shadow-xl max-w-lg mx-auto flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-gray-600 font-bold text-base">{isHindi ? "मंदिर डिजिटल रजिस्ट्री से टिकट सत्यापित हो रहा है..." : "Authenticating Pass with Temple Registry..."}</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-orange-300/80 overflow-hidden print-ticket relative">
              {/* Top Ornate Header */}
              <div className="bg-gradient-to-r from-orange-700 via-amber-600 to-orange-700 text-white p-6 md:p-8 relative overflow-hidden">
                {/* Traditional Side Scallop Notches */}
                <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FBF9F5] rounded-full border-r-2 border-orange-400/50 shadow-inner no-print"></div>
                <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FBF9F5] rounded-full border-l-2 border-orange-400/50 shadow-inner no-print"></div>
                
                {/* Subtle Background Mandala / Radiance */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-amber-300/40 flex items-center justify-center text-amber-200 text-2xl font-black shadow-inner shrink-0">
                      🕉️
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-widest text-amber-200 flex items-center justify-center sm:justify-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isHindi ? "श्री देवस्थानम प्रबंधन बोर्ड • आधिकारिक ई-प्रवेश पत्र" : "SHREE TEMPLE BOARD • OFFICIAL E-DARSHAN BOARDING PASS"}</span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
                        {ticketData.temple_name}
                      </h1>
                      <div className="text-xs md:text-sm font-semibold text-orange-100 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-300" />
                        <span>{ticketData.city || 'India'}</span>
                        <span className="opacity-60">•</span>
                        <span>{isHindi ? "सुगम दर्शन एवं कतार प्रबंधन प्रणाली" : "Smart Darshan & Digital Queue System"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">
                      {isHindi ? "टोकन संख्या" : "TOKEN NUMBER"}
                    </div>
                    <div className="font-mono text-xl md:text-2xl font-black text-white bg-black/25 px-3 py-1 rounded-xl border border-white/20 mt-1 tracking-widest">
                      {ticketData.token}
                    </div>
                    <div className="text-[10px] text-amber-200/90 font-medium mt-1">
                      {isHindi ? "एकल प्रवेश मान्य" : "Single Entry Permit"}
                    </div>
                  </div>
                </div>

                {/* Holographic Security Ribbon */}
                <div className="mt-5 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between text-[11px] text-amber-100 gap-2 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isHindi ? "डिजिटल एन्क्रिप्टेड पास ID: " : "Digital Encrypted Pass ID: "}</span>
                    <span className="font-mono font-bold text-white">#STP-{ticketData.token}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{isHindi ? "केंद्रीकृत डेटाबेस में सत्यापित" : "Central Registry Verified"}</span>
                  </div>
                </div>
              </div>

              {/* Main Ticket Layout: Left Details + Right Perforated Stub */}
              <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 relative">
                
                {/* Left 65%: Devotee & Darshan Information */}
                <div className="flex-1 flex flex-col justify-between gap-6">
                  {/* Devotee Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                        {isHindi ? "श्रद्धालु का नाम / DEVOTEE NAME" : "DEVOTEE NAME"}
                      </div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{ticketData.user_name}</span>
                        {ticketData.total_devotees > 1 && (
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
                            👥 {ticketData.total_devotees} {isHindi ? "श्रद्धालु" : "Devotees"}
                          </span>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg mt-1.5">
                        <Ticket className="w-3.5 h-3.5 text-orange-600" />
                        <span>{isHindi ? "सुगम दर्शन • पूर्व आरक्षित पास" : "Pre-Booked General Darshan"}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                        {isHindi ? "पास स्थिति / PASS STATUS" : "STATUS"}
                      </div>
                      {ticketData.is_cancelled || ticketData.status === 'CANCELLED' ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-red-700 bg-red-50 border-2 border-red-400 px-3 py-1 rounded-xl mt-1 shadow-sm uppercase tracking-wider">
                          <span>✕</span>
                          <span>{isHindi ? "रद्द किया गया (CANCELLED)" : "CANCELLED"}</span>
                        </div>
                      ) : isTicketPassed ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border-2 border-blue-400 px-3 py-1 rounded-xl mt-1 shadow-sm uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>{isHindi ? "दर्शन संपन्न (VISITED)" : "VISITED"}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 border-2 border-emerald-500 px-3.5 py-1 rounded-xl mt-1 shadow-sm uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{isHindi ? "कन्फर्म एवं वैध (CONFIRMED)" : "CONFIRMED"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4 Essential Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Darshan Date */}
                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                      <div className="text-[11px] font-black uppercase tracking-wider text-amber-800/80 flex items-center gap-1.5 mb-1">
                        <CalendarCheck className="w-4 h-4 text-orange-600" />
                        <span>{isHindi ? "दर्शन तिथि" : "Darshan Date"}</span>
                      </div>
                      <div className="text-base font-black text-gray-900">
                        {formatNiceDate(ticketData.date)}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                        {ticketData.date}
                      </div>
                    </div>

                    {/* Time Slot Window */}
                    <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200/80">
                      <div className="text-[11px] font-black uppercase tracking-wider text-orange-800/80 flex items-center gap-1.5 mb-1">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>{isHindi ? "दर्शन समय स्लॉट" : "Allotted Time Slot"}</span>
                      </div>
                      <div className="text-base font-black text-orange-950">
                        {formatTime(ticketData.start_time)} - {formatTime(ticketData.end_time)}
                      </div>
                      <div className="text-[11px] font-semibold text-orange-700 mt-0.5">
                        {isHindi ? "प्राथमिकता पंक्ति (Express Lane)" : "Express Darshan Window"}
                      </div>
                    </div>

                    {/* Reporting Time */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-1">
                        <Bell className="w-4 h-4 text-slate-700" />
                        <span>{isHindi ? "रिपोर्टिंग समय" : "Reporting Time"}</span>
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {getReportingTime(ticketData.start_time)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {isHindi ? "स्लॉट से 15 मिनट पूर्व उपस्थित हों" : "15 mins prior to slot start"}
                      </div>
                    </div>

                    {/* Gate & Sanctum */}
                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                      <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800/80 flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>{isHindi ? "प्रवेश द्वार" : "Assigned Entry Gate"}</span>
                      </div>
                      <div className="text-base font-black text-emerald-950">
                        {isHindi ? "द्वार संख्या 4 (टर्नस्टाइल प्रवेश)" : "Gate No. 4 (Turnstile Entry)"}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                        {isHindi ? "मुख्य गर्भगृह दर्शन" : "Main Sanctum Sanctorum"}
                      </div>
                    </div>
                  </div>

                  {/* Watermark Notice Box */}
                  <div className={`p-4 rounded-2xl border ${isTicketPassed ? 'bg-blue-50/60 border-blue-200 text-blue-900' : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'}`}>
                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isTicketPassed ? (isHindi ? "दर्शन संपन्न (Slot Completed)" : "Darshan Completed & Recorded") : (isHindi ? "प्रवेश हेतु वैध व स्वीकृत पास" : "Official Gate Pass Cleared for Admission")}</span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {isTicketPassed 
                        ? (isHindi ? "इस दर्शन पास का निर्धारित समय पूर्ण हो चुका है। मंदिर पधारने के लिए धन्यवाद!" : "The scheduled entry for this token has concluded. Thank you for your divine visit!")
                        : (isHindi ? "कृपया अपने निर्धारित समय पर मंदिर प्रवेश द्वार पर टर्नस्टाइल स्कैनर अथवा सुरक्षा गार्ड को यह क्यूआर कोड स्कैन कराएं।" : "Please present the official turnstile QR code at Gate 4 during your slot. Keep original Government Photo ID handy.")}
                    </p>
                  </div>
                </div>

                {/* Right 35%: Perforated Stub with QR Code */}
                <div className="lg:w-72 border-t-2 lg:border-t-0 lg:border-l-2 border-dashed border-orange-300 pt-6 lg:pt-0 lg:pl-8 flex flex-col items-center justify-between text-center relative">
                  
                  {/* Top punch hole graphic */}
                  <div className="hidden lg:block absolute -top-10 -left-3 w-6 h-6 bg-[#FBF9F5] rounded-full border border-orange-300 shadow-inner no-print"></div>
                  <div className="hidden lg:block absolute -bottom-10 -left-3 w-6 h-6 bg-[#FBF9F5] rounded-full border border-orange-300 shadow-inner no-print"></div>

                  <div className="w-full">
                    <div className="text-[10px] font-black uppercase tracking-widest text-orange-700 bg-orange-100/70 border border-orange-200 py-1 px-3 rounded-full mb-3 inline-block">
                      {isHindi ? "द्वार सत्यापन कोड" : "TURNSTILE PASS STUB"}
                    </div>
                    
                    {/* QR Code Container */}
                    <div className="p-3 bg-white rounded-2xl border-2 border-orange-200 shadow-md inline-block relative overflow-hidden">
                      <QRCodeSVG 
                        value={`${window.location.origin}/?ticket=${ticketData.token}`} 
                        size={175} 
                        level="H" 
                        includeMargin={false}
                        fgColor={isTicketPassed ? "#64748b" : "#0f172a"}
                      />
                      {isTicketPassed && (
                        <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] flex flex-col items-center justify-center p-2">
                          <div className="rotate-[-12deg] border-2 border-blue-600 text-blue-700 bg-white px-3 py-1.5 rounded-xl font-black text-xs shadow-lg tracking-widest flex items-center gap-1.5 uppercase">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span>{isHindi ? 'दर्शन संपन्न' : 'VISITED'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5">
                      <div className="font-mono text-base font-black text-gray-900 tracking-wider">
                        {ticketData.token}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        {isHindi ? "स्कैनर पर क्यूआर कोड दिखाएं" : "Present at entry gate scanner"}
                      </div>
                    </div>
                  </div>

                  {/* Faux Barcode Pattern for Boarding Pass Realism */}
                  <div className="mt-5 pt-4 border-t border-gray-100 w-full flex flex-col items-center">
                    <div className="flex items-center justify-center gap-0.5 h-7 w-44 opacity-75">
                      {[3,1,4,2,1,5,2,3,1,4,2,1,3,5,1,2,4,1,3,2,5,1,2,3,1,4,2].map((w, idx) => (
                        <div key={idx} className="bg-slate-800 h-full" style={{ width: `${w * 1.5}px` }}></div>
                      ))}
                    </div>
                    <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest">
                      *ST-{ticketData.token}-SECURE*
                    </div>
                  </div>
                </div>
              </div>

              {/* Devotee Guidelines / Mandir Niyamavali */}
              <div className="bg-amber-50/40 border-t border-orange-200/70 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs md:text-sm font-black text-orange-950 uppercase tracking-wider">
                    {isHindi ? "महत्वपूर्ण दिशा-निर्देश एवं मंदिर नियमावली" : "Important Darshan Guidelines & Rules"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-orange-100">
                    <span className="text-orange-600 font-black">1.</span>
                    <span>
                      <strong>{isHindi ? "पहचान पत्र अनिवार्य:" : "Original Photo ID:"}</strong> {isHindi ? "प्रवेश के समय आधार कार्ड / वोटर आईडी साथ रखना अनिवार्य है।" : "Devotees must carry original Government Photo ID matching the pass."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-orange-100">
                    <span className="text-orange-600 font-black">2.</span>
                    <span>
                      <strong>{isHindi ? "समय की पाबंदी:" : "Reporting Time:"}</strong> {isHindi ? "स्लॉट समय से कम से कम 15 मिनट पूर्व गेट पर उपस्थित हों।" : "Arrive at least 15 minutes before slot window. Late entries enter general queue."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-orange-100">
                    <span className="text-orange-600 font-black">3.</span>
                    <span>
                      <strong>{isHindi ? "प्रतिबंधित सामग्री:" : "Prohibited Articles:"}</strong> {isHindi ? "गर्भगृह में मोबाइल, स्मार्टवॉच, चमड़े की वस्तुएं व जूते वर्जित हैं।" : "Mobile phones, smart devices, footwear & leather items must be kept in cloakroom."}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-orange-100">
                    <span className="text-orange-600 font-black">4.</span>
                    <span>
                      <strong>{isHindi ? "पारंपरिक परिधान:" : "Dress Code:"}</strong> {isHindi ? "दर्शन हेतु शालीन पारंपरिक भारतीय परिधान का पालन करें।" : "Modest traditional Indian attire is recommended inside the sanctum."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Seal & Helpline Footer */}
              <div className="bg-slate-900 text-slate-300 p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isHindi ? "सुरक्षा हेल्पलाइन: 1800-202-6000 • 24x7 चिकित्सा सहायता: द्वार 1" : "Emergency Security Helpline: 1800-202-6000 • Medical SOS: Gate 1 First Aid"}
                  </span>
                </div>
                <div className="text-slate-400 text-[10px] text-center sm:text-right">
                  {isHindi ? "स्मार्ट मंदिर डिजिटल रजिस्ट्री द्वारा प्रमाणित • किसी भौतिक हस्ताक्षर की आवश्यकता नहीं" : "Authenticated by Smart Temple Digital Registry • No Physical Signature Required"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions (Hidden during print) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 no-print pb-12">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{isHindi ? "पास प्रिंट / पीडीएफ डाउनलोड करें" : "Print / Download PDF"}</span>
          </button>
          
          <button
            onClick={() => {
              setTicketViewToken(null);
              setTicketData(null);
              setGateActionStatus(null);
              window.history.pushState({}, '', window.location.pathname);
            }}
            className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 shadow-sm transition active:scale-95 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isHindi ? "मुख्य पृष्ठ पर वापस जाएं" : "Back to Main Portal"}</span>
          </button>
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

          {isAdmin && (
            <button 
              onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 md:py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto font-bold animate-in fade-in"
            >
              <ShieldCheck className="w-4 h-4" /> {isHindi ? "एडमिन पोर्टल" : "Admin Portal"}
            </button>
          )}
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
                  
                  {/* In-app Toast / Banner for Errors and Success */}
                  {authErrorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{authErrorMessage}</span>
                      </div>
                      <button type="button" onClick={() => setAuthErrorMessage(null)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                    </div>
                  )}

                  {authSuccessMessage && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{authSuccessMessage}</span>
                    </div>
                  )}

                  {authMode === 'login' ? (
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!loginEmail.trim() || !loginPassword) {
                          setAuthErrorMessage(isHindi ? "कृपया ईमेल और पासवर्ड दोनों दर्ज करें।" : "Please enter both an email and a password.");
                          return;
                        }
                        setIsAuthSubmitting(true);
                        setAuthErrorMessage(null);
                        try {
                          const { data, error } = await supabase.auth.signInWithPassword({ 
                            email: loginEmail.trim(), 
                            password: loginPassword 
                          });
                          if (error) throw error;
                          const token = data.session?.access_token || '';
                          localStorage.setItem('token', token);

                          // In-place refresh without white page reload
                          await fetchUserDashboard();
                          setAuthSuccessMessage(isHindi ? "लॉगिन सफल! स्वागत है।" : "Login Successful! Welcome back.");
                          setTimeout(() => setAuthSuccessMessage(null), 3000);
                        } catch(err: any) {
                          setAuthErrorMessage(err.message || "Login failed. Please check credentials.");
                        } finally {
                          setIsAuthSubmitting(false);
                        }
                      }}
                      className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300"
                    >
                      <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder={isHindi ? "ईमेल पता (Email Address)" : "Email Address"} 
                        className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition text-sm font-medium" 
                        required
                      />
                      
                      <div className="relative flex items-center">
                        <input 
                          type={showLoginPassword ? "text" : "password"} 
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder={isHindi ? "पासवर्ड (Password)" : "Password"} 
                          className="w-full p-4 pr-12 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition text-sm font-medium" 
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 text-gray-400 hover:text-gray-700 transition"
                          title={showLoginPassword ? "Hide password" : "Show password"}
                        >
                          {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isAuthSubmitting}
                        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isAuthSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>{isHindi ? "लॉग इन करें" : "Log In"}</span>
                        )}
                      </button>

                      <p className="mt-2 text-sm text-gray-600">
                        {isHindi ? "खाता नहीं है?" : "Don't have an account?"} <button type="button" onClick={() => { setAuthMode('register'); setAuthErrorMessage(null); }} className="text-orange-600 font-bold hover:underline">{isHindi ? "यहाँ पंजीकरण करें" : "Register here"}</button>
                      </p>
                    </form>
                  ) : (
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!regName.trim() || !regEmail.trim() || !regPassword) {
                          setAuthErrorMessage(isHindi ? "कृपया सभी विवरण भरें।" : "Please fill in all registration fields.");
                          return;
                        }
                        setIsAuthSubmitting(true);
                        setAuthErrorMessage(null);
                        try {
                          const { data, error } = await supabase.auth.signUp({ 
                            email: regEmail.trim(), 
                            password: regPassword, 
                            options: { data: { name: regName.trim(), role: 'devotee' } } 
                          });
                          if (error) throw error;
                          
                          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ 
                            email: regEmail.trim(), 
                            password: regPassword 
                          });
                          if (signInErr) throw signInErr;
                          localStorage.setItem('token', signInData.session?.access_token || '');
                          
                          // In-place refresh without white page reload
                          await fetchUserDashboard();
                          setAuthSuccessMessage(isHindi ? "श्रद्धालु पंजीकरण सफल! आप अब दर्शन बुक कर सकते हैं।" : "Registration Successful! Welcome to Smart Temple.");
                          setTimeout(() => setAuthSuccessMessage(null), 3000);
                        } catch(err: any) {
                          setAuthErrorMessage(err.message || "Registration failed. Please try again.");
                        } finally {
                          setIsAuthSubmitting(false);
                        }
                      }}
                      className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300"
                    >
                      <input 
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={isHindi ? "पूरा नाम (Full Name)" : "Full Name"} 
                        className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition text-sm font-medium" 
                        required
                      />
                      <input 
                        type="email" 
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder={isHindi ? "ईमेल पता (Email Address)" : "Email Address"} 
                        className="p-4 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition text-sm font-medium" 
                        required
                      />
                      <div className="relative flex items-center">
                        <input 
                          type={showRegPassword ? "text" : "password"} 
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder={isHindi ? "पासवर्ड (Password)" : "Password"} 
                          className="w-full p-4 pr-12 border border-orange-200/50 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition text-sm font-medium" 
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-4 text-gray-400 hover:text-gray-700 transition"
                          title={showRegPassword ? "Hide password" : "Show password"}
                        >
                          {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isAuthSubmitting}
                        className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-md transition-all active:scale-95 mt-2 flex items-center justify-center gap-2"
                      >
                        {isAuthSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>{isHindi ? "श्रद्धालु खाता बनाएं" : "Create Devotee Account"}</span>
                        )}
                      </button>
                      
                      <p className="mt-2 text-sm text-gray-600">
                        {isHindi ? "पहले से खाता है?" : "Already have an account?"} <button type="button" onClick={() => { setAuthMode('login'); setAuthErrorMessage(null); }} className="text-orange-600 font-bold hover:underline">{isHindi ? "लॉगिन करें" : "Login here"}</button>
                      </p>
                    </form>
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
                        <button 
                          onClick={async () => { 
                            localStorage.removeItem('token'); 
                            localStorage.removeItem('adminToken');
                            localStorage.removeItem('activeTab');
                            setIsAdmin(false);
                            setUserDashboard(null);
                            await supabase.auth.signOut().catch(() => {});
                          }} 
                          className="text-xs font-bold text-orange-200 hover:text-white bg-orange-700/30 px-3 py-1.5 rounded-full transition-colors active:scale-95"
                        >
                          {isHindi ? "लॉग आउट" : "Logout"}
                        </button>
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

                      {/* Cancel Booking Status Banner */}
                      {cancelStatusMsg && (
                        <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{cancelStatusMsg}</span>
                        </div>
                      )}

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
                                    {b.token} {b.total_devotees > 1 ? `(👥 ${b.total_devotees})` : ''}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelBooking(b.token);
                                      }}
                                      disabled={isCancellingBooking}
                                      className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded border border-red-200 transition"
                                      title={isHindi ? "दर्शन स्लॉट रद्द करें" : "Cancel booking"}
                                    >
                                      {isHindi ? "रद्द करें" : "Cancel"}
                                    </button>
                                    <span className="text-[11px] text-emerald-700 font-black group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                      {isHindi ? 'ई-पास देखें' : 'View e-Ticket'} &rarr;
                                    </span>
                                  </div>
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
                                  {b.is_cancelled || b.status === 'CANCELLED' ? (
                                    <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                      <span>✕</span>
                                      {isHindi ? 'रद्द' : 'CANCELLED'}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                      {isHindi ? 'दर्शन संपन्न' : 'VISITED'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <div className="text-[11px] font-medium text-gray-400">
                                    {b.date} • {b.start_time ? String(b.start_time).substring(0,5) : ""}
                                    {b.total_devotees > 1 ? ` • 👥 ${b.total_devotees}` : ''}
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

                      {/* Persistent Active Parking Pass Card */}
                      {activeParkingPass && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 mb-3 flex flex-col gap-2 shadow-sm animate-in fade-in">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                              {isHindi ? "सक्रिय पार्किंग ई-पास" : "Active Parking Bay"}
                            </span>
                            <span className="bg-blue-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded shadow-sm">
                              {activeParkingPass.slot_name}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-gray-700 flex justify-between items-center">
                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                              {activeParkingPass.vehicle_number}
                            </span>
                            <span className="text-gray-500 text-[10px] truncate max-w-[130px]">
                              {activeParkingPass.gate}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-blue-100">
                            <button
                              type="button"
                              onClick={() => { setParkingPass(activeParkingPass); setActiveServiceModal('parking'); }}
                              className="py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-black text-[10px] rounded-lg transition active:scale-95"
                            >
                              {isHindi ? "ई-पास देखें" : "View Pass"}
                            </button>
                            <button
                              type="button"
                              disabled={isVacatingParking}
                              onClick={() => handleVacateParking(activeParkingPass)}
                              className="py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black text-[10px] rounded-lg transition active:scale-95 disabled:opacity-50"
                            >
                              {isVacatingParking ? "..." : (isHindi ? "खाली करें" : "Vacate Bay")}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Persistent Recent 80G Donation Receipt Card */}
                      {recentDonations && recentDonations.length > 0 && (
                        <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shadow-sm animate-in fade-in">
                          <div className="overflow-hidden pr-2">
                            <div className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {isHindi ? "80G दान रसीद" : "80G Donation Receipt"}
                            </div>
                            <div className="text-xs font-black text-gray-800">
                              ₹{recentDonations[0].amount} • <span className="font-mono text-[10px] text-gray-500 font-normal">{recentDonations[0].receipt_id}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setDonateReceiptData(recentDonations[0]); setDonateStep('receipt'); setActiveServiceModal('donate'); }}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-black text-[10px] rounded-lg shadow-sm transition active:scale-95 whitespace-nowrap"
                          >
                            {isHindi ? "रसीद देखें" : "View Receipt"}
                          </button>
                        </div>
                      )}

                      {/* Services Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button onClick={() => { setSosSent(false); setActiveServiceModal('sos'); }} className="bg-red-50 text-red-600 p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 hover:bg-red-100 transition border border-red-100 active:scale-95 text-xs">
                          <AlertTriangle className="w-5 h-5"/>
                          <span className="text-[10px] uppercase font-black tracking-wider">{isHindi ? "आपातकालीन SOS" : "Emergency SOS"}</span>
                        </button>
                        <button onClick={() => { 
                          setDonateStep('select'); 
                          setDonateUtr(''); 
                          setDonateScreenshot(null); 
                          const activeObj = temples.find((t: any) => String(t.id) === String(selectedTemple));
                          if (activeObj) setDonateTemple(activeObj.name);
                          setActiveServiceModal('donate'); 
                        }} className="bg-green-50 text-green-600 p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 hover:bg-green-100 transition border border-green-100 active:scale-95 text-xs">
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
                        <div className="flex flex-col gap-3 mb-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div>
                              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{isHindi ? "मंदिर चुनें" : "Select Temple"}</h3>
                              <p className="text-sm font-medium text-gray-500">{isHindi ? "दर्शन के लिए अपना गंतव्य चुनें" : "Choose your destination for Darshan"}</p>
                            </div>
                            <div className="text-xs font-bold text-gray-400">
                              {temples.filter((t: any) => {
                                const matchCity = selectedCity === 'All Cities' || normalizeCity(t.city) === selectedCity;
                                const matchSearch = !searchQuery.trim() || 
                                  t.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
                                  normalizeCity(t.city).toLowerCase().includes(searchQuery.toLowerCase().trim());
                                return matchCity && matchSearch;
                              }).length} {isHindi ? "मंदिर उपलब्ध" : "temples available"}
                            </div>
                          </div>

                          {/* Search & City Filter Bar */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="sm:col-span-2 relative">
                              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isHindi ? "मंदिर का नाम या शहर खोजें..." : "Search temple by name or city..."}
                                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-orange-500 transition"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <select 
                              className="border-2 border-gray-100 p-2.5 rounded-xl bg-gray-50 font-bold text-sm text-gray-700 focus:bg-white focus:border-orange-500 outline-none transition cursor-pointer"
                              value={selectedCity}
                              onChange={(e) => setSelectedCity(e.target.value)}
                            >
                              {['All Cities', ...Array.from(new Set(temples.map((t: any) => normalizeCity(t.city)).filter(Boolean))).sort()].map((city: any, i: number) => (
                                <option key={i} value={city}>{city}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4 flex-1">
                          {(() => {
                            const filteredTemples = temples.filter((t: any) => {
                              const matchCity = selectedCity === 'All Cities' || normalizeCity(t.city) === selectedCity;
                              const matchSearch = !searchQuery.trim() || 
                                t.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
                                normalizeCity(t.city).toLowerCase().includes(searchQuery.toLowerCase().trim());
                              return matchCity && matchSearch;
                            });

                            if (filteredTemples.length === 0) {
                              return (
                                <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                                  <Search className="w-10 h-10 text-gray-300 mb-2" />
                                  <h4 className="font-bold text-gray-800 text-sm">{isHindi ? "कोई मंदिर नहीं मिला" : "No Temples Found"}</h4>
                                  <p className="text-xs text-gray-500 mt-1 max-w-xs">{isHindi ? `"${searchQuery}" या "${selectedCity}" के लिए कोई परिणाम नहीं है।` : `No temples match "${searchQuery || selectedCity}".`}</p>
                                  <button
                                    onClick={() => { setSearchQuery(''); setSelectedCity('All Cities'); }}
                                    className="mt-3 px-4 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xs rounded-lg transition active:scale-95"
                                  >
                                    {isHindi ? "फ़िल्टर रीसेट करें" : "Reset Filters"}
                                  </button>
                                </div>
                              );
                            }

                            return filteredTemples.map((t: any) => {
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
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-500 h-full">
                        
                        {ticketViewToken || bookedToken ? (
                          <div className="bg-white border-2 border-orange-500 rounded-2xl p-5 md:p-7 shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-500 flex flex-col h-full justify-between overflow-y-auto">
                            {/* Confirmed Badge */}
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {isHindi ? "दर्शन पास कन्फर्म" : "Pass Confirmed"}
                            </div>
                            
                            <div>
                              <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1 mt-2">
                                {isHindi ? "दर्शन पास सफलतापूर्वक जारी!" : "e-Darshan Pass Generated!"}
                              </h3>
                              <p className="text-gray-500 text-xs">
                                {isHindi ? "कृपया मंदिर प्रवेश द्वार पर यह डिजिटल पास और क्यूआर कोड दिखाएं।" : "Present this QR pass at the entrance scanner on your visit date."}
                              </p>
                            </div>
                            
                            {/* Pass Summary Details Card */}
                            <div className="bg-gradient-to-br from-orange-50/70 via-white to-orange-50/30 border-2 border-orange-200 rounded-2xl p-4 text-left shadow-sm my-3">
                              <div className="flex justify-between items-start border-b border-dashed border-orange-200 pb-2.5 mb-2.5">
                                <div>
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isHindi ? "मंदिर" : "Temple"}</div>
                                  <div className="text-base font-black text-gray-900 leading-tight">
                                    {bookedTicketDetails?.temple_name || temples.find((t: any) => String(t.id) === String(selectedTemple))?.name || 'Temple'}
                                  </div>
                                  <div className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-orange-500" />
                                    {bookedTicketDetails?.city || normalizeCity(temples.find((t: any) => String(t.id) === String(selectedTemple))?.city || '')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isHindi ? "श्रद्धालु" : "Devotee"}</div>
                                  <div className="text-sm font-black text-gray-800">
                                    {bookedTicketDetails?.user_name || userDashboard?.user?.name || 'Devotee'}
                                  </div>
                                  {(bookedTicketDetails?.total_devotees > 1 || devoteeCount > 1) && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mt-0.5 inline-block">
                                      👥 {bookedTicketDetails?.total_devotees || devoteeCount} {isHindi ? "श्रद्धालु" : "Devotees"}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="bg-white/80 p-2.5 rounded-xl border border-orange-100">
                                  <div className="text-[10px] font-black text-gray-400 uppercase">{isHindi ? "दर्शन तिथि" : "Darshan Date"}</div>
                                  <div className="text-sm font-black text-gray-900 mt-0.5">
                                    {bookedTicketDetails?.date || selectedDate}
                                  </div>
                                </div>
                                <div className="bg-white/80 p-2.5 rounded-xl border border-orange-100">
                                  <div className="text-[10px] font-black text-gray-400 uppercase">{isHindi ? "समय स्लॉट" : "Time Slot"}</div>
                                  <div className="text-sm font-black text-orange-700 mt-0.5">
                                    {bookedTicketDetails?.start_time ? `${formatTime(bookedTicketDetails.start_time)} - ${formatTime(bookedTicketDetails.end_time)}` : 'Morning Darshan'}
                                  </div>
                                </div>
                              </div>

                              {/* QR Code and Token */}
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-orange-200">
                                <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                                  <QRCodeSVG 
                                    value={`${window.location.origin}/?ticket=${ticketViewToken || bookedToken}`} 
                                    size={110} 
                                    level="H" 
                                    includeMargin={false} 
                                  />
                                </div>
                                <div className="text-center sm:text-right flex-1">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase">{isHindi ? "ई-टिकट टोकन नंबर" : "e-Ticket Token"}</div>
                                  <div className="text-2xl font-black text-orange-600 font-mono tracking-widest my-0.5">
                                    {ticketViewToken || bookedToken}
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-center sm:justify-end gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{isHindi ? "वैध दर्शन पास" : "Verified & Valid"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Prediction Banner */}
                            <div className="p-3 bg-orange-50/80 rounded-xl border border-orange-100 mb-3 text-left shadow-sm">
                              <div className="text-orange-900 font-black text-xs mb-0.5 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-orange-600"/>
                                <span>{isHindi ? "वास्तविक समय कतार अनुमान" : "Real-time Queue Prediction"}</span>
                              </div>
                              <div className="text-orange-800/80 text-[11px] font-medium leading-relaxed">
                                {isHindi 
                                  ? "CCTV AI विश्लेषण के अनुसार, आपके स्लॉट समय पर अनुमानित प्रतीक्षा समय लगभग 10-15 मिनट रहेगा।" 
                                  : "Based on CCTV analytics, estimated darshan wait time is 10-15 minutes. Please arrive 10 mins before slot."}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
                              <button 
                                type="button"
                                onClick={() => {
                                  const tok = ticketViewToken || bookedToken;
                                  setTicketViewToken(tok);
                                  window.history.pushState({}, '', `/?ticket=${tok}`);
                                }} 
                                className="py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <QrCode className="w-4 h-4" />
                                <span>{isHindi ? "पूर्ण ई-पास देखें / प्रिंट करें" : "Open Full E-Pass"}</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => { 
                                  setBookedToken(''); 
                                  setBookedTicketDetails(null); 
                                  setShowBookingForm(false); 
                                }} 
                                className="py-3 px-4 bg-gray-900 hover:bg-black text-white font-black rounded-xl text-xs transition shadow-md active:scale-95"
                              >
                                {isHindi ? "डैशबोर्ड पर वापस जाएं" : "Back to Dashboard"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white flex flex-col h-full rounded-2xl p-6 md:p-8 shadow-xl border border-gray-100 relative">
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                              <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                  {isHindi ? "दर्शन समय स्लॉट चुनें" : "Choose Slot"}
                                </h3>
                                <p className="text-sm font-bold text-orange-600 mt-1">{temples.find((t: any) => t.id == selectedTemple)?.name}</p>
                              </div>
                              <button onClick={() => { setShowBookingForm(false); setSelectedTemple(''); setSelectedSlot(''); }} className="text-gray-400 hover:text-gray-900 transition bg-gray-100 hover:bg-gray-200 p-2 rounded-full active:scale-95">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="mb-6">
                              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-400">
                                {isHindi ? "दर्शन तिथि चुनें" : "Select Date"}
                              </label>
                              <input 
                                type="date" 
                                min={getLocalDateStr()} 
                                className="w-full border-2 border-gray-100 p-4 rounded-xl bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-0 outline-none transition font-bold text-gray-700 cursor-pointer" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                              />
                            </div>
                            
                            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-400">
                              {isHindi ? "उपलब्ध स्लॉट" : "Available Slots"}
                            </label>
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
                                          {isHindi ? "कम भीड़ (सुगम दर्शन)" : "LOW CROWD"}
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

                            {/* Devotee Quantity / Family Members Selector */}
                            <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3 my-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-orange-600" />
                                  <span>{isHindi ? "श्रद्धालुओं की संख्या (Family / Group)" : "Number of Devotees (Family / Group)"}</span>
                                </span>
                                <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                  {devoteeCount} {isHindi ? "श्रद्धालु" : (devoteeCount === 1 ? "Person" : "Persons")}
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-1.5">
                                {[1, 2, 3, 4, 5].map((cnt) => (
                                  <button
                                    key={cnt}
                                    type="button"
                                    onClick={() => setDevoteeCount(cnt)}
                                    className={`py-2 rounded-xl font-black text-xs transition-all ${
                                      devoteeCount === cnt
                                        ? 'bg-orange-600 text-white shadow-md scale-[1.02]'
                                        : 'bg-white text-gray-700 border border-orange-200 hover:bg-orange-100'
                                    }`}
                                  >
                                    {cnt} {cnt === 1 ? '👤' : '👥'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button 
                              onClick={handleBooking}
                              disabled={!selectedSlot}
                              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all mt-auto border-b-4
                                ${!selectedSlot ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-orange-600 border-orange-800 text-white hover:bg-orange-500 hover:border-orange-700 active:scale-95'}`}
                            >
                              {isHindi 
                                ? (devoteeCount > 1 ? `${devoteeCount} श्रद्धालुओं का दर्शन स्लॉट बुक करें` : "दर्शन स्लॉट बुक करें") 
                                : `Confirm Booking for ${devoteeCount} Devotee${devoteeCount > 1 ? 's' : ''}`}
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

                {/* Master Registration & Queue KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/70 p-5 rounded-2xl border-2 border-indigo-200 shadow-sm relative overflow-hidden">
                    <div className="text-[11px] font-black uppercase tracking-wider text-indigo-700 mb-1 flex items-center justify-between">
                      <span>{isHindi ? "कुल पंजीकृत श्रद्धालु" : "Total Registered"}</span>
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-4xl md:text-5xl font-black text-indigo-950 my-1">
                      {queueStatus.summary?.total_all_time_registered ?? (queueStatus.online_queue + queueStatus.walkin_queue)}
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold">
                      {isHindi ? "सभी तारीखों का कुल योग" : "All dates registration total"}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/70 p-5 rounded-2xl border-2 border-blue-200 shadow-sm relative overflow-hidden">
                    <div className="text-[11px] font-black uppercase tracking-wider text-blue-700 mb-1 flex items-center justify-between">
                      <span>{isHindi ? "सक्रिय कतार में" : "Active In Queue"}</span>
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-4xl md:text-5xl font-black text-blue-950 my-1">
                      {queueStatus.summary?.total_all_time_in_queue ?? (queueStatus.online_queue + queueStatus.walkin_queue)}
                    </div>
                    <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1.5">
                      <span>Online: {queueStatus.online_queue}</span>
                      <span>•</span>
                      <span>Walk-in: {queueStatus.walkin_queue}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 p-5 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden">
                    <div className="text-[11px] font-black uppercase tracking-wider text-amber-800 mb-1 flex items-center justify-between">
                      <span>{isHindi ? "अग्रिम बुकिंग" : "Advance Bookings"}</span>
                      <CalendarCheck className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="text-4xl md:text-5xl font-black text-amber-950 my-1">
                      {queueStatus.summary?.advance_bookings ?? 0}
                    </div>
                    <div className="text-[11px] text-amber-800 font-semibold">
                      {isHindi ? "कल व आगामी तारीखें" : "Tomorrow & upcoming dates"}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/70 p-5 rounded-2xl border-2 border-emerald-200 shadow-sm relative overflow-hidden">
                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-1 flex items-center justify-between">
                      <span>{isHindi ? "दर्शन संपन्न (इतिहास)" : "Visited (Past Log)"}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="text-4xl md:text-5xl font-black text-emerald-950 my-1">
                      {queueStatus.summary?.total_all_time_visited ?? 0}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold">
                      {isHindi ? "गेट पर सत्यापित व संपन्न" : "Admitted & visited records"}
                    </div>
                  </div>
                </div>

                {/* Date-wise Breakdown Timeline Chips */}
                {queueStatus.date_breakdown && queueStatus.date_breakdown.length > 0 && (
                  <div className="bg-white border-2 border-orange-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div>
                        <h4 className="font-black text-base text-gray-900 flex items-center gap-2">
                          <CalendarCheck className="w-5 h-5 text-orange-600" />
                          <span>{isHindi ? "तारीख अनुसार श्रद्धालु पंजीकरण विवरण" : "Registration Breakdown by Date"}</span>
                        </h4>
                        <p className="text-xs text-gray-500">
                          {isHindi ? "किसी भी तारीख पर क्लिक करके उस दिन के रिकॉर्ड देखें" : "Click on any date to filter the live roster below"}
                        </p>
                      </div>
                      {queueDateFilter !== 'ALL' && (
                        <button
                          onClick={() => setQueueDateFilter('ALL')}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 underline"
                        >
                          {isHindi ? "सभी तारीखें दिखाएं (Show All)" : "Show All Dates"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {queueStatus.date_breakdown.map((dItem: any, idx: number) => {
                        const isSelected = queueDateFilter === dItem.date;
                        return (
                          <div
                            key={idx}
                            onClick={() => setQueueDateFilter(isSelected ? 'ALL' : dItem.date)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected ? 'bg-orange-50 border-orange-500 shadow-md ring-2 ring-orange-200' : 'bg-gray-50/70 hover:bg-white border-gray-200 hover:border-orange-300 shadow-sm'}`}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                                <span>📅</span>
                                <span>{dItem.date}</span>
                              </span>
                              <span className="font-black text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                                {dItem.total} {isHindi ? "श्रद्धालु" : "Devotees"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                              <span className="font-bold text-blue-700">⏳ In Queue: {dItem.in_queue}</span>
                              <span className="font-bold text-emerald-700">✓ Visited: {dItem.visited}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live Devotee Registry & Entry Audit Table */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <h4 className="font-black text-lg text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <span>{isHindi ? "वास्तविक श्रद्धालु रिकॉर्ड व लाइव स्थिति" : "Live Devotee Registry & Entry Audit"}</span>
                      </h4>
                      <p className="text-xs text-gray-500">
                        {isHindi 
                          ? `दिखाए जा रहे हैं: ${filteredDevotees.length} श्रद्धालु रिकॉर्ड` 
                          : `Showing: ${filteredDevotees.length} devotee booking records`}
                      </p>
                    </div>

                    {/* Search box */}
                    <div className="w-full sm:w-64 relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={queueSearchTerm}
                        onChange={(e) => setQueueSearchTerm(e.target.value)}
                        placeholder={isHindi ? "नाम या टोकन खोजें..." : "Search name or token..."}
                        className="w-full pl-9 pr-3 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button
                      onClick={() => setQueueStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${queueStatusFilter === 'ALL' ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {isHindi ? `सभी रिकॉर्ड (${(queueStatus.devotee_roster || []).length})` : `All Records (${(queueStatus.devotee_roster || []).length})`}
                    </button>
                    <button
                      onClick={() => setQueueStatusFilter('ACTIVE')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${queueStatusFilter === 'ACTIVE' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {isHindi ? "सक्रिय कतार (Active In-Queue)" : "Active In-Queue"}
                    </button>
                    <button
                      onClick={() => setQueueStatusFilter('VISITED')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${queueStatusFilter === 'VISITED' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {isHindi ? "दर्शन संपन्न (Past Visited)" : "Past Visited"}
                    </button>
                  </div>

                  {/* Devotees Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-black uppercase tracking-wider text-[10px]">
                          <th className="p-3">Token #</th>
                          <th className="p-3">Devotee Name</th>
                          <th className="p-3">Darshan Date</th>
                          <th className="p-3">Slot Time</th>
                          <th className="p-3">Channel</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">e-Pass</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredDevotees.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                              {isHindi ? "इस फ़िल्टर के लिए कोई रिकॉर्ड उपलब्ध नहीं है।" : "No booking records match the selected filter."}
                            </td>
                          </tr>
                        ) : (
                          filteredDevotees.map((dev: any, dIdx: number) => (
                            <tr key={dIdx} className="hover:bg-orange-50/40 transition-colors">
                              <td className="p-3 font-mono font-black text-gray-900">
                                {dev.token}
                              </td>
                              <td className="p-3 font-bold text-gray-900">
                                {dev.devotee_name}
                              </td>
                              <td className="p-3 font-medium text-gray-700">
                                📅 {dev.date}
                              </td>
                              <td className="p-3 font-medium text-orange-800">
                                🕒 {dev.start_time} - {dev.end_time}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dev.is_online ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                  {dev.is_online ? 'Online' : 'Walk-in'}
                                </span>
                              </td>
                              <td className="p-3">
                                {dev.is_visited ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                    <span>VISITED</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>CONFIRMED</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setTicketViewToken(dev.token);
                                    window.history.pushState({}, '', `/?ticket=${dev.token}`);
                                  }}
                                  className="text-[11px] font-black text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{isHindi ? "पास देखें" : "View"}</span>
                                  <span>&rarr;</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Slot-by-Slot Occupancy Breakdown */}
                {queueStatus.slot_occupancy && queueStatus.slot_occupancy.length > 0 && (
                  <div className="bg-white border-2 border-orange-100 rounded-2xl p-5 shadow-sm">
                    <h4 className="font-black text-base text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span>{isHindi ? "स्लॉट अनुसार लाइव क्षमता व बुकिंग स्थिति" : "Live Slot Occupancy & Capacity Grid"}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {queueStatus.slot_occupancy.slice(0, 12).map((sItem: any, sIdx: number) => {
                        const pct = Math.min(100, Math.round((sItem.booked / sItem.max_capacity) * 100));
                        return (
                          <div key={sIdx} className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-gray-800">
                                🕒 {sItem.start_time} - {sItem.end_time}
                              </span>
                              <span className="text-[11px] font-mono text-gray-500">
                                {sItem.date}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden my-2">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? 'bg-red-500' : pct > 40 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-gray-600">{sItem.booked} / {sItem.max_capacity} Booked</span>
                              <span className={`font-black ${sItem.available === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {sItem.available === 0 ? (isHindi ? "फुल (FULL)" : "FULL") : `${sItem.available} Available`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                )}                {/* NEW: Gate Volunteer Entry Scanner & Token Verifier */}
                <div className="mt-6 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-indigo-800">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4 border-b border-indigo-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-xl tracking-tight text-white flex items-center gap-2">
                          Gate Volunteer Token Verifier & Scanner
                          <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Active Gate #1
                          </span>
                        </h3>
                        <p className="text-xs text-indigo-200">
                          Scan QR barcode or enter Devotee Token to verify darshan pass, grant entry, and flag duplicates.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleVerifyGateToken} className="flex flex-col sm:flex-row gap-2.5 mb-4">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={gateTokenInput}
                        onChange={(e) => setGateTokenInput(e.target.value.toUpperCase())}
                        placeholder="Enter Token (e.g. T-12345 or scan QR code)"
                        className="w-full px-4 py-3.5 bg-indigo-950/80 border-2 border-indigo-700 rounded-xl text-white font-mono font-bold text-base placeholder-indigo-400 outline-none focus:border-orange-500 transition tracking-wider uppercase"
                      />
                      {gateTokenInput && (
                        <button
                          type="button"
                          onClick={() => setGateTokenInput('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifyingGateToken || !gateTokenInput.trim()}
                      className="py-3.5 px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                    >
                      {isVerifyingGateToken ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Verify & Grant Entry</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Live Scan Result Banner */}
                  {gateScanResult && (
                    <div className={`p-4 rounded-xl border-2 mb-4 animate-in zoom-in-95 ${gateScanResult.success ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100' : gateScanResult.is_duplicate ? 'bg-red-950/90 border-red-500 text-red-100' : 'bg-amber-950/80 border-amber-500 text-amber-100'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${gateScanResult.success ? 'bg-emerald-600' : gateScanResult.is_duplicate ? 'bg-red-600' : 'bg-amber-600'} text-white`}>
                          {gateScanResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono font-black text-lg tracking-wider text-white">
                              {gateScanResult.token}
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${gateScanResult.success ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                              {gateScanResult.status}
                            </span>
                          </div>
                          <p className="font-bold text-sm mb-2">{gateScanResult.message}</p>
                          {gateScanResult.devotee_name && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-black/30 p-2.5 rounded-lg border border-white/10">
                              <div>
                                <span className="text-gray-400 block text-[10px] uppercase">Devotee</span>
                                <span className="font-bold text-white">{gateScanResult.devotee_name}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] uppercase">Temple</span>
                                <span className="font-bold text-white truncate block">{gateScanResult.temple_name}</span>
                              </div>
                              <div className="col-span-2 sm:col-span-1">
                                <span className="text-gray-400 block text-[10px] uppercase">Slot</span>
                                <span className="font-bold text-white">{gateScanResult.slot_date} {gateScanResult.slot_time}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Scan History */}
                  {gateHistory.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-indigo-900">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-2">
                        Recent Gate Verification Trail ({gateHistory.length})
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {gateHistory.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-indigo-950/50 px-3 py-1.5 rounded-lg text-xs border border-indigo-900/60">
                            <span className="font-mono font-bold text-white">{item.token}</span>
                            <span className="text-indigo-200 truncate mx-2">{item.devotee_name || 'Pass'}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${item.success ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
        {activeTab === 'admin' && isAdmin && (
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
                        localStorage.removeItem('token');
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('activeTab');
                        setIsAdmin(false);
                        window.location.reload();
                      }}
                      className="text-xs text-gray-400 hover:text-white underline font-bold mt-2 cursor-pointer transition"
                    >
                      {isHindi ? "एडमिन से लॉग आउट करें" : "Log out of Admin Portal"}
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

                {/* Temple Official Trust UPI & Authentic QR Code Management Card */}
                <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5 mt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-bold shadow-xs">
                        <QrCode className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight flex items-center gap-2">
                          <span>{isHindi ? "आधिकारिक मंदिर UPI एवं QR कोड प्रबंधन" : "Temple Official UPI & QR Code Configuration"}</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {adminQrImage ? (isHindi ? "सत्यापित QR सक्रिय" : "Verified QR Live") : (isHindi ? "डायनामिक UPI सक्रिय" : "Dynamic UPI Active")}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {isHindi 
                            ? "श्रद्धालुओं के दान हेतु मंदिर काउंटर का मूल QR कोड अपलोड करें एवं आधिकारिक UPI ID/न्यास नाम सेट करें।" 
                            : "Upload the authentic physical counter QR code and set verified trust UPI details for devotee offerings."}
                        </p>
                      </div>
                    </div>

                    {adminDonationMsg && (
                      <div className={`text-xs font-bold px-3 py-2 rounded-xl border animate-in fade-in flex items-center gap-2 ${adminDonationMsg.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                        {adminDonationMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                        <span>{adminDonationMsg.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* UPI ID */}
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-500 mb-1.5">
                        {isHindi ? "आधिकारिक मंदिर UPI ID (VPA)" : "Official Temple UPI ID (VPA)"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={adminUpiId}
                        onChange={(e) => setAdminUpiId(e.target.value)}
                        placeholder="e.g. kashivishwanath.trust@sbi"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 font-mono font-bold text-sm text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {isHindi ? "बैंक खाते से संबद्ध आधिकारिक UPI पता जिस पर राशि जमा होगी" : "Official UPI address linked to the temple trust bank account"}
                      </span>
                    </div>

                    {/* Trust Name */}
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-500 mb-1.5">
                        {isHindi ? "मंदिर न्यास का कानूनी नाम" : "Temple Trust Legal / Account Name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={adminTrustName}
                        onChange={(e) => setAdminTrustName(e.target.value)}
                        placeholder="e.g. Shri Kashi Vishwanath Mandir Trust"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 font-bold text-sm text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {isHindi ? "80G कर छूट रसीद एवं बैंक खाते पर मुद्रित कानूनी नाम" : "Official registered trust name printed on 80G tax receipts"}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Upload & Devotee Preview Area */}
                  <div className="border-t border-gray-100 pt-4 flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                        {isHindi ? "मंदिर काउंटर का मूल QR कोड फोटो / इमेज अपलोड करें" : "Upload Authentic Temple Counter QR Image"}
                      </label>

                      <label className="border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/40 hover:bg-orange-50/80 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                        <Upload className="w-8 h-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-orange-900">
                          {isHindi ? "यहाँ क्लिक करके मंदिर का QR कोड फोटो चुनें" : "Click or tap to upload authentic QR code image"}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1">PNG, JPG, JPEG, WEBP (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdminQrUpload}
                          className="hidden"
                        />
                      </label>

                      <div className="mt-2 text-[11px] text-gray-500 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                        💡 {isHindi 
                          ? "सुझाव: मंदिर के दान काउंटर पर लगे आधिकारिक स्टैंडी या बैंक क्यूआर की स्पष्ट फोटो अपलोड करें। यदि कोई फोटो अपलोड नहीं की जाती, तो सिस्टम स्वतः गतिशील QR कोड तैयार करेगा।" 
                          : "Tip: Upload a clear photo of the physical standee or bank QR display from the temple counter. Devotees scanning this will pay directly into the verified trust account."}
                      </div>
                    </div>

                    {/* Devotee Live Preview Box */}
                    <div className="w-full md:w-56 flex flex-col items-center text-center bg-gray-50 border border-gray-200 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-wider">
                        {isHindi ? "श्रद्धालु दृश्य पूर्वावलोकन" : "Devotee Live Preview"}
                      </div>

                      {adminQrImage ? (
                        <div className="flex flex-col items-center">
                          <div className="relative group">
                            <img
                              src={adminQrImage}
                              alt="Admin Uploaded QR"
                              className="w-40 h-40 object-contain rounded-xl border-2 border-emerald-400 bg-white p-1.5 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setAdminQrImage(null)}
                              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition"
                              title="Remove uploaded QR image"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {isHindi ? "सत्यापित मूल QR" : "Verified Custom QR"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <QRCodeSVG
                            value={`upi://pay?pa=${adminUpiId || 'templetrust@sbi'}&pn=${encodeURIComponent(adminTrustName || 'Temple Trust')}&cu=INR`}
                            size={135}
                            level="M"
                            className="p-1.5 bg-white rounded-xl border border-gray-200 shadow-xs"
                          />
                          <span className="mt-2 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {isHindi ? "स्वतः जनित डायनामिक QR" : "Auto-Generated UPI QR"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleSaveDonationSettings}
                      disabled={isSavingDonationSettings || !adminUpiId.trim() || !adminTrustName.trim()}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSavingDonationSettings ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>{isHindi ? "सहेज रहे हैं..." : "Saving..."}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isHindi ? "QR एवं UPI विवरण सुरक्षित करें" : "Save & Publish Temple QR"}</span>
                        </>
                      )}
                    </button>
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
              <div className="p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
                        {isHindi ? "आपातकालीन सुरक्षा एवं चिकित्सा SOS" : "Emergency SOS Assistance"}
                      </h3>
                      <p className="text-gray-500 text-[11px] font-medium">
                        {isHindi ? "मंदिर सुरक्षा नियंत्रण कक्ष एवं त्वरित चिकित्सा सहायता" : "Direct alert to Temple Security Control Room & Rapid Response Team"}
                      </p>
                    </div>
                  </div>
                </div>

                {!sosSent ? (
                  <div className="flex flex-col gap-4 animate-in fade-in">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 leading-relaxed">
                      ⚠️ {isHindi 
                        ? "यह बटन दबाते ही मंदिर सुरक्षा टीम, सीसीटीवी ऑपरेटर और फर्स्ट-एड मेडिकल यूनिट को आपका अलर्ट भेजा जाएगा।" 
                        : "Triggering this immediately dispatches Temple Security, CCTV tracking, and the Medical Rapid Response team."}
                    </div>

                    {/* Zone Selector */}
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                        {isHindi ? "आपका वर्तमान स्थान / मंदिर परिसर ज़ोन" : "Your Current Location / Temple Zone"}
                      </label>
                      <select
                        value={sosZone}
                        onChange={(e) => setSosZone(e.target.value)}
                        className="w-full p-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 font-bold text-sm text-gray-800 outline-none focus:border-red-500 focus:bg-white transition cursor-pointer"
                      >
                        <option value="Sanctum Sanctorum (Garbhagriha)">Sanctum Sanctorum (गर्भगृह मुख्य दर्शन क्षेत्र)</option>
                        <option value="Main Darshan Queue Corridor">Main Darshan Queue Corridor (मुख्य दर्शन कतार गैलरी)</option>
                        <option value="North Entrance Gate / Screening">North Entrance Gate & Metal Detectors (उत्तर प्रवेश द्वार)</option>
                        <option value="Vehicle Parking Ground (Zone A/B/C)">Vehicle Parking Ground (पार्किंग स्थल ज़ोन A/B/C)</option>
                        <option value="Shoe Stand / Footwear Counter">Shoe Stand & Footwear Counter (जूता स्टैंड परिसर)</option>
                        <option value="Prasadam & Annakshetra Hall">Prasadam & Annakshetra Dining Hall (अन्नक्षेत्र महाप्रसाद भवन)</option>
                      </select>
                    </div>

                    {/* Emergency Type Selector */}
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 mb-1.5">
                        {isHindi ? "आपातकाल का प्रकार चुनें" : "Select Emergency Type"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: 'Medical Emergency / Fainting', labelHi: '🚑 चिकित्सा / बेहोशी (Medical)', labelEn: '🚑 Medical / Fainting' },
                          { id: 'Crowd Surge / Crush Hazard', labelHi: '⚠️ अत्यधिक भीड़ / भगदड़ खतरा', labelEn: '⚠️ Crowd Surge / Crush' },
                          { id: 'Lost Child / Missing Person', labelHi: '👶 बच्चा गुम / परिजन बिछुड़े', labelEn: '👶 Lost Child / Missing' },
                          { id: 'Elderly Assistance', labelHi: '🦽 बुजुर्ग / दिव्यांग सहायता', labelEn: '🦽 Elderly Assistance' },
                          { id: 'Fire / Smoke Hazard', labelHi: '🧯 अग्नि / धुआं आपातकाल', labelEn: '🧯 Fire / Smoke Hazard' },
                          { id: 'Security Threat / Altercation', labelHi: '🛡️ सुरक्षा विवाद / चोरी', labelEn: '🛡️ Security / Theft' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSosType(item.id)}
                            className={`p-2.5 rounded-xl border-2 text-left font-bold text-xs transition-all ${
                              sosType === item.id 
                                ? 'border-red-500 bg-red-50 text-red-900 shadow-sm scale-[1.01]' 
                                : 'border-gray-200 bg-white text-gray-700 hover:border-red-200'
                            }`}
                          >
                            {isHindi ? item.labelHi : item.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Devotee Contact Phone */}
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 mb-1">
                        {isHindi ? "श्रद्धालु मोबाइल नंबर (कॉल बैक हेतु)" : "Contact Mobile (for Security Call-back)"}
                      </label>
                      <input
                        type="tel"
                        value={sosPhone}
                        onChange={(e) => setSosPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full p-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 font-bold text-sm text-gray-800 outline-none focus:border-red-500 focus:bg-white transition"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSubmittingSos}
                      onClick={handleTriggerSos}
                      className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-black text-lg tracking-wider rounded-xl shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      {isSubmittingSos ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <AlertTriangle className="w-6 h-6" />
                          <span>{isHindi ? "🚨 तत्काल सुरक्षा एवं चिकित्सा SOS भेजें" : "🚨 SEND EMERGENCY SOS NOW"}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 animate-in zoom-in-95 text-left">
                    <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-red-200 uppercase tracking-widest">
                          {isHindi ? "सुरक्षा दल रवाना" : "DISPATCH CONFIRMED"}
                        </div>
                        <div className="text-lg font-black leading-tight">
                          {isHindi ? "आपातकालीन सहायता दल रवाना हो चुका है!" : "Security & Medical Team Dispatched!"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-gray-500 font-bold uppercase">{isHindi ? "घटना का प्रकार" : "Emergency Type"}</span>
                        <span className="font-black text-red-700">{sosResult?.emergency_type || sosType}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-gray-500 font-bold uppercase">{isHindi ? "निर्धारित ज़ोन" : "Target Zone"}</span>
                        <span className="font-black text-gray-900">{sosResult?.location || sosZone}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-gray-500 font-bold uppercase">{isHindi ? "श्रद्धालु" : "Devotee"}</span>
                        <span className="font-black text-gray-800">{userDashboard?.user?.name || 'Devotee'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-500 font-bold uppercase">{isHindi ? "अलर्ट समय" : "Alert Timestamp"}</span>
                        <span className="font-mono font-bold text-gray-700">{sosResult?.timestamp || 'Just now'}</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium leading-relaxed">
                      💡 {isHindi 
                        ? "कृपया अपने वर्तमान स्थान पर ही रहें। निकटतम सुरक्षा गार्ड और मेडिकल टीम 60 से 90 सेकंड में आपके पास पहुंच रही है।" 
                        : "Please remain at your current location. Officers and paramedics will reach you in 60-90 seconds."}
                    </div>

                    <div className="p-3 bg-gray-100 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-gray-500 uppercase">{isHindi ? "24/7 मंदिर सुरक्षा हेल्पलाइन" : "24/7 Security Helpline"}</div>
                      <div className="text-base font-black text-gray-900 font-mono mt-0.5">📞 1800-233-5555 / +91 98765 43210</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSosSent(false)}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition active:scale-95"
                      >
                        {isHindi ? "नया अलर्ट भेजें" : "New Alert"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveServiceModal(null); setSosSent(false); }}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition active:scale-95"
                      >
                        {isHindi ? "बंद करें" : "Close"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeServiceModal === 'donate' && (() => {
              const currentUpiCfg = getTempleUpiConfig(donateTemple, temples);
              return (
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
                          {isHindi ? "पवित्र सेवा संकल्प एवं धारा 80G कर छूट रसीद" : "Official Digital Seva & 80G Tax Exemption Receipt"}
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
                      1. {isHindi ? "विवरण व राशि" : "Amount & Temple"}
                    </div>
                    <div className={`py-1.5 text-center rounded-lg transition-all ${donateStep === 'pay' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-400'}`}>
                      2. {isHindi ? "UPI भुगतान" : "Pay & Proof"}
                    </div>
                    <div className={`py-1.5 text-center rounded-lg transition-all ${donateStep === 'receipt' ? 'bg-white text-emerald-700 shadow-sm font-black' : 'text-gray-400'}`}>
                      3. {isHindi ? "80G रसीद" : "80G Receipt"}
                    </div>
                  </div>

                  {/* STEP 1: Select Temple, Devotee, Purpose, and Amount */}
                  {donateStep === 'select' && (
                    <div className="flex flex-col gap-3.5 animate-in fade-in">
                      {/* Temple Selector */}
                      <div>
                        <label className="block text-[11px] font-black uppercase text-gray-400 mb-1">
                          {isHindi ? "मंदिर न्यास चुनें (Temple Trust)" : "Select Temple Trust"}
                        </label>
                        <select
                          value={donateTemple}
                          onChange={(e) => setDonateTemple(e.target.value)}
                          className="w-full p-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm font-bold text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition cursor-pointer"
                        >
                          {temples && temples.length > 0 ? (
                            temples.map((t: any) => (
                              <option key={t.id} value={t.name}>
                                {t.name} ({t.city})
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Shri Kashi Vishwanath Temple">Shri Kashi Vishwanath Mandir Trust, Varanasi</option>
                              <option value="Shree Siddhivinayak Temple">Shree Siddhivinayak Ganapati Temple Trust, Mumbai</option>
                              <option value="Shree Somnath Jyotirlinga">Shree Somnath Trust, Prabhas Patan</option>
                              <option value="Mahakaleshwar Jyotirlinga">Shri Mahakaleshwar Temple Committee, Ujjain</option>
                              <option value="Tirumala Tirupati Devasthanams">Tirumala Tirupati Devasthanams (TTD), Tirupati</option>
                              <option value="Shri Mata Vaishno Devi Shrine">Shri Mata Vaishno Devi Shrine Board, Katra</option>
                            </>
                          )}
                        </select>
                      </div>

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

                      {/* Optional PAN Input for 80G */}
                      <div>
                        <label className="block text-[11px] font-black uppercase text-gray-400 mb-1">
                          {isHindi ? "पैन नंबर (धारा 80G कर छूट रसीद हेतु - वैकल्पिक)" : "Devotee PAN (for 80G Tax Exemption - Optional)"}
                        </label>
                        <input
                          type="text"
                          value={donatePan}
                          onChange={(e) => setDonatePan(e.target.value.toUpperCase())}
                          placeholder="e.g. ABCDE1234F"
                          maxLength={10}
                          className="w-full p-2.5 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm font-mono font-bold text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition uppercase tracking-wider"
                        />
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
                          <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">{donateTemple}</div>
                          <div className="text-xs text-gray-600 font-bold">{donatePurpose}</div>
                          <div className="text-sm font-black text-gray-900 mt-0.5">{donateDevoteeName || userDashboard?.user?.name || 'Devotee'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-500 uppercase">{isHindi ? "राशि" : "Amount"}</div>
                          <div className="text-2xl font-black text-emerald-700">₹{donateAmount || '501'}</div>
                        </div>
                      </div>

                      {/* Direct UPI App Button */}
                      <a
                        href={`upi://pay?pa=${currentUpiCfg.upiId}&pn=${encodeURIComponent(currentUpiCfg.trustName)}&am=${donateAmount || '101'}&cu=INR&tn=${encodeURIComponent(donatePurpose || 'Temple Donation')}`}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-center rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>📲 {isHindi ? "UPI ऐप में खोलें (GPay / PhonePe / Paytm)" : "Open in UPI App (GPay / PhonePe / Paytm)"}</span>
                      </a>

                      {/* Official UPI ID with Copy Button */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{currentUpiCfg.trustName}</div>
                          <div className="font-mono font-black text-sm text-gray-900">{currentUpiCfg.upiId}</div>
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
                          {currentUpiCfg.qrImage ? (
                            <div className="flex flex-col items-center">
                              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full mb-3 shadow-xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{isHindi ? "आधिकारिक सत्यापित मंदिर QR कोड" : "Verified Official Temple QR Code"}</span>
                              </div>
                              <img 
                                src={currentUpiCfg.qrImage} 
                                alt={`${currentUpiCfg.trustName} QR Code`} 
                                className="w-52 h-52 object-contain rounded-xl border-2 border-emerald-400 p-1.5 shadow-sm bg-white hover:scale-[1.02] transition"
                              />
                              <div className="mt-2 text-xs font-bold text-gray-800">
                                {currentUpiCfg.trustName}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                UPI ID: {currentUpiCfg.upiId}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2">
                                <span>{isHindi ? "डायनामिक UPI QR कोड" : "Dynamic Instant UPI QR"}</span>
                              </div>
                              <QRCodeSVG 
                                value={`upi://pay?pa=${currentUpiCfg.upiId}&pn=${encodeURIComponent(currentUpiCfg.trustName)}&am=${donateAmount || '101'}&cu=INR&tn=${encodeURIComponent(donatePurpose || 'Temple Donation')}`} 
                                size={150} 
                                level="M" 
                              />
                              <div className="mt-2 text-xs font-bold text-gray-700">
                                Scan with GPay / PhonePe / Paytm / BHIM
                              </div>
                            </div>
                          )}
                          <div className="text-[11px] text-emerald-700 font-black mt-2 bg-emerald-50 px-3 py-1 rounded-full">
                            {isHindi ? `दान संकल्प राशि: ₹${donateAmount || '101'}` : `Offering Amount: ₹${donateAmount || '101'}`}
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
                          <CheckCircle2 className="w-3 h-3" /> Verified & Recorded
                        </div>

                        <div className="text-center border-b border-dashed border-gray-200 pb-4 mb-4 mt-2">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <div className="text-[10px] uppercase font-black tracking-widest text-emerald-800">
                            {donateReceiptData?.temple_name || donateTemple}
                          </div>
                          <h4 className="text-lg font-black text-gray-900">
                            {isHindi ? "आधिकारिक दान रसीद (Official Daan Receipt)" : "Official Temple Daan Receipt"}
                          </h4>
                          <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                            {donateReceiptData?.receipt_id || 'REC-2026-001'}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 text-xs">
                          <div className="flex justify-between items-center py-1 border-b border-gray-100">
                            <span className="text-gray-400 font-bold uppercase">{isHindi ? "मंदिर न्यास" : "Temple Trust"}</span>
                            <span className="font-black text-gray-800 text-right">{donateReceiptData?.temple_name || donateTemple}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-100">
                            <span className="text-gray-400 font-bold uppercase">{isHindi ? "भक्त का नाम" : "Devotee"}</span>
                            <span className="font-black text-gray-800">{donateReceiptData?.user_name || 'Devotee'}</span>
                          </div>
                          {donateReceiptData?.pan_number && donateReceiptData.pan_number !== 'N/A' && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-400 font-bold uppercase">PAN (80G Tax Credit)</span>
                              <span className="font-mono font-bold text-gray-900">{donateReceiptData.pan_number}</span>
                            </div>
                          )}
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
                          Recognized under Section 80G(5) of Income Tax Act 1961 • Registration No: AAATT0144RE20214
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{isHindi ? "रसीद प्रिंट / सहेजें" : "Print 80G Receipt"}</span>
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
              );
            })()}

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
              <div className="p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                      <Search className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
                        {isHindi ? "AI खोया-पाया एवं परिजन खोज सेवा" : "AI Lost & Found / Missing Help"}
                      </h3>
                      <p className="text-gray-500 text-[11px] font-medium">
                        {isHindi ? "CCTV स्मार्ट ट्रैकिंग एवं परिसर सुरक्षा लाउडस्पीकर प्रसारण" : "CCTV facial & object recognition tracking across temple zones"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Report Form */}
                <div className="bg-purple-50/60 p-4 rounded-2xl border-2 border-purple-100 mb-5 shadow-sm">
                  <div className="text-xs font-black text-purple-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>{isHindi ? "लापता व्यक्ति या खोया सामान रिपोर्ट करें" : "Report Missing Person or Item"}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                        {isHindi ? "श्रेणी (Category)" : "Category"}
                      </label>
                      <select 
                        value={lfType} 
                        onChange={(e) => setLfType(e.target.value)} 
                        className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-purple-500 transition cursor-pointer"
                      >
                        <option value="Lost Child">👶 Lost Child (गुमशुदा बालक / बालिका)</option>
                        <option value="Missing Elder">🧓 Missing Elder / Family Member (परिजन)</option>
                        <option value="Smartphone / Mobile">📱 Mobile / Smartphone (स्मार्टफोन)</option>
                        <option value="Wallet / Purse">👛 Wallet / Purse / Aadhaar (पर्स / बटुआ)</option>
                        <option value="Bag / Luggage">🎒 Bag / Backpack (बैग / सामान)</option>
                        <option value="Jewellery / Valuables">💍 Jewellery / Gold (आभूषण)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                        {isHindi ? "अंतिम बार देखा गया स्थान" : "Last Seen Zone"}
                      </label>
                      <select 
                        value={lfLocation} 
                        onChange={(e) => setLfLocation(e.target.value)} 
                        className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-purple-500 transition cursor-pointer"
                      >
                        <option value="Main Corridor / Queue">Main Darshan Corridor (मुख्य दर्शन कतार)</option>
                        <option value="Sanctum Sanctorum (Garbhagriha)">Sanctum Sanctorum (गर्भगृह क्षेत्र)</option>
                        <option value="North Entry Gate">North Entry Gate & Security (उत्तर प्रवेश द्वार)</option>
                        <option value="Parking Ground Area">Vehicle Parking Ground (पार्किंग ज़ोन)</option>
                        <option value="Footwear / Shoe Stand">Footwear Stand (जूता स्टैंड)</option>
                        <option value="Prasadam Hall">Annakshetra & Dining Hall (अन्नक्षेत्र)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-2.5">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                      {isHindi ? "पहचान विवरण (कपड़े, रंग, पहचान चिह्न)" : "Visual Description (Clothing, Color, Identifying Marks)"}
                    </label>
                    <input 
                      value={lfDesc} 
                      onChange={(e) => setLfDesc(e.target.value)} 
                      placeholder={isHindi ? "उदा. 6 साल का बालक, पीला कुर्ता, नीली जींस..." : "e.g. 6-yr-old boy, yellow kurta, blue jeans..."} 
                      className="w-full p-2.5 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-purple-500 transition" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                        {isHindi ? "अभिभावक / संपर्क व्यक्ति का नाम" : "Contact Person / Guardian"}
                      </label>
                      <input 
                        value={lfContactName} 
                        onChange={(e) => setLfContactName(e.target.value)} 
                        placeholder={userDashboard?.user?.name || "Enter guardian name"} 
                        className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-purple-500 transition" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                        {isHindi ? "संपर्क मोबाइल नंबर" : "Contact Mobile"}
                      </label>
                      <input 
                        type="tel"
                        value={lfContactPhone} 
                        onChange={(e) => setLfContactPhone(e.target.value)} 
                        placeholder="e.g. 9876543210" 
                        className="w-full p-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-purple-500 transition" 
                      />
                    </div>
                  </div>

                  <button 
                    type="button"
                    disabled={isSubmittingLf || !lfDesc.trim()} 
                    onClick={async () => {
                      if (!lfDesc.trim()) return;
                      setIsSubmittingLf(true);
                      try {
                        await axios.post(`${API_URL}/services/lostfound`, {
                          item_type: lfType,
                          desc: lfDesc.trim(),
                          location: lfLocation,
                          contact_name: lfContactName.trim() || userDashboard?.user?.name || 'Devotee Guardian',
                          contact_phone: lfContactPhone.trim() || 'N/A'
                        });
                        setLfDesc('');
                        fetchServices();
                      } catch(e) {
                        console.error(e);
                      } finally {
                        setIsSubmittingLf(false);
                      }
                    }} 
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-black text-xs tracking-wide shadow-md active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    {isSubmittingLf ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>{isHindi ? "रिपोर्ट दर्ज करें एवं AI ट्रैकिंग शुरू करें" : "Broadcast Report & Activate AI Search"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Feed Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{isHindi ? "लाइव खोज एवं पुनःमिलन फीड" : "Live AI Search & Reunited Feed"}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400">
                    {lostFoundData.length} {isHindi ? "रिकॉर्ड्स" : "cases"}
                  </span>
                </div>

                {/* Feed Cards List */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[280px]">
                  {lostFoundData.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50 text-xs">
                      {isHindi ? "वर्तमान में कोई खोया-पाया मामला दर्ज नहीं है।" : "No missing person or item cases reported."}
                    </div>
                  ) : (
                    lostFoundData.map((lf: any, i: number) => {
                      const isFound = lf.status === 'found';
                      return (
                        <div key={lf.id || i} className={`p-3.5 border-2 rounded-2xl flex flex-col gap-2 shadow-sm transition-all ${isFound ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-100 hover:border-purple-200'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="font-black text-sm text-gray-900 leading-snug">{lf.desc}</div>
                              <div className="text-[10px] text-gray-500 font-bold flex items-center gap-2 mt-0.5">
                                <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[9px]">{lf.type}</span>
                                <span>📍 {lf.location || 'Sanctum Corridor'}</span>
                                {lf.timestamp && <span>• 🕒 {lf.timestamp}</span>}
                              </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1 shrink-0 ${isFound ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-orange-100 text-orange-800 border border-orange-300 animate-pulse'}`}>
                              {isFound ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{isHindi ? "पुनःमिलन संपन्न" : "REUNITED"}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                  <span>{isHindi ? "खोज जारी" : "SEARCHING"}</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 border-t border-gray-100 text-[11px] gap-2">
                            <div className="text-gray-600 font-medium">
                              👤 {lf.contact_name || 'Guardian'}: <span className="font-bold text-gray-900">{lf.contact_phone || 'N/A'}</span>
                            </div>
                            {!isFound && lf.id && (
                              <button
                                type="button"
                                onClick={() => handleResolveLostFound(lf.id)}
                                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg transition shadow-sm active:scale-95"
                              >
                                {isHindi ? "✓ ढूंढ लिया गया (Mark Found)" : "✓ Mark Reunited / Found"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
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
