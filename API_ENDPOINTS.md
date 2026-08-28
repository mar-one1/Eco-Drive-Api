# Eco-Drive API - Endpoints Quick Reference

## Base URL
```
http://localhost:5000/api
```

---

## Reviews
- `POST /reviews` - Create review
- `GET /reviews/user/:userId` - Get reviews for user
- `GET /reviews/trip/:tripId` - Get reviews for trip
- `GET /reviews/:id` - Get single review
- `DELETE /reviews/:id` - Delete review

## Preferences
- `POST /preferences` - Create/update preferences
- `GET /preferences/:userId` - Get user preferences
- `PUT /preferences/:userId` - Update preferences
- `POST /preferences/:userId/blacklist` - Add to blacklist

## Eco-Stats
- `POST /eco-stats` - Create eco stats
- `GET /eco-stats/:userId` - Get user eco stats
- `PUT /eco-stats/:userId` - Update eco stats
- `POST /eco-stats/:userId/add-trip` - Record trip
- `GET /eco-stats/leaderboard/global` - Global leaderboard

## Transactions
- `POST /transactions` - Create transaction
- `GET /transactions/user/:userId` - Get user transactions
- `GET /transactions/:id` - Get single transaction
- `PUT /transactions/:id` - Update transaction status
- `GET /transactions/stats/summary/:userId` - Get transaction summary

## Notifications
- `POST /notifications` - Create notification
- `GET /notifications/user/:userId` - Get user notifications
- `GET /notifications/user/:userId/unread` - Get unread notifications
- `PUT /notifications/:id` - Mark as read
- `PUT /notifications/user/:userId/mark-all-read` - Mark all read
- `DELETE /notifications/:id` - Delete notification

## Saved Trips
- `POST /saved-trips` - Save a trip
- `GET /saved-trips/user/:userId` - Get user's saved trips
- `PUT /saved-trips/:id` - Update saved trip
- `DELETE /saved-trips/:id` - Delete saved trip

## Referrals
- `POST /referrals` - Create referral
- `GET /referrals/user/:referrerId` - Get user's referrals
- `GET /referrals/code/:referralCode` - Get referral by code
- `POST /referrals/:id/complete` - Complete referral
- `POST /referrals/:id/claim-reward` - Claim reward
- `GET /referrals/stats/:referrerId` - Get referral stats

---

## Original Endpoints (Still Available)
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /trips` - Get available trips
- `GET /trips/admin/all` - Admin trip monitor data, including all lifecycle statuses
- `POST /trips` - Create trip
- `GET /trips/available` - Get trips with available seats
- `GET /trips/:id` - Get single trip
- `POST /bookings` - Book a trip
- `GET /bookings` - Get all bookings
- `GET /bookings/user/:userId` - Get user's bookings
- `GET /users` - User endpoints

---

## Common Request/Response Patterns

### Success Response (201 Created)
```json
{
  "message": "Resource created",
  "data": { ...resource }
}
```

### Success Response (200 OK)
```json
{
  "message": "Operation successful",
  "data": { ...resource or array }
}
```

### Error Response (400/404/500)
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Authentication
Currently not required for demo. In production, add:
- JWT token in headers: `Authorization: Bearer <token>`
- Rate limiting
- API key validation

---

## Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)

