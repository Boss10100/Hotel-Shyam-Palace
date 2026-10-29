import React, { useState } from 'react';
import { RoomCategory, Booking, HotelSettings, DEFAULT_HOTEL_SETTINGS } from '../../types/hotel';
import { createPublicBookingRequest } from '../../services/db';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';
import { YouPiPaymentModal } from '../common/YouPiPaymentModal';
import {
  X,
  CheckCircle,
  AlertCircle,
  Phone,
  User,
  Loader2,
  Sparkles,
  QrCode,
  MessageCircle,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

interface Props {
  initialCategory?: RoomCategory;
  settings?: HotelSettings;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}

export const PublicBookingModal: React.FC<Props> = ({
  initialCategory = 'Small AC',
  settings = DEFAULT_HOTEL_SETTINGS,
  onClose,
  onSuccess,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [guestCount, setGuestCount] = useState(2);
  const [roomCategory, setRoomCategory] = useState<RoomCategory>(initialCategory);
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // YouPI-PG Instant ₹500 Advance Checkout Modal State
  const [showYouPiModal, setShowYouPiModal] = useState(false);

  // OpenWA Dispatch Feedback State
  const [waDispatching, setWaDispatching] = useState(false);
  const [waDispatched, setWaDispatched] = useState(false);

  const validateForm = (): string | null => {
    if (guestName.trim().length < 3) {
      return 'Please enter a valid guest full name (at least 3 characters).';
    }
    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return 'Please enter a valid 10-digit Indian mobile number.';
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      return 'Check-out date must be after check-in date.';
    }
    return null;
  };

  const submitBookingToFirestore = async (advanceDetails?: {
    advancePaid: number;
    paymentTxnRef: string;
    paymentMethod: 'youpi_pg';
  }) => {
    const cleanPhone = guestPhone.replace(/\D/g, '');
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createPublicBookingRequest({
        guestName: guestName.trim(),
        guestPhone: cleanPhone,
        guestEmail: guestEmail.trim() || '',
        guestAddress: guestAddress.trim() || '',
        checkInDate,
        checkOutDate,
        guestCount,
        roomCategory,
        specialRequests: specialRequests.trim() || '',
        advancePaid: advanceDetails?.advancePaid || 0,
        paymentTxnRef: advanceDetails?.paymentTxnRef || '',
        paymentMethod: advanceDetails?.paymentMethod,
      });

      setConfirmedBooking(booking);
      onSuccess(booking);
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      setError(
        err.message || 'Failed to submit booking request. Please try calling 7000354771 directly.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequestOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    await submitBookingToFirestore();
  };

  const handleOpenYouPiAdvance = () => {
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setError(null);
    setShowYouPiModal(true);
  };

  const handleSendOpenWaReceipt = async () => {
    if (!confirmedBooking) return;
    setWaDispatching(true);
    try {
      await sendAutomatedWhatsApp({
        recipientPhone: confirmedBooking.guestPhone,
        templateType:
          confirmedBooking.status === 'confirmed' ? 'advance_receipt' : 'booking_confirmation',
        bookingData: confirmedBooking,
      });
      setWaDispatched(true);
    } catch (e) {
      console.warn('OpenWA dispatch warning:', e);
    } finally {
      setWaDispatching(false);
    }
  };

  const advanceAmt = settings.defaultAdvanceAmount || 500;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {confirmedBooking ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold uppercase tracking-wider">
                {confirmedBooking.status === 'confirmed'
                  ? '₹500 Advance Verified via YouPI-PG • Room Confirmed'
                  : 'Booking Request Submitted'}
              </span>
              <h3 className="text-2xl font-bold font-serif-luxury text-white">
                {confirmedBooking.status === 'confirmed'
                  ? 'Reservation Confirmed!'
                  : 'Booking Request Submitted!'}
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Jai Shree Shyam, <strong className="text-amber-400">{confirmedBooking.guestName}</strong>.{' '}
                {confirmedBooking.status === 'confirmed'
                  ? `Your ₹${confirmedBooking.advanceAmount} advance has been verified and your ${confirmedBooking.roomCategory} reservation is confirmed.`
                  : 'Your request has been forwarded to our front desk team.'}
              </p>
            </div>

            {/* Request Reference Badge */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 max-w-sm mx-auto space-y-1">
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest block">
                Booking Token & Reference
              </span>
              <p className="text-2xl font-bold font-mono text-white tracking-wider">
                {confirmedBooking.bookingId}
              </p>
              <p className="text-xs text-slate-400">
                Ref: {confirmedBooking.referenceNumber} • Paid: ₹{confirmedBooking.amountPaid} | Balance: ₹{confirmedBooking.balanceDue}
              </p>
            </div>

            {/* Next Steps Reminder Notice */}
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 text-left text-xs text-amber-200/90 space-y-2">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Important Arrival & Pilgrim Guidelines
              </p>
              <p>
                1. Automated WhatsApp notification has been queued via <strong>OpenWA Gateway</strong> to{' '}
                <strong className="text-white">+91 {confirmedBooking.guestPhone}</strong>.
              </p>
              <p>
                2. <strong>Guest Arrival Notice:</strong> On your check-in date ({confirmedBooking.checkInDate}), please arrive by <strong>1:00 PM</strong> with original Aadhaar / Govt ID.
              </p>
              <p>
                3. Hotel Helpline: <strong>{settings.phone || '7000354771'}</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleSendOpenWaReceipt}
                disabled={waDispatching}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {waDispatching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                <span>
                  {waDispatched
                    ? 'Sent via OpenWA Gateway!'
                    : 'Resend WhatsApp Receipt (OpenWA)'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Request Form */
          <div>
            <div className="mb-6 space-y-1">
              <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <span>Hotel Shyam Palace • YouPI-PG Enabled</span>
              </div>
              <h2 className="text-2xl font-bold font-serif-luxury text-white">
                Book Room or Pay ₹{advanceAmt} Advance
              </h2>
              <p className="text-xs text-slate-400">
                Pay ₹{advanceAmt} advance instantly via zero-fee YouPI-PG UPI QR for immediate confirmation, or submit an inquiry request.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequestOnly} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Primary Guest Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Shyam Sundar Sharma"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Mobile Number (WhatsApp) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    value={checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={checkInDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Guests *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preferred Room Category</label>
                  <select
                    value={roomCategory}
                    onChange={(e) => setRoomCategory(e.target.value as RoomCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Small AC">Small AC (₹1,500/night)</option>
                    <option value="Deluxe">Deluxe (₹1,600/night)</option>
                    <option value="Large Non-AC">Large Non-AC (₹1,200/night)</option>
                    <option value="Common">Common Room (₹800/night)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Your City / Full Residential Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={guestAddress}
                    onChange={(e) => setGuestAddress(e.target.value)}
                    placeholder="e.g. House No. 12, Rajwada, Indore / Bhopal, Madhya Pradesh"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Special Requests / Expected Arrival Time</label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Arriving from Jhansi around 11:00 AM; require ground floor if available..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* YouPI-PG Instant Advance Banner */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-700/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Instant Room Confirmation via YouPI-PG
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700">
                    0% Gateway Fee • NPCI UPI
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Pay the <strong>₹{advanceAmt} advance</strong> right now via UPI QR (GPay / PhonePe / Paytm) to immediately confirm your room and receive an automated OpenWA receipt.
                </p>
                <button
                  type="button"
                  onClick={handleOpenYouPiAdvance}
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer text-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pay ₹{advanceAmt} Advance Instantly via YouPI-PG QR</span>
                </button>
              </div>

              <div className="pt-2 flex flex-wrap justify-between items-center gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 font-bold rounded-xl flex items-center gap-2 border border-slate-700 hover:border-amber-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Request Without Advance</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* YouPI-PG Dynamic UPI QR Checkout Modal */}
      {showYouPiModal && (
        <YouPiPaymentModal
          amount={advanceAmt}
          note={`Advance for ${roomCategory} (${checkInDate})`}
          customerName={guestName.trim()}
          customerPhone={guestPhone.replace(/\D/g, '')}
          settings={settings}
          onClose={() => setShowYouPiModal(false)}
          onSuccess={async (paymentDetails) => {
            setShowYouPiModal(false);
            await submitBookingToFirestore({
              advancePaid: paymentDetails.amount,
              paymentTxnRef: paymentDetails.utrNumber || paymentDetails.transactionRef,
              paymentMethod: 'youpi_pg',
            });
          }}
        />
      )}
    </div>
  );
};
