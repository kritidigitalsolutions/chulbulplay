const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ["movie", "series"],
    required: true
  },
  type: {
    type: String,
    enum: ["like", "dislike"],
    required: true
  }
}, { timestamps: true });

// ✅ Prevent duplicate (same user + same content)
interactionSchema.index({ user: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model("Interaction", interactionSchema);