const express = require('express');
const router = express.Router();
const Referral = require('../models/Referral');
const db = require('../db');

// Generate unique referral code
function generateReferralCode() {
    return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// POST /api/referrals - Create a referral
router.post('/', async (req, res) => {
    try {
        const { referrerId, referrerEmail, referredEmail, rewardAmount } = req.body;

        if (!referrerId || !referrerEmail || !referredEmail) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const referralCode = generateReferralCode();

        if (db.getStatus()) {
            const referral = new Referral({
                referrerId,
                referrerEmail,
                referredEmail,
                referralCode,
                rewardAmount: rewardAmount || 10,
                status: 'pending'
            });

            const savedReferral = await referral.save();
            return res.status(201).json({ message: 'Referral created', referral: savedReferral });
        } else {
            const referral = {
                id: Date.now().toString(),
                referrerId,
                referrerEmail,
                referredEmail,
                referralCode,
                rewardAmount: rewardAmount || 10,
                status: 'pending',
                rewardClaimed: false,
                createdAt: new Date()
            };
            db.memoryDb.referrals = db.memoryDb.referrals || [];
            db.memoryDb.referrals.push(referral);
            return res.status(201).json({ message: 'Referral created', referral });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to create referral', error: err.message });
    }
});

// GET /api/referrals/user/:referrerId - Get all referrals for a user
router.get('/user/:referrerId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const referrals = await Referral.find({ referrerId: req.params.referrerId }).sort({ createdAt: -1 });
            return res.json(referrals);
        } else {
            const referrals = (db.memoryDb.referrals || [])
                .filter(r => r.referrerId === req.params.referrerId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(referrals);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch referrals', error: err.message });
    }
});

// GET /api/referrals/code/:referralCode - Get referral by code
router.get('/code/:referralCode', async (req, res) => {
    try {
        if (db.getStatus()) {
            const referral = await Referral.findOne({ referralCode: req.params.referralCode });
            if (!referral) return res.status(404).json({ message: 'Referral not found' });
            return res.json(referral);
        } else {
            const referral = (db.memoryDb.referrals || []).find(r => r.referralCode === req.params.referralCode);
            if (!referral) return res.status(404).json({ message: 'Referral not found' });
            return res.json(referral);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch referral', error: err.message });
    }
});

// POST /api/referrals/:id/complete - Complete a referral (sign up via referral link)
router.post('/:id/complete', async (req, res) => {
    try {
        const { referredUserId } = req.body;

        if (!referredUserId) {
            return res.status(400).json({ message: 'referredUserId is required' });
        }

        if (db.getStatus()) {
            const referral = await Referral.findByIdAndUpdate(
                req.params.id,
                {
                    referredUserId,
                    status: 'completed',
                    completedAt: new Date()
                },
                { new: true }
            );

            if (!referral) return res.status(404).json({ message: 'Referral not found' });
            return res.json({ message: 'Referral completed', referral });
        } else {
            const referral = (db.memoryDb.referrals || []).find(r => r.id === req.params.id);
            if (!referral) return res.status(404).json({ message: 'Referral not found' });

            referral.referredUserId = referredUserId;
            referral.status = 'completed';
            referral.completedAt = new Date();

            return res.json({ message: 'Referral completed', referral });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to complete referral', error: err.message });
    }
});

// POST /api/referrals/:id/claim-reward - Claim referral reward
router.post('/:id/claim-reward', async (req, res) => {
    try {
        if (db.getStatus()) {
            const referral = await Referral.findById(req.params.id);

            if (!referral) return res.status(404).json({ message: 'Referral not found' });
            if (referral.status !== 'completed') {
                return res.status(400).json({ message: 'Referral not completed yet' });
            }
            if (referral.rewardClaimed) {
                return res.status(400).json({ message: 'Reward already claimed' });
            }

            referral.rewardClaimed = true;
            await referral.save();

            return res.json({ message: 'Reward claimed', referral });
        } else {
            const referral = (db.memoryDb.referrals || []).find(r => r.id === req.params.id);

            if (!referral) return res.status(404).json({ message: 'Referral not found' });
            if (referral.status !== 'completed') {
                return res.status(400).json({ message: 'Referral not completed yet' });
            }
            if (referral.rewardClaimed) {
                return res.status(400).json({ message: 'Reward already claimed' });
            }

            referral.rewardClaimed = true;
            return res.json({ message: 'Reward claimed', referral });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to claim reward', error: err.message });
    }
});

// GET /api/referrals/stats/:referrerId - Get referral stats
router.get('/stats/:referrerId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const referrals = await Referral.find({ referrerId: req.params.referrerId });

            const stats = {
                totalReferrals: referrals.length,
                completedReferrals: referrals.filter(r => r.status === 'completed').length,
                pendingReferrals: referrals.filter(r => r.status === 'pending').length,
                totalRewardsEarned: referrals
                    .filter(r => r.status === 'completed')
                    .reduce((sum, r) => sum + r.rewardAmount, 0),
                rewardsClaimed: referrals.filter(r => r.rewardClaimed).length
            };

            return res.json(stats);
        } else {
            const referrals = (db.memoryDb.referrals || [])
                .filter(r => r.referrerId === req.params.referrerId);

            const stats = {
                totalReferrals: referrals.length,
                completedReferrals: referrals.filter(r => r.status === 'completed').length,
                pendingReferrals: referrals.filter(r => r.status === 'pending').length,
                totalRewardsEarned: referrals
                    .filter(r => r.status === 'completed')
                    .reduce((sum, r) => sum + r.rewardAmount, 0),
                rewardsClaimed: referrals.filter(r => r.rewardClaimed).length
            };

            return res.json(stats);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
    }
});

module.exports = router;
