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
  addSeries,
  getAllSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  searchSeries,
  togglePublishSeries,
} = require(
  "../../controllers/admin/series.controller"
);


// ========================================
// MULTER FIELDS
// ========================================
const seriesUpload =
  upload.fields([
    {
      name: "poster",
      maxCount: 1,
    },
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "trailer",
      maxCount: 1,
    },

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
  ]);


// ========================================
// ROUTES (Protected)
// ========================================
router.post("/add", isAdmin, seriesUpload, validateFileSizes, addSeries);
router.patch("/:id", isAdmin, seriesUpload, validateFileSizes, updateSeries);
// router.post(
//   "/add",
//   isAdmin,
//   seriesUpload,
//   addSeries
// );

router.get(
  "/",
  isAdmin,
  getAllSeries
);

router.get(
  "/search",
  isAdmin,
  searchSeries
);


router.get(
  "/:id",
  isAdmin,
  getSeriesById
);

// router.patch(
//   "/:id",
//   isAdmin,
//   seriesUpload,
//   updateSeries
// );

router.delete(
  "/:id",
  isAdmin,
  deleteSeries
);

router.patch(
  "/:id/toggle-publish",
  isAdmin,
  togglePublishSeries
);



module.exports = router;