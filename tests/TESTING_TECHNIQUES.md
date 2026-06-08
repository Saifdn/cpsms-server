# White Box Testing Technique Coverage — CPSMS Server

This document maps every test suite in the project to the three white box testing techniques
required by the FYP guideline (Section 7.3.1).

---

## Technique 1: Control Flow / Branch Testing

> Tests every conditional branch (if/else, guard clauses, validation checks) to ensure all
> decision points in the code are exercised.

| Test File | Describe Block | Branches Exercised |
|---|---|---|
| `authService.test.js` | `[Branch] registerUser — input validation branches` | 4 missing-field guards; 2 phone parse/validation branches |
| `authService.test.js` | `[Branch] loginUser — validation and authentication branches` | `!email`, `!password`, `!user`, `!valid` (bcrypt mismatch) |
| `authService.test.js` | `[Branch] refreshAccessToken — token verification branches` | `!token`, jwt.verify catch, `!user`, hash mismatch, success |
| `authService.test.js` | `[Branch] forgotPassword — user lookup and email dispatch branches` | `!email`, `!user` early return, email send failure (fire-and-forget catch) |
| `authService.test.js` | `[Branch] resetPassword — token validation branches` | `!token`, `!password`, expired token (`!user` from findOne) |
| `bookingService.test.js` | `[Branch] createBooking — pre-condition validation and conditional branches` | `!session`, `bookedCount >= capacity`, `!packageData`, `addons.length > 0`, `if(shipmentData)` |
| `bookingService.test.js` | `[Branch] cancelBooking — status validation and session/queue update branches` | `booking.status === 'cancelled'`, nonCancellable array includes, `paymentStatus === 'paid'`, `if(booking.queue)`, queue status includes |
| `bookingService.test.js` | `[Branch] handleBillplzCallback — signature verification and payment routing branches` | Invalid HMAC, `!id`, `!payment`, `payment.frameOrder`, `isPaid === true/false`, `wasAlreadyPaid` guard |
| `bookingService.test.js` | `[Branch] adminCreateBooking — payment method and capacity validation branches` | Invalid paymentMethod, `!packageData`, `!session`, `bookedCount >= capacity`, capacity ternary |
| `bookingService.test.js` | `[Branch] updateBooking — field whitelist and not found branches` | Whitelisted fields only, `!booking` null check |
| `bookingService.test.js` | `[Branch] getMyBookings — status filter branch` | `if(status)` filter applied vs not applied |
| `bookingService.test.js` | `[Branch] getAllBookings — date filter and pagination branches` | `if(date)` session lookup, empty sessions early return |
| `sessionService.test.js` | `[Branch] generateSessions — required field and date validation branches` | 6 missing-field guards, invalid date format, `fromDate > toDate`, empty slot list |
| `sessionService.test.js` | `[Branch] generateSessions — break window skipping branches` | 3 break-overlap conditions: slot inside break, slot end inside break, no break provided |
| `sessionService.test.js` | `[Branch] listSessions — date filter branches` | `if(date)` false (empty filter), invalid date format, `if(date)` true (midnight filter) |
| `sessionService.test.js` | `[Branch] updateSession — field whitelist enforcement` | `!session` null check, non-whitelisted fields stripped |
| `paymentService.test.js` | `[Branch] getPaymentById — not found vs found branches` | `!payment` null check |
| `paymentService.test.js` | `[Branch] getPaymentStatus — payment routing branches` | `!payment`, `payment.booking` branch, `!booking`, `payment.frameOrder` branch, `!frameOrder`, neither booking nor frameOrder |
| `queueService.test.js` | `[Branch] checkIn — input validation and duplicate check branches` | `!bookingNumber`, `!booking`, existing queue entry duplicate |
| `queueService.test.js` | `[Branch] confirmArrival — status and studio update branches` | `!queueId`, `!queueEntry`, `status !== 'called'`, `if(queueEntry.studio)` null guard |
| `queueService.test.js` | `[Branch] getQueueStatusByBooking — status-based ahead count branches` | `!bookingId`, `!queueEntry`, status not in ['waiting','called'] (skip countDocuments), status 'waiting', status 'called' |
| `userService.test.js` | `[Branch] createGraduate — input validation and normalization` | `!fullName`, `!email`, `!phone` guards |
| `userService.test.js` | `[Branch] updateGraduate — field whitelist and normalization` | `!doc` null check, non-whitelisted fields stripped, normalization applied |
| `userService.test.js` | `[Branch] createAdmin — role validation branches` | Invalid role, valid 'admin', valid 'superadmin', default role |
| `userService.test.js` | `[Branch] createStaff — required field validation` | `!department` guard |
| `userService.test.js` | `[Branch] updateAdmin — not found vs updated branches` | `!doc` null check |
| `userService.test.js` | `[Branch] listStaff / getStaff / deleteStaff / updateStaff — field whitelist and not found branches` | `!doc` null checks, non-whitelisted fields stripped |
| `authMiddleware.test.js` | `[Branch] verifyAccessToken — Authorization header and token validation branches` | `!authHeader`, expired token, wrong signature, malformed token, valid token |
| `authMiddleware.test.js` | `[Branch] authorizeRoles — role inclusion check branches` | Role not in list (deny), role in list (allow), multiple allowed roles |
| `crypto.test.js` | `[Branch] encrypt — null/falsy input guard branches` | null, undefined, empty string |
| `crypto.test.js` | `[Branch] encrypt — ENCRYPTION_KEY validation branches` | Missing key, wrong length key |
| `crypto.test.js` | `[Branch] decrypt — null/falsy input and format validation branches` | null, undefined, one colon only, invalid hex |
| `generateTokens.test.js` | `[Branch] generateAccessToken — secret isolation branches` | Correct secret (pass), wrong secret (throw) |
| `generateTokens.test.js` | `[Branch] generateRefreshToken — secret isolation branches` | Correct secret (pass), wrong secret (throw) |

