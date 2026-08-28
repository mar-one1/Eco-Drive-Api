# Eco-Drive API - New Features Documentation

## Overview
The Eco-Drive API has been enhanced with 7 powerful new features to provide users with a comprehensive ride-sharing and environmental tracking experience.

---

## 1. Reviews & Ratings System

### Purpose
Allow users to rate drivers and passengers, building trust and accountability in the community.

### Model: Review
- **Fields**: tripId, fromUserId, toUserId, rating (1-5), comment, category (driver/passenger), createdAt
- **Key Features**:
  - Rate drivers or passengers after trips
  - Add optional comments
  - Automatically updates user's average rating

### Endpoints

#### Create Review
```
POST /api/reviews
Body: {
  tripId: string,
  fromUserId: string,
  toUserId: string,
  rating: number (1-5),
  comment: string (optional),
  category: 'driver' | 'passenger'
}
```

#### Get User Reviews
```
GET /api/reviews/user/:userId
Returns: Array of reviews for the user
```

#### Get Trip Reviews
```
GET /api/reviews/trip/:tripId
Returns: All reviews for a specific trip
```

#### Get Single Review
```
GET /api/reviews/:id
```

#### Delete Review
```
DELETE /api/reviews/:id
```

---

## 2. User Preferences & Settings

### Purpose
Allow users to customize their ride experience with personal preferences about car type, music, smoking, and more.

### Model: UserPreference
- **Fields**: 
  - Vehicle Info: carType (electric/hybrid/petrol/diesel), carModel, licensePlate
  - Ride Preferences: musicPreference, smokingAllowed, petsAllowed, airConditioningPreference
  - Social: conversationPreference (chatty/moderate/quiet)
  - Other: preferredRoutes, blacklist

### Endpoints

#### Create/Update Preferences
```
POST /api/preferences
Body: {
  userId: string (required),
  carType: string,
  carModel: string,
  musicPreference: string,
  smokingAllowed: boolean,
  petsAllowed: boolean,
  ...other fields
}
```

#### Get User Preferences
```
GET /api/preferences/:userId
Returns: User's preference settings (creates defaults if none exist)
```

#### Update Preferences
```
PUT /api/preferences/:userId
Body: { ...updated fields }
```

#### Add User to Blacklist
```
POST /api/preferences/:userId/blacklist
Body: {
  blockedUserId: string,
  reason: string (optional)
}
```

---

## 3. Eco-Stats & Carbon Tracking

### Purpose
Track environmental impact and gamify eco-friendly behavior with carbon savings, levels, and achievements.

### Model: EcoStat
- **Fields**:
  - Trip Stats: totalTripsAsDriver, totalTripsAsPassenger, totalDistance, totalPassengersCarried
  - Eco Impact: totalCarbonSaved, carbonFootprintReduction
  - Ratings: averageRating, totalReviews
  - Levels: ecoLevel (newbie → carbon-negative)
  - Achievements: Array of earned badges
  - Monthly Stats: Historical data by month

### Eco Levels
- **Newbie**: 0 - 49 kg CO2 saved
- **Eco-Conscious**: 50 - 199 kg CO2 saved
- **Eco-Warrior**: 200 - 499 kg CO2 saved
- **Carbon-Neutral**: 500 - 999 kg CO2 saved
- **Carbon-Negative**: 1000+ kg CO2 saved

### Endpoints

#### Create Eco Stats
```
POST /api/eco-stats
Body: { userId: string }
Returns: New eco stats object
```

#### Get User Eco Stats
```
GET /api/eco-stats/:userId
Returns: User's environmental impact statistics
```

#### Update Eco Stats
```
PUT /api/eco-stats/:userId
Body: { ...updated fields }
```

#### Record a Trip
```
POST /api/eco-stats/:userId/add-trip
Body: {
  distance: number (in km),
  role: 'driver' | 'passenger',
  passengersCount: number (optional, for drivers)
}
Returns: Updated eco stats with carbon saved calculated
```

#### Get Global Leaderboard
```
GET /api/eco-stats/leaderboard/global
Returns: Top 10 users by carbon saved
```

---

## 4. Transactions & Payment History

### Purpose
Track all financial transactions including payments, refunds, rewards, and bonuses.

### Model: Transaction
- **Fields**: userId, tripId, amount, type (payment/refund/reward/bonus), status (pending/completed/failed/refunded), paymentMethod (card/wallet/cash/upi), description, recipientId, currency, createdAt

### Endpoints

#### Create Transaction
```
POST /api/transactions
Body: {
  userId: string,
  tripId: string,
  amount: number,
  type: 'payment' | 'refund' | 'reward' | 'bonus',
  paymentMethod: string,
  description: string (optional),
  recipientId: string (optional)
}
```

#### Get User Transactions
```
GET /api/transactions/user/:userId
Returns: All transactions for user (sorted by newest first)
```

#### Get Specific Transaction
```
GET /api/transactions/:id
```

