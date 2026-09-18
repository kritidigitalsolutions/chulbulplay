const mongoose = require("mongoose");

const planSchema =
  new mongoose.Schema(
    {
      // ========================================
      // PLAN NAME
      // ========================================

      name: {
        type: String,

        required: true,

        trim: true,
      },

      // ========================================
      // PRICE
      // ========================================

      price: {
        type: Number,

        required: true,

        min: 0,
      },

      // ========================================
      // DURATION (DAYS)
      // ========================================

      duration: {
        type: Number,

        required: true,

        min: 1,
      },

      // ========================================
      // FEATURES
      // ========================================

      features: [
        {
          type: String,

          trim: true,
        },
      ],

      // ========================================
      // ACTIVE STATUS
      // ========================================

      isActive: {
        type: Boolean,

        default: true,

        index: true,
      },

      // ========================================
      // OPTIONAL FUTURE SUPPORT
      // ========================================

      // daily / weekly / monthly / quarterly / yearly / lifetime
      planType: {
        type: String,

        enum: [
          "daily",
          "daywise",
          "weekly",
          "monthly",
          "quarterly",
          "yearly",
          "lifetime",
        ],

        default: "monthly",
      },

      // display sorting
      sortOrder: {
        type: Number,

        default: 0,
      },

      // recommended badge
      isRecommended: {
        type: Boolean,

        default: false,
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
    },

    {
      timestamps: true,
    }
  );


// ========================================
// INDEXES
// ========================================

planSchema.index({
  sortOrder: 1,
});

planSchema.index(
  { name: 1, platform: 1 },
  { unique: true }
);

// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Plan",
  planSchema
);