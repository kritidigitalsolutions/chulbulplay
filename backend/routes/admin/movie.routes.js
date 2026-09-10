const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const validateFileSizes = require("../../middlewares/validateFileSizes");

const {
  isAdmin
} = require("../../middlewares/admin.middleware");

const {
  addMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  searchMovies,
  togglePublishMovie,
} = require(
  "../../controllers/admin/movie.controller"
);


// ========================================
// MULTER FIELDS
// ========================================
const movieUpload = upload.fields([
  {
    name: "poster",
    maxCount: 1,
  },
  {
    name: "banner",
    maxCount: 1,
  },
  {
    name: "video",
    maxCount: 1,
  },
  {
    name: "trailer",
    maxCount: 1,
  },

  // Cast images
  {
    name: "castImage_0",
    maxCount: 1,
  },
  {
    name: "castImage_1",
    maxCount: 1,
  },
  {
    name: "castImage_2",
    maxCount: 1,
  },
  {
    name: "castImage_3",
    maxCount: 1,
  },
  {
    name: "castImage_4",
    maxCount: 1,
  },
]);


// ========================================
// ROUTES (Protected)
// ========================================
router.post("/add", isAdmin, movieUpload, validateFileSizes, addMovie);
// Compatibility route for multipart clients that send the movie ID in the
// form-data body. Prefer PATCH /:id for new clients.
router.patch("/update", isAdmin, movieUpload, validateFileSizes, (req, res) => {
  req.params.id = req.body.id;
  return updateMovie(req, res);
});
router.patch("/:id", isAdmin, movieUpload, validateFileSizes, updateMovie);
// router.post(
//   "/add",
//   isAdmin,
//   movieUpload,
//   addMovie
// );

router.get(
  "/",
  isAdmin,
  getAllMovies
);

router.get(
  "/search",
  isAdmin,
  searchMovies
);


router.get(
  "/:id",
  isAdmin,
  getMovieById
);

// router.patch(
//   "/:id",
//   isAdmin,
//   movieUpload,
//   updateMovie
// );

router.delete(
  "/:id",
  isAdmin,
  deleteMovie
);

router.patch(
  "/:id/toggle-publish",
  isAdmin,
  togglePublishMovie
);



module.exports = router;
