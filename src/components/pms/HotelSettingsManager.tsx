import React, { useState, useEffect, useRef } from 'react';
import {
  HotelSettings,
  StaffUser,
  Invoice,
  Booking,
  StaffInvite,
  StaffAccessRequest,
  StaffRole,
  RoomCategory,
  WhatsAppLog,
} from '../../types/hotel';
import {
  updateHotelSettings,
  updateHotelCategoryPhoto,
  subscribeStaffInvites,
  addStaffInvite,
  deleteStaffInvite,
  subscribeStaffRequests,
  approveStaffAccessRequest,
  rejectStaffAccessRequest,
  subscribeWhatsAppLogs,
} from '../../services/db';
import {
  compressImageFile,
  DELETED_PHOTO_SENTINEL,
  DEFAULT_HERO_IMAGE,
  DEFAULT_RESTAURANT_IMAGE,
  DEFAULT_CATEGORY_IMAGES,
  PRESET_ROOM_PHOTOS,
  resolveRoomPhoto,
} from '../../utils/media';
import { SUPER_ADMIN_EMAIL } from '../../context/AuthContext';
import { YouPiPaymentModal } from '../common/YouPiPaymentModal';
import {
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Building2,
  Loader2,
  Send,
  CreditCard,
  FileText,
  ShieldCheck,
  QrCode,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Smartphone,
  Check,
  Users,
  UserCheck,
  UserX,
  Copy,
  Zap,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Database,
} from 'lucide-react';
import {
  getOpenWaGatewayStatus,
  requestOpenWaQrPairing,
  requestOpenWaPhonePairingCode,
  confirmOpenWaDeviceLink,
  disconnectOpenWaSession,
  sendAutomatedWhatsApp,
} from '../../services/whatsapp';
import { PrintableInvoice } from '../common/PrintableInvoice';
import { PrintableRegCard } from '../common/PrintableRegCard';
import { PrintableAdvanceReceipt } from '../common/PrintableAdvanceReceipt';
import { MultiDatabaseManager } from './MultiDatabaseManager';

type SettingsTabType =
  | 'branding'
  | 'statutory'
  | 'banking'
  | 'terms'
  | 'whatsapp'
  | 'youpi'
  | 'staff_whitelist'
  | 'database'
  | 'preview';

interface Props {
  settings: HotelSettings;
  staffUser: StaffUser;
  initialTab?: SettingsTabType;
  onTabChange?: (tab: SettingsTabType) => void;
}

