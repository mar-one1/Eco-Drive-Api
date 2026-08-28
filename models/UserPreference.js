const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    carType: {
        type: String,
        enum: ['electric', 'hybrid', 'petrol', 'diesel', 'other'],
        default: 'petrol'
    },
    carModel: {
        type: String,
        default: ''
    },
    licensePlate: {
        type: String,
        default: ''
    },
    carbonEmissionsPerKm: {
        type: Number,
        default: 0.12
    },
    musicPreference: {
        type: String,
        enum: ['none', 'quiet', 'moderate', 'loud'],
        default: 'quiet'
    },
    smokingAllowed: {
        type: Boolean,
        default: false
    },
    petsAllowed: {
        type: Boolean,
        default: false
    },
    airConditioningPreference: {
        type: String,
        enum: ['off', 'low', 'medium', 'high'],
        default: 'medium'
    },
    conversationPreference: {
        type: String,
        enum: ['chatty', 'moderate', 'quiet'],
        default: 'moderate'
    },
    preferredRoutes: [{
        from: String,
        to: String,
        frequency: Number
    }],
    blacklist: [{
        userId: String,
        reason: String,
        addedAt: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userPreferenceSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
