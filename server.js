const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();

// Initialize DB connection with fast timeout & in-memory fallback
db.connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eco-Drive API server running on port ${PORT}`);
});
