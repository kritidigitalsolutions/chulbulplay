const mongoose = require("mongoose");

const posterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Poster title is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Poster image URL is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Poster category is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    linkUrl: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    releaseYear: {
      type: Number,
      default: null,
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

posterSchema.index({ category: 1, priority: -1, createdAt: -1 });
posterSchema.index({ priority: -1, createdAt: -1 });

module.exports = mongoose.model("Poster", posterSchema);
