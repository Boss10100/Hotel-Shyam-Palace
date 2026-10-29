import React, { useState } from 'react';
import { Room, Guest, StaffUser, Booking, Payment, HotelSettings, RoomCategory, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import { performWalkInCheckIn } from '../../services/db';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';
import { YouPiPaymentModal } from '../common/YouPiPaymentModal';
import {
  X,
  User,
  Phone,
  Calendar,
  CreditCard,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Printer,
  Sparkles,
  MessageCircle,
  QrCode,
  MapPin,
} from 'lucide-react';

interface Props {
  rooms: Room[];
  guests: Guest[];
  staffUser: StaffUser;
  settings: HotelSettings;
  onClose: () => void;
  onComplete: (booking: Booking, payment?: Payment) => void;
}

export const WalkInCheckInModal: React.FC<Props> = ({
  rooms,
  guests,
  staffUser,
  settings,
  onClose,
  onComplete,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('12:00 PM');
  const [checkOutTime, setCheckOutTime] = useState('12:00 PM');

  // Room Assignment
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // KYC
  const [idType, setIdType] = useState<'Aadhaar' | 'Passport' | 'Voter ID' | 'Driving License' | 'Other'>('Aadhaar');
  const [idNumberMasked, setIdNumberMasked] = useState('');
  const [idDocDataUrl, setIdDocDataUrl] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'youpi_pg' | 'card' | 'other'>('cash');
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [showYouPiModal, setShowYouPiModal] = useState(false);

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<{ booking: Booking; payment?: Payment } | null>(null);
  const [waSending, setWaSending] = useState(false);
  const [waSent, setWaSent] = useState(false);

  // Guarantee all 16 rooms are available for assignment
  const displayRooms = rooms && rooms.length > 0 ? rooms : INITIAL_ROOMS_INVENTORY;
  const availableRooms = displayRooms.filter((r) => r.status === 'available');

  const selectedRoom = displayRooms.find((r) => r.id === selectedRoomId);

  // Calculate pricing
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const totalNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const baseRate = selectedRoom?.baseRate || 1500;
  const roomCharges = baseRate * totalNights;
  const gstAmount = Math.round(roomCharges * (settings.defaultGstRate / 100));
  const totalAmount = roomCharges + gstAmount;
  const balanceDue = Math.max(0, totalAmount - amountPaidNow);

  // Auto-fill existing guest profile if phone matches
  const handlePhoneChange = (val: string) => {
    setGuestPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 10) {
      const match = guests.find((g) => g.phone.replace(/\D/g, '') === clean);
      if (match) {
        setGuestName(match.fullName);
        if (match.email) setGuestEmail(match.email);
        if (match.address) setGuestAddress(match.address);
        if (match.idType) setIdType(match.idType);
        if (match.idNumberMasked) setIdNumberMasked(match.idNumberMasked);
        if (match.idDocumentUrl) setIdDocDataUrl(match.idDocumentUrl);
        if (match.photoUrl) setPhotoDataUrl(match.photoUrl);
      }
    }
  };

  // Handle document file upload to Data URL (secure storage simulation)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'doc' | 'photo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        if (target === 'doc') setIdDocDataUrl(res);
        if (target === 'photo') setPhotoDataUrl(res);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Camera Capture using MediaDevices
  const startCameraCapture = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoEl = document.getElementById('webcam-video') as HTMLVideoElement;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.play();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraActive(false);
    }
  };

  const takeSnapshot = () => {
    const videoEl = document.getElementById('webcam-video') as HTMLVideoElement;
    if (videoEl) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoEl, 0, 0, 320, 240);
      setPhotoDataUrl(canvas.toDataURL('image/jpeg'));

      // Stop stream
      const stream = videoEl.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRoomId) {
      setError('Please assign a specific available room from inventory.');
      return;
    }
    if (guestName.trim().length < 3) {
      setError('Please provide primary guest full name.');
      return;
    }
    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await performWalkInCheckIn(
        {
          guestName: guestName.trim(),
          guestPhone: cleanPhone,
          guestEmail: guestEmail.trim() || '',
          guestAddress: guestAddress.trim() || '',
          guestCount,
          checkInDate,
          checkOutDate,
          checkInTime,
          checkOutTime,
          roomCategory: selectedRoom?.category || 'Small AC',
          assignedRoomId: selectedRoomId,
          quotedRate: baseRate,
          totalNights,
          roomCharges,
          subtotal: roomCharges,
          gstRate: settings.defaultGstRate,
          gstAmount,
          totalAmount,
          advanceAmount: 0,
          amountPaid: amountPaidNow,
          balanceDue,
          bookingSource: 'walk_in',
          status: 'checked_in',
          arrivalDeadline: 'Walk-in / Immediate',
          specialRequests: specialRequests.trim() || '',
        },
        paymentMethod,
        amountPaidNow,
        transactionRef,
        staffUser,
        {
          idType,
          idNumberMasked: idNumberMasked || 'XXXX-VERIFIED',
          idDocumentUrl: idDocDataUrl,
          photoUrl: photoDataUrl,
        }
      );

      setCompletedRecord(result);
      onComplete(result.booking, result.payment);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Walk-in check-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {completedRecord ? (
          /* Success Screen with Printable Slip */
          <div className="text-center py-8 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold font-serif-luxury text-white">
                Guest Successfully Checked In!
              </h2>
              <p className="text-sm text-slate-300">
                Room <strong>{completedRecord.booking.assignedRoomId}</strong> is now marked as <strong>OCCUPIED</strong> in central database.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 max-w-md mx-auto grid grid-cols-2 gap-4 text-xs text-left">
              <div>
                <span className="text-slate-500 block">Booking Token:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{completedRecord.booking.bookingId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Primary Guest:</span>
                <span className="font-bold text-white">{completedRecord.booking.guestName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Assigned Room:</span>
                <span className="font-bold text-emerald-400 text-sm">Room {completedRecord.booking.assignedRoomId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Settlement:</span>
                <span className="font-bold text-slate-200">Paid ₹{completedRecord.booking.amountPaid} / Due ₹{completedRecord.booking.balanceDue}</span>
              </div>
              {completedRecord.booking.guestAddress && (
                <div className="col-span-2 pt-2 border-t border-slate-800">
                  <span className="text-slate-500 block">Customer Address:</span>
                  <span className="font-medium text-slate-200">{completedRecord.booking.guestAddress}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={waSending}
                onClick={async () => {
                  setWaSending(true);
                  try {
                    await sendAutomatedWhatsApp({
                      recipientPhone: completedRecord.booking.guestPhone,
                      templateType: 'checkin_slip',
                      bookingData: completedRecord.booking,
                    });
                    setWaSent(true);
                  } finally {
                    setWaSending(false);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-700/30 disabled:opacity-50"
              >
                {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                <span>
                  {waSent
                    ? `Dispatched via OpenWA (+91 ${completedRecord.booking.guestPhone})`
                    : `Send OpenWA Check-In Slip (+91 ${completedRecord.booking.guestPhone})`}
                </span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Registration Card</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          /* Full 5-Step Walk-In Check-In Form */
          <div>
            <div className="mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Front Desk Express Registration</span>
              </div>
              <h2 className="text-2xl font-bold font-serif-luxury text-white">
                Walk-In Guest Check-In & KYC
              </h2>
              <p className="text-xs text-slate-400">
                Immediate room assignment, photo KYC verification, rate calculation, and payment entry.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Step 1: Guest Information */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  1. Guest Identification & Contact
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Mobile Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Primary Guest Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Full Name as per ID"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Total Guests</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-medium mb-1">
                      Customer Full Address / City & State (As per Aadhaar / ID) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={guestAddress}
                        onChange={(e) => setGuestAddress(e.target.value)}
                        placeholder="e.g. House No. 42, Civil Lines, Jhansi / Gwalior, Madhya Pradesh"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Stay Dates & Room Selection */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  2. Stay Dates & Available Room Assignment (16 Rooms)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Check-in Date</label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Planned Check-out Date</label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={checkInDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Assign Room <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => {
                        setSelectedRoomId(e.target.value);
                        const r = rooms.find((rm) => rm.id === e.target.value);
                        if (r) {
                          setAmountPaidNow(r.baseRate * totalNights + Math.round(r.baseRate * totalNights * 0.12));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      required
                    >
                      <option value="">-- Choose Available Room --</option>
                      {availableRooms.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          Room {rm.roomNumber} — {rm.category} (₹{rm.baseRate}/nt)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {availableRooms.length === 0 && (
                  <p className="text-rose-400 text-xs">
                    ⚠️ No rooms currently marked available. Please check status in Room Housekeeping.
                  </p>
                )}
              </div>

              {/* Step 3: Mandatory KYC & Photo */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    3. Guest KYC Document & Photo Capture
                  </h3>
                  <span className="text-[10px] text-slate-400">Verifying Staff: {staffUser.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Govt ID Type</label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Other">Other Official ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Masked ID Number / Ref</label>
                    <input
                      type="text"
                      value={idNumberMasked}
                      onChange={(e) => setIdNumberMasked(e.target.value)}
                      placeholder="e.g. XXXX-XXXX-4912"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Document Upload & Camera Capture */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* ID Doc File */}
                  <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center space-y-2">
                    <p className="text-[11px] font-medium text-slate-300">ID Document Image / Scan</p>
                    {idDocDataUrl ? (
                      <div className="space-y-1">
                        <img src={idDocDataUrl} alt="ID Document" className="h-20 mx-auto rounded object-cover" />
                        <button
                          type="button"
                          onClick={() => setIdDocDataUrl('')}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Remove Scan
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer p-2 hover:bg-slate-900 rounded-lg">
                        <Upload className="w-5 h-5 text-amber-400 mb-1" />
                        <span className="text-[10px] text-slate-400">Upload ID Card Photo</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'doc')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Guest Photo Snapshot */}
                  <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center space-y-2">
                    <p className="text-[11px] font-medium text-slate-300">Guest Facial Photo</p>
                    {photoDataUrl ? (
                      <div className="space-y-1">
                        <img src={photoDataUrl} alt="Guest Snapshot" className="h-20 w-20 mx-auto rounded-full object-cover border border-amber-500" />
                        <button
                          type="button"
                          onClick={() => setPhotoDataUrl('')}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Retake Photo
                        </button>
                      </div>
                    ) : cameraActive ? (
                      <div className="space-y-2">
                        <video id="webcam-video" className="w-40 h-28 mx-auto rounded bg-black object-cover" autoPlay playsInline />
                        <button
                          type="button"
                          onClick={takeSnapshot}
                          className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-[11px] rounded"
                        >
                          Capture
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={startCameraCapture}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg text-[10px] cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Use Camera</span>
                        </button>
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'photo')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: Billing & Payment Settlement */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  4. Billing Calculation & Settlement
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Room Rate</span>
                    <span className="font-bold text-white text-sm">₹{baseRate} / nt</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Nights</span>
                    <span className="font-bold text-white text-sm">{totalNights} Night(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">GST ({settings.defaultGstRate}%)</span>
                    <span className="font-bold text-slate-300 text-sm">₹{gstAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Grand Total</span>
                    <span className="font-bold text-amber-300 text-base">₹{totalAmount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="youpi_pg">YouPI-PG (Zero-Fee Dynamic QR)</option>
                      <option value="upi">UPI (PhonePe / GPay / Paytm)</option>
                      <option value="card">Debit / Credit Card</option>
                      <option value="other">Bank Transfer / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Amount Collected Now (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={amountPaidNow}
                      onChange={(e) => setAmountPaidNow(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Transaction Reference / UTR {(paymentMethod === 'upi' || paymentMethod === 'youpi_pg') && '*'}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder={paymentMethod === 'upi' || paymentMethod === 'youpi_pg' ? 'UTR / YouPI Ref' : 'Optional receipt #'}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (amountPaidNow <= 0) setAmountPaidNow(totalAmount);
                          setPaymentMethod('youpi_pg');
                          setShowYouPiModal(true);
                        }}
                        title="Open YouPI-PG Dynamic UPI QR Checkout"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>YouPI QR</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold px-2 pt-2">
                  <span className="text-slate-400">Remaining Balance Payable:</span>
                  <span className={balanceDue > 0 ? 'text-rose-400 font-bold text-sm' : 'text-emerald-400 font-bold text-sm'}>
                    ₹{balanceDue} {balanceDue === 0 ? '(Fully Paid)' : ''}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedRoomId}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Check-In...</span>
                    </>
                  ) : (
                    <span>Complete Check-In & Assign Room</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showYouPiModal && (
        <YouPiPaymentModal
          amount={amountPaidNow > 0 ? amountPaidNow : totalAmount}
          note={`Walk-in Check-In Room ${selectedRoomId || ''}`}
          customerName={guestName.trim()}
          customerPhone={guestPhone.replace(/\D/g, '')}
          roomNumber={selectedRoomId}
          settings={settings}
          onClose={() => setShowYouPiModal(false)}
          onSuccess={(details) => {
            setPaymentMethod('youpi_pg');
            setAmountPaidNow(details.amount);
            setTransactionRef(details.utrNumber || details.transactionRef);
            setShowYouPiModal(false);
          }}
        />
      )}
    </div>
  );
};
