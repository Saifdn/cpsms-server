# CPSMS Server

Backend API for the **Convocation Photo Session Management System (CPSMS)** — a Final Year Project that manages graduation photo studio bookings, real-time customer queuing, payments, and parcel shipments for Kelab Fotokreatif.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ES Modules) |
| Framework | Express.js 5.x |
| Database | MongoDB Atlas via Mongoose 9.x |
| Real-time | Socket.IO 4.x |
| Auth | JWT (access + refresh tokens) + bcryptjs |
| Payments | Billplz (webhook-driven) |
| Logistics | EasyParcel API (OAuth 2.0) |
| Email | Nodemailer + HTML templates + QR codes |
| Rate Limiting | Upstash Redis |
| File Uploads | Multer (base64 stored in MongoDB) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in all values:

```env
NODE_ENV=development
PORT=8000
MONGO_URI=                  # MongoDB Atlas connection string
JWT_ACCESS_SECRET=          # 32+ char random string
JWT_REFRESH_SECRET=         # Different 32+ char random string
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLIENT_URL=                 # Frontend origin for CORS (e.g. http://localhost:5173)
SESSION_SECRET=             # Express session secret

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# EasyParcel OAuth
EP_CLIENT_ID=
EP_CLIENT_SECRET=
EP_REDIRECT_URI=

# Billplz
BILLPLZ_API_KEY=
BILLPLZ_COLLECTION_ID=
BILLPLZ_X_SIGNATURE=

# Gmail SMTP
EMAIL_USER=
EMAIL_PASS=
```

### 3. Seed the admin user

```bash
node src/seed/seedAdmin.js
```

### 4. Run the server

```bash
npm run dev     # Development with hot reload
npm start       # Production
```

Server runs on `http://localhost:8000` by default.

## API Routes

All routes are prefixed with `/api/` except EasyParcel OAuth:

| Prefix | Description |
|---|---|
| `POST /api/auth/...` | Register, login, token refresh, logout, password reset |
| `/api/users` | CRUD for graduates, staff, and admins |
| `/api/studios` | Studio management and availability toggling |
| `/api/packages` | Photo package CRUD |
| `/api/addons` | Add-on services CRUD |
| `/api/sessions` | Time slot batch generation and management |
| `/api/bookings` | Full booking lifecycle; `POST /api/bookings/billplz-callback` is public (no auth) |
| `/api/queue` | Check-in, call-next, confirm-arrival, checkout |
| `/api/payments` | Payment status lookup |
| `/api/shipments` | EasyParcel quotation, order submission, wallet balance |
| `/api/promos` | Promotional ads with image upload |
| `/api/dashboard` | Admin analytics overview |
| `/easyparcel/auth` | EasyParcel OAuth connect and callback |
| `/easyparcel/webhook` | EasyParcel tracking status updates |

## User Roles

```
superadmin > admin > staff > graduate
```

## Booking Lifecycle

```
pending → booked → checked-in → in-progress → completed → preparing → delivery
                                                                       (cancelled at any point)
```

Payment flows through Billplz webhook: `pending → paid` (or `failed` / `refunded`).

Queue status: `waiting → called → in-progress → completed` (or `cancelled`).

## Key Architecture

- **JWT rotation** — Access tokens expire in 15 min. Refresh via `POST /api/auth/refresh`. Refresh tokens are stored hashed on the User document.
- **Socket.IO broadcasting** — Every queue state change emits `queueUpdated` to all connected clients via `broadcastQueueUpdate()`.
- **EasyParcel middleware** — `ensureEasyParcel` auto-refreshes the OAuth token before every shipment request, or redirects to re-auth if both tokens are expired.
- **Billplz webhook** — `createBooking` returns a Billplz payment URL. Billplz POSTs to `/api/bookings/billplz-callback` on payment completion, which updates both the `Payment` and `Booking` documents and sends a confirmation email with QR code.
- **User discriminators** — `Graduate`, `Staff`, and `Admin` extend the base `User` model using Mongoose discriminators keyed on the `role` field.
