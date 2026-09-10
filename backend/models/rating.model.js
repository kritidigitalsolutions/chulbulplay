const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  review: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// ✅ One user = one rating
ratingSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);