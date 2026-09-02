const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const SupportTicket = require('../models/SupportTicket');
const db = require('../db');

const requireAdmin = (req, res, next) => {
    const role = String(req.get('X-User-Role') || req.headers['x-user-role'] || '').toLowerCase();
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    return next();
};

const normalizeUser = (user) => {
    const rawId = user.userId || user._id || user.id;
    return {
        userId: String(rawId),
        id: String(rawId),
        name: user.name || 'Unknown user',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'user',
        createdAt: user.createdAt || new Date().toISOString()
    };
};

const normalizeSupportTicket = (ticket) => {
    const rawId = ticket.id || ticket._id;
    return {
        id: String(rawId),
        userId: ticket.userId || '',
        role: ticket.role || 'user',
        category: ticket.category || 'other',
        subject: ticket.subject || 'Support request',
        description: ticket.description || '',
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        createdAt: ticket.createdAt || new Date().toISOString(),
        updatedAt: ticket.updatedAt || new Date().toISOString()
    };
};

router.use(requireAdmin);

router.get('/stats', async (req, res) => {
    try {
        if (db.getStatus()) {
            const [totalUsers, totalTrips, totalBookings, openTickets, activeTrips, tripRevenue] = await Promise.all([
                User.countDocuments(),
                Trip.countDocuments(),
                Booking.countDocuments(),
                SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
                Trip.countDocuments({ status: { $in: ['active', 'scheduled', 'in_progress'] } }),
                Trip.aggregate([{ $group: { _id: null, total: { $sum: '$price' } } }])
            ]);

            const totalRevenue = tripRevenue && tripRevenue.length ? tripRevenue[0].total : 0;

            return res.json({
                totalUsers,
                totalTrips,
                activeTrips,
                totalBookings,
                openTickets,
                totalRevenue,
                resolvedTickets: await SupportTicket.countDocuments({ status: 'resolved' })
            });
        }

        const totalUsers = db.memoryDb.users.length;
        const totalTrips = db.memoryDb.trips.length;
        const totalBookings = db.memoryDb.bookings.length;
        const activeTrips = db.memoryDb.trips.filter(t => ['active', 'scheduled', 'in_progress'].includes(t.status || 'active')).length;
        const openTickets = (db.memoryDb.supportTickets || []).filter(t => ['open', 'in_progress'].includes(t.status || 'open')).length;
        const totalRevenue = (db.memoryDb.trips || []).reduce((sum, trip) => sum + Number(trip.price || 0), 0);

        return res.json({
            totalUsers,
            totalTrips,
            activeTrips,
            totalBookings,
            openTickets,
            totalRevenue,
            resolvedTickets: (db.memoryDb.supportTickets || []).filter(t => t.status === 'resolved').length
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch admin stats', error: error.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        if (db.getStatus()) {
            const users = await User.find({}).select('-password').sort({ createdAt: -1 });
            return res.json(users.map(normalizeUser));
        }

        const users = (db.memoryDb.users || []).map(normalizeUser);
        return res.json(users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
});

router.put('/users/:userId/role', async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['admin', 'driver', 'passenger', 'user'];
        if (!role || !validRoles.includes(String(role).toLowerCase())) {
            return res.status(400).json({ message: 'Valid role is required: admin, driver, passenger, or user' });
        }

        const normalizedRole = String(role).toLowerCase();

        if (db.getStatus()) {
            const user = await User.findByIdAndUpdate(
                req.params.userId,
                { role: normalizedRole },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.json(normalizeUser(user.toJSON ? user.toJSON() : user));
        }

        const userIndex = (db.memoryDb.users || []).findIndex(item => String(item._id) === String(req.params.userId));
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found' });
        }

        db.memoryDb.users[userIndex].role = normalizedRole;
        return res.json(normalizeUser(db.memoryDb.users[userIndex]));
    } catch (error) {
        res.status(500).json({ message: 'Failed to update user role', error: error.message });
    }
});

router.get('/trips', async (req, res) => {
    try {
        if (db.getStatus()) {
            const trips = await Trip.find({}).sort({ createdAt: -1 }).lean();
            return res.json(trips.map(trip => ({ ...trip, id: trip._id.toString() })));
        }

        return res.json((db.memoryDb.trips || []).map(trip => ({ ...trip, id: trip.id || trip._id })));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch trips for admin dashboard', error: error.message });
    }
});

router.put('/trips/:id/status', async (req, res) => {
    try {
        const allowed = ['active', 'scheduled', 'in_progress', 'arrived', 'closed', 'completed', 'cancelled'];
        const status = String(req.body.status || '').toLowerCase();

        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid trip status' });
        }

        if (db.getStatus()) {
            const trip = await Trip.findByIdAndUpdate(req.params.id, { status }, { new: true });
            if (!trip) {
                return res.status(404).json({ message: 'Trip not found' });
            }
            return res.json({ ...trip.toJSON(), id: trip._id.toString() });
        }

        const index = (db.memoryDb.trips || []).findIndex(item => String(item.id || item._id) === String(req.params.id));
        if (index === -1) {
            return res.status(404).json({ message: 'Trip not found' });
        }

        db.memoryDb.trips[index].status = status;
        return res.json({ ...db.memoryDb.trips[index], id: db.memoryDb.trips[index].id || db.memoryDb.trips[index]._id });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update trip status', error: error.message });
    }
});

router.get('/support', async (req, res) => {
    try {
        if (db.getStatus()) {
            const tickets = await SupportTicket.find({}).sort({ createdAt: -1 }).lean();
            return res.json(tickets.map(normalizeSupportTicket));
        }

        const tickets = (db.memoryDb.supportTickets || []).map(normalizeSupportTicket);
        return res.json(tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch support tickets', error: error.message });
    }
});

router.put('/support/:id/status', async (req, res) => {
    try {
        const { status, priority } = req.body;
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        const validPriorities = ['low', 'medium', 'high', 'urgent'];

        const nextStatus = status ? String(status).toLowerCase() : null;
        const nextPriority = priority ? String(priority).toLowerCase() : null;

        if (nextStatus && !validStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: 'Invalid ticket status' });
        }
        if (nextPriority && !validPriorities.includes(nextPriority)) {
            return res.status(400).json({ message: 'Invalid priority' });
        }

        if (db.getStatus()) {
            const ticket = await SupportTicket.findByIdAndUpdate(
                req.params.id,
                {
                    ...(nextStatus ? { status: nextStatus } : {}),
                    ...(nextPriority ? { priority: nextPriority } : {}),
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!ticket) {
                return res.status(404).json({ message: 'Support ticket not found' });
            }

            return res.json(normalizeSupportTicket(ticket.toJSON ? ticket.toJSON() : ticket));
        }

        const ticketIndex = (db.memoryDb.supportTickets || []).findIndex(item => String(item.id || item._id) === String(req.params.id));
        if (ticketIndex === -1) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        const ticket = db.memoryDb.supportTickets[ticketIndex];
        if (nextStatus) ticket.status = nextStatus;
        if (nextPriority) ticket.priority = nextPriority;
        ticket.updatedAt = new Date();

        return res.json(normalizeSupportTicket(ticket));
    } catch (error) {
        res.status(500).json({ message: 'Failed to update support ticket status', error: error.message });
    }
});

module.exports = router;
