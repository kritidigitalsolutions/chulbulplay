const Watchlist = require("../models/watchlist.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");

// ➕ Add to watchlist
const addToWatchlist = async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "itemId is required" });
    }

    // Auto-detect type
    let itemModel = "";
    const isMovie = await Movie.exists({ _id: itemId });
    
    if (isMovie) {
      itemModel = "Movie";
    } else {
      const isSeries = await Series.exists({ _id: itemId });
      if (isSeries) {
        itemModel = "Series";
      }
    }

    if (!itemModel) {
      return res.status(404).json({ message: "Content not found" });
    }

    const item = await Watchlist.create({
      user: req.user.id,
      item: itemId,
      itemModel: itemModel
    });

    res.status(201).json({
      message: "Added to watchlist ❤️",
      data: item
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Already in watchlist" });
    }
    res.status(500).json({
      message: "Error adding to watchlist",
      error: error.message
    });
  }
};

// 📄 Get watchlist
const getWatchlist = async (req, res) => {
  try {
    const list = await Watchlist.find({ user: req.user.id })
      .populate("item");

    res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching watchlist",
      error: error.message
    });
  }
};

// ❌ Remove from watchlist
const removeFromWatchlist = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const itemId = req.params.id || req.body.itemId || req.query.itemId || req.body.item || req.query.item;

    if (!itemId) {
      return res.status(400).json({ message: "itemId/id is required" });
    }

    const query = { user: req.user.id };
    if (mongoose.Types.ObjectId.isValid(itemId)) {
      query.$or = [
        { _id: itemId },
        { item: itemId }
      ];
    } else {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const deleted = await Watchlist.findOneAndDelete(query);

    if (!deleted) {
      return res.status(404).json({ message: "Item not found in your watchlist" });
    }

    res.json({
      message: "Removed from watchlist ❌"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error removing",
      error: error.message
    });
  }
};

module.exports = {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist
};