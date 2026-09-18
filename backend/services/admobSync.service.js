const AdmobSettings = require("../models/admobSettings.model");
const AdmobReportCache = require("../models/admobReportCache.model");
const { getFreshAccessToken } = require("./admobOAuth.service");
const {
  getPublisherAccounts,
  getApps,
  getAdUnits,
  generateNetworkReport,
} = require("./admobApi.service");

let isSyncInProgress = false;
let syncIntervalHandle = null;

/**
 * Core synchronization routine
 */
async function syncAdMobData() {
  if (isSyncInProgress) {
    return {
      success: false,
      message: "AdMob synchronization is already running. Please wait.",
    };
  }

  isSyncInProgress = true;
  let settings = await AdmobSettings.getSettings();

  try {
    const hasToken =
      Boolean(settings.oauth?.refreshTokenEncrypted) ||
      Boolean(process.env.GOOGLE_ADMOB_REFRESH_TOKEN);

    if (!hasToken) {
      isSyncInProgress = false;
      return {
        success: false,
        message: "No Google account connected. Please connect Google first.",
      };
    }

    settings.connectionStatus = "syncing";
    await settings.save();

    // 1. Get fresh access token
    const accessToken = await getFreshAccessToken();

    // 2. Discover or verify publisher account ID
    let publisherAccountId = settings.publisherAccountId;
    if (!publisherAccountId) {
      try {
        const accounts = await getPublisherAccounts(accessToken);
        if (accounts && accounts.length > 0) {
          const firstAccount = accounts[0];
          publisherAccountId = firstAccount.publisherId || firstAccount.name.replace("accounts/", "");
          settings.publisherAccountId = publisherAccountId;
        }
      } catch (accErr) {
        console.warn("Could not auto-discover publisher accounts:", accErr.message);
      }
    }

    if (!publisherAccountId) {
      throw new Error(
        "Could not detect AdMob Publisher Account ID. Please enter it in General Settings."
      );
    }

    // 3. Fetch apps
    try {
      const apps = await getApps(accessToken, publisherAccountId);
      if (apps && apps.length > 0) {
        settings.adMobApps = apps;
      }
    } catch (appsErr) {
      console.warn("AdMob Apps Fetch Warning:", appsErr.message);
    }

    // 4. Fetch ad units
    try {
      const units = await getAdUnits(accessToken, publisherAccountId);
      if (units && units.length > 0) {
        settings.adUnitMappings = units.map((u) => ({
          adUnitId: u.adUnitId,
          name: u.name,
          adType: u.adFormat,
          platform: "ANDROID",
        }));
      }
    } catch (unitsErr) {
      console.warn("AdMob AdUnits Fetch Warning:", unitsErr.message);
    }

    // 5. Fetch last 30 days reporting metrics
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const reportRows = await generateNetworkReport(
        accessToken,
        publisherAccountId,
        thirtyDaysAgo,
        now
      );

      // Upsert into report cache
      for (const row of reportRows) {
        if (row.date) {
          await AdmobReportCache.findOneAndUpdate(
            { date: row.date },
            {
              $set: {
                impressions: row.impressions,
                adRequests: row.adRequests,
                matchedRequests: row.matchedRequests,
                matchRate: row.matchRate,
                clicks: row.clicks,
                estimatedEarnings: row.estimatedEarnings,
              },
            },
            { upsert: true, returnDocument: "after" }
          );
        }
      }
    } catch (reportErr) {
      console.warn("AdMob Report Fetch Warning:", reportErr.message);
    }

    // 6. Complete sync successfully
    settings.connectionStatus = "connected";
    settings.lastSyncedAt = new Date();
    settings.lastSyncError = null;
    await settings.save();

    return {
      success: true,
      message: "AdMob synchronization completed successfully.",
      lastSyncedAt: settings.lastSyncedAt,
    };
  } catch (error) {
    console.error("AdMob Synchronization Failed:", error.message);
    settings.connectionStatus = "error";
    settings.lastSyncError = error.message;
    await settings.save();

    return {
      success: false,
      message: error.message,
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Initialize 15-minute background synchronization cron
 */
function initAdMobSyncScheduler() {
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle);
  }

  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  syncIntervalHandle = setInterval(async () => {
    try {
      const settings = await AdmobSettings.getSettings();
      if (
        settings.connectionStatus === "connected" &&
        settings.oauth?.refreshTokenEncrypted
      ) {
        console.log("🕒 Running scheduled 15-minute AdMob synchronization...");
        await syncAdMobData();
      }
    } catch (err) {
      console.error("Scheduled AdMob sync error:", err.message);
    }
  }, FIFTEEN_MINUTES);

  if (syncIntervalHandle.unref) {
    syncIntervalHandle.unref();
  }

  console.log("✅ AdMob 15-minute sync scheduler initialized.");
}

module.exports = {
  syncAdMobData,
  initAdMobSyncScheduler,
};
