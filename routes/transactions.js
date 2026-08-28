const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const db = require('../db');

// POST /api/transactions - Create a transaction
router.post('/', async (req, res) => {
    try {
        const { userId, tripId, amount, type, paymentMethod, description, recipientId } = req.body;

        if (!userId || !tripId || !amount || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (db.getStatus()) {
            const transaction = new Transaction({
                userId,
                tripId,
                amount,
                type,
                paymentMethod: paymentMethod || 'card',
                description: description || '',
                recipientId: recipientId || '',
                status: 'completed'
            });

            const savedTransaction = await transaction.save();
            return res.status(201).json({ message: 'Transaction created', transaction: savedTransaction });
        } else {
            const transaction = {
                id: Date.now().toString(),
                userId,
                tripId,
                amount,
                type,
                paymentMethod: paymentMethod || 'card',
                description: description || '',
                recipientId: recipientId || '',
                status: 'completed',
                createdAt: new Date()
            };
            db.memoryDb.transactions = db.memoryDb.transactions || [];
            db.memoryDb.transactions.push(transaction);
            return res.status(201).json({ message: 'Transaction created', transaction });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to create transaction', error: err.message });
    }
});

// GET /api/transactions/user/:userId - Get user transactions
router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const transactions = await Transaction.find({ userId: req.params.userId }).sort({ createdAt: -1 });
            return res.json(transactions);
        } else {
            const transactions = (db.memoryDb.transactions || [])
                .filter(t => t.userId === req.params.userId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(transactions);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch transactions', error: err.message });
    }
});

// GET /api/transactions/:id - Get a specific transaction
router.get('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const transaction = await Transaction.findById(req.params.id);
            if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
            return res.json(transaction);
        } else {
            const transaction = (db.memoryDb.transactions || []).find(t => t.id === req.params.id);
            if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
            return res.json(transaction);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch transaction', error: err.message });
    }
});

// PUT /api/transactions/:id - Update transaction status
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'status is required' });
        }

        if (db.getStatus()) {
            const transaction = await Transaction.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true }
            );

            if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
            return res.json({ message: 'Transaction updated', transaction });
        } else {
            const transaction = (db.memoryDb.transactions || []).find(t => t.id === req.params.id);
            if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
            transaction.status = status;
            return res.json({ message: 'Transaction updated', transaction });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update transaction', error: err.message });
    }
});

// GET /api/transactions/stats/summary/:userId - Get transaction summary for user
router.get('/stats/summary/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const transactions = await Transaction.find({ userId: req.params.userId });
            
            const summary = {
                totalSpent: 0,
                totalEarned: 0,
                totalRefunds: 0,
                totalRewards: 0,
                completedTransactions: 0
            };

            transactions.forEach(t => {
                if (t.status === 'completed') {
                    summary.completedTransactions += 1;
                    if (t.type === 'payment') summary.totalSpent += t.amount;
                    if (t.type === 'refund') summary.totalRefunds += t.amount;
                    if (t.type === 'reward') summary.totalRewards += t.amount;
                    if (t.type === 'bonus') summary.totalEarned += t.amount;
                }
            });

            return res.json(summary);
        } else {
            const transactions = (db.memoryDb.transactions || [])
                .filter(t => t.userId === req.params.userId && t.status === 'completed');

            const summary = {
                totalSpent: 0,
                totalEarned: 0,
                totalRefunds: 0,
                totalRewards: 0,
                completedTransactions: transactions.length
            };

            transactions.forEach(t => {
                if (t.type === 'payment') summary.totalSpent += t.amount;
                if (t.type === 'refund') summary.totalRefunds += t.amount;
                if (t.type === 'reward') summary.totalRewards += t.amount;
                if (t.type === 'bonus') summary.totalEarned += t.amount;
            });

            return res.json(summary);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
    }
});

module.exports = router;
