const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const EcoStat = require('../models/EcoStat');
const db = require('../db');

// POST /api/reviews - Create a new review
router.post('/', async (req, res) => {
    try {
        const { tripId, fromUserId, toUserId, rating, comment, category } = req.body;

        if (!tripId || !fromUserId || !toUserId || !rating || !category) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        if (db.getStatus()) {
            const review = new Review({
                tripId,
                fromUserId,
                toUserId,
                rating,
                comment: comment || '',
                category
            });

            const savedReview = await review.save();

            // Update average rating for the reviewed user
            const userReviews = await Review.find({ toUserId });
            const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
            
            await EcoStat.findOneAndUpdate(
                { userId: toUserId },
                { 
                    averageRating: avgRating,
                    totalReviews: userReviews.length
                }
            );

            return res.status(201).json({ message: 'Review created', review: savedReview });
        } else {
            const review = {
                id: Date.now().toString(),
                tripId,
                fromUserId,
                toUserId,
                rating,
                comment: comment || '',
                category,
                createdAt: new Date()
            };
            db.memoryDb.reviews = db.memoryDb.reviews || [];
            db.memoryDb.reviews.push(review);
            return res.status(201).json({ message: 'Review created', review });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to create review', error: err.message });
    }
});

// GET /api/reviews/user/:userId - Get all reviews for a user
router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const reviews = await Review.find({ toUserId: req.params.userId }).sort({ createdAt: -1 });
            return res.json(reviews);
        } else {
            const reviews = (db.memoryDb.reviews || []).filter(r => r.toUserId === req.params.userId);
            return res.json(reviews);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
    }
});

// GET /api/reviews/trip/:tripId - Get all reviews for a trip
router.get('/trip/:tripId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const reviews = await Review.find({ tripId: req.params.tripId });
            return res.json(reviews);
        } else {
            const reviews = (db.memoryDb.reviews || []).filter(r => r.tripId === req.params.tripId);
            return res.json(reviews);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
    }
});

// GET /api/reviews/:id - Get a specific review
router.get('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const review = await Review.findById(req.params.id);
            if (!review) return res.status(404).json({ message: 'Review not found' });
            return res.json(review);
        } else {
            const review = (db.memoryDb.reviews || []).find(r => r.id === req.params.id);
            if (!review) return res.status(404).json({ message: 'Review not found' });
            return res.json(review);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch review', error: err.message });
    }
});

// DELETE /api/reviews/:id - Delete a review
router.delete('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const review = await Review.findByIdAndDelete(req.params.id);
            if (!review) return res.status(404).json({ message: 'Review not found' });
            return res.json({ message: 'Review deleted', review });
        } else {
            const index = (db.memoryDb.reviews || []).findIndex(r => r.id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Review not found' });
            const review = db.memoryDb.reviews.splice(index, 1)[0];
            return res.json({ message: 'Review deleted', review });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete review', error: err.message });
    }
});

module.exports = router;
