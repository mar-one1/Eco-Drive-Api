const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');
const Booking = require('./models/Booking');
const Trip = require('./models/Trip');
const locationService = require('./services/locationService');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/location', require('./routes/location'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));

// New Feature Routes
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/api/eco-stats', require('./routes/eco-stats'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/saved-trips', require('./routes/saved-trips'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/support', require('./routes/support'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

// Support non-prefixed routes for legacy client requests
app.use('/auth', require('./routes/auth'));
app.use('/trips', require('./routes/trips'));
app.use('/bookings', require('./routes/bookings'));

// Basic status route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Eco-Drive API',
    status: 'online',
    database: db.getStatus() ? 'MongoDB (Connected)' : 'In-Memory Fallback (MongoDB Service Stopped)'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.getStatus() ? 'mongodb' : 'memory',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    }
  });
});

const createRealtimeServer = (application) => {
  const httpServer = http.createServer(application);
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }
  });
  application.locals.io = io;
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'development-only-secret');
    if (!token || !secret) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, secret);
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.userId}`);
    socket.on('trip:join', async (tripId) => {
      const trip = db.getStatus() ? await Trip.findById(tripId).lean() : db.memoryDb.trips.find((item) => String(item.id || item._id) === String(tripId));
      if (!trip) return;
      const isDriver = String(trip.driverId) === String(socket.user.userId);
      const isPassenger = db.getStatus()
        ? await Booking.exists({ tripId: String(tripId), passengerId: String(socket.user.userId), status: { $in: ['pending', 'confirmed'] } })
        : db.memoryDb.bookings.some((item) => String(item.tripId) === String(tripId) && String(item.passengerId) === String(socket.user.userId) && item.status !== 'cancelled');
      if (isDriver || isPassenger || socket.user.role === 'admin') socket.join(`trip:${tripId}`);
    });
    socket.on('trip:leave', (tripId) => {
      if (!tripId) return;
      socket.leave(`trip:${tripId}`);
    });
    socket.on('driver:location:update', async (payload, callback = () => {}) => {
      try {
        if (socket.user.role !== 'driver' && socket.user.role !== 'admin') throw Object.assign(new Error('Driver role required'), { code: 'FORBIDDEN' });
        const trip = await locationService.updateTripLocation(payload.tripId, payload, socket.user.userId);
        io.to(`trip:${payload.tripId}`).emit('trip:location:update', { tripId: payload.tripId, location: trip.currentLocation });
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: { code: error.code || 'LOCATION_UPDATE_ERROR', message: error.message } });
      }
    });
  });
  return { httpServer, io };
};

const startServer = async () => {
  await db.connectDB();
  const { httpServer } = createRealtimeServer(app);
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => console.log(`Eco-Drive API server running on port ${PORT}`));
  return httpServer;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, createRealtimeServer, startServer };
