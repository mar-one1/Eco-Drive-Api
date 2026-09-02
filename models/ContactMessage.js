const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    senderId: {
        type: String,
        required: true
    },
    receiverId: {
        type: String,
        required: true
    },
    tripId: {
        type: String,
        default: ''
    },
    text: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        enum: ['in_app', 'phone', 'email'],
        default: 'in_app'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

contactMessageSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
