const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");

// ========================================
// GET CONTENT STATS
// ========================================
const getContentStats = async (req, res) => {
  try {
    const moviesCount = await Movie.countDocuments();
    const seriesCount = await Series.countDocuments();

    return res.json({
      success: true,
      stats: {
        movies: moviesCount,
        series: seriesCount,
        total: moviesCount + seriesCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// GET ALL CONTENT (COMBINED)
// ========================================
const getAllContent = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 }).lean();
    const series = await Series.find().sort({ createdAt: -1 }).lean();

    const formattedMovies = movies.map(m => ({ ...m, contentType: "movie" }));
    const formattedSeries = series.map(s => ({ ...s, contentType: "series" }));

    const allContent = [...formattedMovies, ...formattedSeries].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      success: true,
      content: allContent
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getContentStats,
  getAllContent
};