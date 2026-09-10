const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: true
    },

    seasonNumber: {
      type: Number,
      required: true,
      min: 1
    },

    episodeNumber: {
      type: Number,
      required: true,
      min: 1
    },

    videoUrl: {
      type: String,
      required: true
    },

    thumbnail: {
      type: String,
      default: ""
    },

    duration: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

episodeSchema.index({
  createdAt: -1
});

episodeSchema.index(
  {
    seriesId: 1,
    seasonNumber: 1,
    episodeNumber: 1
  },
  {
    unique: true,
    name: "unique_episode_per_season"
  }
);

module.exports = mongoose.model(
  "Episode",
  episodeSchema
);