# Eco-Drive — Codebase Analysis

> Auto-generated analysis of the full-stack carpooling platform.
> Last updated: 2026-09-15

---

## 1. Project Overview

Eco-Drive is a **full-stack ride-sharing / carpooling platform** consisting of:

| Component | Stack | Location |
|-----------|-------|----------|
| **Backend API** | Node.js + Express 4 + Mongoose 7 + Socket.IO | `Eco-Drive-Api/` |
| **Android App** | Java + Android SDK 34 + MVVM + Retrofit + Room | `Eco-Drive/` |

---

## 2. Directory Structure

```
D:\eco-drive\
├── Eco-Drive/                              # Android app
│   ├── app/
│   │   ├── build.gradle                    # App-level config (compileSdk 34, minSdk 30)
│   │   └── src/main/java/com/marone/ecodrive/
│   │       ├── EcoDriveApplication.java    # App init (ApiClient singleton)
│   │       ├── Activitys/                  # 19 Activity screens
│   │       ├── ViewModels/                 # 13 ViewModels
│   │       ├── Repository/                 # 13 Repositories
│   │       ├── Models/                     # 9 Room entities + DAOs
│   │       ├── Api/                        # Retrofit interfaces, DTOs, ApiClient, RealtimeClient
│   │       ├── Adapters/                   # 10 RecyclerView adapters
│   │       ├── Data/                       # AppDatabase (Room v6)
│   │       └── Utils/                      # SessionManager, DriverLocationTracker
│   ├── build.gradle                        # Root Gradle (AGP 7.2.2)
│   └── gradle/wrapper/                     # Gradle 7.3.3
├── Eco-Drive-Api/                           # Backend API
│   ├── server.js                           # Entry point (Express + Socket.IO + health checks)
│   ├── db.js                               # MongoDB + in-memory fallback
│   ├── seed.js                             # DB seeder (5 users, 4 trips, etc.)
│   ├── routes/                             # 16 Express routers
│   ├── models/                             # 12 Mongoose schemas
│   ├── services/                           # 6 business logic modules
│   ├── middleware/                          # auth.js (JWT), authorize.js (roles)
│   └── tests/                              # Jest + Supertest (3 tests)
└── ANALYSIS.md                             # This file
```

---

## 3. Backend API (`Eco-Drive-Api/`)

### 3.1 Technology

- **Runtime:** Node.js (CommonJS modules)
- **Framework:** Express 4.18
- **Database:** MongoDB via Mongoose 7.6, with automatic **in-memory fallback** (`db.getStatus()` gates every route)
- **Real-time:** Socket.IO 4.8
- **Auth:** JWT (`jsonwebtoken` v9) + `bcryptjs` for hashing
- **Security:** Helmet 8, `express-rate-limit` v8 (300 req / 15 min)
- **External APIs:** Nominatim (OpenStreetMap geocoding), OSRM (routing)

### 3.2 Entry Point — `server.js`

Creates Express app, mounts middleware (helmet, cors, rate-limit, JSON parser), registers all routes, sets up Socket.IO with JWT socket auth, connects MongoDB, starts HTTP server on port 3000 (configurable).

### 3.3 Authentication & Authorization

- `middleware/auth.js`: `authenticate` extracts `Bearer` token, verifies JWT (payload: `{userId, role, name}`), attaches `req.user`. `issueToken` creates 7-day tokens.
- `middleware/authorize.js`: Role-based gating (`admin`, `driver`, `passenger`).
- Admin endpoints also check `X-User-Role: admin` header on the server side.

### 3.4 Routes (16 routers)

| Router | Key Endpoints | Notes |
|--------|---------------|-------|
| `auth.js` | `POST /register`, `POST /login`, `GET /me/:userId`, `PUT /me/:userId` | Public (no auth middleware on register/login) |
| `trips.js` | CRUD, `/nearby`, `/matching`, lifecycle (`start`/`complete`/`cancel`), `/cities`, `POST /:id/location` | Matching uses Haversine proximity + time scoring |
| `bookings.js` | Create (seat validation), confirm, cancel, list, `PATCH /:id/passenger` (reassign) | |
| `reviews.js` | CRUD, recomputes EcoStat `averageRating`/`totalReviews` on create/update/delete | |
| `eco-stats.js` | CRUD, `/add-trip` (updates counters + level), `/leaderboard/global` | |
| `transactions.js` | CRUD (always `status:'completed'`), per-user list, `/stats/summary/:userId` | |
| `notifications.js` | CRUD, unread list, mark-all-read | 50-item limit, descending |
| `messages.js` | Send (Socket.IO emit), list by user/conversation/trip, mark-read | |
| `preferences.js` | Upsert (smoking/pets/music/conversation) + `blacklist` (blocked user IDs) | |
| `saved-trips.js` | Save route (duplicate increments `frequency`), list, update, delete | |
| `referrals.js` | Create (`REF` + 8-char code), list, lookup, `complete`, `claim-reward`, stats | |
| `support.js` | Create ticket (auto-unassigned), list user tickets, update status | |
| `admin.js` | Dashboard stats, user/trip/ticket management | Gated by `X-User-Role` header |
| `location.js` | Update stored `currentLocation` | |
| `routes.js` | OSRM route calculation | |
| `users.js` | Search (stub — not implemented) | |

