# Hotel Shyam Palace — Production Hotel Booking Website & PMS

Complete, production-ready full-stack hotel booking website and Property Management System (PMS) for **Hotel Shyam Palace** (operating as **Shree H.V.M Hotel and Restaurant**), located at **Pandokhar Sarkar Dham, Bhander, Near Kali Maiya Mandir, Panch Akhada, Pandokhar, Madhya Pradesh 475335, India**.

---

## 1. Property Details & Business Rules

- **Hotel Name:** Hotel Shyam Palace
- **Brand / Restaurant Name:** Shree H.V.M Hotel and Restaurant
- **Location:** Pandokhar Sarkar Dham, Bhander, Near Kali Maiya Mandir, Panch Akhada, Pandokhar, Madhya Pradesh 475335, India
- **Phone / WhatsApp:** +91 7000354771
- **Support Email:** support.shyampalace@gmail.com
- **Currency:** Indian Rupees (INR, ₹)
- **Timezone:** Asia/Kolkata (IST)
- **Default Checkout Time:** 12:00 PM
- **Default Reservation Arrival Deadline:** 1:00 PM on check-in date
- **Default Advance Amount:** ₹500 (via UPI)
- **Default GST Rate:** 12% (6% CGST + 6% SGST)
- **Cancellation Policy:**
  - Cancellation ≥ 2 days before check-in: Full ₹500 advance refund.
  - Cancellation 1 day before or on check-in date: ₹400 refund (deducting ₹100).

---

## 2. 16-Room Master Inventory

The system is seeded idempotently with exactly 16 rooms across 4 categories:

| Room No. | Floor | Category | AC / Non-AC | Base Tariff |
|:---:|:---:|:---:|:---:|:---:|
| **101** | Floor 1 | Small AC | AC | ₹1,500 / night |
| **102** | Floor 1 | Small AC | AC | ₹1,500 / night |
| **103** | Floor 1 | Small AC | AC | ₹1,500 / night |
| **104** | Floor 1 | Small AC | AC | ₹1,500 / night |
| **105** | Floor 1 | Common | Non-AC | ₹800 / night |
| **201** | Floor 2 | Small AC | AC | ₹1,500 / night |
| **202** | Floor 2 | Large Non-AC | Non-AC | ₹1,200 / night |
| **203** | Floor 2 | Small AC | AC | ₹1,500 / night |
| **204** | Floor 2 | Common | Non-AC | ₹800 / night |
| **205** | Floor 2 | Deluxe | AC | ₹1,600 / night |
| **206** | Floor 2 | Large Non-AC | Non-AC | ₹1,200 / night |
| **207** | Floor 2 | Deluxe | AC | ₹1,600 / night |
| **208** | Floor 2 | Deluxe | AC | ₹1,600 / night |
| **209** | Floor 2 | Large Non-AC | Non-AC | ₹1,200 / night |
| **210** | Floor 2 | Deluxe | AC | ₹1,600 / night |
| **211** | Floor 2 | Large Non-AC | Non-AC | ₹1,200 / night |

---

## 3. Technology Stack & Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons.
- **Backend:** Node.js Express server (`server.ts`) serving custom API endpoints and mounting Vite middleware.
- **Database:** Firebase Cloud Firestore for real-time document persistence across multiple staff devices.
- **Security:** Hardened Firestore security rules (`firestore.rules`) enforcing role-based permissions and default-deny protection.
- **Authentication:** Firebase Auth with Google Sign-in and Role-Based Access Control (Super Admin, Receptionist, Accountant, Housekeeping).
- **AI Intelligence:**
  - **Gemini 3.8 Flash** with Google Maps Grounding (`googleMaps` tool) for pilgrim directions, transit distances, and local shrine guidance with verified map links.
  - **Gemini 4 Argon** with High Thinking (`ThinkingLevel.HIGH`) for front desk operational reasoning, surge forecast, and room occupancy management.

---

