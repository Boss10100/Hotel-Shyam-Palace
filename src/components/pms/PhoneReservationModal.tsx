import React, { useState } from 'react';
import { Room, StaffUser, Booking, HotelSettings, RoomCategory, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import { createPhoneReservation } from '../../services/db';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';
import { YouPiPaymentModal } from '../common/YouPiPaymentModal';
import { X, Phone, User, Calendar, CreditCard, MessageCircle, Copy, Check, Loader2, Sparkles, AlertCircle, QrCode, MapPin } from 'lucide-react';

interface Props {
  rooms: Room[];
  staffUser: StaffUser;
  settings: HotelSettings;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}

export const PhoneReservationModal: React.FC<Props> = ({
  rooms,
  staffUser,
  settings,
  onClose,
  onSuccess,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('Small AC');
  const [assignedRoomId, setAssignedRoomId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(settings.defaultAdvanceAmount || 500);
  const [advanceReceived, setAdvanceReceived] = useState(false);
  const [upiTxnRef, setUpiTxnRef] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingSource, setBookingSource] = useState<'phone' | 'whatsapp' | 'counter'>('phone');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showYouPiModal, setShowYouPiModal] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waSent, setWaSent] = useState(false);

  // Guarantee all 16 rooms are available for matching
  const displayRooms = rooms && rooms.length > 0 ? rooms : INITIAL_ROOMS_INVENTORY;

  // Available room options matching category
  const matchingRooms = displayRooms.filter((r) => r.category === roomCategory && r.status === 'available');

  const getQuotedRate = (cat: RoomCategory) => {
    if (cat === 'Deluxe') return 1600;
    if (cat === 'Small AC') return 1500;
    if (cat === 'Large Non-AC') return 1200;
    return 800;
  };

  const quotedRate = getQuotedRate(roomCategory);

  const generateWhatsAppMessage = (b: Booking) => {
    return `*HOTEL SHYAM PALACE / SHREE H.V.M HOTEL*
Pandokhar Sarkar Dham (Near Kali Maiya Mandir)
Phone / WhatsApp: ${settings.phone}

Jai Shree Shyam, ${b.guestName}!
${
  b.status === 'confirmed'
    ? '✅ Your room reservation is *CONFIRMED*.'
    : '⏳ Your booking is registered and *AWAITING ₹500 ADVANCE*.'
}

*Booking Details:*
• Token ID: ${b.bookingId} (Ref: ${b.referenceNumber})
• Guest: ${b.guestName}${b.guestAddress ? ` (${b.guestAddress})` : ''}
• Room Category: ${b.roomCategory} ${b.assignedRoomId ? `(Room ${b.assignedRoomId})` : ''}
• Check-In: ${b.checkInDate}
• Check-Out: ${b.checkOutDate} (12:00 PM)
• Total Tariff: ₹${b.totalAmount} (incl 12% GST)
• Advance Recorded: ₹${b.advanceAmount || 0}
• Balance at Check-In: ₹${b.balanceDue}

*Important Notice for Yatris:*
• Please arrive at the hotel by *1:00 PM* on your check-in date.
• Please carry an original Govt ID proof (Aadhaar / Voter ID).
• Shree H.V.M Pure Satvik Restaurant is open for breakfast, lunch & dinner.

Location: Near Kali Maiya Mandir, Panch Akhada, Pandokhar, MP 475335.
We look forward to hosting your holy pilgrimage!`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (guestName.trim().length < 3) {
      setError('Please enter a valid guest name.');
      return;
    }
    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await createPhoneReservation(
        {
          guestName: guestName.trim(),
          guestPhone: cleanPhone,
          guestAddress: guestAddress.trim() || '',
          guestCount,
          checkInDate,
          checkOutDate,
          roomCategory,
          assignedRoomId: assignedRoomId || '',
          quotedRate,
          advanceAmount,
          advanceReceived,
          upiTxnRef: upiTxnRef.trim() || '',
          specialRequests: specialRequests.trim() || '',
          bookingSource,
        },
        staffUser
      );

      setCreatedBooking(booking);
      onSuccess(booking);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {createdBooking ? (
          /* Confirmation & WhatsApp Delivery View */
          <div className="space-y-6 animate-fade-in text-xs">
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] block">
                {createdBooking.status === 'confirmed' ? 'Reservation Confirmed' : 'Reservation Created — Awaiting Advance'}
              </span>
              <h2 className="text-2xl font-bold font-serif-luxury text-white">
                Booking ID: {createdBooking.bookingId}
              </h2>
              <p className="text-slate-400">
                Logged by {createdBooking.createdByStaffName} • Ref: {createdBooking.referenceNumber}
              </p>
            </div>

            {/* Ready-to-send WhatsApp Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Ready-to-Send WhatsApp Confirmation Message
                </span>
                <button
                  onClick={() => copyToClipboard(generateWhatsAppMessage(createdBooking))}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 cursor-pointer"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={9}
                value={generateWhatsAppMessage(createdBooking)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 focus:outline-none resize-none leading-relaxed"
              />

              <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={waSending}
                  onClick={async () => {
                    setWaSending(true);
                    try {
                      await sendAutomatedWhatsApp({
                        recipientPhone: createdBooking.guestPhone,
                        templateType:
                          createdBooking.status === 'confirmed'
                            ? 'advance_receipt'
                            : 'booking_confirmation',
                        bookingData: createdBooking,
                      });
                      setWaSent(true);
                    } finally {
                      setWaSending(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  <span>
                    {waSent
                      ? `Sent via OpenWA Gateway (+91 ${createdBooking.guestPhone})`
                      : `Dispatch via OpenWA Gateway (+91 ${createdBooking.guestPhone})`}
                  </span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Phone Booking Form */
          <div>
            <div className="mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Phone className="w-4 h-4" />
                <span>Front Desk Phone & Counter Bookings</span>
              </div>
              <h2 className="text-2xl font-bold font-serif-luxury text-white">
                New Phone / WhatsApp Reservation
              </h2>
              <p className="text-xs text-slate-400">
                Standard ₹500 advance via UPI required. Guest arrival deadline: 1:00 PM on check-in date.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Reservation Source</label>
                  <select
                    value={bookingSource}
                    onChange={(e) => setBookingSource(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="phone">Telephone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="counter">Counter / Walk-in Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Guest Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Guest Full Name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Mobile Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Customer Address / City & State
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={guestAddress}
                    onChange={(e) => setGuestAddress(e.target.value)}
                    placeholder="e.g. Gwalior / Indore / Jhansi, Madhya Pradesh (Full Address)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Check-out Date *</label>
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
                  <label className="block text-slate-400 font-medium mb-1">Guest Count</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Room Category Preference</label>
                  <select
                    value={roomCategory}
                    onChange={(e) => {
                      setRoomCategory(e.target.value as RoomCategory);
                      setAssignedRoomId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Small AC">Small AC (₹1,500/night)</option>
                    <option value="Deluxe">Deluxe (₹1,600/night)</option>
                    <option value="Large Non-AC">Large Non-AC (₹1,200/night)</option>
                    <option value="Common">Common Room (₹800/night)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assign Specific Room (Optional)</label>
                  <select
                    value={assignedRoomId}
                    onChange={(e) => setAssignedRoomId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Assign Later on Arrival --</option>
                    {matchingRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advance Payment Section */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-300">Advance Payment Enforcement (₹500 Default)</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advanceReceived}
                      onChange={(e) => setAdvanceReceived(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-slate-200 font-semibold">Advance Verified as Received</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Advance Amount (₹)</label>
                    <input
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      UPI Ref # / UTR {advanceReceived && '*'}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={upiTxnRef}
                        onChange={(e) => setUpiTxnRef(e.target.value)}
                        placeholder="e.g. 428190392819"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowYouPiModal(true)}
                        title="Generate YouPI-PG Dynamic UPI QR"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>YouPI QR</span>
                      </button>
                    </div>
                  </div>
                </div>

                {!advanceReceived && (
                  <p className="text-[11px] text-amber-400/90">
                    ℹ️ Booking will be saved as <strong>Awaiting Advance</strong> until payment is verified via YouPI-PG or UTR.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Notes & Special Requests</label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Needs early morning darshan call, traveling by car from Gwalior..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Reservation...</span>
                    </>
                  ) : (
                    <span>Save Reservation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showYouPiModal && (
        <YouPiPaymentModal
          amount={advanceAmount || 500}
          note={`Advance for ${roomCategory} (${checkInDate})`}
          customerName={guestName.trim()}
          customerPhone={guestPhone.replace(/\D/g, '')}
          roomNumber={assignedRoomId}
          settings={settings}
          onClose={() => setShowYouPiModal(false)}
          onSuccess={(details) => {
            setAdvanceAmount(details.amount);
            setAdvanceReceived(true);
            setUpiTxnRef(details.utrNumber || details.transactionRef);
            setShowYouPiModal(false);
          }}
        />
      )}
    </div>
  );
};
