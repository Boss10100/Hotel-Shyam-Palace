import React, { useState } from 'react';
import { Room, RoomCategory, HotelSettings, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import { resolveRoomPhoto, DEFAULT_CATEGORY_IMAGES, DELETED_PHOTO_SENTINEL } from '../../utils/media';
import { Check, ArrowRight, ImageOff, Sparkles, BedDouble } from 'lucide-react';

interface Props {
  rooms?: Room[];
  settings?: HotelSettings;
  onSelectCategory: (category: RoomCategory) => void;
}

interface RoomCardData {
  category: RoomCategory;
  price: number;
  roomsCount: number;
  roomNumbers: string[];
  capacity: string;
  isAc: boolean;
  defaultImage: string;
  description: string;
  amenities: string[];
  badge?: string;
}

const ROOM_CATEGORIES: RoomCardData[] = [
  {
    category: 'Deluxe',
    price: 1600,
    roomsCount: 4,
    roomNumbers: ['205', '207', '208', '210'],
    capacity: '2 - 3 Adults',
    isAc: true,
    defaultImage: DEFAULT_CATEGORY_IMAGES['Deluxe'],
    description:
      'Our premier category offering royal comfort with king-size bedding, split AC, premium linen, and tranquil temple views.',
    amenities: [
      'Split Air Conditioning',
      'Attached Modern Bathroom',
      'Geyser / 24/7 Hot Water',
      'Daily Housekeeping',
      'Temple View Balcony',
      'Pure RO Water',
    ],
    badge: 'Guest Favorite',
  },
  {
    category: 'Small AC',
    price: 1500,
    roomsCount: 6,
    roomNumbers: ['101', '102', '103', '104', '201', '203'],
    capacity: '2 Adults',
    isAc: true,
    defaultImage: DEFAULT_CATEGORY_IMAGES['Small AC'],
    description:
      'Cozy and well-appointed air-conditioned rooms designed for restful sleep after a day of prayers and darshan.',
    amenities: [
      'Split Air Conditioning',
      'Attached Clean Bathroom',
      'Comfort Double Bed',
      '24/7 Power Backup',
      'Satvik Room Dining',
    ],
    badge: 'Popular',
  },
  {
    category: 'Large Non-AC',
    price: 1200,
    roomsCount: 4,
    roomNumbers: ['202', '206', '209', '211'],
    capacity: '2 - 4 Adults',
    isAc: false,
    defaultImage: DEFAULT_CATEGORY_IMAGES['Large Non-AC'],
    description:
      'Spacious family layout with excellent cross-ventilation, high-speed ceiling fans, and comfortable sleeping arrangements.',
    amenities: [
      'Spacious Family Layout',
      'High-Speed Fans',
      'Attached Bathroom',
      'Continuous Water Supply',
      'Luggage Storage Area',
    ],
  },
  {
    category: 'Common',
    price: 800,
    roomsCount: 2,
    roomNumbers: ['105', '204'],
    capacity: '1 - 2 Adults',
    isAc: false,
    defaultImage: DEFAULT_CATEGORY_IMAGES['Common'],
    description:
      'Affordable, clean, and peaceful lodging option for pilgrims seeking simple accommodations close to the dham.',
    amenities: [
      'Clean Beds & Blankets',
      'Standard Washroom Access',
      'Clean RO Drinking Water',
      'Secure Entry',
    ],
    badge: 'Best Value',
  },
];

export const RoomsGallery: React.FC<Props> = ({ rooms, settings, onSelectCategory }) => {
  const [filter, setFilter] = useState<'all' | 'ac' | 'non-ac'>('all');
  const [displayMode, setDisplayMode] = useState<'categories' | 'individual'>('categories');

  const liveRooms = rooms && rooms.length > 0 ? rooms : (INITIAL_ROOMS_INVENTORY as Room[]);

  const filteredCategories = ROOM_CATEGORIES.filter((r) => {
    if (filter === 'ac') return r.isAc;
    if (filter === 'non-ac') return !r.isAc;
    return true;
  });

  const filteredIndividualRooms = liveRooms.filter((r) => {
    if (filter === 'ac') return r.isAc;
    if (filter === 'non-ac') return !r.isAc;
    return true;
  });

  const getCategoryLiveImage = (cat: RoomCategory, fallback: string): string | null => {
    const fromSettings = settings?.categoryImages?.[cat];
    if (fromSettings === DELETED_PHOTO_SENTINEL) return null;
    if (fromSettings && fromSettings.trim() !== '') return fromSettings;

    // Also check if any room in this category has a custom photo
    const customRoom = liveRooms.find(
      (rm) =>
        rm.category === cat &&
        rm.photoUrl &&
        rm.photoUrl !== DELETED_PHOTO_SENTINEL &&
        rm.photoUrl.trim() !== ''
    );
    if (customRoom?.photoUrl) return customRoom.photoUrl;

    return fallback;
  };

  return (
    <section id="rooms" className="py-20 bg-slate-900 text-white px-4 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <p className="text-amber-400 font-semibold text-xs uppercase tracking-widest">
            Hotel Room Inventory (16 Rooms Total • Rooms 101–211)
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold font-serif-luxury text-white">
            Accommodations & Daily Rates
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            All rooms are meticulously maintained and sanitized. Rates include basic amenities, 24/7 power backup, pure RO water, and access to Shree H.V.M Restaurant.
          </p>

          {/* View Mode & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setDisplayMode('categories')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'categories'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4 Room Categories
              </button>
              <button
                onClick={() => setDisplayMode('individual')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  displayMode === 'individual'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BedDouble className="w-3.5 h-3.5" />
                <span>All 16 Rooms (101–211)</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All (16)
              </button>
              <button
                onClick={() => setFilter('ac')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'ac'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                AC Rooms (10)
              </button>
              <button
                onClick={() => setFilter('non-ac')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'non-ac'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Non-AC (6)
              </button>
            </div>
          </div>
        </div>

        {displayMode === 'categories' ? (
          /* 4 Room Categories Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCategories.map((room) => {
              const liveImg = getCategoryLiveImage(room.category, room.defaultImage);
              const availableInCat = liveRooms.filter(
                (rm) => rm.category === room.category && rm.status === 'available'
              ).length;

              return (
                <div
                  key={room.category}
                  className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/50 transition-all duration-300 flex flex-col group shadow-xl"
                >
                  {/* Image & Price Overlay */}
                  <div className="relative h-52 overflow-hidden bg-slate-900">
                    {liveImg ? (
                      <img
                        src={liveImg}
                        alt={room.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                        <ImageOff className="w-8 h-8 mb-1 text-slate-600" />
                        <span className="text-xs font-semibold text-slate-400">{room.category}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30"></div>

                    {room.badge && (
                      <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow">
                        {room.badge}
                      </span>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-serif-luxury text-amber-300">
                            ₹{room.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-300">/ night</span>
                        </div>
                        <p className="text-[10px] text-slate-400">GST 12% extra as applicable</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/50">
                        {availableInCat}/{room.roomsCount} Free
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold font-serif-luxury text-white">
                          {room.category}
                        </h3>
                        <span className="text-xs text-amber-400 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                          {room.roomsCount} Rooms
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {room.description}
                      </p>

                      <div className="text-[11px] text-slate-400 mb-3 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Room Numbers:</span>
                        {room.roomNumbers.join(', ')}
                      </div>

                      {/* Amenities */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        {room.amenities.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card CTA */}
                    <button
                      onClick={() => onSelectCategory(room.category)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 hover:border-amber-500 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                    >
                      <span>Book / Pay ₹500 Advance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* All 16 Individual Rooms (101–211) Grid with Live Custom Photos */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredIndividualRooms.map((rm) => {
              const photoInfo = resolveRoomPhoto(rm.photoUrl, rm.category, settings?.categoryImages);
              const photoSrc = !photoInfo.isDeleted ? photoInfo.url : '';
              const isAvailable = rm.status === 'available';

              return (
                <div
                  key={rm.id}
                  className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col group shadow-lg"
                >
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={`Room ${rm.roomNumber}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                        <ImageOff className="w-7 h-7 mb-1 text-slate-600" />
                        <span className="text-[11px] text-slate-400">Room {rm.roomNumber}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30"></div>

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/90 border border-slate-700 text-white font-mono font-bold text-xs">
                        Room {rm.roomNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-slate-950 font-bold text-[10px]">
                        Floor {rm.floor}
                      </span>
                    </div>

                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        isAvailable
                          ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/50'
                          : 'bg-slate-900/90 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isAvailable ? 'Available' : rm.status}
                    </span>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-white">{rm.category}</span>
                      <span className="text-base font-bold font-mono text-amber-300">
                        ₹{rm.baseRate}/nt
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {rm.description ||
                        `${rm.category} room on Floor ${rm.floor} with ${
                          rm.isAc ? 'Split AC' : 'High-Speed Fan'
                        }, clean linen, and 24/7 power backup.`}
                    </p>
                    <button
                      onClick={() => onSelectCategory(rm.category)}
                      className="w-full py-2 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-bold text-xs rounded-xl border border-slate-700 hover:border-amber-500 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Book {rm.category}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
