import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HotelSettings, Room } from '../../types/hotel';
import { Hotel, LogOut, Globe, Clock, ShieldCheck, Link2, Check, Database } from 'lucide-react';

interface Props {
  settings: HotelSettings;
  rooms: Room[];
  currentPath?: string;
  onExitPms: () => void;
  onOpenAuth?: () => void;
  onOpenMultiDb?: () => void;
}

export const PmsHeader: React.FC<Props> = ({
  settings,
  rooms,
  currentPath = '/staff-pm/overview',
  onExitPms,
  onOpenAuth,
  onOpenMultiDb,
}) => {
  const { currentUser, staffUser, role, logout } = useAuth();
  const [timeStr, setTimeStr] = useState('');
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const availableRoomsCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedRoomsCount = rooms.filter((r) => r.status === 'occupied').length;

  const roleLabel =
    role === 'super_admin'
      ? 'Owner / Super Admin'
      : role === 'receptionist'
      ? 'Front Desk Receptionist'
      : role === 'accountant'
      ? 'Accountant'
      : role === 'housekeeping'
      ? 'Housekeeping Lead'
      : 'Staff Member';

  const handleCopyCurrentLink = () => {
    const fullUrl = `${window.location.origin}${currentPath}`;
    navigator.clipboard?.writeText(fullUrl).catch(() => {});
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 px-4 sm:px-6 h-16 flex items-center justify-between shadow-md">
      {/* Brand & Live Counter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.hotelName}
              className="w-9 h-9 rounded-lg object-cover border border-amber-500/40 p-0.5 bg-slate-950 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shrink-0">
              <Hotel className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold font-serif-luxury text-amber-200 tracking-wide leading-none">
              {settings.hotelName} — PMS
            </h1>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              16 Rooms Total • {availableRoomsCount} Available • {occupiedRoomsCount} Occupied
            </p>
          </div>
        </div>

        {/* Live Route Path Indicator & Copy Button */}
        <button
          type="button"
          onClick={handleCopyCurrentLink}
          title="Click to copy direct page URL (Refresh-safe route)"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 text-[11px] text-amber-300 font-mono transition-colors cursor-pointer"
        >
          {copiedPath ? (
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <Link2 className="w-3 h-3 text-amber-400 shrink-0" />
          )}
          <span>{currentPath}</span>
        </button>

        {/* Multi-Database & Permanent Save Indicator Button */}
        {onOpenMultiDb && (
          <button
            type="button"
            onClick={onOpenMultiDb}
            title="Configure Multi-Database Sync & Run System Diagnostics (/staff-pm/settings/database)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900/80 rounded-lg border border-emerald-500/40 text-[11px] text-emerald-300 font-semibold transition-colors cursor-pointer"
          >
            <Database className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Multi-DB Active</span>
          </button>
        )}

        {/* Live IST Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>IST: {timeStr || '12:00:00 PM'}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-3">
            {/* Authenticated Staff Role Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">{roleLabel}</span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 leading-none">
                  {currentUser.displayName || staffUser?.name || 'Staff User'}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {currentUser.email}
                </span>
              </div>
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Staff'}
                  className="w-8 h-8 rounded-full border border-amber-500/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-300 font-bold text-xs">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'S'}
                </div>
              )}

              <button
                onClick={logout}
                title="Sign Out"
                className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <span>Staff Sign In</span>
          </button>
        )}

        {/* Switch to Public Site */}
        <button
          onClick={onExitPms}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          title="Switch to customer website"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Public Website</span>
        </button>
      </div>
    </header>
  );
};