---

## Technique 2: Data Flow Testing (Data Tracking)

> Tracks how variables are **defined**, **transformed**, and **used** as they flow through
> functions — verifying that data is correctly computed, propagated, and that sensitive
> fields are properly cleared (killed) when no longer needed.

| Test File | Describe Block | Data Flow Tracked |
|---|---|---|
| `authService.test.js` | `[DataFlow] registerUser — password hashing and field normalization` | plaintext password → `bcrypt.hash()` → stored hash (never plaintext); `role` hardcoded; `password` stripped from return value |
| `authService.test.js` | `[DataFlow] loginUser — token generation and refresh token storage` | `generateRefreshToken()` → raw token → `bcrypt.hash()` → stored hash; `expiresAt = Date.now() + 7d` |
| `authService.test.js` | `[DataFlow] forgotPassword — reset token generation and expiry calculation` | `randomBytes(32)` → raw token → `SHA256` hash → stored in DB; raw token embedded in URL (never stored); `expiresAt = Date.now() + 10min` |
| `authService.test.js` | `[DataFlow] resetPassword — password replacement and token cleanup` | new password → `bcrypt.hash()` → replaces `user.password`; `user.passwordResetToken` → set to `undefined` (killed) |
| `bookingService.test.js` | `[DataFlow] createBooking — total amount calculation and Billplz amount conversion` | `packageData.price` + `reduce(addon.prices)` → `totalAmount` in RM → `× 100` → cents sent to Billplz |
| `bookingService.test.js` | `[DataFlow] handleBillplzCallback — payment amount conversion and booking state transitions` | `paid_amount` (string, cents) → `Number() / 100` → `payment.paidAmount` (RM); `payment.paidAmount` → `booking.totalPrice` |
| `bookingService.test.js` | `[DataFlow] cancelBooking — session bookedCount state transitions` | `session.bookedCount` (initial) → decremented by 1 → triggers `status` ternary ('full' vs 'available') |
| `sessionService.test.js` | `[DataFlow] generateSessions — slot time computation and batchId propagation` | `startTime + duration` → slot `startTime`/`endTime` for each iteration; `batchId` generated once → propagated to all docs; `capacity` string → `Number()` |
| `paymentService.test.js` | `[Path] getPaymentStatus — complete execution paths` | `gatewayTransactionId` → `payment` lookup → `booking`/`frameOrder` ID → secondary lookup → result fields |
| `queueService.test.js` | `[DataFlow] getQueueLog — pagination data computation` | `total` from `countDocuments` + `page`/`limit` inputs → `totalPages = Math.ceil(total/limit)` |
| `queueService.test.js` | `[DataFlow] skipCustomer — skippedCount increment and studio field reset` | `queueEntry.skippedCount` incremented by 1; `queueEntry.studio` → set to `null` (killed); `status` → reset to 'waiting' |
| `userService.test.js` | `[DataFlow] listGraduates — pagination metadata computation` | `countDocuments()` total + `page`/`limit` → `totalPages`, `skip` values |
| `userService.test.js` | `[DataFlow] listAdmins — pagination metadata computation` | Same pagination flow as listGraduates |
| `userService.test.js` | `[DataFlow] updateUserMe — field normalization before update` | `fullName` input → `toTitleCase()` transformation → normalized value passed to DB |
| `authMiddleware.test.js` | `[Branch] verifyAccessToken — success branch` | JWT token → `jwt.verify()` → decoded payload → `req.user` populated (userId, role) |
| `crypto.test.js` | `[DataFlow] encrypt → decrypt — plaintext transformation and round-trip recovery` | plaintext → AES-256-GCM cipher → `iv:tag:ciphertext` string → back to plaintext; random IV ensures different ciphertext each call |
| `generateTokens.test.js` | `[DataFlow] generateAccessToken — user fields to JWT payload` | `user._id` → `payload.userId`; `user.role/fullName/email` → embedded in token |
| `generateTokens.test.js` | `[DataFlow] generateRefreshToken — minimal payload` | Only `user._id` → `payload.userId`; role/email intentionally excluded (data minimisation) |

