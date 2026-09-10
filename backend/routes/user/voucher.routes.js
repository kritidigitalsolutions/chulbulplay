const express = require("express");
const router = express.Router();
const { redeemVoucher } = require("../../controllers/voucher.controller");
const { isAuth } = require("../../middlewares/auth.middleware");

router.post("/redeem", isAuth, redeemVoucher);

module.exports = router;