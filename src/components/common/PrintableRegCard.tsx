import React, { useState } from 'react';
import { Booking, HotelSettings } from '../../types/hotel';
import { Printer, X, MessageCircle, CheckCircle, Building2, ShieldCheck, UserCheck } from 'lucide-react';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';

interface Props {
  booking: Booking;
  settings: HotelSettings;
  onClose: () => void;
}

export const PrintableRegCard: React.FC<Props> = ({ booking, settings, onClose }) => {
  const [sendingWa, setSendingWa] = useState(false);
  const [waSentStatus, setWaSentStatus] = useState<string | null>(null);

  const handleSendWhatsApp = async () => {
    setSendingWa(true);
    setWaSentStatus(null);
    try {
      const res = await sendAutomatedWhatsApp({
        recipientPhone: booking.guestPhone,
        templateType: 'checkin_slip',
        bookingData: {
          ...booking,
          hotelName: settings.hotelName,
          brandName: settings.brandName,
        },
      });

      if (res.success) {
        setWaSentStatus('Check-in Slip sent to customer WhatsApp via hotel linked device (+91 7000354771)!');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-auto">
        {/* Modal Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-200 pb-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-800">Guest Registration Card (GRC) & Check-in Slip</span>
              <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-300">
                Official Check-in Record
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified Front Desk Arrival Record with Guest KYC, Room Assignment & Policy Agreement.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{sendingWa ? 'Sending...' : 'WhatsApp to Guest'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Slip</span>
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

        {/* Printable GRC Document */}
        <div className="printable-area border-2 border-slate-300 p-6 sm:p-8 rounded-xl bg-white text-slate-900 shadow-sm text-xs">
          {/* Header */}
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
                <p className="text-[10px] text-slate-500 max-w-md">{settings.address}</p>
                <p className="text-[10px] text-slate-600">
                  GSTIN: {settings.gstNumber || '23AAACH7000B1Z8'} | Helpline / WhatsApp: +91 {settings.phone}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-slate-900 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded">
                GUEST REGISTRATION CARD (GRC)
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                Ref: {booking.bookingId}
              </p>
              <p className="text-[10px] text-slate-500">
                Check-in Date: {booking.checkInDate}
              </p>
            </div>
          </div>

          {/* Key Allocation Banner */}
          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl mb-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-900 tracking-wide">Assigned Room & Status</p>
              <p className="text-xl font-extrabold text-amber-900 font-serif-luxury">
                Room {booking.assignedRoomId || 'Allocated'}
              </p>
              <p className="text-xs text-slate-700 font-medium">Category: {booking.roomCategory}</p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-md border border-emerald-300">
                <UserCheck className="w-3 h-3" />
                <span>CHECKED IN & VERIFIED</span>
              </span>
              <p className="text-[10px] text-slate-500">
                Arrival: {new Date(booking.actualCheckInTime || booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Guest Particulars Table */}
          <div className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50 space-y-3">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-2.5">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Primary Guest Full Name</p>
                <p className="text-sm font-bold text-slate-900">{booking.guestName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Contact Mobile</p>
                <p className="text-sm font-bold text-slate-900 font-mono">+91 {booking.guestPhone}</p>
              </div>
            </div>

            {booking.guestAddress && (
              <div className="border-b border-slate-200 pb-2.5">
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Customer Residential Address / City & State</p>
                <p className="font-semibold text-slate-800">{booking.guestAddress}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2.5">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Check-in Date & Time</p>
                <p className="font-semibold text-slate-800">{booking.checkInDate}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Check-out Date & Time</p>
                <p className="font-semibold text-slate-800">{booking.checkOutDate} ({settings.defaultCheckoutTime || '12:00 PM'})</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Total Stay & Pax</p>
                <p className="font-bold text-slate-900">{booking.totalNights} Night(s) / {booking.guestCount} Guest(s)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Govt ID Type</p>
                <p className="font-semibold text-slate-800">{booking.kycDocType || 'Govt Photo ID (Aadhaar/Voter)'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">KYC Verification Record</p>
                <p className="font-mono font-semibold text-slate-800">
                  {booking.kycDocNumberMasked || 'Verified at Front Desk'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment & Charges Snapshot */}
          <div className="grid grid-cols-4 gap-3 bg-slate-100 p-3.5 rounded-xl border border-slate-300 text-center mb-4">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Daily Tariff</p>
              <p className="text-xs font-bold text-slate-900">₹{booking.quotedRate.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Total Stay Bill (12% GST)</p>
              <p className="text-xs font-bold text-slate-900">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-700 font-medium">Amount Paid So Far</p>
              <p className="text-xs font-bold text-emerald-700">₹{booking.amountPaid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-rose-700 font-medium">Balance at Checkout</p>
              <p className="text-xs font-bold text-rose-700">₹{booking.balanceDue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Guest Undertaking & Policies */}
          <div className="text-[10px] text-slate-600 mb-6 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="font-bold text-slate-800">Guest Undertaking & Sanctum Code:</p>
            <p>1. I confirm that all details provided are accurate and that I will abide by the standard check-out time of {settings.defaultCheckoutTime || '12:00 PM'}.</p>
            <p>2. I acknowledge that Hotel Shyam Palace is located in sacred Pandokhar Sarkar Dham. Consumption of alcohol, tobacco, non-vegetarian food, or gambling is strictly prohibited on hotel premises.</p>
            <p>3. Hotel management is not liable for loss of unattended cash or precious ornaments.</p>
          </div>

          {/* Dual Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-3 border-t border-slate-300 text-center">
            <div>
              <div className="border-b border-dashed border-slate-400 h-8 mb-1.5 w-44 mx-auto"></div>
              <p className="font-bold text-slate-800 text-[11px]">Guest Signature</p>
              <p className="text-[9px] text-slate-400">Agreed to Terms & Rates</p>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 h-8 mb-1.5 w-44 mx-auto"></div>
              <p className="font-bold text-slate-800 text-[11px]">Reception Desk / Duty Staff</p>
              <p className="text-[9px] text-slate-500 font-mono">Verified by: {booking.createdByStaffName || 'Front Desk'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
