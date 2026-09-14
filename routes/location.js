const express = require('express');
const geocodingService = require('../services/geocodingService');
const router = express.Router();

router.get('/search', async (req, res) => {
    try {
        const locations = await geocodingService.search(req.query.q);
        res.json({ success: true, locations });
    } catch (error) {
        const status = error.code === 'VALIDATION_ERROR' ? 400 : 502;
        res.status(status).json({ success: false, error: { code: error.code || 'GEOCODING_ERROR', message: status === 400 ? error.message : 'Location provider unavailable' } });
    }
});

router.get('/reverse', async (req, res) => {
    try {
        const location = await geocodingService.reverse({ latitude: req.query.lat, longitude: req.query.lng });
        res.json({ success: true, location });
    } catch (error) {
        const status = error.code === 'VALIDATION_ERROR' ? 400 : 502;
        res.status(status).json({ success: false, error: { code: error.code || 'GEOCODING_ERROR', message: status === 400 ? error.message : 'Location provider unavailable' } });
    }
});

module.exports = router;
