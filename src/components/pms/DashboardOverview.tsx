import React, { useState } from 'react';
import { Room, Booking, Payment, Refund, HotelSettings, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import {
  BedDouble,
  UserCheck,
  CalendarCheck,
  AlertCircle,
  IndianRupee,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  Wrench,
  CheckCircle2,
  PhoneCall,
  UserPlus,
} from 'lucide-react';

interface Props {
  rooms: Room[];
  bookings: Booking[];
  payments: Payment[];
  refunds: Refund[];
  settings: HotelSettings;
  onOpenWalkIn: () => void;
  onOpenPhoneBooking: () => void;
  onSelectBooking: (booking: Booking) => void;
}

export const DashboardOverview: React.FC<Props> = ({
  rooms,
  bookings,
  payments,
  refunds,
  settings,
  onOpenWalkIn,
  onOpenPhoneBooking,
  onSelectBooking,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Guarantee all 16 rooms are visible
  const displayRooms = rooms && rooms.length > 0 ? rooms : INITIAL_ROOMS_INVENTORY;

  // Room Stats
  const totalRooms = displayRooms.length;
  const availableRooms = displayRooms.filter((r) => r.status === 'available').length;
  const occupiedRooms = displayRooms.filter((r) => r.status === 'occupied').length;
  const reservedRooms = displayRooms.filter((r) => r.status === 'reserved').length;
  const maintenanceRooms = displayRooms.filter((r) => r.status === 'maintenance').length;
  const cleaningRooms = displayRooms.filter((r) => r.status === 'cleaning').length;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Bookings Stats
  const todayArrivals = bookings.filter((b) => b.checkInDate === todayStr && b.status !== 'cancelled');
  const todayDepartures = bookings.filter((b) => b.checkOutDate === todayStr && b.status === 'checked_in');
  const activeInHouse = bookings.filter((b) => b.status === 'checked_in');
  const pendingRequests = bookings.filter((b) => b.status === 'new_request');
  const awaitingAdvance = bookings.filter((b) => b.status === 'awaiting_advance');

  // Overdue check-outs (scheduled checkout was today or past, but still checked_in)
  const overdueCheckouts = bookings.filter(
    (b) => b.status === 'checked_in' && b.checkOutDate <= todayStr
  );

  // Financial calculations
  const todayPayments = payments.filter((p) => p.createdAt?.startsWith(todayStr));
  const todayTotalCollections = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const todayCashCollections = todayPayments
    .filter((p) => p.paymentMethod === 'cash')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const todayUpiCollections = todayPayments
    .filter((p) => p.paymentMethod === 'upi' || p.paymentMethod === 'youpi_pg')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalOutstandingBalance = bookings
    .filter((b) => b.status === 'checked_in' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.balanceDue || 0), 0);

  const totalRefundsProcessed = refunds
    .filter((r) => r.refundStatus === 'completed')
    .reduce((sum, r) => sum + (r.netRefundAmount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-serif-luxury text-white">Operations Overview</span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              LIVE PMS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pandokhar Sarkar Dham • Shree H.V.M Hotel and Restaurant • 16 Rooms Master Control
          </p>
        </div>

        {/* Quick Operational Triggers */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenWalkIn}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>⚡ Walk-In Check-In</span>
          </button>

          <button
            onClick={onOpenPhoneBooking}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>+ New Phone Booking</span>
          </button>
        </div>
      </div>

      {/* 4 Main Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Available Rooms */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Room Inventory</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif-luxury text-emerald-400">{availableRooms}</span>
              <span className="text-xs text-slate-400 font-medium">/ 16 Available</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span className="text-amber-400 font-semibold">{occupiedRooms} Occupied</span>
              <span>•</span>
              <span className="text-blue-400 font-semibold">{reservedRooms} Reserved</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{maintenanceRooms} Blocked</span>
            </div>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupancy Health</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif-luxury text-amber-400">{occupancyRate}%</span>
              <span className="text-xs text-slate-400">Current Occupancy</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Collections</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-serif-luxury text-white">
                ₹{todayTotalCollections.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
              <span>Cash: ₹{todayCashCollections.toLocaleString('en-IN')}</span>
              <span>•</span>
              <span className="text-amber-400">UPI: ₹{todayUpiCollections.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Outstanding & Arrivals Due */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Front Desk Activity</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif-luxury text-blue-300">
                {todayArrivals.length}
              </span>
              <span className="text-xs text-slate-400">Due In Today</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{todayDepartures.length} Out</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">₹{totalOutstandingBalance} Balance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Alert Banners (if any) */}
      {(overdueCheckouts.length > 0 || awaitingAdvance.length > 0 || pendingRequests.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingRequests.length > 0 && (
            <div className="bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-purple-200">
                <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span><strong>{pendingRequests.length}</strong> New Website Booking Request(s)</span>
              </div>
              <span className="text-[10px] text-purple-400 font-medium">Review Call Needed</span>
            </div>
          )}

          {awaitingAdvance.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-amber-200">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>{awaitingAdvance.length}</strong> Reservation(s) Awaiting ₹500 Advance</span>
              </div>
              <span className="text-[10px] text-amber-400 font-medium">Verify UPI Ref</span>
            </div>
          )}

          {overdueCheckouts.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span><strong>{overdueCheckouts.length}</strong> Overdue Checkout (&gt;12:00 PM)</span>
              </div>
              <span className="text-[10px] text-rose-400 font-medium">Contact Room</span>
            </div>
          )}
        </div>
      )}

      {/* Front Desk Daily Operations & Dham Darshan Schedule */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-900/40 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Front Desk Operations & Dham Schedule</span>
                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                  Live Peeth Timings
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pandokhar Sarkar Dham Darshan & Aarti timings, guest arrival cutoff (1:00 PM), and check-out (12:00 PM).
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/91${settings.phone}?text=${encodeURIComponent(
              'Jai Shree Shyam! Hotel Shyam Palace Front Desk active on WhatsApp.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Desk WhatsApp (7000354771)</span>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wide">Morning Aarti</span>
            <p className="font-semibold text-white">06:00 AM - 07:00 AM</p>
            <p className="text-[10px] text-slate-400">Kali Maiya Mandir & Gurudev Darshan</p>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wide">Standard Checkout</span>
            <p className="font-semibold text-white">12:00 PM Sharp</p>
            <p className="text-[10px] text-slate-400">Housekeeping turnaround starts</p>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wide">Arrival Deadline</span>
            <p className="font-semibold text-white">01:00 PM on Check-In Date</p>
            <p className="text-[10px] text-slate-400">Unconfirmed phone holds auto-release</p>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wide">Sandhya Aarti</span>
            <p className="font-semibold text-white">07:30 PM - 08:30 PM</p>
            <p className="text-[10px] text-slate-400">Deep Daan & Evening Satsang</p>
          </div>
        </div>
      </div>

      {/* Active 16 Rooms Status Matrix Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">16-Room Live Status Grid</h3>
            <p className="text-xs text-slate-400">Click any room to view assignment or housekeeping status</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Occupied
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Reserved
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Maint/Dirty
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {displayRooms.map((room) => {
            let bgClass = 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:border-emerald-500';
            if (room.status === 'occupied') bgClass = 'bg-amber-950/50 border-amber-700/60 text-amber-300 hover:border-amber-500';
            if (room.status === 'reserved') bgClass = 'bg-blue-950/50 border-blue-700/60 text-blue-300 hover:border-blue-500';
            if (room.status === 'maintenance' || room.status === 'cleaning') bgClass = 'bg-rose-950/50 border-rose-700/60 text-rose-300 hover:border-rose-500';

            return (
              <div
                key={room.id}
                onClick={() => {
                  if (room.status === 'occupied') {
                    const match = bookings.find(
                      (b) => b.assignedRoomId === room.id && b.status === 'checked_in'
                    );
                    if (match) onSelectBooking(match);
                  } else if (room.status === 'available') {
                    onOpenWalkIn();
                  }
                }}
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer ${bgClass} transition-all hover:scale-102 shadow-sm`}
                title={`Room ${room.roomNumber} (${room.category}) - ${room.status}. Click to take action.`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-white font-mono">Room {room.roomNumber}</span>
                  {room.isAc ? (
                    <span className="text-[9px] font-bold uppercase bg-slate-900/60 px-1 py-0.2 rounded text-slate-300">
                      AC
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase bg-slate-900/60 px-1 py-0.2 rounded text-slate-400">
                      Non-AC
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[11px] font-semibold truncate">{room.category}</p>
                  <p className="text-[10px] text-slate-400">₹{room.baseRate}/nt</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider capitalize">
                    {room.status === 'occupied' ? (
                      <span className="text-amber-400 truncate block">In: {room.currentGuestName || 'Guest'}</span>
                    ) : (
                      room.status
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Bookings & In-House Guests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Front Desk Activity & Reservations</h3>
            <p className="text-xs text-slate-400">Real-time database feed of walk-ins, phone bookings, and website requests</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Booking / Token</th>
                <th className="py-3 px-4">Guest Details</th>
                <th className="py-3 px-4">Room & Stay</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Paid / Balance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {bookings.slice(0, 8).map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <span className="text-amber-400 font-bold block">{b.bookingId}</span>
                    <span className="text-[10px] text-slate-500">{b.referenceNumber}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{b.guestName}</span>
                    <span className="text-slate-400">{b.guestPhone}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200 block">
                      {b.assignedRoomId ? `Room ${b.assignedRoomId}` : b.roomCategory}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {b.checkInDate} to {b.checkOutDate} ({b.totalNights} nt)
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                      {b.bookingSource?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'checked_in'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : b.status === 'confirmed'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : b.status === 'awaiting_advance'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : b.status === 'new_request'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-emerald-400 block">₹{b.amountPaid || 0}</span>
                    {b.balanceDue > 0 ? (
                      <span className="text-[10px] text-rose-400 font-semibold">Due: ₹{b.balanceDue}</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Settled</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectBooking(b)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No bookings in database yet. Click "Walk-In Check-In" to create the first guest record!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
