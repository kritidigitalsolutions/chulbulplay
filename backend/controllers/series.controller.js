const Series = require("../models/series.model");
const Episode = require("../models/episode.model");

// ========================================
// GET ALL SERIES
// ========================================
const getAllSeries = async (req, res) => {
  try {
    const series = await Series.find().sort({ priority: 1, createdAt: -1 }).lean();

    // Fetch all episodes for these series
    const seriesIds = series.map(s => s._id);
    const allEpisodes = await Episode.find({ seriesId: { $in: seriesIds } }).sort({ seasonNumber: 1, episodeNumber: 1 }).lean();

    const formattedSeries = series.map(s => {
      const episodes = allEpisodes.filter(ep => ep.seriesId.toString() === s._id.toString());
      const seasons = [];
      episodes.forEach(ep => {
        let season = seasons.find(se => se.seasonNumber === ep.seasonNumber);
        if (!season) {
          season = { seasonNumber: ep.seasonNumber, episodes: [] };
          seasons.push(season);
        }
        season.episodes.push(ep);
      });

      const seriesObj = { ...s, seasons };
      return seriesObj;

    });

    return res.json({
      success: true,
      series: formattedSeries,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};

// ========================================
// GET SERIES BY SLUG
// ========================================
const getSeriesBySlug = async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug });

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const episodes = await Episode.find({ seriesId: series._id }).sort({ seasonNumber: 1, episodeNumber: 1 });

    const seasons = [];
    episodes.forEach(ep => {
      let season = seasons.find(s => s.seasonNumber === ep.seasonNumber);
      if (!season) {
        season = { seasonNumber: ep.seasonNumber, episodes: [] };
        seasons.push(season);
      }
      season.episodes.push(ep);
    });

    const seriesObj = series.toObject();

    return res.json({
      success: true,
      series: { ...seriesObj, seasons }
    });




  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};

// ========================================
// GET SERIES BY ID
// ========================================
const getSeriesById = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const episodes = await Episode.find({ seriesId: series._id }).sort({ seasonNumber: 1, episodeNumber: 1 });

    const seasons = [];
    episodes.forEach(ep => {
      let season = seasons.find(s => s.seasonNumber === ep.seasonNumber);
      if (!season) {
        season = { seasonNumber: ep.seasonNumber, episodes: [] };
        seasons.push(season);
      }
      season.episodes.push(ep);
    });

    const seriesObj = series.toObject();

    return res.json({
      success: true,
      series: { ...seriesObj, seasons }
    });




  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
};


// ========================================
// GET EPISODES BY SERIES
// ========================================
const getEpisodesBySeries = async (req, res) => {
  try {
    const episodes = await Episode.find({ seriesId: req.params.seriesId })
      .sort({ seasonNumber: 1, episodeNumber: 1 });

    return res.json({
      success: true,
      episodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch episodes",
    });
  }
};

// ========================================
// TOGGLE SERIES LIKE
// ========================================

const toggleSeriesLike = async (req, res) => {
  try {

    const userId = req.user.id;

    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const liked = series.likes.some(
      id => id.toString() === userId
    );

    const disliked = series.dislikes.some(
      id => id.toString() === userId
    );

    // remove dislike
    if (disliked) {
      series.dislikes = series.dislikes.filter(
        id => id.toString() !== userId
      );
    }

    if (liked) {

      // unlike
      series.likes = series.likes.filter(
        id => id.toString() !== userId
      );

    } else {

      // like
      series.likes.push(userId);
    }

    await series.save();

    return res.status(200).json({
      success: true,
      message: liked
        ? "Series unliked"
        : "Series liked",
      totalLikes: series.likes.length,
      totalDislikes: series.dislikes.length,
      liked: !liked,
    });

  } catch (error) {

    console.error("Toggle Series Like Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// TOGGLE SERIES DISLIKE
// ========================================

const toggleSeriesDislike = async (req, res) => {
  try {

    const userId = req.user.id;

    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    const liked = series.likes.some(
      id => id.toString() === userId
    );

    const disliked = series.dislikes.some(
      id => id.toString() === userId
    );

    // remove like
    if (liked) {
      series.likes = series.likes.filter(
        id => id.toString() !== userId
      );
    }

    if (disliked) {

      // remove dislike
      series.dislikes = series.dislikes.filter(
        id => id.toString() !== userId
      );

    } else {

      // add dislike
      series.dislikes.push(userId);
    }

    await series.save();

    return res.status(200).json({
      success: true,
      message: disliked
        ? "Series dislike removed"
        : "Series disliked",
      totalLikes: series.likes.length,
      totalDislikes: series.dislikes.length,
      disliked: !disliked,
    });

  } catch (error) {

    console.error("Toggle Series Dislike Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllSeries,
  getSeriesBySlug,
  getSeriesById,
  toggleSeriesLike,
  toggleSeriesDislike,
  getEpisodesBySeries,
};


