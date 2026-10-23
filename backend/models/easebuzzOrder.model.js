const mongoose = require("mongoose");

const easebuzzOrderSchema = new mongoose.Schema(
  {
    txnid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accessKey: {
      type: String,
      default: null,
      index: true,
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
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["initiated", "completed", "failed"],
      default: "initiated",
      index: true,
    },
    easepayid: {
      type: String,
      default: null,
    },
    customerEmail: {
      type: String,
      default: null,
    },
    customerPhone: {
      type: String,
      default: null,
    },
    rawResponse: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EasebuzzOrder", easebuzzOrderSchema);
