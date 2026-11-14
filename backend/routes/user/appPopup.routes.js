const express = require("express");
const router = express.Router();
const controller = require("../../controllers/appPopup.controller");

// Public endpoints for mobile apps and client frontends
router.get("/active", controller.getActivePopup);
router.post("/:id/action-completed", controller.recordActionCompleted);
router.post("/:id/impression", controller.recordImpression);
router.get("/:id", controller.getPopupById);
router.get("/", controller.getAllActivePopups);

module.exports = router;
