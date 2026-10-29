import React, { useState } from 'react';
import { Booking } from '../../types/hotel';
import { Search, X, CheckCircle, Clock, AlertTriangle, Calendar, Phone, MapPin } from 'lucide-react';

interface Props {
  bookings: Booking[];
  onClose: () => void;
}

export const BookingLookupModal: React.FC<Props> = ({ bookings, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<Booking | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    const cleanPhone = term.replace(/\D/g, '');

    const found = bookings.find((b) => {
      const matchRef = b.referenceNumber?.toLowerCase() === term;
      const matchId = b.bookingId?.toLowerCase() === term;
      const matchPhone = cleanPhone && b.guestPhone?.replace(/\D/g, '').includes(cleanPhone);
      return matchRef || matchId || matchPhone;
    });

    setResult(found || null);
    setSearched(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-semibold">Confirmed Booking</span>;
      case 'checked_in':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-full text-xs font-semibold">Checked-In (Active Stay)</span>;
      case 'awaiting_advance':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-semibold">Awaiting ₹500 Advance</span>;
      case 'new_request':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-full text-xs font-semibold">Request Received (Under Review)</span>;
      case 'checked_out':
        return <span className="bg-slate-500/20 text-slate-300 border border-slate-500/40 px-2.5 py-1 rounded-full text-xs font-semibold">Checked-Out (Completed)</span>;
      case 'cancelled':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full text-xs font-semibold">Cancelled</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full text-xs font-semibold capitalize">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 space-y-1">
          <h2 className="text-2xl font-bold font-serif-luxury text-white">
            Track Booking or Request
          </h2>
          <p className="text-xs text-slate-400">
            Enter your Request Reference (e.g. REQ-123456), Token ID (e.g. HSP-123456), or 10-digit Mobile Number.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. REQ-94812 or 9876543210"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {searched && (
          <div>
            {result ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">Reference #</span>
                    <span className="text-base font-bold text-amber-300 font-mono">{result.referenceNumber}</span>
                  </div>
                  <div>{getStatusBadge(result.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Primary Guest:</span>
                    <span className="font-semibold text-slate-200">{result.guestName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Room Category:</span>
                    <span className="font-semibold text-slate-200">{result.roomCategory}</span>
                  </div>
                  {result.guestAddress && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Customer Address:</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{result.guestAddress}</span>
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Check-in:</span>
                    <span className="font-semibold text-slate-200">{result.checkInDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Check-out:</span>
                    <span className="font-semibold text-slate-200">{result.checkOutDate} (12:00 PM)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Advance Recorded:</span>
                    <span className="font-semibold text-emerald-400">₹{result.advanceAmount || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estimated Bill:</span>
                    <span className="font-semibold text-slate-200">₹{result.totalAmount} (incl GST)</span>
                  </div>
                </div>

                {result.assignedRoomId && (
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                    <span className="text-slate-400">Allocated Room:</span>
                    <span className="font-bold text-amber-400 text-sm">Room {result.assignedRoomId}</span>
                  </div>
                )}

                <div className="bg-amber-950/30 border border-amber-900/40 p-3 rounded-lg text-[11px] text-amber-200/90 space-y-1">
                  <p className="font-semibold">Guest Notice:</p>
                  <p>• Arrival deadline on check-in date is <strong>1:00 PM</strong>.</p>
                  <p>• For queries or advance verification, call or WhatsApp front desk at <strong>7000354771</strong>.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">No matching booking record found</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Please verify the reference code or phone number. If you booked via telephone, our team may still be recording your details.
                </p>
                <p className="text-xs text-amber-400 font-medium pt-2">
                  Call Front Desk: 7000354771
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
