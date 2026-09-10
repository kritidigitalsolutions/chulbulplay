const mongoose = require("mongoose");
const Episode = require("./episode.model");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, default: "" }
});

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    description: {
      type: String,
      default: ""
    },

    genre: [{ type: String, trim: true }],

    releaseYear: Number,
    duration: String,
    language: String,

    poster: String,
    banner: String,

    isComingSoon: { type: Boolean, default: false },
    releaseDate: { type: Date },

    trailerUrl: String,

    isPremium: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },

    // Priority: higher = shown first (0 = default)
    priority: { type: Number, default: 0 },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },

    cast: [castSchema],

    // Dynamic category slugs — references Category.slug
    category: [{ type: String, trim: true }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    totalSeasons: { type: Number, default: 0, min: 0 },
    totalEpisodes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Slug generator
seriesSchema.pre("save", function () {
  if (!this.slug && this.title) {
    this.slug =
      this.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "") +
      "-" +
      Date.now();
  }
});

seriesSchema.pre("findOneAndDelete", async function () {
  const series = await this.model.findOne(this.getFilter()).select("_id");
  if (series) {
    await Episode.deleteMany({ seriesId: series._id });
  }
});

seriesSchema.pre("deleteOne", { document: true, query: false }, async function () {
  await Episode.deleteMany({ seriesId: this._id });
});

seriesSchema.index({ priority: -1, createdAt: -1 });

seriesSchema.index(
  { title: "text", description: "text" },
  { default_language: "none", language_override: "textLanguage" }
);

module.exports = mongoose.model("Series", seriesSchema);
