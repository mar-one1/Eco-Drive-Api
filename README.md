# Eco-Drive API

Backend service for the Eco-Drive carpooling Android application. The API handles accounts, trips, bookings, seat availability, and driver/passenger contact details.

## Stack

- Node.js and Express.js
- MongoDB through Mongoose
- CORS and dotenv
- CommonJS modules

## Requirements

- Node.js 18 or newer
- npm
- MongoDB, optional when using the in-memory fallback

## Run Locally

```bash
npm install
npm start
```

Development mode with automatic restart:

```bash
npm run dev
```

The service listens on `http://localhost:3000` by default.

Create `.env` in this directory when needed:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/eco-drive
```

If MongoDB is unavailable, the API starts in in-memory mode. Data in that mode is lost when the server restarts.

## Health Check

```http
GET /
```

Returns the service status and whether MongoDB or the in-memory fallback is active.

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me/:userId
PUT  /api/auth/me/:userId
```

Registration accepts `name`, `email`, `password`, and optional `phone` and `role`. Profile updates accept only `name` and `phone`.

## Trips

```http
GET    /api/trips
GET    /api/trips/available
GET    /api/trips/user/:userId
GET    /api/trips/:id
POST   /api/trips
PUT    /api/trips/:id
DELETE /api/trips/:id
```

`GET /api/trips` accepts optional `from`, `to`, and `date` query parameters. Trip creation requires `from`, `to`, `date`, `time`, `seats`, and `price`; `driverId` and `driverName` are optional.

## Bookings

```http
GET    /api/bookings
GET    /api/bookings/user/:userId
GET    /api/bookings/trip/:tripId
GET    /api/bookings/:id
POST   /api/bookings
PUT    /api/bookings/:id
PATCH  /api/bookings/:id/passenger?passengerId=:passengerId
DELETE /api/bookings/:id
```

Creating a booking requires `tripId` and `passengerId`; `seatsBooked` defaults to `1`. A successful booking reduces available trip seats. Cancellation restores them.

## Compatibility Routes

Legacy clients can also use the non-prefixed versions of auth, trips, and bookings routes, such as `/trips` and `/bookings`.

## Project Layout

```text
server.js       Express app and route registration
db.js           MongoDB connection and in-memory fallback
models/         Mongoose schemas
routes/         Authentication, trip, booking, and user routes
```

## Notes

- Passwords are currently stored as plain text and tokens are placeholder strings. Use a password hash and signed token system before production deployment.
- The API has no authentication middleware yet; route access is currently based on request values.
