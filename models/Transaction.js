const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    tripId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['payment', 'refund', 'reward', 'bonus'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'wallet', 'cash', 'upi'],
        default: 'card'
    },
    description: {
        type: String,
        default: ''
    },
    recipientId: {
        type: String,
        default: ''
    },
    currency: {
        type: String,
        default: 'USD'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

transactionSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
