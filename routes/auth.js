const express = require('express');
const router = express.Router();
const User = require('../models/User');
const db = require('../db');
const bcrypt = require('bcryptjs');
const { issueToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        if (db.getStatus()) {
            // Use MongoDB
            const normalizedEmail = String(email).trim().toLowerCase();
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const normalizedRole = (role === 'admin' || role === 'driver' || role === 'passenger') ? role : 'passenger';

            const user = new User({
                name,
                email: normalizedEmail,
                password: await bcrypt.hash(password, 12),
                phone: phone || '',
                role: normalizedRole
            });

            await user.save();
            const token = issueToken(user);

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
            const normalizedEmail = String(email).trim().toLowerCase();
            const existing = db.memoryDb.users.find(u => u.email === normalizedEmail);
            if (existing) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const normalizedRole = (role === 'admin' || role === 'driver' || role === 'passenger') ? role : 'passenger';

            const newUser = {
                _id: 'user_' + Date.now(),
                name,
                email: normalizedEmail,
                password: await bcrypt.hash(password, 12),
                phone: phone || '',
                role: normalizedRole
            };
            db.memoryDb.users.push(newUser);

            const token = issueToken(newUser);
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
        console.log('Login attempt:', { email, password: password ? '***' : undefined });
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (db.getStatus()) {
            // Use MongoDB
            const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const token = issueToken(user);
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
            const user = db.memoryDb.users.find(u => u.email === String(email).trim().toLowerCase());
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const token = issueToken(user);
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
