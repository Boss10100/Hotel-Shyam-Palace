import {
  DEFAULT_CATEGORY_IMAGES,
  DEFAULT_HERO_IMAGE,
  DEFAULT_RESTAURANT_IMAGE,
} from '../utils/media';

export type RoomCategory = 'Small AC' | 'Deluxe' | 'Large Non-AC' | 'Common';

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning';

export type HousekeepingStatus = 'clean' | 'dirty' | 'in_progress' | 'inspected';

export interface Room {
  id: string; // e.g. "101"
  roomNumber: string;
  category: RoomCategory;
  floor: number;
  baseRate: number;
  isAc: boolean;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  photoUrl?: string; // Custom room photo URL / Data URL, or '__DELETED__'
  gallery?: string[];
  description?: string;
  notes?: string;
  currentBookingId?: string;
  currentGuestName?: string;
  updatedAt?: string;
}

export type GalleryCategory = 'hotel' | 'room' | 'restaurant' | 'mandir';

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  category: GalleryCategory;
  roomCategory?: RoomCategory;
  roomId?: string;
  imageUrl: string;
  featured?: boolean;
  uploadedByStaffName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type BookingStatus =
  | 'new_request'
  | 'awaiting_confirmation'
  | 'awaiting_advance'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'refund_pending'
  | 'refunded';

export type BookingSource =
  | 'walk_in'
  | 'phone'
  | 'whatsapp'
  | 'website_request'
  | 'counter'
  | 'other';

export interface BookingGuest {
  name: string;
  age?: number;
  gender?: string;
  idProofRef?: string;
}

export interface Booking {
  id: string; // e.g. "HSP-2026-001"
  bookingId: string;
  referenceNumber: string; // Guest facing reference, e.g. "REQ-94812" or "HSP-101"
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestAddress?: string;
  guestCount: number;
  additionalGuests?: BookingGuest[];
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm
  checkOutTime?: string; // HH:mm
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  roomCategory: RoomCategory;
  assignedRoomId?: string; // e.g. "101"
  quotedRate: number;
  totalNights: number;
  roomCharges: number;
  extraCharges?: number;
  discount?: number;
  subtotal: number;
  gstRate: number; // default 12
  gstAmount: number;
  totalAmount: number;
  advanceAmount: number;
  amountPaid: number;
  balanceDue: number;
  bookingSource: BookingSource;
  status: BookingStatus;
  isDraft?: boolean;
  arrivalDeadline?: string; // "1:00 PM on check-in date"
  createdByStaffId?: string;
  createdByStaffName?: string;
  specialRequests?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  // Guest KYC snapshot for quick reference
  kycDocType?: string;
  kycDocNumberMasked?: string;
  kycDocUrl?: string;
  guestPhotoUrl?: string;
  kycVerified?: boolean;
}

export type PaymentMethod = 'cash' | 'upi' | 'youpi_pg' | 'bank_transfer' | 'card' | 'other';
export type PaymentStatus = 'completed' | 'pending_verification' | 'failed' | 'refunded' | 'reversed';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionRef?: string;
  notes?: string;
  recordedByStaffId?: string;
  recordedByStaffName?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  bookingId: string;
  paymentId?: string;
  amountRequested: number;
  deductionAmount: number;
  netRefundAmount: number;
  reason: string;
  refundStatus: 'pending' | 'initiated' | 'completed';
  transactionRef?: string;
  approvedByStaffId?: string;
  approvedByStaffName?: string;
  createdAt: string;
}

export interface Guest {
  id: string; // phone number or id
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  idType?: 'Aadhaar' | 'Passport' | 'Voter ID' | 'Driving License' | 'Other';
  idNumberMasked?: string;
  idDocumentUrl?: string; // Data URL or storage link
  photoUrl?: string; // Guest photo snapshot
  totalStays: number;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string; // e.g. "INV-HSP-2026-001"
  invoiceNumber: string;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  guestAddress?: string;
  guestGstin?: string;
  roomNumber: string;
  roomCategory: RoomCategory;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  roomRate: number;
  fnbCharges?: number;
  subtotal: number;
  cgstRate: number; // 6%
  cgstAmount: number;
  sgstRate: number; // 6%
  sgstAmount: number;
  totalTax: number;
  totalAmount: number;
  advancePaid: number;
  balancePaid: number;
  balanceDue?: number;
  paymentMode: string;
  issuedAt: string;
  issuedByStaffName: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'linens' | 'toiletries' | 'cleaning' | 'beverages' | 'supplies';
  currentQuantity: number;
  unit: string;
  minStockLevel: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  recordedByStaffName: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  roomId: string;
  issueTitle: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  reportedBy: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  reason?: string;
  timestamp: string;
}

