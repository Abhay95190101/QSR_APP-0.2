import React, { useState } from 'react';
import { StoreProfile } from '../../types';
import { DEFAULT_STORE_PROFILE } from '../../data/storeData';

interface StoreAuthGatewayProps {
  currentProfile: StoreProfile;
  onRegisterOrLogin: (profile: StoreProfile) => void;
  onShowToast: (msg: string) => void;
}

export const StoreAuthGateway: React.FC<StoreAuthGatewayProps> = ({
  currentProfile,
  onRegisterOrLogin,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');

  // Registration Form State
  const [regName, setRegName] = useState(currentProfile.name || 'SS Café and Restaurant');
  const [regTagline, setRegTagline] = useState(currentProfile.tagline || 'Chai, Tandoori Specials & Grill Chicken');
  const [regPhone, setRegPhone] = useState(currentProfile.phone || '9987504251');
  const [regEmail, setRegEmail] = useState(currentProfile.email || 'SS.Cafeandrestaurant@gmail.com');
  const [regAddress, setRegAddress] = useState(currentProfile.address || 'Main Market Road');
  const [regCity, setRegCity] = useState(currentProfile.city || 'Kolkata, West Bengal');
  const [regUpiId, setRegUpiId] = useState(currentProfile.upiId || '9987504251@upi');
  const [regPin, setRegPin] = useState(currentProfile.ownerPin || '1234');
  const [regTaxRate, setRegTaxRate] = useState(currentProfile.taxRate ?? 5.0);

  // Login Form State
  const [loginPhoneOrName, setLoginPhoneOrName] = useState(currentProfile.phone || currentProfile.name || '');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handle Quick Pre-Fill with SS Café details
  const handlePreFillSSCafe = () => {
    setRegName('SS Café and Restaurant');
    setRegTagline('Delicious Chai, Tandoori Specials, Burgers & Grill Chicken');
    setRegPhone('9987504251');
    setRegEmail('SS.Cafeandrestaurant@gmail.com');
    setRegAddress('Main Market Road');
    setRegCity('Kolkata, West Bengal');
    setRegUpiId('9647374072-3@ybl');
    setRegPin('1234');
    setRegTaxRate(5.0);
    onShowToast('Loaded SS Café and Restaurant details!');
  };

  // Handle Store Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      onShowToast('Please enter your Store / Restaurant Name.');
      return;
    }
    if (!regPhone.trim()) {
      onShowToast('Please enter your contact phone / mobile number.');
      return;
    }

    const newProfile: StoreProfile = {
      ...DEFAULT_STORE_PROFILE,
      ...currentProfile,
      name: regName.trim(),
      tagline: regTagline.trim(),
      phone: regPhone.trim(),
      email: regEmail.trim(),
      address: regAddress.trim(),
      city: regCity.trim(),
      upiId: regUpiId.trim() || `${regPhone.trim()}@upi`,
      ownerPin: regPin.trim() || '1234',
      taxRate: regTaxRate,
      currencySymbol: '₹',
      isOpen: true,
    };

    onRegisterOrLogin(newProfile);
    onShowToast(`🎉 Welcome to ${newProfile.name}! Store registered successfully.`);
  };

  // Handle Store Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const savedPin = currentProfile.ownerPin || '1234';
    if (loginPin.trim() !== savedPin && loginPin.trim() !== '1234') {
      setLoginError('Incorrect 4-digit PIN. (Default master PIN: 1234)');
      return;
    }

    const updatedProfile: StoreProfile = {
      ...currentProfile,
      name: currentProfile.name || loginPhoneOrName.trim() || 'SS Café and Restaurant',
    };

    onRegisterOrLogin(updatedProfile);
    onShowToast(`👋 Welcome back to ${updatedProfile.name}!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface-container-low to-surface-container-high flex flex-col items-center justify-center p-3 sm:p-6 font-body-md text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Brand Header */}
      <div className="w-full max-w-xl text-center mb-5 animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-primary text-on-primary shadow-xl shadow-primary/25 mb-3">
          <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
        </div>
        <h1 className="font-headline-md text-xl sm:text-2xl font-black text-on-surface tracking-tight">
          Restaurant POS &amp; QR Management
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Register or log in to your store to access the live dashboard, kitchen orders, and QR menu.
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-2xl border border-black/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Tab Switcher */}
        <div className="flex border-b border-black/[0.06] bg-surface-container/40 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setLoginError('');
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">app_registration</span>
            <span>Register New Store</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError('');
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>Log In to Store</span>
          </button>
        </div>

        {/* ================= REGISTER TAB ================= */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-5 sm:p-7 space-y-4 text-xs">
            {/* Quick Fill Button */}
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">local_cafe</span>
                <span className="font-extrabold text-on-surface text-[11px] sm:text-xs">
                  Menu loaded: <strong>SS Café and Restaurant</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handlePreFillSSCafe}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-[11px] font-black shadow-xs flex-shrink-0 active:scale-95 transition-all"
              >
                Pre-Fill SS Café Info
              </button>
            </div>

            {/* Restaurant Name */}
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                Store / Restaurant Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SS Café and Restaurant"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-black/10 text-on-surface font-black text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Tagline & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  Tagline / Cuisine Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chai, Tandoori & Grill"
                  value={regTagline}
                  onChange={(e) => setRegTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
                />
              </div>
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  Contact Mobile / WhatsApp <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9987504251"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-xs outline-none font-bold"
                />
              </div>
            </div>

            {/* UPI ID & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  UPI ID (for Customer QR Payments) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9987504251@upi"
                  value={regUpiId}
                  onChange={(e) => setRegUpiId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. SS.Cafeandrestaurant@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
                />
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-extrabold text-on-surface block mb-1">
                  Store Address
                </label>
                <input
                  type="text"
                  placeholder="Shop Address / Road / Landmark"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
                />
              </div>
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  City / State
                </label>
                <input
                  type="text"
                  placeholder="Kolkata, WB"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
                />
              </div>
            </div>

            {/* PIN & GST */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  Master Security PIN (4 digits) <span className="text-error">*</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="1234"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-center text-sm font-black outline-none tracking-widest"
                />
              </div>
              <div>
                <label className="font-extrabold text-on-surface block mb-1">
                  GST Tax % (Default 5%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="28"
                  value={regTaxRate}
                  onChange={(e) => setRegTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-bold text-xs outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Register Store &amp; Enter Dashboard</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= LOGIN TAB ================= */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-5 sm:p-7 space-y-4 text-xs">
            {loginError && (
              <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-error font-bold text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                Store Name or Registered Mobile Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SS Café and Restaurant or 9987504251"
                value={loginPhoneOrName}
                onChange={(e) => setLoginPhoneOrName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-black/10 text-on-surface font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                4-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-center text-lg font-black outline-none tracking-widest focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-[10px] text-on-surface-variant block mt-1 text-center">
                Default Master PIN: <strong>1234</strong>
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Log In &amp; Open POS</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-primary hover:underline font-bold text-xs"
              >
                Don't have a registered store yet? Register New Store →
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center mt-5 text-[11px] text-on-surface-variant">
        <span>SS Café and Restaurant • Contactless Table QR Ordering &amp; Kitchen Management</span>
      </div>
    </div>
  );
};
