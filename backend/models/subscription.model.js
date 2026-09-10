const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    // ========================================
    // USER
    // ========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ========================================
    // PLAN
    // ========================================
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    // ========================================
    // STATUS
    // ========================================
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    // ========================================
    // PLATFORM (APP / WEBSITE)
    // ========================================
    platform: {
      type: String,
      enum: ["app", "website"],
      default: "app",
      index: true,
    },

    // ========================================
    // SABPAISA / GATEWAY ORDER ID
    // ========================================
    subscriptionId: {
      type: String,
      default: null,
      trim: true,
    },

    // ========================================
    // PAYMENT ID
    // ========================================
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // ========================================
    // PAYMENT GATEWAY
    // ========================================
    paymentGateway: {
      type: String,
      enum: ["sabpaisa", "manual", "voucher"],
      default: "sabpaisa",
    },

    // ========================================
    // AMOUNT
    // ========================================
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ========================================
    // CURRENCY
    // ========================================
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    // ========================================
    // START DATE
    // ========================================
    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    // ========================================
    // END DATE
    // ========================================
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ========================================
// COMPOUND INDEXES
// ========================================

// user + platform + status lookup
subscriptionSchema.index({
  user: 1,
  platform: 1,
  status: 1,
});

subscriptionSchema.index({
  user: 1,
  status: 1,
});

// active expiry scans
subscriptionSchema.index({
  status: 1,
  endDate: 1,
});

// admin analytics
subscriptionSchema.index({
  createdAt: -1,
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
