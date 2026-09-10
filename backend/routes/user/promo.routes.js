const express = require("express");
const router = express.Router();
const { applyPromo } = require("../../controllers/promo.controller");

const { isAuth } = require("../../middlewares/auth.middleware");

// ✅ Require login
router.post("/apply", isAuth, applyPromo);

module.exports = router;