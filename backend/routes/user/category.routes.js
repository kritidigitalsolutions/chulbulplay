const express = require("express");
const router = express.Router();

const {
  getAllCategories,
  getCategoryById
} = require("../../controllers/admin/category.controller");

// ── User Category Routes ──────────────────────────
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

module.exports = router;
