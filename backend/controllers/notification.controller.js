const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const mongoose = require("mongoose");

/**
 * Get user's notifications
 * GET /api/notifications
 */
const getMyNotifications = async (req, res) => {
    try {
        // req.user.id comes from JWT (not _id)
        const userId = new mongoose.Types.ObjectId(req.user.id);

        const userType = 'INDIVIDUAL';
        const activeSubscription = await Subscription.exists({
            user: userId,
            status: "active",
            endDate: { $gte: new Date() }
        });

        const targetConditions = [
            { targetUser: userId },
            { targetUser: null, targetUserType: "ALL" },
            { targetUser: null, targetUserType: userType }
        ];

        if (activeSubscription) {
            targetConditions.push({
                targetUser: null,
                targetUserType: "SUBSCRIBERS"
            });
        }

        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        // Find notifications that are:
        // 1. Specifically for this user, OR
        // 2. For all users (targetUser is null AND targetUserType is ALL), OR
        // 3. For this user's type
        // Also exclude notifications deleted by this user
        const query = {
            isActive: true,
            $or: targetConditions,
            "deletedBy.user": { $ne: userId }
        };

        const notifications = await Notification.find(query)
            .select("-readBy") // Don't send full readBy array to user
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        // Add isRead status for each notification
        const notificationsWithReadStatus = notifications.map(notification => {
            let isRead = false;

            if (notification.targetUser) {
                // Single user notification
                isRead = notification.isRead;
            } else {
                // Check if user is in readBy array (we need to query this separately)
                // For efficiency, we'll check this in a separate query
                // isRead is already initialized to false
            }

            return {
                ...notification,
                isRead
            };
        });

        // Get read status for broadcast notifications
        const broadcastIds = notifications
            .filter(n => !n.targetUser)
            .map(n => n._id);

        if (broadcastIds.length > 0) {
            const readNotifications = await Notification.find({
                _id: { $in: broadcastIds },
                "readBy.user": userId
            }).select("_id");

            const readIds = new Set(readNotifications.map(n => n._id.toString()));

            notificationsWithReadStatus.forEach(n => {
                if (!n.targetUser && readIds.has(n._id.toString())) {
                    n.isRead = true;
                }
            });
        }

        // Filter unread if requested
        let finalNotifications = notificationsWithReadStatus;
        if (unreadOnly === "true") {
            finalNotifications = notificationsWithReadStatus.filter(n => !n.isRead);
        }

        const total = await Notification.countDocuments(query);

        res.status(200).json({
            success: true,
            notifications: finalNotifications,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalNotifications: total,
                hasMore: page * limit < total
            }
        });
    } catch (error) {
        console.error("Get my notifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
            error: error.message
        });
    }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const userType = 'INDIVIDUAL';
        const activeSubscription = await Subscription.exists({
            user: userId,
            status: "active",
            endDate: { $gte: new Date() }
        });

        const targetConditions = [
            { targetUser: userId },
            { targetUser: null, targetUserType: "ALL" },
            { targetUser: null, targetUserType: userType }
        ];

        if (activeSubscription) {
            targetConditions.push({
                targetUser: null,
                targetUserType: "SUBSCRIBERS"
            });
        }

        // Get all applicable notifications
        const query = {
            isActive: true,
            $or: targetConditions,
            "deletedBy.user": { $ne: userId }
        };

        const notifications = await Notification.find(query).select("_id targetUser isRead readBy");

        let unreadCount = 0;

        for (const notification of notifications) {
            if (notification.targetUser) {
                // Single user notification
                if (!notification.isRead) {
                    unreadCount++;
                }
            } else {
                // Broadcast notification - check readBy array
                const hasRead = notification.readBy.some(
                    r => r.user.toString() === userId.toString()
                );
                if (!hasRead) {
                    unreadCount++;
                }
            }
        }

        res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error("Get unread count error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get unread count",
            error: error.message
        });
    }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const notificationId = req.params.id;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        if (notification.targetUser) {
            // Single user notification
            if (notification.targetUser.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to access this notification"
                });
            }
            notification.isRead = true;
            notification.readAt = new Date();
        } else {
            // Broadcast notification - add to readBy if not already there
            const alreadyRead = notification.readBy.some(
                r => r.user.toString() === userId.toString()
            );

            if (!alreadyRead) {
                notification.readBy.push({
                    user: userId,
                    readAt: new Date()
                });
            }
        }

        await notification.save();

        res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });
    } catch (error) {
        console.error("Mark as read error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
            error: error.message
        });
    }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const userType = 'INDIVIDUAL';
        const activeSubscription = await Subscription.exists({
            user: userId,
            status: "active",
            endDate: { $gte: new Date() }
        });

        const broadcastTargetConditions = [
            { targetUserType: "ALL" },
            { targetUserType: userType }
        ];

        if (activeSubscription) {
            broadcastTargetConditions.push({
                targetUserType: "SUBSCRIBERS"
            });
        }

        // Update single user notifications (exclude already deleted)
        await Notification.updateMany(
            { 
                targetUser: userId, 
                isRead: false,
                isActive: true
            },
            { isRead: true, readAt: new Date() }
        );

        // Update broadcast notifications - add user to readBy array
        const broadcastNotifications = await Notification.find({
            isActive: true,
            targetUser: null,
            $or: broadcastTargetConditions,
            "readBy.user": { $ne: userId },
            "deletedBy.user": { $ne: userId }
        });

        for (const notification of broadcastNotifications) {
            notification.readBy.push({
                user: userId,
                readAt: new Date()
            });
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (error) {
        console.error("Mark all as read error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read",
            error: error.message
        });
    }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const notificationId = req.params.id;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        if (notification.targetUser) {
            // Single user notification - verify ownership and delete
            if (notification.targetUser.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to delete this notification"
                });
            }
            
            // Soft delete by marking as inactive
            notification.isActive = false;
            await notification.save();
        } else {
            // Broadcast notification - add to deletedBy array
            const alreadyDeleted = notification.deletedBy.some(
                d => d.user.toString() === userId.toString()
            );

            if (alreadyDeleted) {
                return res.status(400).json({
                    success: false,
                    message: "Notification already deleted"
                });
            }

            notification.deletedBy.push({
                user: userId,
                deletedAt: new Date()
            });
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });
    } catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete notification",
            error: error.message
        });
    }
};

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
