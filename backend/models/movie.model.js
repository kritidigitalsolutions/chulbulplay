const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  image: {
    type: String,
    default: ""
  }
});

// Main Schema
const movieSchema = new mongoose.Schema(
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

    genre: [{
      type: String,
      trim: true
    }],

    releaseYear: Number,

    duration: String,

    language: String,

    poster: String,

    banner: String,

    isComingSoon: {
      type: Boolean,
      default: false
    },

    releaseDate: {
      type: Date
    },

    // Higher priority appears first
    priority: {
      type: Number,
      default: 0
    },

    videoUrl: String,

    trailerUrl: String,

    isPremium: {
      type: Boolean,
      default: false
    },

    isPublished: {
      type: Boolean,
      default: true
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },

    cast: [castSchema],

    category: [
      {
        type: String,
        trim: true,
      }
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

// Auto-generate slug only once
movieSchema.pre("save", function () {
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

// Indexes
movieSchema.index({
  priority: -1,
  createdAt: -1
});

movieSchema.index({
  title: "text",
  description: "text"
}, {
  default_language: "none",
  language_override: "textLanguage"
});

module.exports = mongoose.model(
  "Movie",
  movieSchema
);
