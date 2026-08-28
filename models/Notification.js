const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['booking_confirmed', 'trip_cancelled', 'trip_started', 'trip_completed', 'review_received', 'message', 'promo', 'reminder'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedId: {
        type: String,
        default: ''
    },
    read: {
        type: Boolean,
        default: false
    },
    actionUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

notificationSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
