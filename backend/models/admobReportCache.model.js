const mongoose = require("mongoose");

const admobReportCacheSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    adRequests: {
      type: Number,
      default: 0,
    },
    matchedRequests: {
      type: Number,
      default: 0,
    },
    matchRate: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    estimatedEarnings: {
      type: Number,
      default: 0,
    },
    currencyCode: {
      type: String,
      default: "USD",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdmobReportCache", admobReportCacheSchema);
