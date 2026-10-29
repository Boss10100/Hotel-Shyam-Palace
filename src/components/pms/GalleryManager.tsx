import React, { useState, useRef, useEffect } from 'react';
import {
  GalleryItem,
  GalleryCategory,
  RoomCategory,
  StaffUser,
  Room,
  HotelSettings,
  INITIAL_ROOMS_INVENTORY,
} from '../../types/hotel';
import {
  addGalleryItem,
  deleteGalleryItem,
  updateGalleryItem,
  updateRoomPhoto,
  updateHotelCategoryPhoto,
} from '../../services/db';
import {
  compressImageFile,
  resolveRoomPhoto,
  PRESET_ROOM_PHOTOS,
  DEFAULT_CATEGORY_IMAGES,
} from '../../utils/media';
import {
  Plus,
  Trash2,
  Upload,
  Link,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  X,
  RefreshCw,
  RotateCcw,
  BedDouble,
  Image as ImageIcon,
} from 'lucide-react';

type GallerySectionType = 'rooms_photos' | 'category_photos' | 'public_gallery';

interface Props {
  galleryItems: GalleryItem[];
  staffUser: StaffUser;
  rooms?: Room[];
  settings?: HotelSettings;
  initialSection?: GallerySectionType;
  onSectionChange?: (sec: GallerySectionType) => void;
}

