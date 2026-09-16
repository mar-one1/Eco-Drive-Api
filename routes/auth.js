const express = require('express');
const router = express.Router();
const User = require('../models/User');
const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { issueToken, authenticate } = require('../middleware/auth');

const findUser = async (id) => {
    if (db.getStatus()) return User.findById(id).select('+password');
    return db.memoryDb.users.find(u => String(u._id) === String(id) || String(u.id) === String(id));
};

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
router.put('/me/:userId', authenticate, async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (String(req.params.userId) !== String(req.user.userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only update your own profile' });
        }

        if (db.getStatus()) {
            const user = await User.findByIdAndUpdate(
                req.params.userId,
                { name: name.trim(), phone: phone ? phone.trim() : '', updatedAt: new Date() },
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

// POST /api/auth/change-password - Authenticated password change
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await findUser(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hash = await bcrypt.hash(newPassword, 12);
        if (db.getStatus()) {
            user.password = hash;
            await user.save();
        } else {
            user.password = hash;
        }

        return res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to change password', error: err.message });
    }
});

// POST /api/auth/forgot-password - Request a password reset code
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const normalizedEmail = String(email).trim().toLowerCase();
        let user;
        if (db.getStatus()) {
            user = await User.findOne({ email: normalizedEmail });
            if (!user) return res.status(404).json({ message: 'No account found with that email' });
        } else {
            user = db.memoryDb.users.find(u => u.email === normalizedEmail);
            if (!user) return res.status(404).json({ message: 'No account found with that email' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        if (db.getStatus()) {
            user.resetPasswordToken = tokenHash;
            user.resetPasswordExpires = expires;
            await user.save();
        } else {
            user.resetPasswordToken = tokenHash;
            user.resetPasswordExpires = expires;
        }

        return res.json({
            message: 'Password reset code generated. In production it is emailed; here it is returned for development.',
            resetToken,
            expiresIn: '1h'
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to request password reset', error: err.message });
    }
});

// POST /api/auth/reset-password - Reset password using the reset token
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ message: 'resetToken and newPassword are required' });
        if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const tokenHash = crypto.createHash('sha256').update(String(resetToken)).digest('hex');
        let user;
        if (db.getStatus()) {
            user = await User.findOne({ resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } }).select('+password');
            if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

            user.password = await bcrypt.hash(newPassword, 12);
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();
        } else {
            user = db.memoryDb.users.find(u => u.resetPasswordToken === tokenHash && u.resetPasswordExpires && new Date(u.resetPasswordExpires) > new Date());
            if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

            user.password = await bcrypt.hash(newPassword, 12);
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
        }

        return res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reset password', error: err.message });
    }
});

// POST /api/auth/devices - Register a push device token
router.post('/devices', authenticate, async (req, res) => {
    try {
        const { deviceToken } = req.body;
        if (!deviceToken) return res.status(400).json({ message: 'deviceToken is required' });

        if (db.getStatus()) {
            const user = await User.findById(req.user.userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (!user.deviceTokens.includes(deviceToken)) {
                user.deviceTokens.push(deviceToken);
                await user.save();
            }
        } else {
            const user = db.memoryDb.users.find(u => String(u._id) === String(req.user.userId));
            if (!user) return res.status(404).json({ message: 'User not found' });
            user.deviceTokens = user.deviceTokens || [];
            if (!user.deviceTokens.includes(deviceToken)) user.deviceTokens.push(deviceToken);
        }

        return res.json({ message: 'Device token registered' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to register device token', error: err.message });
    }
});

module.exports = router;