export interface WhatsAppLog {
  id: string;
  bookingId?: string;
  recipientPhone: string;
  guestName?: string;
  templateType: string;
  messageBody: string;
  status: 'delivered' | 'queued' | 'failed';
  engine: 'baileys' | 'whatsapp-web.js';
  sessionId: string;
  timestamp: string;
}

export interface HotelSettings {
  id: string;
  hotelName: string;
  brandName: string;
  tagline?: string;
  address: string;
  phone: string;
  email: string;
  upiId: string;
  upiQrNote: string;
  defaultAdvanceAmount: number;
  defaultGstRate: number;
  defaultCheckoutTime: string;
  defaultArrivalDeadline: string;
  cancellationRules: string;
  // Branding & Tax / Bank Details
  logoUrl?: string;
  heroImageUrl?: string;
  restaurantImageUrl?: string;
  categoryImages?: Record<RoomCategory, string>;
  gstNumber?: string;
  fssaiNumber?: string;
  stateName?: string;
  stateCode?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  accountHolderName?: string;
  bankBranch?: string;
  invoiceTerms?: string[];
  invoiceNote?: string;
  // OpenWA (https://github.com/rmyndharis/OpenWA.git) Configuration
  openWaEnabled?: boolean;
  openWaEngine?: 'baileys' | 'whatsapp-web.js';
  openWaSessionName?: string;
  openWaServerUrl?: string;
  openWaApiKey?: string;
  openWaConnected?: boolean;
  whatsappConnectedNumber?: string;
  whatsappStatus?: 'connected' | 'disconnected';
  whatsappPairingCode?: string;
  whatsappQrData?: string;
  openWaAutoBookingConfirm?: boolean;
  openWaAutoCheckInSlip?: boolean;
  openWaAutoCheckoutInvoice?: boolean;
  whatsappAutoSendBookingConfirmation?: boolean;
  whatsappAutoSendAdvanceReceipt?: boolean;
  whatsappAutoSendCheckIn?: boolean;
  whatsappAutoSendCheckOut?: boolean;
  // YouPI-PG (https://github.com/youpi-pg/YouPI-PG.git) Configuration
  youpiEnabled?: boolean;
  youpiAutoVerify?: boolean;
  youpiMerchantVpa?: string;
  youpiMerchantName?: string;
  youpiPayeeName?: string;
  youpiMcc?: string;
  youpiGatewayUrl?: string;
  youpiApiEndpoint?: string;
  youpiApiKey?: string;
  youpiObserverSecret?: string;
  updatedAt: string;
}

export type ExternalDbProvider =
  | 'custom_firebase'
  | 'supabase'
  | 'mongodb_atlas'
  | 'custom_rest_webhook'
  | 'custom_rest_sql'
  | 'google_sheets_webhook';

export interface ExternalDatabaseConfig {
  id: string;
  name: string;
  provider: ExternalDbProvider;
  enabled: boolean;
  // For Custom Firebase Firestore
  firebaseProjectId?: string;
  firebaseApiKey?: string;
  firebaseAppId?: string;
  firebaseDatabaseId?: string;
  firebaseRawJson?: string;
  // For Supabase
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseTableName?: string;
  // For MongoDB Atlas Data API
  mongoEndpointUrl?: string;
  mongoApiKey?: string;
  mongoDataSource?: string;
  mongoDatabaseName?: string;
  mongoCollectionName?: string;
  // For Custom REST / SQL / Google Sheets Webhook
  webhookUrl?: string;
  webhookSecretHeader?: string;
  endpointUrl?: string;
  apiKey?: string;
  tableName?: string;
  databaseName?: string;
  dataSource?: string;
  authHeaderName?: string;
  status?: 'connected' | 'untested' | 'error';
  lastStatus?: 'connected' | 'untested' | 'error';
  lastSyncedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
}

export type StaffRole = 'super_admin' | 'admin' | 'receptionist' | 'accountant' | 'housekeeping';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  status?: 'approved' | 'pending' | 'rejected';
  avatarUrl?: string;
}

export interface StaffInvite {
  id: string;
  email: string;
  name?: string;
  role: StaffRole;
  status: 'active' | 'revoked';
  invitedBy: string;
  createdAt: string;
}

