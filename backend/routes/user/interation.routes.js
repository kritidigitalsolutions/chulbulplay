const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
  toggleInteraction,
  getUserInteraction,
  getInteractionStats
} = require("../../controllers/interaction.controller");

router.post("/toggle", isAuth, toggleInteraction);
router.get("/status/:contentId", isAuth, getUserInteraction);
router.get("/status", isAuth, getUserInteraction);
router.get("/stats/:contentId", getInteractionStats);
router.get("/stats", getInteractionStats);


module.exports = router;