const express = require("express");
const router = express.Router();

const {
  getPaymentSettings,
  updatePaymentSettings,
} = require("../../controllers/admin/paymentSettings.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

// ================= ADMIN PAYMENT SETTINGS ROUTES =================
router.get("/", isAdmin, getPaymentSettings);
router.put("/", isAdmin, updatePaymentSettings);

module.exports = router;
