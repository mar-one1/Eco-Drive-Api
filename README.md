# Eco-Drive API

This project is the backend service for the Eco-Drive ecosystem. It powers the Android app with authentication, trip discovery, bookings, eco metrics, notifications, referrals, support, messaging, and admin operations.

## Overview

The API is built with Node.js and Express and is designed to support a complete carpooling platform with both rider and driver workflows. It can run with MongoDB when configured, and automatically falls back to an in-memory database when MongoDB is unavailable.

## Tech stack

- Node.js
- Express.js
- MongoDB + Mongoose
- CORS
- dotenv
- in-memory fallback for local development

## Project structure

```text
server.js
routes/
  auth.js
  trips.js
  bookings.js
  users.js
  reviews.js
  preferences.js
  eco-stats.js
  transactions.js
  notifications.js
  saved-trips.js
  referrals.js
  support.js
  messages.js
  admin.js
models/
  User.js
  Trip.js
  Booking.js
  Review.js
  Notification.js
  SupportTicket.js
  EcoStat.js
  Transaction.js
  SavedTrip.js
  Referral.js
  Message.js
  etc.
db.js
```

## Features implemented by the API

### Authentication and users

- register user
- login user
- fetch/update profile
- role normalization for admin / driver / passenger
- legacy non-prefixed auth routes for compatibility

### Trips

- list trips
- filter by from, to, date
- get trip by id
- create trip
- update trip
- delete trip
- admin trip monitoring

### Bookings

- create booking
- list bookings by user or trip
- get booking by id
- update booking status
- cancel booking
- seat availability enforcement

### Reviews

- create review
- list user reviews
- list trip reviews
- delete review

### Preferences and blacklist

- save/update preferences
- get preferences by user
- add users to blacklist

### Eco stats

- create eco stat
- get user eco stats
- update eco stats
- record trip contribution
- leaderboard data

### Transactions

- create transaction
- list transactions by user
- fetch a transaction
- update status
- summary stats for a user

### Notifications

- create notification
- fetch user notifications
- fetch unread notifications
- mark as read
- mark all as read
- delete notification

### Saved trips

- save a route
- fetch saved routes for a user
- update saved route nickname
- remove saved route

### Referrals

- create referral
- fetch referrals for a user
- fetch referral by code
- complete referral
- claim reward
- referral stats

### Support

- create support ticket
- list all tickets
- list user tickets
- get ticket by id
- update ticket status/priority

### Messaging

- list messages for a conversation
- create messages
- fetch recent conversations

### Admin

- dashboard stats
- admin user list
- admin trip list
- support ticket moderation
- user role updates
- trip status updates

## Local development setup

### Install

```bash
npm install
```

### Run

```bash
npm start
```

### Development mode

```bash
npm run dev
```

Default local server:

```text
http://localhost:3000
```

### Environment file

Create a `.env` file in this folder if needed:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/eco-drive
```

## Health checks

```http
GET /
GET /api/health
```

The root route returns server status and whether the app is running with MongoDB or fallback memory mode.

## Main API routes

### Auth

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me/:userId
PUT  /api/auth/me/:userId
```

### Trips

```http
GET    /api/trips
GET    /api/trips/available
GET    /api/trips/user/:userId
GET    /api/trips/:id
POST   /api/trips
PUT    /api/trips/:id
DELETE /api/trips/:id
```

### Bookings

```http
GET    /api/bookings
GET    /api/bookings/user/:userId
GET    /api/bookings/trip/:tripId
GET    /api/bookings/:id
POST   /api/bookings
PUT    /api/bookings/:id
DELETE /api/bookings/:id
```

### Reviews

```http
POST /api/reviews
GET  /api/reviews/user/:userId
GET  /api/reviews/trip/:tripId
DELETE /api/reviews/:id
```

### Preferences

```http
POST /api/preferences
GET  /api/preferences/:userId
PUT  /api/preferences/:userId
POST /api/preferences/:userId/blacklist
```

### Eco stats

```http
POST /api/eco-stats
GET  /api/eco-stats/:userId
PUT  /api/eco-stats/:userId
POST /api/eco-stats/:userId/add-trip
GET  /api/eco-stats/leaderboard/global
```

### Transactions

```http
POST /api/transactions
GET  /api/transactions/user/:userId
GET  /api/transactions/:id
PUT  /api/transactions/:id
GET  /api/transactions/stats/summary/:userId
```

### Notifications

```http
POST /api/notifications
GET  /api/notifications/user/:userId
GET  /api/notifications/user/:userId/unread
PUT  /api/notifications/:id
PUT  /api/notifications/user/:userId/mark-all-read
DELETE /api/notifications/:id
```

### Saved trips

```http
POST /api/saved-trips
GET  /api/saved-trips/user/:userId
PUT  /api/saved-trips/:id
DELETE /api/saved-trips/:id
```

### Referrals

```http
POST /api/referrals
GET  /api/referrals/user/:referrerId
GET  /api/referrals/code/:referralCode
POST /api/referrals/:id/complete
POST /api/referrals/:id/claim-reward
GET  /api/referrals/stats/:referrerId
```

### Support

```http
POST /api/support
GET  /api/support
GET  /api/support/user/:userId
GET  /api/support/:id
PUT  /api/support/:id/status
```

### Admin

```http
GET /api/admin/stats
GET /api/admin/users
GET /api/admin/trips
GET /api/admin/support
PUT /api/admin/users/:userId/role
PUT /api/admin/trips/:id/status
PUT /api/admin/support/:id/status
```

## Compatibility routes

The API also exposes non-prefixed legacy routes for some features:

```http
/auth
/trips
/bookings
```

This keeps older clients working while newer Android app versions use the `/api/...` routes.

## Notes

- MongoDB is optional for local development because the app falls back to memory storage.
- The API is designed for rapid prototyping and local testing, not yet a hardened production-ready security setup.
- Authentication is currently lightweight and request-driven; production deployment should add real token validation and password hashing.

## Summary

The Eco-Drive API is the backend engine for the ride-sharing platform. It supports the full driver and rider lifecycle, admin oversight, support functionality, and eco-driven user engagement features used by the Android frontend.
