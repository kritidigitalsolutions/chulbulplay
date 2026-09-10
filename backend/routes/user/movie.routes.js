const express = require("express");
const router = express.Router();
const { getAllMovies, getMovieBySlug, getMovieById } = require("../../controllers/movie.controller");

router.get("/", getAllMovies);
router.get("/slug/:slug", getMovieBySlug);
router.get("/id/:id", getMovieById);


module.exports = router;
