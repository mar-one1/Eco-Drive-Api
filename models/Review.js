const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    tripId: {
        type: String,
        required: true
    },
    fromUserId: {
        type: String,
        required: true
    },
    toUserId: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['driver', 'passenger'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

reviewSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('Review', reviewSchema);
