const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        message: {
            type: String,
            required: true
        },

        image: {
            type: String,
            default: ""
        },

        type: {
            type: String,
            default: "GENERAL"
        },

        attachmentType: {
            type: String,
            enum: ["NONE", "CONTENT", "PLAN"],
            default: "NONE"
        },

        // If null, notification is for all users
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        // Target specific user types (if targetUser is null)
        targetUserType: {
            type: String,
            default: "ALL"
        },

        // Track who has read this notification (for broadcast notifications)
        readBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            readAt: {
                type: Date,
                default: Date.now
            }
        }],

        // Track who has deleted this notification (for broadcast notifications)
        deletedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            deletedAt: {
                type: Date,
                default: Date.now
            }
        }],

        // For single user notifications
        isRead: {
            type: Boolean,
            default: false
        },

        readAt: {
            type: Date,
            default: null
        },

        // Optional metadata for linking to content, plans, or custom URLs
        metadata: {
            attachmentType: {
                type: String,
                enum: ["NONE", "CONTENT", "PLAN"],
                default: "NONE"
            },
            contentId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            contentType: {
                type: String,
                enum: ["movie", "series", ""],
                default: ""
            },
            contentTitle: {
                type: String,
                default: ""
            },
            contentSlug: {
                type: String,
                default: ""
            },
            contentPoster: {
                type: String,
                default: ""
            },
            planId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Plan",
                default: null
            },
            planName: {
                type: String,
                default: ""
            },
            planPrice: {
                type: Number,
                default: null
            },
            planDuration: {
                type: Number,
                default: null
            },
            planType: {
                type: String,
                default: ""
            },
            planPlatform: {
                type: String,
                default: ""
            },
            actionUrl: {
                type: String,
                default: ""
            }
        },

        // Push delivery statistics
        pushStats: {
            totalUsers: {
                type: Number,
                default: 0
            },
            delivered: {
                type: Number,
                default: 0
            },
            failed: {
                type: Number,
                default: 0
            }
        },

        // Who created this notification
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin"
        },

        // Is notification active/visible
        isActive: {
            type: Boolean,
            default: true
        },

        // Timestamp when notification was sent
        sentAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ targetUser: 1, createdAt: -1 });
notificationSchema.index({ targetUserType: 1, createdAt: -1 });
notificationSchema.index({ isActive: 1 });
notificationSchema.index({ attachmentType: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
