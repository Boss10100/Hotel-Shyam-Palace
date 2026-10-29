import React from 'react';
import { MapPin, Navigation, Compass, HeartHandshake, Clock, Train, Car } from 'lucide-react';

export const PilgrimageGuide: React.FC = () => {
  return (
    <section id="pilgrimage" className="py-20 bg-slate-950 text-white px-4 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <p className="text-amber-400 font-semibold text-xs uppercase tracking-widest">
            Spiritual Destination
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold font-serif-luxury text-white">
            Pandokhar Sarkar Dham Guide
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Located in Bhander tehsil, Datia district, Madhya Pradesh. Pandokhar Sarkar Dham draws millions of devotees from across India seeking divine blessings.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-serif-luxury text-white">Near Kali Maiya Mandir & Panch Akhada</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hotel Shyam Palace is located just a short 2-3 minute walk from Kali Maiya Mandir and Panch Akhada, giving yatris effortless access to morning aarti and evening darshan without transport hassles.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-serif-luxury text-white">Darshan & Special Days (Tuesday & Saturday)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Peak pilgrim congregations take place on Tuesdays, Saturdays, Shukla Paksha Ekadashi, and Purnima. We strongly suggest reserving your room in advance to secure comfortable air-conditioned lodging.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-serif-luxury text-white">Pure Satvik Hospitality</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with holy temple customs, our premises maintain a sacred satvik code. Shree H.V.M Restaurant serves fresh, pure vegetarian meals, herbal teas, and fasting thalis for vrat days.
            </p>
          </div>
        </div>

        {/* Transit & How to Reach */}
        <div className="bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-900/30 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Navigation className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-xl font-bold font-serif-luxury text-white">
                How to Reach Hotel Shyam Palace, Pandokhar
              </h3>
              <p className="text-xs text-slate-400">Distances from major transit hubs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <Train className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-slate-200">From Datia Railway Station (DAA)</p>
                <p className="text-amber-400 font-semibold text-xs mt-0.5">Approx. 45 km (~1 hr drive)</p>
                <p className="text-xs text-slate-400 mt-1">
                  Frequent auto-rickshaws, shared jeeps, and direct taxis are available outside Datia station towards Bhander/Pandokhar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <Train className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-slate-200">From Jhansi Junction (VGLJ)</p>
                <p className="text-amber-400 font-semibold text-xs mt-0.5">Approx. 60 km (~1.5 hr drive)</p>
                <p className="text-xs text-slate-400 mt-1">
                  Major Indian Railways junction with direct Rajdhani/Shatabdi trains. Private cabs and buses operate from Jhansi to Bhander-Pandokhar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <Car className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-slate-200">From Gwalior Airport / Station (GWL)</p>
                <p className="text-amber-400 font-semibold text-xs mt-0.5">Approx. 100 km (~2 hr drive)</p>
                <p className="text-xs text-slate-400 mt-1">
                  Closest operational commercial airport. Well-connected via NH44 towards Datia and State Highway to Pandokhar Sarkar Dham.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-3">
            <span>
              <strong>GPS Address:</strong> Pandokhar Sarkar Dham, Bhander, Near Kali Maiya Mandir, Panch Akhada, Pandokhar, MP 475335
            </span>
            <span className="text-amber-400 font-medium">Need taxi pickup or guidance? Call 7000354771</span>
          </div>
        </div>
      </div>
    </section>
  );
};
