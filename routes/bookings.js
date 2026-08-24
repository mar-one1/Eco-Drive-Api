const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const db = require('../db');

// GET /api/bookings
router.get('/', async (req, res) => {
    try {
        if (db.getStatus()) {
            const bookings = await Booking.find().sort({ createdAt: -1 });
            return res.json(bookings);
        } else {
            return res.json(db.memoryDb.bookings.map(b => ({ ...b, id: b.id || b._id })));
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
    }
});

// GET /api/bookings/user/:userId
router.get('/user/:userId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const bookings = await Booking.find({ passengerId: req.params.userId }).sort({ createdAt: -1 });
            return res.json(bookings);
        } else {
            const userBookings = db.memoryDb.bookings.filter(b => b.passengerId === req.params.userId);
            return res.json(userBookings.map(b => ({ ...b, id: b.id || b._id })));
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user bookings', error: err.message });
    }
});

// GET /api/bookings/trip/:tripId
router.get('/trip/:tripId', async (req, res) => {
    try {
        if (db.getStatus()) {
            const bookings = await Booking.find({ tripId: req.params.tripId }).sort({ createdAt: -1 });
            return res.json(bookings);
        } else {
            const tripBookings = db.memoryDb.bookings.filter(b => b.tripId === req.params.tripId);
            return res.json(tripBookings.map(b => ({ ...b, id: b.id || b._id })));
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch trip bookings', error: err.message });
    }
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            return res.json(booking);
        } else {
            const booking = db.memoryDb.bookings.find(b => (b.id || b._id) === req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            return res.json({ ...booking, id: booking.id || booking._id });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving booking', error: err.message });
    }
});

// POST /api/bookings
router.post('/', async (req, res) => {
    try {
        const { tripId, passengerId, seatsBooked } = req.body;

        if (!tripId || !passengerId) {
            return res.status(400).json({ message: 'tripId and passengerId are required' });
        }

        const requestedSeats = Number(seatsBooked) || 1;

        if (db.getStatus()) {
            const trip = await Trip.findById(tripId);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });

            if (trip.seats < requestedSeats) {
                return res.status(400).json({ message: 'Not enough available seats for this trip' });
            }

            trip.seats -= requestedSeats;
            await trip.save();

            const newBooking = new Booking({
                tripId,
                passengerId,
                seatsBooked: requestedSeats,
                status: 'confirmed'
            });

            const savedBooking = await newBooking.save();
            return res.status(201).json(savedBooking);
        } else {
            const trip = db.memoryDb.trips.find(t => (t.id || t._id) === tripId);
            if (trip) {
                if (trip.seats < requestedSeats) {
                    return res.status(400).json({ message: 'Not enough available seats for this trip' });
                }
                trip.seats -= requestedSeats;
            }

            const id = 'booking_' + Date.now();
            const newBooking = {
                _id: id,
                id: id,
                tripId,
                passengerId,
                seatsBooked: requestedSeats,
                status: 'confirmed',
                createdAt: new Date()
            };
            db.memoryDb.bookings.push(newBooking);
            return res.status(201).json(newBooking);
        }
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ message: 'Failed to create booking', error: err.message });
    }
});

// PUT /api/bookings/:id - Update booking (restores seats on trip if cancelled)
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (db.getStatus()) {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });

            // Restore seats if transitioning to cancelled
            if (status === 'cancelled' && booking.status !== 'cancelled') {
                const trip = await Trip.findById(booking.tripId);
                if (trip) {
                    trip.seats += (booking.seatsBooked || 1);
                    await trip.save();
                }
            }

            const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
            return res.json(updated);
        } else {
            const index = db.memoryDb.bookings.findIndex(b => (b.id || b._id) === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Booking not found' });

            const booking = db.memoryDb.bookings[index];
            if (status === 'cancelled' && booking.status !== 'cancelled') {
                const trip = db.memoryDb.trips.find(t => (t.id || t._id) === booking.tripId);
                if (trip) {
                    trip.seats += (booking.seatsBooked || 1);
                }
            }

            db.memoryDb.bookings[index] = { ...db.memoryDb.bookings[index], ...req.body };
            return res.json(db.memoryDb.bookings[index]);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update booking', error: err.message });
    }
});

// PATCH /api/bookings/:id/passenger
router.patch('/:id/passenger', async (req, res) => {
    try {
        const { passengerId } = req.query;
        if (db.getStatus()) {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            booking.passengerId = passengerId || booking.passengerId;
            await booking.save();
            return res.json(booking);
        } else {
            const booking = db.memoryDb.bookings.find(b => (b.id || b._id) === req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            if (passengerId) booking.passengerId = passengerId;
            return res.json(booking);
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to update passenger', error: err.message });
    }
});

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
    try {
        if (db.getStatus()) {
            const booking = await Booking.findById(req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });

            if (booking.status !== 'cancelled') {
                const trip = await Trip.findById(booking.tripId);
                if (trip) {
                    trip.seats += (booking.seatsBooked || 1);
                    await trip.save();
                }
            }

            await Booking.findByIdAndDelete(req.params.id);
            return res.json({ message: 'Booking cancelled successfully' });
        } else {
            const index = db.memoryDb.bookings.findIndex(b => (b.id || b._id) === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Booking not found' });

            const booking = db.memoryDb.bookings[index];
            if (booking.status !== 'cancelled') {
                const trip = db.memoryDb.trips.find(t => (t.id || t._id) === booking.tripId);
                if (trip) {
                    trip.seats += (booking.seatsBooked || 1);
                }
            }

            db.memoryDb.bookings.splice(index, 1);
            return res.json({ message: 'Booking cancelled successfully' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to cancel booking', error: err.message });
    }
});

module.exports = router;
