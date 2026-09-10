const mongoose = require("mongoose");

// One doc per type (privacy-policy | terms-conditions)
const legalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["privacy-policy", "terms-conditions" , "refund-policy"],
      required: true,
      unique: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true }, // rich text / markdown
    lastUpdatedBy: { type: String, default: "Admin" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Legal", legalSchema);
