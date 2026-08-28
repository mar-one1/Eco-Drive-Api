const mongoose = require('mongoose');

const savedTripSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    fromLocation: {
        type: String,
        required: true
    },
    toLocation: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        default: ''
    },
    frequency: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

savedTripSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

// Compound index to prevent duplicates
savedTripSchema.index({ userId: 1, fromLocation: 1, toLocation: 1 }, { unique: true });

module.exports = mongoose.model('SavedTrip', savedTripSchema);
