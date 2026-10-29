import React, { useState } from 'react';
import { Calendar, Users, MapPin, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { HotelSettings, RoomCategory } from '../../types/hotel';

interface Props {
  settings: HotelSettings;
  onSearch: (params: { checkIn: string; checkOut: string; guests: number; category: RoomCategory }) => void;
  onOpenBooking: () => void;
}

export const HeroSection: React.FC<Props> = ({ settings, onSearch, onOpenBooking }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(tomorrow.toISOString().split('T')[0]);
  const [guests, setGuests] = useState(2);
  const [category, setCategory] = useState<RoomCategory>('Small AC');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ checkIn, checkOut, guests, category });
  };

  const showHeroImg =
    settings.heroImageUrl &&
    settings.heroImageUrl !== '__DELETED__' &&
    settings.heroImageUrl.trim() !== '';

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center bg-slate-950 text-white overflow-hidden py-16 px-4">
      {/* Live Hero Image Layer (Synced with PMS Hotel Settings) */}
      {showHeroImg && (
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={settings.heroImageUrl}
            alt={settings.hotelName}
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/85 to-slate-950"></div>
        </div>
      )}
      {/* Background Decorative Lighting & Textures */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/30 via-slate-950/80 to-slate-950 pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-5xl mx-auto w-full text-center space-y-8 z-10">
        {/* Pilgrimage Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold tracking-wide shadow-lg shadow-amber-950/50 backdrop-blur-sm animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Shree H.V.M Hotel & Restaurant — Pandokhar Sarkar Dham</span>
        </div>

        {/* Headline */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif-luxury tracking-tight text-white leading-tight">
            Sacred Serenity & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
              Royal Pilgrim Comfort
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            Experience divine tranquility at <strong className="text-amber-300 font-semibold">{settings.hotelName}</strong>.
            Situated right at Pandokhar Sarkar Dham, near Kali Maiya Mandir & Panch Akhada. 
            Featuring 16 sanitized AC and Non-AC rooms with pure Satvik dining.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Walking distance to Pandokhar Peeth</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Pure Satvik Indian Meals</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>24/7 Power Backup & RO Water</span>
          </div>
        </div>

        {/* Quick Availability / Search Form Card */}
        <div className="max-w-4xl mx-auto bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md text-left">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-sm sm:text-base text-white">Find Room & Request Booking</span>
            </div>
            <span className="text-xs text-amber-400 font-medium bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/60">
              Advance: ₹500 • Rate: ₹800 – ₹1,600
            </span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Check-In Date</label>
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Check-Out Date</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Room Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RoomCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="Small AC">Small AC (₹1,500/night)</option>
                <option value="Deluxe">Deluxe (₹1,600/night)</option>
                <option value="Large Non-AC">Large Non-AC (₹1,200/night)</option>
                <option value="Common">Common Room (₹800/night)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="submit"
                className="w-full h-[42px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
              >
                <span>Request Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
            <span className="text-amber-400">★ Important:</span> Online submissions are requests. Front desk will confirm availability and verify the ₹500 UPI advance.
          </p>
        </div>
      </div>
    </section>
  );
};
