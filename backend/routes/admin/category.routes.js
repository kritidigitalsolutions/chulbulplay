const express = require("express");
const router  = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoryCuratedContent,
  saveCuratedOrder,
} = require("../../controllers/admin/category.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

// ── Admin Category Routes ──────────────────────────
router.get("/", isAdmin, getAllCategories);
router.post("/", isAdmin, createCategory);
router.get("/:id", isAdmin, getCategoryById);
router.patch("/:id", isAdmin, updateCategory);
router.delete("/:id", isAdmin, deleteCategory);
router.patch("/:id/toggle", isAdmin, toggleCategoryStatus);
router.get("/:id/curated-content", isAdmin, getCategoryCuratedContent);
router.patch("/:id/curated-order", isAdmin, saveCuratedOrder);

module.exports = router;
