const mongoose = require("mongoose");

const admobSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    publisherAccountId: {
      type: String,
      trim: true,
      default: "",
    },
    packageName: {
      type: String,
      trim: true,
      default: "com.chulbulplay.app",
    },
    googleAccountEmail: {
      type: String,
      trim: true,
      default: "",
    },
    oauth: {
      clientId: {
        type: String,
        trim: true,
        default: "",
      },
      clientSecretEncrypted: {
        type: String,
        default: "",
      },
      refreshTokenEncrypted: {
        type: String,
        default: "",
      },
    },
    android: {
      appId: { type: String, trim: true, default: "" },
      appOpenId: { type: String, trim: true, default: "" },
      bannerId: { type: String, trim: true, default: "" },
      interstitialId: { type: String, trim: true, default: "" },
      rewardedId: { type: String, trim: true, default: "" },
      nativeId: { type: String, trim: true, default: "" },
    },
    ios: {
      appId: { type: String, trim: true, default: "" },
      appOpenId: { type: String, trim: true, default: "" },
      bannerId: { type: String, trim: true, default: "" },
      interstitialId: { type: String, trim: true, default: "" },
      rewardedId: { type: String, trim: true, default: "" },
      nativeId: { type: String, trim: true, default: "" },
    },
    connectionStatus: {
      type: String,
      enum: ["connected", "disconnected", "syncing", "error"],
      default: "disconnected",
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastSyncError: {
      type: String,
      default: null,
    },
    adMobApps: [
      {
        appId: { type: String, default: "" },
        name: { type: String, default: "" },
        platform: { type: String, default: "ANDROID" },
      },
    ],
    adUnitMappings: [
      {
        adUnitId: { type: String, default: "" },
        name: { type: String, default: "" },
        adType: { type: String, default: "" },
        platform: { type: String, default: "ANDROID" },
      },
    ],
  },
  { timestamps: true }
);

/**
 * Singleton helper to retrieve or create the single AdMob settings record
 */
admobSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      enabled: false,
      publisherAccountId: "",
      packageName: "com.chulbulplay.app",
      connectionStatus: "disconnected",
    });
  }
  return settings;
};

module.exports = mongoose.model("AdmobSettings", admobSettingsSchema);
