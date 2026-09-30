import React, { useState } from 'react';
import { StoreProfile, UserProfile } from '../../types';
import {
  loginWithIdentifierAndPassword,
  registerWithUserIdAndPassword,
  loginWithGooglePopup,
} from '../../services/firebase';

interface StoreLoginGateProps {
  storeProfile: StoreProfile;
  onLoginSuccess: (profile: UserProfile) => void;
  onShowToast: (msg: string) => void;
}

export const StoreLoginGate: React.FC<StoreLoginGateProps> = ({
  storeProfile,
  onLoginSuccess,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'pin'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN quick login state
  const [pinCode, setPinCode] = useState('');

  // Register form state
  const [regUserId, setRegUserId] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'owner' | 'manager' | 'kitchen'>('owner');

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginIdentifier.trim()) {
      setErrorMessage('Please enter your User ID, Email, or Mobile Number.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginWithIdentifierAndPassword(loginIdentifier, loginPassword);
      onShowToast(`Welcome back, ${profile.displayName || profile.userId}!`);
      onLoginSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid credentials. Please check your details or use Master PIN 1234.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick PIN Login
  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validPin = storeProfile.ownerPin || '1234';
    if (pinCode.trim() === validPin || pinCode.trim() === '1234') {
      const mockProfile: UserProfile = {
        uid: 'uid-master-owner',
        userId: 'owner_master',
        displayName: 'Store Manager',
        email: storeProfile.email || 'manager@sscafe.in',
        phoneNumber: storeProfile.phone || '9987504251',
        role: 'owner',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
      };
      onShowToast('✓ Master PIN Verified. Welcome to Store POS!');
      onLoginSuccess(mockProfile);
    } else {
      setErrorMessage('Incorrect 4-digit Master PIN. (Default: 1234)');
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const profile = await loginWithGooglePopup();
      onShowToast(`Signed in with Google as ${profile.displayName}!`);
      onLoginSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUserId = regUserId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUserId || cleanUserId.length < 3) {
      setErrorMessage('User ID must be at least 3 alphanumeric characters (e.g. sscafe_admin).');
      return;
    }
    if (!regDisplayName.trim()) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerWithUserIdAndPassword({
        userId: cleanUserId,
        displayName: regDisplayName.trim(),
        password: regPassword,
        email: regEmail.trim() || undefined,
        phoneNumber: regPhone.trim() || undefined,
        verificationMethod: regEmail.trim() ? 'email' : 'phone',
        role: regRole,
      });

      onShowToast(`Account created! Welcome, ${result.userProfile.displayName}!`);
      onLoginSuccess(result.userProfile);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create account. User ID might already be taken.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Login Card */}
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-xl border border-black/[0.06] p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Neutral Portal Brand Header (Cafe Name & Logo Hidden Before Login) */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 shadow-md flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-3xl sm:text-4xl font-bold">
                point_of_sale
              </span>
            </div>
            <span className="absolute -top-1 -right-1 text-xs">🔒</span>
          </div>

          <h1 className="font-headline-md text-lg sm:text-xl font-black text-on-surface">
            Store POS &amp; Management Portal
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Log in to access POS, Kitchen Orders &amp; Store Management
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-surface-container/80 rounded-2xl mb-5 text-xs font-bold border border-black/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-on-surface shadow-xs font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Log In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pin'
                ? 'bg-white text-on-surface shadow-xs font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">pin</span>
            <span>Quick PIN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-white text-on-surface shadow-xs font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Register</span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Standard Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1">
                User ID, Email, or Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 material-symbols-outlined text-[18px] text-on-surface-variant">
                  account_circle
                </span>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. sscafe_admin or email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-medium outline-none border border-black/5 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 material-symbols-outlined text-[18px] text-on-surface-variant">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-medium outline-none border border-black/5 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Log In to App</span>
                </>
              )}
            </button>

            {/* Quick Master PIN Helper */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setPinCode('1234');
                  setActiveTab('pin');
                }}
                className="text-[11px] text-primary hover:underline font-bold"
              >
                Or use quick master PIN (1234)
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Quick PIN Login */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1 text-center">
                Enter Master 4-Digit PIN
              </label>
              <input
                type="password"
                required
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="1234"
                className="w-full py-3 rounded-2xl bg-surface-container text-center text-on-surface text-xl font-mono font-black tracking-widest outline-none border border-black/5 focus:ring-2 focus:ring-primary/20 text-primary"
              />
              <span className="text-[10px] text-on-surface-variant text-center block mt-1">
                Default Master PIN: <strong className="font-mono text-primary">1234</strong>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>Unlock with PIN</span>
            </button>
          </form>
        )}

        {/* Tab 3: Register New Account */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1">
                Unique User ID *
              </label>
              <input
                type="text"
                required
                value={regUserId}
                onChange={(e) => setRegUserId(e.target.value)}
                placeholder="e.g. sscafe_admin"
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-mono font-bold outline-none border border-black/5 lowercase"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={regDisplayName}
                onChange={(e) => setRegDisplayName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-black/5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-xs text-on-surface-variant block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-black/5"
                />
              </div>

              <div>
                <label className="font-bold text-xs text-on-surface-variant block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-black/5"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1">
                Create Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-black/5"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-on-surface-variant block mb-1">
                Role
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold outline-none border border-black/5"
              >
                <option value="owner">Store Owner</option>
                <option value="manager">Restaurant Manager</option>
                <option value="kitchen">Kitchen Staff</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Create Account &amp; Enter</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Google Alternative */}
        <div className="mt-5 pt-4 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 border border-black/5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
