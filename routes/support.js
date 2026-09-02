const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        if (db.getStatus()) {
            const tickets = await SupportTicket.find().sort({ createdAt: -1 });
            return res.json(tickets);
        }

        const tickets = (db.memoryDb.supportTickets || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.json(tickets);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch support tickets', error: err.message });
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const tickets = await SupportTicket.find({ userId: req.params.userId }).sort({ createdAt: -1 });
            return res.json(tickets);
        }

        const tickets = (db.memoryDb.supportTickets || [])
            .filter(ticket => ticket.userId === req.params.userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.json(tickets);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch user support tickets', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const ticket = await SupportTicket.findById(req.params.id);
            if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
            return res.json(ticket);
        }

        const ticket = (db.memoryDb.supportTickets || []).find(item => item.id === req.params.id || item._id === req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
        return res.json(ticket);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch support ticket', error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { userId, role, category, subject, description, priority } = req.body;

        if (!userId || !subject || !description) {
            return res.status(400).json({ message: 'userId, subject, and description are required' });
        }

        const payload = {
            userId,
            role: role || 'user',
            category: category || 'other',
            subject,
            description,
            priority: priority || 'medium',
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (db.getStatus()) {
            const ticket = new SupportTicket(payload);
            const saved = await ticket.save();
            return res.status(201).json({ message: 'Support ticket created', ticket: saved });
        }

        payload.id = Date.now().toString();
        db.memoryDb.supportTickets = db.memoryDb.supportTickets || [];
        db.memoryDb.supportTickets.push(payload);
        return res.status(201).json({ message: 'Support ticket created', ticket: payload });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to create support ticket', error: err.message });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const { status, priority } = req.body;

        if (!status && !priority) {
            return res.status(400).json({ message: 'status or priority is required' });
        }

        if (db.getStatus()) {
            const update = { updatedAt: new Date() };
            if (status) update.status = status;
            if (priority) update.priority = priority;

            const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
            if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
            return res.json({ message: 'Support ticket updated', ticket });
        }

        const ticket = (db.memoryDb.supportTickets || []).find(item => item.id === req.params.id || item._id === req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
        if (status) ticket.status = status;
        if (priority) ticket.priority = priority;
        ticket.updatedAt = new Date();
        return res.json({ message: 'Support ticket updated', ticket });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update support ticket', error: err.message });
    }
});

module.exports = router;
