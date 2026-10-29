import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Room,
  Booking,
  Payment,
  Refund,
  Guest,
  Invoice,
  InventoryItem,
  AuditLog,
  HotelSettings,
  RoomCategory,
  GalleryItem,
  StaffAccessRequest,
  DEFAULT_HOTEL_SETTINGS,
  INITIAL_ROOMS_INVENTORY,
  INITIAL_GALLERY_ITEMS,
  INITIAL_INVENTORY_ITEMS,
} from './types/hotel';
import {
  seedDatabaseIfEmpty,
  subscribeRooms,
  subscribeBookings,
  subscribePayments,
  subscribeRefunds,
  subscribeGuests,
  subscribeInvoices,
  subscribeInventory,
  subscribeAuditLogs,
  subscribeHotelSettings,
  subscribeGallery,
  subscribeStaffRequests,
} from './services/db';
import { testFirestoreConnection } from './firebase/config';
import {
  getInitialAppRoute,
  pushAppRoute,
  parseRouteFromPathname,
  roomCategoryToSlug,
  SettingsSubTab,
  GallerySubSection,
  ParsedAppRoute,
} from './utils/router';

// Public Components
import { Navbar } from './components/public/Navbar';
import { HeroSection } from './components/public/HeroSection';
import { RoomsGallery } from './components/public/RoomsGallery';
import { PilgrimageGuide } from './components/public/PilgrimageGuide';
import { RestaurantSection } from './components/public/RestaurantSection';
import { HotelGallery } from './components/public/HotelGallery';
import { PublicBookingModal } from './components/public/PublicBookingModal';
import { BookingLookupModal } from './components/public/BookingLookupModal';
import { Footer } from './components/public/Footer';

// PMS Components
import { PmsHeader } from './components/pms/PmsHeader';
import { PmsSidebar, PmsTab } from './components/pms/PmsSidebar';
import { DashboardOverview } from './components/pms/DashboardOverview';
import { WalkInCheckInModal } from './components/pms/WalkInCheckInModal';
import { PhoneReservationModal } from './components/pms/PhoneReservationModal';
import { ReservationsManager } from './components/pms/ReservationsManager';
import { RoomCalendarGrid } from './components/pms/RoomCalendarGrid';
import { RoomsHousekeepingManager } from './components/pms/RoomsHousekeepingManager';
import { GalleryManager } from './components/pms/GalleryManager';
import { BillingInvoicesManager } from './components/pms/BillingInvoicesManager';
import { CancellationRefundManager } from './components/pms/CancellationRefundManager';
import { GuestKycDirectory } from './components/pms/GuestKycDirectory';
import { InventorySuppliesManager } from './components/pms/InventorySuppliesManager';
import { ReportsAnalyticsManager } from './components/pms/ReportsAnalyticsManager';
import { AuditTrailViewer } from './components/pms/AuditTrailViewer';
import { HotelSettingsManager } from './components/pms/HotelSettingsManager';
import { StaffAuthModal } from './components/pms/StaffAuthModal';
import { StaffPendingApprovalScreen } from './components/pms/StaffPendingApprovalScreen';

// Printable Components
import { PrintableInvoice } from './components/common/PrintableInvoice';
import { PrintableRegCard } from './components/common/PrintableRegCard';
import { PrintableAdvanceReceipt } from './components/common/PrintableAdvanceReceipt';

