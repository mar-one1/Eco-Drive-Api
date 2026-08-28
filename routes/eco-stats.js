const express = require('express');
const router = express.Router();
const EcoStat = require('../models/EcoStat');
const db = require('../db');

// POST /api/eco-stats - Create eco stats for user
router.post('/', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        if (db.getStatus()) {
            let ecoStat = await EcoStat.findOne({ userId });

            if (!ecoStat) {
                ecoStat = new EcoStat({ userId });
                await ecoStat.save();
            }

            return res.status(201).json({ message: 'Eco stats created', ecoStat });
        } else {
            db.memoryDb.ecoStats = db.memoryDb.ecoStats || [];
            const stat = {
                id: Date.now().toString(),
                userId,
                totalTripsAsDriver: 0,
                totalTripsAsPassenger: 0,
                totalDistance: 0,
                totalCarbonSaved: 0,
                createdAt: new Date()
            };
            db.memoryDb.ecoStats.push(stat);
            return res.status(201).json({ message: 'Eco stats created', ecoStat: stat });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to create eco stats', error: err.message });
    }
});

// GET /api/eco-stats/:userId - Get eco stats for user
router.get('/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            let ecoStat = await EcoStat.findOne({ userId: req.params.userId });

            if (!ecoStat) {
                ecoStat = new EcoStat({ userId: req.params.userId });
                await ecoStat.save();
            }

            return res.json(ecoStat);
        } else {
            let stat = (db.memoryDb.ecoStats || []).find(s => s.userId === req.params.userId);

            if (!stat) {
                stat = {
                    id: Date.now().toString(),
                    userId: req.params.userId,
                    totalTripsAsDriver: 0,
                    totalTripsAsPassenger: 0,
                    totalDistance: 0,
                    totalCarbonSaved: 0,
                    createdAt: new Date()
                };
                db.memoryDb.ecoStats.push(stat);
            }

            return res.json(stat);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch eco stats', error: err.message });
    }
});

// PUT /api/eco-stats/:userId - Update eco stats
router.put('/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const ecoStat = await EcoStat.findOneAndUpdate(
                { userId: req.params.userId },
                { ...req.body, updatedAt: new Date() },
                { new: true, upsert: true }
            );

            return res.json({ message: 'Eco stats updated', ecoStat });
        } else {
            let stat = (db.memoryDb.ecoStats || []).find(s => s.userId === req.params.userId);

            if (stat) {
                Object.assign(stat, req.body);
            } else {
                stat = {
                    id: Date.now().toString(),
                    userId: req.params.userId,
                    ...req.body
                };
                db.memoryDb.ecoStats.push(stat);
            }

            return res.json({ message: 'Eco stats updated', ecoStat: stat });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update eco stats', error: err.message });
    }
});

// POST /api/eco-stats/:userId/add-trip - Record a trip for carbon tracking
router.post('/:userId/add-trip', async (req, res) => {
    try {
        const { distance, role, passengersCount } = req.body;

        if (!distance || !role) {
            return res.status(400).json({ message: 'distance and role are required' });
        }

        if (db.getStatus()) {
            const ecoStat = await EcoStat.findOne({ userId: req.params.userId });

            if (!ecoStat) {
                return res.status(404).json({ message: 'Eco stats not found for user' });
            }

            const carbonPerKm = 0.12; // kg CO2 per km
            const carbonSavedPerTrip = distance * carbonPerKm;

            ecoStat.totalDistance += distance;
            ecoStat.totalCarbonSaved += carbonSavedPerTrip;

            if (role === 'driver') {
                ecoStat.totalTripsAsDriver += 1;
                ecoStat.totalPassengersCarried += passengersCount || 1;
            } else if (role === 'passenger') {
                ecoStat.totalTripsAsPassenger += 1;
            }

            // Update eco level based on carbon saved
            if (ecoStat.totalCarbonSaved >= 1000) {
                ecoStat.ecoLevel = 'carbon-negative';
            } else if (ecoStat.totalCarbonSaved >= 500) {
                ecoStat.ecoLevel = 'carbon-neutral';
            } else if (ecoStat.totalCarbonSaved >= 200) {
                ecoStat.ecoLevel = 'eco-warrior';
            } else if (ecoStat.totalCarbonSaved >= 50) {
                ecoStat.ecoLevel = 'eco-conscious';
            }

            await ecoStat.save();

            return res.json({ message: 'Trip recorded', ecoStat });
        } else {
            let stat = (db.memoryDb.ecoStats || []).find(s => s.userId === req.params.userId);

            if (!stat) {
                return res.status(404).json({ message: 'Eco stats not found for user' });
            }

            const carbonSavedPerTrip = distance * 0.12;
            stat.totalDistance += distance;
            stat.totalCarbonSaved += carbonSavedPerTrip;

            if (role === 'driver') {
                stat.totalTripsAsDriver += 1;
                stat.totalPassengersCarried += passengersCount || 1;
            } else if (role === 'passenger') {
                stat.totalTripsAsPassenger += 1;
            }

            return res.json({ message: 'Trip recorded', ecoStat: stat });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to record trip', error: err.message });
    }
});

// GET /api/eco-stats/leaderboard/global - Get global leaderboard
router.get('/leaderboard/global', async (req, res) => {
    try {
        if (db.getStatus()) {
            const stats = await EcoStat.find().sort({ totalCarbonSaved: -1 }).limit(10);
            return res.json(stats);
        } else {
            const stats = (db.memoryDb.ecoStats || [])
                .sort((a, b) => (b.totalCarbonSaved || 0) - (a.totalCarbonSaved || 0))
                .slice(0, 10);
            return res.json(stats);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch leaderboard', error: err.message });
    }
});

module.exports = router;