### 3.5 Socket.IO Events

| Direction | Event | Auth | Notes |
|-----------|-------|------|-------|
| Client→Server | `trip:join` | JWT | Joins `trip:{tripId}` room |
| Client→Server | `driver:location:update` | JWT (driver/admin) | Broadcasts `trip:location:update` to trip room |
| Server→Client | `trip:location:update` | — | Passenger receives driver location |
| Server→Client | `message:new` | — | Emitted from HTTP routes via `req.app.locals.io` |
| Server→Client | `notification:new` | — | Emitted from HTTP routes |

### 3.6 Services

| Service | Purpose |
|---------|---------|
| `geocodingService` | Nominatim forward/reverse geocoding with 5-min TTL cache |
| `routingService` | OSRM distance/duration/geometry calculation |
| `tripMatchingService` | Haversine proximity scoring, seat filtering, ranking |
| `notificationService` | Creates DB notification + Socket.IO push |
| `locationService` | Trip location updates |
| `geoUtils` | Coordinate validation, Haversine formula |

### 3.7 Models (12 Mongoose schemas)

`User`, `Trip`, `Booking`, `Review`, `EcoStat`, `Notification`, `Transaction`, `SavedTrip`, `Referral`, `SupportTicket`, `UserPreference`, `ContactMessage`

### 3.8 Dual Database Strategy

Every route handler checks `db.getStatus()`:
- **MongoDB connected:** Uses Mongoose queries
- **MongoDB unavailable:** Falls back to in-memory arrays (seeded from `seed.js` or created at runtime)

This makes local development zero-config.

---

## 4. Android App (`Eco-Drive/`)

### 4.1 Technology

- **Language:** Java
- **Min SDK:** 30 / **Compile SDK:** 34 / **Target SDK:** 32
- **Build:** Gradle 7.3.3 + AGP 7.2.2, Java 1.8
- **Package:** `com.marone.ecodrive`
- **ViewBinding:** Enabled

### 4.2 Architecture — MVVM

```
Activity → ViewModel → Repository → Retrofit (API) + Room (local DB)
                                    ↓
                              LiveData (observed by Activity)
```

### 4.3 Networking

| File | Role |
|------|------|
| `ApiClient.java` | Singleton Retrofit instance with `AuthInterceptor` (adds `Authorization: Bearer <token>` + `X-User-Role` headers) |
| `ApiService.java` | Main Retrofit interface (auth, profile, support, reviews, preferences, eco-stats, transactions, notifications, saved-trips, referrals, admin, messages) |
| `TripApi.java` | Trip-specific endpoints (CRUD, nearby, matching, lifecycle) |
| `BookingApi.java` | **Legacy** — non-prefixed paths (superseded by `BookingService` in `ApiService`) |
| `LocationApi.java` / `RouteApi.java` | Geocoding/routing helpers |
| `RealtimeClient.java` | Socket.IO client (token auth, infinite reconnection) |

**Base URL:** Configurable via `BuildConfig.API_BASE_URL` (default `http://10.0.2.2:3000/` for emulator)

### 4.4 Local Database (Room v6 — `carpool_db`)

| Entity | Table | Key Fields |
|--------|-------|------------|
| `Trip` | `trips` | id, origin/destination (LocationPoint), driverName, availableSeats, departureTime, distanceMeters, durationSeconds, routeGeometry, status |
| `User` | `users` | id, name, email, role, phone |
| `Booking` | `bookings` | id, tripId, userId, seats, status |
| `Notification` | `notification` | id, userId, title, message, type, read |
| `Review` | `reviews` | id, tripId, userId, rating, comment |
| `EcoStat` | `eco_stats` | id, userId, carbonSaved, tripsCount, level |
| `Transaction` | `transaction` | id, userId, type, amount, status |
| `SavedTrip` | `saved_trips` | id, userId, fromLocation, toLocation (unique pair), frequency |
| `Message` | `messages` | id, senderId, receiverId, content, tripId, read |

**Migrations:** 4→5 (trip columns), 5→6 (messages table)

### 4.5 Activities (19 screens)

