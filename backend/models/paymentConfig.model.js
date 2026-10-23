const mongoose = require("mongoose");

const paymentConfigSchema = new mongoose.Schema(
  {
    razorpayEnabled: {
      type: Boolean,
      default: true,
    },
    easebuzzEnabled: {
      type: Boolean,
      default: true,
    },
    defaultGateway: {
      type: String,
      enum: ["razorpay", "easebuzz"],
      default: "razorpay",
    },
    easebuzzMode: {
      type: String,
      enum: ["test", "live"],
      default: "live",
    },
  },
  { timestamps: true }
);

// Helper static method to get single configuration document
paymentConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      razorpayEnabled: true,
      easebuzzEnabled: true,
      defaultGateway: "razorpay",
      easebuzzMode: process.env.EASEBUZZ_MODE || "live",
    });
  } else {
    let updated = false;
    if (config.razorpayEnabled === undefined) {
      config.razorpayEnabled = true;
      updated = true;
    }
    if (config.easebuzzEnabled === undefined) {
      config.easebuzzEnabled = true;
      updated = true;
    }
    if (!config.defaultGateway || !["razorpay", "easebuzz"].includes(config.defaultGateway)) {
      config.defaultGateway = "razorpay";
      updated = true;
    }
    if (!config.easebuzzMode) {
      config.easebuzzMode = process.env.EASEBUZZ_MODE || "live";
      updated = true;
    }
    if (updated) {
      await config.save();
    }
  }
  return config;
};

module.exports = mongoose.model("PaymentConfig", paymentConfigSchema);
