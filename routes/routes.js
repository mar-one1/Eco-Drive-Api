const express = require('express');
const routingService = require('../services/routingService');
const router = express.Router();

router.post('/calculate', async (req, res) => {
    try {
        const route = await routingService.calculateRoute(req.body.origin, req.body.destination);
        res.json({ success: true, ...route });
    } catch (error) {
        const status = error.code === 'VALIDATION_ERROR' ? 400 : 502;
        res.status(status).json({ success: false, error: { code: error.code || 'ROUTING_ERROR', message: status === 400 ? error.message : 'Routing provider unavailable' } });
    }
});

module.exports = router;
