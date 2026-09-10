const express = require("express");
const router = express.Router();

const {
  verifySubscription,
  cancelSubscription,
  checkSubscription,
} = require("../../controllers/subscription.controller");

const { isAuth } = require("../../middlewares/auth.middleware");

router.post("/subscribe", isAuth, verifySubscription);
router.get("/status", isAuth, checkSubscription);
router.delete("/cancel", isAuth, cancelSubscription);
router.delete("/status", isAuth, cancelSubscription);

module.exports = router;