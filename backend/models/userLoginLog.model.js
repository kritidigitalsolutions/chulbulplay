const mongoose = require("mongoose");

const userLoginLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ["OTP", "GOOGLE", "FIREBASE"],
      default: "OTP",
    },
    platform: {
      type: String,
      enum: ["APP", "WEB"],
      default: "APP",
    },
    loginAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

userLoginLogSchema.index({ loginAt: -1 });
userLoginLogSchema.index({ user: 1, loginAt: -1 });

module.exports =
  mongoose.models.UserLoginLog ||
  mongoose.model("UserLoginLog", userLoginLogSchema);

