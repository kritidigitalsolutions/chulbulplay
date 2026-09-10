const express = require("express");

const router = express.Router();

const {
  getLegalForUser,
  getLegalByTypeForUser
} = require("../../controllers/legal.controller");


// ========================================
// PUBLIC LEGAL ROUTES
// ========================================

// Get all published legal docs
router.get(
  "/",
  getLegalForUser
);

// Get legal doc by type
router.get(
  "/:type",
  getLegalByTypeForUser
);

module.exports = router;