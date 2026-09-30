import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import {
  registerWithUserIdAndPassword,
  loginWithIdentifierAndPassword,
  loginWithGooglePopup,
  verifyOtpCode,
  requestVerificationCode,
  sendUserPasswordReset,
  logoutUser,
} from '../../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onAuthSuccess: (profile: UserProfile) => void;
  onSignOut: () => void;
  onShowToast: (msg: string) => void;
  initialMode?: 'signin' | 'signup' | 'profile';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  onAuthSuccess,
  onSignOut,
  onShowToast,
  initialMode = 'signin',
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'verify' | 'profile' | 'reset'>(
    currentUserProfile ? 'profile' : initialMode
  );

  // Sign In form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up form fields
  const [regUserId, setRegUserId] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVerificationMethod, setRegVerificationMethod] = useState<'email' | 'phone'>('email');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'owner' | 'manager' | 'kitchen' | 'customer'>('customer');

  // Verification step state
  const [verifyTarget, setVerifyTarget] = useState('');
  const [verifyType, setVerifyType] = useState<'email' | 'phone'>('email');
  const [verifyUserId, setVerifyUserId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [generatedDemoCode, setGeneratedDemoCode] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);

  // Password reset state
  const [resetInput, setResetInput] = useState('');

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserProfile) {
      setActiveTab('profile');
    } else if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [currentUserProfile, initialMode, isOpen]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  if (!isOpen) return null;

  // Handle Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter your User ID/Email and Password.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginWithIdentifierAndPassword(loginIdentifier, loginPassword);
      onAuthSuccess(profile);
      onShowToast(`Welcome back, ${profile.displayName}!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google 1-Click Login
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const profile = await loginWithGooglePopup();
      onAuthSuccess(profile);
      onShowToast(`Signed in with Google Gmail as ${profile.displayName}!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanId = regUserId.trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '');
    if (!cleanId || cleanId.length < 3) {
      setErrorMessage('User ID must be at least 3 alphanumeric characters (e.g., alex_99, chef_dan).');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (regVerificationMethod === 'email') {
      if (!regEmail || !regEmail.includes('@')) {
        setErrorMessage('Please provide a valid Gmail or Email address for verification.');
        return;
      }
    } else {
      if (!regPhone || regPhone.replace(/[^0-9]/g, '').length < 8) {
        setErrorMessage('Please provide a valid Mobile Phone Number for OTP verification.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await registerWithUserIdAndPassword({
        userId: cleanId,
        password: regPassword,
        displayName: regDisplayName.trim() || cleanId,
        email: regEmail.trim(),
        phoneNumber: regPhone.trim(),
        role: regRole,
        verificationMethod: regVerificationMethod,
      });

      setVerifyUserId(cleanId);
      setVerifyTarget(regVerificationMethod === 'email' ? regEmail.trim() : regPhone.trim());
      setVerifyType(regVerificationMethod);
      setGeneratedDemoCode(result.verificationCode);
      setResendCountdown(60);
      setSuccessMessage(result.message);
      setActiveTab('verify');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);

    // Auto-focus next input
    if (clean && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Handle OTP verification submit
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const updatedProfile = await verifyOtpCode({
        userId: verifyUserId || (currentUserProfile ? currentUserProfile.userId : ''),
        target: verifyTarget,
        code,
        type: verifyType,
      });

      onAuthSuccess(updatedProfile);
      onShowToast(
        verifyType === 'email'
          ? 'Gmail / Email verified successfully!'
          : 'Mobile Number verified successfully!'
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await requestVerificationCode({
        target: verifyTarget,
        type: verifyType,
      });
      setGeneratedDemoCode(res.code);
      setResendCountdown(60);
      setSuccessMessage(res.message);
      onShowToast('Verification code resent!');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start verification for an unverified target from profile
  const handleStartProfileVerification = async (type: 'email' | 'phone') => {
    if (!currentUserProfile) return;
    const target = type === 'email' ? currentUserProfile.email : currentUserProfile.phoneNumber;
    if (!target) {
      setErrorMessage(`Please configure a ${type === 'email' ? 'Gmail address' : 'Mobile number'} first.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await requestVerificationCode({
        target,
        type,
      });
      setVerifyUserId(currentUserProfile.userId);
      setVerifyTarget(target);
      setVerifyType(type);
      setGeneratedDemoCode(res.code);
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(60);
      setActiveTab('verify');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetInput.trim()) {
      setErrorMessage('Please enter your User ID or Gmail address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const msg = await sendUserPasswordReset(resetInput);
      setSuccessMessage(msg);
      onShowToast('Password reset link sent to your registered Gmail.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Log Out
  const handleSignOut = async () => {
    await logoutUser();
    onSignOut();
    onShowToast('Signed out successfully.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-2xl relative my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-[26px]">
              {activeTab === 'profile'
                ? 'account_circle'
                : activeTab === 'verify'
                ? 'verified_user'
                : activeTab === 'reset'
                ? 'lock_reset'
                : 'fingerprint'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface leading-tight">
              {activeTab === 'profile'
                ? 'User Profile & Security'
                : activeTab === 'verify'
                ? 'Verify Account'
                : activeTab === 'reset'
                ? 'Reset Password'
                : activeTab === 'signup'
                ? 'Create New Account'
                : 'Sign In to Sizzle & Bun'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {activeTab === 'profile'
                ? 'Manage your verified User ID, Gmail & phone'
                : activeTab === 'verify'
                ? `Enter the 6-digit OTP code sent to your ${verifyType === 'email' ? 'Gmail' : 'mobile'}`
                : activeTab === 'signup'
                ? 'User ID + Password with Gmail or Mobile OTP verification'
                : 'Secure access with User ID, Gmail or Mobile'}
            </p>
          </div>
        </div>

        {/* Global Error & Success Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error-container/60 border border-error/30 text-on-error-container text-xs flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0 mt-0.5">
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-800 text-xs flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-green-600 flex-shrink-0 mt-0.5">
              check_circle
            </span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Navigation Tabs (when not logged in and not in verify mode) */}
        {!currentUserProfile && activeTab !== 'verify' && activeTab !== 'reset' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container rounded-2xl mb-5">
            <button
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'signin'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'signup'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Register New ID
            </button>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                User ID, Email or Gmail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  person
                </span>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. alex99 or user@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reset');
                    setResetInput(loginIdentifier);
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
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
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In with Credentials</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-outline-variant/50"></div>
              <span className="flex-shrink mx-3 text-xs text-on-surface-variant font-medium">
                Or quick sign in with
              </span>
              <div className="flex-grow border-t border-outline-variant/50"></div>
            </div>

            {/* Google Gmail 1-Click Login */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-surface-container-low border border-outline-variant hover:bg-surface-container text-on-surface font-semibold text-xs transition-all flex items-center justify-center gap-3"
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
              <span>Continue with Google Gmail</span>
            </button>
          </form>
        )}

        {/* TAB 2: SIGN UP / REGISTER NEW USER ID */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            {/* User ID field */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Custom User ID / Username <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  badge
                </span>
                <input
                  type="text"
                  value={regUserId}
                  onChange={(e) => setRegUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/gi, ''))}
                  placeholder="e.g. rahul_99, chef_amit"
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                This will be your permanent unique login identifier.
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  face
                </span>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Password <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-10 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Verification Method Chooser (Gmail vs Mobile) */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Verification Channel <span className="text-primary">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegVerificationMethod('email')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    regVerificationMethod === 'email'
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span>Gmail / Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegVerificationMethod('phone')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    regVerificationMethod === 'phone'
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">smartphone</span>
                  <span>Mobile SMS</span>
                </button>
              </div>
            </div>

            {/* Conditional Input based on Verification Method */}
            {regVerificationMethod === 'email' ? (
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Gmail / Email Address for OTP <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    mail
                  </span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Mobile Number for SMS OTP <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    call
                  </span>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            )}

            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Account Type / Role
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="customer">Dining Customer / Club Member</option>
                <option value="owner">Restaurant Owner / Admin</option>
                <option value="manager">Floor Manager</option>
                <option value="kitchen">Kitchen Staff / Chef</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account &amp; Send OTP</span>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: VERIFY OTP CODE */}
        {activeTab === 'verify' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary mx-auto">
              <span className="material-symbols-outlined text-[32px]">
                {verifyType === 'email' ? 'mark_email_read' : 'sms'}
              </span>
            </div>

            <div>
              <p className="text-xs text-on-surface-variant font-medium">
                We sent a 6-digit verification code to:
              </p>
              <p className="text-sm font-bold text-on-surface mt-0.5">{verifyTarget}</p>
            </div>

            {/* Simulated verification helper indicator */}
            {generatedDemoCode && (
              <div className="p-2.5 rounded-xl bg-secondary-container/40 border border-secondary-container text-on-secondary-container text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Demo OTP Code:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = generatedDemoCode.split('');
                    setOtpDigits(digits);
                  }}
                  className="font-mono font-bold tracking-widest bg-surface-container-lowest px-2 py-0.5 rounded border border-secondary text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  {generatedDemoCode} (Auto-Fill)
                </button>
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2 my-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-13 text-center text-xl font-bold font-mono bg-surface-container-low border-2 border-outline-variant focus:border-primary rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isLoading || otpDigits.join('').length < 6}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Confirm &amp; Complete Verification</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab(currentUserProfile ? 'profile' : 'signup')}
                className="text-xs text-on-surface-variant hover:text-on-surface"
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCountdown > 0 || isLoading}
                className="text-xs font-semibold text-primary hover:underline disabled:text-on-surface-variant/50"
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: PASSWORD RESET */}
        {activeTab === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Your User ID or Gmail Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  mail
                </span>
                <input
                  type="text"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="e.g. alex99 or user@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                We will dispatch a secure password reset link to your verified Gmail.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Email</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs font-semibold text-on-surface-variant hover:text-on-surface"
            >
              &larr; Back to Sign In
            </button>
          </form>
        )}

        {/* TAB 5: PROFILE VIEW (WHEN LOGGED IN) */}
        {activeTab === 'profile' && currentUserProfile && (
          <div className="space-y-4">
            {/* User Avatar & Basic Info */}
            <div className="flex items-center gap-3 p-3 bg-surface-container rounded-2xl">
              <img
                src={currentUserProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserProfile.userId}`}
                alt="Avatar"
                className="w-14 h-14 rounded-full bg-surface-container-lowest object-cover border-2 border-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-on-surface truncate">
                    {currentUserProfile.displayName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-[10px] uppercase">
                    {currentUserProfile.role}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-mono">
                  @{currentUserProfile.userId}
                </p>
              </div>
            </div>

            {/* Verification Status Cards */}
            <div className="space-y-2">
              {/* Gmail Verification Status */}
              <div className="p-3 rounded-xl border border-outline-variant bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    mail
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {currentUserProfile.email || 'No Gmail Linked'}
                    </p>
                    <div className="flex items-center gap-1">
                      {currentUserProfile.emailVerified ? (
                        <span className="text-[11px] font-bold text-green-700 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          Verified Gmail
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!currentUserProfile.emailVerified && currentUserProfile.email && (
                  <button
                    onClick={() => handleStartProfileVerification('email')}
                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90"
                  >
                    Verify
                  </button>
                )}
              </div>

              {/* Mobile Phone Verification Status */}
              <div className="p-3 rounded-xl border border-outline-variant bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    smartphone
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {currentUserProfile.phoneNumber || 'No Mobile Number'}
                    </p>
                    <div className="flex items-center gap-1">
                      {currentUserProfile.phoneVerified ? (
                        <span className="text-[11px] font-bold text-green-700 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          Verified Mobile
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!currentUserProfile.phoneVerified && currentUserProfile.phoneNumber && (
                  <button
                    onClick={() => handleStartProfileVerification('phone')}
                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-surface-container-low p-3 rounded-xl space-y-1 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Account Created:</span>
                <span className="font-semibold text-on-surface">
                  {new Date(currentUserProfile.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Security Level:</span>
                <span className="font-semibold text-on-surface">
                  {currentUserProfile.emailVerified && currentUserProfile.phoneVerified
                    ? 'Tier 2 (Gmail & Mobile Verified)'
                    : currentUserProfile.emailVerified || currentUserProfile.phoneVerified
                    ? 'Tier 1 (Verified)'
                    : 'Standard'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-xl border border-error/40 text-error hover:bg-error-container/20 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-on-background text-on-primary font-bold text-xs hover:opacity-90 transition-opacity text-center"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