function MainApp() {
  const { currentUser, staffUser, accessStatus, isSuperAdmin } = useAuth();

  // Initialize full navigation & modal state from URL / Refresh-safe router
  const [initialRoute] = useState<ParsedAppRoute>(() => getInitialAppRoute());

  const [currentRoutePath, setCurrentRoutePath] = useState<string>(initialRoute.path);
  const [viewMode, setViewMode] = useState<'public' | 'pms'>(initialRoute.viewMode);
  const [pmsActiveTab, setPmsActiveTab] = useState<PmsTab>(
    initialRoute.pmsTab === 'walk_in' ? 'overview' : initialRoute.pmsTab
  );
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>(
    initialRoute.settingsSubTab
  );
  const [gallerySubSection, setGallerySubSection] = useState<GallerySubSection>(
    initialRoute.gallerySubSection
  );

  // Modals synced with URL paths (e.g. /staff-pm/reservationphones/new, /staff-pm/walk-in/new, /book-room/deluxe)
  const [showPublicBooking, setShowPublicBooking] = useState(
    initialRoute.modal === 'public_booking'
  );
  const [publicBookingCategory, setPublicBookingCategory] = useState<RoomCategory>(
    initialRoute.publicBookingCategory
  );
  const [showLookup, setShowLookup] = useState(initialRoute.modal === 'booking_lookup');
  const [showStaffAuthModal, setShowStaffAuthModal] = useState(
    initialRoute.modal === 'staff_auth'
  );
  const [showWalkInModal, setShowWalkInModal] = useState(initialRoute.modal === 'walk_in');
  const [showPhoneBookingModal, setShowPhoneBookingModal] = useState(
    initialRoute.modal === 'phone_booking'
  );

  // Firestore + Hybrid live collections state
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS_INVENTORY as Room[]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY_ITEMS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<HotelSettings>(DEFAULT_HOTEL_SETTINGS);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(INITIAL_GALLERY_ITEMS);
  const [staffRequests, setStaffRequests] = useState<StaffAccessRequest[]>([]);

  // Printable overlays
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [printableRegCard, setPrintableRegCard] = useState<Booking | null>(null);
  const [printableAdvanceReceipt, setPrintableAdvanceReceipt] = useState<{
    booking: Booking;
    payment?: Payment;
  } | null>(null);

  const applyParsedRoute = useCallback((parsed: ParsedAppRoute) => {
    setCurrentRoutePath(parsed.path);
    setViewMode(parsed.viewMode);
    if (parsed.viewMode === 'pms') {
      setPmsActiveTab(parsed.pmsTab === 'walk_in' ? 'overview' : parsed.pmsTab);
      setSettingsSubTab(parsed.settingsSubTab);
      setGallerySubSection(parsed.gallerySubSection);
    }
    setShowPublicBooking(parsed.modal === 'public_booking');
    if (parsed.modal === 'public_booking') {
      setPublicBookingCategory(parsed.publicBookingCategory);
    }
    setShowLookup(parsed.modal === 'booking_lookup');
    setShowStaffAuthModal(parsed.modal === 'staff_auth');
    setShowWalkInModal(parsed.modal === 'walk_in');
    setShowPhoneBookingModal(parsed.modal === 'phone_booking');
  }, []);

  const navigateTo = useCallback(
    (targetPath: string) => {
      const parsed = pushAppRoute(targetPath);
      applyParsedRoute(parsed);
    },
    [applyParsedRoute]
  );

  // Handle Browser Back / Forward buttons (`popstate`)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRouteFromPathname(window.location.pathname);
      applyParsedRoute(parsed);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyParsedRoute]);

  // Initial Seeding & Subscriptions
  useEffect(() => {
    testFirestoreConnection();
    seedDatabaseIfEmpty();

    const unsubRooms = subscribeRooms((data) => {
      setRooms(data && data.length > 0 ? data : (INITIAL_ROOMS_INVENTORY as Room[]));
    });
    const unsubBookings = subscribeBookings((data) => setBookings(data));
    const unsubPayments = subscribePayments((data) => setPayments(data));
    const unsubRefunds = subscribeRefunds((data) => setRefunds(data));
    const unsubGuests = subscribeGuests((data) => setGuests(data));
    const unsubInvoices = subscribeInvoices((data) => setInvoices(data));
    const unsubInventory = subscribeInventory((data) => {
      setInventory(data && data.length > 0 ? data : INITIAL_INVENTORY_ITEMS);
    });
    const unsubAudit = subscribeAuditLogs((data) => setAuditLogs(data));
    const unsubSettings = subscribeHotelSettings((data) => setSettings(data));
    const unsubGallery = subscribeGallery((data) => {
      setGalleryItems(data && data.length > 0 ? data : INITIAL_GALLERY_ITEMS);
    });
    const unsubRequests = subscribeStaffRequests((data) => {
      setStaffRequests(data || []);
    });

    return () => {
      unsubRooms();
      unsubBookings();
      unsubPayments();
      unsubRefunds();
      unsubGuests();
      unsubInvoices();
      unsubInventory();
      unsubAudit();
      unsubSettings();
      unsubGallery();
      unsubRequests();
    };
  }, []);

  const pendingRequestsCount = bookings.filter((b) => b.status === 'new_request').length;
  const awaitingAdvanceCount = bookings.filter((b) => b.status === 'awaiting_advance').length;
  const pendingStaffCount = staffRequests.filter((r) => r.status === 'pending').length;

  const effectiveRooms =
    rooms && rooms.length > 0 ? rooms : (INITIAL_ROOMS_INVENTORY as Room[]);
  const effectiveInventory =
    inventory && inventory.length > 0 ? inventory : INITIAL_INVENTORY_ITEMS;

  const handleOpenPmsTrigger = () => {
    if (currentUser) {
      navigateTo(`/staff-pm/${pmsActiveTab}`);
    } else {
      navigateTo('/staff-login');
    }
  };

  const handleSelectPmsTab = (tab: PmsTab) => {
    if (tab === 'walk_in') {
      navigateTo('/staff-pm/walk-in/new');
    } else if (tab === 'settings') {
      navigateTo(`/staff-pm/settings/${settingsSubTab}`);
    } else if (tab === 'gallery') {
      navigateTo(`/staff-pm/gallery/${gallerySubSection}`);
    } else {
      navigateTo(`/staff-pm/${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {viewMode === 'public' ? (
        /* PUBLIC HOTEL BOOKING WEBSITE */
        <div className="flex-1 flex flex-col">
          <Navbar
            settings={settings}
            onOpenBooking={() => navigateTo('/book-room/small-ac')}
            onOpenLookup={() => navigateTo('/track-booking')}
            onOpenPms={handleOpenPmsTrigger}
          />

          <main className="flex-1">
            <HeroSection
              settings={settings}
              onSearch={(params) =>
                navigateTo(`/book-room/${roomCategoryToSlug(params.category)}`)
              }
              onOpenBooking={() => navigateTo('/book-room/small-ac')}
            />

            <RoomsGallery
              rooms={effectiveRooms}
              settings={settings}
              onSelectCategory={(cat) =>
                navigateTo(`/book-room/${roomCategoryToSlug(cat)}`)
              }
            />

            <HotelGallery
              galleryItems={galleryItems}
              onBookRoomCategory={(cat) =>
                navigateTo(`/book-room/${roomCategoryToSlug(cat)}`)
              }
            />

            <PilgrimageGuide />

            <RestaurantSection settings={settings} />
          </main>

          <Footer settings={settings} onOpenPms={handleOpenPmsTrigger} />
        </div>
      ) : (
        /* INTERNAL PMS (PROPERTY MANAGEMENT SYSTEM) */
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <PmsHeader
            settings={settings}
            rooms={rooms}
            currentPath={currentRoutePath}
            onExitPms={() => navigateTo('/')}
            onOpenAuth={() => navigateTo('/staff-login')}
            onOpenMultiDb={() => navigateTo('/staff-pm/settings/database')}
          />

          {!currentUser ? (
            /* Protected Screen: Only Real Google & Email Sign In Allowed */
            <div className="flex-1 flex items-center justify-center p-4">
              <StaffAuthModal
                onCancel={() => navigateTo('/')}
                onSuccess={() => {
                  setShowStaffAuthModal(false);
                  if (currentRoutePath === '/staff-login' || currentRoutePath === '/') {
                    navigateTo('/staff-pm/overview');
                  }
                }}
              />
            </div>
          ) : accessStatus !== 'approved' ? (
            /* Staff Pending Super Admin Approval / Whitelist Screen */
            <StaffPendingApprovalScreen onBackToPublic={() => navigateTo('/')} />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Super Admin Alert Banner for Pending Staff Approvals */}
              {isSuperAdmin && pendingStaffCount > 0 && (
                <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md shrink-0 border-b border-amber-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0"></span>
                    <span>
                      <strong>Staff Approval Required:</strong> {pendingStaffCount} new staff
                      account(s) requesting portal access.
                    </span>
                  </div>
                  <button
                    onClick={() => navigateTo('/staff-pm/settings/staff_whitelist')}
                    className="px-3 py-1 bg-slate-950 text-amber-300 hover:text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Review & Approve in Settings →
                  </button>
                </div>
              )}

              <div className="flex-1 flex overflow-hidden">
                <PmsSidebar
                  activeTab={showWalkInModal ? 'walk_in' : pmsActiveTab}
                  onTabChange={handleSelectPmsTab}
                  pendingRequestsCount={pendingRequestsCount}
                  awaitingAdvanceCount={awaitingAdvanceCount}
                />

                <main className="flex-1 overflow-y-auto bg-slate-950">
                  {pmsActiveTab === 'overview' && (
                    <DashboardOverview
                      rooms={effectiveRooms}
                      bookings={bookings}
                      payments={payments}
                      refunds={refunds}
                      settings={settings}
                      onOpenWalkIn={() => navigateTo('/staff-pm/walk-in/new')}
                      onOpenPhoneBooking={() => navigateTo('/staff-pm/reservationphones/new')}
                      onSelectBooking={() => navigateTo('/staff-pm/reservations')}
                    />
                  )}

                  {pmsActiveTab === 'reservations' && (
                    <ReservationsManager
                      bookings={bookings}
                      rooms={effectiveRooms}
                      staffUser={staffUser!}
                      settings={settings}
                      onOpenPhoneBooking={() => navigateTo('/staff-pm/reservationphones/new')}
                      onPrintInvoice={(inv) => setPrintableInvoice(inv)}
                      onPrintRegCard={(b) => setPrintableRegCard(b)}
                      onPrintAdvance={(b, p) =>
                        setPrintableAdvanceReceipt({ booking: b, payment: p })
                      }
                    />
                  )}

                  {pmsActiveTab === 'calendar' && (
                    <RoomCalendarGrid
                      rooms={effectiveRooms}
                      bookings={bookings}
                      onSelectSlot={() => navigateTo('/staff-pm/walk-in/new')}
                      onSelectBooking={() => navigateTo('/staff-pm/reservations')}
                    />
                  )}

                  {pmsActiveTab === 'rooms' && (
                    <RoomsHousekeepingManager
                      rooms={effectiveRooms}
                      staffUser={staffUser!}
                      settings={settings}
                    />
                  )}

                  {pmsActiveTab === 'gallery' && (
                    <GalleryManager
                      galleryItems={galleryItems}
                      rooms={effectiveRooms}
                      settings={settings}
                      staffUser={staffUser!}
                      initialSection={gallerySubSection}
                      onSectionChange={(sec) => navigateTo(`/staff-pm/gallery/${sec}`)}
                    />
                  )}

                  {pmsActiveTab === 'billing' && (
                    <BillingInvoicesManager
                      invoices={invoices}
                      payments={payments}
                      settings={settings}
                      onPrintInvoice={(inv) => setPrintableInvoice(inv)}
                    />
                  )}

                  {pmsActiveTab === 'cancellations' && (
                    <CancellationRefundManager
                      refunds={refunds}
                      bookings={bookings}
                      staffUser={staffUser!}
                      settings={settings}
                    />
                  )}

                  {pmsActiveTab === 'guests' && (
                    <GuestKycDirectory
                      guests={guests}
                      bookings={bookings}
                      staffUser={staffUser!}
                    />
                  )}

                  {pmsActiveTab === 'inventory' && (
                    <InventorySuppliesManager
                      inventory={effectiveInventory}
                      staffUser={staffUser!}
                    />
                  )}

                  {pmsActiveTab === 'reports' && (
                    <ReportsAnalyticsManager
                      bookings={bookings}
                      payments={payments}
                      refunds={refunds}
                      rooms={effectiveRooms}
                      staffUser={staffUser!}
                    />
                  )}

                  {pmsActiveTab === 'audit' && <AuditTrailViewer logs={auditLogs} />}

                  {pmsActiveTab === 'settings' && (
                    <HotelSettingsManager
                      settings={settings}
                      staffUser={staffUser!}
                      initialTab={settingsSubTab}
                      onTabChange={(sub) => navigateTo(`/staff-pm/settings/${sub}`)}
                    />
                  )}
                </main>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff Auth Modal when triggered from public navbar */}
      {showStaffAuthModal && !currentUser && (
        <StaffAuthModal
          onCancel={() => navigateTo('/')}
          onSuccess={() => {
            navigateTo('/staff-pm/overview');
          }}
        />
      )}

      {/* Global Modals */}
      {showPublicBooking && (
        <PublicBookingModal
          initialCategory={publicBookingCategory}
          settings={settings}
          onClose={() => navigateTo('/')}
          onSuccess={() => {
            // Keep open on confirmation screen
          }}
        />
      )}

      {showLookup && (
        <BookingLookupModal bookings={bookings} onClose={() => navigateTo('/')} />
      )}

      {showWalkInModal && staffUser && (
        <WalkInCheckInModal
          rooms={effectiveRooms}
          guests={guests}
          staffUser={staffUser}
          settings={settings}
          onClose={() => navigateTo(`/staff-pm/${pmsActiveTab}`)}
          onComplete={(booking) => {
            setPrintableRegCard(booking);
          }}
        />
      )}

      {showPhoneBookingModal && staffUser && (
        <PhoneReservationModal
          rooms={effectiveRooms}
          staffUser={staffUser}
          settings={settings}
          onClose={() => navigateTo(`/staff-pm/${pmsActiveTab}`)}
          onSuccess={() => {
            // Shown inside modal confirmation
          }}
        />
      )}

      {/* Printable Overlays */}
      {printableInvoice && (
        <PrintableInvoice
          invoice={printableInvoice}
          settings={settings}
          onClose={() => setPrintableInvoice(null)}
        />
      )}

      {printableRegCard && (
        <PrintableRegCard
          booking={printableRegCard}
          settings={settings}
          onClose={() => setPrintableRegCard(null)}
        />
      )}

      {printableAdvanceReceipt && (
        <PrintableAdvanceReceipt
          booking={printableAdvanceReceipt.booking}
          payment={printableAdvanceReceipt.payment}
          settings={settings}
          onClose={() => setPrintableAdvanceReceipt(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
