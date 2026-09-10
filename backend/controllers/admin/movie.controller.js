const Movie = require("../../models/movie.model");
const mongoose = require("mongoose");
const { getMediaUrl, deleteMedia, deleteMediaFiles } = require("../../utils/mediaUrl");

// ========================================
// HELPERS
// ========================================

const parseJSON = (value, defaultValue = []) => {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const sanitizeCast = (cast = []) => {
  if (!Array.isArray(cast)) {
    return [];
  }

  return cast
    .map((member) => ({
      name: String(member?.name || "").trim(),
      image: String(member?.image || "").trim(),
    }))
    .filter((member) => member.name || member.image)
    .map((member) => ({
      ...member,
      name: member.name || "Unknown",
    }));
};


// ========================================
// ADD MOVIE
// ========================================

const addMovie = async (req, res) => {
  try {

    const genre = parseJSON(req.body.genre);

    const category = parseJSON(req.body.category);

    const cast = parseJSON(req.body.cast);

    // ========================================
    // VALIDATION
    // ========================================

    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // ========================================
    // FILES
    // ========================================

    const poster = req.files?.poster?.[0];

    const banner = req.files?.banner?.[0];

    const trailer = req.files?.trailer?.[0];

    const video = req.files?.video?.[0];

    // ========================================
    // CAST IMAGES
    // ========================================

    const castFiles = Object.keys(req.files || {})
      .filter((key) => key.startsWith("castImage_"));

    castFiles.forEach((key) => {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {
        cast[index].image =
          getMediaUrl(file);
      }
    });

    // ========================================
    // PRIORITY ALGORITHM
    // ========================================
    const inputPriority = req.body.priority !== undefined ? Number(req.body.priority) : 0;
    let priority = 0;

    if (inputPriority > 0) {
      // Shift up all existing movies with priority >= inputPriority
      await Movie.updateMany({ priority: { $gte: inputPriority } }, { $inc: { priority: 1 } });
      priority = inputPriority;
    } else {
      // Auto-assign: maxPriority + 1
      const maxMovie = await Movie.findOne().sort("-priority");
      priority = maxMovie && maxMovie.priority ? maxMovie.priority + 1 : 1;
    }

    // ========================================
    // CREATE MOVIE
    // ========================================
console.log("MOVIE CREATE PAYLOAD");
console.log({
  title: req.body.title,
  poster: req.body.poster,
  banner: req.body.banner,
  trailerUrl: req.body.trailerUrl,
  videoUrl: req.body.videoUrl,
  cast,
  genre,
  category,
  language: req.body.language,
});
    const movie = await Movie.create({

      title: req.body.title,

      description: req.body.description || "",

      genre,

      releaseYear: req.body.releaseYear || null,

      duration: req.body.duration || "",

      language: req.body.language || "",

      poster: getMediaUrl(poster, req.body.poster),

      banner: getMediaUrl(banner, req.body.banner),

      trailerUrl: getMediaUrl(trailer, req.body.trailerUrl),

      videoUrl: getMediaUrl(video, req.body.videoUrl),


      isComingSoon:
        req.body.isComingSoon === "true",

      releaseDate:
        req.body.releaseDate || null,

      isPremium:
        req.body.isPremium === "true",

      isPublished:
        req.body.isPublished !== "false",

      rating: req.body.rating || 0,

      cast: sanitizeCast(cast),

      category,

      priority,
    });

    return res.status(201).json({
      success: true,
      message: "Movie added successfully",
      movie,
    });

  } catch (error) {
  console.error("================================");
  console.error("ADD MOVIE ERROR");
  console.error(error);
  console.error(error.message);

  if (error.errors) {
    Object.keys(error.errors).forEach((key) => {
      console.error(
        "VALIDATION:",
        key,
        error.errors[key]?.message
      );
    });
  }

  console.error("REQUEST BODY:");
  console.log(req.body);

  console.error("================================");

  return res.status(500).json({
    success: false,
    message: error.message,
  });
}
};

// ========================================
// GET ALL MOVIES
// ========================================

const getAllMovies = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const movies = await Movie.find()
      .sort({
        priority: -1,
        createdAt: -1
      })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Movie.countDocuments();

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      movies,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
};

// ========================================
// SEARCH MOVIES
// ========================================

