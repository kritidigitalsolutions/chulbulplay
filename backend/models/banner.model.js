const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Banner image URL is required"],
      trim: true,
    },
    linkUrl: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    contentType: {
      type: String,
      enum: ["movie", "series", "custom", "external"],
      default: "custom",
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

bannerSchema.index({ priority: -1, createdAt: -1 });

module.exports = mongoose.model("Banner", bannerSchema);
