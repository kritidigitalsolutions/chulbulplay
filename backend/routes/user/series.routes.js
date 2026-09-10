const express = require("express");
const router = express.Router();
const { getAllSeries, getSeriesBySlug, getSeriesById, getEpisodesBySeries } = require("../../controllers/series.controller");

router.get("/", getAllSeries);
router.get("/slug/:slug", getSeriesBySlug);
router.get("/:id", getSeriesById);
router.get("/episodes/:seriesId", getEpisodesBySeries);


module.exports = router;
