import { PmsTab } from '../components/pms/PmsSidebar';
import { RoomCategory } from '../types/hotel';

export const LAST_ROUTE_STORAGE_KEY = 'hsp_last_route_path_v1';

export type SettingsSubTab =
  | 'branding'
  | 'statutory'
  | 'banking'
  | 'terms'
  | 'whatsapp'
  | 'youpi'
  | 'staff_whitelist'
  | 'database'
  | 'preview';

export type GallerySubSection = 'rooms_photos' | 'category_photos' | 'public_gallery';

export interface ParsedAppRoute {
  path: string;
  viewMode: 'public' | 'pms';
  pmsTab: PmsTab;
  settingsSubTab: SettingsSubTab;
  gallerySubSection: GallerySubSection;
  modal: 'none' | 'walk_in' | 'phone_booking' | 'public_booking' | 'booking_lookup' | 'staff_auth';
  publicBookingCategory: RoomCategory;
}

const VALID_PMS_TABS: PmsTab[] = [
  'overview',
  'walk_in',
  'reservations',
  'calendar',
  'rooms',
  'gallery',
  'billing',
  'cancellations',
  'guests',
  'inventory',
  'reports',
  'audit',
  'settings',
];

const VALID_SETTINGS_SUBTABS: SettingsSubTab[] = [
  'branding',
  'statutory',
  'banking',
  'terms',
  'whatsapp',
  'youpi',
  'staff_whitelist',
  'database',
  'preview',
];

const VALID_GALLERY_SECTIONS: GallerySubSection[] = [
  'rooms_photos',
  'category_photos',
  'public_gallery',
];

function slugToRoomCategory(slug?: string): RoomCategory {
  const s = (slug || '').toLowerCase();
  if (s === 'deluxe') return 'Deluxe';
  if (s === 'large-non-ac' || s === 'large_non_ac') return 'Large Non-AC';
  if (s === 'common') return 'Common';
  return 'Small AC';
}

export function roomCategoryToSlug(cat: RoomCategory): string {
  if (cat === 'Deluxe') return 'deluxe';
  if (cat === 'Large Non-AC') return 'large-non-ac';
  if (cat === 'Common') return 'common';
  return 'small-ac';
}

/**
 * Parses any URL pathname (e.g. `/staff-pm/reservationphones/new`, `/staff-pm/settings/whatsapp`,
 * `/staff-pm/rooms`, `/book-room/deluxe`, `/track-booking`, `/`) into full application UI state.
 */
export function parseRouteFromPathname(rawPathname: string): ParsedAppRoute {
  const cleanPath = (rawPathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean);

  const defaultState: ParsedAppRoute = {
    path: cleanPath,
    viewMode: 'public',
    pmsTab: 'overview',
    settingsSubTab: 'branding',
    gallerySubSection: 'rooms_photos',
    modal: 'none',
    publicBookingCategory: 'Small AC',
  };

  if (segments.length === 0) {
    return defaultState;
  }

  const first = segments[0].toLowerCase();

  // Public Website Modals / Pages
  if (first === 'book-room' || first === 'book') {
    const cat = slugToRoomCategory(segments[1]);
    return {
      ...defaultState,
      path: `/book-room/${roomCategoryToSlug(cat)}`,
      viewMode: 'public',
      modal: 'public_booking',
      publicBookingCategory: cat,
    };
  }

  if (first === 'track-booking' || first === 'lookup') {
    return {
      ...defaultState,
      path: '/track-booking',
      viewMode: 'public',
      modal: 'booking_lookup',
    };
  }

  if (first === 'staff-login' || first === 'login') {
    return {
      ...defaultState,
      path: '/staff-login',
      viewMode: 'public',
      modal: 'staff_auth',
    };
  }

  // Staff PMS Routes: supports `/staff-pm/...`, `/staff-pms/...`, or `/pms/...`
  if (first === 'staff-pm' || first === 'staff-pms' || first === 'pms') {
    const second = (segments[1] || 'overview').toLowerCase();
    const third = (segments[2] || '').toLowerCase();

    // 1. `/staff-pm/reservationphones/new` or `/staff-pm/reservations/new`
    if (
      second === 'reservationphones' ||
      (second === 'reservations' && (third === 'new' || third === 'phone'))
    ) {
      return {
        ...defaultState,
        path: '/staff-pm/reservationphones/new',
        viewMode: 'pms',
        pmsTab: 'reservations',
        modal: 'phone_booking',
      };
    }

    // 2. `/staff-pm/walk-in/new` or `/staff-pm/walk_in`
    if (second === 'walk-in' || second === 'walk_in' || second === 'checkin') {
      return {
        ...defaultState,
        path: '/staff-pm/walk-in/new',
        viewMode: 'pms',
        pmsTab: 'overview',
        modal: 'walk_in',
      };
    }

    // 3. `/staff-pm/settings/:subTab`
    if (second === 'settings') {
      const sub = VALID_SETTINGS_SUBTABS.includes(third as SettingsSubTab)
        ? (third as SettingsSubTab)
        : 'branding';
      return {
        ...defaultState,
        path: `/staff-pm/settings/${sub}`,
        viewMode: 'pms',
        pmsTab: 'settings',
        settingsSubTab: sub,
      };
    }

    // 4. `/staff-pm/gallery/:section`
    if (second === 'gallery' || second === 'photos') {
      const sec = VALID_GALLERY_SECTIONS.includes(third as GallerySubSection)
        ? (third as GallerySubSection)
        : 'rooms_photos';
      return {
        ...defaultState,
        path: `/staff-pm/gallery/${sec}`,
        viewMode: 'pms',
        pmsTab: 'gallery',
        gallerySubSection: sec,
      };
    }

    // 5. Standard PMS Tabs (`/staff-pm/overview`, `/staff-pm/reservations`, `/staff-pm/rooms`, etc.)
    const matchedTab = VALID_PMS_TABS.includes(second as PmsTab)
      ? (second as PmsTab)
      : 'overview';

    return {
      ...defaultState,
      path: `/staff-pm/${matchedTab}`,
      viewMode: 'pms',
      pmsTab: matchedTab,
    };
  }

  return defaultState;
}

/**
 * Resolves the initial route on app load.
 * If the browser URL is `/`, checks `localStorage` so refreshing inside an iframe
 * stays on the exact `/staff-pm/...` page the user was viewing instead of resetting to `/`.
 */
export function getInitialAppRoute(): ParsedAppRoute {
  if (typeof window === 'undefined') {
    return parseRouteFromPathname('/');
  }

  const currentPath = window.location.pathname || '/';
  if (currentPath !== '/' && currentPath !== '/index.html') {
    const parsed = parseRouteFromPathname(currentPath);
    try {
      window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, parsed.path);
    } catch {
      // ignore storage error
    }
    return parsed;
  }

  try {
    const savedPath = window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
    if (savedPath && savedPath !== '/') {
      const parsed = parseRouteFromPathname(savedPath);
      window.history.replaceState({ path: parsed.path }, '', parsed.path);
      return parsed;
    }
  } catch {
    // ignore storage error
  }

  return parseRouteFromPathname('/');
}

/**
 * Navigates to a new `/` path, updates `window.history`, and persists the route for refresh survival.
 */
export function pushAppRoute(targetPath: string): ParsedAppRoute {
  const parsed = parseRouteFromPathname(targetPath);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, parsed.path);
      if (window.location.pathname !== parsed.path) {
        window.history.pushState({ path: parsed.path }, '', parsed.path);
      }
    } catch {
      // ignore history/storage error
    }
  }
  return parsed;
}
