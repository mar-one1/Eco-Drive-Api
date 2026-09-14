const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const User = require('../models/User');
const db = require('../db');
const routingService = require('../services/routingService');
const { matchTrips, distanceKm } = require('../services/tripMatchingService');
const locationService = require('../services/locationService');

const lifecycleStatuses = ['active', 'scheduled', 'in_progress', 'arrived', 'closed', 'completed', 'cancelled'];

// Admin monitor: returns every trip, including closed and cancelled trips.
router.get('/admin/all', async (req, res) => {
    try {
        if (String(req.get('X-User-Role') || '').toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        if (db.getStatus()) {
            const trips = await Trip.find().sort({ date: -1, time: -1 }).lean();
            return res.json(trips.map(trip => ({ ...trip, id: trip._id.toString() })));
        }
        return res.json(db.memoryDb.trips.map(trip => ({ ...trip, id: trip.id || trip._id })));
    } catch (err) {
        res.status(500).json({ message: 'Failed to retrieve all trips', error: err.message });
    }
});

// GET /api/trips
router.get('/', async (req, res) => {
    try {
        const { from, to, date, status, availableSeats } = req.query;

        if (db.getStatus()) {
            let query = { status: status || 'active' };
            if (from && from.trim() !== '') query.from = { $regex: from.trim(), $options: 'i' };
            if (to && to.trim() !== '') query.to = { $regex: to.trim(), $options: 'i' };
            if (date && date.trim() !== '') query.date = date.trim();
            if (availableSeats !== undefined) query.$or = [{ seats: { $gte: Number(availableSeats) } }, { availableSeats: { $gte: Number(availableSeats) } }];

            const trips = await Trip.find(query).sort({ date: 1 });
            return res.json(trips);
        } else {
            let filtered = db.memoryDb.trips.filter(t => (t.status || 'active') === (status || 'active'));
            if (from && from.trim() !== '') {
                filtered = filtered.filter(t => t.from.toLowerCase().includes(from.trim().toLowerCase()));
            }
            if (to && to.trim() !== '') {
                filtered = filtered.filter(t => t.to.toLowerCase().includes(to.trim().toLowerCase()));
            }
            if (date && date.trim() !== '') {
                filtered = filtered.filter(t => t.date === date.trim());
            }
            if (availableSeats !== undefined) filtered = filtered.filter(t => (t.availableSeats ?? t.seats ?? 0) >= Number(availableSeats));
            // Ensure id field is set
            filtered = filtered.map(t => ({ ...t, id: t.id || t._id }));
            return res.json(filtered);
        }
    } catch (err) {
        console.error('Error fetching trips:', err);
        res.status(500).json({ message: 'Failed to retrieve trips', error: err.message });
    }
});

// GET /api/trips/cities - Get available cities for dropdown
router.get('/cities', async (req, res) => {
    try {
        if (db.getStatus()) {
            const trips = await Trip.find({ status: { $in: ['active', 'scheduled'] } }).select('from to').lean();
            const cities = new Set();
            trips.forEach(trip => {
                if (trip.from) cities.add(trip.from);
                if (trip.to) cities.add(trip.to);
            });
            return res.json({ success: true, cities: Array.from(cities).sort() });
        } else {
            const trips = db.memoryDb.trips.filter(t => (t.status || 'active') === 'active' || t.status === 'scheduled');
            const cities = new Set();
            trips.forEach(trip => {
                if (trip.from) cities.add(trip.from);
                if (trip.to) cities.add(trip.to);
            });
            return res.json({ success: true, cities: Array.from(cities).sort() });
        }
    } catch (err) {
        console.error('Error fetching cities:', err);
        res.status(500).json({ message: 'Failed to retrieve cities', error: err.message });
    }
});

router.get('/nearby', async (req, res) => {
    try {
        const latitude = Number(req.query.lat);
        const longitude = Number(req.query.lng);
        const radiusKm = Number(req.query.radiusKm || 10);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !Number.isFinite(radiusKm) || radiusKm <= 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid location or radius' } });
        }
        const trips = db.getStatus() ? await Trip.find({ status: { $in: ['active', 'scheduled', 'started', 'in_progress'] } }) : db.memoryDb.trips;
        const nearby = trips.filter((trip) => trip.origin && distanceKm({ latitude, longitude }, trip.origin) <= radiusKm && (trip.availableSeats ?? trip.seats ?? 0) > 0);
        return res.json(nearby);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to find nearby trips' });
    }
});