const searchMovies = async (req, res) => {
  try {

    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const movies = await Movie.find({
      title: {
        $regex: q,
        $options: "i",
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      results: movies,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

// ========================================
// GET MOVIE BY ID
// ========================================

const getMovieById = async (req, res) => {
  try {

    const movie = await Movie.findById(
      req.params.id
    ).lean();

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
    });
  }
};

// ========================================
// UPDATE MOVIE
// ========================================

const updateMovie = async (req, res) => {
  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid movie ID is required",
      });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const genre = parseJSON(
      req.body.genre,
      movie.genre
    );

    const category = parseJSON(
      req.body.category,
      movie.category
    );

    const cast = parseJSON(
      req.body.cast,
      movie.cast
    );

    // ========================================
    // UPDATE FIELDS
    // ========================================

    if (req.body.title)
      movie.title = req.body.title;

    if (req.body.description)
      movie.description =
        req.body.description;

    movie.genre = genre;

    if (req.body.releaseYear)
      movie.releaseYear =
        req.body.releaseYear;

    if (req.body.duration)
      movie.duration =
        req.body.duration;

    if (req.body.language)
      movie.language =
        req.body.language;

    if (
      req.body.releaseDate !== undefined &&
      req.body.releaseDate !== "null" &&
      req.body.releaseDate !== ""
    ) {
      movie.releaseDate = req.body.releaseDate;
    }

    if (req.body.rating)
      movie.rating =
        req.body.rating;

    movie.isComingSoon =
      req.body.isComingSoon === "true";

    movie.isPremium =
      req.body.isPremium === "true";

    if (req.body.isPublished !== undefined) {
      movie.isPublished = req.body.isPublished === "true";
    }

    movie.category = category;

    // ========================================
    // FILES
    // ========================================

    if (req.files?.poster?.[0]) {
      await deleteMedia(movie.poster);
      movie.poster = getMediaUrl(req.files.poster[0]);
    } else if (req.body.posterUrl !== undefined) {
      movie.poster = req.body.posterUrl;
    } else if (req.body.poster !== undefined) {
      movie.poster = req.body.poster;
    }

    if (req.files?.banner?.[0]) {
      await deleteMedia(movie.banner);
      movie.banner = getMediaUrl(req.files.banner[0]);
    } else if (req.body.bannerUrl !== undefined) {
      movie.banner = req.body.bannerUrl;
    } else if (req.body.banner !== undefined) {
      movie.banner = req.body.banner;
    }

    if (req.files?.trailer?.[0]) {
      await deleteMedia(movie.trailerUrl);
      movie.trailerUrl = getMediaUrl(req.files.trailer[0]);
    } else if (req.body.trailerUrl !== undefined) {
      movie.trailerUrl = req.body.trailerUrl;
    }

    if (req.files?.video?.[0]) {
      await deleteMedia(movie.videoUrl);
      movie.videoUrl = getMediaUrl(req.files.video[0]);
    } else if (req.body.videoUrl !== undefined) {
      movie.videoUrl = req.body.videoUrl;
    }


    // ========================================
    // CAST IMAGES
    // ========================================

    const castFiles =
      Object.keys(req.files || {})
        .filter((key) =>
          key.startsWith("castImage_")
        );

    for (const key of castFiles) {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {

        if (
          cast[index].image &&
          cast[index].image !== getMediaUrl(file)
        ) {
          await deleteMedia(
            cast[index].image
          );
        }

        cast[index].image = getMediaUrl(file);
      }
    }



    movie.cast = sanitizeCast(cast);

    // ========================================
    // PRIORITY ALGORITHM FOR UPDATE
    // ========================================
    if (req.body.priority !== undefined) {
      const newPriority = Number(req.body.priority) || 0;
      const oldPriority = movie.priority || 0;

      if (newPriority !== oldPriority) {
        // Step 1: Remove movie from its old slot by shifting down priorities above oldPriority
        if (oldPriority > 0) {
          await Movie.updateMany(
            { _id: { $ne: movie._id }, priority: { $gt: oldPriority } },
            { $inc: { priority: -1 } }
          );
        }

        // Step 2: Insert movie into its new slot
        if (newPriority > 0) {
          // Shift up all priorities >= newPriority
          await Movie.updateMany(
            { _id: { $ne: movie._id }, priority: { $gte: newPriority } },
            { $inc: { priority: 1 } }
          );
          movie.priority = newPriority;
        } else {
          movie.priority = 0;
        }
      }
    }

    await movie.save();

    return res.json({
      success: true,
      message: "Movie updated successfully",
      movie,
    });

  } catch (error) {
    console.error("UPDATE MOVIE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update movie", error: error.message });
  }
};

// ========================================
// DELETE MOVIE
// ========================================

const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    // Capture priority before deletion to shift other priorities
    const targetPriority = movie.priority || 0;

    // Delete files from local /uploads storage.
    await deleteMediaFiles(
      movie.poster,
      movie.banner,
      movie.trailerUrl,
      movie.videoUrl,
      ...(movie.cast || []).map(c => c.image)
    );

    await Movie.findByIdAndDelete(req.params.id);

    // Shift down priorities of all movies with priority > targetPriority
    if (targetPriority > 0) {
      await Movie.updateMany({ priority: { $gt: targetPriority } }, { $inc: { priority: -1 } });
    }

    return res.json({ success: true, message: "Movie deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete movie" });
  }
};

// ========================================
// TOGGLE PUBLISH MOVIE
// ========================================
const togglePublishMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    movie.isPublished = movie.isPublished === undefined ? false : !movie.isPublished;
    await movie.save();

    return res.json({
      success: true,
      message: `Movie ${movie.isPublished ? "published" : "unpublished"} successfully`,
      isPublished: movie.isPublished,
      movie
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  addMovie,
  getAllMovies,
  searchMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  togglePublishMovie,
};
