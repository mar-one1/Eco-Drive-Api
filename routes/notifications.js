const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const db = require('../db');

// POST /api/notifications - Create a notification
router.post('/', async (req, res) => {
    try {
        const { userId, type, title, message, relatedId, actionUrl } = req.body;

        if (!userId || !type || !title || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (db.getStatus()) {
            const notification = new Notification({
                userId,
                type,
                title,
                message,
                relatedId: relatedId || '',
                actionUrl: actionUrl || '',
                read: false
            });

            const savedNotification = await notification.save();
            return res.status(201).json({ message: 'Notification created', notification: savedNotification });
        } else {
            const notification = {
                id: Date.now().toString(),
                userId,
                type,
                title,
                message,
                relatedId: relatedId || '',
                actionUrl: actionUrl || '',
                read: false,
                createdAt: new Date()
            };
            db.memoryDb.notifications = db.memoryDb.notifications || [];
            db.memoryDb.notifications.push(notification);
            return res.status(201).json({ message: 'Notification created', notification });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to create notification', error: err.message });
    }
});

// GET /api/notifications/user/:userId - Get user notifications
router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const notifications = await Notification.find({ userId: req.params.userId })
                .sort({ createdAt: -1 })
                .limit(50);
            return res.json(notifications);
        } else {
            const notifications = (db.memoryDb.notifications || [])
                .filter(n => n.userId === req.params.userId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 50);
            return res.json(notifications);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
    }
});

// GET /api/notifications/user/:userId/unread - Get unread notifications
router.get('/user/:userId/unread', async (req, res) => {
    try {
        if (db.getStatus()) {
            const notifications = await Notification.find({ userId: req.params.userId, read: false })
                .sort({ createdAt: -1 });
            return res.json(notifications);
        } else {
            const notifications = (db.memoryDb.notifications || [])
                .filter(n => n.userId === req.params.userId && !n.read)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(notifications);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch unread notifications', error: err.message });
    }
});

// PUT /api/notifications/:id - Mark notification as read
router.put('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const notification = await Notification.findByIdAndUpdate(
                req.params.id,
                { read: true },
                { new: true }
            );

            if (!notification) return res.status(404).json({ message: 'Notification not found' });
            return res.json({ message: 'Notification marked as read', notification });
        } else {
            const notification = (db.memoryDb.notifications || []).find(n => n.id === req.params.id);
            if (!notification) return res.status(404).json({ message: 'Notification not found' });
            notification.read = true;
            return res.json({ message: 'Notification marked as read', notification });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notification', error: err.message });
    }
});

// PUT /api/notifications/user/:userId/mark-all-read - Mark all notifications as read
router.put('/user/:userId/mark-all-read', async (req, res) => {
    try {
        if (db.getStatus()) {
            await Notification.updateMany({ userId: req.params.userId, read: false }, { read: true });
            return res.json({ message: 'All notifications marked as read' });
        } else {
            (db.memoryDb.notifications || [])
                .filter(n => n.userId === req.params.userId && !n.read)
                .forEach(n => { n.read = true; });
            return res.json({ message: 'All notifications marked as read' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notifications', error: err.message });
    }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const notification = await Notification.findByIdAndDelete(req.params.id);
            if (!notification) return res.status(404).json({ message: 'Notification not found' });
            return res.json({ message: 'Notification deleted' });
        } else {
            const index = (db.memoryDb.notifications || []).findIndex(n => n.id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Notification not found' });
            db.memoryDb.notifications.splice(index, 1);
            return res.json({ message: 'Notification deleted' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete notification', error: err.message });
    }
});

module.exports = router;
