const Movie = require("../models/movie.model");
const Series = require("../models/series.model");

const updateUpcomingStatus = async (req, res, next) => {
  try {
    const now = new Date();
    await Promise.all([
      Movie.updateMany(
        { isComingSoon: true, releaseDate: { $lte: now } },
        { $set: { isComingSoon: false } }
      ),
      Series.updateMany(
        { isComingSoon: true, releaseDate: { $lte: now } },
        { $set: { isComingSoon: false } }
      )
    ]);
    next();
  } catch (error) {
    console.error("Error updating upcoming content status:", error);
    next();
  }
};

module.exports = updateUpcomingStatus;