---

## Technique 3: Path Testing (Logic Testing)

> Covers distinct execution paths through a function from entry to exit, ensuring every
> logical route (including error paths, guard exits, and success paths) is exercised.

| Test File | Describe Block | Paths Covered |
|---|---|---|
| `authService.test.js` | `[Branch] registerUser` + `[DataFlow] registerUser` | **Path 1–4:** Missing field → throw 400; **Path 5:** Invalid phone → throw 400; **Path 6:** All valid → hash pw → create → return safe fields |
| `authService.test.js` | `[Branch] loginUser` + `[DataFlow] loginUser` | **P1:** Missing email; **P2:** Missing pw; **P3:** User not found; **P4:** Wrong password; **P5:** Success → generate tokens |
| `authService.test.js` | `[Branch] refreshAccessToken` | **P1:** No token; **P2:** Invalid JWT; **P3:** User gone; **P4:** Hash mismatch; **P5:** Success → new access token |
| `authService.test.js` | `[Branch] forgotPassword` + `[DataFlow] forgotPassword` | **P1:** Missing email; **P2:** User not found → generic msg, no email; **P3:** User found, email sent; **P4:** User found, email fails → still resolves |
| `authService.test.js` | `[Branch] resetPassword` + `[DataFlow] resetPassword` | **P1:** Missing token; **P2:** Missing password; **P3:** Token expired; **P4:** Success → hash + save + kill token |
| `authService.test.js` | `[Path] logoutUser` | **P1:** No token; **P2:** Invalid JWT; **P3:** Valid token, user found → clear + save |
| `bookingService.test.js` | `[Branch] createBooking` | **P1:** Session not found; **P2:** Session full; **P3:** Package not found; **P4:** No addons → success; **P5:** With addons → totalAmount summed; **P6:** With shipment → created |
| `bookingService.test.js` | `[Branch] cancelBooking` | **P1:** Not found; **P2:** Already cancelled; **P3–P7:** Non-cancellable statuses; **P8:** Pending payment → cancel, no session change; **P9:** Paid → decrement session; **P10:** With queue → cancel queue |
| `bookingService.test.js` | `[Branch] handleBillplzCallback` | **P1:** Bad signature; **P2:** No bill ID; **P3:** Payment not found; **P4:** FrameOrder payment; **P5:** Paid=true, first time; **P6:** Paid=true, idempotent; **P7:** Paid=false → cancelled |
| `bookingService.test.js` | `[Branch] adminCreateBooking` | **P1:** Invalid method; **P2:** Package not found; **P3:** Session not found; **P4:** Session full; **P5:** Success (cash/qr) → booked+paid status |
| `bookingService.test.js` | `[Path] reconcilePaymentById` | **P1:** Not pending → false; **P2:** No txn ID → false; **P3:** Billplz 404 → apply failed; **P4:** Billplz paid=true → apply paid; **P5:** Non-404 error → false |
| `bookingService.test.js` | `[Path] getBookingById` | **P1:** Not found → 404; **P2:** Found → return |
| `sessionService.test.js` | `[Branch] generateSessions` + `[DataFlow] generateSessions` | **P1–P6:** Missing field guards; **P7:** Invalid date; **P8:** Date order; **P9:** No slots; **P10:** Single day, no break; **P11:** Multi-day; **P12–P13:** With break window |
| `sessionService.test.js` | `[Path] updateSession / deleteSession` | **P1:** Not found → 404; **P2:** Found → deleted |
| `paymentService.test.js` | `[Path] getPaymentStatus` | **P1:** Payment not found; **P2:** Booking payment found; **P3:** FrameOrder payment found |
| `queueService.test.js` | `[Path] callNext` | **P1:** Missing studioId; **P2:** No customers waiting; **P3:** Success → assign studio, broadcast |
| `queueService.test.js` | `[Path] checkOut` | **P1:** Missing queueId; **P2:** Not found; **P3:** Success → complete + free studio |
| `queueService.test.js` | `[Branch] getQueueStatusByBooking` | **P1:** Missing ID; **P2:** Not found; **P3:** Status = in-progress (no count); **P4:** Status = waiting (count ahead); **P5:** Status = called (count ahead) |
| `userService.test.js` | `[Path] getUserMe / getGraduate / getAdmin` | **P1:** Not found → 404; **P2:** Found → return |
| `userService.test.js` | `[Path] deleteGraduate / deleteAdmin` | **P1:** Not found → 404; **P2:** Found → deleted |
| `authMiddleware.test.js` | `[Branch] verifyAccessToken` | **P1:** No header; **P2:** Expired; **P3:** Wrong secret; **P4:** Malformed; **P5:** Valid → next() |
| `authMiddleware.test.js` | `[Branch] authorizeRoles` | **P1:** Role denied; **P2:** Role allowed; **P3:** Superadmin allowed |
| `crypto.test.js` | `[DataFlow] encrypt → decrypt` | **P1:** null → null; **P2:** Valid input → encrypt → decrypt → original |
| `generateTokens.test.js` | `[Branch] access/refresh secret isolation` | **P1:** Correct secret → verified; **P2:** Wrong secret → throws |

---

## Summary

| Technique | Test Files | Describe Blocks | Approx. Tests |
|---|---|---|---|
| Control Flow / Branch Testing | 9 | 33 | ~110 |
| Data Flow Testing | 7 | 18 | ~45 |
| Path Testing | 8 | 22 | ~65 |
| **Total** | **9** | **73** | **~220** |

> Run `npm test` to execute all tests.
> Run `npm run test:coverage` to generate the HTML coverage report at `coverage/lcov-report/index.html`.