router.get('/matching', async (req, res) => {
    try {
        const required = ['originLat', 'originLng', 'destinationLat', 'destinationLng', 'departureTime'];
        if (required.some((field) => req.query[field] === undefined)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Matching coordinates and departureTime are required' } });
        const trips = db.getStatus() ? await Trip.find({ status: { $in: ['active', 'scheduled'] } }).lean() : db.memoryDb.trips;
        return res.json(await matchTrips(trips, req.query));
    } catch (error) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
});

router.post('/:id/location', async (req, res) => {
    try {
        const trip = await locationService.updateTripLocation(req.params.id, req.body, req.user && req.user.userId);
        if (req.app.locals.io) req.app.locals.io.to(`trip:${req.params.id}`).emit('trip:location:update', { tripId: req.params.id, location: trip.currentLocation });
        return res.json({ success: true, location: trip.currentLocation });
    } catch (error) {
        const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : error.code === 'VALIDATION_ERROR' ? 400 : 409;
        return res.status(status).json({ success: false, error: { code: error.code || 'LOCATION_UPDATE_ERROR', message: error.message } });
    }
});

const changeLifecycle = (from, to) => {
    const allowed = { scheduled: ['started', 'cancelled'], active: ['started', 'cancelled'], started: ['completed'], in_progress: ['completed'] };
    return (allowed[from] || []).includes(to);
};

router.post('/:id/start', async (req, res) => {
    return updateLifecycle(req, res, 'started');
});

router.post('/:id/complete', async (req, res) => {
    return updateLifecycle(req, res, 'completed');
});

router.post('/:id/cancel', async (req, res) => {
    return updateLifecycle(req, res, 'cancelled');
});

async function updateLifecycle(req, res, nextStatus) {
    try {
        if (db.getStatus()) {
            const trip = await Trip.findById(req.params.id);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });
            if (req.user && String(trip.driverId) !== String(req.user.userId) && req.user.role !== 'admin') return res.status(403).json({ message: 'Only the driver or admin can change trip state' });
            if (!changeLifecycle(trip.status, nextStatus)) return res.status(409).json({ message: `Cannot change trip from ${trip.status} to ${nextStatus}` });
            trip.status = nextStatus;
            await trip.save();
            if (req.app.locals.io) req.app.locals.io.to(`trip:${req.params.id}`).emit(`trip:${nextStatus === 'started' ? 'started' : nextStatus}` , { tripId: req.params.id, trip });
            return res.json(trip);
        }
        const trip = db.memoryDb.trips.find((item) => String(item.id || item._id) === String(req.params.id));
        if (!trip) return res.status(404).json({ message: 'Trip not found' });
        if (req.user && String(trip.driverId) !== String(req.user.userId) && req.user.role !== 'admin') return res.status(403).json({ message: 'Only the driver or admin can change trip state' });
        if (!changeLifecycle(trip.status || 'active', nextStatus)) return res.status(409).json({ message: `Cannot change trip from ${trip.status || 'active'} to ${nextStatus}` });
        trip.status = nextStatus;
        return res.json(trip);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update trip lifecycle' });
    }
}

// GET /api/trips/available
router.get('/available', async (req, res) => {
    try {
        const { from, to, date } = req.query;

        if (db.getStatus()) {
            let query = { status: 'active', seats: { $gt: 0 } };
            if (from && from.trim() !== '') query.from = { $regex: from.trim(), $options: 'i' };
            if (to && to.trim() !== '') query.to = { $regex: to.trim(), $options: 'i' };
            if (date && date.trim() !== '') query.date = date.trim();

            const trips = await Trip.find(query).sort({ date: 1 });
            return res.json(trips);
        } else {
            let filtered = db.memoryDb.trips.filter(t => (t.status || 'active') === 'active' && t.seats > 0);
            if (from && from.trim() !== '') {
                filtered = filtered.filter(t => t.from.toLowerCase().includes(from.trim().toLowerCase()));
            }
            if (to && to.trim() !== '') {
                filtered = filtered.filter(t => t.to.toLowerCase().includes(to.trim().toLowerCase()));
            }
            if (date && date.trim() !== '') {
                filtered = filtered.filter(t => t.date === date.trim());
            }
            filtered = filtered.map(t => ({ ...t, id: t.id || t._id }));
            return res.json(filtered);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to retrieve available trips', error: err.message });
    }
});

// GET /api/trips/user/:userId
router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const trips = await Trip.find({ driverId: req.params.userId }).sort({ date: -1 });
            return res.json(trips);
        } else {
            const trips = db.memoryDb.trips.filter(t => t.driverId === req.params.userId);
            return res.json(trips.map(t => ({ ...t, id: t.id || t._id })));
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to retrieve user trips', error: err.message });
    }
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const trip = await Trip.findById(req.params.id);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });
            return res.json(trip);
        } else {
            const trip = db.memoryDb.trips.find(t => (t.id || t._id) === req.params.id);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });
            return res.json({ ...trip, id: trip.id || trip._id });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving trip', error: err.message });
    }
});

