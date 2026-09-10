const mongoose = require("mongoose");

const userOtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    otp: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () =>
        new Date(Date.now() + 5 * 60 * 1000),

      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.UserOTP ||
  mongoose.model(
    "UserOTP",
    userOtpSchema
  );