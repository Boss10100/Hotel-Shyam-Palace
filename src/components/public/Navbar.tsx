import React, { useState } from 'react';
import { Phone, MessageCircle, Calendar, Shield, Search, Menu, X, Hotel } from 'lucide-react';
import { HotelSettings } from '../../types/hotel';

interface Props {
  settings: HotelSettings;
  onOpenBooking: () => void;
  onOpenLookup: () => void;
  onOpenPms: () => void;
}

export const Navbar: React.FC<Props> = ({ settings, onOpenBooking, onOpenLookup, onOpenPms }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const whatsappUrl = `https://wa.me/91${settings.phone}?text=${encodeURIComponent(
    'Jai Shree Shyam! I would like to enquire about room availability at Hotel Shyam Palace, Pandokhar Sarkar Dham.'
  )}`;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-amber-900/30 text-white">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900/90 to-slate-950 px-4 py-1.5 text-xs text-amber-200 border-b border-amber-800/30 flex justify-between items-center">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <span className="bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded text-[11px] border border-amber-500/30">
            Pandokhar Sarkar Dham
          </span>
          <span className="text-slate-300">
            Bhander, MP • Near Kali Maiya Mandir & Panch Akhada • Pure Satvik Stay & Dining
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-amber-300 font-medium">
          <span>Checkout: 12:00 PM</span>
          <span>•</span>
          <span>Reservation Arrival: By 1:00 PM</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.hotelName}
              className="w-11 h-11 rounded-xl object-cover shadow-lg shadow-amber-900/40 border border-amber-400/40 p-0.5 bg-amber-950 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/40 border border-amber-400/30 shrink-0">
              <Hotel className="w-6 h-6 text-slate-950" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-serif-luxury tracking-wide text-amber-100">
                {settings.hotelName}
              </span>
            </div>
            <p className="text-[11px] font-medium tracking-wider text-amber-400/90 uppercase">
              {settings.brandName}
            </p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#rooms" className="hover:text-amber-400 transition-colors">
            Rooms & Suites
          </a>
          <a href="#pilgrimage" className="hover:text-amber-400 transition-colors">
            Dham & Darshan Guide
          </a>
          <a href="#restaurant" className="hover:text-amber-400 transition-colors">
            Shree H.V.M Restaurant
          </a>
          <a href="#gallery" className="hover:text-amber-400 transition-colors text-amber-300">
            Photo Gallery
          </a>
          <a href="#policies" className="hover:text-amber-400 transition-colors">
            Policies
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Lookup Request */}
          <button
            onClick={onOpenLookup}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Track booking request status"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Track Request</span>
          </button>

          {/* WhatsApp Direct */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-emerald-400/20" />
            <span>WhatsApp (7000354771)</span>
          </a>

          {/* Request Booking */}
          <button
            onClick={onOpenBooking}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-amber-600/30 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Room</span>
          </button>

          {/* Staff Portal Link */}
          <button
            onClick={onOpenPms}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-lg transition-colors cursor-pointer ml-1"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Staff PMS</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={onOpenBooking}
            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
          >
            Book
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-950 border-b border-amber-900/40 px-4 pt-3 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${settings.phone}`}
              className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-900 text-amber-300 rounded-lg text-xs font-medium border border-slate-800"
            >
              <Phone className="w-4 h-4" />
              <span>Call Front Desk</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-950/80 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-800/60"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>

          <div className="space-y-2 text-sm font-medium text-slate-300 border-t border-slate-800 pt-3">
            <a href="#rooms" onClick={() => setMobileMenuOpen(false)} className="block py-1">Rooms & Suites</a>
            <a href="#pilgrimage" onClick={() => setMobileMenuOpen(false)} className="block py-1">Pandokhar Dham Guide</a>
            <a href="#restaurant" onClick={() => setMobileMenuOpen(false)} className="block py-1">Shree H.V.M Restaurant</a>
            <a href="#gallery" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-amber-300">Hotel & Room Gallery</a>
            <a href="#policies" onClick={() => setMobileMenuOpen(false)} className="block py-1">Policies</a>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLookup(); }}
              className="w-full py-2.5 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-amber-400" />
              Track Booking Request
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenPms(); }}
              className="w-full py-2.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              Internal PMS Front Desk Portal
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
