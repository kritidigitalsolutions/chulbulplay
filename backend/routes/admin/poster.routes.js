const express = require("express");
const router = express.Router();
const upload = require("../../middlewares/upload.middleware");
const validateFileSizes = require("../../middlewares/validateFileSizes");
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getAllPosters,
  getPosterCategories,
  getPosterById,
  createPoster,
  updatePoster,
  deletePoster,
} = require("../../controllers/poster.controller");

const posterUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "poster", maxCount: 1 },
]);

// ── Admin Poster Routes ─────────────────────────
router.get("/categories", isAdmin, getPosterCategories);
router.get("/", isAdmin, getAllPosters);
router.get("/:id", isAdmin, getPosterById);
router.post("/", isAdmin, posterUpload, validateFileSizes, createPoster);
router.post("/add", isAdmin, posterUpload, validateFileSizes, createPoster);
router.put("/:id", isAdmin, posterUpload, validateFileSizes, updatePoster);
router.patch("/:id", isAdmin, posterUpload, validateFileSizes, updatePoster);
router.delete("/:id", isAdmin, deletePoster);

module.exports = router;
