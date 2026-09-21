const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/upload.middleware");
const validateFileSizes = require("../../middlewares/validateFileSizes");
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} = require("../../controllers/banner.controller");

const bannerUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

// ── Admin Banner Routes ─────────────────────────
router.get("/", isAdmin, getAllBanners);
router.get("/:id", isAdmin, getBannerById);
router.post("/", isAdmin, bannerUpload, validateFileSizes, createBanner);
router.post("/add", isAdmin, bannerUpload, validateFileSizes, createBanner);
router.put("/:id", isAdmin, bannerUpload, validateFileSizes, updateBanner);
router.patch("/:id", isAdmin, bannerUpload, validateFileSizes, updateBanner);
router.delete("/:id", isAdmin, deleteBanner);

module.exports = router;
