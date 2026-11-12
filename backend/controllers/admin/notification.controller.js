const mongoose = require("mongoose");
const Notification = require("../../models/notification.model");
const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Plan = require("../../models/plan.model");
const { sendPushNotification } = require("../../utils/fcm.service");
const { resolveLocalOrCdnUrl } = require("../../utils/mediaUrl");

const normalizeSendTo = (val) => {
  const raw = String(val || "ALL").trim().toUpperCase();
  if (raw === "SPECIFIC USER" || raw === "SPECIFIC_USER") return "SPECIFIC_USER";
  if (raw === "SUBSCRIBERS ONLY" || raw === "SUBSCRIBERS") return "SUBSCRIBERS";
  return "ALL";
};

const normalizeAttachmentType = (val) => {
  const raw = String(val || "NONE").trim().toUpperCase();
  if (raw === "CONTENT") return "CONTENT";
  if (raw === "PLAN" || raw === "SUBSCRIPTION PLAN" || raw === "SUBSCRIPTION_PLAN") return "PLAN";
  return "NONE";
};

exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      sendTo,
      targetUser,
      actionUrl,
      image,
      imageUrl,
      attachmentType,
      contentId,
      contentType,
      planId,
    } = req.body;

    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const resolvedSendTo = normalizeSendTo(sendTo);
    const resolvedAttachmentType = normalizeAttachmentType(attachmentType);

    if (resolvedSendTo === "SPECIFIC_USER" && (!targetUser || !mongoose.Types.ObjectId.isValid(targetUser))) {
      return res.status(400).json({
        success: false,
        message: "Valid targetUser ID is required when sending to a specific user",
      });
    }

    // Resolve notification image (uploaded local file or URL string)
    const storedImagePath = req.file ? req.file.path : String(image || imageUrl || "").trim();
    const finalImageUrl = resolveLocalOrCdnUrl(storedImagePath, req);

    const metadata = {
      attachmentType: resolvedAttachmentType,
      contentId: null,
      contentType: "",
      contentTitle: "",
      contentSlug: "",
      contentPoster: "",
      planId: null,
      planName: "",
      planPrice: null,
      planDuration: null,
      planType: "",
      planPlatform: "",
      actionUrl: actionUrl ? String(actionUrl).trim() : "",
    };

    // Resolve Content Attachment (Movie / Series)
    if (resolvedAttachmentType === "CONTENT") {
      if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json({
          success: false,
          message: "Valid contentId is required when attachmentType is CONTENT",
        });
      }

      const requestedType = String(contentType || "").toLowerCase().trim();
      let contentDoc = null;
      let resolvedContentType = "";

      if (requestedType === "movie") {
        contentDoc = await Movie.findById(contentId).select("_id title slug poster banner").lean();
        if (contentDoc) resolvedContentType = "movie";
      } else if (requestedType === "series") {
        contentDoc = await Series.findById(contentId).select("_id title slug poster banner").lean();
        if (contentDoc) resolvedContentType = "series";
      } else {
        contentDoc = await Series.findById(contentId).select("_id title slug poster banner").lean();
        if (contentDoc) {
          resolvedContentType = "series";
        } else {
          contentDoc = await Movie.findById(contentId).select("_id title slug poster banner").lean();
          if (contentDoc) resolvedContentType = "movie";
        }
      }

      if (!contentDoc) {
        return res.status(404).json({
          success: false,
          message: "Attached content not found",
        });
      }

      metadata.contentId = contentDoc._id;
      metadata.contentType = resolvedContentType;
      metadata.contentTitle = contentDoc.title || "";
      metadata.contentSlug = contentDoc.slug || "";
      metadata.contentPoster = resolveLocalOrCdnUrl(contentDoc.poster || contentDoc.banner || "", req);

      if (!metadata.actionUrl) {
        metadata.actionUrl = `/${resolvedContentType}/${contentDoc.slug || contentDoc._id}`;
      }
    }

    // Resolve Subscription Plan Attachment
    if (resolvedAttachmentType === "PLAN") {
      if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
        return res.status(400).json({
          success: false,
          message: "Valid planId is required when attachmentType is PLAN",
        });
      }

      const planDoc = await Plan.findById(planId).lean();
      if (!planDoc) {
        return res.status(404).json({
          success: false,
          message: "Attached subscription plan not found",
        });
      }

      metadata.planId = planDoc._id;
      metadata.planName = planDoc.name || "";
      metadata.planPrice = planDoc.price ?? null;
      metadata.planDuration = planDoc.duration ?? null;
      metadata.planType = planDoc.planType || "";
      metadata.planPlatform = planDoc.platform || "app";

      if (!metadata.actionUrl) {
        metadata.actionUrl = `/plans/${planDoc._id}`;
      }
    }

    const payload = {
      title: String(title).trim(),
      message: String(message).trim(),
      image: storedImagePath,
      type: type || "GENERAL",
      attachmentType: resolvedAttachmentType,
      metadata,
      createdBy: req.user?.id || req.user?._id,
      sentAt: new Date(),
    };

    let users = [];

    if (resolvedSendTo === "SPECIFIC_USER") {
      payload.targetUser = targetUser;
      payload.targetUserType = "INDIVIDUAL";

      users = await User.find({
        _id: targetUser,
        fcmToken: { $type: "string", $ne: "" },
      });
    } else if (resolvedSendTo === "SUBSCRIBERS") {
      payload.targetUser = null;
      payload.targetUserType = "SUBSCRIBERS";

      const subscribedUserIds = await Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: new Date() },
      });

      users = await User.find({
        _id: { $in: subscribedUserIds },
        fcmToken: { $type: "string", $ne: "" },
      });
    } else {
      payload.targetUser = null;
      payload.targetUserType = "ALL";

      users = await User.find({
        fcmToken: { $type: "string", $ne: "" },
      });
    }

    const notification = await Notification.create(payload);

    let sent = 0;
    let failed = 0;

    const pushData = {
      notificationId: notification._id.toString(),
      type: notification.type,
      attachmentType: resolvedAttachmentType,
      image: finalImageUrl || "",
      contentId: metadata.contentId ? metadata.contentId.toString() : "",
      contentType: metadata.contentType || "",
      contentTitle: metadata.contentTitle || "",
      contentSlug: metadata.contentSlug || "",
      contentPoster: metadata.contentPoster || "",
      planId: metadata.planId ? metadata.planId.toString() : "",
      planName: metadata.planName || "",
      planPrice: metadata.planPrice !== null ? String(metadata.planPrice) : "",
      planDuration: metadata.planDuration !== null ? String(metadata.planDuration) : "",
      planPlatform: metadata.planPlatform || "",
      actionUrl: metadata.actionUrl || "",
    };

    for (const user of users) {
      const result = await sendPushNotification({
        token: user.fcmToken,
        title: notification.title,
        body: notification.message,
        image: finalImageUrl,
        data: pushData,
      });

      console.log("Push to:", user._id, result);

      if (result.success) sent++;
      else failed++;
    }

    notification.pushStats = {
      totalUsers: users.length,
      delivered: sent,
      failed,
    };
    await notification.save();

    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
      pushReport: {
        totalUsers: users.length,
        sent,
        delivered: sent,
        failed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const data = await Notification.find({ isActive: true })
      .populate("targetUser", "name email phone")
      .populate("metadata.planId", "name price duration planType platform isActive")
      .sort({ createdAt: -1 })
      .lean();

    let totalDelivered = 0;
    let totalFailed = 0;

    const formatted = data.map((n) => {
      const delivered = n.pushStats?.delivered || 0;
      const failed = n.pushStats?.failed || 0;
      totalDelivered += delivered;
      totalFailed += failed;

      return {
        ...n,
        image: resolveLocalOrCdnUrl(n.image || "", req),
        attachmentType: n.attachmentType || n.metadata?.attachmentType || "NONE",
        metadata: {
          ...(n.metadata || {}),
          contentPoster: resolveLocalOrCdnUrl(n.metadata?.contentPoster || "", req),
        },
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
      stats: {
        totalSent: formatted.length,
        delivered: totalDelivered,
        failed: totalFailed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: "after" }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification archived successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ── Mark a single notification as read (adds admin to readBy) ─────────────
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date(),
        $addToSet: {
          readBy: { user: req.user.id, readAt: new Date() },
        },
      },
      { returnDocument: "after" }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Count unread notifications (isRead: false) ────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false, isActive: true });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
