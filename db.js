const mongoose = require('mongoose');

let isMongoConnected = false;

// In-Memory Storage Fallback if MongoDB service is stopped/offline
const memoryDb = {
    users: [],
    trips: [],
    bookings: [],
    reviews: [],
    notifications: [],
    ecoStats: [],
    transactions: [],
    preferences: [],
    savedTrips: [],
    referrals: [],
    supportTickets: [],
    messages: []
};

const connectDB = async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const MONGODB_URI = process.env.MONGODB_URI;

    if (isProduction && !MONGODB_URI) {
        throw new Error('MONGODB_URI is required in production');
    }

    const connectionString = MONGODB_URI || 'mongodb://127.0.0.1:27017/eco-drive';
    console.log('Connecting to MongoDB...');

    try {
        await mongoose.connect(connectionString, {
            serverSelectionTimeoutMS: 3000 // Fast timeout (3s) instead of waiting 30s
        });
        isMongoConnected = true;
        console.log('Successfully connected to MongoDB Database!');
    } catch (err) {
        isMongoConnected = false;
        if (isProduction) {
            throw new Error(`MongoDB unavailable in production: ${err.message}`);
        }
        console.warn('MongoDB unavailable; using in-memory development storage.');
    }
};

const getStatus = () => isMongoConnected;

module.exports = {
    connectDB,
    getStatus,
    memoryDb
};
