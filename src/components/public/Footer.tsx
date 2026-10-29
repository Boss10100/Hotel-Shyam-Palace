import React from 'react';
import { HotelSettings } from '../../types/hotel';
import { Phone, Mail, MapPin, Shield, Clock, IndianRupee } from 'lucide-react';

interface Props {
  settings: HotelSettings;
  onOpenPms: () => void;
}

export const Footer: React.FC<Props> = ({ settings, onOpenPms }) => {
  return (
    <footer id="policies" className="bg-slate-950 text-white border-t border-amber-900/30 pt-16 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.hotelName}
                  className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 p-0.5 bg-amber-950 shrink-0"
                />
              )}
              <div>
                <h3 className="text-xl font-bold font-serif-luxury text-amber-200">
                  {settings.hotelName}
                </h3>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
                  {settings.brandName}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official guest accommodations and restaurant at Pandokhar Sarkar Dham Peeth. 
              Providing pure satvik dining and clean AC / Non-AC rooms for visiting yatris.
            </p>
            <div className="text-[11px] font-mono text-slate-400 space-y-0.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <p><strong>GSTIN:</strong> {settings.gstNumber || '23AAACH7000B1Z8'}</p>
              {settings.fssaiNumber && <p><strong>FSSAI:</strong> {settings.fssaiNumber}</p>}
            </div>
            <div className="pt-2">
              <button
                onClick={onOpenPms}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-800/60 text-amber-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Staff & Admin PMS Portal</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Contact Front Desk</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`tel:${settings.phone}`} className="hover:text-amber-300 transition-colors">
                  +91 {settings.phone} (Phone & WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-amber-300 transition-colors">
                  {settings.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Key Timings & Business Rules */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Hotel Operational Rules</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Check-Out Time:</strong> {settings.defaultCheckoutTime}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Arrival Deadline:</strong> {settings.defaultArrivalDeadline}</span>
              </li>
              <li className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Standard Advance:</strong> ₹{settings.defaultAdvanceAmount} (via UPI)</span>
              </li>
              <li className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Applicable GST:</strong> {settings.defaultGstRate}% Tax</span>
              </li>
            </ul>
          </div>

          {/* Cancellation & Refund Policy */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Cancellation Policy</h4>
            <div className="text-xs text-slate-400 space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <p>
                • <strong>2 or more days prior:</strong> Full ₹500 advance refunded.
              </p>
              <p>
                • <strong>1 day prior or check-in date:</strong> ₹400 refunded (₹100 deduction).
              </p>
              <p className="text-[11px] text-amber-400/90 pt-1">
                All cancellations processed through authorized front desk ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} {settings.hotelName} / {settings.brandName}. All rights reserved.</p>
          <p className="text-[11px]">Pandokhar Sarkar Dham, Datia, Madhya Pradesh 475335</p>
        </div>
      </div>
    </footer>
  );
};
