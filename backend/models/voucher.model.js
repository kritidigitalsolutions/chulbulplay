const mongoose = require("mongoose");

const voucherSchema =
  new mongoose.Schema(
    {
      // ========================================
      // VOUCHER CODE
      // ========================================

      code: {
        type: String,

        unique: true,

        required: true,

        uppercase: true,
        trim: true,

        index: true,
      },

      // ========================================
      // PLAN
      // ========================================

      plan: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Plan",

        required: true,

        index: true,
      },

      // ========================================
      // VALIDITY DAYS
      // ========================================

      validityDays: {
        type: Number,

        required: true,

        min: 1,
      },

      // ========================================
      // USED STATUS
      // ========================================

      isUsed: {
        type: Boolean,

        default: false,

        index: true,
      },

      // ========================================
      // USED BY
      // ========================================

      usedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      // ========================================
      // EXPIRY DATE
      // ========================================

      expiryDate: {
        type: Date,

        index: true,
      },

      // ========================================
      // OPTIONAL DESCRIPTION
      // ========================================

      description: {
        type: String,

        trim: true,

        default: "",
      },
    },

    {
      timestamps: true,
    }
  );


// ========================================
// INDEXES
// ========================================




// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Voucher",
  voucherSchema
);