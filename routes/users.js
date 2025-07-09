const express = require('express');
const router = express.Router();

// Example user routes
router.get('/', (req, res) => {
    res.json({
        message: 'Users API endpoint'
    });
});

router.post('/', (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({
            error: 'Name and email are required'
        });
    }

    // In a real application, this would create a new user
    res.status(201).json({
        message: 'User created successfully',
        user: {
            name,
            email
        }
    });
});

module.exports = router;
