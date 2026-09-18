const AdmobSettings = require("../../models/admobSettings.model");
const AdmobReportCache = require("../../models/admobReportCache.model");
const { encrypt, decrypt } = require("../../utils/admobCrypto");
const {
  generateAuthUrl,
  exchangeCodeForTokens,
  getFreshAccessToken,
} = require("../../services/admobOAuth.service");
const {
  getPublisherAccounts,
  getApps,
  getAdUnits,
  generateNetworkReport,
} = require("../../services/admobApi.service");
const { syncAdMobData } = require("../../services/admobSync.service");

/**
 * Mask credentials and structure safe frontend response
 */
function toSafeSettings(settings) {
  const envClientId = process.env.GOOGLE_ADMOB_CLIENT_ID || "";
  const envClientSecret = process.env.GOOGLE_ADMOB_CLIENT_SECRET || "";

  const effectiveClientId = settings.oauth?.clientId || envClientId;
  const isClientSecretConfigured = Boolean(
    settings.oauth?.clientSecretEncrypted || envClientSecret
  );
  const isRefreshTokenConfigured = Boolean(
    settings.oauth?.refreshTokenEncrypted || process.env.GOOGLE_ADMOB_REFRESH_TOKEN
  );

  return {
    enabled: Boolean(settings.enabled),
    publisherAccountId: settings.publisherAccountId || "",
    packageName: settings.packageName || "com.chulbulplay.app",
    googleAccountEmail: settings.googleAccountEmail || "",
    connectionStatus: settings.connectionStatus || "disconnected",
    lastSyncedAt: settings.lastSyncedAt,
    lastSyncError: settings.lastSyncError,
    oauth: {
      clientId: effectiveClientId,
      clientSecretConfigured: isClientSecretConfigured,
      refreshTokenConfigured: isRefreshTokenConfigured,
    },
    android: {
      appId: settings.android?.appId || "",
      appOpenId: settings.android?.appOpenId || "",
      bannerId: settings.android?.bannerId || "",
      interstitialId: settings.android?.interstitialId || "",
      rewardedId: settings.android?.rewardedId || "",
      nativeId: settings.android?.nativeId || "",
    },
    ios: {
      appId: settings.ios?.appId || "",
      appOpenId: settings.ios?.appOpenId || "",
      bannerId: settings.ios?.bannerId || "",
      interstitialId: settings.ios?.interstitialId || "",
      rewardedId: settings.ios?.rewardedId || "",
      nativeId: settings.ios?.nativeId || "",
    },
    adMobApps: settings.adMobApps || [],
    adUnitMappings: settings.adUnitMappings || [],
  };
}

/**
 * GET /api/admin/admob/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await AdmobSettings.getSettings();
    return res.status(200).json({
      success: true,
      data: toSafeSettings(settings),
    });
  } catch (error) {
    console.error("Get AdMob Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AdMob settings",
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/admob/settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const settings = await AdmobSettings.getSettings();
    const {
      enabled,
      publisherAccountId,
      packageName,
      oauth,
      android,
      ios,
    } = req.body;

    if (enabled !== undefined) {
      settings.enabled = Boolean(enabled);
    }

    if (publisherAccountId !== undefined) {
      settings.publisherAccountId = String(publisherAccountId).trim();
    }

    if (packageName !== undefined) {
      settings.packageName = String(packageName).trim();
    }

    if (oauth) {
      if (oauth.clientId !== undefined) {
        settings.oauth.clientId = String(oauth.clientId).trim();
      }
      if (oauth.clientSecret && typeof oauth.clientSecret === "string") {
        settings.oauth.clientSecretEncrypted = encrypt(oauth.clientSecret.trim());
      }
      if (oauth.refreshToken && typeof oauth.refreshToken === "string" && oauth.refreshToken.trim()) {
        settings.oauth.refreshTokenEncrypted = encrypt(oauth.refreshToken.trim());
        settings.connectionStatus = "connected";
        settings.lastSyncError = null;

        // Auto trigger background sync when refresh token is updated
        const { syncAdMobData } = require("../../services/admobSync.service");
        syncAdMobData().catch((err) =>
          console.warn("Background sync after manual refresh token update warning:", err.message)
        );
      }
    }

    if (android) {
      settings.android = {
        appId: android.appId !== undefined ? String(android.appId).trim() : settings.android.appId,
        appOpenId: android.appOpenId !== undefined ? String(android.appOpenId).trim() : settings.android.appOpenId,
        bannerId: android.bannerId !== undefined ? String(android.bannerId).trim() : settings.android.bannerId,
        interstitialId: android.interstitialId !== undefined ? String(android.interstitialId).trim() : settings.android.interstitialId,
        rewardedId: android.rewardedId !== undefined ? String(android.rewardedId).trim() : settings.android.rewardedId,
        nativeId: android.nativeId !== undefined ? String(android.nativeId).trim() : settings.android.nativeId,
      };
    }

    if (ios) {
      settings.ios = {
        appId: ios.appId !== undefined ? String(ios.appId).trim() : settings.ios.appId,
        appOpenId: ios.appOpenId !== undefined ? String(ios.appOpenId).trim() : settings.ios.appOpenId,
        bannerId: ios.bannerId !== undefined ? String(ios.bannerId).trim() : settings.ios.bannerId,
        interstitialId: ios.interstitialId !== undefined ? String(ios.interstitialId).trim() : settings.ios.interstitialId,
        rewardedId: ios.rewardedId !== undefined ? String(ios.rewardedId).trim() : settings.ios.rewardedId,
        nativeId: ios.nativeId !== undefined ? String(ios.nativeId).trim() : settings.ios.nativeId,
      };
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "AdMob settings saved successfully",
      data: toSafeSettings(settings),
    });
  } catch (error) {
    console.error("Update AdMob Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update AdMob settings",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/admob/oauth/start
 */
