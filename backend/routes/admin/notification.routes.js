const express = require("express");
const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  sendNotification,
  getNotifications,
  deleteNotification,
  markAsRead,
  getUnreadCount
} = require("../../controllers/admin/notification.controller");

router.use(isAdmin);

router.post("/send", sendNotification);
router.get("/unread-count", getUnreadCount);
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;