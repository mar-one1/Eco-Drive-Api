const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrerId: {
        type: String,
        required: true
    },
    referrerEmail: {
        type: String,
        required: true
    },
    referredUserId: {
        type: String,
        default: ''
    },
    referredEmail: {
        type: String,
        required: true
    },
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    rewardAmount: {
        type: Number,
        default: 10
    },
    rewardClaimed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
});

referralSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('Referral', referralSchema);