| Activity | Purpose |
|----------|---------|
| `LoginActivity` | Launcher, auth entry, session redirect |
| `RegisterActivity` | User registration |
| `activity_trip_list` | **Main screen** — tabbed (available trips / my trips / bookings), booking flow, driver lifecycle, location tracking, review gate |
| `activity_create_trip` | Driver trip creation (Nominatim autocomplete, date/time pickers, validation) |
| `BookingListActivity` | Booking management |
| `ProfileActivity` | User profile |
| `FeatureHubActivity` | Feature navigation hub |
| `AdminDashboardActivity` | Admin dashboard (overview/users/trips/tickets tabs) |
| `AdminTripsActivity` | Admin trip monitor |
| `ReviewActivity` | Reviews |
| `PreferencesActivity` | Ride preferences (smoking/pets/music/conversation) |
| `EcoStatsActivity` | Environmental impact stats + leaderboard |
| `WalletActivity` | Transaction history |
| `NotificationsActivity` | Notification center |
| `SavedTripsActivity` | Favorite routes |
| `ReferralActivity` | Referral system |
| `MessagingActivity` | In-app messaging |
| `SupportActivity` | Support tickets |
| `NotebookActivity` | Unknown/legacy |

### 4.6 Key Utilities

| Utility | Purpose |
|---------|---------|
| `SessionManager` | JWT token + user data storage via SharedPreferences |
| `DriverLocationTracker` | Streams GPS location → `driver:location:update` socket event |

---

## 5. Features Matrix

| Feature | Backend Route | Android Activity | ViewModel | Repository | Room Entity |
|---------|---------------|------------------|-----------|------------|-------------|
| Auth (login/register) | `auth.js` | `LoginActivity`, `RegisterActivity` | `LoginViewModel` | `AuthRepository` | `User` |
| Trip browsing | `trips.js` | `activity_trip_list` | `TripViewModel` | `TripRepository` | `Trip` |
| Trip creation | `trips.js` | `activity_create_trip` | `TripViewModel` | `TripRepository` | `Trip` |
| Trip matching | `trips.js /matching` | `activity_trip_list` | `TripViewModel` | `TripRepository` | `Trip` |
| Nearby trips | `trips.js /nearby` | `activity_trip_list` | `TripViewModel` | `TripRepository` | `Trip` |
| Bookings | `bookings.js` | `BookingListActivity` | `BookingViewModel` | `BookingRepository` | `Booking` |
| Reviews | `reviews.js` | `ReviewActivity` | `ReviewViewModel` | `ReviewRepository` | `Review` |
| Eco-stats | `eco-stats.js` | `EcoStatsActivity` | `EcoStatsViewModel` | `EcoStatsRepository` | `EcoStat` |
| Transactions/wallet | `transactions.js` | `WalletActivity` | `TransactionViewModel` | `TransactionRepository` | `Transaction` |
| Notifications | `notifications.js` | `NotificationsActivity` | `NotificationViewModel` | `NotificationRepository` | `Notification` |
| Saved trips | `saved-trips.js` | `SavedTripsActivity` | `SavedTripViewModel` | `SavedTripRepository` | `SavedTrip` |
| Referrals | `referrals.js` | `ReferralActivity` | `ReferralViewModel` | `ReferralRepository` | — |
| Support tickets | `support.js` | `SupportActivity` | `SupportViewModel` | `SupportRepository` | — |
| Messaging | `messages.js` | `MessagingActivity` | `MessagingViewModel` | `MessagingRepository` | `Message` |
| Preferences | `preferences.js` | `PreferencesActivity` | `PreferencesViewModel` | `PreferencesRepository` | — |
| Live location | Socket.IO | `activity_trip_list` | — | `LocationRepository` | — |
| Geocoding | `location.js`, `routes.js` | `activity_create_trip` | `LocationViewModel` | `LocationRepository` | — |
| Admin dashboard | `admin.js` | `AdminDashboardActivity`, `AdminTripsActivity` | — | — | — |
| Profile | `auth.js /me` | `ProfileActivity` | `LoginViewModel` | `AuthRepository` | `User` |

---

## 6. Role-Based Access Matrix

| Action | Passenger | Driver | Admin |
|--------|-----------|--------|-------|
| Browse/book trips | ✅ | ✅ | ✅ |
| Create trips | ❌ | ✅ | ✅ |
| Start/complete/cancel trips | ❌ | ✅ | ✅ |
| Broadcast location | ❌ | ✅ | ✅ |
| Review trips | ✅ | ✅ | ✅ |
| Admin dashboard | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |
| Change trip/ticket status | ❌ | ❌ | ✅ |

---

## 7. Testing

