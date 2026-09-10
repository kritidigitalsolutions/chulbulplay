const PaymentConfig = require("../models/paymentConfig.model");
const sabpaisaController = require("./sabpaisa.controller");

// =====================================================
// GET ACTIVE PAYMENT GATEWAYS (PUBLIC/USER API)
// =====================================================
exports.getActiveGateways = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();

    const sabpaisaConfigured = Boolean(
      process.env.SABPAISA_API_KEY &&
      process.env.SABPAISA_SECRET_KEY &&
      process.env.SABPAISA_MERCHANT_ID &&
      process.env.SABPAISA_RETURN_URL
    );

    const sabpaisaEnabled = Boolean(config.sabpaisaEnabled && sabpaisaConfigured);

    return res.status(200).json({
      success: true,
      gateways: {
        sabpaisa: {
          enabled: sabpaisaEnabled,
          name: "SabPaisa",
          mode: process.env.SABPAISA_MODE || "test",
        },
      },
    });
  } catch (err) {
    console.error("Get Active Gateways Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// CREATE ORDER (Forward to SabPaisa for backwards compatibility)
// =====================================================
exports.createOrder = async (req, res) => {
  return sabpaisaController.initiatePayment(req, res);
};

// =====================================================
// VERIFY PAYMENT (Forward to SabPaisa status check if orderId provided)
// =====================================================
exports.verifyPayment = async (req, res) => {
  const orderId = req.body?.orderId;
  if (orderId) {
    req.params = req.params || {};
    req.params.orderId = orderId;
    return sabpaisaController.checkPaymentStatus(req, res);
  }
  return res.status(400).json({
    success: false,
    message: "SabPaisa uses callback/return URL verification. Please pass orderId to check status.",
  });
};
