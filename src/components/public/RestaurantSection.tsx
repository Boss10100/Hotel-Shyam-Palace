import React from 'react';
import { Utensils, Coffee, Check, Clock, Sparkles, ImageOff } from 'lucide-react';
import { HotelSettings } from '../../types/hotel';
import { DEFAULT_RESTAURANT_IMAGE, DELETED_PHOTO_SENTINEL } from '../../utils/media';

interface Props {
  settings?: HotelSettings;
}

export const RestaurantSection: React.FC<Props> = ({ settings }) => {
  const rawImg = settings?.restaurantImageUrl;
  const isDeleted = rawImg === DELETED_PHOTO_SENTINEL;
  const displayImg = isDeleted
    ? null
    : rawImg && rawImg.trim() !== ''
    ? rawImg
    : DEFAULT_RESTAURANT_IMAGE;

  return (
    <section id="restaurant" className="py-20 bg-slate-900 text-white px-4 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dining & Satvik Bhojanalaya</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold font-serif-luxury text-white leading-tight">
              Shree H.V.M Restaurant <br />
              <span className="text-amber-400">& Bhojanalaya</span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
              Located on the ground floor of Hotel Shyam Palace, Shree H.V.M Restaurant offers pure vegetarian, sattvic Indian cuisine prepared with utmost devotion, cleanliness, and fresh local ingredients.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <Utensils className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Special Pilgrim Thali</p>
                  <p className="text-xs text-slate-400">
                    Dal Tadka, Shahi/Matar Paneer, seasonal dry vegetable, Tawa Rotis, fragrant basmati rice, papad, salad, and sweet gulab jamun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <Coffee className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Morning Pilgrim Breakfast & High Tea</p>
                  <p className="text-xs text-slate-400">
                    Hot Masala Poha, Aloo/Paneer Parathas with fresh curd and pickle, Puri Bhaji, and steaming ginger cardamom chai.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-amber-300 pt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Open: 7:00 AM – 11:00 PM</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-amber-400" />
                <span>Room Service for In-House Guests</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-amber-400" />
                <span>Vrat & Fasting Thalis Available</span>
              </div>
            </div>
          </div>

          {/* Right Image Showcase */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-amber-900/40 bg-slate-950 h-[420px]">
              {displayImg ? (
                <img
                  src={displayImg}
                  alt="Shree H.V.M Restaurant Satvik Indian Thali"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <ImageOff className="w-10 h-10 mb-2 text-slate-600" />
                  <p className="text-sm font-bold text-slate-400">Shree H.V.M Satvik Bhojanalaya</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 bg-slate-950/80 backdrop-blur-md p-4 rounded-xl border border-amber-500/30">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">100% Pure Vegetarian</p>
                <p className="text-sm font-bold text-white">Authentic Bundelkhandi & North Indian Satvik Flavors</p>
                <p className="text-xs text-slate-300 mt-1">Prepared fresh for devotees visiting Pandokhar Sarkar Dham.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
