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

        type: {
            type: String,
            // enum: ["GENERAL", "PROPERTY", "LEAD", "PLAN", "SYSTEM", "PROMOTIONAL"],
            default: "GENERAL"
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
            // enum: ["ALL", "AGENT", "BUILDER", "INDIVIDUAL"],
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

        // Optional metadata for linking to specific resources
        metadata: {
            propertyId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Property"
            },
            leadId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lead"
            },
            planId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Plan"
            },
            actionUrl: String
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

module.exports = mongoose.model("Notification", notificationSchema);
