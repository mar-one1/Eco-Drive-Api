const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const db = require('../db');

router.post('/', async (req, res) => {
    try {
        const { senderId, receiverId, tripId, text, channel } = req.body;

        if (!senderId || !receiverId || !text) {
            return res.status(400).json({ message: 'senderId, receiverId, and text are required' });
        }

        const payload = {
            senderId,
            receiverId,
            tripId: tripId || '',
            text,
            channel: channel || 'in_app',
            read: false,
            createdAt: new Date()
        };

        if (db.getStatus()) {
            const message = new ContactMessage(payload);
            const saved = await message.save();
            return res.status(201).json({ message: 'Message sent', message: saved });
        }

        payload.id = Date.now().toString();
        db.memoryDb.messages = db.memoryDb.messages || [];
        db.memoryDb.messages.push(payload);
        return res.status(201).json({ message: 'Message sent', message: payload });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const messages = await ContactMessage.find({
                $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }]
            }).sort({ createdAt: -1 });
            return res.json(messages);
        }

        const messages = (db.memoryDb.messages || [])
            .filter(message => message.senderId === req.params.userId || message.receiverId === req.params.userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.json(messages);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
    }
});

router.get('/conversation/:userId/:otherUserId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const messages = await ContactMessage.find({
                $or: [
                    { senderId: req.params.userId, receiverId: req.params.otherUserId },
                    { senderId: req.params.otherUserId, receiverId: req.params.userId }
                ]
            }).sort({ createdAt: 1 });
            return res.json(messages);
        }

        const messages = (db.memoryDb.messages || [])
            .filter(message =>
                (message.senderId === req.params.userId && message.receiverId === req.params.otherUserId)
                || (message.senderId === req.params.otherUserId && message.receiverId === req.params.userId)
            )
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return res.json(messages);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch conversation', error: err.message });
    }
});

router.get('/trip/:tripId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const messages = await ContactMessage.find({ tripId: req.params.tripId }).sort({ createdAt: 1 });
            return res.json(messages);
        }

        const messages = (db.memoryDb.messages || [])
            .filter(message => message.tripId === req.params.tripId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return res.json(messages);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch trip messages', error: err.message });
    }
});

router.put('/:id/read', async (req, res) => {
    try {
        if (db.getStatus()) {
            const message = await ContactMessage.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
            if (!message) return res.status(404).json({ message: 'Message not found' });
            return res.json({ message: 'Message marked as read', message });
        }

        const message = (db.memoryDb.messages || []).find(item => item.id === req.params.id || item._id === req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        message.read = true;
        return res.json({ message: 'Message marked as read', message });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to mark message as read', error: err.message });
    }
});

module.exports = router;
