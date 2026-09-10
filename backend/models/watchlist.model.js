const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemModel'
    },
    itemModel: {
      type: String,
      required: true,
      enum: ['Movie', 'Series']
    }
  },
  { timestamps: true }
);

// prevent duplicate entries
watchlistSchema.index({ user: 1, item: 1 }, { unique: true });

module.exports = mongoose.model("Watchlist", watchlistSchema);