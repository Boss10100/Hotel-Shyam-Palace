import React, { useState } from 'react';
import { Booking, HotelSettings, Payment } from '../../types/hotel';
import { Printer, X, MessageCircle, CheckCircle, Building2, ShieldCheck, MapPin, QrCode } from 'lucide-react';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';

interface Props {
  booking: Booking;
  settings: HotelSettings;
  payment?: Payment;
  onClose: () => void;
}

export const PrintableAdvanceReceipt: React.FC<Props> = ({ booking, settings, payment, onClose }) => {
  const [sendingWa, setSendingWa] = useState(false);
  const [waSentStatus, setWaSentStatus] = useState<string | null>(null);

  const handleSendWhatsApp = async () => {
    setSendingWa(true);
    setWaSentStatus(null);
    try {
      const res = await sendAutomatedWhatsApp({
        recipientPhone: booking.guestPhone,
        templateType: 'advance_receipt',
        bookingData: {
          ...booking,
          hotelName: settings.hotelName,
          brandName: settings.brandName,
          advanceAmount: payment?.amount || booking.advanceAmount || 500,
        },
      });

      if (res.success) {
        setWaSentStatus('Advance Receipt sent to customer WhatsApp via hotel linked device (+91 7000354771)!');
      } else if (res.waUrl) {
        window.open(res.waUrl, '_blank');
        setWaSentStatus('Opened direct WhatsApp message for customer.');
      }
    } catch (err: any) {
      setWaSentStatus(`WhatsApp dispatch: ${err.message || 'Opening client link'}`);
    } finally {
      setSendingWa(false);
      setTimeout(() => setWaSentStatus(null), 5000);
    }
  };

  const advanceAmt = payment?.amount || booking.advanceAmount || 500;
  const advanceTxn = payment?.transactionRef || 'UPI-VERIFIED';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-800">Advance Payment Receipt (₹{advanceAmt})</span>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-300">
                Payment Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official Booking Advance Slip for Phone & Online Reservations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{sendingWa ? 'Sending...' : 'WhatsApp Receipt'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {waSentStatus && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 no-print">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{waSentStatus}</span>
          </div>
        )}

        {/* Printable Advance Voucher */}
        <div className="printable-area border-2 border-slate-300 p-6 rounded-xl bg-white text-slate-900 shadow-sm text-xs">
          <div className="border-b-2 border-amber-800 pb-4 mb-4 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.hotelName}
                  className="w-14 h-14 rounded-xl object-cover border border-amber-700/30 p-0.5 bg-amber-50"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-amber-800 text-amber-200 flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold font-serif-luxury text-amber-900">{settings.brandName}</h1>
                <p className="font-semibold text-slate-800 text-xs">{settings.hotelName}</p>
                <p className="text-[10px] text-slate-500">{settings.address}</p>
                <p className="text-[10px] text-slate-600">
                  GSTIN: {settings.gstNumber || '23AAACH7000B1Z8'} | WhatsApp Helpline: +91 {settings.phone}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded border border-emerald-300">
                ADVANCE PAYMENT RECEIPT
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                Token: {booking.bookingId}
              </p>
              <p className="text-[10px] text-slate-500">
                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl mb-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">Amount Received as Advance</p>
              <p className="text-2xl font-extrabold text-emerald-900 font-mono">₹{advanceAmt.toLocaleString('en-IN')}.00</p>
              <p className="text-xs text-slate-600 mt-0.5">Payment Method: UPI ({settings.upiId || '7000354771@upi'})</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-mono text-slate-700"><strong>Txn Ref:</strong> {advanceTxn}</p>
              <p className="text-emerald-700 font-bold mt-1 flex items-center justify-end gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Room Reserved & Secured</span>
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Guest Name:</span>
                <span className="font-bold text-slate-900 text-sm">{booking.guestName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Contact Number:</span>
                <span className="font-bold text-slate-900 font-mono">+91 {booking.guestPhone}</span>
              </div>
            </div>

            {booking.guestAddress && (
              <div className="border-b border-slate-200 pb-2">
                <span className="text-[10px] text-slate-500 block uppercase">Customer Address / City:</span>
                <span className="font-semibold text-slate-800">{booking.guestAddress}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Check-in Date:</span>
                <span className="font-bold text-slate-800">{booking.checkInDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Arrival Deadline:</span>
                <span className="font-bold text-amber-800">{booking.arrivalDeadline || '1:00 PM'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Reserved Room:</span>
                <span className="font-bold text-slate-800">{booking.roomCategory} (Room {booking.assignedRoomId || 'Assigned'})</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Total Stay Tariff:</span>
                <span className="font-bold text-slate-900">₹{booking.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 block font-semibold">Advance Deducted:</span>
                <span className="font-bold text-emerald-700">- ₹{advanceAmt.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-800 block font-semibold">Balance Due at Check-in:</span>
                <span className="font-bold text-amber-800">₹{(booking.totalAmount - advanceAmt).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-1">
            <p className="font-bold text-slate-800">Cancellation & Arrival Notes:</p>
            <p>• Please reach the hotel by <strong>1:00 PM</strong> on the check-in date. Contact 7000354771 if you anticipate delays.</p>
            <p>• Cancellation 2+ days before check-in qualifies for 100% advance refund (₹500). Cancellation 1 day before or on check-in date qualifies for ₹400 refund (₹100 processing deduction).</p>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-600 text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>Pandokhar Sarkar Dham, Near Kali Maiya Mandir, Bhander (M.P.)</span>
            </div>
            <div className="text-right">
              <div className="border-b border-dashed border-slate-400 h-6 w-36 ml-auto mb-1"></div>
              <p className="font-bold text-slate-800 text-[10px]">Duty Receptionist / Manager</p>
              <p className="text-[9px] text-slate-400 font-mono">Hotel Shyam Palace Desk</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
