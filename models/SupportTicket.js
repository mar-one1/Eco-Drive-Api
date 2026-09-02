const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['driver', 'passenger', 'admin', 'user'],
        default: 'user'
    },
    category: {
        type: String,
        enum: ['account', 'trip', 'payment', 'safety', 'technical', 'other'],
        default: 'other'
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

supportTicketSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
