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
  addEpisode,
  getEpisodes,
  updateEpisode,
  deleteEpisode,
  deleteSeason,
  searchEpisodes,
} = require(
  "../../controllers/admin/episode.controller"
);


// ========================================
// MULTER
// ========================================
const episodeUpload =
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]);


// ========================================
// ROUTES (Protected)
// ========================================
router.post("/add", isAdmin, episodeUpload, validateFileSizes, addEpisode);
router.patch("/:id", isAdmin, episodeUpload, validateFileSizes, updateEpisode);
// router.post(
//   "/add",
//   isAdmin,
//   episodeUpload,
//   addEpisode
// );

router.get(
  "/",
  isAdmin,
  getEpisodes
);

router.get(
  "/search",
  isAdmin,
  searchEpisodes
);


// router.patch(
//   "/:id",

//   isAdmin,
//   episodeUpload,
//   updateEpisode
// );

router.delete(
  "/season/:seriesId/:seasonNumber",
  isAdmin,
  deleteSeason
);

router.delete(
  "/:id",
  isAdmin,
  deleteEpisode
);




module.exports = router;