exports.startOAuth = async (req, res) => {
  try {
    const authUrl = await generateAuthUrl();
    return res.status(200).json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error("Start OAuth Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate Google authorization: " + error.message,
    });
  }
};

/**
 * GET /api/admin/admob/oauth/callback
 * Invoked by Google OAuth redirect
 */
exports.oauthCallback = async (req, res) => {
  const { code, error } = req.query;

  // Determine frontend base redirect URL
  const frontendAdminUrl =
    (process.env.ADMIN_URL && process.env.ADMIN_URL.split(",")[0]) ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";

  if (error) {
    console.error("Google OAuth returned error:", error);
    return res.redirect(
      `${frontendAdminUrl.replace(/\/$/, "")}/dashboard/admob?oauth=error&error_description=${encodeURIComponent(
        error
      )}`
    );
  }

  if (!code) {
    return res.redirect(
      `${frontendAdminUrl.replace(/\/$/, "")}/dashboard/admob?oauth=error&error_description=No+code+received`
    );
  }

  try {
    await exchangeCodeForTokens(String(code));
    // Trigger initial background sync
    syncAdMobData().catch((err) =>
      console.warn("Initial sync after OAuth callback warning:", err.message)
    );

    return res.redirect(
      `${frontendAdminUrl.replace(/\/$/, "")}/dashboard/admob?oauth=success`
    );
  } catch (err) {
    console.error("OAuth Token Exchange Error:", err);
    return res.redirect(
      `${frontendAdminUrl.replace(/\/$/, "")}/dashboard/admob?oauth=error&error_description=${encodeURIComponent(
        err.message
      )}`
    );
  }
};

/**
 * POST /api/admin/admob/test-connection
 */
exports.testConnection = async (req, res) => {
  try {
    const accessToken = await getFreshAccessToken();
    const accounts = await getPublisherAccounts(accessToken);

    const settings = await AdmobSettings.getSettings();
    settings.connectionStatus = "connected";
    settings.lastSyncError = null;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Connection test successful! AdMob API is reachable.",
      accounts,
    });
  } catch (error) {
    console.error("Test Connection Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Connection test failed.",
    });
  }
};

/**
 * POST /api/admin/admob/disconnect
 */
exports.disconnect = async (req, res) => {
  try {
    const settings = await AdmobSettings.getSettings();
    settings.oauth.refreshTokenEncrypted = "";
    settings.connectionStatus = "disconnected";
    settings.googleAccountEmail = "";
    settings.lastSyncError = null;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "AdMob account disconnected successfully.",
      data: toSafeSettings(settings),
    });
  } catch (error) {
    console.error("Disconnect Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect AdMob account.",
    });
  }
};

/**
 * POST /api/admin/admob/sync
 */
