const express = require("express");
const router = express.Router();

const {
  getAllCategories,
  getCategoryById,
  getCategoryCuratedItemsUser,
} = require("../../controllers/admin/category.controller");

// ── User Category Routes ──────────────────────────
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.get("/slug/:slug/items", getCategoryCuratedItemsUser);

module.exports = router;
