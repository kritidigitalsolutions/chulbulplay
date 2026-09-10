const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../../controllers/notification.controller");
const { saveFcmToken } = require("../../controllers/user.controller");

// All routes require authentication
router.use(isAuth);

// Fallbacks for client app FCM saving routes
router.post("/fcm-token", saveFcmToken);
router.patch("/fcm-token", saveFcmToken);

// GET /api/notifications - Get user's notifications
router.get("/", getMyNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", getUnreadCount);

// PATCH /api/notifications/read-all - Mark all as read
router.patch("/read-all", markAllAsRead);

// PATCH /api/notifications/:id/read - Mark single as read
router.patch("/:id/read", markAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete("/:id", deleteNotification);

module.exports = router;
