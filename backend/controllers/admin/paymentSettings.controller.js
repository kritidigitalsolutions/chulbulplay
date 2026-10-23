const PaymentConfig = require("../../models/paymentConfig.model");

// =====================================================
// GET /api/admin/payment-settings
// =====================================================
exports.getPaymentSettings = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();

    const razorpayConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );

    const easebuzzConfigured = Boolean(
      process.env.EASEBUZZ_KEY && process.env.EASEBUZZ_SALT
    );

    return res.status(200).json({
      success: true,
      data: {
        razorpayEnabled: Boolean(config.razorpayEnabled),
        razorpayKeyConfigured: razorpayConfigured,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",

        easebuzzEnabled: Boolean(config.easebuzzEnabled),
        easebuzzKeyConfigured: easebuzzConfigured,
        easebuzzKey: process.env.EASEBUZZ_KEY || "",
        easebuzzMode: config.easebuzzMode || process.env.EASEBUZZ_MODE || "live",

        defaultGateway: config.defaultGateway || "razorpay",
      },
    });
  } catch (error) {
    console.error("Get Payment Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment gateway settings",
      error: error.message,
    });
  }
};

// =====================================================
// PUT /api/admin/payment-settings
// =====================================================
exports.updatePaymentSettings = async (req, res) => {
  try {
    const {
      razorpayEnabled,
      easebuzzEnabled,
      defaultGateway,
      easebuzzMode,
    } = req.body;

    const updateData = {};

    if (razorpayEnabled !== undefined) {
      updateData.razorpayEnabled = Boolean(razorpayEnabled);
    }

    if (easebuzzEnabled !== undefined) {
      updateData.easebuzzEnabled = Boolean(easebuzzEnabled);
    }

    if (defaultGateway && ["razorpay", "easebuzz"].includes(defaultGateway)) {
      updateData.defaultGateway = defaultGateway;
    }

    if (easebuzzMode && ["test", "live"].includes(easebuzzMode)) {
      updateData.easebuzzMode = easebuzzMode;
    }

    let config = await PaymentConfig.findOne();
    if (!config) {
      config = new PaymentConfig(updateData);
    } else {
      Object.assign(config, updateData);
    }

    await config.save();

    const razorpayConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );

    const easebuzzConfigured = Boolean(
      process.env.EASEBUZZ_KEY && process.env.EASEBUZZ_SALT
    );

    return res.status(200).json({
      success: true,
      message: "Payment gateway settings updated successfully",
      data: {
        razorpayEnabled: Boolean(config.razorpayEnabled),
        razorpayKeyConfigured: razorpayConfigured,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",

        easebuzzEnabled: Boolean(config.easebuzzEnabled),
        easebuzzKeyConfigured: easebuzzConfigured,
        easebuzzKey: process.env.EASEBUZZ_KEY || "",
        easebuzzMode: config.easebuzzMode || process.env.EASEBUZZ_MODE || "live",

        defaultGateway: config.defaultGateway || "razorpay",
      },
    });
  } catch (error) {
    console.error("Update Payment Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment gateway settings",
      error: error.message,
    });
  }
};
