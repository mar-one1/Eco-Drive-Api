const jwt = require('jsonwebtoken');

const getSecret = () => process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'development-only-secret');

const authenticate = (req, res, next) => {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const secret = getSecret();

    if (!token || !secret) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
        req.user = jwt.verify(token, secret);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    }
};

const issueToken = (user) => jwt.sign(
    { userId: String(user._id || user.id), role: user.role, name: user.name },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

module.exports = { authenticate, issueToken };
