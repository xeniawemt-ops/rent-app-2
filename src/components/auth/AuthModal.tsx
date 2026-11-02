import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Smartphone,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot_password';
  initialRole?: UserRole;
  onOpenTerms?: () => void;
  onOpenPolicies?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'customer',
  onOpenTerms,
  onOpenPolicies,
}) => {
  const {
    login,
    loginWithGoogle,
    signupCustomer,
    signupOwner,
    requestPasswordReset,
    resetPassword,
  } = useAuth();

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle(role);
      if (!res.success) {
        setError(res.error || 'Google sign-in failed');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAntiDiscrimination, setAgreedAntiDiscrimination] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password Reset state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStage, setResetStage] = useState<'request' | 'submit'>('request');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Feedback & Loading
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setRole(initialRole);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode, initialRole, isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining && lockoutRemaining > 0) {
      const timer = setInterval(() => {
        setLockoutRemaining(prev => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutRemaining]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await login(email, password, role);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
        if (res.lockoutRemainingSeconds) {
          setLockoutRemaining(res.lockoutRemainingSeconds);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (role === 'customer') {
        const res = await signupCustomer({
          name,
          email,
          password,
          confirmPassword,
          phone,
          agreedTerms,
        });
        if (!res.success) {
          setError(res.error || 'Customer registration failed.');
          if (res.retryAfterSeconds || res.lockoutRemainingSeconds) {
            setLockoutRemaining(res.retryAfterSeconds || res.lockoutRemainingSeconds || null);
          }
        }
      } else if (role === 'owner') {
        const res = await signupOwner({
          fullName: name,
          email,
          password,
          confirmPassword,
          phone,
          agreedTerms,
          agreedAntiDiscrimination,
        });
        if (!res.success) {
          setError(res.error || 'Owner registration failed.');
          if (res.retryAfterSeconds || res.lockoutRemainingSeconds) {
            setLockoutRemaining(res.retryAfterSeconds || res.lockoutRemainingSeconds || null);
          }
        }
      } else {
        setError('Public registration is not permitted for Administrative accounts.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(email);
      if ((res as any).rateLimited) {
        setError(res.message);
        if ((res as any).retryAfterSeconds) {
          setLockoutRemaining((res as any).retryAfterSeconds);
        }
      } else {
        setResetMessage(res.message);
        if (res.debugResetToken) {
          setResetToken(res.debugResetToken);
          setResetStage('submit');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await resetPassword(resetToken, newPassword);
      if (res.success) {
        setSuccessMsg('Your password has been securely updated. Please log in with your new password.');
        setMode('login');
        setResetStage('request');
        setPassword('');
      } else {
        setError(res.error || 'Failed to reset password. Link may have expired.');
        if ((res as any).retryAfterSeconds) {
          setLockoutRemaining((res as any).retryAfterSeconds);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error completing password reset.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-editorial font-bold text-base shadow-xs">
              N
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-lg font-bold text-stone-900 tracking-tight">NivasPay</span>
                <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                  {role}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-light">
                {role === 'customer' && 'Tenant Portal & Residences'}
                {role === 'owner' && 'Property Owner & Lease Management'}
                {role === 'admin' && 'Compliance & Platform Authority'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs (Customer / Owner in public mode; Dedicated header in Admin mode) */}
        {initialRole === 'admin' ? (
          <div className="px-6 pt-4">
            <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl flex items-center gap-2.5 border border-slate-800">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Administrative Portal</p>
                <p className="text-[10px] text-slate-400">Authorized personnel only &bull; Credential authentication required</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-2xl text-xs font-medium text-stone-600">
              <button
                type="button"
                onClick={() => {
                  setRole('customer');
                  setError(null);
                }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'customer'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('owner');
                  setError(null);
                }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'owner'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Owner</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs (Login / Sign Up / Forgot Password) */}
        {role !== 'admin' && (
          <div className="px-6 pt-3 flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`pb-1 border-b-2 transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'border-emerald-900 text-emerald-950'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`pb-1 border-b-2 transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'border-emerald-900 text-emerald-950'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                Create Account
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setMode('forgot_password'); setError(null); }}
              className="text-[11px] text-stone-500 hover:text-emerald-900 transition-colors cursor-pointer"
            >
              Reset Password?
            </button>
          </div>
        )}

        {role === 'admin' && (
          <div className="px-6 pt-3 pb-2 text-xs font-medium text-stone-500 flex items-center justify-between border-b border-stone-100">
            <span>Administrative Credential Sign In</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-mono">
              RBAC PROTECTED
            </span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">

          {/* Feedback & Error Notices */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
                {lockoutRemaining && (
                  <p className="mt-1 font-mono font-bold text-rose-950">
                    Lockout remaining: {lockoutRemaining} seconds
                  </p>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* ================= 1. LOGIN FORM ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-600 font-medium mb-1">
                  {role === 'admin' ? 'Master Admin Username or Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={role === 'admin' ? 'text' : 'email'}
                    required
                    placeholder={role === 'admin' ? 'Zexnitz or zexnitz@nivaspay.in' : 'name@example.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 focus:bg-white text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || (lockoutRemaining !== null && lockoutRemaining > 0)}
                className="w-full py-3 bg-emerald-950 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-medium rounded-full text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to {role === 'customer' ? 'Customer App' : role === 'owner' ? 'Owner Portal' : 'Admin Console'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200"></div>
                </div>
                <span className="relative bg-white px-2 text-stone-400 text-[10px] uppercase tracking-wider">or continue with</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium rounded-full text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
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
            </form>
          )}

          {/* ================= 2. SIGNUP FORM ================= */}
          {mode === 'signup' && role !== 'admin' && (
            <form onSubmit={handleSignup} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">
                  Mobile Number {role === 'owner' ? '(Required for Onboarding)' : '(Optional)'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required={role === 'owner'}
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-type password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-stone-600">
                  <input
                    type="checkbox"
                    required
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-950 focus:ring-0"
                  />
                  <span>
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="text-emerald-900 font-semibold underline underline-offset-2"
                    >
                      Terms of Service
                    </button>{' '}
                    and Privacy Policy.
                  </span>
                </label>

                {role === 'owner' && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-stone-600">
                    <input
                      type="checkbox"
                      required
                      checked={agreedAntiDiscrimination}
                      onChange={(e) => setAgreedAntiDiscrimination(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-950 focus:ring-0"
                    />
                    <span>
                      I solemnly agree to Fair Tenancy &amp; Anti-Discrimination standards.
                    </span>
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-950 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-medium rounded-full text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Create {role === 'customer' ? 'Customer' : 'Owner'} Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200"></div>
                </div>
                <span className="relative bg-white px-2 text-stone-400 text-[10px] uppercase tracking-wider">or sign up with</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium rounded-full text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
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
                <span>Continue with Google</span>
              </button>
            </form>
          )}

          {/* ================= 3. FORGOT / RESET PASSWORD ================= */}
          {mode === 'forgot_password' && (
            <div className="space-y-3.5 text-xs">
              {resetStage === 'request' ? (
                <form onSubmit={handleResetRequest} className="space-y-3.5">
                  <p className="text-stone-500 font-light text-xs leading-relaxed">
                    Enter the email address associated with your account. If it exists in our system, a cryptographic password recovery link will be generated.
                  </p>
                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Account Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-hidden focus:border-stone-900 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full font-medium cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full font-medium transition-colors shadow-xs cursor-pointer"
                    >
                      {isLoading ? 'Processing...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  {resetMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-[11px]">
                      {resetMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Reset Verification Token</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">New Secure Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 8 chars, 1 letter, 1 number"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 font-mono text-xs focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setResetStage('request'); setMode('login'); }}
                      className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full font-medium shadow-xs cursor-pointer"
                    >
                      {isLoading ? 'Updating...' : 'Set New Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}



        </div>
      </div>
    </div>
  );
};