#### Update Transaction Status
```
PUT /api/transactions/:id
Body: { status: 'pending' | 'completed' | 'failed' | 'refunded' }
```

#### Get Transaction Summary
```
GET /api/transactions/stats/summary/:userId
Returns: {
  totalSpent: number,
  totalEarned: number,
  totalRefunds: number,
  totalRewards: number,
  completedTransactions: number
}
```

---

## 5. Notifications System

### Purpose
Keep users informed about trip updates, bookings, reviews, and promotions in real-time.

### Model: Notification
- **Fields**: userId, type (booking_confirmed/trip_cancelled/trip_started/trip_completed/review_received/message/promo/reminder), title, message, relatedId, read, actionUrl, createdAt

### Endpoints

#### Create Notification
```
POST /api/notifications
Body: {
  userId: string,
  type: string (booking_confirmed, trip_cancelled, etc.),
  title: string,
  message: string,
  relatedId: string (optional),
  actionUrl: string (optional)
}
```

#### Get User Notifications
```
GET /api/notifications/user/:userId
Returns: Last 50 notifications (sorted by newest)
```

#### Get Unread Notifications
```
GET /api/notifications/user/:userId/unread
Returns: Only unread notifications
```

#### Mark as Read
```
PUT /api/notifications/:id
Returns: Updated notification with read=true
```

#### Mark All as Read
```
PUT /api/notifications/user/:userId/mark-all-read
Returns: Success message
```

#### Delete Notification
```
DELETE /api/notifications/:id
```

---

## 6. Saved Trips/Favorite Routes

### Purpose
Allow users to save frequently used routes for quick booking.

### Model: SavedTrip
- **Fields**: userId, fromLocation, toLocation, nickname, frequency, createdAt

### Endpoints

#### Save a Trip
```
POST /api/saved-trips
Body: {
  userId: string,
  fromLocation: string,
  toLocation: string,
  nickname: string (optional)
}
Returns: If route already saved, increases frequency counter
```

#### Get User's Saved Trips
```
GET /api/saved-trips/user/:userId
Returns: Array sorted by most frequently used
```

#### Delete Saved Trip
```
DELETE /api/saved-trips/:id
```

#### Update Saved Trip
```
PUT /api/saved-trips/:id
Body: { nickname: string }
```

---

## 7. Referral System

### Purpose
Encourage user growth through referral rewards and tracking.

### Model: Referral
- **Fields**: referrerId, referrerEmail, referredUserId, referredEmail, referralCode (unique), status (pending/completed), rewardAmount, rewardClaimed, createdAt, completedAt

### Endpoints

#### Create Referral
```
POST /api/referrals
Body: {
  referrerId: string,
  referrerEmail: string,
  referredEmail: string,
  rewardAmount: number (optional, default: 10)
}
Returns: Referral with unique code
```

#### Get User's Referrals
```
GET /api/referrals/user/:referrerId
Returns: All referrals created by user (sorted by newest)
```

#### Get Referral by Code
```
GET /api/referrals/code/:referralCode
Returns: Referral details
```

#### Complete Referral (Sign Up)
```
POST /api/referrals/:id/complete
Body: { referredUserId: string }
Returns: Updated referral with status='completed'
```

#### Claim Reward
```
POST /api/referrals/:id/claim-reward
Returns: Updated referral with rewardClaimed=true
Note: Only works if referral is completed
```

#### Get Referral Stats
```
GET /api/referrals/stats/:referrerId
Returns: {
  totalReferrals: number,
  completedReferrals: number,
  pendingReferrals: number,
  totalRewardsEarned: number,
  rewardsClaimed: number
}
```

---

## Usage Examples

### Example 1: Driver Creates Trip and Tracks Carbon Saved
```
1. Create trip using /api/trips POST
2. Passenger books using /api/bookings POST
3. After trip completion:
   - POST /api/eco-stats/:driverId/add-trip with distance and role='driver'
   - POST /api/transactions with payment info
   - POST /api/reviews for rating
```

### Example 2: Complete User Journey
```
1. User signs up with referral code
2. POST /api/referrals/:id/complete
3. Setup preferences at POST /api/preferences
4. Create eco stats at POST /api/eco-stats
5. Search and book trips
6. Get notifications on booking confirmation
7. After trip: leave review, record eco stats
8. View profile with achievements
```

---

## Database Support

All features work with both:
- **MongoDB**: Full database persistence
- **In-Memory**: Fallback when MongoDB is unavailable

---

## Integration Notes

- All endpoints support both prefixed (`/api/`) and non-prefixed routes for compatibility
- Timestamps are automatically set by the server
- User averages and stats are automatically updated
- The system gracefully handles missing MongoDB connection

---

## Future Enhancement Ideas

- Real-time notifications via WebSocket
- Chat messaging between drivers and passengers
- Advanced matching algorithm based on preferences
- Carbon offset marketplace
- Premium tier features
- Integration with payment gateways
- Mobile app push notifications

