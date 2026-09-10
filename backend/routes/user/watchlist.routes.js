const express = require("express");
const router = express.Router();

const {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist
} = require("../../controllers/watchlist.controller");

const { isAuth } = require("../../middlewares/auth.middleware");

// all routes protected
router.post("/", isAuth, addToWatchlist);
router.get("/", isAuth, getWatchlist);
router.delete("/:id", isAuth, removeFromWatchlist);
router.delete("/", isAuth, removeFromWatchlist);

module.exports = router;