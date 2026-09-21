const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/upload.middleware");
const validateFileSizes = require("../../middlewares/validateFileSizes");
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getPosterCategories,
  getPublicPosters,
  getPosterById,
  createPoster,
  updatePoster,
  deletePoster,
} = require("../../controllers/poster.controller");

const posterUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "poster", maxCount: 1 },
]);

// ── Public Routes ──────────────────────────────
router.get("/categories", getPosterCategories);
router.get("/", getPublicPosters);
router.get("/:id", getPosterById);

// ── Admin Protected CRUD on /api/posters ───────
router.post("/", isAdmin, posterUpload, validateFileSizes, createPoster);
router.post("/add", isAdmin, posterUpload, validateFileSizes, createPoster);
router.put("/:id", isAdmin, posterUpload, validateFileSizes, updatePoster);
router.patch("/:id", isAdmin, posterUpload, validateFileSizes, updatePoster);
router.delete("/:id", isAdmin, deletePoster);

module.exports = router;
