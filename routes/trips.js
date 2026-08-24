const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const db = require('../db');

// GET /api/trips
router.get('/', async (req, res) => {
    try {
        const { from, to, date } = req.query;

        if (db.getStatus()) {
            let query = { status: 'active' };
            if (from && from.trim() !== '') query.from = { $regex: from.trim(), $options: 'i' };
            if (to && to.trim() !== '') query.to = { $regex: to.trim(), $options: 'i' };
            if (date && date.trim() !== '') query.date = date.trim();

            const trips = await Trip.find(query).sort({ date: 1 });
            return res.json(trips);
        } else {
            let filtered = db.memoryDb.trips.filter(t => (t.status || 'active') === 'active');
            if (from && from.trim() !== '') {
                filtered = filtered.filter(t => t.from.toLowerCase().includes(from.trim().toLowerCase()));
            }
            if (to && to.trim() !== '') {
                filtered = filtered.filter(t => t.to.toLowerCase().includes(to.trim().toLowerCase()));
            }
            if (date && date.trim() !== '') {
                filtered = filtered.filter(t => t.date === date.trim());
            }
            // Ensure id field is set
            filtered = filtered.map(t => ({ ...t, id: t.id || t._id }));
            return res.json(filtered);
        }
    } catch (err) {
        console.error('Error fetching trips:', err);
        res.status(500).json({ message: 'Failed to retrieve trips', error: err.message });
    }
});

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
        const { from, to, date, time, seats, price, driverId, driverName } = req.body;

        if (!from || !to || !date || !time || seats === undefined || price === undefined) {
            return res.status(400).json({ message: 'Missing required trip fields' });
        }

        if (db.getStatus()) {
            const newTrip = new Trip({
                from,
                to,
                date,
                time,
                seats: Number(seats),
                price: Number(price),
                driverId: driverId || 'anonymous_driver',
                driverName: driverName || 'Driver'
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
                seats: Number(seats),
                price: Number(price),
                driverId: driverId || 'anonymous_driver',
                driverName: driverName || 'Driver',
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
