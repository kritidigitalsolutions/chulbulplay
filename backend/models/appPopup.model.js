const mongoose = require("mongoose");

const appPopupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      required: [true, "Popup description is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Popup image is required"],
      trim: true,
    },
    contentType: {
      type: String,
      enum: ["movie", "series", "custom", "none"],
      default: "none",
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Optional cached content snapshot for fast reads
    content: {
      id: { type: String, default: "" },
      title: { type: String, default: "" },
      contentType: { type: String, default: "" },
      poster: { type: String, default: "" },
      banner: { type: String, default: "" },
    },
    actionButtonText: {
      type: String,
      default: "Watch Now",
      trim: true,
    },
    actionUrl: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 1,
      index: true,
    },
    platform: {
      type: String,
      enum: ["app", "web", "all"],
      default: "app",
      index: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for alias id
appPopupSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

appPopupSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : "";
    return ret;
  },
});

module.exports = mongoose.model("AppPopup", appPopupSchema);
