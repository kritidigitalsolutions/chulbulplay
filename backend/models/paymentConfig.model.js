const mongoose = require("mongoose");

const paymentConfigSchema = new mongoose.Schema(
  {
    sabpaisaEnabled: {
      type: Boolean,
      default: true,
    },
    sabpaisaMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
    },
  },
  { timestamps: true }
);

// Helper static method to get single configuration document
paymentConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      sabpaisaEnabled: true,
      sabpaisaMode: process.env.SABPAISA_MODE || "test",
    });
  } else {
    if (!config.sabpaisaEnabled) {
      config.sabpaisaEnabled = true;
      await config.save();
    }
  }
  return config;
};

module.exports = mongoose.model("PaymentConfig", paymentConfigSchema);
