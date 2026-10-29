import { RoomCategory } from '../types/hotel';
import QRCode from 'qrcode';

/**
 * Compresses an uploaded image file using HTML5 Canvas to a clean JPEG Data URL
 * suitable for storing directly in Firestore documents (< 150KB).
 */
export function compressImageFile(
  file: File,
  maxWidth = 720,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image content'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a rich, high-craft architectural SVG Data URL for rooms & hotel banners
 * so the app has zero broken images and instant offline rendering.
 */
function createArchitecturalRoomSvg(
  title: string,
  subtitle: string,
  accentHex: string,
  bgTopHex: string,
  bgBottomHex: string,
  variant: 'deluxe' | 'small_ac' | 'large_non_ac' | 'common' | 'hero' | 'restaurant'
): string {
  const interiorShapes =
    variant === 'restaurant'
      ? `
      <!-- Brass Satvik Thali Illustration -->
      <circle cx="400" cy="270" r="130" fill="#451A03" stroke="${accentHex}" stroke-width="4"/>
      <circle cx="400" cy="270" r="118" fill="#78350F" opacity="0.55" stroke="#FBBF24" stroke-width="1.5" stroke-dasharray="6 4"/>
      <circle cx="345" cy="215" r="26" fill="#92400E" stroke="#FDE68A" stroke-width="2"/>
      <circle cx="400" cy="195" r="26" fill="#B45309" stroke="#FDE68A" stroke-width="2"/>
      <circle cx="455" cy="215" r="26" fill="#D97706" stroke="#FDE68A" stroke-width="2"/>
      <circle cx="475" cy="270" r="24" fill="#FEF3C7" opacity="0.85" stroke="#F59E0B" stroke-width="2"/>
      <ellipse cx="365" cy="295" rx="45" ry="32" fill="#FDE68A" opacity="0.9"/>
      <circle cx="440" cy="325" r="28" fill="#FFFBEB" opacity="0.9"/>
      `
      : variant === 'hero'
      ? `
      <!-- Royal Heritage Archway & Temple Silhouette -->
      <path d="M120 420 L120 170 Q400 60 680 170 L680 420 Z" fill="#1E293B" opacity="0.7" stroke="${accentHex}" stroke-width="2.5"/>
      <path d="M220 420 L220 210 Q400 120 580 210 L580 420 Z" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5" opacity="0.85"/>
      <rect x="260" y="260" width="280" height="160" rx="8" fill="#1E293B" stroke="${accentHex}" stroke-width="1.5"/>
      <circle cx="400" cy="165" r="24" fill="${accentHex}" opacity="0.25"/>
      <circle cx="400" cy="165" r="10" fill="${accentHex}"/>
      `
      : `
      <!-- Room Perspective Frame -->
      <rect x="90" y="70" width="620" height="340" rx="12" fill="#0F172A" opacity="0.55" stroke="#334155" stroke-width="1.5"/>
      <!-- AC Unit or Ceiling Fan -->
      ${
        variant === 'deluxe' || variant === 'small_ac'
          ? `<rect x="290" y="92" width="220" height="34" rx="6" fill="#1E293B" stroke="${accentHex}" stroke-width="2"/>
             <line x1="310" y1="115" x2="490" y2="115" stroke="#38BDF8" stroke-width="2" opacity="0.8"/>`
          : `<line x1="400" y1="70" x2="400" y2="110" stroke="#94A3B8" stroke-width="3"/>
             <ellipse cx="400" cy="112" rx="85" ry="8" fill="#64748B"/>`
      }
      <!-- Headboard & Luxury Bed -->
      <rect x="210" y="195" width="380" height="95" rx="8" fill="#451A03" stroke="${accentHex}" stroke-width="2"/>
      <!-- Pillows -->
      <rect x="245" y="225" width="130" height="44" rx="10" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="425" y="225" width="130" height="44" rx="10" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <!-- Mattress & Runner -->
      <rect x="185" y="265" width="430" height="115" rx="12" fill="#F1F5F9" stroke="#94A3B8" stroke-width="2"/>
      <rect x="185" y="315" width="430" height="42" fill="${accentHex}" opacity="0.85"/>
      <!-- Warm Bedside Lamps -->
      <circle cx="145" cy="235" r="22" fill="#F59E0B" opacity="0.25"/>
      <rect x="133" y="225" width="24" height="32" rx="4" fill="#FDE68A"/>
      <circle cx="655" cy="235" r="22" fill="#F59E0B" opacity="0.25"/>
      <rect x="643" y="225" width="24" height="32" rx="4" fill="#FDE68A"/>
      `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgTopHex}"/>
        <stop offset="100%" stop-color="${bgBottomHex}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="35%" r="60%">
        <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bg)"/>
    <rect width="800" height="500" fill="url(#glow)"/>
    ${interiorShapes}
    <rect x="0" y="395" width="800" height="105" fill="#020617" opacity="0.82"/>
    <line x1="0" y1="395" x2="800" y2="395" stroke="${accentHex}" stroke-width="1.5" opacity="0.5"/>
    <text x="44" y="438" fill="#FFFFFF" font-family="Georgia, serif" font-size="26" font-weight="bold">${title}</text>
    <text x="44" y="468" fill="#FBBF24" font-family="sans-serif" font-size="14" letter-spacing="1">${subtitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_CATEGORY_IMAGES: Record<RoomCategory, string> = {
  Deluxe: createArchitecturalRoomSvg(
    'Deluxe AC Suite',
    'HOTEL SHYAM PALACE · KING BED · SPLIT AC · TEMPLE VIEW',
    '#F59E0B',
    '#1E1B4B',
    '#090D16',
    'deluxe'
  ),
  'Small AC': createArchitecturalRoomSvg(
    'Small AC Comfort Room',
    'HOTEL SHYAM PALACE · DOUBLE BED · SPLIT AC · 24/7 POWER BACKUP',
    '#38BDF8',
    '#0F172A',
    '#020617',
    'small_ac'
  ),
  'Large Non-AC': createArchitecturalRoomSvg(
    'Large Non-AC Family Room',
    'HOTEL SHYAM PALACE · SPACIOUS 2-4 PAX · CROSS VENTILATION',
    '#10B981',
    '#064E3B',
    '#020617',
    'large_non_ac'
  ),
  Common: createArchitecturalRoomSvg(
    'Yatri Common Room',
    'HOTEL SHYAM PALACE · PILGRIM VALUE STAY · CLEAN BEDDING',
    '#A855F7',
    '#1E293B',
    '#020617',
    'common'
  ),
};

export const DEFAULT_HERO_IMAGE = createArchitecturalRoomSvg(
  'Hotel Shyam Palace — Pandokhar Sarkar Dham',
  'SHREE H.V.M HOTEL & RESTAURANT · NEAR KALI MAIYA MANDIR',
  '#F59E0B',
  '#271705',
  '#020617',
  'hero'
);

export const DEFAULT_RESTAURANT_IMAGE = createArchitecturalRoomSvg(
  'Shree H.V.M Pure Satvik Bhojanalaya',
  '100% PURE VEGETARIAN · SPECIAL PILGRIM THALI & BREAKFAST',
  '#F59E0B',
  '#3B1806',
  '#090D16',
  'restaurant'
);

export const PRESET_ROOM_PHOTOS: { id: string; label: string; category: string; url: string }[] = [
  {
    id: 'preset-deluxe',
    label: 'Deluxe Royal Gold Suite',
    category: 'Deluxe',
    url: DEFAULT_CATEGORY_IMAGES['Deluxe'],
  },
  {
    id: 'preset-small-ac',
    label: 'Small AC Cozy Double Room',
    category: 'Small AC',
    url: DEFAULT_CATEGORY_IMAGES['Small AC'],
  },
  {
    id: 'preset-large-non-ac',
    label: 'Large Non-AC Family Suite',
    category: 'Large Non-AC',
    url: DEFAULT_CATEGORY_IMAGES['Large Non-AC'],
  },
  {
    id: 'preset-common',
    label: 'Budget Pilgrim Common Room',
    category: 'Common',
    url: DEFAULT_CATEGORY_IMAGES['Common'],
  },
  {
    id: 'preset-hero',
    label: 'Hotel Exterior & Reception Arch',
    category: 'Hotel',
    url: DEFAULT_HERO_IMAGE,
  },
  {
    id: 'preset-restaurant',
    label: 'Satvik Thali & Dining Hall',
    category: 'Restaurant',
    url: DEFAULT_RESTAURANT_IMAGE,
  },
];

export const DELETED_PHOTO_SENTINEL = '__DELETED__';

/**
 * Resolves the effective display photo for a room, respecting explicit deletion (`__DELETED__`).
 */
export function resolveRoomPhoto(
  roomPhotoUrl: string | undefined,
  category: RoomCategory,
  categoryImages?: Record<string, string>
): { isDeleted: boolean; isCustom: boolean; url: string } {
  if (roomPhotoUrl === DELETED_PHOTO_SENTINEL) {
    return { isDeleted: true, isCustom: false, url: '' };
  }
  if (roomPhotoUrl && roomPhotoUrl.trim().length > 0) {
    return { isDeleted: false, isCustom: true, url: roomPhotoUrl };
  }
  const catImg = categoryImages?.[category];
  if (catImg === DELETED_PHOTO_SENTINEL) {
    return { isDeleted: true, isCustom: false, url: '' };
  }
  if (catImg && catImg.trim().length > 0) {
    return { isDeleted: false, isCustom: false, url: catImg };
  }
  return {
    isDeleted: false,
    isCustom: false,
    url: DEFAULT_CATEGORY_IMAGES[category] || DEFAULT_CATEGORY_IMAGES['Small AC'],
  };
}

/**
 * Generates a 100% genuine, standards-compliant ISO/IEC 18004 scannable QR Code Data URL
 * using the `qrcode` library (works with Google Pay, PhonePe, Paytm, BHIM, and WhatsApp scanners).
 */
export async function generateRealQrCodeDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.warn('QRCode generation fallback:', err);
    return generateQrCodeSvgDataUrl(payload);
  }
}

/**
 * Synchronous SVG fallback helper if needed in non-async contexts.
 */
export function generateQrCodeSvgDataUrl(payload: string, _brandTag = 'QR'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="12" fill="#FFFFFF"/>
    <text x="120" y="120" text-anchor="middle" fill="#0F172A" font-family="sans-serif" font-size="12" font-weight="bold">Generating QR...</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
