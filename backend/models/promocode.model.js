const mongoose = require("mongoose");

const promoSchema =
  new mongoose.Schema(
    {
      // ========================================
      // PROMO CODE
      // ========================================

      code: {
        type: String,

        unique: true,

        required: true,

        uppercase: true,

        trim: true,
      },

      // ========================================
      // DISCOUNT TYPE
      // ========================================

      discountType: {
        type: String,

        enum: [
          "percentage",
          "flat",
        ],

        required: true,
      },

      // ========================================
      // DISCOUNT VALUE
      // ========================================

      discountValue: {
        type: Number,

        required: true,

        min: 0,
      },

      // ========================================
      // APPLICABLE PLANS
      // ========================================

      applicablePlans: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "Plan",
        },
      ],

      // ========================================
      // MAX USES
      // ========================================

      maxUses: {
        type: Number,

        default: 100,

        min: 1,
      },

      // ========================================
      // USED COUNT
      // ========================================

      usedCount: {
        type: Number,

        default: 0,

        min: 0,
      },

      // ========================================
      // EXPIRY DATE
      // ========================================

      expiryDate: {
        type: Date,

        index: true,
      },

      // ========================================
      // ACTIVE STATUS
      // ========================================

      isActive: {
        type: Boolean,

        default: true,

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
// VALIDATION
// ========================================

promoSchema.pre("save", function () {

  if (
    this.discountType === "percentage" &&
    this.discountValue > 100
  ) {
    throw new Error(
      "Percentage discount cannot exceed 100"
    );
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Promo",
  promoSchema
);