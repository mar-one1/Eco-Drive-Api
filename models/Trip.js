const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    seats: {
        type: Number,
        required: true,
        min: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    origin: {
        name: String,
        latitude: Number,
        longitude: Number
    },
    destination: {
        name: String,
        latitude: Number,
        longitude: Number
    },
    departureTime: Date,
    availableSeats: Number,
    distanceMeters: Number,
    durationSeconds: Number,
    routeGeometry: String,
    currentLocation: {
        latitude: Number,
        longitude: Number,
        heading: Number,
        speed: Number,
        updatedAt: Date
    },
    driverId: {
        type: String,
        required: true
    },
    driverName: {
        type: String,
        default: 'Driver'
    },
    status: {
        type: String,
        enum: ['active', 'scheduled', 'started', 'in_progress', 'arrived', 'closed', 'completed', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

tripSchema.index({ status: 1, date: 1, departureTime: 1 });
tripSchema.index({ 'origin.latitude': 1, 'origin.longitude': 1 });
tripSchema.index({ 'destination.latitude': 1, 'destination.longitude': 1 });

tripSchema.pre('validate', function syncSeats(next) {
    if (this.availableSeats === undefined && this.seats !== undefined) this.availableSeats = this.seats;
    if (this.seats === undefined && this.availableSeats !== undefined) this.seats = this.availableSeats;
    next();
});

// Virtual transform to expose id as string for Android Retrofit compatibility
tripSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('Trip', tripSchema);
