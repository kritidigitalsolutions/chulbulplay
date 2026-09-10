const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const {
  getActiveGateways,
  createOrder,
  verifyPayment,
} = require("../../controllers/payment.controller");

const {
  initiatePayment: initiateSabpaisa,
  handleReturn: handleSabpaisaReturn,
  handleWebhook: handleSabpaisaWebhook,
  checkPaymentStatus: checkSabpaisaStatus,
} = require("../../controllers/sabpaisa.controller");

// Public / User Gateway Info
router.get("/gateways", getActiveGateways);

// ── SabPaisa PG 3.0 Routes ──
router.post("/sabpaisa/initiate", isAuth, initiateSabpaisa);
router.get("/sabpaisa/return", handleSabpaisaReturn);
router.post("/sabpaisa/return", handleSabpaisaReturn);
router.post("/sabpaisa/webhook", handleSabpaisaWebhook);
router.get("/sabpaisa/status/:orderId", isAuth, checkSabpaisaStatus);

// Generic / legacy aliases for clients
router.post("/initiate", isAuth, initiateSabpaisa);
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

module.exports = router;
