import React, { useState } from 'react';
import { Guest, Booking, StaffUser } from '../../types/hotel';
import { Users, Search, ShieldCheck, Eye, X, Phone, User, FileText, MapPin, Edit3, Check, Loader2 } from 'lucide-react';
import { fastSetDoc } from '../../services/db';

interface Props {
  guests: Guest[];
  bookings: Booking[];
  staffUser: StaffUser;
}

export const GuestKycDirectory: React.FC<Props> = ({ guests, bookings, staffUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  const getGuestBookings = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return bookings.filter((b) => b.guestPhone.replace(/\D/g, '') === cleanPhone);
  };

  const resolveGuestAddress = (g: Guest): string => {
    if (g.address && g.address.trim()) return g.address.trim();
    const stays = getGuestBookings(g.phone);
    const stayWithAddr = stays.find((b) => b.guestAddress && b.guestAddress.trim());
    return stayWithAddr?.guestAddress?.trim() || '';
  };

  const filtered = guests.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const addr = resolveGuestAddress(g).toLowerCase();
    return (
      g.fullName.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      addr.includes(q)
    );
  });

  const handleSaveGuestAddress = async () => {
    if (!activeGuest) return;
    setSavingAddress(true);
    try {
      const cleanAddr = addressDraft.trim();
      await fastSetDoc(
        'guests',
        activeGuest.id,
        {
          ...activeGuest,
          address: cleanAddr,
          updatedAt: new Date().toISOString(),
        },
        true
      );
      setActiveGuest({ ...activeGuest, address: cleanAddr });
      setEditingAddress(false);
    } catch (e) {
      console.error('Failed to update guest address:', e);
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            Guest KYC & Profile Safe
          </h2>
          <p className="text-xs text-slate-400">
            Secure directory of verified guest profiles, residential addresses, masked identity proofs, and past stay histories.
          </p>
        </div>

        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Registered Guests</span>
          <span className="text-lg font-bold font-serif-luxury text-amber-300">{guests.length}</span>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Guest Name, Mobile, or Address / City..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Guests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => {
          const guestStays = getGuestBookings(g.phone);
          const guestAddr = resolveGuestAddress(g);
          return (
            <div
              key={g.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {g.photoUrl ? (
                    <img
                      src={g.photoUrl}
                      alt={g.fullName}
                      className="w-12 h-12 rounded-full object-cover border border-amber-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-amber-400 font-bold">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-sm">{g.fullName}</h3>
                    <p className="text-xs text-slate-400 font-mono">{g.phone}</p>
                    {g.email && <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{g.email}</p>}
                  </div>
                </div>

                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Address / City:</span>
                  <span className="font-medium text-amber-300/90 text-right truncate max-w-[180px]" title={guestAddr || 'Not specified'}>
                    {guestAddr || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Document:</span>
                  <span className="font-semibold text-slate-200">{g.idType || 'Aadhaar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Ref:</span>
                  <span className="font-mono text-slate-300">{g.idNumberMasked || 'XXXX-VERIFIED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified By:</span>
                  <span className="text-slate-400">{g.verifiedBy || 'Front Desk'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500">Recorded Stays:</span>
                  <span className="font-bold text-amber-400">{guestStays.length} Stays</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveGuest(g);
                  setAddressDraft(resolveGuestAddress(g));
                  setEditingAddress(false);
                }}
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>View Full KYC & Stays History</span>
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No guest records found. Guests are automatically added when walk-in check-in is conducted.
          </div>
        )}
      </div>

      {/* Guest Details & KYC Modal */}
      {activeGuest && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-luxury text-white">{activeGuest.fullName}</h3>
                <p className="text-xs text-slate-400">Phone: {activeGuest.phone} • Verified Guest Profile</p>
              </div>
              <button onClick={() => setActiveGuest(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guest Residential Address Block (View & Edit) */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Customer Residential Address</span>
                </span>
                {!editingAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressDraft(resolveGuestAddress(activeGuest));
                      setEditingAddress(true);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Address</span>
                  </button>
                )}
              </div>

              {editingAddress ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressDraft}
                    onChange={(e) => setAddressDraft(e.target.value)}
                    placeholder="Enter customer full residential address..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGuestAddress}
                    disabled={savingAddress}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    {savingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save</span>
                  </button>
                </div>
              ) : (
                <p className="text-slate-200 font-medium">
                  {resolveGuestAddress(activeGuest) || 'No residential address recorded yet — click Edit Address to add.'}
                </p>
              )}
            </div>

            {/* Document Scans */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">Govt ID Scan ({activeGuest.idType})</p>
                {activeGuest.idDocumentUrl ? (
                  <img
                    src={activeGuest.idDocumentUrl}
                    alt="ID Document"
                    className="max-h-36 mx-auto rounded object-contain"
                  />
                ) : (
                  <div className="h-28 flex items-center justify-center text-slate-500 text-xs">
                    Masked ID on file: {activeGuest.idNumberMasked}
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">Guest Facial Snapshot</p>
                {activeGuest.photoUrl ? (
                  <img
                    src={activeGuest.photoUrl}
                    alt="Guest Photo"
                    className="max-h-36 mx-auto rounded object-contain border border-amber-500/40"
                  />
                ) : (
                  <div className="h-28 flex items-center justify-center text-slate-500 text-xs">
                    No camera photo attached
                  </div>
                )}
              </div>
            </div>

            {/* Stay History List */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Stay History at Hotel Shyam Palace ({getGuestBookings(activeGuest.phone).length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getGuestBookings(activeGuest.phone).map((b) => (
                  <div key={b.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{b.bookingId} • Room {b.assignedRoomId || b.roomCategory}</p>
                      <p className="text-[10px] text-slate-400">{b.checkInDate} to {b.checkOutDate} ({b.totalNights} nights)</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300">₹{b.totalAmount}</span>
                      <span className="text-[10px] block capitalize text-slate-400">{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveGuest(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
