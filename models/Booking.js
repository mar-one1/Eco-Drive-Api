const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    tripId: {
        type: String,
        required: true
    },
    passengerId: {
        type: String,
        required: true
    },
    seatsBooked: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'confirmed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

bookingSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('Booking', bookingSchema);