| Area | Framework | Coverage |
|------|-----------|----------|
| Backend | Jest 30.5 + Supertest 7.2 | 3 unit tests (geoUtils, tripMatching) |
| Android unit | JUnit 4.13 | Placeholder (`2+2=4`) |
| Android instrumented | Espresso 3.6 | Placeholder (package name check) |

Testing is minimal — both stacks need test expansion.

---

## 8. Build & Deployment

### Android

```bash
cd Eco-Drive
./gradlew assembleDebug          # Debug APK → app/build/outputs/apk/debug/
./gradlew assembleRelease        # Release APK (minify disabled)
```

### Backend

```bash
cd Eco-Drive-Api
npm install
npm run dev                      # Development (nodemon)
npm start                        # Production
npm test                         # Jest tests
```

**Environment variables** (`.env`):
- `PORT` (default 3000)
- `MONGODB_URI` (falls back to in-memory if unset)
- `JWT_SECRET`
- `CORS_ORIGIN`
- `NOMINATIM_URL`, `OSRM_URL`

---

## 9. Known Issues & Quirks

| Issue | Location | Severity |
|-------|----------|----------|
| Stale README package path (`ma/gr/sigr/eco_drive`) | `Eco-Drive/README.md` | Low |
| `BookingApi.java` uses legacy non-prefixed paths | `Eco-Drive/.../Api/BookingApi.java` | Medium — may cause 404s |
| `NotificationDao` targets table `notification` (no 's') | `Eco-Drive/.../Models/NotificationDao.java` | Low (Room migration) |
| `TransactionDao` backticks `transaction` table name | `Eco-Drive/.../Models/TransactionDao.java` | Low |
| `users.js` search endpoint is a stub | `Eco-Drive-Api/routes/users.js` | Medium |
| Profile update only accepts `name`/`phone` | `Eco-Drive-Api/routes/auth.js` | Low |
| ProGuard rules all commented out | `Eco-Drive/app/proguard-rules.pro` | Medium (release builds unoptimized) |
| No Firebase / Google Maps integration | — | Low (all map-less, Nominatim only) |
| Test coverage nearly zero | Both stacks | High |

---

## 10. Dependencies

### Backend (`package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.18.2 | HTTP framework |
| mongoose | 7.6.3 | MongoDB ODM |
| socket.io | 4.8.1 | Real-time WebSocket |
| jsonwebtoken | 9.0.2 | JWT auth |
| bcryptjs | 2.4.3 | Password hashing |
| helmet | 8.0.0 | Security headers |
| express-rate-limit | 7.4.1 | Rate limiting |
| cors | 2.8.5 | CORS |
| dotenv | 16.4.5 | Env vars |
| axios | 1.7.8 | HTTP client (Nominatim/OSRM) |
| jest / supertest | 30.5 / 7.2 | Testing |

### Android (`app/build.gradle`)

| Library | Version | Purpose |
|---------|---------|---------|
| Retrofit + Gson | 2.9 + converter | REST client |
| OkHttp | 3.14.9 | HTTP + interceptors |
| Room | 2.6.1 | Local SQLite DB |
| LiveData + ViewModel | 2.6.1 | MVVM lifecycle |
| Navigation | 2.7.7 | Fragment navigation |
| Socket.IO Client | 2.1.0 | Real-time |
| SwipeRefreshLayout | 1.1.0 | Pull-to-refresh |
| Security-Crypto | 1.1.0-alpha06 | Encrypted prefs |

---

## 11. Full-Stack Data Flow Example

```
1. Passenger opens app → LoginActivity → JWT stored in SessionManager
2. activity_trip_list fetches trips via TripRepository → Retrofit GET /api/trips
3. Backend queries MongoDB (or in-memory) → returns Trip array
4. Passenger books → POST /api/bookings → seats decremented → Booking created
5. Driver starts trip → POST /api/trips/:id/start → status: active→started
6. Driver location tracker → Socket.IO driver:location:update → broadcast to trip room
7. Passenger sees live location on map → trip:location:update event
8. Trip completed → POST /api/trips/:id/complete → status: in_progress→completed
9. Passenger reviews → POST /api/reviews → EcoStat updated → leaderboard recalculated
```

---

## 12. Recommendations

1. **Add comprehensive tests** — both backend and Android have nearly zero coverage
2. **Fix legacy `BookingApi.java`** — align with non-prefixed paths or remove
3. **Enable ProGuard** for release builds to reduce APK size
4. **Complete `users.js` search** endpoint
5. **Add Firebase/Google Maps** for production-quality maps and push notifications
6. **Add CI/CD** — no GitHub Actions workflows exist
7. **Consolidate table naming** (notification vs notifications, transaction vs transactions)
8. **Update stale README** package path
