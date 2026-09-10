  const express = require("express");
  const router  = express.Router();

  const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
  } = require("../../controllers/admin/category.controller");

  const { isAdmin } = require("../../middlewares/admin.middleware");

  // ── Admin Category Routes ──────────────────────────
  router.get("/", isAdmin, getAllCategories);
  router.post("/", isAdmin, createCategory);
  router.get("/:id", isAdmin, getCategoryById);
  router.patch("/:id", isAdmin, updateCategory);
  router.delete("/:id", isAdmin, deleteCategory);

  module.exports = router;