export interface StaffAccessRequest {
  id: string;
  userId: string;
  email: string;
  name: string;
  requestedRole: StaffRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  device?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Exactly 16 Rooms Initial Seed Definition
export const INITIAL_ROOMS_INVENTORY: Omit<Room, 'updatedAt'>[] = [
  { id: '101', roomNumber: '101', category: 'Small AC', floor: 1, baseRate: 1500, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '102', roomNumber: '102', category: 'Small AC', floor: 1, baseRate: 1500, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '103', roomNumber: '103', category: 'Small AC', floor: 1, baseRate: 1500, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '104', roomNumber: '104', category: 'Small AC', floor: 1, baseRate: 1500, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '105', roomNumber: '105', category: 'Common', floor: 1, baseRate: 800, isAc: false, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '201', roomNumber: '201', category: 'Small AC', floor: 2, baseRate: 1500, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '202', roomNumber: '202', category: 'Large Non-AC', floor: 2, baseRate: 1200, isAc: false, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '203', roomNumber: '203', category: 'Small AC', floor: 2, baseRate: 1500, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '204', roomNumber: '204', category: 'Common', floor: 2, baseRate: 800, isAc: false, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '205', roomNumber: '205', category: 'Deluxe', floor: 2, baseRate: 1600, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '206', roomNumber: '206', category: 'Large Non-AC', floor: 2, baseRate: 1200, isAc: false, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '207', roomNumber: '207', category: 'Deluxe', floor: 2, baseRate: 1600, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '208', roomNumber: '208', category: 'Deluxe', floor: 2, baseRate: 1600, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '209', roomNumber: '209', category: 'Large Non-AC', floor: 2, baseRate: 1200, isAc: false, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '210', roomNumber: '210', category: 'Deluxe', floor: 2, baseRate: 1600, isAc: true, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
  { id: '211', roomNumber: '211', category: 'Large Non-AC', floor: 2, baseRate: 1200, isAc: false, status: 'available', housekeepingStatus: 'clean', photoUrl: '' },
];

export const INITIAL_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-deluxe-205',
    title: 'Royal Deluxe AC Suite (Rooms 205, 207, 208, 210)',
    caption: 'King-size comfort with split air conditioning, pure cotton linen, and temple view balcony.',
    category: 'room',
    roomCategory: 'Deluxe',
    imageUrl: DEFAULT_CATEGORY_IMAGES['Deluxe'],
    featured: true,
    uploadedByStaffName: 'Hotel Management',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'gal-smallac-101',
    title: 'Small AC Comfort Room (Rooms 101–104, 201, 203)',
    caption: 'Quiet, sanitized air-conditioned double room with 24/7 power backup and hot water.',
    category: 'room',
    roomCategory: 'Small AC',
    imageUrl: DEFAULT_CATEGORY_IMAGES['Small AC'],
    featured: true,
    uploadedByStaffName: 'Hotel Management',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'gal-nonac-202',
    title: 'Spacious Large Non-AC Family Room (Rooms 202, 206, 209, 211)',
    caption: 'Cross-ventilated family room accommodating 2–4 yatris comfortably.',
    category: 'room',
    roomCategory: 'Large Non-AC',
    imageUrl: DEFAULT_CATEGORY_IMAGES['Large Non-AC'],
    featured: true,
    uploadedByStaffName: 'Hotel Management',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'gal-common-105',
    title: 'Yatri Common Room (Rooms 105, 204)',
    caption: 'Clean, peaceful budget accommodation for devotees visiting Pandokhar Dham.',
    category: 'room',
    roomCategory: 'Common',
    imageUrl: DEFAULT_CATEGORY_IMAGES['Common'],
    featured: false,
    uploadedByStaffName: 'Hotel Management',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'gal-hotel-facade',
    title: 'Hotel Shyam Palace — Main Sanctuary Facade',
    caption: 'Located walking distance from Pandokhar Sarkar Peeth, Kali Maiya Mandir & Panch Akhada.',
    category: 'hotel',
    imageUrl: DEFAULT_HERO_IMAGE,
    featured: true,
    uploadedByStaffName: 'Hotel Management',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'gal-restaurant-thali',
    title: 'Shree H.V.M Pure Satvik Restaurant & Bhojanalaya',
    caption: 'Freshly prepared pure vegetarian North Indian & Bundelkhandi thalis on the ground floor.',
    category: 'restaurant',
    imageUrl: DEFAULT_RESTAURANT_IMAGE,
    featured: true,
    uploadedByStaffName: 'Hotel Management',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'item-bedsheet-ac',
    name: 'White AC Cotton Bed Sheets (King/Double)',
    category: 'linens',
    currentQuantity: 45,
    unit: 'sets',
    minStockLevel: 20,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-bedsheet-nonac',
    name: 'Standard Non-AC Bed Sheets',
    category: 'linens',
    currentQuantity: 30,
    unit: 'sets',
    minStockLevel: 15,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-pillow-covers',
    name: 'Fresh White Pillow Covers (Pair)',
    category: 'linens',
    currentQuantity: 60,
    unit: 'pairs',
    minStockLevel: 25,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-bath-towels',
    name: 'Sanitized Cotton Bath Towels',
    category: 'linens',
    currentQuantity: 40,
    unit: 'pcs',
    minStockLevel: 20,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-blankets-dohars',
    name: 'Warm Blankets / Quilts (Dohars)',
    category: 'linens',
    currentQuantity: 32,
    unit: 'pcs',
    minStockLevel: 16,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-soaps',
    name: 'Herbal Guest Bath Soaps',
    category: 'toiletries',
    currentQuantity: 150,
    unit: 'bars',
    minStockLevel: 50,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-water-cans',
    name: '20L RO Pure Drinking Water Cans',
    category: 'beverages',
    currentQuantity: 18,
    unit: 'cans',
    minStockLevel: 8,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'item-room-spray',
    name: 'Sandalwood Room Freshener & Floor Cleaner',
    category: 'cleaning',
    currentQuantity: 12,
    unit: 'bottles',
    minStockLevel: 4,
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_HOTEL_SETTINGS: HotelSettings = {
  id: 'general',
  hotelName: 'Hotel Shyam Palace',
  brandName: 'Shree H.V.M Hotel and Restaurant',
  tagline: 'Near Kali Maiya Mandir, Pandokhar Sarkar Dham',
  address: 'Pandokhar Sarkar Dham, Bhander, Near Kali Maiya Mandir, Panch Akhada, Pandokhar, Madhya Pradesh 475335, India.',
  phone: '7000354771',
  email: 'support.shyampalace@gmail.com',
  upiId: '7000354771@upi',
  upiQrNote: 'Pay ₹500 advance via YouPI-PG (PhonePe/GPay/Paytm) to 7000354771@upi for booking confirmation',
  defaultAdvanceAmount: 500,
  defaultGstRate: 12,
  defaultCheckoutTime: '12:00 PM',
  defaultArrivalDeadline: '1:00 PM on check-in date',
  cancellationRules: 'Full ₹500 advance refund if cancelled 2+ days before check-in. ₹400 refund (₹100 deduction) if cancelled 1 day before or on check-in date.',
  logoUrl: '',
  heroImageUrl: '',
  restaurantImageUrl: '',
  categoryImages: {
    'Deluxe': '',
    'Small AC': '',
    'Large Non-AC': '',
    'Common': '',
  },
  gstNumber: '23AAACH7000B1Z8',
  fssaiNumber: '11426000102938',
  stateName: 'Madhya Pradesh',
  stateCode: '23',
  bankName: 'State Bank of India',
  bankAccountNo: '392019482910',
  bankIfsc: 'SBIN0001234',
  accountHolderName: 'Shree H.V.M Hotel and Restaurant',
  bankBranch: 'Bhander Branch, Datia',
  invoiceTerms: [
    'Standard Check-Out time is 12:00 PM. Late check-out is subject to availability.',
    'Confirmed reservations require arrival by 1:00 PM on check-in date.',
    'Original Government Photo ID (Aadhaar / Voter ID / Passport) is mandatory for all guests at check-in.',
    'Pure Satvik vegetarian norms are strictly observed inside Hotel Shyam Palace premises.',
  ],
  invoiceNote: 'Jai Shree Shyam! Thank you for staying at Hotel Shyam Palace, Pandokhar Sarkar Dham.',
  // OpenWA Defaults — Disconnected by default so user connects manually
  openWaEnabled: true,
  openWaEngine: 'baileys',
  openWaSessionName: 'shyam-palace-desk',
  openWaServerUrl: '',
  openWaApiKey: '',
  openWaConnected: false,
  whatsappConnectedNumber: '',
  whatsappStatus: 'disconnected',
  whatsappPairingCode: '',
  openWaAutoBookingConfirm: true,
  openWaAutoCheckInSlip: true,
  openWaAutoCheckoutInvoice: true,
  whatsappAutoSendBookingConfirmation: true,
  whatsappAutoSendAdvanceReceipt: true,
  whatsappAutoSendCheckIn: true,
  whatsappAutoSendCheckOut: true,
  // YouPI-PG Defaults
  youpiEnabled: true,
  youpiAutoVerify: true,
  youpiMerchantVpa: '7000354771@upi',
  youpiMerchantName: 'Hotel Shyam Palace',
  youpiPayeeName: 'Shree H.V.M Hotel and Restaurant',
  youpiMcc: '7011',
  youpiGatewayUrl: 'http://localhost:3000/api/youpi-pg',
  youpiApiEndpoint: 'http://localhost:3000/api/youpi-pg',
  youpiApiKey: 'youpi_live_hsp_2026',
  youpiObserverSecret: 'youpi-hsp-observer-2026',
  updatedAt: '2020-01-01T00:00:00.000Z',
};
