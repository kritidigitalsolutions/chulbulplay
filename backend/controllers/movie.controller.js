const Movie = require("../models/movie.model");

// ========================================
// GET ALL MOVIES
// ========================================

const getAllMovies = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const movies = await Movie.find({})
      .sort({ priority: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Movie.countDocuments({});

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
// GET MOVIE BY SLUG
// ========================================

const getMovieBySlug = async (req, res) => {
  try {

    const movie = await Movie.findOne({
      slug: req.params.slug,
    }).lean();

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
// GET MOVIE BY ID
// ========================================

const getMovieById = async (req, res) => {
  try {

    const movie = await Movie.findOne({
      _id: req.params.id,
    }).lean();

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
// TOGGLE MOVIE LIKE
// ========================================
const toggleMovieLike = async (req, res) => {
  try {
    const userId = req.user.id;

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const liked = movie.likes.includes(userId);
    const disliked = movie.dislikes.includes(userId);

    // remove dislike if exists
    if (disliked) {
      movie.dislikes = movie.dislikes.filter(
        id => id.toString() !== userId
      );
    }

    if (liked) {
      // unlike
      movie.likes = movie.likes.filter(
        id => id.toString() !== userId
      );
    } else {
      // like
      movie.likes.push(userId);
    }

    await movie.save();

    res.status(200).json({
      success: true,
      message: liked
        ? "Movie unliked"
        : "Movie liked",
      totalLikes: movie.likes.length,
      totalDislikes: movie.dislikes.length,
      liked: !liked,
    });

  } catch (error) {
    console.error("Toggle Movie Like Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// TOGGLE MOVIE DISLIKE
// ========================================
const toggleMovieDislike = async (req, res) => {
  try {
    const userId = req.user.id;

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const liked = movie.likes.includes(userId);
    const disliked = movie.dislikes.includes(userId);

    // remove like if exists
    if (liked) {
      movie.likes = movie.likes.filter(
        id => id.toString() !== userId
      );
    }

    if (disliked) {
      // remove dislike
      movie.dislikes = movie.dislikes.filter(
        id => id.toString() !== userId
      );
    } else {
      // add dislike
      movie.dislikes.push(userId);
    }

    await movie.save();

    res.status(200).json({
      success: true,
      message: disliked
        ? "Movie dislike removed"
        : "Movie disliked",
      totalLikes: movie.likes.length,
      totalDislikes: movie.dislikes.length,
      disliked: !disliked,
    });

  } catch (error) {
    console.error("Toggle Movie Dislike Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllMovies,
  getMovieBySlug,
  getMovieById,
  toggleMovieLike,
  toggleMovieDislike,
};