// POST /api/trips - Create new trip
router.post('/', async (req, res) => {
    try {
        const { from, to, date, time, seats, price, driverId, driverName, origin, destination, departureTime } = req.body;

        if (!from || !to || !date || !time || seats === undefined || price === undefined) {
            return res.status(400).json({ message: 'Missing required trip fields' });
        }

        const tripSeats = Number(seats);
        const tripPrice = Number(price);
        if (!Number.isInteger(tripSeats) || tripSeats < 0 || !Number.isFinite(tripPrice) || tripPrice < 0) {
            return res.status(400).json({ message: 'seats must be a non-negative whole number and price must be non-negative' });
        }

        let route = {};
        if (origin && destination) {
            try {
                route = await routingService.calculateRoute(origin, destination);
            } catch (error) {
                return res.status(error.code === 'VALIDATION_ERROR' ? 400 : 502).json({ success: false, error: { code: error.code || 'ROUTING_ERROR', message: error.code === 'VALIDATION_ERROR' ? error.message : 'Unable to calculate trip route' } });
            }
        }

        if (db.getStatus()) {
            const newTrip = new Trip({
                from,
                to,
                date,
                time,
                seats: tripSeats,
                price: tripPrice,
                driverId: driverId || 'anonymous_driver',
                driverName: driverName || 'Driver',
                origin,
                destination,
                departureTime: departureTime ? new Date(departureTime) : undefined,
                availableSeats: tripSeats,
                distanceMeters: route.distanceMeters,
                durationSeconds: route.durationSeconds,
                routeGeometry: route.geometry
            });
            const savedTrip = await newTrip.save();
            return res.status(201).json(savedTrip);
        } else {
            const id = 'trip_' + Date.now();
            const newTrip = {
                _id: id,
                id: id,
                from,
                to,
                date,
                time,
                seats: tripSeats,
                price: tripPrice,
                driverId: driverId || 'anonymous_driver',
                driverName: driverName || 'Driver',
                origin,
                destination,
                departureTime: departureTime ? new Date(departureTime) : undefined,
                availableSeats: tripSeats,
                distanceMeters: route.distanceMeters,
                durationSeconds: route.durationSeconds,
                routeGeometry: route.geometry,
                status: 'active',
                createdAt: new Date()
            };
            db.memoryDb.trips.push(newTrip);
            return res.status(201).json(newTrip);
        }
    } catch (err) {
        console.error('Error creating trip:', err);
        res.status(500).json({ message: 'Failed to create trip', error: err.message });
    }
});

// PUT /api/trips/:id
router.put('/:id', async (req, res) => {
    try {
        if (req.body.status && !lifecycleStatuses.includes(req.body.status)) {
            return res.status(400).json({ message: 'Invalid trip status' });
        }
        if (db.getStatus()) {
            const updatedTrip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!updatedTrip) return res.status(404).json({ message: 'Trip not found' });
            return res.json(updatedTrip);
        } else {
            const index = db.memoryDb.trips.findIndex(t => (t.id || t._id) === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Trip not found' });
            db.memoryDb.trips[index] = { ...db.memoryDb.trips[index], ...req.body };
            return res.json(db.memoryDb.trips[index]);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update trip', error: err.message });
    }
});

// DELETE /api/trips/:id
router.delete('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
            if (!deletedTrip) return res.status(404).json({ message: 'Trip not found' });
            return res.json({ message: 'Trip deleted successfully' });
        } else {
            const index = db.memoryDb.trips.findIndex(t => (t.id || t._id) === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Trip not found' });
            db.memoryDb.trips.splice(index, 1);
            return res.json({ message: 'Trip deleted successfully' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete trip', error: err.message });
    }
});

module.exports = router;
