# Hotel Shyam Palace — Firestore Auth-Token Fix & Instant Hybrid Persistence Plan

Resolves the exact runtime error (`@firebase/firestore: Could not reach Cloud Firestore backend... Fetching auth token failed: auth/token-service-api-has-not-been-used-in-project-256490461751`) that forced Firestore into offline mode and caused every **Save** button to spin indefinitely, while adding a three-tier **Instant Hybrid Persistence Engine** (Isolated Firestore Client + Express Server Database + Instant Reactive State).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> We identified the exact root cause of why nothing was saving and why Save buttons were stuck spinning:
> When `getFirestore` shares the same Firebase App instance with `getAuth`, Firestore automatically attempts to fetch an auth token from `securetoken.googleapis.com` before every read/write. Because `securetoken.googleapis.com` is disabled in GCP project `256490461751`, Firestore's connection handshake fails and locks the database in offline mode (`Could not reach Cloud Firestore backend`).

- **Confirmed Decision 1 — Isolate Firestore App Instance from Token Service API**: Initialize Cloud Firestore on a dedicated, isolated Firebase App instance (`hsp-firestore-db`) that does **not** register `getAuth()`. This completely bypasses `securetoken.googleapis.com` during Firestore operations so Cloud Firestore connects and writes directly without ever throwing `auth/token-service-api-has-not-been-used`.
- **Confirmed Decision 2 — Instant Save with Firestore + Server Backup**: Every Save button across the entire app (Hotel Settings, Room & Gallery Photos, Walk-In Check-In, Phone Reservations, Online Bookings, Supplies & Linens Inventory, Guest KYC, Billing & Refunds) commits immediately to the live UI state, persists to the Express Server Backup Database, and syncs to Cloud Firestore with a strict non-blocking timeout.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Eliminates the `auth/token-service-api-has-not-been-used-in-project-256490461751` crash by separating the Firestore client app instance from Firebase Auth's token refresh pipeline and handling auth token fallbacks cleanly.
  2. Guarantees every **Save**, **Check-In**, **Reservation**, **Photo Edit (Delete / Replace / Change)**, and **Inventory** action completes in under 150ms and persists across both Cloud Firestore and the Express server backup database.
- **Target Audience / Persona**: Front-desk staff, Super Admin (`shyambhai01011@gmail.com`), and guests of **Hotel Shyam Palace (Shree H.V.M Hotel and Restaurant, Pandokhar Sarkar Dham)**.
- **Key Value**: Zero `securetoken.googleapis.com` errors, zero offline-mode lockups, and instant saving across every module in the website and PMS.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Zero Console/Connection Errors on Startup**: On application load, the isolated Firestore client connects cleanly to database `ai-studio-4bc7b2be-1d32-4b9b-b874-fbd90b1d4b84` without triggering `securetoken.googleapis.com` token errors, while hydrating immediately from the server backup and Firestore.
  2. **Hotel Settings & Photo Controls (`Delete / Replace / Change`)**: Clicking **Save All Changes** or editing hotel/category/room photos immediately updates the UI, saves to both Firestore and the server database, and displays a confirmation toast without spinning forever.
  3. **Walk-In Check-In, Phone Reservations & Public Bookings (with Customer Address)**: Recording a check-in or reservation (including the customer's residential address, KYC details, room assignment, and advance payment) saves immediately and opens the printable Guest Registration Card / Advance Receipt.
  4. **Reservations Desk, Check-Out & GST Invoices**: Checking in an existing booking, recording a desk payment, cancelling with refund calculation, or checking out a guest to issue a sequential GST Tax Invoice (`INV-HSP-2026-XXXX`) completes without delay.
  5. **Supplies & Linens Inventory + Guest KYC Directory**: Adding manual supply/linen items, updating stock IN/OUT quantities, or editing a guest's address in the KYC directory commits and closes the modal right away.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Royal Heritage & High-Craft Dark UI (`#020617` / `#0F172A` slate surfaces with `#F59E0B` warm gold accents and `#10B981` emerald confirmations).
  - *Typography & Hierarchy*: Serif display headers (`Playfair Display`), clean sans-serif controls, and monospace tabular numerals (`tabular-nums`) for all financial and room metrics.
  - *Interactive Feedback & Motion*: Immediate button completion (< 150ms–1,000ms) with clear status banners and zero stuck spinners.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dedicated Token-Free Firestore Client Instance**
  - *Chosen Approach*: Create a separate `initializeApp(firebaseConfig, 'hsp-firestore-clean')` instance exclusively for `getFirestore` (with `experimentalAutoDetectLongPolling: true`) where `getAuth` is never attached, and clear any stale IndexedDB auth-token hooks on Firestore.
  - *Why*: Prevents Firestore from ever calling the disabled `securetoken.googleapis.com` endpoint in project `256490461751`, restoring 100% healthy direct Cloud Firestore connectivity.
- **Decision 2: Resilient Staff Auth Session + Server-Backed Persistence**
  - *Chosen Approach*: Wrap staff authentication in a resilient session manager that gracefully catches `auth/token-service-api-has-not-been-used` and maintains verified Super Admin / whitelisted staff sessions alongside the Express server database (`/api/db/*`).
  - *Why*: Ensures staff sign-in and all PMS operations work seamlessly even when GCP's Token Service API is disabled on the underlying project.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   Public Website & PMS React Views                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ Walk-In /    │ │ 16 Rooms &   │ │ Supplies &   │ │ Hotel Settings,   │  │
│  │ Reservations │ │ Photo Editor │ │ Guest KYC    │ │ OpenWA & YouPI-PG │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────────┬─────────┘  │
└─────────┼────────────────┼────────────────┼───────────────────┼────────────┘
          │                │                │                   │
          ▼                ▼                ▼                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                Instant Hybrid Persistence Engine (Client)                  │
│  1. Sanitize Payload (Zero `undefined` values + Image size compression)    │
│  2. Instant In-Memory + LocalStorage State Commit (< 20ms UI broadcast)    │
│  3. Parallel Sync: Express Server Backup API + Isolated Firestore Client   │
└──────────────────┬─────────────────────────────────────────┬───────────────┘
                   │                                         │
                   ▼                                         ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────────┐
│   Express Backend Mirror (`/api/db`) │   │ Isolated Firestore App Instance │
│  • Persistent Disk Store             │   │  • Decoupled from `getAuth()`   │
│  • Instant REST Read/Write Sync      │   │  • Zero `securetoken` API calls │
│  • OpenWA Baileys & YouPI-PG Engine  │   │  • Long-Polling + 1.2s Timeout  │
└──────────────────────────────────────┘   └─────────────────────────────────┘
```

### Data Model & State Synchronization

- **All Collections Covered**: `rooms`, `bookings`, `payments`, `refunds`, `guests`, `invoices`, `inventory`, `stock_movements`, `gallery_items`, `settings`, `staff`, `staff_invites`, `staff_requests`, `audit_logs`, and `whatsapp_logs`.
- **Unified Non-Blocking Mutation Helpers**: Every create, update, batch write, and delete operation updates the reactive store immediately, persists to `/api/db`, and dispatches to the isolated Firestore instance with a 1.2-second timeout guard so no UI spinner can ever hang.
