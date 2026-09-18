const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getSettings,
  updateSettings,
  startOAuth,
  oauthCallback,
  testConnection,
  disconnect,
  syncNow,
  getAccount,
  getAdMobApps,
  getAdMobAdUnits,
  mapUnits,
  getReport,
} = require("../../controllers/admin/admob.controller");

// Settings
router.get("/settings", isAdmin, getSettings);
router.put("/settings", isAdmin, updateSettings);

// Google OAuth
router.get("/oauth/start", isAdmin, startOAuth);
router.get("/oauth/callback", oauthCallback);

// Actions
router.post("/test-connection", isAdmin, testConnection);
router.post("/reconnect", isAdmin, startOAuth);
router.post("/disconnect", isAdmin, disconnect);
router.post("/sync", isAdmin, syncNow);

// AdMob API Resources
router.get("/account", isAdmin, getAccount);
router.get("/apps", isAdmin, getAdMobApps);
router.get("/ad-units", isAdmin, getAdMobAdUnits);
router.post("/map-units", isAdmin, mapUnits);

// Reporting
router.get("/report", isAdmin, getReport);

module.exports = router;
