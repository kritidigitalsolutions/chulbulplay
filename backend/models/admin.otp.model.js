const mongoose = require("mongoose");

const adminOtpSchema = new mongoose.Schema(
  {
    email: String,
    otp: String,
    purpose: {
      type: String,
      enum: [
  "change-password",
  "change-email",
  "forgot-password"
]
    },
    newEmail: {
      type: String,
      default: ""
    },
    expiresAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminOtp", adminOtpSchema);