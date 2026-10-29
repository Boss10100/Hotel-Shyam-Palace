import React, { useState } from 'react';
import { GalleryItem, GalleryCategory, RoomCategory } from '../../types/hotel';
import { Images, Eye, X, Calendar, Check, Camera, Sparkles } from 'lucide-react';

interface Props {
  galleryItems: GalleryItem[];
  onBookRoomCategory?: (category: RoomCategory) => void;
}

export const HotelGallery: React.FC<Props> = ({ galleryItems, onBookRoomCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Photos' },
    { id: 'hotel', label: 'Hotel & Premises' },
    { id: 'room', label: 'Real Room Photos' },
    { id: 'restaurant', label: 'Shree H.V.M Dining' },
    { id: 'mandir', label: 'Pandokhar Dham View' },
  ];

  const filteredItems = galleryItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <section id="gallery" className="py-20 bg-slate-950 text-white px-4 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Camera className="w-3.5 h-3.5" />
            <span>Official Photo Gallery</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-serif-luxury text-white">
            Hotel Premises & Room Gallery
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Take a visual tour of Hotel Shyam Palace, our cozy AC & Non-AC guest rooms, pure satvik restaurant, and immediate vicinity to Pandokhar Sarkar Dham & Kali Maiya Mandir.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActivePhoto(item)}
              className="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/50 transition-all duration-300 flex flex-col cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-amber-950/30"
            >
              {/* Photo Container */}
              <div className="relative h-60 overflow-hidden bg-slate-950">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity"></div>

                {/* Category Badge */}
                <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  {item.category === 'hotel'
                    ? 'Premises'
                    : item.category === 'room'
                    ? item.roomCategory || 'Room'
                    : item.category === 'restaurant'
                    ? 'Restaurant'
                    : 'Mandir View'}
                </span>

                {/* View Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Photo Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="font-bold font-serif-luxury text-base text-white group-hover:text-amber-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.caption}
                    </p>
                  )}
                </div>

                {item.roomCategory && onBookRoomCategory && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookRoomCategory(item.roomCategory!);
                    }}
                    className="w-full mt-2 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book {item.roomCategory}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-sm">No photos in this category yet.</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.title}
                className="max-h-[70vh] w-auto object-contain mx-auto"
              />
            </div>

            <div className="p-6 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  {activePhoto.category === 'hotel'
                    ? 'Hotel Premises'
                    : activePhoto.category === 'room'
                    ? `Guest Room • ${activePhoto.roomCategory || ''}`
                    : activePhoto.category === 'restaurant'
                    ? 'Shree H.V.M Restaurant'
                    : 'Pandokhar Sarkar Dham'}
                </span>
                <h3 className="text-xl font-bold font-serif-luxury text-white">
                  {activePhoto.title}
                </h3>
                {activePhoto.caption && (
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {activePhoto.caption}
                  </p>
                )}
              </div>

              {activePhoto.roomCategory && onBookRoomCategory && (
                <button
                  type="button"
                  onClick={() => {
                    const cat = activePhoto.roomCategory!;
                    setActivePhoto(null);
                    onBookRoomCategory(cat);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors cursor-pointer shrink-0"
                >
                  Book This Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
