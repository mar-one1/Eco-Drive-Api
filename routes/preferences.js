const express = require('express');
const router = express.Router();
const UserPreference = require('../models/UserPreference');
const db = require('../db');

// POST /api/preferences - Create user preferences
router.post('/', async (req, res) => {
    try {
        const { userId, carType, carModel, licensePlate, musicPreference, smokingAllowed, petsAllowed } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        if (db.getStatus()) {
            let preference = await UserPreference.findOne({ userId });

            if (preference) {
                // Update existing
                preference = await UserPreference.findOneAndUpdate(
                    { userId },
                    req.body,
                    { new: true }
                );
            } else {
                // Create new
                preference = new UserPreference({ userId, ...req.body });
                await preference.save();
            }

            return res.status(201).json({ message: 'Preferences saved', preference });
        } else {
            const pref = {
                id: Date.now().toString(),
                userId,
                carType: carType || 'petrol',
                carModel: carModel || '',
                licensePlate: licensePlate || '',
                musicPreference: musicPreference || 'quiet',
                smokingAllowed: smokingAllowed || false,
                petsAllowed: petsAllowed || false,
                createdAt: new Date()
            };
            db.memoryDb.preferences = db.memoryDb.preferences || [];
            db.memoryDb.preferences.push(pref);
            return res.status(201).json({ message: 'Preferences saved', preference: pref });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to save preferences', error: err.message });
    }
});

// GET /api/preferences/:userId - Get user preferences
router.get('/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            let preference = await UserPreference.findOne({ userId: req.params.userId });
            
            if (!preference) {
                // Create default preferences
                preference = new UserPreference({ userId: req.params.userId });
                await preference.save();
            }

            return res.json(preference);
        } else {
            let pref = (db.memoryDb.preferences || []).find(p => p.userId === req.params.userId);
            
            if (!pref) {
                pref = {
                    id: Date.now().toString(),
                    userId: req.params.userId,
                    carType: 'petrol',
                    musicPreference: 'quiet',
                    smokingAllowed: false,
                    petsAllowed: false
                };
                db.memoryDb.preferences.push(pref);
            }

            return res.json(pref);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch preferences', error: err.message });
    }
});

// PUT /api/preferences/:userId - Update user preferences
router.put('/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const preference = await UserPreference.findOneAndUpdate(
                { userId: req.params.userId },
                req.body,
                { new: true, upsert: true }
            );

            return res.json({ message: 'Preferences updated', preference });
        } else {
            let pref = (db.memoryDb.preferences || []).find(p => p.userId === req.params.userId);
            
            if (pref) {
                Object.assign(pref, req.body);
            } else {
                pref = {
                    id: Date.now().toString(),
                    userId: req.params.userId,
                    ...req.body
                };
                db.memoryDb.preferences.push(pref);
            }

            return res.json({ message: 'Preferences updated', preference: pref });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update preferences', error: err.message });
    }
});

// POST /api/preferences/:userId/blacklist - Add user to blacklist
router.post('/:userId/blacklist', async (req, res) => {
    try {
        const { blockedUserId, reason } = req.body;

        if (!blockedUserId) {
            return res.status(400).json({ message: 'blockedUserId is required' });
        }

        if (db.getStatus()) {
            const preference = await UserPreference.findOneAndUpdate(
                { userId: req.params.userId },
                {
                    $push: {
                        blacklist: {
                            userId: blockedUserId,
                            reason: reason || '',
                            addedAt: new Date()
                        }
                    }
                },
                { new: true, upsert: true }
            );

            return res.json({ message: 'User added to blacklist', preference });
        } else {
            let pref = (db.memoryDb.preferences || []).find(p => p.userId === req.params.userId);
            if (!pref) {
                pref = { id: Date.now().toString(), userId: req.params.userId, blacklist: [] };
                db.memoryDb.preferences.push(pref);
            }
            pref.blacklist = pref.blacklist || [];
            pref.blacklist.push({ userId: blockedUserId, reason, addedAt: new Date() });
            return res.json({ message: 'User added to blacklist', preference: pref });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to add to blacklist', error: err.message });
    }
});

module.exports = router;
