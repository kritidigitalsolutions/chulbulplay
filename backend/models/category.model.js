const mongoose = require("mongoose");

const curatedItemSchema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    contentType: {
      type: String,
      enum: ["series", "movie"],
      default: "series",
    },
    position: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    // description: {
    //   type: String,
    //   default: "",
    // },
    color: {
      type: String,
      default: "#6366f1",
    },
    priority: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    curatedItems: [curatedItemSchema],
  },
  { timestamps: true }
);

// Auto-generate slug from name
categorySchema.pre("save", function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
});

module.exports = mongoose.model("Category", categorySchema);
