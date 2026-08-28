const mongoose = require('mongoose');

const ecoStatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    totalTripsAsDriver: {
        type: Number,
        default: 0
    },
    totalTripsAsPassenger: {
        type: Number,
        default: 0
    },
    totalDistance: {
        type: Number,
        default: 0
    },
    totalCarbonSaved: {
        type: Number,
        default: 0
    },
    totalPassengersCarried: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    carbonFootprintReduction: {
        type: Number,
        default: 0
    },
    ecoLevel: {
        type: String,
        enum: ['newbie', 'eco-conscious', 'eco-warrior', 'carbon-neutral', 'carbon-negative'],
        default: 'newbie'
    },
    achievements: [{
        name: String,
        description: String,
        earnedAt: Date
    }],
    monthlyStats: [{
        month: String,
        tripsAsDriver: Number,
        tripsAsPassenger: Number,
        distance: Number,
        carbonSaved: Number
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

ecoStatSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
    }
});

module.exports = mongoose.model('EcoStat', ecoStatSchema);
