const express = require('express');
const router = express.Router();
const User = require('../models/User');
const db = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        if (db.getStatus()) {
            // Use MongoDB
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const normalizedRole = (role === 'admin' || role === 'driver' || role === 'passenger') ? role : 'passenger';

            const user = new User({
                name,
                email,
                password,
                phone: phone || '',
                role: normalizedRole
            });

            await user.save();
            const token = `token_${user._id}_${Date.now()}`;

            return res.status(201).json({
                message: 'User registered successfully',
                token,
                userId: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            });
        } else {
            // Fallback In-Memory
            const existing = db.memoryDb.users.find(u => u.email === email);
            if (existing) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const normalizedRole = (role === 'admin' || role === 'driver' || role === 'passenger') ? role : 'passenger';

            const newUser = {
                _id: 'user_' + Date.now(),
                name,
                email,
                password,
                phone: phone || '',
                role: normalizedRole
            };
            db.memoryDb.users.push(newUser);

            const token = `token_${newUser._id}_${Date.now()}`;
            return res.status(201).json({
                message: 'User registered successfully (In-Memory)',
                token,
                userId: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            });
        }
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error during registration', error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (db.getStatus()) {
            // Use MongoDB
            const user = await User.findOne({ email });
            if (!user || user.password !== password) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const token = `token_${user._id}_${Date.now()}`;
            return res.json({
                message: 'Login successful',
                token,
                userId: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            });
        } else {
            // Fallback In-Memory
            const user = db.memoryDb.users.find(u => u.email === email && u.password === password);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const token = `token_${user._id}_${Date.now()}`;
            return res.json({
                message: 'Login successful (In-Memory)',
                token,
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login', error: err.message });
    }
});

// GET /api/auth/me/:userId
router.get('/me/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const user = await User.findById(req.params.userId).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({
                userId: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            });
        } else {
            const user = db.memoryDb.users.find(u => u._id === req.params.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({
                userId: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user profile', error: err.message });
    }
});

// PUT /api/auth/me/:userId
router.put('/me/:userId', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (db.getStatus()) {
            const user = await User.findByIdAndUpdate(
                req.params.userId,
                { name: name.trim(), phone: phone ? phone.trim() : '' },
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.json({
                userId: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            });
        }

        const user = db.memoryDb.users.find(u => u._id === req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name.trim();
        user.phone = phone ? phone.trim() : '';
        return res.json({
            userId: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ message: 'Error updating user profile', error: err.message });
    }
});

module.exports = router;
