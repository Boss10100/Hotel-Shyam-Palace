import React, { useState, useRef } from 'react';
import {
  Room,
  StaffUser,
  RoomStatus,
  HousekeepingStatus,
  HotelSettings,
  INITIAL_ROOMS_INVENTORY,
} from '../../types/hotel';
import { manualRoomStatusOverride, updateRoomPhoto } from '../../services/db';
import {
  compressImageFile,
  resolveRoomPhoto,
  PRESET_ROOM_PHOTOS,
} from '../../utils/media';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Loader2,
  XCircle,
  Trash2,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  RotateCcw,
  Link as LinkIcon,
} from 'lucide-react';

interface Props {
  rooms: Room[];
  staffUser: StaffUser;
  settings?: HotelSettings;
}

export const RoomsHousekeepingManager: React.FC<Props> = ({ rooms, staffUser, settings }) => {
  const displayRooms = rooms && rooms.length > 0 ? rooms : (INITIAL_ROOMS_INVENTORY as Room[]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState<RoomStatus>('available');
  const [newHkStatus, setNewHkStatus] = useState<HousekeepingStatus>('clean');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Room Photo Editing State (Delete, Replace, Change)
  const [photoBusyRoomId, setPhotoBusyRoomId] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [changePhotoRoom, setChangePhotoRoom] = useState<Room | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showNotice = (type: 'success' | 'error', message: string) => {
    setPhotoFeedback({ type, message });
    setTimeout(() => setPhotoFeedback(null), 4000);
  };

  const handleDeleteRoomPhoto = async (room: Room) => {
    setPhotoBusyRoomId(room.id);
    try {
      await updateRoomPhoto(room.id, '', 'delete', staffUser);
      showNotice('success', `Room ${room.roomNumber} photo deleted. You can Replace, Change, or Restore it anytime.`);
    } catch (err: any) {
      showNotice('error', err.message || `Failed to delete photo for Room ${room.roomNumber}`);
    } finally {
      setPhotoBusyRoomId(null);
    }
  };

  const handleRestoreRoomPhoto = async (room: Room) => {
    setPhotoBusyRoomId(room.id);
    try {
      await updateRoomPhoto(room.id, '', 'restore', staffUser);
      showNotice('success', `Room ${room.roomNumber} default category photo restored.`);
    } catch (err: any) {
      showNotice('error', err.message || `Failed to restore photo for Room ${room.roomNumber}`);
    } finally {
      setPhotoBusyRoomId(null);
    }
  };

  const handleReplaceFileSelect = async (room: Room, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusyRoomId(room.id);
    try {
      const compressedDataUrl = await compressImageFile(file);
      await updateRoomPhoto(room.id, compressedDataUrl, 'replace', staffUser);
      showNotice('success', `Room ${room.roomNumber} photo replaced and synced to website!`);
    } catch (err: any) {
      showNotice('error', err.message || `Failed to replace photo for Room ${room.roomNumber}`);
    } finally {
      setPhotoBusyRoomId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenChangePhotoModal = (room: Room) => {
    const resolved = resolveRoomPhoto(room.photoUrl, room.category, settings?.categoryImages);
    setChangePhotoRoom(room);
    setCustomPhotoUrl(resolved.isCustom && !resolved.url.startsWith('data:') ? resolved.url : '');
  };

  const handleApplyChangePhoto = async (newUrl: string) => {
    if (!changePhotoRoom || !newUrl.trim()) return;
    const targetRoom = changePhotoRoom;
    setPhotoBusyRoomId(targetRoom.id);
    try {
      await updateRoomPhoto(targetRoom.id, newUrl.trim(), 'change', staffUser);
      setChangePhotoRoom(null);
      setCustomPhotoUrl('');
      showNotice('success', `Room ${targetRoom.roomNumber} photo changed successfully!`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to change room photo');
    } finally {
      setPhotoBusyRoomId(null);
    }
  };

  const handleOpenEdit = (room: Room) => {
    setSelectedRoom(room);
    setNewStatus(room.status);
    setNewHkStatus(room.housekeepingStatus);
    setOverrideReason('');
    setError(null);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    if (!overrideReason.trim()) {
      setError('A mandatory reason is required for any manual room status override to maintain accountability.');
      return;
    }

    setLoading(true);
    try {
      await manualRoomStatusOverride(
        selectedRoom.id,
        newStatus,
        newHkStatus,
        overrideReason.trim(),
        staffUser
      );
      setSelectedRoom(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update room status.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'available':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Available</span>;
      case 'occupied':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Occupied</span>;
      case 'reserved':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Reserved</span>;
      case 'maintenance':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Maintenance</span>;
      case 'cleaning':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Cleaning</span>;
    }
  };

  const getHkBadge = (hk: HousekeepingStatus) => {
    switch (hk) {
      case 'clean':
        return <span className="text-emerald-400 font-semibold">● Clean</span>;
      case 'dirty':
        return <span className="text-rose-400 font-semibold">● Dirty</span>;
      case 'in_progress':
        return <span className="text-amber-400 font-semibold">● In Progress</span>;
      case 'inspected':
        return <span className="text-blue-400 font-semibold">● Inspected</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            16-Room Inventory, Photos & Housekeeping Status
          </h2>
          <p className="text-xs text-slate-400">
            Manage room photos (Delete, Replace, Change) and real-time cleanliness/occupancy status for all 16 rooms (101–211).
          </p>
        </div>
        <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800/50 px-3.5 py-2 rounded-xl">
          Photo changes sync live to Public Website
        </div>
      </div>

      {photoFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
            photoFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          {photoFeedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{photoFeedback.message}</span>
        </div>
      )}

      {/* 16 Rooms Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayRooms.map((room) => {
          const photoState = resolveRoomPhoto(room.photoUrl, room.category, settings?.categoryImages);
          const isBusy = photoBusyRoomId === room.id;

          return (
            <div
              key={room.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              {/* Room Photo Banner + Delete / Replace / Change Toolbar */}
              <div className="relative h-40 bg-slate-950 border-b border-slate-800 overflow-hidden group">
                {photoState.isDeleted ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-950">
                    <ImageIcon className="w-7 h-7 text-slate-600 mb-1" />
                    <span className="text-xs font-semibold text-rose-400">Room Photo Deleted</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreRoomPhoto(room)}
                      disabled={isBusy}
                      className="mt-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-slate-700"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore Default</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={photoState.url}
                    alt={`Room ${room.roomNumber}`}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="bg-slate-950/90 border border-slate-700 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg shadow">
                    Room {room.roomNumber}
                  </span>
                  {photoState.isCustom && (
                    <span className="bg-amber-500 text-slate-950 font-bold text-[9px] uppercase px-1.5 py-0.5 rounded">
                      Custom
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5">{getStatusBadge(room.status)}</div>

                {/* Hidden File Input for Replace */}
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => {
                    fileInputRefs.current[room.id] = el;
                  }}
                  onChange={(e) => handleReplaceFileSelect(room, e)}
                  className="hidden"
                />

                {/* 3 Explicit Action Buttons: Delete | Replace | Change */}
                <div className="absolute bottom-2 inset-x-2 grid grid-cols-3 gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteRoomPhoto(room)}
                    disabled={isBusy || photoState.isDeleted}
                    title="Delete Room Photo"
                    className="py-1 px-1.5 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[room.id]?.click()}
                    disabled={isBusy}
                    title="Replace Photo from Device"
                    className="py-1 px-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 border border-amber-500/30"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Replace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenChangePhotoModal(room)}
                    disabled={isBusy}
                    title="Change Photo (Select Preset or URL)"
                    className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 border border-slate-700"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    <span>Change</span>
                  </button>
                </div>
              </div>

              {/* Room Operational Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-amber-300 font-semibold">{room.category}</p>
                    <span className="text-xs font-bold text-white">₹{room.baseRate}/night</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Floor / Type:</span>
                      <span>Floor {room.floor} ({room.isAc ? 'AC' : 'Non-AC'})</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400">Housekeeping:</span>
                      <span className="text-xs">{getHkBadge(room.housekeepingStatus)}</span>
                    </div>
                    {room.status === 'occupied' && room.currentGuestName && (
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] text-amber-300 mt-2">
                        <span className="text-slate-500 block text-[10px]">Active Guest:</span>
                        <span className="font-bold">{room.currentGuestName}</span>
                      </div>
                    )}
                    {room.notes && (
                      <p className="text-[10px] text-slate-500 italic mt-1 truncate">
                        Note: {room.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {(room.status === 'cleaning' || room.housekeepingStatus === 'dirty') && (
                    <button
                      type="button"
                      onClick={async () => {
                        await manualRoomStatusOverride(
                          room.id,
                          'available',
                          'clean',
                          'Quick housekeeping turnaround completed',
                          staffUser
                        );
                        showNotice('success', `Room ${room.roomNumber} marked Clean & Available!`);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Clean & Available</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(room)}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    <span>Update Status / Housekeeping</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Change Room Photo Modal (Preset Gallery + Custom URL + Upload) */}
      {changePhotoRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Change Photo — Room {changePhotoRoom.roomNumber} ({changePhotoRoom.category})
                </h3>
                <p className="text-xs text-slate-400">
                  Choose a verified hotel room preset, paste an image link, or upload a new photo from your device.
                </p>
              </div>
              <button onClick={() => setChangePhotoRoom(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Option 1: Upload from device */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-amber-300 block">1. Upload Photo from Mobile / Computer</span>
                <span className="text-[11px] text-slate-400">Auto-compressed for fast website loading</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const room = changePhotoRoom;
                  setChangePhotoRoom(null);
                  fileInputRefs.current[room.id]?.click();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
            </div>

            {/* Option 2: Select from Presets */}
            <div className="space-y-2">
              <span className="font-bold text-slate-300 block">2. Select from Hotel Shyam Palace Presets:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {PRESET_ROOM_PHOTOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyChangePhoto(preset.url)}
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

            {/* Option 3: Custom Image URL */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block font-bold text-slate-300">3. Or Paste Direct Image URL:</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    placeholder="https://example.com/room-photo.jpg"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={!customPhotoUrl.trim()}
                  onClick={() => handleApplyChangePhoto(customPhotoUrl)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-40"
                >
                  Apply URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">
                  Update Room {selectedRoom.roomNumber} Status
                </h3>
                <p className="text-xs text-slate-400">{selectedRoom.category} • Floor {selectedRoom.floor}</p>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Operational Room Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as RoomStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="available">Available (Vacant & Ready)</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning / Dirty</option>
                  <option value="maintenance">Maintenance Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Housekeeping Inspection Status</label>
                <select
                  value={newHkStatus}
                  onChange={(e) => setNewHkStatus(e.target.value as HousekeepingStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="clean">Clean (Ready for Check-in)</option>
                  <option value="dirty">Dirty (Requires Linen & Wash)</option>
                  <option value="in_progress">Cleaning In Progress</option>
                  <option value="inspected">Inspected by Supervisor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Mandatory Override Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Completed sanitization and fresh linens; ready for yatri check-in"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Logged in audit trail under staff ID: {staffUser.name} ({staffUser.role})
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Room Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
