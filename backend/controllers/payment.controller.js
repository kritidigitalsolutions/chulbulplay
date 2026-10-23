const PaymentConfig = require("../models/paymentConfig.model");
const razorpayController = require("./razorpay.controller");
const easebuzzController = require("./easebuzz.controller");

// =====================================================
// GET ACTIVE PAYMENT GATEWAYS (PUBLIC / USER API)
// GET /api/payment/gateways
// =====================================================
exports.getActiveGateways = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();

    const razorpayConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );

    const easebuzzConfigured = Boolean(
      process.env.EASEBUZZ_KEY && process.env.EASEBUZZ_SALT
    );

    const razorpayActive = Boolean(config.razorpayEnabled && razorpayConfigured);
    const easebuzzActive = Boolean(config.easebuzzEnabled && easebuzzConfigured);

    return res.status(200).json({
      success: true,
      gateways: {
        razorpay: {
          enabled: razorpayActive,
          name: "Razorpay",
          key: razorpayActive ? process.env.RAZORPAY_KEY_ID : null,
          mode: "live",
        },
        easebuzz: {
          enabled: easebuzzActive,
          name: "Easebuzz",
          key: easebuzzActive ? process.env.EASEBUZZ_KEY : null,
          mode: config.easebuzzMode || process.env.EASEBUZZ_MODE || "live",
        },
      },
      defaultGateway: config.defaultGateway || "razorpay",
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
// CREATE / INITIATE ORDER (Smart Universal Router)
// POST /api/payment/create-order or /api/payment/initiate
// =====================================================
exports.createOrder = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    const requestedGateway = (req.body.gateway || config.defaultGateway || "razorpay").toLowerCase();

    if (requestedGateway === "easebuzz") {
      return easebuzzController.initiateEasebuzzPayment(req, res);
    } else {
      // Default fallback is Razorpay
      return razorpayController.createRazorpayOrder(req, res);
    }
  } catch (err) {
    console.error("Universal Create Order Router Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// VERIFY PAYMENT (Smart Universal Router)
// POST /api/payment/verify
// =====================================================
exports.verifyPayment = async (req, res) => {
  try {
    // Razorpay signature verify
    if (req.body.razorpay_signature) {
      return razorpayController.verifyRazorpayPayment(req, res);
    }

    // Easebuzz txnid verify
    if (req.body.txnid) {
      req.params = req.params || {};
      req.params.txnid = req.body.txnid;
      return easebuzzController.checkEasebuzzStatus(req, res);
    }

    return res.status(400).json({
      success: false,
      message: "Required payment parameters missing (razorpay_signature / txnid)",
    });
  } catch (err) {
    console.error("Universal Verify Payment Router Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
