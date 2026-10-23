const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const {
  getActiveGateways,
  createOrder,
  verifyPayment,
} = require("../../controllers/payment.controller");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../../controllers/razorpay.controller");

const {
  initiateEasebuzzPayment,
  handleEasebuzzReturn,
  handleEasebuzzWebhook,
  checkEasebuzzStatus,
} = require("../../controllers/easebuzz.controller");

// =====================================================
// Public / User Gateway Discovery
// =====================================================
router.get("/gateways", getActiveGateways);

// =====================================================
// ── Razorpay Payment Routes ──
// =====================================================
router.post("/razorpay/create-order", isAuth, createRazorpayOrder);
router.post("/razorpay/verify", isAuth, verifyRazorpayPayment);

// =====================================================
// ── Easebuzz Payment Routes ──
// =====================================================
router.post("/easebuzz/initiate", isAuth, initiateEasebuzzPayment);
router.get("/easebuzz/return", handleEasebuzzReturn);
router.post("/easebuzz/return", handleEasebuzzReturn);
router.post("/easebuzz/webhook", handleEasebuzzWebhook);
router.get("/easebuzz/status/:txnid", isAuth, checkEasebuzzStatus);

// =====================================================
// ── Universal / Smart Router Endpoints ──
// =====================================================
router.post("/initiate", isAuth, createOrder);
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

module.exports = router;
