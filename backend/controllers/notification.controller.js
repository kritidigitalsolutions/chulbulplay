const Notification = require("../models/notification.model");
const Subscription = require("../models/subscription.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Plan = require("../models/plan.model");
const { resolveLocalOrCdnUrl } = require("../utils/mediaUrl");
const mongoose = require("mongoose");

/**
 * Helper: Build target conditions applicable to the current user
 */
const buildTargetConditions = async (userId) => {
    const userType = "INDIVIDUAL";
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

    return targetConditions;
};

/**
 * Helper: Batch-enrich notifications with live Content (Movie/Series) and Plan details
 */
const enrichNotificationsForUser = async (notifications, req = null) => {
    if (!notifications || notifications.length === 0) return [];

    const movieIds = [];
    const seriesIds = [];
    const planIds = [];

    notifications.forEach((n) => {
        const attType = n.attachmentType || n.metadata?.attachmentType || "NONE";
        if (attType === "CONTENT" && n.metadata?.contentId) {
            if (n.metadata.contentType === "movie") {
                movieIds.push(n.metadata.contentId);
            } else {
                seriesIds.push(n.metadata.contentId);
            }
        } else if (attType === "PLAN" && n.metadata?.planId) {
            planIds.push(n.metadata.planId);
        }
    });

    const [movies, series, plans] = await Promise.all([
        movieIds.length > 0
            ? Movie.find({ _id: { $in: movieIds } })
                .select("_id title slug poster banner releaseYear genre rating isPremium duration")
                .lean()
            : [],
        seriesIds.length > 0
            ? Series.find({ _id: { $in: seriesIds } })
                .select("_id title slug poster banner releaseYear genre rating isPremium totalSeasons totalEpisodes")
                .lean()
            : [],
        planIds.length > 0
            ? Plan.find({ _id: { $in: planIds } })
                .select("_id name price duration planType platform features isRecommended isActive")
                .lean()
            : []
    ]);

    const movieMap = new Map(movies.map((m) => [m._id.toString(), m]));
    const seriesMap = new Map(series.map((s) => [s._id.toString(), s]));
    const planMap = new Map(plans.map((p) => [p._id.toString(), p]));

    return notifications.map((n) => {
        const attachmentType = n.attachmentType || n.metadata?.attachmentType || "NONE";
        const image = resolveLocalOrCdnUrl(n.image || "", req);

        let attachedContent = null;
        let attachedPlan = null;

        if (attachmentType === "CONTENT" && n.metadata?.contentId) {
            const cId = n.metadata.contentId.toString();
            const isMovie = n.metadata.contentType === "movie";
            const liveDoc = isMovie ? movieMap.get(cId) : seriesMap.get(cId);

            if (liveDoc) {
                attachedContent = {
                    _id: liveDoc._id,
                    title: liveDoc.title,
                    slug: liveDoc.slug,
                    contentType: isMovie ? "movie" : "series",
                    poster: resolveLocalOrCdnUrl(liveDoc.poster || "", req),
                    banner: resolveLocalOrCdnUrl(liveDoc.banner || "", req),
                    releaseYear: liveDoc.releaseYear || null,
                    genre: liveDoc.genre || [],
                    rating: liveDoc.rating ?? 0,
                    isPremium: Boolean(liveDoc.isPremium),
                    ...(isMovie
                        ? { duration: liveDoc.duration || "" }
                        : {
                            totalSeasons: liveDoc.totalSeasons || 0,
                            totalEpisodes: liveDoc.totalEpisodes || 0
                        })
                };
            } else {
                attachedContent = {
                    _id: n.metadata.contentId,
                    title: n.metadata.contentTitle || "",
                    slug: n.metadata.contentSlug || "",
                    contentType: n.metadata.contentType || "series",
                    poster: resolveLocalOrCdnUrl(n.metadata.contentPoster || "", req),
                    banner: ""
                };
            }
        } else if (attachmentType === "PLAN" && n.metadata?.planId) {
            const pId = n.metadata.planId.toString();
            const livePlan = planMap.get(pId);

            if (livePlan) {
                attachedPlan = livePlan;
            } else {
                attachedPlan = {
                    _id: n.metadata.planId,
                    name: n.metadata.planName || "",
                    price: n.metadata.planPrice ?? null,
                    duration: n.metadata.planDuration ?? null,
                    planType: n.metadata.planType || "",
                    platform: n.metadata.planPlatform || "app"
                };
            }
        }

        const cleanMetadata = {
            ...(n.metadata || {}),
            attachmentType,
            contentPoster: resolveLocalOrCdnUrl(n.metadata?.contentPoster || "", req)
        };

        return {
            ...n,
            image,
            attachmentType,
            metadata: cleanMetadata,
            attachedContent,
            attachedPlan
        };
    });
};

/**
 * Helper: Compute read status and unread count accurately
 */
const computeUnreadCountForUser = async (userId, targetConditions) => {
    const docs = await Notification.find({
        isActive: true,
        $or: targetConditions,
        "deletedBy.user": { $ne: userId }
    })
        .select("_id targetUser isRead readBy")
        .lean();

    const userIdStr = userId.toString();
    let unreadCount = 0;

    for (const doc of docs) {
        if (doc.targetUser) {
            if (!doc.isRead) unreadCount++;
        } else {
            const hasRead = (doc.readBy || []).some(
                (r) => r.user && r.user.toString() === userIdStr
            );
            if (!hasRead) unreadCount++;
        }
    }

    return unreadCount;
};

/**
 * Get user's notifications
 * GET /api/notifications
 */
const getMyNotifications = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const targetConditions = await buildTargetConditions(userId);

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
        const { unreadOnly = "false", type, attachmentType } = req.query;

        const query = {
            isActive: true,
            $or: targetConditions,
            "deletedBy.user": { $ne: userId }
        };

        if (type && String(type).trim()) {
            query.type = String(type).trim().toUpperCase();
        }

        if (attachmentType && String(attachmentType).trim()) {
            query.attachmentType = String(attachmentType).trim().toUpperCase();
        }

        if (unreadOnly === "true") {
            query.$and = [
                {
                    $or: [
                        { targetUser: userId, isRead: false },
                        { targetUser: null, "readBy.user": { $ne: userId } }
                    ]
                }
            ];
        }

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .select("-readBy -deletedBy -pushStats")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query),
            computeUnreadCountForUser(userId, targetConditions)
        ]);

        // Determine read status for broadcast notifications in current page
        const broadcastIds = notifications
            .filter((n) => !n.targetUser)
            .map((n) => n._id);

        let readIds = new Set();
        if (broadcastIds.length > 0) {
            const readDocs = await Notification.find({
                _id: { $in: broadcastIds },
                "readBy.user": userId
            })
                .select("_id")
                .lean();
            readIds = new Set(readDocs.map((n) => n._id.toString()));
        }

        const notificationsWithRead = notifications.map((n) => ({
            ...n,
            isRead: n.targetUser ? Boolean(n.isRead) : readIds.has(n._id.toString())
        }));

        const enriched = await enrichNotificationsForUser(notificationsWithRead, req);

        res.status(200).json({
            success: true,
            unreadCount,
            notifications: enriched,
            pagination: {
                currentPage: page,
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
 * Get single notification by ID (with full attached Content / Plan details)
 * GET /api/notifications/:id
 */
const getNotificationById = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const notificationId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID"
            });
        }

        const targetConditions = await buildTargetConditions(userId);

        const notification = await Notification.findOne({
            _id: notificationId,
            isActive: true,
            $or: targetConditions,
            "deletedBy.user": { $ne: userId }
        }).lean();

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        const isRead = notification.targetUser
            ? Boolean(notification.isRead)
            : (notification.readBy || []).some(
                  (r) => r.user && r.user.toString() === userId.toString()
              );

        const { readBy, deletedBy, pushStats, ...rest } = notification;
        const [enriched] = await enrichNotificationsForUser([{ ...rest, isRead }], req);

        res.status(200).json({
            success: true,
            notification: enriched
        });
    } catch (error) {
        console.error("Get notification by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notification details",
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
        const targetConditions = await buildTargetConditions(userId);
        const unreadCount = await computeUnreadCountForUser(userId, targetConditions);

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

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID"
            });
        }

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        if (notification.targetUser) {
            if (notification.targetUser.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to access this notification"
                });
            }
            notification.isRead = true;
            notification.readAt = new Date();
        } else {
            const alreadyRead = notification.readBy.some(
                (r) => r.user.toString() === userId.toString()
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
        const targetConditions = await buildTargetConditions(userId);
        const broadcastTargetConditions = targetConditions.filter((c) => !c.targetUser);

        // Update single user notifications
        await Notification.updateMany(
            {
                targetUser: userId,
                isRead: false,
                isActive: true
            },
            { isRead: true, readAt: new Date() }
        );

        // Update broadcast notifications - add user to readBy array
        await Notification.updateMany(
            {
                isActive: true,
                targetUser: null,
                $or: broadcastTargetConditions,
                "readBy.user": { $ne: userId },
                "deletedBy.user": { $ne: userId }
            },
            {
                $push: {
                    readBy: {
                        user: userId,
                        readAt: new Date()
                    }
                }
            }
        );

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

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID"
            });
        }

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        if (notification.targetUser) {
            if (notification.targetUser.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to delete this notification"
                });
            }

            notification.isActive = false;
            await notification.save();
        } else {
            const alreadyDeleted = notification.deletedBy.some(
                (d) => d.user.toString() === userId.toString()
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
    getNotificationById,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
