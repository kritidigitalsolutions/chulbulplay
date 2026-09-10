const mongoose = require("mongoose");

const helpSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        "cancel-subscription",
        "contact-support",
        "account-help",
        "report-problem",
        "faq",
        "contact-info"
      ]
    },

    question: {
      type: String
    },

    answer: {
      type: String
    },

    // ADD THIS
    supportNumber: {
      type: String,
      default: ""
    },

    supportEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },

    isHide: {
      type: Boolean,
      default: false
    },

    isPublished: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Help", helpSchema);
