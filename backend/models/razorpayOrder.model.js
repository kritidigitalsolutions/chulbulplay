const mongoose = require("mongoose");

const razorpayOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    receipt: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    platform: {
      type: String,
      enum: ["app", "website"],
      default: "app",
      index: true,
    },
    promoCode: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "completed", "failed"],
      default: "created",
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RazorpayOrder", razorpayOrderSchema);
