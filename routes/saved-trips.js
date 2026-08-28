const express = require('express');
const router = express.Router();
const SavedTrip = require('../models/SavedTrip');
const db = require('../db');

// POST /api/saved-trips - Save a trip route
router.post('/', async (req, res) => {
    try {
        const { userId, fromLocation, toLocation, nickname } = req.body;

        if (!userId || !fromLocation || !toLocation) {
            return res.status(400).json({ message: 'userId, fromLocation, and toLocation are required' });
        }

        if (db.getStatus()) {
            let savedTrip = await SavedTrip.findOne({ userId, fromLocation, toLocation });

            if (savedTrip) {
                savedTrip.frequency += 1;
                await savedTrip.save();
                return res.json({ message: 'Saved trip frequency updated', savedTrip });
            }

            const newSavedTrip = new SavedTrip({
                userId,
                fromLocation,
                toLocation,
                nickname: nickname || `${fromLocation} to ${toLocation}`,
                frequency: 1
            });

            const saved = await newSavedTrip.save();
            return res.status(201).json({ message: 'Trip saved', savedTrip: saved });
        } else {
            db.memoryDb.savedTrips = db.memoryDb.savedTrips || [];
            let savedTrip = db.memoryDb.savedTrips.find(
                st => st.userId === userId && st.fromLocation === fromLocation && st.toLocation === toLocation
            );

            if (savedTrip) {
                savedTrip.frequency += 1;
                return res.json({ message: 'Saved trip frequency updated', savedTrip });
            }

            const newSavedTrip = {
                id: Date.now().toString(),
                userId,
                fromLocation,
                toLocation,
                nickname: nickname || `${fromLocation} to ${toLocation}`,
                frequency: 1,
                createdAt: new Date()
            };

            db.memoryDb.savedTrips.push(newSavedTrip);
            return res.status(201).json({ message: 'Trip saved', savedTrip: newSavedTrip });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to save trip', error: err.message });
    }
});

// GET /api/saved-trips/user/:userId - Get user's saved trips
router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const savedTrips = await SavedTrip.find({ userId: req.params.userId }).sort({ frequency: -1 });
            return res.json(savedTrips);
        } else {
            const savedTrips = (db.memoryDb.savedTrips || [])
                .filter(st => st.userId === req.params.userId)
                .sort((a, b) => b.frequency - a.frequency);
            return res.json(savedTrips);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch saved trips', error: err.message });
    }
});

// DELETE /api/saved-trips/:id - Delete a saved trip
router.delete('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const savedTrip = await SavedTrip.findByIdAndDelete(req.params.id);
            if (!savedTrip) return res.status(404).json({ message: 'Saved trip not found' });
            return res.json({ message: 'Saved trip deleted' });
        } else {
            const index = (db.memoryDb.savedTrips || []).findIndex(st => st.id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Saved trip not found' });
            db.memoryDb.savedTrips.splice(index, 1);
            return res.json({ message: 'Saved trip deleted' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete saved trip', error: err.message });
    }
});

// PUT /api/saved-trips/:id - Update a saved trip
router.put('/:id', async (req, res) => {
    try {
        const { nickname } = req.body;

        if (db.getStatus()) {
            const savedTrip = await SavedTrip.findByIdAndUpdate(
                req.params.id,
                { nickname },
                { new: true }
            );

            if (!savedTrip) return res.status(404).json({ message: 'Saved trip not found' });
            return res.json({ message: 'Saved trip updated', savedTrip });
        } else {
            const savedTrip = (db.memoryDb.savedTrips || []).find(st => st.id === req.params.id);
            if (!savedTrip) return res.status(404).json({ message: 'Saved trip not found' });
            if (nickname) savedTrip.nickname = nickname;
            return res.json({ message: 'Saved trip updated', savedTrip });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update saved trip', error: err.message });
    }
});

module.exports = router;
