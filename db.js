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
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eco-drive';
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 3000 // Fast timeout (3s) instead of waiting 30s
        });
        isMongoConnected = true;
        console.log('Successfully connected to MongoDB Database!');
    } catch (err) {
        isMongoConnected = false;
        console.warn('⚠️ Could not connect to local MongoDB service (Service might be stopped).');
        console.warn('⚠️ Switching to In-Memory Database Fallback mode. All API operations will work smoothly!');
        console.warn('👉 To use persistent MongoDB, start the service using Admin terminal: net start MongoDB');
    }
};

const getStatus = () => isMongoConnected;

module.exports = {
    connectDB,
    getStatus,
    memoryDb
};