exports.syncNow = async (req, res) => {
  try {
    const result = await syncAdMobData();
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Sync Now Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Sync execution failed.",
    });
  }
};

/**
 * GET /api/admin/admob/account
 */
exports.getAccount = async (req, res) => {
  try {
    const accessToken = await getFreshAccessToken();
    const accounts = await getPublisherAccounts(accessToken);
    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/admin/admob/apps
 */
exports.getAdMobApps = async (req, res) => {
  try {
    const settings = await AdmobSettings.getSettings();
    if (settings.adMobApps && settings.adMobApps.length > 0) {
      return res.status(200).json({
        success: true,
        data: settings.adMobApps,
      });
    }

    const accessToken = await getFreshAccessToken();
    const apps = await getApps(accessToken, settings.publisherAccountId);
    settings.adMobApps = apps;
    await settings.save();

    return res.status(200).json({
      success: true,
      data: apps,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/admin/admob/ad-units
 */
exports.getAdMobAdUnits = async (req, res) => {
  try {
    const settings = await AdmobSettings.getSettings();
    const accessToken = await getFreshAccessToken();
    const units = await getAdUnits(accessToken, settings.publisherAccountId);

    return res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/admin/admob/map-units
 */
exports.mapUnits = async (req, res) => {
  try {
    const { mappings } = req.body;
    const settings = await AdmobSettings.getSettings();
    if (Array.isArray(mappings)) {
      settings.adUnitMappings = mappings;
      await settings.save();
    }
    return res.status(200).json({
      success: true,
      message: "Ad unit mappings updated.",
      data: settings.adUnitMappings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/admin/admob/report
 * Supports query params: period ('today' | 'yesterday' | 'last7days' | 'last28days' | 'thisMonth' | 'lastMonth' | 'custom'), startDate, endDate
 */
exports.getReport = async (req, res) => {
  try {
    const { period = "last7days", startDate, endDate } = req.query;

    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "yesterday") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (period === "last7days") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      end = now;
    } else if (period === "last28days") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
      end = now;
    } else if (period === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    } else if (period === "lastMonth") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === "custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    // Query cached reports from MongoDB
    let cachedRows = await AdmobReportCache.find({
      date: { $gte: startStr, $lte: endStr },
    }).sort({ date: 1 });

    // If connected and cache is empty for date range, try live fetch
    const settings = await AdmobSettings.getSettings();
    if (
      cachedRows.length === 0 &&
      settings.connectionStatus === "connected" &&
      settings.oauth?.refreshTokenEncrypted
    ) {
      try {
        const accessToken = await getFreshAccessToken();
        const liveRows = await generateNetworkReport(
          accessToken,
          settings.publisherAccountId,
          start,
          end
        );

        for (const row of liveRows) {
          if (row.date) {
            await AdmobReportCache.findOneAndUpdate(
              { date: row.date },
              { $set: row },
              { upsert: true, returnDocument: "after" }
            );
          }
        }

        cachedRows = await AdmobReportCache.find({
          date: { $gte: startStr, $lte: endStr },
        }).sort({ date: 1 });
      } catch (liveErr) {
        console.warn("Live AdMob report fetch warning:", liveErr.message);
      }
    }

    // Aggregate KPI totals
    const metrics = {
      impressions: 0,
      adRequests: 0,
      matchedRequests: 0,
      clicks: 0,
      estimatedEarnings: 0,
      matchRate: 0,
    };

    const chartData = cachedRows.map((r) => {
      metrics.impressions += r.impressions || 0;
      metrics.adRequests += r.adRequests || 0;
      metrics.matchedRequests += r.matchedRequests || 0;
      metrics.clicks += r.clicks || 0;
      metrics.estimatedEarnings += r.estimatedEarnings || 0;

      return {
        date: r.date,
        impressions: r.impressions || 0,
        adRequests: r.adRequests || 0,
        clicks: r.clicks || 0,
        estimatedEarnings: Number((r.estimatedEarnings || 0).toFixed(2)),
      };
    });

    if (metrics.adRequests > 0) {
      metrics.matchRate = (metrics.matchedRequests / metrics.adRequests) * 100;
    }

    metrics.estimatedEarnings = Number(metrics.estimatedEarnings.toFixed(2));

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        chartData,
      },
    });
  } catch (error) {
    console.error("Get AdMob Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message,
    });
  }
};
