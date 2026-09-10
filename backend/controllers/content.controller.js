const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");

// ========================================
// GET HOME CONTENT (COMBINED)
// ========================================
const getHomeContent = async (req, res) => {
  try {
    // Fetch active movies and series
    const movies = await Movie.find({ isPublished: { $ne: false } }).sort({ priority: -1, createdAt: -1 }).limit(20).lean();
    const series = await Series.find({ isPublished: { $ne: false } }).sort({ priority: -1, createdAt: -1 }).limit(20).lean();
const seriesIds = series.map(s => s._id);

const allEpisodes = await Episode.find({
  seriesId: { $in: seriesIds }
})
.sort({
  seasonNumber: 1,
  episodeNumber: 1
})
.lean();
    const [
  moviesCount,
  seriesCount,
  seriesData
] = await Promise.all([
  Movie.countDocuments({ isPublished: { $ne: false } }),
  Series.countDocuments({ isPublished: { $ne: false } }),
  Series.find({ isPublished: { $ne: false } }, "totalEpisodes").lean()
]);
    const episodesCount = seriesData.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);
 const episodesMap = {};

allEpisodes.forEach(ep => {
  const id = ep.seriesId.toString();

  if (!episodesMap[id]) {
    episodesMap[id] = [];
  }

  episodesMap[id].push(ep);
});
    // Format and add flags
    const formattedMovies = movies.map((m) => ({
      ...m,
      type: "movie",
      isTrending: m.category?.includes("trending") || false
    }));

  const formattedSeries = series.map((s) => {

  const episodes = episodesMap[s._id.toString()] || [];

  const seasons = [];

  episodes.forEach(ep => {
    let season = seasons.find(
      se => se.seasonNumber === ep.seasonNumber
    );

    if (!season) {
      season = {
        seasonNumber: ep.seasonNumber,
        episodes: []
      };

      seasons.push(season);
    }

    season.episodes.push(ep);
  });

  return {
    ...s,
    seasons,
    type: "series",
    isTrending: s.category?.includes("trending") || false
  };

});
    // Combine and sort by priority, then date
    const content = [...formattedMovies, ...formattedSeries].sort(
      (a, b) => {
      const priorityDiff =(b.priority || 0)-(a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    );

    return res.json({
      success: true,
      moviesCount,
      seriesCount,
      episodesCount,
      content
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




// ========================================
// SEARCH CONTENT
// ========================================
const searchContent = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: "Search query is required" });

    const movies = await Movie.find(
  {
    $text: {
      $search: query
    },
    isPublished: { $ne: false }
  },
  {
    score: {
      $meta: "textScore"
    }
  }
)
.select({
  score: {
    $meta: "textScore"
  }
})
.sort({
  score: {
    $meta: "textScore"
  }
})
.lean();


const series = await Series.find(
  {
    $text: {
      $search: query
    },
    isPublished: { $ne: false }
  },
  {
    score: {
      $meta: "textScore"
    }
  }
)
.select({
  score: {
    $meta: "textScore"
  }
})
.sort({
  score: {
    $meta: "textScore"
  }
})
.lean();

    const results = [
  ...movies.map(m => ({
    ...m,
    type: "movie"
  })),
  ...series.map(s => ({
    ...s,
    type: "series"
  }))
].sort(
  (a, b) =>
    (b.score || 0) -
    (a.score || 0)
);



    return res.json({
      success: true,
      results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getHomeContent,
  searchContent
};
