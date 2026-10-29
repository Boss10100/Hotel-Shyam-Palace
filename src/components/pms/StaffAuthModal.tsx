import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StaffRole } from '../../types/hotel';
import { Shield, Mail, Lock, User, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  onCancel: () => void;
  onSuccess?: () => void;
}

export const StaffAuthModal: React.FC<Props> = ({ onCancel, onSuccess }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredRole, setPreferredRole] = useState<StaffRole>('receptionist');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        if (onSuccess) onSuccess();
      } else {
        if (!fullName.trim()) {
          setError('Please provide your full name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, fullName.trim(), preferredRole);
        setSignupSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Authentication failed. Please verify credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please check your credentials or create a new staff account.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-fade-in">
        {/* Top Header */}
        <div className="text-center space-y-2 mb-6 border-b border-slate-800 pb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 mx-auto flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-900/40 border border-amber-400/40">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-serif-luxury text-amber-100">
            Staff & Front Desk Portal
          </h2>
          <p className="text-xs text-slate-400">
            Hotel Shyam Palace (Shree H.V.M Hotel and Restaurant) • Pandokhar Sarkar Dham
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            New Staff Sign Up
          </button>
        </div>

        {/* Error / Success Banners */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {signupSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Account registered successfully! Logging you into the PMS...</span>
          </div>
        )}

        {/* 1-Click Google Sign In */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition-colors shadow cursor-pointer disabled:opacity-50"
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

          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 border-t border-slate-800"></div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">
              or with email
            </span>
            <div className="flex-1 border-t border-slate-800"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs">
            {mode === 'signup' && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Staff Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. desk@shyampalace.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">Staff Department / Role</label>
                <select
                  value={preferredRole}
                  onChange={(e) => setPreferredRole(e.target.value as StaffRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="receptionist">Front Desk Receptionist (Check-in, Phone Bookings)</option>
                  <option value="accountant">Accountant (Invoices, Ledgers, Reports)</option>
                  <option value="housekeeping">Housekeeping Supervisor (Room Cleaning Status)</option>
                  <option value="admin">Operations Admin</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'signin' ? (
                <span>Sign In to PMS</span>
              ) : (
                <span>Register Staff Account</span>
              )}
            </button>
          </form>
        </div>

        {/* Security & Owner Notice */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <p className="flex items-center gap-1.5 text-amber-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Owner Account: shyambhai01011@gmail.com</span>
          </p>
          <p className="text-[10px] text-slate-500">
            Signing in with shyambhai01011@gmail.com automatically grants Master Super Admin / Owner privileges with complete financial control.
          </p>
        </div>

        {/* Return to Public Website */}
        <div className="mt-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>
      </div>
    </div>
  );
};
