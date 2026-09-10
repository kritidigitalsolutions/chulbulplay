const PaymentConfig = require("../../models/paymentConfig.model");

// GET /api/admin/payment-settings
exports.getPaymentSettings = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    const sabpaisaConfigured = Boolean(
      process.env.SABPAISA_API_KEY &&
      process.env.SABPAISA_SECRET_KEY &&
      process.env.SABPAISA_MERCHANT_ID &&
      process.env.SABPAISA_RETURN_URL
    );

    return res.status(200).json({
      success: true,
      data: {
        sabpaisaEnabled: config.sabpaisaEnabled,
        sabpaisaKeyConfigured: sabpaisaConfigured,
        sabpaisaMode: process.env.SABPAISA_MODE || "test",
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

// PUT /api/admin/payment-settings
exports.updatePaymentSettings = async (req, res) => {
  try {
    const { sabpaisaEnabled, sabpaisaMode } = req.body;

    const updateData = {};

    if (sabpaisaEnabled !== undefined) {
      updateData.sabpaisaEnabled = Boolean(sabpaisaEnabled);
    }

    if (sabpaisaMode && ["test", "live"].includes(sabpaisaMode)) {
      updateData.sabpaisaMode = sabpaisaMode;
    }

    let config = await PaymentConfig.findOne();
    if (!config) {
      config = new PaymentConfig(updateData);
    } else {
      Object.assign(config, updateData);
    }

    await config.save();

    const sabpaisaConfigured = Boolean(
      process.env.SABPAISA_API_KEY &&
      process.env.SABPAISA_SECRET_KEY &&
      process.env.SABPAISA_MERCHANT_ID &&
      process.env.SABPAISA_RETURN_URL
    );

    return res.status(200).json({
      success: true,
      message: "Payment gateway settings updated successfully",
      data: {
        sabpaisaEnabled: config.sabpaisaEnabled,
        sabpaisaKeyConfigured: sabpaisaConfigured,
        sabpaisaMode: process.env.SABPAISA_MODE || "test",
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
