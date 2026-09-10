const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "User",
        },

       email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
},

age: {
    type: Number,
    min: 1,
    max: 120,
    default: null,
},

googleId: {
    type: String,
    sparse: true,
},

authProvider: {
    type: String,
    enum: ["PHONE", "GOOGLE"],
    default: "PHONE",
},

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        profileImage: {
            type: String,
            default: "",
        },

        profileComplete: {
            type: Boolean,
            default: false,
        },

        fcmToken: {
            type: String,
            default: null,
        },

        fcmTokenUpdatedAt: {
            type: Date,
            default: null,
        },

        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },

        isBlocked: {
            type: Boolean,
            default: false,
        },

        subscriptions: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription",
          },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
