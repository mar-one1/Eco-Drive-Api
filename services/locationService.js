const Trip = require('../models/Trip');
const db = require('../db');
const { validateCoordinates } = require('./geoUtils');

const updateTripLocation = async (tripId, payload, userId) => {
    const coordinates = validateCoordinates(payload);
    const location = {
        ...coordinates,
        heading: payload.heading === undefined ? undefined : Number(payload.heading),
        speed: payload.speed === undefined ? undefined : Number(payload.speed),
        updatedAt: payload.timestamp ? new Date(payload.timestamp) : new Date()
    };

    if (db.getStatus()) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw Object.assign(new Error('Trip not found'), { code: 'NOT_FOUND' });
        if (userId && String(trip.driverId) !== String(userId)) throw Object.assign(new Error('Only the trip driver can update location'), { code: 'FORBIDDEN' });
        if (!['started', 'in_progress', 'active'].includes(trip.status)) throw Object.assign(new Error('Trip is not active'), { code: 'INVALID_STATE' });
        trip.currentLocation = location;
        await trip.save();
        return trip;
    }

    const trip = db.memoryDb.trips.find((item) => String(item.id || item._id) === String(tripId));
    if (!trip) throw Object.assign(new Error('Trip not found'), { code: 'NOT_FOUND' });
    if (userId && String(trip.driverId) !== String(userId)) throw Object.assign(new Error('Only the trip driver can update location'), { code: 'FORBIDDEN' });
    if (trip.status && !['started', 'in_progress', 'active'].includes(trip.status)) throw Object.assign(new Error('Trip is not active'), { code: 'INVALID_STATE' });
    trip.currentLocation = location;
    return trip;
};

module.exports = { updateTripLocation };
