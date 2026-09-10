const mongoose = require("mongoose");

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
