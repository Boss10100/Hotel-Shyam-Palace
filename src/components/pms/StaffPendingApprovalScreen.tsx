import React, { useState } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../../context/AuthContext';
import { ShieldAlert, RefreshCw, LogOut, CheckCircle2, Clock, Mail, ShieldCheck } from 'lucide-react';

interface Props {
  onBackToPublic: () => void;
}

export const StaffPendingApprovalScreen: React.FC<Props> = ({ onBackToPublic }) => {
  const { currentUser, refreshAccessStatus, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [checkedMessage, setCheckedMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setChecking(true);
    setCheckedMessage(null);
    try {
      await refreshAccessStatus();
      setCheckedMessage('Status refreshed. If Super Admin has approved, access will update automatically.');
    } catch (e) {
      setCheckedMessage('Could not verify status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onBackToPublic();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-900/40 rounded-2xl max-w-lg w-full p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-amber-950 border border-amber-800 text-amber-300 rounded-full text-xs font-mono font-semibold">
            Approval Required | अनुमति प्रतीक्षारत
          </span>
          <h2 className="text-2xl font-bold font-serif-luxury text-amber-100">
            Staff Portal Access Restricted
          </h2>
          <p className="text-sm text-slate-400">
            Hotel Shyam Palace • Pandokhar Sarkar Dham
          </p>
        </div>

        {/* User Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-3">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {currentUser?.displayName || 'Staff Applicant'}
              </p>
              <p className="text-xs text-amber-400/90 font-mono truncate">
                {currentUser?.email}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Access status: Pending Super Admin Approval</span>
          </div>
        </div>

        {/* Security Policy Explanation */}
        <div className="text-xs text-slate-300 bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 text-left space-y-2">
          <p className="font-semibold text-amber-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Hotel Security & Whitelist Policy
          </p>
          <p className="text-slate-400 leading-relaxed">
            Portal par keval Super Admin (<span className="text-amber-300 font-mono">{SUPER_ADMIN_EMAIL}</span>) dwara invite kiye gaye ya approve kiye gaye staff members hi login kar sakte hain.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Aapke login ka automated notification Super Admin ke paas bhej diya gaya hai. Super Admin ke approve karte hi aapka portal access unlock ho jayega.
          </p>
        </div>

        {checkedMessage && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 flex items-center justify-center gap-2">
            <span>{checkedMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Approval...' : 'Check Approval Status'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Return to Website</span>
          </button>
        </div>
      </div>
    </div>
  );
};