export const GalleryManager: React.FC<Props> = ({
  galleryItems,
  staffUser,
  rooms,
  settings,
  initialSection = 'rooms_photos',
  onSectionChange,
}) => {
  const displayRooms = rooms && rooms.length > 0 ? rooms : (INITIAL_ROOMS_INVENTORY as Room[]);
  const [activeSectionState, setActiveSectionState] = useState<GallerySectionType>(initialSection);

  useEffect(() => {
    if (initialSection) setActiveSectionState(initialSection);
  }, [initialSection]);

  const setActiveSection = (sec: GallerySectionType) => {
    setActiveSectionState(sec);
    if (onSectionChange) onSectionChange(sec);
  };
  const activeSection = activeSectionState;

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Add Gallery Photo Form states
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<GalleryCategory>('room');
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('Deluxe');
  const [imageUrl, setImageUrl] = useState('');
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('upload');

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Change Modal State (works for Room, Category, or Gallery Item)
  const [changeModalTarget, setChangeModalTarget] = useState<{
    kind: 'room' | 'category' | 'gallery';
    id: string;
    label: string;
    currentUrl: string;
    currentTitle?: string;
    currentCaption?: string;
  } | null>(null);
  const [changeUrlInput, setChangeUrlInput] = useState('');
  const [changeTitleInput, setChangeTitleInput] = useState('');
  const [changeCaptionInput, setChangeCaptionInput] = useState('');

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Add New Gallery Photo File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
    } catch (err: any) {
      notify('error', err.message || 'Could not process image file.');
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      notify('error', 'Please provide a photo URL or upload an image.');
      return;
    }
    if (!title.trim()) {
      notify('error', 'Please provide a title for the photo.');
      return;
    }

    setSaving(true);
    try {
      await addGalleryItem(
        {
          title: title.trim(),
          caption: caption.trim(),
          category,
          roomCategory: category === 'room' ? roomCategory : 'Deluxe',
          imageUrl: imageUrl.trim(),
          featured: false,
        },
        staffUser
      );

      notify('success', 'Photo added to live hotel gallery!');
      setShowAddModal(false);
      setTitle('');
      setCaption('');
      setImageUrl('');
    } catch (err: any) {
      notify('error', err.message || 'Failed to save photo.');
    } finally {
      setSaving(false);
    }
  };

  // Gallery Item: Delete, Replace, Change (NO window.confirm blocker!)
  const handleDeleteGalleryPhoto = async (id: string, photoTitle: string) => {
    setBusyId(id);
    try {
      await deleteGalleryItem(id, staffUser);
      notify('success', `Deleted "${photoTitle}" from public gallery.`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to delete photo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReplaceGalleryFile = async (photo: GalleryItem, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyId(photo.id);
    try {
      const compressed = await compressImageFile(file);
      await updateGalleryItem(photo.id, { imageUrl: compressed }, 'replace', staffUser);
      notify('success', `Replaced photo for "${photo.title}"!`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to replace gallery photo.');
    } finally {
      setBusyId(null);
      if (e.target) e.target.value = '';
    }
  };

  // Room Photo: Delete, Replace, Restore
  const handleRoomPhotoAction = async (
    room: Room,
    action: 'delete' | 'replace' | 'restore',
    newUrl = ''
  ) => {
    setBusyId(`room-${room.id}`);
    try {
      await updateRoomPhoto(room.id, newUrl, action, staffUser);
      notify(
        'success',
        action === 'delete'
          ? `Room ${room.roomNumber} photo deleted.`
          : action === 'restore'
          ? `Room ${room.roomNumber} default photo restored.`
          : `Room ${room.roomNumber} photo replaced!`
      );
    } catch (err: any) {
      notify('error', err.message || 'Room photo update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReplaceRoomFile = async (room: Room, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyId(`room-${room.id}`);
    try {
      const compressed = await compressImageFile(file);
      await updateRoomPhoto(room.id, compressed, 'replace', staffUser);
      notify('success', `Room ${room.roomNumber} photo replaced!`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to replace room photo.');
    } finally {
      setBusyId(null);
      if (e.target) e.target.value = '';
    }
  };

  // Category Photo: Delete, Replace, Restore
  const handleCategoryPhotoAction = async (
    cat: RoomCategory,
    action: 'delete' | 'replace' | 'restore',
    newUrl = ''
  ) => {
    if (!settings) return;
    setBusyId(`cat-${cat}`);
    try {
      await updateHotelCategoryPhoto(cat, newUrl, action, settings, staffUser);
      notify('success', `${cat} category photo updated (${action})!`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to update category photo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReplaceCategoryFile = async (cat: RoomCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setBusyId(`cat-${cat}`);
    try {
      const compressed = await compressImageFile(file);
      await updateHotelCategoryPhoto(cat, compressed, 'replace', settings, staffUser);
      notify('success', `${cat} category default photo replaced!`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to replace category photo.');
    } finally {
      setBusyId(null);
      if (e.target) e.target.value = '';
    }
  };

  // Apply Change Modal
  const handleApplyChangeModal = async (chosenUrl?: string) => {
    if (!changeModalTarget) return;
    const finalUrl = (chosenUrl || changeUrlInput).trim();
    if (!finalUrl) {
      notify('error', 'Please select a preset or enter a valid photo URL.');
      return;
    }

    setBusyId(changeModalTarget.id);
    try {
      if (changeModalTarget.kind === 'room') {
        await updateRoomPhoto(changeModalTarget.id, finalUrl, 'change', staffUser);
        notify('success', `${changeModalTarget.label} photo changed!`);
      } else if (changeModalTarget.kind === 'category' && settings) {
        await updateHotelCategoryPhoto(
          changeModalTarget.id as RoomCategory,
          finalUrl,
          'change',
          settings,
          staffUser
        );
        notify('success', `${changeModalTarget.label} photo changed!`);
      } else if (changeModalTarget.kind === 'gallery') {
        await updateGalleryItem(
          changeModalTarget.id,
          {
            imageUrl: finalUrl,
            title: changeTitleInput.trim() || changeModalTarget.currentTitle || 'Hotel Photo',
            caption: changeCaptionInput.trim(),
          },
          'change',
          staffUser
        );
        notify('success', `Gallery photo "${changeModalTarget.label}" changed!`);
      }
      setChangeModalTarget(null);
    } catch (err: any) {
      notify('error', err.message || 'Failed to change photo.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = galleryItems.filter((item) => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const categoriesList: RoomCategory[] = ['Deluxe', 'Small AC', 'Large Non-AC', 'Common'];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-serif-luxury text-white">
              Hotel & 16-Room Photo Studio (Delete • Replace • Change)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every individual room (101–211), room category, and gallery image has instant Delete, Replace (file upload), and Change controls.
          </p>
        </div>

        <button
          onClick={() => {
            setFeedback(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-600/30 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Gallery Photo</span>
        </button>
      </div>

      {/* Section Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs">
        <button
          type="button"
          onClick={() => setActiveSection('rooms_photos')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeSection === 'rooms_photos'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>1. All 16 Room Photos (101–211)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('category_photos')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeSection === 'category_photos'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>2. Room Category Default Photos (4 Categories)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('public_gallery')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeSection === 'public_gallery'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>3. Public Website Gallery ({galleryItems.length} Photos)</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: All 16 Individual Rooms Photo Controls */}
      {activeSection === 'rooms_photos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayRooms.map((room) => {
            const resolved = resolveRoomPhoto(room.photoUrl, room.category, settings?.categoryImages);
            const isBusy = busyId === `room-${room.id}` || busyId === room.id;
            const inputKey = `room-file-${room.id}`;

            return (
              <div
                key={room.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-md"
              >
                <div className="relative h-44 bg-slate-950">
                  {resolved.isDeleted ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-slate-600 mb-1" />
                      <span className="text-xs font-bold text-rose-400">Photo Deleted</span>
                      <button
                        type="button"
                        onClick={() => handleRoomPhotoAction(room, 'restore')}
                        className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Default</span>
                      </button>
                    </div>
                  ) : (
                    <img
                      src={resolved.url}
                      alt={`Room ${room.roomNumber}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-2.5 left-2.5 bg-slate-950/90 border border-slate-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                    Room {room.roomNumber}
                  </span>
                  <span className="absolute top-2.5 right-2.5 bg-amber-500/90 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-md">
                    {room.category}
                  </span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => {
                    fileInputRefs.current[inputKey] = el;
                  }}
                  onChange={(e) => handleReplaceRoomFile(room, e)}
                  className="hidden"
                />

                <div className="p-3.5 space-y-2.5 bg-slate-900">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Floor {room.floor} • ₹{room.baseRate}/nt</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {resolved.isDeleted ? 'Deleted' : resolved.isCustom ? 'Custom Photo' : 'Default Photo'}
                    </span>
                  </div>

                  {/* Delete / Replace / Change Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy || resolved.isDeleted}
                      onClick={() => handleRoomPhotoAction(room, 'delete')}
                      className="py-1.5 px-2 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 border border-rose-800/60"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => fileInputRefs.current[inputKey]?.click()}
                      className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 border border-amber-500/30"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setChangeModalTarget({
                          kind: 'room',
                          id: room.id,
                          label: `Room ${room.roomNumber} (${room.category})`,
                          currentUrl: resolved.url,
                        });
                        setChangeUrlInput('');
                      }}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 border border-slate-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 2: 4 Room Categories Default Photos */}
      {activeSection === 'category_photos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {categoriesList.map((cat) => {
            const rawCatPhoto = settings?.categoryImages?.[cat];
            const resolved = resolveRoomPhoto(rawCatPhoto, cat, settings?.categoryImages);
            const isBusy = busyId === `cat-${cat}` || busyId === cat;
            const inputKey = `cat-file-${cat}`;

            return (
              <div
                key={cat}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg"
              >
                <div className="relative h-56 bg-slate-950">
                  {resolved.isDeleted ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <ImageIcon className="w-10 h-10 text-slate-600 mb-2" />
                      <span className="text-sm font-bold text-rose-400">{cat} Category Photo Deleted</span>
                      <button
                        type="button"
                        onClick={() => handleCategoryPhotoAction(cat, 'restore')}
                        className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Default {cat} Photo</span>
                      </button>
                    </div>
                  ) : (
                    <img
                      src={resolved.url || DEFAULT_CATEGORY_IMAGES[cat]}
                      alt={cat}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-3 left-3 bg-slate-950/90 border border-slate-700 text-amber-300 font-bold text-xs px-3 py-1 rounded-xl">
                    Category: {cat}
                  </span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => {
                    fileInputRefs.current[inputKey] = el;
                  }}
                  onChange={(e) => handleReplaceCategoryFile(cat, e)}
                  className="hidden"
                />

                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-400">
                    Shown on the Public Website &quot;Accommodations &amp; Daily Rates&quot; card for <strong>{cat}</strong>.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isBusy || resolved.isDeleted}
                      onClick={() => handleCategoryPhotoAction(cat, 'delete')}
                      className="py-2 px-3 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 border border-rose-800/60"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => fileInputRefs.current[inputKey]?.click()}
                      className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 border border-amber-500/30"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setChangeModalTarget({
                          kind: 'category',
                          id: cat,
                          label: `${cat} Category`,
                          currentUrl: resolved.url,
                        });
                        setChangeUrlInput('');
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 border border-slate-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 3: Public Website Gallery Photos */}
      {activeSection === 'public_gallery' && (
        <div className="space-y-5">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: `All Photos (${galleryItems.length})` },
              { id: 'hotel', label: `Hotel Premises (${galleryItems.filter((i) => i.category === 'hotel').length})` },
              { id: 'room', label: `Room Photos (${galleryItems.filter((i) => i.category === 'room').length})` },
              { id: 'restaurant', label: `Restaurant (${galleryItems.filter((i) => i.category === 'restaurant').length})` },
              { id: 'mandir', label: `Dham View (${galleryItems.filter((i) => i.category === 'mandir').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterCategory === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((photo) => {
              const isBusy = busyId === photo.id;
              const inputKey = `gal-file-${photo.id}`;

              return (
                <div
                  key={photo.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between group relative"
                >
                  <div className="relative h-48 bg-slate-950 overflow-hidden">
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-slate-950/90 border border-slate-700 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {photo.category === 'room' ? photo.roomCategory || 'Room' : photo.category}
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => {
                      fileInputRefs.current[inputKey] = el;
                    }}
                    onChange={(e) => handleReplaceGalleryFile(photo, e)}
                    className="hidden"
                  />

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
                    <div>
                      <h4 className="font-bold text-white text-sm leading-snug">{photo.title}</h4>
                      {photo.caption && (
                        <p className="text-slate-400 text-[11px] line-clamp-2 mt-1 leading-relaxed">
                          {photo.caption}
                        </p>
                      )}
                    </div>

                    {/* Delete / Replace / Change Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDeleteGalleryPhoto(photo.id, photo.title)}
                        disabled={isBusy}
                        className="py-1.5 px-2 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 border border-rose-800/60"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Delete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[inputKey]?.click()}
                        disabled={isBusy}
                        className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 border border-amber-500/30"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChangeModalTarget({
                            kind: 'gallery',
                            id: photo.id,
                            label: photo.title,
                            currentUrl: photo.imageUrl,
                            currentTitle: photo.title,
                            currentCaption: photo.caption || '',
                          });
                          setChangeUrlInput('');
                          setChangeTitleInput(photo.title);
                          setChangeCaptionInput(photo.caption || '');
                        }}
                        disabled={isBusy}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 border border-slate-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Change Photo Modal (Shared across Rooms, Categories, and Gallery Items) */}
      {changeModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Change Photo — {changeModalTarget.label}
                </h3>
                <p className="text-xs text-slate-400">
                  Select a preset photo or paste a direct image URL below.
                </p>
              </div>
              <button onClick={() => setChangeModalTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {changeModalTarget.kind === 'gallery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Photo Title</label>
                  <input
                    type="text"
                    value={changeTitleInput}
                    onChange={(e) => setChangeTitleInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Caption</label>
                  <input
                    type="text"
                    value={changeCaptionInput}
                    onChange={(e) => setChangeCaptionInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="font-bold text-slate-300 block">Quick-Select Hotel Preset Photos:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1">
                {PRESET_ROOM_PHOTOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyChangeModal(preset.url)}
                    className="group bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl overflow-hidden text-left transition-all cursor-pointer"
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-20 object-cover" />
                    <div className="p-2">
                      <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 block truncate">
                        {preset.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block font-bold text-slate-300">Or Enter Custom Image URL:</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={changeUrlInput}
                  onChange={(e) => setChangeUrlInput(e.target.value)}
                  placeholder="https://example.com/hotel-photo.jpg"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyChangeModal()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  Save Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-fade-in text-xs">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Camera className="w-4 h-4" />
                <span>Gallery Upload</span>
              </div>
              <h3 className="text-xl font-bold font-serif-luxury text-white mt-1">
                Add Real Hotel / Room Photo
              </h3>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Photo Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Room 205 King Bed & AC"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Photo Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GalleryCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="room">Room Photo</option>
                    <option value="hotel">Hotel Premises / Entrance</option>
                    <option value="restaurant">Shree H.V.M Restaurant</option>
                    <option value="mandir">Pandokhar Sarkar Dham View</option>
                  </select>
                </div>

                {category === 'room' && (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Room Category *</label>
                    <select
                      value={roomCategory}
                      onChange={(e) => setRoomCategory(e.target.value as RoomCategory)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Deluxe">Deluxe AC (₹1,600)</option>
                      <option value="Small AC">Small AC (₹1,500)</option>
                      <option value="Large Non-AC">Large Non-AC (₹1,200)</option>
                      <option value="Common">Common Hall (₹800)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Description / Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Spacious clean room with geyser, LED TV and pristine linen"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Photo Source Switcher */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Photo Source</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setImageSource('upload')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      imageSource === 'upload'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Device Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSource('url')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      imageSource === 'url'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>Image Web Link (URL)</span>
                  </button>
                </div>

                {imageSource === 'url' ? (
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                ) : (
                  <div className="p-3 bg-slate-950 border border-dashed border-slate-700 rounded-xl text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Auto-compressed JPEG/PNG/WebP</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {imageUrl && (
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block mb-1">Image Preview:</span>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-36 object-cover rounded-lg border border-slate-700"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !imageUrl}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Publish to Gallery</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