## 4. Key Modules & Operational Workflows

### Public Website
- Hero banner with sacred aesthetics and quick availability search.
- Room catalog with category filter, tariff, and amenities.
- Pandokhar Sarkar Dham pilgrimage transit guide (from Datia ~45km, Jhansi ~60km, Gwalior ~100km).
- Shree H.V.M Restaurant pure satvik dining showcase.
- AI Pilgrim Concierge with live Google Maps links & review citations.
- Public Booking Request Form (submits request with unique reference number).
- Booking / Request Status Tracker.

### Internal Property Management System (PMS)
1. **Operations Dashboard:**
   - 16-room status counter (Available, Occupied, Reserved, Maintenance).
   - Today's Arrivals, Departures, In-House Guests, Overdue checkouts.
   - Financial collections: Cash vs UPI breakdown, pending balances, total advance.
   - AI Operational Strategy generator.
2. **Dedicated Walk-In Check-In:**
   - 5-step front desk flow with camera/file KYC capture, masked ID entry, room allocation, rate calculation, cash/UPI payment receipt, and instant printable registration slip.
3. **Reservations & Phone Bookings:**
   - Phone and WhatsApp bookings with ₹500 advance enforcement.
   - 1:00 PM check-in date arrival deadline tracking.
   - One-click copyable and direct WhatsApp confirmation message generator.
4. **Room Calendar Grid:**
   - 7-day and 14-day visual timeline for all 16 rooms with color-coded status badges and slot booking.
5. **Rooms & Housekeeping:**
   - Live room clean/dirty/inspected states.
   - Manual status overrides with mandatory reason and immutable audit log.
6. **Billing & GST Invoices:**
   - Sequential tax invoices (`INV-HSP-2026-XXXX`).
   - CGST (6%) + SGST (6%) tax breakdown.
   - Official printable GST Tax Invoice preview with hotel letterhead.
7. **Cancellation & Refunds:**
   - Policy-based automatic refund calculation (≥2 days: 100% advance; 1 day/same day: ₹100 deduction).
   - Refund settlement tracking with UPI transaction reference.
8. **Guest KYC Directory:**
   - Masked ID safe, photo snapshot viewer, and stay history.
9. **Operational Inventory:**
   - Stock management for linens, bedsheets, towels, soaps, and RO water cans with low-stock alerts.
10. **Reports & CSV Exports:**
    - Daily collections, occupancy analysis, movement reports, and CSV downloads.
11. **Audit Trail:**
    - Chronological logging of all desk actions.

---

## 5. Local Setup & Independent Deployment

### Prerequisites
- Node.js >= 20.x
- npm or bun

### Local Execution
```bash
# 1. Clone or extract the project files
git clone <repository_url>
cd hotel-shyam-palace

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in GEMINI_API_KEY (from Google AI Studio)

# 4. Start full-stack dev server
npm run dev
# Server starts at http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Deploying to Hostinger (VPS / Cloud Node.js Plan)
1. Choose Hostinger VPS or Cloud Hosting with Node.js support (Hostinger shared cPanel plans without Node.js cannot run backend Express servers; ensure a Node.js-enabled plan or VPS is selected).
2. Upload the project folder to the server via Git or SFTP.
3. Run `npm install` and `npm run build`.
4. Configure process manager (PM2):
   ```bash
   npm install -g pm2
   pm2 start server.ts --name "shyam-palace-pms" --interpreter ./node_modules/.bin/tsx
   pm2 save
   pm2 startup
   ```
5. Configure Nginx reverse proxy to forward traffic on port 80/443 to `http://localhost:3000`.

---

## 6. API Endpoints

- `GET /api/health` — Service health check and location status.
- `POST /api/ai/concierge` — Pilgrim concierge powered by Gemini 3.8 Flash with Google Maps grounding.
- `POST /api/ai/operational-insights` — Front desk operational reasoning powered by Gemini 4 Argon with High Thinking.
