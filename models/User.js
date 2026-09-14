const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    phone: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['admin', 'driver', 'passenger', 'user'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
