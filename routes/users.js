const express = require('express');
const router = express.Router();
const User = require('../models/User');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const normalizeUser = (user) => ({
    userId: String(user.userId || user._id || user.id),
    id: String(user.userId || user._id || user.id),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'user',
    isVerified: Boolean(user.isVerified)
});

// GET /api/users - List all users (public, password-safe)
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        if (db.getStatus()) {
            const users = await User.find({}).select('-password -resetPasswordToken -resetPasswordExpires -deviceTokens').limit(limit).lean();
            return res.json(users.map(normalizeUser));
        }
        return res.json((db.memoryDb.users || []).slice(0, limit).map(normalizeUser));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
});

// GET /api/users/search?q=... - Search users by name or email
router.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        if (!q) return res.json([]);

        if (db.getStatus()) {
            const regex = new RegExp(q, 'i');
            const users = await User.find({ $or: [{ name: regex }, { email: regex }] })
                .select('-password -resetPasswordToken -resetPasswordExpires -deviceTokens')
                .limit(limit)
                .lean();
            return res.json(users.map(normalizeUser));
        }

        const match = (db.memoryDb.users || [])
            .filter(u => (u.name || '').toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase()))
            .slice(0, limit)
            .map(normalizeUser);
        return res.json(match);
    } catch (err) {
        res.status(500).json({ message: 'Failed to search users', error: err.message });
    }
});

// GET /api/users/:id - Get a user's public profile
router.get('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpires -deviceTokens');
            if (!user) return res.status(404).json({ message: 'User not found' });
            return res.json(normalizeUser(user.toJSON ? user.toJSON() : user));
        }
        const user = (db.memoryDb.users || []).find(u => String(u._id) === String(req.params.id) || String(u.id) === String(req.params.id));
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.json(normalizeUser(user));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user', error: err.message });
    }
});

module.exports = router;