const Notification = require('../models/Notification');
const db = require('../db');

const createNotification = async (io, payload) => {
    let notification;
    if (db.getStatus()) {
        notification = await new Notification(payload).save();
    } else {
        notification = { id: `notification_${Date.now()}`, ...payload, createdAt: new Date() };
        db.memoryDb.notifications.push(notification);
    }
    if (io) io.to(`user:${payload.userId}`).emit('notification:new', notification);
    return notification;
};

module.exports = { createNotification };