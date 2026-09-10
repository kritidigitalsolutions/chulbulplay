const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const { getContentStats, getAllContent } = require("../../controllers/admin/content.controller");

// All content routes are admin-only
router.get("/stats", isAdmin, getContentStats);
router.get("/all", isAdmin, getAllContent);

module.exports = router;
