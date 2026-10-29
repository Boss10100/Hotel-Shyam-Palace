import React, { useState } from 'react';
import { Booking, Room, StaffUser, HotelSettings, Payment, Invoice, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import {
  checkInExistingBooking,
  performCheckOut,
  processCancellationWithRefund,
  recordManualPayment,
} from '../../services/db';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';
import { YouPiPaymentModal } from '../common/YouPiPaymentModal';
import {
  Search,
  Filter,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle,
  XCircle,
  UserCheck,
  CreditCard,
  Printer,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  FileCheck,
  QrCode,
  MapPin,
} from 'lucide-react';

interface Props {
  bookings: Booking[];
  rooms: Room[];
  staffUser: StaffUser;
  settings: HotelSettings;
  onOpenPhoneBooking: () => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onPrintRegCard: (booking: Booking) => void;
  onPrintAdvance?: (booking: Booking, payment?: Payment) => void;
}

export const ReservationsManager: React.FC<Props> = ({
  bookings,
  rooms,
  staffUser,
  settings,
  onOpenPhoneBooking,
  onPrintInvoice,
  onPrintRegCard,
  onPrintAdvance,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Booking Modal Action State
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<'check_in' | 'check_out' | 'cancel' | 'payment' | 'details' | null>(null);

  // Check-in modal form
  const [checkInRoomId, setCheckInRoomId] = useState('');
  const [checkInPaymentAmount, setCheckInPaymentAmount] = useState(0);
  const [checkInPaymentMethod, setCheckInPaymentMethod] = useState<'cash' | 'upi' | 'youpi_pg'>('cash');
  const [checkInTxnRef, setCheckInTxnRef] = useState('');
  const [checkInKycIdType, setCheckInKycIdType] = useState('Aadhaar');
  const [checkInKycIdNumber, setCheckInKycIdNumber] = useState('');
  const [checkInGuestAddress, setCheckInGuestAddress] = useState('');

  // Check-out modal form
  const [checkOutPaymentAmount, setCheckOutPaymentAmount] = useState(0);
  const [checkOutPaymentMethod, setCheckOutPaymentMethod] = useState<'cash' | 'upi' | 'youpi_pg'>('cash');
  const [checkOutTxnRef, setCheckOutTxnRef] = useState('');

  // Cancel modal form
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDeductionOverride, setCancelDeductionOverride] = useState<number | null>(null);
  const [cancelTxnRef, setCancelTxnRef] = useState('');

  // Payment modal form
  const [manualPayAmount, setManualPayAmount] = useState(0);
  const [manualPayMethod, setManualPayMethod] = useState<'cash' | 'upi' | 'youpi_pg'>('youpi_pg');
  const [manualPayRef, setManualPayRef] = useState('');
  const [manualPayNotes, setManualPayNotes] = useState('');

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [youPiTarget, setYouPiTarget] = useState<'check_in' | 'check_out' | 'payment' | null>(null);
  const [waSentId, setWaSentId] = useState<string | null>(null);

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');
    const matchesSearch =
      !q ||
      b.guestName?.toLowerCase().includes(q) ||
      b.guestPhone?.includes(cleanQ) ||
      b.guestAddress?.toLowerCase().includes(q) ||
      b.bookingId?.toLowerCase().includes(q) ||
      b.referenceNumber?.toLowerCase().includes(q) ||
      b.assignedRoomId?.includes(q);

    return matchesStatus && matchesSearch;
  });

  const displayRooms = rooms && rooms.length > 0 ? rooms : INITIAL_ROOMS_INVENTORY;

  const getAvailableRoomsForCategory = (cat: string) => {
    return displayRooms.filter((r) => r.status === 'available' && r.category === cat);
  };

  const getWhatsAppUrlForBooking = (b: Booking) => {
    let msg = '';
    if (b.status === 'awaiting_advance' || b.status === 'new_request') {
      msg = `Jai Shree Shyam ${b.guestName} ji! Hotel Shyam Palace (Pandokhar Sarkar Dham). Regarding booking ${b.bookingId} (${b.roomCategory}, ${b.checkInDate} to ${b.checkOutDate}). Please send ₹${settings.defaultAdvanceAmount} advance via UPI to ${settings.upiId} to secure your room. Arrival cutoff: 1:00 PM. Front desk helpline: ${settings.phone}.`;
    } else if (b.status === 'confirmed') {
      msg = `Jai Shree Shyam ${b.guestName} ji! Your reservation ${b.bookingId} at Hotel Shyam Palace is CONFIRMED for ${b.roomCategory} from ${b.checkInDate} to ${b.checkOutDate}. Advance received: ₹${b.advanceAmount}. Balance due: ₹${b.balanceDue}. Arrival cutoff is 1:00 PM on check-in date. Location: near Kali Maiya Mandir & Panch Akhada, Pandokhar Dham. Contact: ${settings.phone}.`;
    } else if (b.status === 'checked_in') {
      msg = `Jai Shree Shyam ${b.guestName} ji! Welcome to Room ${b.assignedRoomId} at Hotel Shyam Palace. For room assistance or satvik food delivery from Shree H.V.M Restaurant, contact reception at ${settings.phone}. Have a blessed darshan!`;
    } else {
      msg = `Jai Shree Shyam ${b.guestName} ji! Hotel Shyam Palace (Shree H.V.M Restaurant) update regarding booking ${b.bookingId}. Status: ${b.status}. Front Desk WhatsApp: ${settings.phone}.`;
    }
    return `https://wa.me/91${b.guestPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenAction = (booking: Booking, type: 'check_in' | 'check_out' | 'cancel' | 'payment' | 'details') => {
    setActiveBooking(booking);
    setActionType(type);
    setActionError(null);

    if (type === 'check_in') {
      const match = displayRooms.find(
        (r) =>
          r.id === booking.assignedRoomId &&
          (r.status === 'available' || r.status === 'reserved')
      );
      const firstAvail = displayRooms.find(
        (r) => r.status === 'available' && r.category === booking.roomCategory
      );
      const anyAvail = displayRooms.find((r) => r.status === 'available');
      setCheckInRoomId(match ? match.id : firstAvail ? firstAvail.id : anyAvail ? anyAvail.id : '');
      setCheckInPaymentAmount(booking.balanceDue || 0);
      setCheckInGuestAddress(booking.guestAddress || '');
    } else if (type === 'check_out') {
      setCheckOutPaymentAmount(booking.balanceDue || 0);
    } else if (type === 'payment') {
      setManualPayAmount(booking.status === 'awaiting_advance' ? settings.defaultAdvanceAmount : booking.balanceDue);
    }
  };

  const executeCheckIn = async () => {
    if (!activeBooking || !checkInRoomId) {
      setActionError('Please assign an available room.');
      return;
    }
    setLoadingAction(true);
    try {
      await checkInExistingBooking(
        activeBooking.id,
        checkInRoomId,
        checkInPaymentAmount,
        checkInPaymentMethod,
        checkInTxnRef,
        staffUser,
        {
          idType: checkInKycIdType as any,
          idNumberMasked: checkInKycIdNumber || 'VERIFIED-DESK',
          guestAddress: checkInGuestAddress.trim() || activeBooking.guestAddress || '',
        }
      );

      // Auto-send WhatsApp Check-In Slip if enabled
      if (settings.whatsappAutoSendCheckIn) {
        sendAutomatedWhatsApp({
          recipientPhone: activeBooking.guestPhone,
          templateType: 'checkin_slip',
          bookingData: {
            ...activeBooking,
            assignedRoomId: checkInRoomId,
            guestAddress: checkInGuestAddress.trim() || activeBooking.guestAddress || '',
            hotelName: settings.hotelName,
            brandName: settings.brandName,
          },
        }).catch(console.warn);
      }

      const updatedBooking: Booking = {
        ...activeBooking,
        status: 'checked_in',
        assignedRoomId: checkInRoomId,
        guestAddress: checkInGuestAddress.trim() || activeBooking.guestAddress || '',
        amountPaid: (activeBooking.amountPaid || 0) + checkInPaymentAmount,
        balanceDue: Math.max(0, activeBooking.totalAmount - ((activeBooking.amountPaid || 0) + checkInPaymentAmount)),
      };

      setActionType(null);
      setActiveBooking(null);
      onPrintRegCard(updatedBooking);
    } catch (err: any) {
      setActionError(err.message || 'Check-in failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const executeCheckOut = async () => {
    if (!activeBooking) return;
    setLoadingAction(true);
    try {
      const invoice = await performCheckOut(
        activeBooking.id,
        checkOutPaymentAmount,
        checkOutPaymentMethod,
        checkOutTxnRef,
        staffUser
      );

      // Auto-send WhatsApp Invoice if enabled
      if (settings.whatsappAutoSendCheckOut) {
        sendAutomatedWhatsApp({
          recipientPhone: activeBooking.guestPhone,
          templateType: 'checkout_invoice',
          bookingData: {
            ...invoice,
            hotelName: settings.hotelName,
            brandName: settings.brandName,
            gstNumber: settings.gstNumber,
          },
        }).catch(console.warn);
      }

      setActionType(null);
      setActiveBooking(null);
      onPrintInvoice(invoice);
    } catch (err: any) {
      setActionError(err.message || 'Check-out failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const executeCancel = async () => {
    if (!activeBooking) return;
    if (!cancelReason.trim()) {
      setActionError('Please specify a mandatory cancellation reason.');
      return;
    }
    setLoadingAction(true);
    try {
      await processCancellationWithRefund(
        activeBooking.id,
        cancelReason.trim(),
        cancelDeductionOverride,
        staffUser,
        cancelTxnRef.trim() || undefined
      );
      setActionType(null);
      setActiveBooking(null);
    } catch (err: any) {
      setActionError(err.message || 'Cancellation failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const executeRecordPayment = async () => {
    if (!activeBooking) return;
    if (manualPayAmount <= 0) {
      setActionError('Payment amount must be greater than zero.');
      return;
    }
    setLoadingAction(true);
    try {
      await recordManualPayment(
        activeBooking.id,
        manualPayAmount,
        manualPayMethod,
        manualPayRef,
        manualPayNotes,
        staffUser
      );
      setActionType(null);
      setActiveBooking(null);
    } catch (err: any) {
      setActionError(err.message || 'Payment recording failed');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            Reservations & Phone Bookings Manager
          </h2>
          <p className="text-xs text-slate-400">
            Handle web booking requests, verify ₹500 advances, check-in arrivals, and manage cancellations.
          </p>
        </div>

        <button
          onClick={onOpenPhoneBooking}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer shrink-0"
        >
          <Phone className="w-4 h-4" />
          <span>+ New Phone Reservation</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'new_request', label: 'New Web Requests' },
            { id: 'awaiting_advance', label: 'Awaiting Advance' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'checked_in', label: 'In-House' },
            { id: 'checked_out', label: 'Departed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest, phone, room, ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Booking / Ref</th>
                <th className="py-3 px-4">Guest Information</th>
                <th className="py-3 px-4">Stay Dates</th>
                <th className="py-3 px-4">Room Category / Room</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Advance / Bill</th>
                <th className="py-3 px-4 text-center">Desk Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <span className="text-amber-400 font-bold block">{b.bookingId}</span>
                    <span className="text-[10px] text-slate-500">{b.referenceNumber}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{b.guestName}</span>
                    <span className="text-slate-400 font-mono">{b.guestPhone}</span>
                    {b.guestAddress && (
                      <span className="text-[10px] text-amber-300/90 flex items-center gap-1 mt-0.5 max-w-[200px] truncate" title={b.guestAddress}>
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{b.guestAddress}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 block">{b.guestCount} Guest(s)</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200 block">
                      {b.checkInDate} to {b.checkOutDate}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {b.totalNights} Night(s) • Arrival by {b.arrivalDeadline || '1:00 PM'}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-white block">{b.roomCategory}</span>
                    {b.assignedRoomId ? (
                      <span className="text-emerald-400 font-bold text-[11px] font-mono">
                        Room {b.assignedRoomId}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] italic">Unassigned</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'checked_in'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : b.status === 'confirmed'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : b.status === 'awaiting_advance'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : b.status === 'new_request'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : b.status === 'checked_out'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <span className="text-emerald-400 font-semibold block">
                        Adv: ₹{b.advanceAmount || 0}
                      </span>
                      <span className="text-slate-400 text-[10px]">Total: ₹{b.totalAmount}</span>
                      {b.balanceDue > 0 ? (
                        <span className="text-rose-400 text-[10px] font-bold block">
                          Bal: ₹{b.balanceDue}
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px]">Settled</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {/* If awaiting advance or new request */}
                      {(b.status === 'awaiting_advance' || b.status === 'new_request') && (
                        <button
                          onClick={() => handleOpenAction(b, 'payment')}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded font-semibold text-[11px] border border-amber-500/30 transition-colors cursor-pointer"
                        >
                          Verify Advance
                        </button>
                      )}

                      {/* If confirmed or arriving at desk -> Ready to Check In */}
                      {(b.status === 'confirmed' ||
                        b.status === 'awaiting_advance' ||
                        b.status === 'new_request') && (
                        <>
                          <button
                            onClick={() => handleOpenAction(b, 'check_in')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Check In
                          </button>
                          {onPrintAdvance && (b.advanceAmount || 0) > 0 && (
                            <button
                              onClick={() => onPrintAdvance(b)}
                              title="Print Advance Payment Receipt"
                              className="p-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded border border-amber-500/30 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* If checked_in -> Ready to Check Out */}
                      {b.status === 'checked_in' && (
                        <>
                          <button
                            onClick={() => handleOpenAction(b, 'check_out')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] rounded transition-colors cursor-pointer"
                          >
                            Check Out
                          </button>
                          <button
                            onClick={() => onPrintRegCard(b)}
                            title="Print Registration Card"
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Cancel action */}
                      {b.status !== 'checked_out' && b.status !== 'cancelled' && (
                        <button
                          onClick={() => handleOpenAction(b, 'cancel')}
                          title="Cancel Reservation & Calculate Refund"
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* OpenWA Direct Dispatch Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          const tpl =
                            b.status === 'checked_in'
                              ? 'checkin_slip'
                              : b.status === 'confirmed'
                              ? 'advance_receipt'
                              : 'booking_confirmation';
                          await sendAutomatedWhatsApp({
                            recipientPhone: b.guestPhone,
                            templateType: tpl,
                            bookingData: b,
                          });
                          setWaSentId(b.id);
                          setTimeout(() => setWaSentId(null), 2500);
                        }}
                        title="Dispatch Update via OpenWA Gateway"
                        className="px-2 py-1 text-emerald-400 hover:bg-emerald-950/60 border border-emerald-800/50 rounded flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{waSentId === b.id ? 'Sent!' : 'OpenWA'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No reservations matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modals */}
      {/* 1. CHECK-IN MODAL */}
      {actionType === 'check_in' && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Check-In Guest: {activeBooking.guestName}
                </h3>
                <p className="text-xs text-slate-400">Token ID: {activeBooking.bookingId} • Category: {activeBooking.roomCategory}</p>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Assign Room (Available in {activeBooking.roomCategory})
                </label>
                <select
                  value={checkInRoomId}
                  onChange={(e) => setCheckInRoomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Available Room --</option>
                  {displayRooms
                    .filter(
                      (r) =>
                        r.status === 'available' ||
                        r.id === activeBooking.assignedRoomId ||
                        (r.status === 'reserved' && r.currentBookingId === activeBooking.id)
                    )
                    .map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        Room {rm.roomNumber} ({rm.category}) — ₹{rm.baseRate}/nt
                        {rm.id === activeBooking.assignedRoomId ? ' [Pre-Assigned]' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">ID Document Type</label>
                  <select
                    value={checkInKycIdType}
                    onChange={(e) => setCheckInKycIdType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">ID Number Reference</label>
                  <input
                    type="text"
                    value={checkInKycIdNumber}
                    onChange={(e) => setCheckInKycIdNumber(e.target.value)}
                    placeholder="XXXX-VERIFIED"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Customer Full Address / City & State (As per ID)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={checkInGuestAddress}
                    onChange={(e) => setCheckInGuestAddress(e.target.value)}
                    placeholder="Enter customer residential address / city..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Collect Payment (₹)</label>
                  <input
                    type="number"
                    value={checkInPaymentAmount}
                    onChange={(e) => setCheckInPaymentAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
                  <div className="flex gap-1.5">
                    <select
                      value={checkInPaymentMethod}
                      onChange={(e) => setCheckInPaymentMethod(e.target.value as any)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="youpi_pg">YouPI-PG QR</option>
                      <option value="upi">UPI (PhonePe/GPay)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setYouPiTarget('check_in')}
                      className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={executeCheckIn}
                  disabled={loadingAction}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Complete Check-In</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CHECK-OUT MODAL */}
      {actionType === 'check_out' && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Check-Out Guest: {activeBooking.guestName}
                </h3>
                <p className="text-xs text-slate-400">
                  Room: <strong>{activeBooking.assignedRoomId}</strong> • Total Bill: ₹{activeBooking.totalAmount}
                </p>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-slate-500 block">Total Tariff</span>
                  <span className="font-bold text-white">₹{activeBooking.totalAmount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Paid So Far</span>
                  <span className="font-bold text-emerald-400">₹{activeBooking.amountPaid || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Balance Due</span>
                  <span className="font-bold text-rose-400">₹{activeBooking.balanceDue}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Final Settlement Payment (₹)</label>
                  <input
                    type="number"
                    value={checkOutPaymentAmount}
                    onChange={(e) => setCheckOutPaymentAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
                  <div className="flex gap-1.5">
                    <select
                      value={checkOutPaymentMethod}
                      onChange={(e) => setCheckOutPaymentMethod(e.target.value as any)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="youpi_pg">YouPI-PG QR</option>
                      <option value="upi">UPI (PhonePe/GPay)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setYouPiTarget('check_out')}
                      className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-amber-400/90 pt-1">
                ℹ️ Checking out will immediately issue an official sequential <strong>GST Tax Invoice</strong> and mark Room {activeBooking.assignedRoomId} as <strong>Dirty / Cleaning Needed</strong>.
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={executeCheckOut}
                  disabled={loadingAction}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-2"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Issue Invoice & Complete Checkout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CANCELLATION & REFUND MODAL */}
      {actionType === 'cancel' && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Cancel Booking: {activeBooking.guestName}
                </h3>
                <p className="text-xs text-slate-400">Token ID: {activeBooking.bookingId} • Check-in: {activeBooking.checkInDate}</p>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <p className="font-semibold text-amber-300">Configured Hotel Cancellation & Refund Rule:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <div>Advance Paid: <strong>₹{activeBooking.advanceAmount || 0}</strong></div>
                  <div>Check-in: <strong>{activeBooking.checkInDate}</strong></div>
                </div>
                <p className="text-[11px] text-slate-400">
                  • 2+ days prior: Full refund (₹500)<br />
                  • 1 day or check-in date: ₹400 refund (₹100 deduction)
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Mandatory Cancellation Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Guest canceled train trip due to personal emergency..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Deduction Amount Override (₹)
                  </label>
                  <input
                    type="number"
                    value={cancelDeductionOverride !== null ? cancelDeductionOverride : ''}
                    placeholder="Auto (₹0 or ₹100)"
                    onChange={(e) =>
                      setCancelDeductionOverride(e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Refund UPI Txn Ref (if paid now)</label>
                  <input
                    type="text"
                    value={cancelTxnRef}
                    onChange={(e) => setCancelTxnRef(e.target.value)}
                    placeholder="Optional UTR if paid"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={executeCancel}
                  disabled={loadingAction}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Confirm Cancellation & Refund</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MANUAL PAYMENT RECORD MODAL */}
      {actionType === 'payment' && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Record Payment for {activeBooking.guestName}
                </h3>
                <p className="text-xs text-slate-400">Token ID: {activeBooking.bookingId} • Current Balance: ₹{activeBooking.balanceDue}</p>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Amount to Record (₹) *</label>
                  <input
                    type="number"
                    value={manualPayAmount}
                    onChange={(e) => setManualPayAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
                  <select
                    value={manualPayMethod}
                    onChange={(e) => setManualPayMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="youpi_pg">YouPI-PG (Zero-Fee UPI QR)</option>
                    <option value="upi">UPI (PhonePe/GPay)</option>
                    <option value="cash">Cash (Counter)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Transaction Reference / UTR
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualPayRef}
                    onChange={(e) => setManualPayRef(e.target.value)}
                    placeholder="e.g. 40819283719"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setYouPiTarget('payment')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Open YouPI-PG QR</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={manualPayNotes}
                  onChange={(e) => setManualPayNotes(e.target.value)}
                  placeholder="e.g. Verified advance received in hotel UPI account"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRecordPayment}
                  disabled={loadingAction}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2"
                >
                  {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Record Payment & Update Status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouPI-PG Modal for Desk Check-In / Check-Out / Advance Verification */}
      {youPiTarget && activeBooking && (
        <YouPiPaymentModal
          amount={
            youPiTarget === 'check_in'
              ? checkInPaymentAmount || activeBooking.balanceDue || 500
              : youPiTarget === 'check_out'
              ? checkOutPaymentAmount || activeBooking.balanceDue || 500
              : manualPayAmount || settings.defaultAdvanceAmount || 500
          }
          note={`${youPiTarget.toUpperCase()} for ${activeBooking.bookingId}`}
          customerName={activeBooking.guestName}
          customerPhone={activeBooking.guestPhone}
          bookingId={activeBooking.bookingId}
          roomNumber={activeBooking.assignedRoomId || checkInRoomId}
          settings={settings}
          onClose={() => setYouPiTarget(null)}
          onSuccess={(details) => {
            if (youPiTarget === 'check_in') {
              setCheckInPaymentMethod('youpi_pg');
              setCheckInPaymentAmount(details.amount);
              setCheckInTxnRef(details.utrNumber || details.transactionRef);
            } else if (youPiTarget === 'check_out') {
              setCheckOutPaymentMethod('youpi_pg');
              setCheckOutPaymentAmount(details.amount);
              setCheckOutTxnRef(details.utrNumber || details.transactionRef);
            } else if (youPiTarget === 'payment') {
              setManualPayMethod('youpi_pg');
              setManualPayAmount(details.amount);
              setManualPayRef(details.utrNumber || details.transactionRef);
              setManualPayNotes('Verified via YouPI-PG UPI Gateway');
            }
            setYouPiTarget(null);
          }}
        />
      )}
    </div>
  );
};