export const HotelSettingsManager: React.FC<Props> = ({
  settings,
  staffUser,
  initialTab = 'branding',
  onTabChange,
}) => {
  const [formData, setFormData] = useState<HotelSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  // Sync when settings update externally
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...settings,
      categoryImages: {
        Deluxe: settings.categoryImages?.Deluxe || '',
        'Small AC': settings.categoryImages?.['Small AC'] || '',
        'Large Non-AC': settings.categoryImages?.['Large Non-AC'] || '',
        Common: settings.categoryImages?.Common || '',
      },
    }));
  }, [settings]);

  // Active section tab synced with URL router
  const [activeTabState, setActiveTabState] = useState<SettingsTabType>(initialTab);
  useEffect(() => {
    if (initialTab) setActiveTabState(initialTab);
  }, [initialTab]);

  const setActiveTab = (tab: SettingsTabType) => {
    setActiveTabState(tab);
    if (onTabChange) onTabChange(tab);
  };
  const activeTab = activeTabState;

  // File refs for Replace buttons inside Settings
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [changePhotoModal, setChangePhotoModal] = useState<{
    target: 'logo' | 'hero' | 'restaurant' | RoomCategory;
    label: string;
  } | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Staff Whitelist & Super Admin Approvals State
  const [staffInvites, setStaffInvites] = useState<StaffInvite[]>([]);
  const [staffRequests, setStaffRequests] = useState<StaffAccessRequest[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteName, setNewInviteName] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<StaffRole>('receptionist');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // YouPI-PG Gateway State
  const [testYouPiModalOpen, setTestYouPiModalOpen] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // OpenWA Gateway Session State (https://github.com/rmyndharis/OpenWA.git)
  // Starts DISCONNECTED by default — user manually connects their own WhatsApp
  const [phoneToLink, setPhoneToLink] = useState<string>('');
  const [openWaEngine, setOpenWaEngine] = useState<'baileys' | 'whatsapp-web.js'>(
    formData.openWaEngine || 'baileys'
  );
  const [openWaSessionName, setOpenWaSessionName] = useState<string>(
    formData.openWaSessionName || 'shyam-palace-desk'
  );
  const [openWaServerUrl, setOpenWaServerUrl] = useState<string>(
    formData.openWaServerUrl || 'http://localhost:2785'
  );
  const [openWaApiKey, setOpenWaApiKey] = useState<string>(
    formData.openWaApiKey || 'openwa-hsp-live-key'
  );
  const [linkMode, setLinkMode] = useState<'qr' | 'pairing_code'>('qr');
  const [webStatus, setWebStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [qrLoading, setQrLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [qrCodeSvgUrl, setQrCodeSvgUrl] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');

  // Test Dispatch Console State
  const [testNumber, setTestNumber] = useState<string>(formData.phone || '7000354771');
  const [testTemplate, setTestTemplate] = useState<string>('booking_confirmation');
  const [customMsgText, setCustomMsgText] = useState<string>('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Bill Preview Modal
  const [previewModal, setPreviewModal] = useState<'invoice' | 'regCard' | 'advance' | null>(null);

  // New term input
  const [newTermInput, setNewTermInput] = useState('');

  // Sample data for preview
  const sampleInvoice: Invoice = {
    id: 'INV-HSP-2026-9042',
    invoiceNumber: 'INV-HSP-2026-9042',
    bookingId: 'HSP-169897',
    guestName: 'Shyam Sundar Sharma',
    guestPhone: formData.phone || '7000354771',
    guestAddress: 'Indore, Madhya Pradesh',
    roomNumber: '205',
    roomCategory: 'Deluxe',
    checkInDate: '2026-10-28',
    checkOutDate: '2026-10-30',
    totalNights: 2,
    roomRate: 1600,
    subtotal: 3200,
    cgstRate: 6,
    cgstAmount: 192,
    sgstRate: 6,
    sgstAmount: 192,
    totalTax: 384,
    totalAmount: 3584,
    advancePaid: 500,
    balancePaid: 3084,
    balanceDue: 0,
    paymentMode: 'YouPI-PG UPI / Cash',
    issuedAt: new Date().toISOString(),
    issuedByStaffName: staffUser.name || 'Front Desk',
  };

  const sampleBooking: Booking = {
    id: 'HSP-169897',
    bookingId: 'HSP-169897',
    referenceNumber: 'WALK-169897',
    guestName: 'Shyam Sundar Sharma',
    guestPhone: formData.phone || '7000354771',
    guestCount: 2,
    checkInDate: '2026-10-28',
    checkOutDate: '2026-10-30',
    roomCategory: 'Deluxe',
    assignedRoomId: '205',
    quotedRate: 1600,
    totalNights: 2,
    roomCharges: 3200,
    subtotal: 3200,
    gstRate: 12,
    gstAmount: 384,
    totalAmount: 3584,
    advanceAmount: 500,
    amountPaid: 500,
    balanceDue: 3084,
    bookingSource: 'phone',
    status: 'confirmed',
    arrivalDeadline: '1:00 PM on check-in date',
    kycDocType: 'Aadhaar Card',
    kycDocNumberMasked: 'XXXX-XXXX-4912',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Subscribe to live staff invitations, requests, and OpenWA logs
  useEffect(() => {
    const unsubInvites = subscribeStaffInvites((invs) => setStaffInvites(invs || []));
    const unsubRequests = subscribeStaffRequests((reqs) => setStaffRequests(reqs || []));
    const unsubWaLogs = subscribeWhatsAppLogs((logs) => setWhatsappLogs(logs || []));
    return () => {
      unsubInvites();
      unsubRequests();
      unsubWaLogs();
    };
  }, []);

  // Poll live OpenWA backend status while on WhatsApp tab (never auto-connect without user action)
  useEffect(() => {
    let timer: any;
    const checkStatus = async () => {
      const st = await getOpenWaGatewayStatus();
      if (st.connected && st.status === 'WORKING') {
        setWebStatus('connected');
        if (st.linkedPhone) {
          setPhoneToLink(st.linkedPhone);
        }
      } else {
        setWebStatus('disconnected');
        if (st.qrCodeDataUrl) {
          setQrCodeSvgUrl(st.qrCodeDataUrl);
        }
        if (st.pairingCode) {
          setPairingCode(st.pairingCode);
        }
      }
    };

    checkStatus();
    if (activeTab === 'whatsapp') {
      timer = setInterval(checkStatus, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTab, openWaServerUrl, openWaApiKey]);

  // Photo Management Helpers inside Hotel Settings (Delete, Replace, Change)
  const handlePropertyPhotoAction = async (
    target: 'logo' | 'hero' | 'restaurant' | RoomCategory,
    action: 'delete' | 'replace' | 'change' | 'restore',
    newUrl = ''
  ) => {
    const finalVal =
      action === 'delete'
        ? DELETED_PHOTO_SENTINEL
        : action === 'restore'
        ? ''
        : newUrl.trim();

    try {
      if (target === 'logo' || target === 'hero' || target === 'restaurant') {
        const fieldName =
          target === 'logo'
            ? 'logoUrl'
            : target === 'hero'
            ? 'heroImageUrl'
            : 'restaurantImageUrl';
        const updated = { ...formData, [fieldName]: finalVal };
        setFormData(updated);
        await updateHotelSettings({ [fieldName]: finalVal }, staffUser);
        setPhotoNotice(`Hotel ${target} photo updated (${action}) and synced live!`);
      } else {
        const updatedCatImages: Record<RoomCategory, string> = {
          Deluxe: formData.categoryImages?.Deluxe || '',
          'Small AC': formData.categoryImages?.['Small AC'] || '',
          'Large Non-AC': formData.categoryImages?.['Large Non-AC'] || '',
          Common: formData.categoryImages?.Common || '',
          [target]: finalVal,
        };
        setFormData((prev) => ({
          ...prev,
          categoryImages: updatedCatImages,
        }));
        await updateHotelCategoryPhoto(target, newUrl, action, formData, staffUser);
        setPhotoNotice(`${target} category default photo updated (${action}) and synced live!`);
      }
      setTimeout(() => setPhotoNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update photo');
    }
  };

  const handlePropertyFileUpload = async (
    target: 'logo' | 'hero' | 'restaurant' | RoomCategory,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      await handlePropertyPhotoAction(target, 'replace', compressed);
    } catch (err: any) {
      setError(err.message || 'Failed to compress and replace image');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleAddStaffInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;
    setInviteSaving(true);
    setError(null);
    try {
      await addStaffInvite(
        newInviteEmail.trim(),
        newInviteRole,
        newInviteName.trim(),
        staffUser.name || 'Super Admin'
      );
      setNewInviteEmail('');
      setNewInviteName('');
      setInviteSuccess(`Successfully whitelisted ${newInviteEmail}! They can now log in directly.`);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to add staff invite');
    } finally {
      setInviteSaving(false);
    }
  };

  const handleDeleteStaffInvite = async (inviteId: string, email: string) => {
    try {
      await deleteStaffInvite(inviteId);
      setInviteSuccess(`Removed ${email} from authorized staff whitelist.`);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete invite');
    }
  };

  const handleApproveRequest = async (req: StaffAccessRequest, assignedRole?: StaffRole) => {
    try {
      await approveStaffAccessRequest(
        req.id,
        req.userId,
        req.email,
        req.name,
        assignedRole || req.requestedRole || 'receptionist',
        staffUser.name || 'Super Admin'
      );
      setInviteSuccess(`Approved access for ${req.email}! Staff user is now authorized.`);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve staff request');
    }
  };

  const handleRejectRequest = async (req: StaffAccessRequest) => {
    try {
      await rejectStaffAccessRequest(req.id, req.userId, staffUser.name || 'Super Admin');
      setInviteSuccess(`Rejected access request for ${req.email}.`);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to reject staff request');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const merged: HotelSettings = {
        ...formData,
        openWaEngine,
        openWaSessionName,
        openWaServerUrl,
        openWaApiKey,
        youpiMerchantName: formData.youpiPayeeName || formData.youpiMerchantName || formData.hotelName,
        youpiPayeeName: formData.youpiPayeeName || formData.youpiMerchantName || formData.hotelName,
        youpiGatewayUrl: formData.youpiApiEndpoint || formData.youpiGatewayUrl || 'http://localhost:3000/api/youpi-pg',
      };
      await updateHotelSettings(merged, staffUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update hotel settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshQr = async (targetNumber?: string) => {
    setQrLoading(true);
    setConnectionNotice(null);
    setError(null);
    const num = (targetNumber || phoneToLink || '').replace(/\D/g, '');
    try {
      const data = await requestOpenWaQrPairing(
        openWaEngine,
        openWaSessionName,
        openWaServerUrl,
        openWaApiKey
      );
      if (data.pairingCode) setPairingCode(data.pairingCode);
      if (data.qrCodeDataUrl) setQrCodeSvgUrl(data.qrCodeDataUrl);
      if (num) {
        setFormData((prev) => ({
          ...prev,
          openWaEngine,
          openWaSessionName,
          openWaServerUrl,
        }));
      }
      setConnectionNotice(
        'Live WhatsApp Multi-Device QR generated! Open WhatsApp on your phone → Linked Devices → Link a Device and scan this QR code.'
      );
    } catch (err: any) {
      console.warn('OpenWA QR refresh warning:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleRequestPairingCode = async () => {
    const cleanNum = phoneToLink.replace(/\D/g, '');
    if (cleanNum.length < 10) {
      setError('Enter your 10-digit WhatsApp mobile number above first to generate an 8-digit pairing code.');
      return;
    }
    setQrLoading(true);
    setError(null);
    try {
      const res = await requestOpenWaPhonePairingCode(cleanNum);
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
        setConnectionNotice(
          `WhatsApp 8-Digit Pairing Code generated for +91 ${cleanNum}: ${res.pairingCode}. Enter it in WhatsApp → Linked Devices → Link with phone number instead.`
        );
      } else {
        setError(res.error || 'Could not request pairing code. Try scanning the QR code instead.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate pairing code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleLoginOpenWa = async () => {
    const cleanNum = phoneToLink.replace(/\D/g, '');
    if (cleanNum.length < 10) {
      setError('Please enter a valid 10-digit mobile number to link with OpenWA Gateway.');
      return;
    }
    setIsConnecting(true);
    setConnectionNotice(null);
    try {
      const res = await confirmOpenWaDeviceLink(cleanNum, openWaEngine, openWaSessionName);
      if (res.connected) {
        setWebStatus('connected');
        const updated: HotelSettings = {
          ...formData,
          openWaConnected: true,
          openWaEngine,
          openWaSessionName,
          openWaServerUrl,
          openWaApiKey,
          whatsappStatus: 'connected',
          whatsappConnectedNumber: cleanNum,
          whatsappPairingCode: pairingCode,
        };
        setFormData(updated);
        await updateHotelSettings(updated, staffUser);
        setConnectionNotice(
          `OpenWA Gateway (${openWaEngine}) connected with +91 ${cleanNum} (Session: ${openWaSessionName})!`
        );
      }
    } catch (err: any) {
      setError(`Failed to connect OpenWA session: ${err.message}`);
    } finally {
      setIsConnecting(false);
      setTimeout(() => setConnectionNotice(null), 6000);
    }
  };

  const handleDisconnectOpenWa = async () => {
    setIsConnecting(true);
    setConnectionNotice(null);
    try {
      await disconnectOpenWaSession();
      setWebStatus('disconnected');
      const updated: HotelSettings = {
        ...formData,
        openWaConnected: false,
        whatsappStatus: 'disconnected',
      };
      setFormData(updated);
      await updateHotelSettings(updated, staffUser);
      setConnectionNotice('OpenWA session logged out. You can now scan QR or link any new phone number.');
    } catch (err: any) {
      setError(`Disconnect error: ${err.message}`);
    } finally {
      setIsConnecting(false);
      setTimeout(() => setConnectionNotice(null), 5000);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!testNumber) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await sendAutomatedWhatsApp({
        recipientPhone: testNumber,
        templateType: testTemplate as any,
        engine: openWaEngine,
        sessionName: openWaSessionName,
        bookingData: {
          ...sampleBooking,
          hotelName: formData.hotelName,
          brandName: formData.brandName,
          gstNumber: formData.gstNumber,
        },
        customMessage: customMsgText.trim() || undefined,
      });

      if (res.success) {
        setTestResult(
          `OpenWA (${res.engine}) dispatched message to +91 ${testNumber}! Msg ID: ${res.messageId}`
        );
      }
    } catch (err: any) {
      setTestResult(`OpenWA dispatch: ${err.message || 'Completed'}`);
    } finally {
      setTestSending(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  const handleAddTerm = () => {
    if (!newTermInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      invoiceTerms: [...(prev.invoiceTerms || []), newTermInput.trim()],
    }));
    setNewTermInput('');
  };

  const handleRemoveTerm = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      invoiceTerms: (prev.invoiceTerms || []).filter((_, idx) => idx !== index),
    }));
  };

  const categoriesList: RoomCategory[] = ['Deluxe', 'Small AC', 'Large Non-AC', 'Common'];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-luxury text-white">
              Hotel Photos, OpenWA Gateway, YouPI-PG & Settings
            </h2>
            <p className="text-xs text-slate-400">
              Manage hotel & room photos (Delete, Replace, Change), OpenWA WhatsApp automation, YouPI-PG UPI QR, and GST billing.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50 text-xs shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>All hotel branding, photos, OpenWA, YouPI-PG, and billing settings have been saved!</span>
        </div>
      )}

      {photoNotice && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{photoNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Branding & Photos</span>
        </button>

        <button
          onClick={() => setActiveTab('statutory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'statutory'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>2. GST & Tax Info</span>
        </button>

        <button
          onClick={() => setActiveTab('banking')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'banking'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>3. Bank & UPI Account</span>
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Bill Terms & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-emerald-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>5. OpenWA Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('youpi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'youpi'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-amber-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>6. YouPI-PG Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('staff_whitelist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer relative ${
            activeTab === 'staff_whitelist'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>7. Staff Whitelist & Approvals</span>
          {staffRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-emerald-400 hover:text-white hover:bg-slate-800 border border-emerald-500/30'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>8. Multi-Database & Backup</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>9. Live Bills Preview</span>
        </button>
      </div>

      {/* TAB 1: Logo, Identity & Hotel/Room Photos (Delete, Replace, Change) */}
      {activeTab === 'branding' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Hotel Property Identity & Photo Controls (Delete • Replace • Change)</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Manage your hotel logo, hero banner, restaurant photo, and all 4 room category photos. Every change syncs live to the public website.
            </p>
          </div>

          {/* Hotel Logo + Hero Banner + Restaurant Photo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: 'logo' as const,
                title: 'Hotel Brand Logo',
                raw: formData.logoUrl,
                fallback: '',
              },
              {
                key: 'hero' as const,
                title: 'Main Website Hero Banner',
                raw: formData.heroImageUrl,
                fallback: DEFAULT_HERO_IMAGE,
              },
              {
                key: 'restaurant' as const,
                title: 'Shree H.V.M Restaurant Photo',
                raw: formData.restaurantImageUrl,
                fallback: DEFAULT_RESTAURANT_IMAGE,
              },
            ].map((item) => {
              const isDeleted = item.raw === DELETED_PHOTO_SENTINEL;
              const displayUrl = isDeleted ? '' : item.raw || item.fallback;
              const inputRefKey = `prop-file-${item.key}`;

              return (
                <div
                  key={item.key}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative h-36 bg-slate-900 flex items-center justify-center overflow-hidden">
                    {isDeleted || !displayUrl ? (
                      <div className="text-center p-3">
                        <ImageIcon className="w-7 h-7 text-slate-600 mx-auto mb-1" />
                        <span className="text-[11px] font-bold text-rose-400 block">
                          {isDeleted ? 'Photo Deleted' : 'No Custom Logo'}
                        </span>
                        {isDeleted && (
                          <button
                            type="button"
                            onClick={() => handlePropertyPhotoAction(item.key, 'restore')}
                            className="mt-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore Default</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <img src={displayUrl} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-2 left-2 bg-slate-950/90 border border-slate-700 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                      {item.title}
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => {
                      fileInputRefs.current[inputRefKey] = el;
                    }}
                    onChange={(e) => handlePropertyFileUpload(item.key, e)}
                    className="hidden"
                  />

                  <div className="p-3 grid grid-cols-3 gap-1.5 bg-slate-950 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handlePropertyPhotoAction(item.key, 'delete')}
                      disabled={isDeleted}
                      className="py-1.5 px-2 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[inputRefKey]?.click()}
                      className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-amber-500/30"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChangePhotoModal({ target: item.key, label: item.title });
                        setCustomUrlInput('');
                      }}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-400" />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4 Room Category Default Photos (Delete, Replace, Change) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider">
              Room Category Default Photos (Synced to Public Website Room Cards)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoriesList.map((cat) => {
                const resolved = resolveRoomPhoto(
                  formData.categoryImages?.[cat],
                  cat,
                  formData.categoryImages
                );
                const inputRefKey = `cat-setting-${cat}`;

                return (
                  <div
                    key={cat}
                    className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative h-32 bg-slate-900">
                      {resolved.isDeleted ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <span className="text-[11px] font-bold text-rose-400">Deleted</span>
                          <button
                            type="button"
                            onClick={() => handlePropertyPhotoAction(cat, 'restore')}
                            className="mt-1 px-2 py-1 bg-slate-800 text-amber-300 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                      ) : (
                        <img
                          src={resolved.url || DEFAULT_CATEGORY_IMAGES[cat]}
                          alt={cat}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute top-2 left-2 bg-slate-950/90 border border-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {cat}
                      </span>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => {
                        fileInputRefs.current[inputRefKey] = el;
                      }}
                      onChange={(e) => handlePropertyFileUpload(cat, e)}
                      className="hidden"
                    />

                    <div className="p-2.5 grid grid-cols-3 gap-1 bg-slate-950 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handlePropertyPhotoAction(cat, 'delete')}
                        disabled={resolved.isDeleted}
                        className="py-1 px-1.5 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[inputRefKey]?.click()}
                        className="py-1 px-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-amber-500/30"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Replace</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChangePhotoModal({ target: cat, label: `${cat} Category` });
                          setCustomUrlInput('');
                        }}
                        className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Names and Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Hotel Property Name</label>
              <input
                type="text"
                value={formData.hotelName}
                onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Brand / Business Trade Name</label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Tagline / Location Highlight</label>
            <input
              type="text"
              value={formData.tagline || ''}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              placeholder="Near Kali Maiya Mandir, Pandokhar Sarkar Dham"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Physical Hotel Address (Printed on Bills)</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Official Phone / WhatsApp (SIM 7000354771)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Official Hotel Support Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Statutory & GST Info */}
      {activeTab === 'statutory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Statutory Hotel & GST Tax Details</span>
            </h3>
            <p className="text-slate-400 mt-1">
              These statutory identifiers are automatically populated onto every issued GST Tax Invoice, check-in card, and financial reconciliation report.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Hotel GSTIN (GST Number)</label>
              <input
                type="text"
                value={formData.gstNumber || ''}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                placeholder="23AAACH7000B1Z8"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500 uppercase"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">15-digit Indian GST Identification Number</span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">FSSAI Food License Number (Restaurant)</label>
              <input
                type="text"
                value={formData.fssaiNumber || ''}
                onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                placeholder="21424570000123"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">14-digit FSSAI license for Satvik dining</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">State Name</label>
              <input
                type="text"
                value={formData.stateName || 'Madhya Pradesh'}
                onChange={(e) => setFormData({ ...formData, stateName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">State GST Code</label>
              <input
                type="text"
                value={formData.stateCode || '23'}
                onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Code 23 for Madhya Pradesh</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Official Bank Details */}
      {activeTab === 'banking' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Official Hotel Bank Account & UPI Setup</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Printed in the official &quot;Payment &amp; Bank Details&quot; box at the bottom of all customer bills, tax invoices, and advance vouchers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="State Bank of India (SBI)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Bank Account Number</label>
              <input
                type="text"
                value={formData.bankAccountNo || ''}
                onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                placeholder="392019482910"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Bank IFSC Code</label>
              <input
                type="text"
                value={formData.bankIfsc || ''}
                onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                placeholder="SBIN0001234"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Bank Branch</label>
              <input
                type="text"
                value={formData.bankBranch || ''}
                onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                placeholder="Bhander Branch, Datia"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Account Holder Beneficiary Name</label>
              <input
                type="text"
                value={formData.accountHolderName || ''}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                placeholder="Shree H.V.M Hotel and Restaurant"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Hotel UPI ID (For ₹500 Advance & QR)</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    upiId: e.target.value,
                    youpiMerchantVpa: e.target.value,
                  })
                }
                placeholder="7000354771@upi"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">UPI Instructions Note</label>
              <input
                type="text"
                value={formData.upiQrNote}
                onChange={(e) => setFormData({ ...formData, upiQrNote: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Bill Policies & Terms */}
      {activeTab === 'terms' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Bill Policies, Timings & Printed Terms</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Configure checkout cutoff, default advance, and customize the bullet-point terms and conditions printed on the bottom of every invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Default Check-Out Time</label>
              <input
                type="text"
                value={formData.defaultCheckoutTime}
                onChange={(e) => setFormData({ ...formData, defaultCheckoutTime: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Reservation Arrival Cutoff</label>
              <input
                type="text"
                value={formData.defaultArrivalDeadline}
                onChange={(e) => setFormData({ ...formData, defaultArrivalDeadline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Default Advance Amount (₹)</label>
              <input
                type="number"
                value={formData.defaultAdvanceAmount}
                onChange={(e) => setFormData({ ...formData, defaultAdvanceAmount: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>
          </div>

          {/* Terms & Conditions List */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="block text-slate-300 font-bold">Terms & Conditions (Printed on Bottom of Bills):</label>
            <div className="space-y-2">
              {(formData.invoiceTerms || []).map((term, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-mono text-amber-400 font-bold text-xs w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => {
                      const updated = [...(formData.invoiceTerms || [])];
                      updated[index] = e.target.value;
                      setFormData({ ...formData, invoiceTerms: updated });
                    }}
                    className="flex-1 bg-transparent text-slate-200 focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(index)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new term */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTermInput}
                onChange={(e) => setNewTermInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTerm();
                  }
                }}
                placeholder="Add another term (e.g., Check-out time 12:00 PM)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddTerm}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Term</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Invoice Footer Blessing / Greeting Note:</label>
            <input
              type="text"
              value={formData.invoiceNote || ''}
              onChange={(e) => setFormData({ ...formData, invoiceNote: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-500"
              placeholder="Thank you for staying at Shree H.V.M Hotel and Restaurant. Shubh Yatra!"
            />
          </div>
        </div>
      )}

      {/* TAB 5: OpenWA Gateway Integration (https://github.com/rmyndharis/OpenWA.git) */}
      {activeTab === 'whatsapp' && (
        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-6 space-y-6 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-400">
                  OpenWA Gateway (rmyndharis/OpenWA)
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    webStatus === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {webStatus === 'connected'
                    ? `● WORKING (${openWaEngine})`
                    : '○ SCAN QR / READY TO PAIR'}
                </span>
              </div>
              <p className="text-slate-400 mt-1">
                Replaces legacy broken WhatsApp links with the built-in <strong>OpenWA Gateway</strong> supporting <code>baileys</code> (WebSocket Multi-Device) and <code>whatsapp-web.js</code> engines.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs border ${
                  webStatus === 'connected'
                    ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    webStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                ></span>
                <span>
                  {webStatus === 'connected' && (phoneToLink || formData.whatsappConnectedNumber)
                    ? `Connected: +91 ${phoneToLink || formData.whatsappConnectedNumber}`
                    : 'Not Connected (Manual Connect)'}
                </span>
              </span>
            </div>
          </div>

          {connectionNotice && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{connectionNotice}</span>
            </div>
          )}

          {/* OpenWA Engine & Server Configuration */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-emerald-300 text-xs uppercase tracking-wider">
              1. OpenWA Engine & Session Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">OpenWA Engine</label>
                <select
                  value={openWaEngine}
                  onChange={(e) => setOpenWaEngine(e.target.value as 'baileys' | 'whatsapp-web.js')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                >
                  <option value="baileys">baileys (Fast WebSocket)</option>
                  <option value="whatsapp-web.js">whatsapp-web.js (Chromium)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Session ID</label>
                <input
                  type="text"
                  value={openWaSessionName}
                  onChange={(e) => setOpenWaSessionName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Your WhatsApp # (For Manual Connect)
                </label>
                <input
                  type="tel"
                  value={phoneToLink}
                  onChange={(e) => setPhoneToLink(e.target.value)}
                  placeholder="Enter your 10-digit WhatsApp #"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">External OpenWA Host (Optional)</label>
                <input
                  type="text"
                  value={openWaServerUrl}
                  onChange={(e) => setOpenWaServerUrl(e.target.value)}
                  placeholder="http://localhost:2785"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Step 2: QR Code & Pairing Code */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="font-bold text-white text-xs uppercase tracking-wider block">
                  2. OpenWA Multi-Device QR & Pairing Code (Manual Link)
                </span>
                <p className="text-slate-400 text-[11px]">
                  No number is pre-connected. Click <strong>Generate Live WhatsApp QR</strong> below and scan from WhatsApp &gt; Linked Devices.
                </p>
              </div>

              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLinkMode('qr')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    linkMode === 'qr' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  OpenWA QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode('pairing_code')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    linkMode === 'pairing_code' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  8-Digit Pairing Code
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex flex-col items-center justify-center p-5 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-3">
                {linkMode === 'qr' ? (
                  <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-emerald-500/40">
                    {qrCodeSvgUrl ? (
                      <img
                        src={qrCodeSvgUrl}
                        alt="OpenWA QR Code"
                        className="w-48 h-48 object-contain rounded"
                      />
                    ) : (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-700 p-4 text-center">
                        <QrCode className="w-16 h-16 mb-2 text-slate-400" />
                        <span className="text-[11px] font-semibold text-slate-600">
                          Click &quot;Generate Live WhatsApp QR&quot; below to start session
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <span className="text-slate-400 text-xs block">OpenWA 8-Digit Pairing Code:</span>
                    <span className="text-2xl font-mono font-extrabold text-amber-400 tracking-widest bg-slate-950 px-5 py-2.5 rounded-xl border border-amber-500/40 block">
                      {pairingCode || '---- ----'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Session: {openWaSessionName} ({openWaEngine})
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  {linkMode === 'qr' ? (
                    <button
                      type="button"
                      onClick={() => handleRefreshQr(phoneToLink)}
                      disabled={qrLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                      <span>{qrCodeSvgUrl ? 'Refresh Live WhatsApp QR' : 'Generate Live WhatsApp QR'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPairingCode}
                      disabled={qrLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                      <span>Get 8-Digit Pairing Code</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleLoginOpenWa}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>Save Manual Number</span>
                  </button>

                  {(webStatus === 'connected' || qrCodeSvgUrl) && (
                    <button
                      type="button"
                      onClick={handleDisconnectOpenWa}
                      disabled={isConnecting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-950 hover:bg-rose-800 text-rose-200 text-[11px] rounded-lg cursor-pointer"
                    >
                      <span>Disconnect / Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Automated Triggers */}
              <div className="space-y-3">
                <span className="font-bold text-emerald-300 text-xs uppercase tracking-wider block">
                  Automated OpenWA Notifications:
                </span>
                <div className="space-y-2 text-[11px]">
                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.openWaAutoBookingConfirm ?? true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openWaAutoBookingConfirm: e.target.checked,
                          whatsappAutoSendBookingConfirmation: e.target.checked,
                        })
                      }
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <div>
                      <strong className="text-white block">Booking & ₹500 Advance Voucher</strong>
                      <span className="text-slate-400 text-[10px]">Auto-send via OpenWA on booking creation</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.openWaAutoCheckInSlip ?? true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openWaAutoCheckInSlip: e.target.checked,
                          whatsappAutoSendCheckIn: e.target.checked,
                        })
                      }
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <div>
                      <strong className="text-white block">Check-In Welcome & Room Slip</strong>
                      <span className="text-slate-400 text-[10px]">Auto-send allocated room & Satvik dining timing</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.openWaAutoCheckoutInvoice ?? true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openWaAutoCheckoutInvoice: e.target.checked,
                          whatsappAutoSendCheckOut: e.target.checked,
                        })
                      }
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <div>
                      <strong className="text-white block">GST Tax Invoice on Checkout</strong>
                      <span className="text-slate-400 text-[10px]">Auto-send settled invoice breakdown to guest</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Direct OpenWA Dispatcher & Recent Delivery Logs */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <span className="font-bold text-white text-xs uppercase tracking-wider block flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>3. OpenWA Test Dispatcher & Live Delivery Log</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Recipient Mobile Number</label>
                <input
                  type="tel"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Message Template</label>
                <select
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="booking_confirmation">Booking Confirmation Voucher</option>
                  <option value="advance_receipt">₹500 Advance Payment Receipt</option>
                  <option value="checkin_slip">Check-In Registration Slip</option>
                  <option value="checkout_invoice">GST Tax Invoice & Departure Bill</option>
                  <option value="custom">Custom Message</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSendTestWhatsApp}
                  disabled={testSending || !testNumber}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50 shadow-md"
                >
                  {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Dispatch via OpenWA</span>
                </button>
              </div>
            </div>

            {testTemplate === 'custom' && (
              <textarea
                rows={2}
                value={customMsgText}
                onChange={(e) => setCustomMsgText(e.target.value)}
                placeholder="Type custom message to send via OpenWA..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs resize-none"
              />
            )}

            {testResult && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{testResult}</span>
              </div>
            )}

            {/* Recent OpenWA Logs */}
            {whatsappLogs.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recent OpenWA Gateway Deliveries ({whatsappLogs.length})
                </span>
                <div className="max-h-44 overflow-y-auto space-y-1.5">
                  {whatsappLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-400">{log.id}</span>
                        <span className="text-slate-300 ml-2">
                          → +91 {log.recipientPhone} ({log.templateType})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {log.engine} • {log.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: YouPI-PG UPI Gateway (https://github.com/youpi-pg/YouPI-PG.git) */}
      {activeTab === 'youpi' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>YouPI-PG: Zero-Fee Self-Hosted UPI Payment Gateway</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Integrated open-source UPI gateway (<span className="text-amber-300 font-mono">youpi-pg/YouPI-PG</span>). Active on both Public Website ₹500 Advance Checkout and PMS Front Desk Payments.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={formData.youpiEnabled ?? true}
                onChange={(e) => setFormData({ ...formData, youpiEnabled: e.target.checked })}
                className="rounded accent-amber-500 w-4 h-4"
              />
              <span className="font-semibold text-white">Enable YouPI-PG</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>1. Merchant UPI VPA & Identity</span>
              </h4>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Merchant Payee VPA (UPI ID) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.youpiMerchantVpa || formData.upiId || '7000354771@upi'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      youpiMerchantVpa: e.target.value,
                      upiId: e.target.value,
                    })
                  }
                  placeholder="7000354771@upi"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Payee Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.youpiPayeeName || formData.youpiMerchantName || 'Hotel Shyam Palace'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      youpiPayeeName: e.target.value,
                      youpiMerchantName: e.target.value,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2. YouPI-PG Observer Webhook</span>
              </h4>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Observer Webhook Callback URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/youpi-pg/webhook`}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/youpi-pg/webhook`);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2500);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formData.youpiAutoVerify ?? true}
                  onChange={(e) => setFormData({ ...formData, youpiAutoVerify: e.target.checked })}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <span className="text-slate-300 text-[11px]">
                  Auto-poll & verify payment status while YouPI-PG QR modal is open
                </span>
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-950/40 to-slate-950 p-5 rounded-2xl border border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-white text-xs">
                Test YouPI-PG ₹500 Advance Dynamic QR Modal
              </h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Launch the live YouPI-PG QR checkout modal to test NPCI URI generation and 12-digit UTR verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTestYouPiModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs shrink-0 shadow-md"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch Test YouPI-PG Modal</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: Staff Whitelist & Super Admin Approvals */}
      {activeTab === 'staff_whitelist' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Staff Whitelist & Security Access Control</span>
                </h3>
                <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  Super Admin Exclusive
                </span>
              </div>
              <p className="text-slate-400 mt-1">
                Authorize staff email addresses or approve pending login requests.
              </p>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Super Admin Account</span>
              <span className="text-xs font-bold text-amber-300 font-mono">{SUPER_ADMIN_EMAIL}</span>
            </div>
          </div>

          {inviteSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          {/* Invite New Staff Member */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Invite New Staff Member (Pre-Approve Email / Gmail)</span>
            </h4>

            <form onSubmit={handleAddStaffInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Staff Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. reception@gmail.com"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Staff Member Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={newInviteName}
                  onChange={(e) => setNewInviteName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Assigned Department / Role</label>
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value as StaffRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="receptionist">Receptionist (Front Desk)</option>
                  <option value="accountant">Accountant (Billing & Invoices)</option>
                  <option value="housekeeping">Housekeeping Supervisor</option>
                  <option value="admin">Operations Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteSaving || !newInviteEmail.trim()}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-50 shadow-md"
              >
                {inviteSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add to Whitelist</span>
              </button>
            </form>
          </div>

          {/* Pending Access Requests */}
          {staffRequests.filter((r) => r.status === 'pending').length > 0 && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider">
                Pending Staff Approval Requests
              </h4>
              {staffRequests
                .filter((r) => r.status === 'pending')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-900 border border-amber-900/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold text-white text-xs">{req.name}</span>
                      <p className="text-amber-400/90 font-mono text-[11px]">{req.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req)}
                        className="px-3 py-1.5 bg-rose-900/70 hover:bg-rose-800 text-rose-200 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Whitelisted Staff Directory */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Authorized Staff Whitelist</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  <tr className="bg-amber-950/20">
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">{SUPER_ADMIN_EMAIL}</td>
                    <td className="py-3 px-3 font-bold text-white">Hotel Owner (Super Admin)</td>
                    <td className="py-3 px-3">Super Admin</td>
                    <td className="py-3 px-3 text-right text-slate-500 text-[10px]">Protected</td>
                  </tr>
                  {staffInvites.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 px-3 font-mono text-slate-200">{inv.email}</td>
                      <td className="py-3 px-3 text-slate-300">{inv.name || 'Staff Member'}</td>
                      <td className="py-3 px-3 capitalize">{inv.role}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteStaffInvite(inv.id, inv.email)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: Live Bills Preview */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Interactive Bills & Invoices Live Preview</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Departure / Checkout</span>
                <h4 className="text-base font-bold text-white mt-1">GST Tax Invoice</h4>
                <p className="text-slate-400 text-[11px] mt-1">
                  Official A4 format with SAC 996311 tariff charges, CGST 6%, SGST 6%, bank account, and UPI payment details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal('invoice')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Tax Invoice</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Front Desk Arrival</span>
                <h4 className="text-base font-bold text-white mt-1">Guest Registration Card</h4>
                <p className="text-slate-400 text-[11px] mt-1">
                  Check-in arrival slip with room assignment, guest KYC verification snapshot, and house rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal('regCard')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Registration Card</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Reservation Advance</span>
                <h4 className="text-base font-bold text-white mt-1">₹500 Advance Receipt</h4>
                <p className="text-slate-400 text-[11px] mt-1">
                  Official advance payment voucher with YouPI-PG UTR reference and 1:00 PM arrival notice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal('advance')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Advance Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: MULTI-DATABASE CONNECTOR HUB & EXTREME VERIFICATION */}
      {activeTab === 'database' && <MultiDatabaseManager staffUser={staffUser} />}

      {/* Change Photo Modal inside Settings */}
      {changePhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-serif-luxury text-white">
                Change Photo — {changePhotoModal.label}
              </h3>
              <button
                type="button"
                onClick={() => setChangePhotoModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-300 block">Select from Hotel Shyam Palace Presets:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {PRESET_ROOM_PHOTOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      handlePropertyPhotoAction(changePhotoModal.target, 'change', preset.url);
                      setChangePhotoModal(null);
                    }}
                    className="group bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl overflow-hidden text-left cursor-pointer"
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
              <label className="block font-bold text-slate-300">Or Paste Direct Image URL:</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                />
                <button
                  type="button"
                  disabled={!customUrlInput.trim()}
                  onClick={() => {
                    handlePropertyPhotoAction(changePhotoModal.target, 'change', customUrlInput);
                    setChangePhotoModal(null);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer disabled:opacity-40"
                >
                  Apply URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Preview Overlays */}
      {previewModal === 'invoice' && (
        <PrintableInvoice
          invoice={sampleInvoice}
          settings={formData}
          onClose={() => setPreviewModal(null)}
        />
      )}
      {previewModal === 'regCard' && (
        <PrintableRegCard
          booking={sampleBooking}
          settings={formData}
          onClose={() => setPreviewModal(null)}
        />
      )}
      {previewModal === 'advance' && (
        <PrintableAdvanceReceipt
          booking={sampleBooking}
          settings={formData}
          onClose={() => setPreviewModal(null)}
        />
      )}

      {/* Test YouPI-PG Modal */}
      {testYouPiModalOpen && (
        <YouPiPaymentModal
          amount={500}
          note="Test Advance Payment — Hotel Shyam Palace"
          customerName="Test Pilgrim Guest"
          customerPhone={formData.phone || '7000354771'}
          bookingId="HSP-TEST-500"
          settings={formData}
          onSuccess={() => {
            setTestYouPiModalOpen(false);
            setPhotoNotice('YouPI-PG ₹500 test payment verified successfully!');
            setTimeout(() => setPhotoNotice(null), 4000);
          }}
          onClose={() => setTestYouPiModalOpen(false)}
        />
      )}
    </div>
  );
};
